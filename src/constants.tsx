import { Image } from 'react-native';

/** Resolved `file://` / `asset:` URI for bundled media (TrackPlayer + `Image` `uri`). */
const assetUri = (mod: number) => Image.resolveAssetSource(mod).uri;

const defaultArt = require('./assets/Images/default_art.png');
export const DEFAULT_COVER_URI = assetUri(defaultArt);

const cover1 = require('./assets/Images/cover1.jpg');
const cover2 = require('./assets/Images/cover2.jpg');
const cover3 = require('./assets/Images/cover3.jpg');
const cover5 = require('./assets/Images/cover5.jpg');
const cover6 = require('./assets/Images/cover6.jpg');
const cover7 = require('./assets/Images/cover7.jpg');
const cover8 = require('./assets/Images/cover8.jpg');
const cover10 = require('./assets/Images/cover10.jpg');
const cover11 = require('./assets/Images/cover11.jpg');
const cover12 = require('./assets/Images/cover12.jpg');
const cover15 = require('./assets/Images/cover15.jpg');
const cover16 = require('./assets/Images/cover16.jpg');
const cover17 = require('./assets/Images/cover17.jpg');
const cover18 = require('./assets/Images/cover18.jpg');
const cover20 = require('./assets/Images/cover20.jpg');

const singer1 = require('./assets/Images/singer1.jpg');
const singer2 = require('./assets/Images/singer2.jpg');
const developer = require('./assets/Images/developer.jpeg');

const screenshotAlbums = require('./assets/Screenshots/Albums.png');
const screenshotLyrics = require('./assets/Screenshots/Lyrics.png');
const screenshotPlay = require('./assets/Screenshots/SongPlay.png');
const screenshotPause = require('./assets/Screenshots/SongPause.png');

const COVER_BY_SONG_NUM: Record<number, number> = {
  1: cover1,
  2: cover2,
  3: cover3,
  5: cover5,
  6: cover6,
  7: cover7,
  8: cover8,
  10: cover10,
  11: cover11,
  12: cover12,
  15: cover15,
  16: cover16,
  17: cover17,
  18: cover18,
  20: cover20,
};

const song1 = require('./assets/Songs/song1.mp3');
const song2 = require('./assets/Songs/song2.mp3');
const song3 = require('./assets/Songs/song3.mp3');
const song5 = require('./assets/Songs/song5.mp3');
const song6 = require('./assets/Songs/song6.mp3');
const song7 = require('./assets/Songs/song7.mp3');
const song8 = require('./assets/Songs/song8.mp3');
const song10 = require('./assets/Songs/song10.mp3');
const song11 = require('./assets/Songs/song11.mp3');
const song12 = require('./assets/Songs/song12.mp3');
const song15 = require('./assets/Songs/song15.mp3');
const song16 = require('./assets/Songs/song16.mp3');
const song17 = require('./assets/Songs/song17.mp3');
const song18 = require('./assets/Songs/song18.mp3');
const song20 = require('./assets/Songs/song20.mp3');
const blankSound = require('./assets/Songs/Blank_Sound.mp3');

/** Song numbers that have bundled MP3s (no 4, 9, 13, 14, or 19 in assets). */
const SONG_NUMBERS_ORDER = [
  1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 15, 16, 17, 18, 20,
] as const;

const SONG_MODULE: Record<(typeof SONG_NUMBERS_ORDER)[number], number> = {
  1: song1,
  2: song2,
  3: song3,
  5: song5,
  6: song6,
  7: song7,
  8: song8,
  10: song10,
  11: song11,
  12: song12,
  15: song15,
  16: song16,
  17: song17,
  18: song18,
  20: song20,
};

/**
 * Display metadata for each bundled MP3. Key matches the file (`song8.mp3` → `8`).
 * `duration` is seconds (optional); if omitted, a default length is used for the seek UI.
 */
type SongMeta = { title: string; artist: string; album: string; duration?: number };

const TRACK_META: Record<(typeof SONG_NUMBERS_ORDER)[number], SongMeta> = {
  1: { title: 'Home', artist: 'Vince Staples', album: 'Spider-Man: Into the Spider-Verse', duration: 211 },
  2: { title: 'Am I Dreaming', artist: 'Metro Boomin & ASAP Rocky', album: 'Spider-Man: Across the Spider-Verse', duration: 256 },
  3: { title: 'FallingForYou', artist: 'The 1975', album: 'IV', duration: 241 },
  5: {
    title: "Dil Mere",
    artist: 'The Local Train',
    album: 'Alas Ka Ped',
    duration: 223,
  },
  6: {
    title: 'Midnight',
    artist: 'Coldplay',
    album: 'Ghost Stories',
    duration: 236,
  },
  7: {
    title: 'Deva Deva',
    artist: 'Arijit Singh',
    album: 'Bhramastra',
    duration: 589,
  },
  8: {
    title: 'Castle of Glass',
    artist: 'Linkin Park',
    album: 'Meteora',
    duration: 286,
  },
  10: {
    title: 'Tangled Up',
    artist: 'Parade of Lights',
    album: '13 Reasons Why',
    duration: 234,
  },
  11: {
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    duration: 210,
  },
  12: {
    title: 'All We Know',
    artist: 'The Chainsmokers',
    album: 'Collage',
    duration: 163,
  },
  15: {
    title: 'I Found',
    artist: 'Amber Run',
    album: '5 AM',
    duration: 209,
  },
  16: {
    title: 'There You Are',
    artist: 'Zayn Malik',
    album: 'Icarus Falls',
    duration: 154,
  },
  17: {
    title: "I Wanna Be Yours",
    artist: 'Arctic Monkeys',
    album: 'AM',
    duration: 198,
  },
  18: {
    title: 'Softcore',
    artist: 'The Neighbourhood',
    album: 'Hard To Imagine The Neighbourhood Ever Being Anything Other Than A Huge Success',
    duration: 194,
  },
  20: {
    title: 'So Long, Goodbye',
    artist: 'Danny Zee',
    album: 'Blue Butterfly',
    duration: 222,
  },
};

/** Hero carousel on Music Library (`singer1` / `singer2` assets). Order = first slide first. */
export const libraryArtistSpotlights = [
  {
    id: 'spotlight-lp',
    name: 'Linkin Park',
    listeners: '55,283,418 monthly listeners',
    coverUri: assetUri(singer2),
    /** https://open.spotify.com/artist/6XyY86QOPPrYVGvF9ch6wz */
    spotifyArtistId: '6XyY86QOPPrYVGvF9ch6wz',
  },
  {
    id: 'spotlight-zayn',
    name: 'Zayn Malik',
    listeners: '29,253,288 monthly listeners',
    coverUri: assetUri(singer1),
    /** https://open.spotify.com/artist/5ZsFI1h6hIdQRw2ti0hz81 */
    spotifyArtistId: '5ZsFI1h6hIdQRw2ti0hz81',
  },  
  {
    id: 'spotlight-dev',
    name: 'Akshat Jaiswal',
    listeners: 'Stuck somewhere?',
    coverUri: assetUri(developer),
    /** Opens WhatsApp app when installed (`whatsapp://`). */
    contactAppLink:
      'whatsapp://send?phone=918318876136&text=' + encodeURIComponent('Hi'),
    /** Web / universal link fallback. */
    contactLink:
      'https://api.whatsapp.com/send?phone=918318876136&text=' +
      encodeURIComponent('Hi'),
  },
] as const;

/** Grid items for full albums screen — `trackIndex` maps to `tracks` queue order. */
export const libraryAlbums = [
  ...SONG_NUMBERS_ORDER.map((n, i) => {
    const m = TRACK_META[n];
    return {
      id: `al${n}`,
      title: m.title,
      artist: m.artist,
      coverUri: assetUri(COVER_BY_SONG_NUM[n] ?? defaultArt),
      trackIndex: i,
    };
  }),
];

const LIBRARY_HOME_ALBUM_CARD_COUNT = 2;

/** Album tiles on the library home row (excludes blank utility track). */
export const libraryAlbumsHomePreview = libraryAlbums
  .filter(a => a.id !== 'al-blank')
  .slice(0, LIBRARY_HOME_ALBUM_CARD_COUNT);

export const tracks = [
  ...SONG_NUMBERS_ORDER.map((n, i) => {
    const coverMod = COVER_BY_SONG_NUM[n] ?? defaultArt;
    const m = TRACK_META[n];
    return {
      id: String(n),
      url: SONG_MODULE[n] as unknown as string,
      title: m.title,
      artist: m.artist,
      album: m.album,
      artwork: assetUri(coverMod),
      duration: m.duration ?? 200 + (i % 5) * 17,
    };
  }),
  {
    id: 'blank',
    url: blankSound as unknown as string,
    title: 'Blank sound',
    artist: 'Local library',
    album: 'Utilities',
    artwork: DEFAULT_COVER_URI,
    duration: 30,
  },
];

/**
 * RNTP on iOS often omits `artwork` on the active track until the queue changes.
 * Resolve bundled cover from `tracks` by library id so the first song shows art on cold start.
 */
export function resolveTrackArtworkUri(
  track: { id?: string | number; artwork?: unknown } | null | undefined,
): string | undefined {
  if (!track) return undefined;
  const a = track.artwork;
  if (typeof a === 'string' && a.trim().length > 0) return a;
  const id = track.id != null ? String(track.id) : '';
  if (/^\d+$/.test(id) || id === 'blank') {
    const lib = tracks.find(t => String(t.id) === id);
    const u = lib?.artwork;
    if (typeof u === 'string' && u.length > 0) return u;
  }
  return undefined;
}

export const COLORS = {
  background: '#f0eef6',
  card: '#f8f4fc',
  primary: '#5232c1',
  secondary: '#12ccd0',
  text: '#232323',
  textLight: '#888',
  border: '#e5e5e5',
  shadow: 'rgba(0,0,0,0.15)',
  playing: '#0099ff',
  white: '#fff',
};
