/**
 * Split backends:
 * - Stream/search: cloud host (Render) — proxy-friendly for `--get-url` + CDN playback on device.
 * - Download: tunnel to your Mac — reliable full yt-dlp pull when cloud IPs are blocked.
 */
export const STREAM_BACKEND = 'https://mobile-music-app.onrender.com';
export const STREAM_BACKEND_LOCAL = 'http://10.0.2.2:8030';

export const DOWNLOAD_BACKEND = 'https://www.zethyst.online';
export const DOWNLOAD_BACKEND_LOCAL = 'http://10.0.2.2:8030';
