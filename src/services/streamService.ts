// Change this to your Render URL when deployed
// const BACKEND = __DEV__
//   ? 'http://10.0.2.2:8000'           // Android emulator → host machine (use LAN IP for a real device e.g. http://192.168.x.x:8000)
//   : 'https://mobile-music-app.onrender.com';

const BACKEND = 'https://mobile-music-app.onrender.com';

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

export async function getStreamUrl(videoId: string): Promise<string | null> {
  const res  = await fetch(`${BACKEND}/stream-url?videoId=${encodeURIComponent(videoId)}`);
  const data = await res.json() as { url: string | null };
  return data.url ?? null;
}