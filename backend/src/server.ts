import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const app = express();
const run = promisify(exec);
const PORT = process.env.PORT || 8000;

// ─── yt-dlp config ────────────────────────────────────────────────────────────
const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
const cookiesFlag = fs.existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : '';
const PROXY = process.env.YTDLP_PROXY ?? '';
const proxyFlag = PROXY ? `--proxy "${PROXY}"` : '';
const jsRuntimeFlag = process.env.YTDLP_JS_RUNTIME
  ? `--js-runtimes ${process.env.YTDLP_JS_RUNTIME}`
  : '';

function ytDlpBin(): string {
  if (process.env.YT_DLP_PATH) return process.env.YT_DLP_PATH;
  const bundled = path.join(__dirname, '..', 'bin', 'yt-dlp');
  if (fs.existsSync(bundled)) return bundled;
  return 'yt-dlp';
}

// ─── Stream: in-flight coalescer (no cache) ───────────────────────────────────
const STREAM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  Referer: 'https://www.youtube.com/',
  Origin:  'https://www.youtube.com',
};

const inflight = new Map<string, Promise<string>>();

async function resolveStreamUrl(videoId: string): Promise<string> {
  const existing = inflight.get(videoId);
  if (existing) return existing;

  const bin = ytDlpBin();
  const promise = run(
    `${bin} ${cookiesFlag} ${proxyFlag} ${jsRuntimeFlag}` +
    ` --get-url --no-warnings --no-cache-dir` +
    ` --format "bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio/best"` +
    ` --extractor-args "youtube:player_client=ios,mweb,tv"` +
    ` "https://www.youtube.com/watch?v=${videoId}"`,
  )
    .then(({ stdout }) => {
      const url = stdout.trim().split('\n')[0];
      if (!url) throw new Error('yt-dlp returned no URL');
      return url;
    })
    .finally(() => inflight.delete(videoId));

  inflight.set(videoId, promise);
  return promise;
}

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    ytDlpBin:  ytDlpBin(),
    binExists: fs.existsSync(path.join(__dirname, '..', 'bin', 'yt-dlp')),
  });
});

app.get('/search', async (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: 'Missing query param: q' });

  try {
    const bin = ytDlpBin();
    const { stdout } = await run(
      `${bin} ${cookiesFlag} ${proxyFlag} ${jsRuntimeFlag} --dump-json --flat-playlist --playlist-end 8 --no-warnings --no-cache-dir --extractor-args "youtube:player_client=tv" "ytsearch8:${q} audio"`,
    );

    const results = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const v = JSON.parse(line);
        return {
          videoId:   v.id,
          title:     v.title,
          artist:    v.channel ?? v.uploader ?? '',
          thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
          duration:  v.duration ?? null,
        };
      })
      .filter(r => r.duration && r.duration < 600);

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/stream-url', async (req: Request, res: Response) => {
  const videoId = req.query.videoId as string;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  if (req.query.bust === '1') inflight.delete(videoId);

  try {
    const url = await resolveStreamUrl(videoId);
    res.json({ url, headers: STREAM_HEADERS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not get stream URL' });
  }
});

/** Proxy-download endpoint: resolves the CDN URL server-side and pipes audio bytes
 *  to the client, so the device never needs to send YouTube-specific headers itself. */
app.get('/download', async (req: Request, res: Response) => {
  const videoId = req.query.videoId as string;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  let cdnUrl: string;
  try {
    cdnUrl = await resolveStreamUrl(videoId);
  } catch (err) {
    console.error('[download] yt-dlp error:', err);
    return res.status(500).json({ error: 'Could not resolve stream URL' });
  }

  try {
    const upstream = await fetch(cdnUrl, { headers: STREAM_HEADERS });
    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream returned ${upstream.status}` });
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'audio/mp4');
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${videoId}.m4a"`);

    if (!upstream.body) {
      return res.status(502).json({ error: 'Empty upstream body' });
    }

    const { Readable } = await import('stream');
    Readable.fromWeb(upstream.body as import('stream/web').ReadableStream).pipe(res);
  } catch (err) {
    console.error('[download] proxy error:', err);
    if (!res.headersSent) res.status(502).json({ error: 'Proxy fetch failed' });
  }
});

app.listen(PORT, () => console.log(`[+] Server running on port ${PORT}`));
