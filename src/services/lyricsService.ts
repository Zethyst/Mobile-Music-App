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

/**
 * Strip common YouTube / streaming title noise so lrclib can match it.
 * Examples removed:
 *   "(Official Video)", "[Lyrics]", "【MV】",
 *   "ft. Artist", "feat. Artist",
 *   "prod. Name", "prod by Name",
 *   " - Topic" (YouTube auto-generated channels),
 *   trailing "lyrics / audio / video / hd / 4k"
 */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[\(\[【][^\)\]】]{0,60}[\)\]】]/gi, '') // strip (…) […] 【…】 blocks
    .replace(/\s*(ft\.|feat\.)\s+.*/i, '')               // strip "ft. ..." and after
    .replace(/\s*(prod\.?(\s+by)?)\s+.*/i, '')           // strip "prod. ..." and after
    .replace(/\s*-\s*Topic\s*$/i, '')                    // YouTube auto-generated: "Artist - Topic"
    .replace(/\s*(lyrics?|audio|Audio|video|Video|hd|HD|4k)\s*$/i, '') // trailing noise words
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanArtist(raw: string): string {
  return raw
    .replace(/\s*-\s*Topic\s*$/i, '') // YouTube auto-generated channel suffix
    .replace(/VEVO$/i, '')
    .trim();
}

/**
 * YouTube uploads often have the title field as "Artist - Title".
 * Detect that pattern and split; otherwise just clean what we have.
 */
function normalise(rawTitle: string, rawArtist: string): { title: string; artist: string } {
  const sep = rawTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (sep) {
    const [, left, right] = sep;
    const artistIsWeak =
      !rawArtist ||
      /vevo$/i.test(rawArtist) ||
      /- topic$/i.test(rawArtist) ||
      rawArtist.toLowerCase() === 'unknown';
    if (artistIsWeak) {
      // "Artist - Title" packed into the title field
      return { title: cleanTitle(right), artist: cleanArtist(left) };
    }
    // Title just happens to have a dash (e.g. "Mr. Brightside - Radio Edit")
    return { title: cleanTitle(rawTitle), artist: cleanArtist(rawArtist) };
  }
  return { title: cleanTitle(rawTitle), artist: cleanArtist(rawArtist) };
}

/** Word-overlap similarity 0..1 — no external dep needed */
function wordSimilarity(a: string, b: string): number {
  const tok = (s: string) =>
    new Set(s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));
  const wa = tok(a);
  const wb = tok(b);
  if (wa.size === 0 && wb.size === 0) return 1;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.max(wa.size, wb.size);
}

// ── lrclib helpers ────────────────────────────────────────────────────────────

function extractResult(data: Record<string, unknown>): LyricsResult | null {
  if (typeof data.syncedLyrics === 'string' && data.syncedLyrics.trim()) {
    return { kind: 'synced', lines: parseLrc(data.syncedLyrics) };
  }
  if (typeof data.plainLyrics === 'string' && data.plainLyrics.trim()) {
    return { kind: 'plain', text: data.plainLyrics };
  }
  return null;
}

/** Exact match — fast path, works for clean library metadata */
async function getExact(
  title: string,
  artist: string,
  duration?: number,
): Promise<LyricsResult | null> {
  const params = new URLSearchParams({ track_name: title, artist_name: artist });
  if (duration) params.set('duration', String(Math.round(duration)));
  const res = await fetch(`https://lrclib.net/api/get?${params}`);
  if (!res.ok) return null;
  return extractResult(await res.json() as Record<string, unknown>);
}

/** Search endpoint — fuzzy, picks the best hit by word overlap */
async function search(title: string, artist: string): Promise<LyricsResult | null> {
  const params = new URLSearchParams({ track_name: title, artist_name: artist });
  const res = await fetch(`https://lrclib.net/api/search?${params}`);
  if (!res.ok) return null;
  const hits = await res.json() as Record<string, unknown>[];
  if (!Array.isArray(hits) || hits.length === 0) return null;

  const scored = hits
    .filter(h => h.syncedLyrics || h.plainLyrics)
    .map(h => ({
      h,
      score:
        wordSimilarity(String(h.trackName ?? ''), title) +
        wordSimilarity(String(h.artistName ?? ''), artist) * 0.5,
    }))
    .sort((a, b) => b.score - a.score);

  return scored.length > 0 ? extractResult(scored[0].h) : null;
}

/** Full-text search — last resort when artist field is unreliable */
async function searchQ(q: string): Promise<LyricsResult | null> {
  const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return null;
  const hits = await res.json() as Record<string, unknown>[];
  if (!Array.isArray(hits) || hits.length === 0) return null;
  const best = hits.find(h => h.syncedLyrics || h.plainLyrics);
  return best ? extractResult(best) : null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number,
): Promise<LyricsResult> {
  try {
    // Step 1 — exact hit with raw metadata (library tracks with clean names)
    const step1 = await getExact(title, artist, duration);
    if (step1) return step1;

    // Step 2 — clean / parse "Artist - Title" YouTube format
    const { title: cleanedTitle, artist: cleanedArtist } = normalise(title, artist);

    // Step 3 — exact hit with cleaned metadata
    if (cleanedTitle !== title || cleanedArtist !== artist) {
      const step3 = await getExact(cleanedTitle, cleanedArtist, duration);
      if (step3) return step3;
    }

    // Step 4 — fuzzy search with cleaned fields, scored by word overlap
    const step4 = await search(cleanedTitle, cleanedArtist);
    if (step4) return step4;

    // Step 5 — full-text fallback (e.g. when artist is still wrong/empty)
    const q = cleanedArtist ? `${cleanedArtist} ${cleanedTitle}` : cleanedTitle;
    const step5 = await searchQ(q);
    if (step5) return step5;

    return { kind: 'none' };
  } catch {
    return { kind: 'none' };
  }
}
