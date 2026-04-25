import TrackPlayer, {
  Capability,
  Event,
  RepeatMode,
  IOSCategory,
} from 'react-native-track-player';
import type { Track } from 'react-native-track-player';
import { DeviceEventEmitter } from 'react-native';
import { tracks } from '../constants';
import { getStreamUrl } from './streamService';
import { track as analyticsTrack } from '../utils/analytics';

// ─── Stream recovery event ────────────────────────────────────────────────────
// Emitted from playbackService so the UI can show feedback.
// state: 'retrying' | 'recovered' | 'failed'
export type StreamRecoveryState = 'retrying' | 'recovered' | 'failed';
export const STREAM_RECOVERY_EVENT = 'rntp_stream_recovery';

/** After a successful URL refresh, ignore further stream errors for this long (avoids retry→play→error loops). */
const RECOVERY_COOLDOWN_MS = 15_000;

/** Library track IDs are short numeric strings ("1", "2", …). YouTube IDs are not. */
const isYouTubeTrack = (id?: string | number) =>
  id != null && !/^\d+$/.test(String(id));

function playbackSource(t: Track): 'youtube_stream' | 'library' | 'local_file' {
  const url = typeof t.url === 'string' ? t.url : '';
  if (url.startsWith('file:') || (url.length > 0 && url.startsWith('/'))) {
    return 'local_file';
  }
  if (isYouTubeTrack(t.id)) return 'youtube_stream';
  return 'library';
}

let recoveryInFlight = false;
let cooldownUntil = 0;

/** Registers lock screen / Control Center / notification actions (required on iOS for pause/play). */
async function applyPlaybackCapabilities(): Promise<void> {
  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
  });
}

/**
 * Play a track from the library by its index.
 * If the queue was replaced (e.g. by a YouTube search result), the library
 * queue is restored first before skipping to the requested index.
 */
export const playLibraryTrack = async (index: number): Promise<void> => {
  const queue = await TrackPlayer.getQueue();
  const isLibraryQueue =
    queue.length === tracks.length && queue[0]?.id === tracks[0]?.id;

  if (!isLibraryQueue) {
    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
  }

  await TrackPlayer.skip(index);
  await TrackPlayer.play();
};

export const setupPlayer = async (): Promise<boolean> => {
  let isSetup = false;
  try {
    await TrackPlayer.getActiveTrackIndex();
    isSetup = true;
  } catch {
    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 10,
      // Playback category + Info.plist `UIBackgroundModes` → audio keeps running when app is backgrounded on iOS
      iosCategory: IOSCategory.Playback,
    });
    isSetup = true;
  }
  await applyPlaybackCapabilities();
  return isSetup;
};

export const addTracks = async (): Promise<void> => {
  const queue = await TrackPlayer.getQueue();
  if (queue.length === 0) {
    await TrackPlayer.add(tracks);
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
  }
};

export const playbackService = async (): Promise<void> => {
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    void TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    void TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ track }) => {
    if (!track) return;
    analyticsTrack('song_playing', {
      track_id: String(track.id),
      title: track.title ?? '',
      artist: track.artist ?? '',
      source: playbackSource(track),
      duration: track.duration ?? 0,
    });
  });

  TrackPlayer.addEventListener(Event.PlaybackError, async (e) => {
    console.error('[TrackPlayer] PlaybackError:', e.message, e.code);

    // Only attempt recovery for stream/HTTP errors (expired CDN URLs, etc.)
    const isStreamError =
      typeof e.code === 'string' &&
      (e.code.includes('http') ||
        e.code.includes('source') ||
        e.code.includes('io') ||
        e.code === 'android-io-bad-http-status');

    if (!isStreamError) return;

    // Another recovery is already running — don't stack async work
    if (recoveryInFlight) return;

    // Just recovered and play() threw again immediately — don't loop; wait for cooldown
    if (Date.now() < cooldownUntil) {
      return;
    }

    recoveryInFlight = true;
    try {
      const [activeIndex, activeTrack, { position }] = await Promise.all([
        TrackPlayer.getActiveTrackIndex(),
        TrackPlayer.getActiveTrack(),
        TrackPlayer.getProgress(),
      ]);

      if (activeIndex == null || !activeTrack || !isYouTubeTrack(activeTrack.id)) return;

      DeviceEventEmitter.emit(STREAM_RECOVERY_EVENT, {
        state: 'retrying' as StreamRecoveryState,
        title: activeTrack.title ?? '',
      });

      const fresh = await getStreamUrl(String(activeTrack.id), true);
      if (!fresh) throw new Error('No URL returned');

      // Swap the stale track in the queue with a fresh URL without disrupting
      // the rest of the queue: remove → re-insert at same index → skip → seek → play
      const queueLength = (await TrackPlayer.getQueue()).length;
      const updatedTrack = { ...activeTrack, url: fresh.url, headers: fresh.headers };

      await TrackPlayer.remove(activeIndex);
      if (activeIndex < queueLength - 1) {
        await TrackPlayer.add(updatedTrack, activeIndex);
      } else {
        await TrackPlayer.add(updatedTrack);
      }
      await TrackPlayer.skip(activeIndex);
      await TrackPlayer.seekTo(position);

      // Cooldown starts before play() so a quick re-error does not trigger another recovery loop
      cooldownUntil = Date.now() + RECOVERY_COOLDOWN_MS;

      await TrackPlayer.play();

      DeviceEventEmitter.emit(STREAM_RECOVERY_EVENT, {
        state: 'recovered' as StreamRecoveryState,
        title: activeTrack.title ?? '',
      });
    } catch (err) {
      console.error('[TrackPlayer] Stream recovery failed:', err);
      cooldownUntil = Date.now() + 10_000;
      DeviceEventEmitter.emit(STREAM_RECOVERY_EVENT, {
        state: 'failed' as StreamRecoveryState,
        title: '',
      });
    } finally {
      recoveryInFlight = false;
    }
  });
};