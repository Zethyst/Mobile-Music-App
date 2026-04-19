import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useActiveTrack } from 'react-native-track-player';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { libraryAlbums, tracks } from '../constants';
import { playLibraryTrack } from '../services/musicPlayerServices';
import { styles } from '../styles';
import type { RootStackParamList } from '../navigation/types';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';
import BackSwipeContainer from '../components/BackSwipeContainer';
import { hapticLight, hapticMedium } from '../utils/haptics';
import AlbumCardFooterBlur from '../components/AlbumCardFooterBlur';

type Props = NativeStackScreenProps<RootStackParamList, 'FullAlbums'>;

/** Horizontal space outside the grid: scroll pad (4×2) + screen margin (16×2) + screen padding (24×2). */
const GRID_OUTSIDE_H = 8 + 32 + 48;
const COLUMN_GAP = 12;

export default function FullAlbumsScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const activeTrack = useActiveTrack();
  const [gridInnerWidth, setGridInnerWidth] = useState(0);
  const fallbackGridW = Math.max(0, width - GRID_OUTSIDE_H);
  const rowWidth = gridInnerWidth > 0 ? gridInnerWidth : fallbackGridW;
  const cardW = (rowWidth - COLUMN_GAP) / 2;

  const playAlbum = (trackIndex: number) => {
    hapticMedium();
    void playLibraryTrack(trackIndex);
  };

  return (
    <ScreenWithMiniPlayer>
      <BackSwipeContainer onBack={() => navigation.goBack()}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.libraryStackScrollContent}>
        <View style={styles.screenContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back">
              <Icon name="arrow-left" size={20} color="#444" />
            </TouchableOpacity>
            <Text style={styles.nowPlayingTitle}>Albums</Text>
            <View style={{ width: 20 }} />
          </View>

          <View
            style={styles.albumGrid}
            onLayout={({ nativeEvent }) =>
              setGridInnerWidth(nativeEvent.layout.width)
            }>
            {libraryAlbums.map(album => {
              const queued = tracks[album.trackIndex];
              const isActive =
                !!queued && activeTrack?.id === queued.id;
              return (
                <TouchableOpacity
                  key={album.id}
                  activeOpacity={0.85}
                  onPress={() => playAlbum(album.trackIndex)}
                  style={[
                    styles.albumGridCard,
                    {
                      width: cardW,
                      height: cardW + 36,
                    },
                    isActive && styles.albumGridCardActive,
                  ]}>
                  <ImageBackground
                    source={{ uri: album.coverUri }}
                    style={styles.albumGridCover}
                    imageStyle={{ borderRadius: 12 }}
                    resizeMode="cover">
                    <View style={styles.albumOverlay} />
                    <AlbumCardFooterBlur title={album.title} artist={album.artist} />
                  </ImageBackground>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
      </BackSwipeContainer>
    </ScreenWithMiniPlayer>
  );
}
