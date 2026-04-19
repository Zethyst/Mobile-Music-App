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
      `${bin} ${cookiesFlag} ${proxyFlag} --dump-json --flat-playlist --playlist-end 8 --extractor-args "youtube:player_client=tv" "ytsearch8:${q} audio"`
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

// ─── Stream URL: returns a direct audio URL for TrackPlayer ──────────────────
app.get('/stream-url', async (req: Request, res: Response) => {
  const videoId = req.query.videoId as string;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    const bin = ytDlpBin();
    const { stdout } = await run(
      `${bin} ${cookiesFlag} ${proxyFlag} --get-url --format "bestaudio/best" --extractor-args "youtube:player_client=tv" "https://www.youtube.com/watch?v=${videoId}"`
    );
    const url = stdout.trim().split('\n')[0];
    if (!url) throw new Error('No stream URL returned');
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not get stream URL' });
  }
});

app.listen(PORT, () => console.log(`[+] Server running on port ${PORT}`));
