import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useActiveTrack } from 'react-native-track-player';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { tracks, COLORS, DEFAULT_COVER_URI } from '../constants';
import { playLibraryTrack } from '../services/musicPlayerServices';
import { styles, formatTime } from '../styles';
import type { RootStackParamList } from '../navigation/types';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';

type Props = NativeStackScreenProps<RootStackParamList, 'FullSongs'>;

const MINI_PLAYER_PAD = 96;

export default function FullSongsScreen({ navigation }: Props) {
  const activeTrack = useActiveTrack();

  const playTrack = (index: number) => playLibraryTrack(index);

  return (
    <ScreenWithMiniPlayer>
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
            <Text style={styles.nowPlayingTitle}>Music List</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={[styles.sectionTitleRow, { marginTop: 8, marginBottom: 8 }]}>
            <Icon name="list-ul" size={16} color={COLORS.text} />
            <Text style={styles.sectionTitle}>All songs</Text>
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
                    source={{ uri: song.artwork || DEFAULT_COVER_URI }}
                    style={styles.trackThumb}
                  />
                  <View style={styles.trackInfo}>
                    <Text
                      style={[styles.trackTitle, isActive && styles.trackTitlePlaying]}
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
      </ScrollView>
    </ScreenWithMiniPlayer>
  );
}
