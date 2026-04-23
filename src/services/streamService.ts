import { STREAM_BACKEND as BACKEND } from './apiBase';

/** Triggers GET /health so cold hosts (e.g. Render) spin up; failures are ignored. */
export function pingHealthCheck(): void {
  void fetch(`${BACKEND}/health`).catch(() => {});
}

export type SearchResult = {
  videoId:   string;
  title:     string;
  artist:    string;
  thumbnail: string;
  duration:  number | null;
};
 
export async function searchYouTube(query: string): Promise<SearchResult[]> {
  const res  = await fetch(`${BACKEND}/search?q=${encodeURIComponent(query)}`);
  const data = await res.json() as { results: SearchResult[] };
  return data.results ?? [];
}


export type StreamInfo = {
  url: string;
  headers: Record<string, string>;
};

/** Fetches a YouTube CDN URL + required headers from the backend (on demand — no prefetch).
 *  TrackPlayer attaches the headers so ExoPlayer sends them when streaming.
 *  Pass `forceRefresh: true` to clear the server’s in-flight coalescer and resolve a new URL (e.g. after PlaybackError). */
export async function getStreamUrl(
  videoId: string,
  forceRefresh = false,
): Promise<StreamInfo | null> {
  const params = new URLSearchParams({ videoId });
  if (forceRefresh) params.set('bust', '1');
  const res = await fetch(`${BACKEND}/stream-url?${params}`);
  if (!res.ok) return null;
  const data = await res.json() as { url?: string; headers?: Record<string, string> };
  if (!data.url) return null;
  return { url: data.url, headers: data.headers ?? {} };
}