import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import type { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { useActiveTrack, usePlaybackState, State as PlaybackState } from 'react-native-track-player';
import Icon from 'react-native-vector-icons/FontAwesome5';
import SongInfo from '../components/SongInfo';
import SongSlider from '../components/SongSlider';
import ControlCenter from '../components/ControlCenter';
import ArtworkWithGlow from '../components/ArtworkWithGlow';
import StreamRecoveryBanner from '../components/StreamRecoveryBanner';
import { COLORS, resolveTrackArtworkUri } from '../constants';
import { styles } from '../styles';
import type { RootStackParamList, TabParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Player'>,
  NativeStackScreenProps<RootStackParamList>
>;

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

export default function MusicPlayer({ navigation }: Props) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const track = useActiveTrack();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === PlaybackState.Playing;

  const controlsRef = useRef<View>(null);
  const controlsTopYRef = useRef<number | null>(null);
  const gestureStartYRef = useRef(0);

  const measureControlsTop = useCallback(() => {
    controlsRef.current?.measureInWindow((_, y) => {
      controlsTopYRef.current = y;
    });
  }, []);

  useEffect(() => {
    const t = requestAnimationFrame(measureControlsTop);
    return () => cancelAnimationFrame(t);
  }, [windowHeight, windowWidth, measureControlsTop]);

  const onPlayerPan = useCallback(
    ({ nativeEvent }: PanGestureHandlerGestureEvent) => {
      const {
        state,
        translationX,
        translationY,
        velocityX,
        velocityY,
        absoluteY,
      } = nativeEvent;

      if (state === State.BEGAN) {
        gestureStartYRef.current = absoluteY;
        return;
      }

      if (state !== State.END) {
        return;
      }

      const controlsTop = controlsTopYRef.current;
      const startedAboveControls =
        controlsTop == null || gestureStartYRef.current < controlsTop - 8;

      const ax = Math.abs(translationX);
      const ay = Math.abs(translationY);

      const isHorizontal =
        startedAboveControls &&
        ax > ay * 1.2 &&
        (ax > 72 || Math.abs(velocityX) > 520);

      const isVertical =
        ay > ax * 1.2 &&
        (ay > 56 || Math.abs(velocityY) > 380);

      if (isHorizontal) {
        if (translationX < 0) {
          navigation.navigate('Main', { screen: 'Search' });
        } else {
          navigation.navigate('Main', { screen: 'Library' });
        }
      } else if (isVertical) {
        if (translationY < 0) {
          navigation.navigate('Lyrics');
        } else {
          navigation.navigate('Queue');
        }
      }
    },
    [navigation],
  );

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateRef = useRef<Animated.CompositeAnimation | null>(null);
  const rotationValue = useRef(0);

  useEffect(() => {
    rotateAnim.addListener(({ value }) => {
      rotationValue.current = value;
    });
    return () => rotateAnim.removeAllListeners();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      rotateRef.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: rotationValue.current + 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      rotateRef.current.start();
    } else {
      rotateRef.current?.stop();
    }
  }, [isPlaying]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rainbowHue = useRef(new Animated.Value(0)).current;
  const libraryIconColor = rainbowHue.interpolate({
    inputRange: [0, 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1],
    outputRange: [
      '#e74c3c',
      '#e67e22',
      '#f1c40f',
      '#2ecc71',
      '#1abc9c',
      '#3498db',
      '#9b59b6',
      '#e74c3c',
    ],
  });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rainbowHue, {
        toValue: 1,
        duration: 4500,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rainbowHue]);

  // Compact layout for small screens (OnePlus 6 and similar ~600dp height devices)
  const isSmallScreen = windowHeight < 680;

  // Reserve space above the bottom tab bar + system nav/gesture inset (transparent tab bar can overlap content)
  const playerBottomPad =
    tabBarHeight +
    (Platform.OS === 'android' ? Math.max(insets.bottom, 0) + 10 : 6);

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler onHandlerStateChange={onPlayerPan}>
        <View style={[styles.playerScrollContent, { flex: 1 }]}>
          <View style={[
            styles.screenContainer,
            styles.playerScreenLayout,
            isSmallScreen && { marginVertical: 4, padding: 16 },
            { paddingBottom: (isSmallScreen ? 16 : 24) + playerBottomPad },
          ]}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Main', { screen: 'Library' })}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Open music library">
                <AnimatedIcon name="music" size={25} color={libraryIconColor} />
              </TouchableOpacity>
              <Text style={styles.nowPlayingTitle}>Now Playing</Text>
              <View style={{ width: 20 }} />
            </View>

            <View style={styles.playerArtworkSongBlock}>
              <View style={styles.artworkContainer}>
                <ArtworkWithGlow
                  artworkUri={resolveTrackArtworkUri(track)}
                  imageRotate={rotate}
                />
              </View>
              <SongInfo track={track} />
            </View>

            <View
              ref={controlsRef}
              onLayout={measureControlsTop}
              style={styles.playerControlsBlock}>
              <SongSlider />
              <ControlCenter />
              <TouchableOpacity
                style={styles.lyricsToggleContainer}
                onPress={() => navigation.navigate('Lyrics')}
                activeOpacity={0.7}>
                <Icon name="chevron-up" size={14} color="#888" />
                <Text style={styles.lyricsToggleText}>Lyrics</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </PanGestureHandler>

      <StreamRecoveryBanner />
    </GestureHandlerRootView>
  );
}
