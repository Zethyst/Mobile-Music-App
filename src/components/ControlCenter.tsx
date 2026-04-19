import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import TrackPlayer, {
  usePlaybackState,
  State,
} from 'react-native-track-player';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { styles } from '../styles';
import { COLORS } from '../constants';
import type { RootStackParamList } from '../navigation/types';

/** Shared neumorphic gradient colours matching the CSS spec */
const NEUMORPH_GRADIENT: string[] = ['#cacaca', '#f8f4fc'];
const NEUMORPH_ANGLE = { x: 0.15, y: 0 };        // ≈ 145 deg start
const NEUMORPH_ANGLE_END = { x: 0.85, y: 1 };    // ≈ 145 deg end

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const VOL_EPS = 0.001;

export default function ControlCenter() {
  const navigation = useNavigation<NavProp>();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const [isMuted, setIsMuted] = useState(false);
  const volumeBeforeMuteRef = useRef(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await TrackPlayer.getVolume();
        if (!cancelled) {
          setIsMuted(v < VOL_EPS);
          if (v >= VOL_EPS) {
            volumeBeforeMuteRef.current = v;
          }
        }
      } catch {
        /* player may not be ready yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const skipToNext = async () => { await TrackPlayer.skipToNext(); };
  const skipToPrevious = async () => { await TrackPlayer.skipToPrevious(); };

  const togglePlayback = async () => {
    const currentTrack = await TrackPlayer.getActiveTrackIndex();
    if (currentTrack === null || currentTrack === undefined) return;
    if (isPlaying) { await TrackPlayer.pause(); } else { await TrackPlayer.play(); }
  };

  const toggleMute = useCallback(async () => {
    try {
      if (isMuted) {
        const restore =
          volumeBeforeMuteRef.current >= VOL_EPS
            ? volumeBeforeMuteRef.current
            : 1;
        await TrackPlayer.setVolume(restore);
        setIsMuted(false);
      } else {
        const current = await TrackPlayer.getVolume();
        volumeBeforeMuteRef.current =
          current >= VOL_EPS ? current : 1;
        await TrackPlayer.setVolume(0);
        setIsMuted(true);
      }
    } catch {
      /* ignore */
    }
  }, [isMuted]);

  return (
    <View style={styles.controlsRow}>
      {/* Queue */}
      <TouchableOpacity
        style={styles.iconBtn}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Queue')}
        accessibilityRole="button"
        accessibilityLabel="Open queue">
        <Icon name="list-ul" size={20} color="rgba(128,128,128,0.6)" />
      </TouchableOpacity>

      {/* Previous */}
      <TouchableOpacity onPress={skipToPrevious} activeOpacity={0.75}>
        <LinearGradient
          colors={NEUMORPH_GRADIENT}
          start={NEUMORPH_ANGLE}
          end={NEUMORPH_ANGLE_END}
          style={cc.prevNext}>
          <Icon name="step-backward" size={20} color="#50515395" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Play / Pause */}
      <TouchableOpacity onPress={togglePlayback} activeOpacity={0.8}>
        <LinearGradient
          colors={NEUMORPH_GRADIENT}
          start={NEUMORPH_ANGLE}
          end={NEUMORPH_ANGLE_END}
          style={cc.playPause}>
          {/* Gradient icon: two absolutely-positioned icons stacked & blended */}
          <View style={cc.playIconWrapper}>
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={30}
              color={COLORS.primary}
              style={[cc.centeredIcon, !isPlaying && { marginLeft: 3 }]}
            />
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={30}
              color={COLORS.secondary}
              style={[cc.centeredIcon, cc.iconOverlay, !isPlaying && { marginLeft: 3 }]}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Next */}
      <TouchableOpacity onPress={skipToNext} activeOpacity={0.75}>
        <LinearGradient
          colors={NEUMORPH_GRADIENT}
          start={NEUMORPH_ANGLE}
          end={NEUMORPH_ANGLE_END}
          style={cc.prevNext}>
          <Icon name="step-forward" size={20} color="#50515395" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Volume: mute / restore player volume */}
      <TouchableOpacity
        style={styles.iconBtn}
        activeOpacity={0.7}
        onPress={toggleMute}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}>
        <Icon
          name={isMuted ? 'volume-off' : 'volume-up'}
          size={20}
          color="rgba(128,128,128,0.6)"
        />
      </TouchableOpacity>
    </View>
  );
}

const cc = StyleSheet.create({
  prevNext: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    // neumorphic dual shadow: dark bottom-right, white top-left
    shadowColor: '#aaaaaa',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  playPause: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#aaaaaa',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 13,
    elevation: 8,
  },
  playIconWrapper: {
    width: 36,
    height: 36,
  },
  /** Both icons are absolutely centered in the wrapper so they stack precisely */
  centeredIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    lineHeight: 36,
  },
  /** Semi-transparent teal blends with the primary purple below */
  iconOverlay: {
    opacity: 0.55,
  },
});
