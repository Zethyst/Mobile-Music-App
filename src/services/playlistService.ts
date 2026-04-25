import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAYLISTS_KEY = 'playlists_v1';

export type PlaylistTrack = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number | null;
  // Cached stream info so tapping replays without a new yt-dlp call
  streamUrl?: string;
  streamHeaders?: Record<string, string>;
  addedAt: string;
};

export type Playlist = {
  id: string;
  name: string;
  description?: string;
  coverUri?: string;   // local file:// URI from image picker
  tracks: PlaylistTrack[];
  createdAt: string;
  updatedAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<Playlist[]> {
  try {
    const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
    return raw ? (JSON.parse(raw) as Playlist[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(playlists: Playlist[]): Promise<void> {
  await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getPlaylists(): Promise<Playlist[]> {
  return readAll();
}

export async function getPlaylist(id: string): Promise<Playlist | null> {
  const all = await readAll();
  return all.find(p => p.id === id) ?? null;
}

export async function createPlaylist(input: {
  name: string;
  description?: string;
  coverUri?: string;
}): Promise<Playlist> {
  const now = new Date().toISOString();
  const playlist: Playlist = {
    id: uid(),
    name: input.name,
    description: input.description,
    coverUri: input.coverUri,
    tracks: [],
    createdAt: now,
    updatedAt: now,
  };
  const all = await readAll();
  await writeAll([playlist, ...all]);
  return playlist;
}

export async function updatePlaylist(
  id: string,
  patch: Partial<Pick<Playlist, 'name' | 'description' | 'coverUri'>>,
): Promise<Playlist | null> {
  const all = await readAll();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  await writeAll(all);
  return all[idx];
}

export async function deletePlaylist(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter(p => p.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: Omit<PlaylistTrack, 'addedAt'>,
): Promise<Playlist | null> {
  const all = await readAll();
  const idx = all.findIndex(p => p.id === playlistId);
  if (idx === -1) return null;
  // Avoid duplicates — update stream url if already present
  const existing = all[idx].tracks.findIndex(t => t.videoId === track.videoId);
  if (existing !== -1) {
    all[idx].tracks[existing] = { ...all[idx].tracks[existing], ...track };
  } else {
    all[idx].tracks.push({ ...track, addedAt: new Date().toISOString() });
  }
  all[idx].updatedAt = new Date().toISOString();
  await writeAll(all);
  return all[idx];
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  videoId: string,
): Promise<Playlist | null> {
  const all = await readAll();
  const idx = all.findIndex(p => p.id === playlistId);
  if (idx === -1) return null;
  all[idx].tracks = all[idx].tracks.filter(t => t.videoId !== videoId);
  all[idx].updatedAt = new Date().toISOString();
  await writeAll(all);
  return all[idx];
}

// Updates the cached stream URL for a track across ALL playlists that contain it
export async function refreshStreamUrlInPlaylists(
  videoId: string,
  streamUrl: string,
  streamHeaders?: Record<string, string>,
): Promise<void> {
  const all = await readAll();
  let changed = false;
  for (const pl of all) {
    const t = pl.tracks.find(t => t.videoId === videoId);
    if (t) {
      t.streamUrl = streamUrl;
      if (streamHeaders) t.streamHeaders = streamHeaders;
      changed = true;
    }
  }
  if (changed) await writeAll(all);
}