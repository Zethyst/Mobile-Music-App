import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { COLORS } from '../constants';
import { usePlaylists } from '../contexts/PlaylistContext';
import { hapticLight, hapticMedium } from '../utils/haptics';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectPlaylist: (playlistId: string) => Promise<void>;
  onCreateNew: () => void;
  trackTitle?: string;
};

export default function AddToPlaylistModal({
  visible,
  onClose,
  onSelectPlaylist,
  onCreateNew,
  trackTitle,
}: Props) {
  const { playlists } = usePlaylists();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
    hapticLight();
  };

  const handleSelect = async (id: string) => {
    hapticMedium();
    await onSelectPlaylist(id);
    close();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, apm.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[apm.sheet, { transform: [{ translateY }], opacity: fadeAnim }]}>
        {/* Handle bar */}
        <View style={apm.handle} />

        <View style={apm.headerRow}>
          <Text style={apm.title}>Add to playlist</Text>
          {!!trackTitle && (
            <Text style={apm.subtitle} numberOfLines={1}>{trackTitle}</Text>
          )}
        </View>

        {/* Create new playlist option */}
        <TouchableOpacity
          style={apm.createRow}
          onPress={() => { close(); setTimeout(onCreateNew, 300); }}
          activeOpacity={0.8}>
          <View style={apm.createIcon}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary ?? '#12ccd0']}
              style={apm.createIconGradient}
            />
            <Icon name="plus" size={14} color="#fff" />
          </View>
          <Text style={apm.createText}>Create new playlist</Text>
          <Icon name="chevron-right" size={12} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* Existing playlists */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 300 }}>
          {playlists.length === 0 ? (
            <Text style={apm.emptyHint}>No playlists yet. Create one above!</Text>
          ) : (
            playlists.map(pl => (
              <TouchableOpacity
                key={pl.id}
                style={apm.playlistRow}
                onPress={() => void handleSelect(pl.id)}
                activeOpacity={0.75}>
                {pl.coverUri ? (
                  <Image source={{ uri: pl.coverUri }} style={apm.plCover} />
                ) : (
                  <LinearGradient
                    colors={['#e8e0f8', '#d4c5f9']}
                    style={apm.plCoverPlaceholder}>
                    <Icon name="music" size={14} color={COLORS.primary} />
                  </LinearGradient>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={apm.plName} numberOfLines={1}>{pl.name}</Text>
                  <Text style={apm.plCount}>{pl.tracks.length} song{pl.tracks.length !== 1 ? 's' : ''}</Text>
                </View>
                <Icon name="plus" size={13} color={COLORS.primary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <TouchableOpacity style={apm.cancelBtn} onPress={close}>
          <Text style={apm.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const apm = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  headerRow: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    marginBottom: 4,
  },
  createIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Explicit size on the gradient (not overflow clip on the wrapper) avoids iOS
  // half-rendering the native gradient layer in a 44×44 rounded view.
  createIconGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  createText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyHint: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 14,
    paddingVertical: 24,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  plCover: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  plCoverPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  plCount: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 1,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.07)',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});