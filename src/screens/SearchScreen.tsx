import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
} from 'react-native';
import TrackPlayer, { useActiveTrack } from 'react-native-track-player';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { searchYouTube, getStreamUrl, SearchResult, StreamInfo } from '../services/streamService';
import { COLORS, tracks as libraryTracks } from '../constants';
import { styles } from '../styles';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';
import BackSwipeContainer from '../components/BackSwipeContainer';
import StreamRecoveryBanner from '../components/StreamRecoveryBanner';
import type { RootStackParamList } from '../navigation/types';
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

/** Library track IDs are numeric strings — YouTube video IDs are longer alphanumeric strings. */
const LIBRARY_IDS = new Set(libraryTracks.map(t => t.id));

const isLibraryOrEmptyQueue = (queue: Awaited<ReturnType<typeof TrackPlayer.getQueue>>) =>
  queue.length === 0 || LIBRARY_IDS.has(queue[0].id);

// Survives component unmount so state is restored when navigating back
const cache = { query: '', results: [] as SearchResult[] };

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState(cache.query);
  const [results, setResults] = useState<SearchResult[]>(cache.results);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  /** Video IDs that were just added (shows a ✓ for 2 s) */
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const activeTrack = useActiveTrack();

  // Keep cache in sync whenever state changes
  useEffect(() => { cache.query = query; }, [query]);
  useEffect(() => { cache.results = results; }, [results]);

  const handleSearch = async () => {
    Keyboard.dismiss();
    if (!query.trim()) return;
    hapticLight();
    setLoading(true);
    setResults([]);
    try {
      const r = await searchYouTube(query);
      setResults(r);
    } catch {
      setTimeout(() => Alert.alert('Search failed', 'Could not reach the server. Check your connection.'), 0);
    } finally {
      setLoading(false);
    }
  };

  const markAdded = useCallback((videoId: string) => {
    setAddedIds(prev => new Set(prev).add(videoId));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }, 2000);
  }, []);

  const buildTrack = (item: SearchResult, stream: StreamInfo) => ({
    id:       item.videoId,
    url:      stream.url,
    headers:  stream.headers,
    title:    item.title,
    artist:   item.artist,
    artwork:  item.thumbnail,
    duration: item.duration ?? 0,
  });

  /** Instantly replaces the queue and starts playing the selected track. */
  const handlePlayNow = async (item: SearchResult) => {
    setLoadingId(item.videoId);
    try {
      const stream = await getStreamUrl(item.videoId);
      if (!stream) { setTimeout(() => Alert.alert('Could not get stream URL'), 0); return; }
      hapticMedium();
      await TrackPlayer.reset();
      await TrackPlayer.add(buildTrack(item, stream));
      await TrackPlayer.play();
    } catch {
      setTimeout(() => Alert.alert('Playback error', 'Could not load the track.'), 0);
    } finally {
      setLoadingId(null);
    }
  };

  /**
   * Smart add-to-queue:
   *  • Empty queue or library queue → reset and start fresh YouTube playback immediately.
   *  • Existing YouTube queue → append track at end (no interruption).
   */
  const handleAddToQueue = async (item: SearchResult) => {
    setLoadingId(item.videoId);
    try {
      const stream = await getStreamUrl(item.videoId);
      if (!stream) { setTimeout(() => Alert.alert('Could not get stream URL'), 0); return; }
      const track = buildTrack(item, stream);
      const queue = await TrackPlayer.getQueue();
      if (isLibraryOrEmptyQueue(queue)) {
        hapticMedium();
        await TrackPlayer.reset();
        await TrackPlayer.add(track);
        await TrackPlayer.play();
      } else {
        await TrackPlayer.add(track);
      }

      markAdded(item.videoId);
    } catch {
      setTimeout(() => Alert.alert('Playback error', 'Could not load the track.'), 0);
    } finally {
      setLoadingId(null);
    }
  };

  const formatDuration = (secs: number | null) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <ScreenWithMiniPlayer>
      <BackSwipeContainer onBack={() => navigation.goBack()}>
      <View style={searchScreenStyles.root}>
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.libraryStackScrollContent}>
        <View style={styles.screenContainer}>

          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                navigation.goBack();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back">
              <Icon name="arrow-left" size={20} color="#444" />
            </TouchableOpacity>
            <Text style={styles.nowPlayingTitle}>Search</Text>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                navigation.navigate('Queue');
              }}
              accessibilityRole="button"
              accessibilityLabel="Open queue">
              <Icon name="list-ul" size={20} color="#444" />
            </TouchableOpacity>

            <View style={{ width: 20 }} />
          </View>

          {/* Search bar */}
          <View style={searchRow}>
            <TextInput
              style={input}
              placeholder="Search any song or artist…"
              placeholderTextColor={COLORS.textLight}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={searchBtn}
              onPress={() => void handleSearch()}
              activeOpacity={0.8}>
              <Icon name="search" size={15} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Results */}
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 48 }} size="large" />
          ) : results.length === 0 ? (
            <Text style={hint}>
              {query.trim() ? 'No results found.' : 'Search for any song to stream it instantly.'}
            </Text>
          ) : (
            <View style={styles.trackList}>
              {results.map(item => {
                const isPlaying = activeTrack?.id === item.videoId;
                const isLoading = loadingId === item.videoId;
                const isAdded = addedIds.has(item.videoId);
                return (
                  <View
                    key={item.videoId}
                    style={[styles.trackItem, isPlaying && styles.trackItemPlaying]}>

                    {/* Main tap zone → play now */}
                    <TouchableOpacity
                      style={srStyles.mainTap}
                      onPress={() => handlePlayNow(item)}
                      activeOpacity={0.7}
                      disabled={isLoading}>
                      <Image source={{ uri: item.thumbnail }} style={styles.trackThumb} />
                      <View style={styles.trackInfo}>
                        <Text
                          style={[styles.trackTitle, isPlaying && styles.trackTitlePlaying]}
                          numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.trackArtist} numberOfLines={1}>
                          {item.artist}
                        </Text>
                        {item.duration ? (
                          <Text style={styles.trackArtist}>{formatDuration(item.duration)}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    {/* Icon button → add to queue */}
                    <TouchableOpacity
                      style={styles.trackPlayingIcon}
                      onPress={() => handleAddToQueue(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={isLoading}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : isPlaying ? (
                        <Icon name="volume-up" size={14} color={COLORS.playing} />
                      ) : isAdded ? (
                        <Icon name="check" size={14} color="#22c55e" solid />
                      ) : (
                        <Icon name="plus" size={14} color={COLORS.primary} solid />
                      )}
                    </TouchableOpacity>

                  </View>
                );
              })}
            </View>
          )}

        </View>
      </ScrollView>
      <StreamRecoveryBanner />
      </View>
      </BackSwipeContainer>
    </ScreenWithMiniPlayer>
  );
}

const searchScreenStyles = StyleSheet.create({
  root: { flex: 1 },
});

// Local styles that extend the shared sheet
const searchRow: object = {
  flexDirection: 'row',
  marginBottom: 16,
  gap: 8,
};

const input: object = {
  flex: 1,
  backgroundColor: COLORS.card,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  color: COLORS.text,
  fontSize: 15,
  borderWidth: 1,
  borderColor: COLORS.border,
};

const searchBtn: object = {
  backgroundColor: COLORS.primary,
  borderRadius: 12,
  paddingHorizontal: 16,
  justifyContent: 'center',
  alignItems: 'center',
};

const hint: object = {
  textAlign: 'center',
  color: COLORS.textLight,
  marginTop: 60,
  fontSize: 15,
};

const srStyles = {
  mainTap: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'stretch' as const,
  },
  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 40,
  },
};
