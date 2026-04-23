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

/** Playback URL: server pipes yt-dlp audio (`/stream-pipe`) so the device never calls googlevideo directly.
 *  Raw CDN URLs from `--get-url` are often tied to the resolver/proxy IP → `android-io-bad-http-status` on the phone.
 *  `forceRefresh` appends `t=` so TrackPlayer treats it as a new resource after errors. */
export async function getStreamUrl(
  videoId: string,
  forceRefresh = false,
): Promise<StreamInfo | null> {
  const params = new URLSearchParams({ videoId });
  if (forceRefresh) params.set('t', String(Date.now()));
  return {
    url: `${BACKEND}/stream-pipe?${params}`,
    headers: {},
  };
}