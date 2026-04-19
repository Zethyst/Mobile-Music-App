import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { setupPlayer, addTracks } from './services/musicPlayerServices';
import { pingHealthCheck } from './services/streamService';
import MusicPlayer from './screens/MusicPlayer';
import MusicLibrary from './screens/MusicLibrary';
import FullAlbumsScreen from './screens/FullAlbumsScreen';
import FullSongsScreen from './screens/FullSongsScreen';
import LyricsScreen from './screens/LyricsScreen';
import SearchScreen from './screens/SearchScreen';
import QueueScreen from './screens/QueueScreen';
import { styles } from './styles';
import { COLORS } from './constants';
import type { RootStackParamList } from './navigation/types';

function LoadingScreen() {
  const insets = useSafeAreaInsets();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const heartBeatAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.07,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(dotAnim, {
        toValue: 3,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(heartBeatAnim, {
          toValue: 1.32,
          duration: 85,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 1,
          duration: 115,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(130),
        Animated.timing(heartBeatAnim, {
          toValue: 1.2,
          duration: 75,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 1,
          duration: 95,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(720),
      ]),
    ).start();
  }, [spinAnim, pulseAnim, dotAnim, heartBeatAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={splash.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={splash.centerBlock}>
        {/* Spinning vinyl disc */}
        <Animated.View
          style={[
            splash.discWrap,
            { transform: [{ rotate: spin }, { scale: pulseAnim }] },
          ]}>
          <LinearGradient
            colors={[COLORS.primary, '#3a2490', '#1e1060']}
            style={splash.discOuter}>
            {[80, 62, 46, 32].map(size => (
              <View
                key={size}
                style={[
                  splash.groove,
                  { width: size, height: size, borderRadius: size / 2 },
                ]}
              />
            ))}
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={splash.discLabel}>
              <View style={splash.discHole} />
            </LinearGradient>
          </LinearGradient>
        </Animated.View>

        <Text style={splash.title}>Loading player</Text>
        <AnimatedDots dotAnim={dotAnim} />
      </View>

      <View
        style={[
          splash.footer,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}>
        <View style={splash.footerRow}>
          <Text style={splash.footerText}>Made with </Text>
          <Animated.Text
            style={[
              splash.footerHeart,
              { transform: [{ scale: heartBeatAnim }] },
            ]}>
            {'\u2764\uFE0F'}
          </Animated.Text>
          <Text style={splash.footerText}> by Akshat</Text>
        </View>
      </View>
    </View>
  );
}

function AnimatedDots({ dotAnim }: { dotAnim: Animated.Value }) {
  const dots = [0, 1, 2];
  return (
    <View style={splash.dotsRow}>
      {dots.map(i => {
        const opacity = dotAnim.interpolate({
          inputRange: [i, i + 0.5, i + 1],
          outputRange: [0.25, 1, 0.25],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View key={i} style={[splash.dot, { opacity }]} />
        );
      })}
    </View>
  );
}

const DISC = 180;
const LABEL = 60;

const splash = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discWrap: {
    marginBottom: 40,
  },
  discOuter: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
  },
  groove: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  discLabel: {
    width: LABEL,
    height: LABEL,
    borderRadius: LABEL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discHole: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.background,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '500',
    opacity: 0.72,
    letterSpacing: 0.2,
  },
  footerHeart: {
    fontSize: 16,
    marginHorizontal: 2,
  },
});

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    pingHealthCheck();
    let mounted = true;
    (async () => {
      const isSetup = await setupPlayer();
      if (!mounted) return;
      if (isSetup) {
        await addTracks();
        setIsPlayerReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isPlayerReady) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <View style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
          <Stack.Navigator
            initialRouteName="Player"
            screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Player" component={MusicPlayer} />
            <Stack.Screen name="Library" component={MusicLibrary} />
            <Stack.Screen name="FullAlbums" component={FullAlbumsScreen} />
            <Stack.Screen name="FullSongs" component={FullSongsScreen} />
            <Stack.Screen name="Lyrics" component={LyricsScreen} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }}/>
            <Stack.Screen name="Queue" component={QueueScreen} options={{ title: 'Queue' }}/>
          </Stack.Navigator>
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
