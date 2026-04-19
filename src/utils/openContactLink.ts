import { Linking } from 'react-native';

/**
 * Tries to open a native app URL first (e.g. `whatsapp://`), then falls back to
 * an https URL (e.g. api.whatsapp.com) if the app is unavailable or open fails.
 */
export async function openContactWithAppPreferred(
  appUrl: string | undefined,
  fallbackUrl: string,
): Promise<void> {
  if (appUrl) {
    try {
      const supported = await Linking.canOpenURL(appUrl);
      if (supported) {
        await Linking.openURL(appUrl);
        return;
      }
    } catch {
      // canOpenURL may throw; try opening fallback.
    }
  }
  await Linking.openURL(fallbackUrl);
}
