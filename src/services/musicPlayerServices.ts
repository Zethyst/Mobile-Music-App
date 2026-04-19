import TrackPlayer, { Event, RepeatMode } from 'react-native-track-player';
import { tracks } from '../constants';

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
    });
    isSetup = true;
  }
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
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });
};