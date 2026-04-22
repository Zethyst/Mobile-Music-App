import { DeviceEventEmitter } from 'react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DOWNLOAD_PROGRESS_EVENT = 'musicapp_download_progress';

const BACKEND = 'https://mobile-music-app.onrender.com';
// const BACKEND = __DEV__
//   ? 'http://10.0.2.2:8000' // Android emulator → host machine (use LAN IP for a real device e.g. http://192.168.x.x:8000)
//   : 'https://mobile-music-app.onrender.com';

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
  const filePath = `${DOWNLOADS_DIR}/${item.videoId}.m4a`;
  const downloadUrl = `${BACKEND}/download?videoId=${encodeURIComponent(item.videoId)}`;

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
        const pct = Math.min(99, Math.round((bytesWritten / contentLength) * 100));
        emitProgress(item.videoId, pct);
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

  const track: DownloadedTrack = {
    videoId: item.videoId,
    title: item.title,
    artist: item.artist,
    thumbnail: item.thumbnail,
    duration: item.duration ?? 0,
    localUri,
    downloadedAt: new Date().toISOString(),
  };

  await saveMetadata(track);
  emitProgress(item.videoId, 100);
  return track;
}
