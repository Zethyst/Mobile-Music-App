import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';
import http from 'http';

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

// ─── YouTube URL cache (avoids re-running yt-dlp on every Range request) ─────
const URL_CACHE_TTL_MS = 20 * 60 * 1000; // 20 min — YouTube signed URLs live ~6 h
const streamUrlCache = new Map<string, { ytUrl: string; fetchedAt: number }>();

async function resolveYtUrl(videoId: string): Promise<string> {
  const cached = streamUrlCache.get(videoId);
  if (cached && Date.now() - cached.fetchedAt < URL_CACHE_TTL_MS) {
    return cached.ytUrl;
  }
  const bin = ytDlpBin();
  const { stdout } = await run(
    `${bin} ${cookiesFlag} ${proxyFlag} ${jsRuntimeFlag} --get-url --format "bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio/best" --extractor-args "youtube:player_client=tv" "https://www.youtube.com/watch?v=${videoId}"`
  );
  const ytUrl = stdout.trim().split('\n')[0];
  if (!ytUrl) throw new Error('yt-dlp returned no URL');
  streamUrlCache.set(videoId, { ytUrl, fetchedAt: Date.now() });
  return ytUrl;
}

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

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    __dirname,
    ytDlpBin: ytDlpBin(),
    binExists: fs.existsSync(path.join(__dirname, '..', 'bin', 'yt-dlp')),
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
      `${bin} ${cookiesFlag} ${proxyFlag} ${jsRuntimeFlag} --dump-json --flat-playlist --playlist-end 8 --extractor-args "youtube:player_client=tv" "ytsearch8:${q} audio"`
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
          duration: v.duration ?? null, // seconds, may be null for live
        };
      })
      .filter(r => r.duration && r.duration < 600); // drop anything > 10 min

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── Stream proxy: fetches audio on the server and pipes it to the client ────
// ExoPlayer streams /stream?videoId=… directly; the server proxies to YouTube
// so the CDN URL is always accessed from the same IP that yt-dlp used.
app.get('/stream', async (req: Request, res: Response) => {
  const videoId = req.query.videoId as string;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    const ytUrl = await resolveYtUrl(videoId);

    const parsedUrl = new URL(ytUrl);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const upstreamReq = transport.get(
      ytUrl,
      {
        headers: {
          // Forward Range so ExoPlayer can seek
          ...(req.headers.range ? { range: req.headers.range } : {}),
          'user-agent':
            'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          referer: 'https://www.youtube.com/',
        },
      },
      (upstream) => {
        // If YouTube signals the cached URL is stale, evict and ask client to retry
        if (upstream.statusCode === 403 || upstream.statusCode === 410) {
          streamUrlCache.delete(videoId);
          res.status(upstream.statusCode).json({ error: 'Stream URL expired, please retry' });
          upstream.resume();
          return;
        }

        res.status(upstream.statusCode ?? 200);

        // Forward headers ExoPlayer needs for seeking and format detection
        for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
          const v = upstream.headers[h];
          if (v) res.setHeader(h, v);
        }
        res.setHeader('cache-control', 'no-store');

        upstream.pipe(res);
        res.on('close', () => upstream.destroy());
      },
    );

    upstreamReq.on('error', (err) => {
      console.error('[stream proxy] upstream error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Upstream error' });
    });

  } catch (err) {
    console.error('[stream proxy]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Could not stream track' });
  }
});

app.listen(PORT, () => console.log(`[+] Server running on port ${PORT}`));
