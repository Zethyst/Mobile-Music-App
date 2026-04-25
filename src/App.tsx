import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  Animated,
  Easing,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type {
  BottomTabBarButtonProps,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { setupPlayer, addTracks } from './services/musicPlayerServices';
import { pingHealthCheck } from './services/streamService';
import MusicPlayer from './screens/MusicPlayer';
import MusicLibrary from './screens/MusicLibrary';
import FullAlbumsScreen from './screens/FullAlbumsScreen';
import FullSongsScreen from './screens/FullSongsScreen';
import LyricsScreen from './screens/LyricsScreen';
import SearchScreen from './screens/SearchScreen';
import QueueScreen from './screens/QueueScreen';
import DownloadsScreen from './screens/DownloadsScreen';
import PlaylistsScreen from './screens/PlaylistsScreen';
import PlaylistDetailScreen from './screens/PlaylistDetailScreen';
import { PlaylistProvider } from './contexts/PlaylistContext';
import { styles } from './styles';
import { COLORS } from './constants';
import type { RootStackParamList, TabParamList } from './navigation/types';
import { identifyDevice } from './utils/analytics';

function LoadingScreen() {
  const insets = useSafeAreaInsets();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const heartBeatAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void identifyDevice();
  }, []);

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

        <MaskedView
          style={{ alignSelf: 'center' }}
          maskElement={
            <Text style={splash.brand} numberOfLines={1}>
              Cadence
            </Text>
          }>
          <LinearGradient
            colors={['#5232c1', '#12ccd0']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}>
            <Text style={[splash.brand, { opacity: 0 }]} numberOfLines={1}>
              Cadence
            </Text>
          </LinearGradient>
        </MaskedView>
        <Text style={splash.subtitle}>Loading player</Text>
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
  brand: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textLight,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
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
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return <Icon name={name} size={size - 2} color={color} solid />;
}

function TabBarBackground() {
  return (
    <LinearGradient
      colors={[
        'rgba(255,255,255,0)',   // fully transparent at top
        'rgba(255,255,255,0.85)',
        'rgba(255,255,255,0.97)',
      ]}
      locations={[0, 0.3, 1]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

/** Avoids `PlatformPressable` borderless ripple + tab bar top shadow, which read as a harsh dark inner edge when pressed. */
const TabBarButton: NonNullable<BottomTabNavigationOptions['tabBarButton']> = (
  props: BottomTabBarButtonProps,
) => {
  const {
    children,
    onPress,
    onLongPress,
    style,
    testID,
    accessibilityState,
    'aria-label': ariaLabel,
  } = props;
  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={onPress}
      onLongPress={onLongPress ?? undefined}
      style={style}
      testID={testID}
      accessibilityState={accessibilityState}
      accessibilityRole="tab"
      accessibilityLabel={typeof ariaLabel === 'string' ? ariaLabel : undefined}
    >
      {children}
    </TouchableOpacity>
  );
};

function TabNavigator() {
  const insets = useSafeAreaInsets();
  /**
   * Custom `tabBarStyle` drops the default bottom inset on Android (3-button / gesture nav).
   * iOS keeps the previous fixed tab bar metrics; only Android adds `insets.bottom`.
   */
  const tabBarBottomPad =
    Platform.OS === 'android' ? 8 + insets.bottom : 28;
  const tabBarOuterHeight =
    Platform.OS === 'android' ? 60 + insets.bottom : 83;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.playing,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarBackground: () => <TabBarBackground />,
        tabBarButton: TabBarButton,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: tabBarOuterHeight,
          paddingBottom: tabBarBottomPad,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="Player"
        component={MusicPlayer}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => <TabIcon name="search" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={MusicLibrary}
        options={{
          tabBarIcon: ({ color, size }) => <TabIcon name="compact-disc" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Downloads"
        component={DownloadsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <TabIcon name="cloud-download-alt" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

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
    return () => { mounted = false; };
  }, []);

  if (!isPlayerReady) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <PlaylistProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <View style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen name="FullAlbums" component={FullAlbumsScreen} />
              <Stack.Screen name="FullSongs" component={FullSongsScreen} />
              <Stack.Screen name="Lyrics" component={LyricsScreen} />
              <Stack.Screen name="Queue" component={QueueScreen} />
              <Stack.Screen name="Playlists" component={PlaylistsScreen} />
              <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
    </PlaylistProvider>
  );
}
