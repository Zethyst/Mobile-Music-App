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

const THUMB_SIZE = 14;
const TRACK_HEIGHT = 4;

export default function SongSlider() {
  const { position, duration } = useProgress(250);

  // Refs that PanResponder callbacks can always read the latest value of —
  // avoids the stale-closure bug that comes from PanResponder.create running once.
  const trackWidthRef = useRef(0);
  const durationRef = useRef(1);
  durationRef.current = duration > 0 ? duration : 1;

  // null = not dragging; number = drag ratio 0-1
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

  const ratioFromEvent = (locationX: number): number | null => {
    const w = trackWidthRef.current;
    if (w <= 0) return null;
    return clamp(locationX / w, 0, 1);
  };

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: evt => {
        const r = ratioFromEvent(evt.nativeEvent.locationX);
        if (r !== null) setDragRatio(r);
      },

      onPanResponderMove: evt => {
        const r = ratioFromEvent(evt.nativeEvent.locationX);
        if (r !== null) setDragRatio(r);
      },

      onPanResponderRelease: async evt => {
        const r = ratioFromEvent(evt.nativeEvent.locationX);
        if (r !== null) {
          // durationRef.current is always current — no stale closure
          await TrackPlayer.seekTo(r * durationRef.current);
        }
        setDragRatio(null);
      },

      onPanResponderTerminate: () => {
        setDragRatio(null);
      },
    }),
  ).current;

  // While dragging show the drag position; otherwise show playback position
  const safeDuration = duration > 0 ? duration : 1;
  const progress =
    dragRatio !== null ? dragRatio : clamp(position / safeDuration, 0, 1);
  const displayTime =
    dragRatio !== null ? dragRatio * safeDuration : position;

  const pct = `${Math.round(progress * 100)}%`;

  return (
    <View style={styles.progressContainer}>
      {/* Tappable/draggable track area with extra vertical hit area */}
      <View
        style={ss.trackWrapper}
        onLayout={onLayout}
        {...panResponder.panHandlers}>
        {/* Grey background track */}
        <View style={ss.trackBg} />

        {/* Gradient fill — width driven by progress % */}
        <LinearGradient
          colors={['#5232c1', '#12ccd0']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[ss.trackFill, { width: pct as `${number}%` }]}
        />

        {/* Teal thumb dot */}
        <View style={[ss.thumb, { left: pct as `${number}%` }]} />
      </View>

      <View style={styles.durationRow}>
        <Text style={styles.durationText}>{formatTime(displayTime)}</Text>
        <Text style={styles.durationText}>{formatTime(duration > 0 ? duration : 0)}</Text>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  /** Tall hit area so small taps are easy to register */
  trackWrapper: {
    height: 36,
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#c3c7cc',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#12ccd0',
    marginLeft: -(THUMB_SIZE / 2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});
