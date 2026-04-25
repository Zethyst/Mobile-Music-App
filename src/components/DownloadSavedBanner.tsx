import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { DOWNLOAD_SAVED_BANNER_EVENT } from '../services/downloadService';

type Props = {
  /** Same baseline as `StreamRecoveryBanner` (above mini player). */
  bottom?: number;
};

const DISMISS_AFTER_MS = 3_200;

export default function DownloadSavedBanner({ bottom = 110 }: Props) {
  const [visible, setVisible] = useState(false);
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideBanner = useCallback(() => {
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [bannerAnim]);

  const showBanner = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setVisible(true);
    bannerAnim.setValue(0);
    Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true }).start();
    dismissTimer.current = setTimeout(hideBanner, DISMISS_AFTER_MS);
  }, [bannerAnim, hideBanner]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DOWNLOAD_SAVED_BANNER_EVENT, showBanner);
    return () => {
      sub.remove();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [showBanner]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        styles.bannerOk,
        { bottom },
        {
          transform: [
            {
              translateY: bannerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [80, 0],
              }),
            },
          ],
          opacity: bannerAnim,
        },
      ]}
      pointerEvents="none">
      <Icon name="check-circle" size={14} color="#fff" />
      <Text style={styles.text}>Saved to Downloads on this device.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '92%',
    backgroundColor: 'rgba(82,50,193,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerOk: {
    backgroundColor: 'rgba(22,160,60,0.92)',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
