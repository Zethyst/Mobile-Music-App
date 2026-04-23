/**
 * Split backends:
 * - Stream/search: cloud host (Render) — proxy-friendly for `--get-url` + CDN playback on device.
 * - Download: tunnel to your Mac — reliable full yt-dlp pull when cloud IPs are blocked.
 */
export const STREAM_BACKEND = 'https://mobile-music-app.onrender.com';

export const DOWNLOAD_BACKEND = 'https://www.zethyst.online';
