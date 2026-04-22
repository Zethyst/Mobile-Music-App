import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import { exec, spawn } from 'child_process';
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
    ` --format "bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio[ext=webm]/bestaudio/best"` +
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

/** Download endpoint: spawns yt-dlp with -o - (stdout) and pipes audio bytes directly
 *  to the client. yt-dlp manages all CDN auth/fingerprinting internally, avoiding 403s
 *  that occur when Node's fetch() tries to re-use a URL resolved by yt-dlp. */
app.get('/download', (req: Request, res: Response) => {
  const videoId = req.query.videoId as string;
  const reqId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  console.log('[download] start', {
    reqId,
    videoId,
    userAgent: req.get('user-agent')?.slice(0, 120),
  });

  if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
    console.warn('[download] bad/missing videoId', { reqId, videoId });
    return res.status(400).json({ error: 'Missing or invalid videoId' });
  }

  const bin = ytDlpBin();
  const args: string[] = [
    ...(cookiesFlag ? ['--cookies', cookiesPath] : []),
    ...(PROXY ? ['--proxy', PROXY] : []),
    '--no-warnings',
    '--no-cache-dir',
    '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio[ext=webm]/bestaudio/best',
    // Use android+web clients for downloads — they expose far more downloadable
    // formats than ios/mweb/tv which are optimised for streaming URL extraction.
    '--extractor-args', 'youtube:player_client=android,web',
    '-o', '-',
    `https://www.youtube.com/watch?v=${videoId}`,
  ];

  console.log('[download] spawning yt-dlp', { reqId, videoId, bin, args: args.join(' ') });

  const ytdlp = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderrBuf = '';
  ytdlp.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuf += text;
  });

  // Send headers immediately so the client (RNFS) doesn't time out waiting for
  // a response while yt-dlp is still in its pre-download phase (e.g. JS challenge
  // solving, rate-limit sleeps). The body follows once yt-dlp starts outputting.
  res.setHeader('Content-Type', 'audio/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${videoId}.m4a"`);
  res.setHeader('Transfer-Encoding', 'chunked');
  res.status(200);
  // Flush the headers to the socket immediately
  res.flushHeaders();
  ytdlp.stdout.pipe(res);

  ytdlp.stdout.once('data', () => {
    console.log('[download] first bytes piped to client', { reqId, videoId });
  });

  ytdlp.on('close', (code) => {
    const stderr = stderrBuf.slice(-800);
    if (code === 0) {
      console.log('[download] yt-dlp done', { reqId, videoId });
    } else {
      console.error('[download] yt-dlp non-zero exit', { reqId, videoId, code, stderr });
    }
  });

  ytdlp.on('error', (err) => {
    console.error('[download] spawn error', { reqId, videoId, err });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start yt-dlp' });
    }
  });

  req.on('close', () => {
    if (!res.writableEnded) {
      console.log('[download] client disconnected, killing yt-dlp', { reqId, videoId });
      ytdlp.kill('SIGTERM');
    }
  });
});

app.listen(PORT, () => console.log(`[+] Server running on port ${PORT}`));
