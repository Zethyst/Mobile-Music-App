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
              <Icon name="compact-disc" size={18} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Albums</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                navigation.navigate('FullAlbums');
              }}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.albumsRow}>
            {libraryAlbumsHomePreview.map(album => {
              const queued = tracks[album.trackIndex];
              const isActive = !!queued && activeTrack?.id === queued.id;
              return (
                <TouchableOpacity
                  key={album.id}
                  style={[styles.albumCard, isActive && styles.albumGridCardActive]}
                  activeOpacity={0.85}
                  onPress={() => playTrack(album.trackIndex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${album.title}`}>
                  <ImageBackground
                    source={{ uri: album.coverUri }}
                    style={styles.albumCoverImage}
                    resizeMode="cover">
                    <View style={styles.albumOverlay} />
                    <AlbumCardFooterBlur title={album.title} artist={album.artist} />
                  </ImageBackground>
                </TouchableOpacity>
              );
            })}
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
    </ScreenWithMiniPlayer>
  );
}

