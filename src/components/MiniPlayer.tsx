import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import TrackPlayer, {
  useActiveTrack,
  usePlaybackState,
  useProgress,
  State,
} from 'react-native-track-player';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { DEFAULT_COVER_URI, COLORS, resolveTrackArtworkUri } from '../constants';
import type { RootStackParamList } from '../navigation/types';
import { hapticHeavy } from '../utils/haptics';

const SIZE = 58;
const STROKE = 5;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

type MiniNav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Floating bar — `bottom` is measured from the bottom of the screen scene.
 * Tab scenes already omit the tab bar area, so do **not** add `useBottomTabBarHeight` here
 * (that would double the gap above the tabs).
 */
export default function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'android' ? 4 + insets.bottom : 4;
  return <MiniPlayerInner bottom={bottom} />;
}

function MiniPlayerInner({ bottom }: { bottom: number }) {
  const navigation = useNavigation<MiniNav>();
  const track = useActiveTrack();
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress(500);
  const isPlaying = playbackState.state === State.Playing;

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateRef = useRef<Animated.CompositeAnimation | null>(null);
  const rotationValue = useRef(0);

  useEffect(() => {
    const id = rotateAnim.addListener(({ value }) => {
      rotationValue.current = value;
    });
    return () => rotateAnim.removeListener(id);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      rotateRef.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: rotationValue.current + 1,
          duration: 6000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      rotateRef.current.start();
    } else {
      rotateRef.current?.stop();
    }
  }, [isPlaying]);

  const artworkRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const togglePlayback = async () => {
    hapticHeavy();
    if (isPlaying) { await TrackPlayer.pause(); } else { await TrackPlayer.play(); }
  };

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={[mp.wrapper, { bottom, zIndex: 100, elevation: 24 }]}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={mp.pillOuter}
        onPress={() => navigation.navigate('Main', { screen: 'Player' })}
        accessibilityRole="button"
        accessibilityLabel="Open full screen player">
        <LinearGradient
          colors={['#ffffff', '#f8f4fc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={mp.pill}>

        <Animated.Image
          source={{ uri: resolveTrackArtworkUri(track) ?? DEFAULT_COVER_URI }}
          style={[mp.artwork, { transform: [{ rotate: artworkRotate }] }]}
        />

        <View style={mp.info}>
          <Text style={mp.title} numberOfLines={1}>
            {track?.title ?? 'Not Playing'}
          </Text>
          <Text style={mp.artist} numberOfLines={1}>
            {track?.artist ?? '—'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={togglePlayback}
          activeOpacity={0.8}
          style={mp.btnWrapper}>

          <View style={mp.buttonFace}>
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={15}
              color={COLORS.primary}
              style={!isPlaying ? { marginLeft: 2 } : undefined}
            />
          </View>

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              <Defs>
                <SvgLinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#5232c1" />
                  <Stop offset="100%" stopColor="#12ccd0" />
                </SvgLinearGradient>
              </Defs>

              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="#e0e0e0"
                strokeWidth={STROKE}
              />

              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth={STROKE}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${SIZE / 2}, ${SIZE / 2}`}
              />
            </Svg>
          </View>
        </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const PILL_H = 72;
const INNER_BTN = SIZE - STROKE * 2 - 4;

const mp = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  pillOuter: {
    width: '100%',
    borderRadius: PILL_H / 2,
  },
  pill: {
    width: '100%',
    height: PILL_H,
    borderRadius: PILL_H / 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.select({ ios: 14, default: 10 }),
    gap: 10,
    shadowColor: '#888',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  info: {
    flex: 1,
    paddingLeft: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  artist: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    opacity: 0.7,
  },
  btnWrapper: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { transform: [{ translateX: -20 }] },
      default: {},
    }),
  },
  buttonFace: {
    width: INNER_BTN,
    height: INNER_BTN,
    borderRadius: INNER_BTN / 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#aaa',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});
