import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load `.env` from `backend/` whether you run from `backend/` or repo root (`node backend/dist/server.js`).
dotenv.config({ path: path.join(__dirname, '..', '.env') });
import express, { Request, Response } from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const app = express();
const run = promisify(exec);
const PORT = process.env.PORT || 8000;
const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
const cookiesFlag = fs.existsSync(cookiesPath)
  ? `--cookies "${cookiesPath}"`
  : '';
const PROXY = process.env.YTDLP_PROXY ?? ''; // e.g. "http://user:pass@host:port"
const proxyFlag = PROXY ? `--proxy "${PROXY}"` : '';
const jsRuntimeFlag = process.env.YTDLP_JS_RUNTIME 
  ? `--js-runtimes ${process.env.YTDLP_JS_RUNTIME}` 
  : '';


/** Render build drops the binary in `backend/bin/`; locally use PATH or YT_DLP_PATH. */
function ytDlpBin(): string {
  if (process.env.YT_DLP_PATH) {
    return process.env.YT_DLP_PATH;
  }
  const bundled = path.join(__dirname, '..', 'bin', 'yt-dlp');
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return 'yt-dlp';
}

app.use(cors());
app.use(express.json());

// ─── Prefetch generation — incremented on every new search ───────────────────
// The background loop checks this before each batch so stale searches stop
// resolving as soon as a new search supersedes them.
let prefetchGen = 0;

// ─── Stream URL cache ─────────────────────────────────────────────────────────
// YouTube signed URLs are valid for ~6 h. We cache for 5 h to stay safe.
const CACHE_TTL_MS = 5 * 60 * 60 * 1000;
const STREAM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Referer': 'https://www.youtube.com/',
  'Origin': 'https://www.youtube.com',
};

type CacheEntry = { url: string; resolvedAt: number };
const streamUrlCache = new Map<string, CacheEntry>();
/** In-flight promises — avoids duplicate yt-dlp processes for the same videoId */
const inflight = new Map<string, Promise<string>>();

async function resolveStreamUrl(videoId: string): Promise<string> {
  const cached = streamUrlCache.get(videoId);
  if (cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS) {
    return cached.url;
  }

  const existing = inflight.get(videoId);
  if (existing) return existing;

  const bin = ytDlpBin();
  const promise = run(
    `${bin} ${cookiesFlag} ${proxyFlag} ${jsRuntimeFlag}` +
    ` --get-url --no-warnings --no-cache-dir` +
    ` --format "bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio/best"` +
    ` --extractor-args "youtube:player_client=ios,mweb,tv"` +
    ` "https://www.youtube.com/watch?v=${videoId}"`
  ).then(({ stdout }) => {
    const url = stdout.trim().split('\n')[0];
    if (!url) throw new Error('yt-dlp returned no URL');
    streamUrlCache.set(videoId, { url, resolvedAt: Date.now() });
    return url;
  }).finally(() => {
    inflight.delete(videoId);
  });

  inflight.set(videoId, promise);
  return promise;
}

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    __dirname,
    ytDlpBin: ytDlpBin(),
    binExists: fs.existsSync(path.join(__dirname, '..', 'bin', 'yt-dlp')),
    cachedUrls: streamUrlCache.size,
  });
});

// ─── Search: returns title/artist/thumbnail list ──────────────────────────────
app.get('/search', async (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: 'Missing query param: q' });

  try {
    const bin = ytDlpBin();
    // Returns JSON lines — one object per result
    const { stdout } = await run(
      `${bin} ${cookiesFlag} ${proxyFlag} ${jsRuntimeFlag} --dump-json --flat-playlist --playlist-end 8 --no-warnings --no-cache-dir --extractor-args "youtube:player_client=tv" "ytsearch8:${q} audio"`
    );

    const results = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const v = JSON.parse(line);
        return {
          videoId: v.id,
          title: v.title,
          artist: v.channel ?? v.uploader ?? '',
          thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
          duration: v.duration ?? null,
        };
      })
      .filter(r => r.duration && r.duration < 600);

    res.json({ results });

    // Pre-resolve stream URLs sequentially in the background.
    // Only the top 3 results are prefetched — the user almost always taps one
    // of the first few. Sequential (1 at a time) keeps peak memory well under
    // Render's 512 MB limit: at most 2 yt-dlp processes alive at once
    // (1 prefetch + 1 real user request).
    const ids = results.slice(0, 3).map(r => r.videoId);
    const gen = ++prefetchGen;
    (async () => {
      for (const id of ids) {
        if (prefetchGen !== gen) break;
        await resolveStreamUrl(id).catch(() => {});
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── Stream URL: returns a CDN URL + headers for TrackPlayer ─────────────────
app.get('/stream-url', async (req: Request, res: Response) => {
  const videoId = req.query.videoId as string;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    const url = await resolveStreamUrl(videoId);
    res.json({ url, headers: STREAM_HEADERS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not get stream URL' });
  }
});

app.listen(PORT, () => console.log(`[+] Server running on port ${PORT}`));
