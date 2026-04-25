import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useActiveTrack } from 'react-native-track-player';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
  tracks,
  COLORS,
  DEFAULT_COVER_URI,
  libraryArtistSpotlights,
  libraryAlbumsHomePreview,
} from '../constants';
import { styles, formatTime } from '../styles';
import { playLibraryTrack } from '../services/musicPlayerServices';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';
import BackSwipeContainer from '../components/BackSwipeContainer';
import AlbumCardFooterBlur from '../components/AlbumCardFooterBlur';
import { openSpotifyArtist } from '../utils/openSpotifyArtist';
import { openContactWithAppPreferred } from '../utils/openContactLink';
import LinearGradient from 'react-native-linear-gradient';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { usePlaylists } from '../contexts/PlaylistContext';
import {
  hapticLight,
  hapticMedium,
  hapticSelection,
} from '../utils/haptics';
type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Library'>,
  NativeStackScreenProps<RootStackParamList>
>;

const CAROUSEL_AUTO_MS = 5000;
/** Matches horizontal insets for `screenContainer` + `ScrollView` (see Full albums grid). */
const BANNER_CAROUSEL_OUTSIDE_H = 8 + 32 + 48;

export default function MusicLibrary({ navigation }: Props) {
  const activeTrack = useActiveTrack();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bannerScrollRef = useRef<ScrollView>(null);
  const carouselIndexRef = useRef(0);
  const [measuredCarouselWidth, setMeasuredCarouselWidth] = useState<
    number | null
  >(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const spotlightItems = Array.from(libraryArtistSpotlights);
  const spotlightCount = spotlightItems.length;
  const { playlists, createNew } = usePlaylists();
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const previewPlaylists = playlists.slice(0, 2);

  /** Same idea as MusicPlayer: at least one viewport tall so space-between + flexGrow middle work */
  const minLayoutHeight = Math.max(
    windowHeight - insets.top - insets.bottom,
    0,
  );

  const playTrack = (index: number) => {
    hapticMedium();
    void playLibraryTrack(index);
  };

  const carouselPageWidth =
    measuredCarouselWidth ??
    Math.max(0, windowWidth - BANNER_CAROUSEL_OUTSIDE_H);

  useEffect(() => {
    if (measuredCarouselWidth == null || spotlightCount === 0) {
      return;
    }
    const i = carouselIndexRef.current;
    requestAnimationFrame(() => {
      bannerScrollRef.current?.scrollTo({
        x: i * measuredCarouselWidth,
        animated: false,
      });
    });
  }, [measuredCarouselWidth, spotlightCount]);

  const goToCarouselSlide = useCallback(
    (i: number, animated = true) => {
      if (carouselPageWidth <= 0 || spotlightCount === 0) {
        return;
      }
      const clamped = Math.max(0, Math.min(i, spotlightCount - 1));
      carouselIndexRef.current = clamped;
      setCarouselIndex(clamped);
      bannerScrollRef.current?.scrollTo({
        x: clamped * carouselPageWidth,
        animated,
      });
    },
    [carouselPageWidth, spotlightCount],
  );

  const onBannerScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (carouselPageWidth <= 0) {
        return;
      }
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / carouselPageWidth);
      const clamped = Math.max(0, Math.min(i, spotlightCount - 1));
      carouselIndexRef.current = clamped;
      setCarouselIndex(clamped);
    },
    [carouselPageWidth, spotlightCount],
  );

  useEffect(() => {
    if (carouselPageWidth <= 0 || spotlightCount <= 1) {
      return;
    }
    const id = setInterval(() => {
      const next = (carouselIndexRef.current + 1) % spotlightCount;
      goToCarouselSlide(next, true);
    }, CAROUSEL_AUTO_MS);
    return () => clearInterval(id);
  }, [carouselPageWidth, spotlightCount, goToCarouselSlide]);

  return (
    <ScreenWithMiniPlayer>
      <BackSwipeContainer onBack={() => navigation.goBack()}>
        <ScrollView
          style={styles.container}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.playerScrollContent,
            { minHeight: minLayoutHeight, paddingBottom: 96 },
          ]}>
          <View
            style={[
              styles.screenContainer,
              styles.playerScreenLayout,
              { minHeight: minLayoutHeight - 96 },
            ]}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => {
                  navigation.goBack();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Back to now playing">
                <Icon name="arrow-left" size={20} color="#444" />
              </TouchableOpacity>
              <Text style={styles.nowPlayingTitle}>Music Library</Text>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Main', { screen: 'Search' });
                }}>
                <Icon name="search" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <View style={{ width: 20 }} />
            </View>

            {/* Middle band: grows and centers like artwork block on the player */}
            <View style={styles.playerArtworkSongBlock}>
              <View
                style={styles.bannerCarouselOuter}
                onLayout={({ nativeEvent }) =>
                  setMeasuredCarouselWidth(nativeEvent.layout.width)
                }>
                <View style={styles.bannerCarouselViewport}>
                  <ScrollView
                    ref={bannerScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    nestedScrollEnabled
                    onMomentumScrollEnd={onBannerScrollEnd}
                    scrollEventThrottle={16}
                    style={{ width: '100%', height: 120 }}
                    contentContainerStyle={{
                      width: carouselPageWidth * spotlightCount,
                    }}>
                    {spotlightItems.map(artist => (
                      <View
                        key={artist.id}
                        style={[
                          styles.bannerCarouselSlide,
                          { width: carouselPageWidth },
                        ]}>
                        <ImageBackground
                          source={{ uri: artist.coverUri }}
                          style={styles.bannerImage}
                          imageStyle={{ borderRadius: 12 }}
                          resizeMode="cover">
                          <View style={styles.bannerOverlay} />
                          <View style={styles.bannerContent}>
                            <View style={styles.bannerTextBlock}>
                              <Text
                                style={styles.bannerCarouselTitle}
                                numberOfLines={1}>
                                {artist.name}
                              </Text>
                              <Text
                                style={styles.bannerCarouselListeners}
                                numberOfLines={2}>
                                {artist.listeners}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.followBtnSpotlight}
                              onPress={() => {
                                hapticMedium();
                                if ('contactLink' in artist && artist.contactLink) {
                                  const app =
                                    'contactAppLink' in artist &&
                                      artist.contactAppLink
                                      ? artist.contactAppLink
                                      : undefined;
                                  void openContactWithAppPreferred(
                                    app,
                                    artist.contactLink,
                                  );
                                } else if ('spotifyArtistId' in artist) {
                                  void openSpotifyArtist(artist.spotifyArtistId);
                                }
                              }}
                              activeOpacity={0.8}
                              accessibilityRole="button"
                              accessibilityLabel={
                                'contactLink' in artist && artist.contactLink
                                  ? `Contact ${artist.name}`
                                  : `Open ${artist.name} on Spotify`
                              }>
                              <Text style={styles.followBtnText}>
                                {'contactLink' in artist && artist.contactLink
                                  ? 'Contact'
                                  : 'Follow'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </ImageBackground>
                      </View>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.bannerCarouselDotsRow}>
                  {spotlightItems.map((artist, i) => (
                    <TouchableOpacity
                      key={`dot-${artist.id}`}
                      onPress={() => {
                        hapticSelection();
                        goToCarouselSlide(i);
                      }}
                      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${artist.name}`}
                      accessibilityState={{ selected: i === carouselIndex }}>
                      <View
                        style={[
                          styles.bannerCarouselDot,
                          i === carouselIndex && styles.bannerCarouselDotActive,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Icon name="headphones" size={18} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Playlists</Text>
                </View>
                {playlists.length > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Playlists')}>
                    <Text style={styles.seeAll}>See all</Text>
                  </TouchableOpacity>
                )}
              </View>


              <View style={{ width: '100%' }}>
                {playlists.length === 0 ? (
                  // ── Empty state: neumorphic Create Playlist button ──────────────────────
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => { hapticLight(); setShowCreatePlaylist(true); }}
                    style={plStyles.neumorphBtn}>
                    <LinearGradient
                      colors={['#c8bdf0', '#ede8fa']}
                      start={{ x: 0.15, y: 0 }}
                      end={{ x: 0.85, y: 1 }}
                      style={plStyles.neumorphGrad}>
                      <View style={plStyles.neumorphInner}>
                        <LinearGradient
                          colors={[COLORS.primary, COLORS.secondary ?? '#12ccd0']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={plStyles.neumorphIconCircle}>
                        <Text style={plStyles.neumorphLabel}>Create Playlist</Text>
                        </LinearGradient>
                        <Text style={plStyles.neumorphHint}>Add songs from Search or Downloads</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  // ── Playlist preview cards (max 2) ──────────────────────────────────────
                  <View style={plStyles.previewRow}>
                    {previewPlaylists.map(pl => (
                      <TouchableOpacity
                        key={pl.id}
                        style={plStyles.previewCard}
                        activeOpacity={0.82}
                        onPress={() => {
                          hapticLight();
                          navigation.navigate('PlaylistDetail', { playlistId: pl.id });
                        }}>
                        {pl.coverUri ? (
                          <Image source={{ uri: pl.coverUri }} style={plStyles.previewCover} />
                        ) : (
                          <LinearGradient
                            colors={['#e8e0f8', '#c5b5f0']}
                            style={plStyles.previewCoverPlaceholder}>
                            <Icon name="music" size={26} color={COLORS.primary} />
                          </LinearGradient>
                        )}
                        <View style={plStyles.previewFooter}>
                          <Text style={plStyles.previewName} numberOfLines={1}>{pl.name}</Text>
                          <Text style={plStyles.previewCount}>{pl.tracks.length} songs</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    {/* "New playlist" quick-add card */}
                    <TouchableOpacity
                      style={plStyles.previewCard}
                      activeOpacity={0.82}
                      onPress={() => { hapticLight(); setShowCreatePlaylist(true); }}>
                      <LinearGradient
                        colors={['#ddd7f7', '#ede8fa']}
                        start={{ x: 0.15, y: 0 }}
                        end={{ x: 0.85, y: 1 }}
                        style={plStyles.previewNewGrad}>
                        <View style={plStyles.previewNewInner}>
                          <Icon name="plus" size={22} color={COLORS.primary} />
                          <Text style={plStyles.previewNewLabel}>New</Text>
                        </View>
                      </LinearGradient>
                      <View style={plStyles.previewNewFooter}>
                      <Text style={plStyles.previewName} numberOfLines={1}>Create New Playlist</Text>
                      <Text style={plStyles.previewCount}>Build the perfect vibe</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Bottom band: list header + tracks (same role as controls block on player) */}
            <View style={styles.playerControlsBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Icon name="list-ul" size={16} color={COLORS.text} />
                    <Text style={styles.sectionTitle}>Music List</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      navigation.navigate('FullSongs');
                    }}>
                    <Text style={styles.seeAll}>See all</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.trackList}>
                  {tracks.map((song, index) => {
                    const isActive = activeTrack?.title === song.title;
                    return (
                      <TouchableOpacity
                        key={song.id}
                        style={[styles.trackItem, isActive && styles.trackItemPlaying]}
                        onPress={() => playTrack(index)}
                        activeOpacity={0.7}>
                        <Image
                          source={{
                            uri: song.artwork || DEFAULT_COVER_URI,
                          }}
                          style={styles.trackThumb}
                        />
                        <View style={styles.trackInfo}>
                          <Text
                            style={[
                              styles.trackTitle,
                              isActive && styles.trackTitlePlaying,
                            ]}
                            numberOfLines={1}>
                            {song.title}
                          </Text>
                          <Text style={styles.trackArtist} numberOfLines={1}>
                            {song.artist}
                          </Text>
                        </View>
                        {isActive ? (
                          <View style={styles.trackPlayingIcon}>
                            <Icon name="play" size={12} color={COLORS.primary} style={{ marginLeft: 2 }} />
                          </View>
                        ) : (
                          <Text style={styles.trackDuration}>
                            {formatTime(song.duration ?? 0)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
            </View>
          </View>
        </ScrollView>
      </BackSwipeContainer>
      <CreatePlaylistModal
        visible={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onSave={async data => {
          await createNew(data);
          setShowCreatePlaylist(false);
        }}
      />
    </ScreenWithMiniPlayer>
  );
}


export const plStyles = StyleSheet.create({
  // Create button (empty state)
  neumorphBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 4,
  },
  neumorphGrad: {
    borderRadius: 18,
    padding: 1.5,
  },
  neumorphInner: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(82,50,193,0.15)',
  },
  neumorphIconCircle: {
    width: 152,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  neumorphLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  neumorphHint: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 17,
  },

  // Preview cards row (when playlists exist)
  previewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  previewCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f0ebff',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  previewCover: {
    width: '100%',
    aspectRatio: 1,
  },
  previewCoverPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFooter: {
    padding: 8,
  },
  previewName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  previewCount: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 1,
  },
  /** Same `padding` as `previewFooter` but grows so the card matches row height. */
  previewNewFooter: {
    padding: 8,
    flex: 1,
  },
  /** Same footprint as `previewCover` (square) — full width, no flex:1 + aspect ratio fight. */
  previewNewGrad: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  previewNewInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  previewNewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});