import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useActiveTrack, useProgress } from 'react-native-track-player';
import { fetchLyrics, LyricsResult } from '../services/lyricsService';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';
import { hapticLight } from '../utils/haptics';
import BackSwipeContainer from '../components/BackSwipeContainer';
import { styles } from '../styles';
import { COLORS } from '../constants';
import Icon from 'react-native-vector-icons/FontAwesome';

interface Props {
  navigation: any;
}

const ACTIVE_COLOR  = '#5232c1';
const DIM_COLOR     = '#aaa';
const MINI_PLAYER_PAD = 96;

const SKELETON_LINE_WIDTHS = ['100%', '92%', '88%', '95%', '72%', '100%', '84%', '90%', '68%', '100%', '76%', '100%', '84%', '90%', '68%', '100%', '76%'] as const;

function LyricsSkeleton() {
  const pulse = useRef(new Animated.Value(0.32)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.32, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ marginTop: 12, alignSelf: 'stretch' }} accessibilityRole="progressbar" accessibilityLabel="Loading lyrics">
      {SKELETON_LINE_WIDTHS.map((w, i) => (
        <Animated.View
          key={i}
          style={{
            alignSelf: 'flex-start',
            width: w,
            height: 15,
            borderRadius: 6,
            backgroundColor: COLORS.text,
            marginBottom: 15,
            opacity: pulse,
          }}
        />
      ))}
    </View>
  );
}

export default function LyricsScreen({ navigation }: Props) {
  const track    = useActiveTrack();
  const progress = useProgress(250);          // poll every 250 ms
  const scrollRef = useRef<ScrollView>(null);
  const lineRefs  = useRef<Record<number, number>>({});  // index → y offset

  const [result, setResult]   = useState<LyricsResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch whenever track changes
  useEffect(() => {
    if (!track) {
      setResult(null);
      setLoading(false);
      return;
    }
    setResult(null);
    setLoading(true);
    let cancelled = false;
    fetchLyrics(track.title ?? '', track.artist ?? '', track.duration).then(r => {
      if (cancelled) return;
      setResult(r);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  // Find the active line index
  const activeLine = React.useMemo(() => {
    if (result?.kind !== 'synced') return -1;
    const pos = progress.position;
    let idx = -1;
    for (let i = 0; i < result.lines.length; i++) {
      if (result.lines[i].time <= pos) idx = i;
      else break;
    }
    return idx;
  }, [result, progress.position]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLine < 0) return;
    const y = lineRefs.current[activeLine];
    if (y != null) scrollRef.current?.scrollTo({ y: y - 120, animated: true });
  }, [activeLine]);

  const renderLyrics = () => {
    if (loading) return <LyricsSkeleton />;
    if (!result || result.kind === 'none') return (
      <Text style={styles.lyricsBody}>
        Lyrics aren't available for this track yet.
      </Text>
    );
    if (result.kind === 'plain') return <Text style={styles.lyricsBody}>{result.text}</Text>;

    // Synced karaoke view
    return result.lines.map((line, i) => (
      <Text
        key={i}
        onLayout={e => { lineRefs.current[i] = e.nativeEvent.layout.y; }}
        style={[
          styles.lyricsBody,
          {
            color:     i === activeLine ? ACTIVE_COLOR : DIM_COLOR,
            fontWeight: i === activeLine ? '700' : '400',
            fontSize:  i === activeLine ? 18 : 15,
            marginVertical: 6,
          },
        ]}>
        {line.text || '·'}
      </Text>
    ));
  };

  return (
    <ScreenWithMiniPlayer>
      <BackSwipeContainer onBack={() => navigation.goBack()}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: MINI_PLAYER_PAD,
          paddingHorizontal: 16,
          paddingTop: 12,
        }}>
        <View style={styles.screenContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back">
              <Icon name="arrow-left" size={20} color="#444" />
            </TouchableOpacity>
            <Text style={styles.nowPlayingTitle}>Lyrics</Text>
            <View style={{ width: 20 }} />
          </View>

          {track && (
            <View style={{ marginTop: 16, marginBottom: 12 }}>
              <MaskedView
                maskElement={
                  <Text style={styles.lyricsScreenTitle} numberOfLines={2}>
                    {track.title}
                  </Text>
                }>
                <LinearGradient
                  colors={['#5232c1', '#12ccd0']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}>
                  <Text style={[styles.lyricsScreenTitle, { opacity: 0 }]} numberOfLines={2}>
                    {track.title}
                  </Text>
                </LinearGradient>
              </MaskedView>
              <Text style={styles.lyricsScreenArtist} numberOfLines={2}>
                {track.artist}
              </Text>
            </View>
          )}

          {renderLyrics()}
        </View>
      </ScrollView>
      </BackSwipeContainer>
    </ScreenWithMiniPlayer>
  );
}
