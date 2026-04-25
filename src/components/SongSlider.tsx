import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  PanResponder,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { styles, formatTime } from '../styles';
import {
  hapticLight,
  hapticSeekComplete,
  hapticSelection,
} from '../utils/haptics';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const THUMB_SIZE = 14;
const THUMB_SIZE_ACTIVE = 20;   // grows on press — feels premium
const TRACK_HEIGHT = 4;
const TRACK_HEIGHT_ACTIVE = 6;  // track thickens on press

/** UI-thread worklet; must not be a closure from the component (see RH Worklets + gestures). */
function clamp(v: number, lo: number, hi: number) {
  'worklet';
  return Math.max(lo, Math.min(hi, v));
}

export default function SongSlider() {
  const { position, duration } = useProgress(250);

  const trackWidthValue = useRef(0);   // raw number for layout
  const isDragging = useSharedValue(false);
  const displayProgress = useSharedValue(0);
  const dragProgress = useSharedValue(0);
  const scrubBucket = useRef<number | null>(null);
  const durationRef = useRef(1);
  durationRef.current = duration > 0 ? duration : 1;

  // Shared value version of trackWidth so animated styles can read it
  const trackWidthSV = useSharedValue(0);

  const safeDuration = duration > 0 ? duration : 1;
  if (!isDragging.value) {
    displayProgress.value = Math.min(position / safeDuration, 1);
  }

  const seekTo = useCallback(async (ratio: number) => {
    await TrackPlayer.seekTo(ratio * durationRef.current);
    hapticSeekComplete();
  }, []);

  const fireSelectionHaptic = useCallback((ratio: number) => {
    const bucket = Math.min(9, Math.floor(ratio * 10));
    if (scrubBucket.current !== bucket) {
      scrubBucket.current = bucket;
      hapticSelection();
    }
  }, []);

  const pan = Gesture.Pan()
    .minDistance(0)
    .averageTouches(true)
    .onBegin((e) => {
      'worklet';
      isDragging.value = true;
      scrubBucket.current = null;
      const ratio = clamp(e.x / trackWidthSV.value, 0, 1);
      dragProgress.value = ratio;
      displayProgress.value = ratio;
      runOnJS(hapticLight)();
    })
    .onUpdate((e) => {
      'worklet';
      const ratio = clamp(e.x / trackWidthSV.value, 0, 1);
      dragProgress.value = ratio;
      displayProgress.value = ratio;
      runOnJS(fireSelectionHaptic)(ratio);
    })
    .onEnd((e) => {
      'worklet';
      const ratio = clamp(e.x / trackWidthSV.value, 0, 1);
      displayProgress.value = ratio;
      isDragging.value = false;
      runOnJS(seekTo)(ratio);
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
    });

  const tap = Gesture.Tap()
    .onEnd((e) => {
      'worklet';
      const ratio = clamp(e.x / trackWidthSV.value, 0, 1);
      displayProgress.value = ratio;
      runOnJS(seekTo)(ratio);
      runOnJS(hapticLight)();
    });

  const gesture = Gesture.Simultaneous(tap, pan);

  // ── Animated styles ────────────────────────────────────────────────────────

  const trackHeightStyle = useAnimatedStyle(() => ({
    height: withSpring(
      isDragging.value ? TRACK_HEIGHT_ACTIVE : TRACK_HEIGHT,
      { damping: 20, stiffness: 300 }
    ),
    borderRadius: TRACK_HEIGHT_ACTIVE / 2,
  }));

  // The clip view — just controls revealed width
  const trackFillClipStyle = useAnimatedStyle(() => ({
    width: displayProgress.value * trackWidthSV.value,
    height: withSpring(
      isDragging.value ? TRACK_HEIGHT_ACTIVE : TRACK_HEIGHT,
      { damping: 20, stiffness: 300 }
    ),
    borderRadius: TRACK_HEIGHT_ACTIVE / 2,
  }));

  // The inner gradient — always full track width so colors span the whole range
  const trackGradientStyle = useAnimatedStyle(() => ({
    width: trackWidthSV.value,
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const size = withSpring(
      isDragging.value ? THUMB_SIZE_ACTIVE : THUMB_SIZE,
      { damping: 18, stiffness: 280 }
    );
    return {
      width: size,
      height: size,
      borderRadius: size,
      left: displayProgress.value * trackWidthSV.value - size / 2,
      transform: [{ scale: withSpring(isDragging.value ? 1.15 : 1, { damping: 15 }) }],
    };
  });

  const progressRatio = isDragging.value
    ? dragProgress.value
    : Math.min(position / safeDuration, 1);
  const displayTime = progressRatio * safeDuration;

  return (
    <GestureHandlerRootView style={styles.progressContainer}>
      <GestureDetector gesture={gesture}>
        <View
          style={ss.trackWrapper}
          onLayout={(e) => {
            trackWidthValue.current = e.nativeEvent.layout.width;
            trackWidthSV.value = e.nativeEvent.layout.width;   // also set shared value
          }}>

          {/* Muted full-width gradient — the "unplayed" portion */}
          <Animated.View style={[ss.trackAbsolute, trackHeightStyle]}>
            <LinearGradient
              colors={['#5232c155', '#12ccd055']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Vivid gradient — clipped to progress width via overflow:hidden */}
          <Animated.View style={[ss.trackAbsolute, ss.clipOverflow, trackFillClipStyle]}>
            <Animated.View style={trackGradientStyle}>
              <LinearGradient
                colors={['#5232c1', '#12ccd0']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={ss.gradientFull}
              />
            </Animated.View>
          </Animated.View>

        </View>
      </GestureDetector>

      <View style={styles.durationRow}>
        <Text style={styles.durationText}>{formatTime(displayTime)}</Text>
        <Text style={styles.durationText}>{formatTime(duration > 0 ? duration : 0)}</Text>
      </View>
    </GestureHandlerRootView>
  );
}

const ss = StyleSheet.create({
  trackWrapper: {
    height: 40,
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  trackAbsolute: {
    position: 'absolute',
    left: 0,
    borderRadius: TRACK_HEIGHT_ACTIVE / 2,
    right: 0,                   // muted bg spans full width
  },
  clipOverflow: {
    right: undefined,           // override right:0 — width is controlled by animation
    overflow: 'hidden',         // THIS is what clips the inner gradient
  },
  gradientFull: {
    height: TRACK_HEIGHT_ACTIVE,  // tall enough for the active state
  },
  thumb: {
    position: 'absolute',
    backgroundColor: '#12ccd0',
    shadowColor: '#5232c1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
});