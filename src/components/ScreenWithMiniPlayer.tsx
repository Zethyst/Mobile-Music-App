import React from 'react';
import { View } from 'react-native';
import { styles } from '../styles';
import MiniPlayer from './MiniPlayer';

/** Wraps screen content with the floating mini player (same on Library + sub-screens). */
export default function ScreenWithMiniPlayer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      {children}
      <MiniPlayer />
    </View>
  );
}
