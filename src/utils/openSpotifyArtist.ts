import { Linking } from 'react-native';

/**
 * Opens an artist in the Spotify app (`spotify:artist:`) when possible,
 * otherwise falls back to the web URL (opens browser or app via universal link).
 */
export async function openSpotifyArtist(artistId: string): Promise<void> {
  const appUrl = `spotify:artist:${artistId}`;
  const webUrl = `https://open.spotify.com/artist/${artistId}`;

  try {
    if (await Linking.canOpenURL(appUrl)) {
      await Linking.openURL(appUrl);
      return;
    }
  } catch {
    // canOpenURL may fail if OS blocks scheme checks; try web.
  }

  await Linking.openURL(webUrl);
}
