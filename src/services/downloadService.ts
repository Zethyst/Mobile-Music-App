import { DeviceEventEmitter } from 'react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DOWNLOAD_BACKEND as BACKEND } from './apiBase';
import { track as analyticsTrack } from '../utils/analytics';

export const DOWNLOAD_PROGRESS_EVENT = 'musicapp_download_progress';

/** Emitted when a track is saved from the player; `DownloadSavedBanner` listens (same UX as stream recovery pill). */
export const DOWNLOAD_SAVED_BANNER_EVENT = 'musicapp_download_saved';

const DOWNLOADS_DIR = `${RNFS.DocumentDirectoryPath}/downloads`;
const METADATA_KEY = 'downloaded_tracks_v1';

export type DownloadRequest = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number | null;
};

export type DownloadedTrack = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  /** `file://` URI playable by TrackPlayer */
  localUri: string;
  downloadedAt: string;
};

function emitProgress(videoId: string, percent: number) {
  DeviceEventEmitter.emit(DOWNLOAD_PROGRESS_EVENT, { videoId, percent });
}

async function saveMetadata(track: DownloadedTrack) {
  const existing = await getDownloads();
  const updated = [track, ...existing.filter(t => t.videoId !== track.videoId)];
  await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(updated));
}

function normalizeStored(raw: unknown[]): DownloadedTrack[] {
  return raw.map((t: any) => ({
    videoId:      t.videoId,
    title:        t.title,
    artist:       t.artist,
    thumbnail:    t.thumbnail,
    duration:     typeof t.duration === 'number' ? t.duration : 0,
    localUri:     typeof t.localUri === 'string' ? t.localUri : (t.cloudinaryUrl as string) || '',
    downloadedAt: typeof t.downloadedAt === 'string' ? t.downloadedAt : new Date().toISOString(),
  })).filter(t => t.localUri.length > 0);
}

export async function getDownloads(): Promise<DownloadedTrack[]> {
  try {
    const raw = await AsyncStorage.getItem(METADATA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    return normalizeStored(parsed);
  } catch {
    return [];
  }
}

/**
 * `COLORS.playing` when true: bundled library (numeric id), local `file://` / absolute path, or
 * YouTube id present in download metadata. Otherwise stream-only.
 */
export function isTrackAvailableOffline(
  t: { id?: string | number; url?: string } | null | undefined,
  downloadedYouTubeIds: Set<string> = new Set(),
): boolean {
  if (!t) return false;
  const url = typeof t.url === 'string' ? t.url : '';
  if (url.startsWith('file:') || (url.length > 0 && url.startsWith('/'))) {
    return true;
  }
  if (t.id != null && /^\d+$/.test(String(t.id))) {
    return true;
  }
  if (t.id != null) {
    return downloadedYouTubeIds.has(String(t.id));
  }
  return false;
}

/** Library tracks use short numeric `id` strings; YouTube / search use opaque IDs (alphanumeric). */
export function isYoutubeStyleTrackId(id: string | number | undefined | null): boolean {
  if (id == null) return false;
  return !/^\d+$/.test(String(id));
}

export async function deleteDownload(videoId: string): Promise<boolean> {
  try {
    if (await RNFS.exists(DOWNLOADS_DIR)) {
      const files = await RNFS.readDir(DOWNLOADS_DIR);
      for (const f of files) {
        if (f.name.startsWith(videoId)) {
          await RNFS.unlink(f.path);
        }
      }
    }

    const updated = (await getDownloads()).filter(t => t.videoId !== videoId);
    await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

/** Download audio via the backend proxy endpoint (avoids YouTube CDN header/expiry issues). */
export async function downloadTrackToDevice(item: DownloadRequest): Promise<DownloadedTrack> {
  analyticsTrack('download_started', {
    video_id: item.videoId,
    title: item.title,
    artist: item.artist,
  });

  const filePath = `${DOWNLOADS_DIR}/${item.videoId}.m4a`;
  const downloadUrl = `${BACKEND}/download?videoId=${encodeURIComponent(item.videoId)}`;

  try {
    await RNFS.mkdir(DOWNLOADS_DIR);

    if (await RNFS.exists(filePath)) {
      await RNFS.unlink(filePath);
    }

    emitProgress(item.videoId, 0);

    const job = RNFS.downloadFile({
      fromUrl:          downloadUrl,
      toFile:           filePath,
      background:       true,
      progressDivider:  5,
      discretionary:    false,
      // yt-dlp may sleep (JS challenge + rate-limit) before the first byte.
      connectionTimeout: 60000,
      readTimeout:       120000,
      progress: res => {
        const { bytesWritten, contentLength } = res;
        if (contentLength > 0) {
          // Known size — emit exact percentage
          const pct = Math.min(99, Math.round((bytesWritten / contentLength) * 100));
          emitProgress(item.videoId, pct);
        } else {
          // Chunked / unknown size (yt-dlp pipe) — emit -1 so the UI shows
          // an indeterminate bar instead of nothing
          emitProgress(item.videoId, -1);
        }
      },
    });

    let result: { statusCode: number; bytesWritten: number };
    try {
      result = await job.promise;
    } catch (e) {
      emitProgress(item.videoId, 0);
      throw e;
    }

    if (result.statusCode !== 200 && result.statusCode !== 206) {
      emitProgress(item.videoId, 0);
      throw new Error(`Download failed (HTTP ${result.statusCode})`);
    }

    if (!(await RNFS.exists(filePath))) {
      emitProgress(item.videoId, 0);
      throw new Error('File missing after download');
    }

    // yt-dlp may exit with code 1 but the server has already sent HTTP 200 (headers
    // are flushed before the download starts). Detect a failed/empty download by
    // checking the file size — a valid audio file is always several hundred KB.
    const MIN_VALID_BYTES = 50 * 1024; // 50 KB
    if (result.bytesWritten < MIN_VALID_BYTES) {
      await RNFS.unlink(filePath).catch(() => {});
      emitProgress(item.videoId, 0);
      throw new Error('FORMAT_UNAVAILABLE');
    }

    const localUri = filePath.startsWith('file:') ? filePath : `file://${filePath}`;

    const downloaded: DownloadedTrack = {
      videoId: item.videoId,
      title: item.title,
      artist: item.artist,
      thumbnail: item.thumbnail,
      duration: item.duration ?? 0,
      localUri,
      downloadedAt: new Date().toISOString(),
    };

    await saveMetadata(downloaded);
    emitProgress(item.videoId, 100);
    analyticsTrack('download_completed', {
      video_id: item.videoId,
      title: item.title,
      bytes_written: result.bytesWritten,
    });
    return downloaded;
  } catch (e) {
    analyticsTrack('download_failed', {
      video_id: item.videoId,
      title: item.title,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
