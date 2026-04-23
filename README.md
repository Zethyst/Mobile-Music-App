# Music App

A full-stack React Native music app (TypeScript) with a Node/Express backend that uses **yt-dlp** for YouTube search, **signed stream URLs** with ExoPlayer-safe headers, and **offline downloads** to device storage via **react-native-fs**; lyrics come from the **lrclib.net** API with title-normalization and multi-step search; the backend can run on **Render** (with optional `YTDLP_PROXY` and `cookies.txt` for YouTube) or locally, and for reliable downloads when cloud IPs are blocked, a **Cloudflare Tunnel** (or quick tunnel) can expose a **local Mac** so traffic uses a residential IP—features include a **tabbed navigator**, **mini player** with a gradient progress ring, **queue** with drag-and-reorder, **haptics**, **downloads library**, and **stream recovery / health** patterns.

## 📱 Download APK

Download the latest APK: **[Download APK](https://drive.google.com/file/d/1gEdhr837j26wb1u0ZoxRAdXawVsEVNXC/view?usp=sharing)** 🚀

## Tech stack

**App (React Native)**

React Native 
TypeScript 
React Navigation 

- **Playback:** [react-native-track-player](https://github.com/doublesymmetry/react-native-track-player) (lock screen / notification controls, queue)
- **Lyrics:** [lrclib.net](https://lrclib.net/) API (search + get-by-track), with title cleanup for YouTube-style strings
- **UI:** Linear gradients, SVG progress ring (mini player), gesture handler (edge swipe back, queue drag), haptic feedback
- **Networking / storage:** `fetch` to the stream backend; **offline downloads** via **react-native-fs** + AsyncStorage metadata

**Backend (`backend/`)**

- **Node.js** + **Express** + **TypeScript**
- **yt-dlp** for search, **stream URLs** (`/stream-url` with coalesced resolution), and **downloads** (`/download` by piping **yt-dlp stdout**)
- Optional `**YTDLP_PROXY`** and `**cookies.txt`** for extraction when cloud IPs are restricted

**Platforms**

Android 
iOS 

---

## Features

- **Full-screen player** — Artwork, title/artist, seek, shuffle/repeat, lyrics shortcut, library entry
- **Mini player** — Floating pill with rotating artwork, gradient progress ring, play/pause
- **Search** — Query the backend; play now, add to queue, or download from a **track action menu**
- **Music library** — Albums and songs grids; navigation to full lists
- **Queue** — View upcoming tracks, reorder by drag, remove tracks, clear queue
- **Downloads** — Save tracks to device; progress + **Downloads** tab
- **Lyrics** — LRCLib-backed screen for synced or plain lyrics (when available)
- **Splash** — Animated loading screen while Track Player initializes and the backend health check runs

---

## 📌 Screenshots

<table>
  <tr>
    <td align="center" width="33%"><img src="src/assets/Screenshots/home.PNG" alt="Player" width="240"/></td>
    <td align="center" width="33%"><img src="src/assets/Screenshots/search.PNG" alt="Search" width="240"/></td>
    <td align="center" width="33%"><img src="src/assets/Screenshots/library.PNG" alt="Library" width="240"/></td>
  </tr>
  <tr>
    <td align="center"><img src="src/assets/Screenshots/downloads.PNG" alt="Downloads" width="240"/></td>
    <td align="center"><img src="src/assets/Screenshots/queue.PNG" alt="Queue" width="240"/></td>
    <td align="center"><img src="src/assets/Screenshots/lyrics.PNG" alt="Lyrics" width="240"/></td>
  </tr>
</table>

---

## Project layout


| Path                                  | Purpose                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `src/App.tsx`                         | Navigation stack, splash until player is ready                          |
| `src/screens/`                        | Player, library, search, queue, lyrics, full albums/songs               |
| `src/services/streamService.ts`       | Backend base URL, `searchYouTube`, `getStreamUrl`, health ping          |
| `src/services/downloadService.ts`     | Device download path, progress events, metadata                         |
| `src/services/lyricsService.ts`       | LRCLib search/get + title normalization                                 |
| `src/services/musicPlayerServices.ts` | Track Player setup and helpers                                          |
| `backend/src/server.ts`               | Express: `/health`, `/search`, `/stream-url`, `/download`, debug routes |
| `render.yaml`                         | Example deploy config for the backend (adjust env vars for your host)   |


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


| Command           | Description    |
| ----------------- | -------------- |
| `npm start`       | Metro bundler  |
| `npm run android` | Run on Android |
| `npm run ios`     | Run on iOS     |
| `npm test`        | Jest           |
| `npm run lint`    | ESLint         |


---

## License

This project is licensed under the MIT License.

---

## Contact

[linkedin](https://www.linkedin.com/in/akshat-jaiswal-4664a2197)

© 2026 Akshat Jaiswal

[forthebadge](https://forthebadge.com)