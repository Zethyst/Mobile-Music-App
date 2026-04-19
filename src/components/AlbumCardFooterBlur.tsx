import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { styles } from '../styles';

type Props = {
  title: string;
  artist: string;
};

/**
 * Frosted-glass-style footer using LinearGradient — zero pixel sampling cost,
 * safe in scrolling lists. Replaces the native BlurView that stalled the Library screen.
 */
export default function AlbumCardFooterBlur({ title, artist }: Props) {
  return (
    <LinearGradient
      colors={['transparent', 'rgba(30,15,40,0.82)', 'rgba(30,15,40,0.92)']}
      locations={[0, 0.45, 1]}
      style={styles.albumFooterBlurWrap}
      pointerEvents="none">
      <View style={styles.albumFooterBlurInner}>
        <View style={{ flex: 1, marginRight: 6 }}>
          <Text style={styles.albumTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.albumArtist} numberOfLines={2}>
            {artist}
          </Text>
        </View>
        <View style={styles.albumPlayIcon}>
          <Icon name="play" size={10} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </LinearGradient>
  );
}
