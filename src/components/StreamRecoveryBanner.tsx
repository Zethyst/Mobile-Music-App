import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
  STREAM_RECOVERY_EVENT,
  type StreamRecoveryState,
} from '../services/musicPlayerServices';

type Props = {
  /** Distance from bottom of screen (above mini player). Default matches MusicPlayer. */
  bottom?: number;
};

/** If "refreshing" never finishes, stop showing the spinner (network hang, etc.). */
const RETRYING_STUCK_MS = 22_000;

/** Auto-hide recovered / failed so the pill never stays forever if events repeat. */
const DISMISS_AFTER_MS = 3_200;

export default function StreamRecoveryBanner({ bottom = 110 }: Props) {
  const [recoveryState, setRecoveryState] = useState<StreamRecoveryState | null>(null);
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryingStuckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideBanner = useCallback(() => {
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setRecoveryState(null));
  }, [bannerAnim]);

  const showBanner = useCallback(
    (state: StreamRecoveryState) => {
      setRecoveryState(state);
      Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true }).start();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (retryingStuckTimer.current) clearTimeout(retryingStuckTimer.current);

      if (state === 'retrying') {
        retryingStuckTimer.current = setTimeout(() => {
          setRecoveryState('failed');
          if (dismissTimer.current) clearTimeout(dismissTimer.current);
          dismissTimer.current = setTimeout(hideBanner, DISMISS_AFTER_MS);
        }, RETRYING_STUCK_MS);
        return;
      }

      if (state === 'recovered' || state === 'failed') {
        dismissTimer.current = setTimeout(hideBanner, DISMISS_AFTER_MS);
      }
    },
    [bannerAnim, hideBanner],
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      STREAM_RECOVERY_EVENT,
      ({ state }: { state: StreamRecoveryState }) => showBanner(state),
    );
    return () => {
      sub.remove();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (retryingStuckTimer.current) clearTimeout(retryingStuckTimer.current);
    };
  }, [showBanner]);

  if (!recoveryState) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { bottom },
        recoveryState === 'failed' && styles.bannerFailed,
        recoveryState === 'recovered' && styles.bannerOk,
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
      <Icon
        name={
          recoveryState === 'retrying'
            ? 'sync-alt'
            : recoveryState === 'recovered'
              ? 'check-circle'
              : 'exclamation-circle'
        }
        size={14}
        color="#fff"
      />
      <Text style={styles.text}>
        {recoveryState === 'retrying'
          ? 'Stream expired — refreshing…'
          : recoveryState === 'recovered'
            ? 'Stream refreshed, resuming'
            : 'Could not refresh stream'}
      </Text>
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
  bannerFailed: {
    backgroundColor: 'rgba(200,40,40,0.92)',
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
