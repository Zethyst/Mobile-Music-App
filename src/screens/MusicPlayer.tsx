import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
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
import { COLORS } from '../constants';
import { styles } from '../styles';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

const AnimatedIcon = Animated.createAnimatedComponent(Icon);

export default function MusicPlayer({ navigation }: Props) {
  const { height: windowHeight } = useWindowDimensions();
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
  }, [windowHeight, measureControlsTop]);

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

      // Horizontal swipes (only from above the controls area)
      const isHorizontal =
        startedAboveControls &&
        ax > ay * 1.2 &&
        (ax > 72 || Math.abs(velocityX) > 520);

      // Vertical swipes
      const isVertical =
        ay > ax * 1.2 &&
        (ay > 56 || Math.abs(velocityY) > 380);

      if (isHorizontal) {
        if (translationX < 0) {
          // Left swipe → Search
          navigation.navigate('Search');
        } else {
          // Right swipe → Library
          navigation.navigate('Library');
        }
      } else if (isVertical) {
        if (translationY < 0) {
          // Up swipe → Lyrics
          navigation.navigate('Lyrics');
        } else {
          // Down swipe → Queue
          navigation.navigate('Queue');
        }
      }
    },
    [navigation],
  );

  // Rotation animation for album art
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

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler onHandlerStateChange={onPlayerPan}>
        <View style={[styles.playerScrollContent, { flex: 1 }]}>
          <View style={[styles.screenContainer, styles.playerScreenLayout]}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Library')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Open music library">
                <AnimatedIcon name="music" size={25} color={libraryIconColor} />
              </TouchableOpacity>
              <Text style={styles.nowPlayingTitle}>Now Playing</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <Icon name="search" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <View style={{ width: 20 }} />
            </View>

            <View style={styles.playerArtworkSongBlock}>
              <View style={styles.artworkContainer}>
                <ArtworkWithGlow
                  artworkUri={track?.artwork as string | undefined}
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
    </GestureHandlerRootView>
  );
}