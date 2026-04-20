<h1 align="center">Music App</h1>

<p align="center">A React Native music player that streams audio via a small Node backend powered by <strong>yt-dlp</strong>. Search tracks, build a queue, play with <strong>react-native-track-player</strong>, and browse albums and lyrics from a single stack-based UI.</p>

---

## Tech stack

**App (React Native)**

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)&nbsp;
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)&nbsp;
![React Navigation](https://img.shields.io/badge/React_Navigation-6C63FF?style=for-the-badge&logo=react&logoColor=white)&nbsp;

- **Playback:** [react-native-track-player](https://github.com/doublesymmetry/react-native-track-player) (lock screen / notification controls, queue)
- **UI:** Linear gradients, SVG progress ring (mini player), gesture handler (edge swipe back, queue drag), haptic feedback
- **Networking:** `fetch` to the stream backend (search + signed stream URLs)

**Backend (`backend/`)**

- **Node.js** + **Express** + **TypeScript**
- **yt-dlp** resolves YouTube search results and direct audio stream URLs; responses include headers the app forwards so the native player can stream reliably

**Platforms**

![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)&nbsp;
![iOS](https://img.shields.io/badge/iOS-000000?style=for-the-badge&logo=ios&logoColor=white)&nbsp;

---

## Features

- **Full-screen player** — Artwork, title/artist, seek, shuffle/repeat, lyrics shortcut, library entry
- **Mini player** — Floating pill with rotating artwork, gradient progress ring, play/pause
- **Search** — Query the backend; results add to the queue and resolve stream URLs on demand
- **Music library** — Albums and songs grids; navigation to full lists
- **Queue** — View upcoming tracks, reorder by drag, remove tracks, clear queue
- **Lyrics** — Dedicated screen for synced or static lyrics (when available)
- **Splash** — Animated loading screen while Track Player initializes and the backend health check runs

---

## Project layout

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Navigation stack, splash until player is ready |
| `src/screens/` | Player, library, search, queue, lyrics, full albums/songs |
| `src/services/streamService.ts` | Backend base URL, `searchYouTube`, `getStreamUrl`, health ping |
| `src/services/musicPlayerServices.ts` | Track Player setup and helpers |
| `backend/src/server.ts` | Express: `/health`, `/search`, `/stream-url` |
| `render.yaml` | Example deploy config for the backend (adjust env vars for your host) |

---

## Getting started

Requirements:

- [Node.js](https://nodejs.org/) (see `package.json` `engines`; currently **≥ 22.11**)
- npm or Yarn
- [React Native environment](https://reactnative.dev/docs/set-up-your-environment) (Android Studio / Xcode)
- **Backend:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) on your `PATH` for local runs, or use the binary path from `render.yaml` / `YT_DLP_PATH`

### 1. Clone and install (app)

```sh
git clone Zethyst/Mobile-Music-App
cd musicapp
npm install
```

### 2. Backend URL

The app points at the deployed API in `src/services/streamService.ts` (`BACKEND`). For local development, change it to your machine, e.g.:

- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://127.0.0.1:8000`
- Physical device: your computer’s LAN IP (same Wi‑Fi)

### 3. Run the backend (optional, for local streaming)

```sh
cd backend
npm install
npm run dev
```

Optional: create `backend/.env` or set environment variables for `YTDLP_PROXY`, `YT_DLP_PATH`, `YTDLP_JS_RUNTIME`, and place `cookies.txt` in `backend/` if you need authenticated extraction (see `server.ts`).

### 4. Metro

```sh
cd musicapp   # repo root
npm start
```

### 5. Run the app

**Android**

```sh
npm run android
```

**iOS** (install pods when native deps change)

```sh
bundle install          # first time, if you use Bundler
bundle exec pod install # in ios/
npm run ios
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Metro bundler |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm test` | Jest |
| `npm run lint` | ESLint |

---

## License

This project is licensed under the MIT License.

---

<h2>Contact</h2>

[![linkedin](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/akshat-jaiswal-4664a2197)

© 2026 Akshat Jaiswal

[![forthebadge](https://forthebadge.com/images/badges/built-with-love.svg)](https://forthebadge.com)
