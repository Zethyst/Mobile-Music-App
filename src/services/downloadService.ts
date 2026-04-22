import { DeviceEventEmitter } from 'react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DOWNLOAD_PROGRESS_EVENT = 'musicapp_download_progress';

const BACKEND = 'https://mobile-music-app.onrender.com';
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
  await RNFS.mkdir(DOWNLOADS_DIR);

  const filePath = `${DOWNLOADS_DIR}/${item.videoId}.m4a`;

  if (await RNFS.exists(filePath)) await RNFS.unlink(filePath);

  emitProgress(item.videoId, 0);

  const downloadUrl = `${BACKEND}/download?videoId=${encodeURIComponent(item.videoId)}`;

  const job = RNFS.downloadFile({
    fromUrl:         downloadUrl,
    toFile:          filePath,
    background:      true,
    progressDivider: 5,
    discretionary:   false,
    progress: res => {
      const { bytesWritten, contentLength } = res;
      if (contentLength > 0) {
        const pct = Math.min(99, Math.round((bytesWritten / contentLength) * 100));
        emitProgress(item.videoId, pct);
      }
    },
  });

  const result = await job.promise;
  if (result.statusCode !== 200 && result.statusCode !== 206) {
    emitProgress(item.videoId, 0);
    throw new Error(`Download failed (HTTP ${result.statusCode})`);
  }

  if (!(await RNFS.exists(filePath))) {
    emitProgress(item.videoId, 0);
    throw new Error('File missing after download');
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
