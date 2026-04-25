import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  DeviceEventEmitter,
  Modal,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import TrackPlayer, { useActiveTrack } from 'react-native-track-player';
import LinearGradient from 'react-native-linear-gradient';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { searchYouTube, getStreamUrl, SearchResult, StreamInfo } from '../services/streamService';
import { COLORS, tracks as libraryTracks } from '../constants';
import { styles } from '../styles';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';
import BackSwipeContainer from '../components/BackSwipeContainer';
import StreamRecoveryBanner from '../components/StreamRecoveryBanner';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticWarning,
} from '../utils/haptics';
import { track as analyticsTrack } from '../utils/analytics';
import {
  downloadTrackToDevice,
  DOWNLOAD_PROGRESS_EVENT,
} from '../services/downloadService';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { usePlaylists } from '../contexts/PlaylistContext';
import type { PlaylistTrack } from '../services/playlistService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Search'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** Library track IDs are numeric strings — YouTube video IDs are longer alphanumeric strings. */
const LIBRARY_IDS = new Set(libraryTracks.map(t => t.id));

const isLibraryOrEmptyQueue = (queue: Awaited<ReturnType<typeof TrackPlayer.getQueue>>) =>
  queue.length === 0 || LIBRARY_IDS.has(queue[0].id);

// Survives component unmount so state is restored when navigating back
const cache = { query: '', results: [] as SearchResult[] };

/** Dev-only: set to `true` to preview the indeterminate bar on the first search result, then set back to `false`. */
const PREVIEW_SHIMMER_BAR = __DEV__ && false;

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState(cache.query);
  const [results, setResults] = useState<SearchResult[]>(cache.results);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadLoadingId, setDownloadLoadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  /** Video IDs that were just added (shows a ✓ for 2 s) */
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [menuItem, setMenuItem] = useState<SearchResult | null>(null);
  const activeTrack = useActiveTrack();
  const { addTrack, createNew } = usePlaylists();
  const [addToPlaylistItem, setAddToPlaylistItem] = useState<SearchResult | null>(null);
  const [showCreateForSearch, setShowCreateForSearch] = useState(false);
  /** YouTube track already in the player queue — reuse its stream URL for playlist add (no extra getStreamUrl). */
  const playlistStreamFromQueueRef = useRef<{
    videoId: string;
    url: string;
    headers?: Record<string, string>;
  } | null>(null);

  // Keep cache in sync whenever state changes
  useEffect(() => { cache.query = query; }, [query]);
  useEffect(() => { cache.results = results; }, [results]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      DOWNLOAD_PROGRESS_EVENT,
      (e: { videoId: string; percent: number }) => {
        setDownloadProgress(prev => {
          if (e.percent >= 100 || e.percent === 0) {
            // Remove from map on completion or reset
            const { [e.videoId]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [e.videoId]: e.percent };
        });
      },
    );
    return () => sub.remove();
  }, []);

  /** Resolves stream URL, persists to playlist, then haptics + alert. Clears `playlistStreamFromQueueRef` in `finally`. */
  const addSearchResultToPlaylist = async (playlistId: string, item: SearchResult, streamUrl?: string, streamHeaders?: Record<string, string>) => {
    try {
      let url = streamUrl;
      let headers = streamHeaders;
      if (!url) {
        const fromQueue = playlistStreamFromQueueRef.current;
        if (fromQueue?.videoId === item.videoId && fromQueue.url) {
          url = fromQueue.url;
          headers = fromQueue.headers ?? {};
        } else {
          const stream: StreamInfo | null = await getStreamUrl(item.videoId);
          if (stream) {
            url = stream.url;
            headers = stream.headers;
          }
        }
      }
      const track: Omit<PlaylistTrack, 'addedAt'> = {
        videoId: item.videoId,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        duration: item.duration,
        streamUrl: url,
        streamHeaders: headers,
      };
      await addTrack(playlistId, track);
      hapticSuccess();
    } catch {
      hapticWarning();
      setTimeout(
        () => Alert.alert('Could not add to playlist', 'Check your network and try again.'),
        0,
      );
    } finally {
      playlistStreamFromQueueRef.current = null;
    }
  };

  /** Fire-and-forget: modal can close while stream URL is still resolving. */
  const queueAddToPlaylist = (playlistId: string, item: SearchResult) => {
    void addSearchResultToPlaylist(playlistId, item);
  };

  const handleSearch = async () => {
    Keyboard.dismiss();
    if (!query.trim()) return;
    hapticLight();
    setLoading(true);
    setResults([]);
    try {
      const q = query.trim();
      const r = await searchYouTube(query);
      setResults(r);
      analyticsTrack('song_search', {
        query: q,
        results_count: r.length,
      });
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
    id: item.videoId,
    url: stream.url,
    headers: stream.headers,
    title: item.title,
    artist: item.artist,
    artwork: item.thumbnail,
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

  const handleDownload = async (item: SearchResult) => {
    setDownloadLoadingId(item.videoId);
    try {
      await downloadTrackToDevice({
        videoId: item.videoId,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        duration: item.duration,
      });
      hapticSuccess();
      setTimeout(
        () => Alert.alert('Downloaded', 'Saved to Downloads on this device.'),
        0,
      );
    } catch (e) {
      const isFormatError = e instanceof Error && e.message === 'FORMAT_UNAVAILABLE';
      setTimeout(() => Alert.alert(
        'Download failed',
        isFormatError
          ? 'This track is not available for download.'
          : 'Could not save the file. Try again.',
      ), 0);
    } finally {
      setDownloadLoadingId(null);
    }
  };

  const showTrackMenu = (item: SearchResult) => {
    hapticLight();
    setMenuItem(item);
    void (async () => {
      try {
        const queue = await TrackPlayer.getQueue();
        const qTrack = queue.find(t => String(t.id) === item.videoId);
        const u = qTrack && typeof qTrack.url === 'string' ? qTrack.url : '';
        if (u) {
          const h = (qTrack as { headers?: Record<string, string> | undefined })?.headers;
          playlistStreamFromQueueRef.current = { videoId: item.videoId, url: u, headers: h };
        } else {
          playlistStreamFromQueueRef.current = null;
        }
      } catch {
        playlistStreamFromQueueRef.current = null;
      }
    })();
  };

  const closeTrackMenu = () => setMenuItem(null);

  const onMenuAddToQueue = () => {
    if (!menuItem) return;
    const item = menuItem;
    closeTrackMenu();
    void handleAddToQueue(item);
  };

  const onMenuDownload = () => {
    if (!menuItem) return;
    const item = menuItem;
    closeTrackMenu();
    void handleDownload(item);
  };

  const formatDuration = (secs: number | null) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Indeterminate shimmer for downloads where content-length is unknown (chunked pipe)
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerAnim]);
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

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
                    const isDlBusy = downloadLoadingId === item.videoId;
                    const isAdded = addedIds.has(item.videoId);
                    const pctFromDl = downloadProgress[item.videoId];
                    const pct = pctFromDl ?? (
                      PREVIEW_SHIMMER_BAR && results[0]?.videoId === item.videoId
                        ? -1
                        : undefined
                    );
                    return (
                      <View
                        key={item.videoId}
                        style={srStyles.trackWrap}>
                        <View style={[styles.trackItem, { borderBottomWidth: 0 }, isPlaying && styles.trackItemPlaying]}>
                          <TouchableOpacity
                            style={srStyles.mainTap}
                            onPress={() => handlePlayNow(item)}
                            activeOpacity={0.7}
                            disabled={isLoading || isDlBusy}>
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

                          <TouchableOpacity
                            style={styles.trackPlayingIcon}
                            onPress={() => showTrackMenu(item)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            disabled={isLoading || isDlBusy}>
                            {isLoading || isDlBusy ? (
                              <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : isPlaying ? (
                              <Icon name="volume-up" size={14} color={COLORS.playing} />
                            ) : isAdded ? (
                              <Icon name="check" size={14} color="#22c55e" solid />
                            ) : (
                              <Icon name="ellipsis-v" size={14} color={COLORS.primary} solid />
                            )}
                          </TouchableOpacity>
                        </View>

                        {pct !== undefined && pct < 100 && (
                          <View style={srStyles.progressTrack}>
                            {pct === -1 ? (
                              // Indeterminate shimmer — chunked stream, no Content-Length
                              <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 99 }]}>
                                <Animated.View
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    width: '45%',
                                    transform: [{ translateX: shimmerTranslate }],
                                  }}>
                                  <LinearGradient
                                    colors={['transparent', COLORS.primary, COLORS.secondary, COLORS.primary, 'transparent']}
                                    locations={[0, 0.2, 0.5, 0.8, 1]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                  />
                                </Animated.View>
                              </View>
                            ) : (
                              // Determinate — gradient fill + rounded cap
                              <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 99 }]}>
                                <LinearGradient
                                  colors={[COLORS.primary, COLORS.secondary]}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 0 }}
                                  style={[StyleSheet.absoluteFill, { right: `${100 - pct}%` }]}
                                />
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

            </View>
          </ScrollView>
          <StreamRecoveryBanner />
        </View>

        <Modal
          visible={menuItem != null}
          transparent
          animationType="fade"
          onRequestClose={closeTrackMenu}
          statusBarTranslucent>
          <View style={menuStyles.backdrop}>
            <Pressable style={menuStyles.scrim} onPress={closeTrackMenu} />
            <View style={menuStyles.sheet} accessibilityViewIsModal>
              <Text style={menuStyles.menuTitle} numberOfLines={2}>
                {menuItem?.title}
              </Text>
              <Text style={menuStyles.menuHint}>Choose an action</Text>

              <TouchableOpacity
                style={menuStyles.row}
                onPress={onMenuAddToQueue}
                activeOpacity={0.7}>
                <Icon name="plus" size={16} color={COLORS.primary} solid />
                <Text style={menuStyles.rowText}>Add to queue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={menuStyles.row}
                onPress={onMenuDownload}
                activeOpacity={0.7}>
                <Icon name="cloud-download-alt" size={16} color={COLORS.primary} solid />
                <Text style={menuStyles.rowText}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={menuStyles.row}
                onPress={() => {
                  closeTrackMenu();
                  setTimeout(() => setAddToPlaylistItem(menuItem), 300);
                }}
                activeOpacity={0.7}>
                <Icon name="list-ul" size={16} color={COLORS.primary} solid />
                <Text style={menuStyles.rowText}>Add to playlist</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={menuStyles.cancelRow}
                onPress={closeTrackMenu}
                activeOpacity={0.7}>
                <Text style={menuStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </BackSwipeContainer>
      <AddToPlaylistModal
        visible={addToPlaylistItem != null}
        onClose={() => {
          playlistStreamFromQueueRef.current = null;
          setAddToPlaylistItem(null);
        }}
        trackTitle={addToPlaylistItem?.title}
        onSelectPlaylist={async (playlistId) => {
          if (!addToPlaylistItem) return;
          const item = addToPlaylistItem;
          setAddToPlaylistItem(null);
          queueAddToPlaylist(playlistId, item);
        }}
        onCreateNew={() => {
          setAddToPlaylistItem(null);
          setTimeout(() => setShowCreateForSearch(true), 350);
        }}
      />

      <CreatePlaylistModal
        visible={showCreateForSearch}
        onClose={() => setShowCreateForSearch(false)}
        onSave={async (data) => {
          const pl = await createNew(data);
          setShowCreateForSearch(false);
          if (addToPlaylistItem) {
            const item = addToPlaylistItem;
            setAddToPlaylistItem(null);
            queueAddToPlaylist(pl.id, item);
          }
        }}
      />
    </ScreenWithMiniPlayer>
  );
}

const searchScreenStyles = StyleSheet.create({
  root: { flex: 1 },
});

const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  menuHint: {
    fontSize: 13,
    color: COLORS.textLight,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  cancelRow: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
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

const srStyles = StyleSheet.create({
  trackWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  mainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(82,50,193,0.12)',
    borderRadius: 99,
    marginTop: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
});
