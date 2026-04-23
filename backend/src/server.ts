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

function proxyHostnameForLog(): string | null {
  const p = process.env.YTDLP_PROXY || '';
  if (!p) return null;
  try {
    return new URL(p).hostname;
  } catch {
    return 'invalid-proxy-url';
  }
}

/** Safe summary for logs — avoids dumping long-lived signed query strings in full. */
function summarizeResolvedStream(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n').filter(Boolean);
  const first = lines[0] ?? '';
  const out: Record<string, unknown> = {
    lineCount: lines.length,
    firstLineChars: first.length,
  };
  if (lines.length > 1) {
    out.warning =
      'Multiple stdout lines — using first only; DASH/multi-URL output can confuse clients.';
  }
  try {
    const u = new URL(first);
    out.urlHost = u.hostname;
    out.pathPrefix = u.pathname.slice(0, 96);
    out.queryParamKeys = [...u.searchParams.keys()].slice(0, 20);
    const host = u.hostname.toLowerCase();
    out.looksLikeGoogleVideo = host.includes('googlevideo.') || host.includes('gvt1.');
    const itag = u.searchParams.get('itag');
    if (itag) out.itag = itag;
    const ipParam = u.searchParams.get('ip');
    if (ipParam) {
      out.ipParamPresent = true;
      // Mask for logs — CDN URLs minted via proxy often embed the proxy exit IP; phone IP mismatch → 403.
      out.ipParamMasked = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipParam)
        ? ipParam.replace(/^(\d{1,3}\.\d{1,3})\.\d+\.\d+$/, '$1.x.x')
        : `${ipParam.slice(0, 10)}…(${ipParam.length}b)`;
    }
  } catch {
    out.parseableAsUrl = false;
    out.firstLinePrefix = first.slice(0, 96);
  }
  const low = first.toLowerCase();
  if (low.includes('.webm') || low.includes('mime=audio%2Fwebm')) out.formatHint = 'webm';
  else if (low.includes('.m4a') || low.includes('mime=audio%2Fmp4')) out.formatHint = 'm4a_or_mp4_audio';
  else if (low.includes('.mp4')) out.formatHint = 'mp4';
  else out.formatHint = 'unknown';
  return out;
}

type ExecErr = NodeJS.ErrnoException & { stdout?: string; stderr?: string };

async function resolveStreamUrl(videoId: string): Promise<string> {
  const existing = inflight.get(videoId);
  if (existing) return existing;

  const bin = ytDlpBin();
  // Read proxy at request time (not module load) to pick up env var changes
  const proxy = process.env.YTDLP_PROXY || '';
  const proxyArg = proxy ? `--proxy "${proxy}"` : '';

  console.log('[stream-url] resolve start', {
    videoId,
    ytDlp: bin === 'yt-dlp' ? 'PATH' : bin,
    cookiesFile: !!cookiesFlag,
    proxyHost: proxyHostnameForLog(),
  });

  const promise = run(
    `${bin} ${cookiesFlag} ${proxyArg} ${jsRuntimeFlag}` +
    ` --get-url --no-warnings --no-cache-dir` +
    ` --format "bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio/best"` +
    ` --extractor-args "youtube:player_client=tv_embedded,ios,mweb"` +
    ` "https://www.youtube.com/watch?v=${videoId}"`,
  )
    .then(({ stdout, stderr }) => {
      const url = stdout.trim().split('\n')[0];
      if (!url) {
        console.error('[stream-url] yt-dlp empty stdout', {
          videoId,
          stderrTail: (stderr ?? '').slice(-1500),
        });
        throw new Error('yt-dlp returned no URL');
      }
      const summary = summarizeResolvedStream(stdout);
      if ((stderr ?? '').trim()) {
        console.warn('[stream-url] yt-dlp stderr (non-fatal)', {
          videoId,
          stderrTail: stderr!.trim().slice(-1200),
        });
      }
      console.log('[stream-url] resolve ok', { videoId, ...summary });
      return url;
    })
    .catch((err: ExecErr) => {
      console.error('[stream-url] resolve failed', {
        videoId,
        message: err?.message,
        code: err?.code,
        stderrTail: typeof err?.stderr === 'string' ? err.stderr.slice(-2500) : undefined,
        stdoutTail: typeof err?.stdout === 'string' ? err.stdout.slice(-800) : undefined,
      });
      throw err;
    })
    .finally(() => inflight.delete(videoId));

  inflight.set(videoId, promise);
  return promise;
}

app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  let version = 'unknown';
  try {
    const { stdout } = await run(`${ytDlpBin()} --version`);
    version = stdout.trim();
  } catch {}
  const proxy = process.env.YTDLP_PROXY || '';
  res.json({
    status:    'ok',
    ytDlpBin:  ytDlpBin(),
    binExists: fs.existsSync(path.join(__dirname, '..', 'bin', 'yt-dlp')),
    version,
    proxySet:  proxy.length > 0,
    proxyHost: proxy ? (() => { try { return new URL(proxy).hostname; } catch { return 'invalid'; } })() : null,
  });
});

/** Debug endpoint: list available formats for a video (helps diagnose download failures). */
app.get('/debug-formats', async (req: Request, res: Response) => {
  const videoId = req.query.videoId as string;
  const noCookies = req.query.noCookies === '1';
  const noProxy = req.query.noProxy === '1';
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    const bin = ytDlpBin();
    const proxy = noProxy ? '' : (process.env.YTDLP_PROXY || '');
    const proxyArg = proxy ? `--proxy "${proxy}"` : '';
    const cookieArg = noCookies ? '' : cookiesFlag;
    const { stdout, stderr } = await run(
      `${bin} ${cookieArg} ${proxyArg} --no-warnings --no-cache-dir --list-formats "https://www.youtube.com/watch?v=${videoId}"`,
      { timeout: 60000 },
    );
    res.json({ videoId, proxyUsed: !!proxy, cookiesUsed: !noCookies, formats: stdout, stderr });
  } catch (err: any) {
    res.status(500).json({
      videoId,
      error: err.message,
      stdout: err.stdout,
      stderr: err.stderr,
    });
  }
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

  const bust = req.query.bust === '1';
  if (bust) inflight.delete(videoId);

  console.log('[stream-url] HTTP request', {
    videoId,
    bust,
    xForwardedFor: req.get('x-forwarded-for')?.split(',')[0]?.trim()?.slice(0, 64),
    userAgent: req.get('user-agent')?.slice(0, 120),
  });

  try {
    const url = await resolveStreamUrl(videoId);
    res.json({ url, headers: STREAM_HEADERS });
    console.log('[stream-url] HTTP 200', { videoId, bust });
  } catch (err) {
    console.error('[stream-url] HTTP 500', { videoId, bust, err });
    res.status(500).json({ error: 'Could not get stream URL' });
  }
});

type PipeMode = 'download' | 'stream-pipe';

/** Spawns yt-dlp `-o -` and pipes stdout to the HTTP response.
 *  `stream-pipe` adds the same proxy / extractor-args as `/stream-url` so Render matches resolution.
 *  `download` keeps the minimal arg set (tunnel / local). */
function pipeYtdlpAudio(req: Request, res: Response, videoId: string, mode: PipeMode): void {
  const reqId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const logTag = mode === 'download' ? '[download]' : '[stream-pipe]';

  console.log(`${logTag} start`, {
    reqId,
    videoId,
    userAgent: req.get('user-agent')?.slice(0, 120),
  });

  if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
    console.warn(`${logTag} bad/missing videoId`, { reqId, videoId });
    res.status(400).json({ error: 'Missing or invalid videoId' });
    return;
  }

  const bin = ytDlpBin();
  const args: string[] =
    mode === 'download'
      ? [
          ...(cookiesFlag ? ['--cookies', cookiesPath] : []),
          '--no-warnings',
          '--no-cache-dir',
          '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio/best',
          '--no-playlist',
          '-o', '-',
          `https://www.youtube.com/watch?v=${videoId}`,
        ]
      : [
          ...(cookiesFlag ? ['--cookies', cookiesPath] : []),
          ...(PROXY ? ['--proxy', PROXY] : []),
          ...(process.env.YTDLP_JS_RUNTIME
            ? ['--js-runtimes', process.env.YTDLP_JS_RUNTIME]
            : []),
          '--no-warnings',
          '--no-cache-dir',
          '--extractor-args', 'youtube:player_client=tv_embedded,ios,mweb',
          '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio/best',
          '--no-playlist',
          '-o', '-',
          `https://www.youtube.com/watch?v=${videoId}`,
        ];

  console.log(`${logTag} spawning yt-dlp`, { reqId, videoId, bin, mode });

  const ytdlp = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderrBuf = '';
  ytdlp.stderr.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString();
  });

  res.setHeader('Content-Type', 'audio/mp4');
  res.setHeader(
    'Content-Disposition',
    mode === 'download'
      ? `attachment; filename="${videoId}.m4a"`
      : `inline; filename="${videoId}.m4a"`,
  );
  res.setHeader('Transfer-Encoding', 'chunked');
  res.status(200);
  res.flushHeaders();
  ytdlp.stdout.pipe(res);

  ytdlp.stdout.once('data', () => {
    console.log(`${logTag} first bytes to client`, { reqId, videoId });
  });

  ytdlp.on('close', (code) => {
    const stderr = stderrBuf.slice(-800);
    if (code === 0) {
      console.log(`${logTag} yt-dlp done`, { reqId, videoId });
    } else {
      console.error(`${logTag} yt-dlp non-zero exit`, { reqId, videoId, code, stderr });
    }
  });

  ytdlp.on('error', (err) => {
    console.error(`${logTag} spawn error`, { reqId, videoId, err });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start yt-dlp' });
    }
  });

  req.on('close', () => {
    if (!res.writableEnded) {
      console.log(`${logTag} client disconnected, killing yt-dlp`, { reqId, videoId });
      ytdlp.kill('SIGTERM');
    }
  });
}

/** Same as `/download` — kept as a thin wrapper for clarity. */
app.get('/download', (req: Request, res: Response) => {
  const videoId = req.query.videoId as string;
  pipeYtdlpAudio(req, res, videoId, 'download');
});

/** Progressive playback: phone streams from *this* URL only. yt-dlp talks to YouTube on the server,
 *  avoiding googlevideo URLs that are bound to the proxy / resolver IP (device then gets 403). */
app.get('/stream-pipe', (req: Request, res: Response) => {
  const videoId = req.query.videoId as string;
  console.log('[stream-pipe] HTTP request', {
    videoId,
    xForwardedFor: req.get('x-forwarded-for')?.split(',')[0]?.trim()?.slice(0, 64),
  });
  pipeYtdlpAudio(req, res, videoId, 'stream-pipe');
});

app.listen(PORT, () => console.log(`[+] Server running on port ${PORT}`));
