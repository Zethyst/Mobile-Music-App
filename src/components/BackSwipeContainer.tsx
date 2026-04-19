import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import type { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { hapticLight } from '../utils/haptics';

const DEFAULT_EDGE_W = 20;
const MIN_TRANSLATION = 56;
const MIN_VELOCITY = 380;

type Props = {
  children: React.ReactNode;
  onBack: () => void;
  /** Left-edge hit width (default 16). Use smaller if it overlaps custom controls. */
  edgeWidth?: number;
};

/**
 * iOS-style "swipe from left edge" back. A narrow overlay on the left edge
 * receives horizontal pans without fighting vertical ScrollView scrolling.
 */
export default function BackSwipeContainer({
  children,
  onBack,
  edgeWidth = DEFAULT_EDGE_W,
}: Props) {
  const onEdgePan = useCallback(
    ({ nativeEvent }: PanGestureHandlerGestureEvent) => {
      const { state, translationX, translationY, velocityX } = nativeEvent;

      if (state !== State.END) return;

      const ax = Math.abs(translationX);
      const ay = Math.abs(translationY);
      const horizontal =
        ax > ay * 1.15 &&
        (ax > MIN_TRANSLATION || Math.abs(velocityX) > MIN_VELOCITY);
      if (!horizontal || translationX <= 0) return;

      onBack();
    },
    [onBack],
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.root}>
        {children}
        <PanGestureHandler onHandlerStateChange={onEdgePan}>
          <View style={[styles.edgeStrip, { width: edgeWidth }]} />
        </PanGestureHandler>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  edgeStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});
