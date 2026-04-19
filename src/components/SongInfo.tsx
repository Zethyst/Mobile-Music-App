import React from 'react';
import { View, Text } from 'react-native';
import { Track } from 'react-native-track-player';
import { styles } from '../styles';

interface SongInfoProps {
  track: Track | null | undefined;
}

export default function SongInfo({ track }: SongInfoProps) {
  return (
    <View style={styles.songDetailsContainer}>
      <Text style={styles.songTitle} numberOfLines={1}>
        {track?.title ?? 'Unknown Title'}
      </Text>
      <Text style={styles.songArtist} numberOfLines={1}>
        {track?.artist ?? 'Unknown Artist'}
      </Text>
    </View>
  );
}