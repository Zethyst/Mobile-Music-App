// Change this to your Render URL when deployed
const BACKEND = __DEV__
  ? 'http://10.0.2.2:8000'           // Android emulator → host machine (use LAN IP for a real device e.g. http://192.168.x.x:8000)
  : 'https://mobile-music-app.onrender.com';

// const BACKEND = 'https://mobile-music-app.onrender.com';

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

/** Returns the server-proxied stream URL for a YouTube video.
 *  ExoPlayer streams from this URL; the server fetches from YouTube using the
 *  same IP that resolved the CDN URL, avoiding IP-mismatch 403s on Render. */
export function getStreamUrl(videoId: string): string {
  return `${BACKEND}/stream?videoId=${encodeURIComponent(videoId)}`;
}