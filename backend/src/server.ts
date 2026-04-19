import express, { Request, Response } from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const app  = express();
const run  = promisify(exec);
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ─── Search: returns title/artist/thumbnail list ──────────────────────────────
app.get('/search', async (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: 'Missing query param: q' });

  try {
    // Returns JSON lines — one object per result
    const { stdout } = await run(
      `yt-dlp --dump-json --flat-playlist --playlist-end 8 "ytsearch8:${q} audio"`
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
          duration:  v.duration ?? null,   // seconds, may be null for live
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
  if (!videoId) return res.status(400).json({ error: 'Missing query param: videoId' });

  try {
    const { stdout } = await run(
      // bestaudio gives m4a/webm — both stream fine in react-native-track-player
      `yt-dlp --get-url --format bestaudio "https://www.youtube.com/watch?v=${videoId}"`
    );
    const url = stdout.trim().split('\n')[0]; // take first URL if multiple
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not get stream URL' });
  }
});

app.listen(PORT, () => console.log(`[+] Server running on port ${PORT}`));