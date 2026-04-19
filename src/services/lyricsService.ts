export type LrcLine = { time: number; text: string }; // time in seconds

export type LyricsResult =
  | { kind: 'synced'; lines: LrcLine[] }
  | { kind: 'plain'; text: string }
  | { kind: 'none' };

/** Parse raw LRC string → array of timed lines */
function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of lrc.split('\n')) {
    const m = raw.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (!m) continue;
    const time = Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 1000;
    lines.push({ time, text: m[4].trim() });
  }
  return lines;
}

export async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number,
): Promise<LyricsResult> {
  try {
    const params = new URLSearchParams({ track_name: title, artist_name: artist });
    if (duration) params.set('duration', String(Math.round(duration)));

    const res = await fetch(`https://lrclib.net/api/get?${params}`);
    if (!res.ok) return { kind: 'none' };

    const data = await res.json();

    if (data.syncedLyrics) return { kind: 'synced', lines: parseLrc(data.syncedLyrics) };
    if (data.plainLyrics) return { kind: 'plain', text: data.plainLyrics };
    return { kind: 'none' };
  } catch {
    return { kind: 'none' };
  }
}