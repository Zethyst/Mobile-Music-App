import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../constants';
import { styles } from '../styles';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';
import BackSwipeContainer from '../components/BackSwipeContainer';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { usePlaylists } from '../contexts/PlaylistContext';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium, hapticWarning } from '../utils/haptics';
import type { Playlist } from '../services/playlistService';

type Props = NativeStackScreenProps<RootStackParamList, 'Playlists'>;

const NEUMORPH_GRADIENT: string[] = ['#cacaca', '#f8f4fc'];

export default function PlaylistsScreen({ navigation }: Props) {
  const { playlists, createNew, update, remove } = usePlaylists();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const handleCreate = async (data: { name: string; description?: string; coverUri?: string }) => {
    await createNew(data);
    hapticMedium();
  };

  const handleEdit = async (data: { name: string; description?: string; coverUri?: string }) => {
    if (!editingPlaylist) return;
    await update(editingPlaylist.id, data);
    setEditingPlaylist(null);
  };

  const handleLongPress = (pl: Playlist) => {
    hapticWarning();
    Alert.alert(pl.name, 'What would you like to do?', [
      {
        text: 'Edit',
        onPress: () => { setEditingPlaylist(pl); setShowCreate(true); },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete playlist', `Remove "${pl.name}"? Songs inside won't be deleted.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void remove(pl.id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScreenWithMiniPlayer>
      <BackSwipeContainer onBack={() => navigation.goBack()}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.libraryStackScrollContent}>
          <View style={styles.screenContainer}>

            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="arrow-left" size={20} color="#444" />
              </TouchableOpacity>
              <Text style={styles.nowPlayingTitle}>Playlists</Text>
              <TouchableOpacity
                onPress={() => { hapticLight(); setEditingPlaylist(null); setShowCreate(true); }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="plus" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Playlist grid */}
            {playlists.length === 0 ? (
              <View style={ps.emptyWrap}>
                <Icon name="music" size={44} color="rgba(108,92,231,0.2)" />
                <Text style={ps.emptyTitle}>No playlists yet</Text>
                <Text style={ps.emptyHint}>Create one and add songs from Search or Downloads.</Text>
                <TouchableOpacity
                  style={ps.createEmptyBtn}
                  onPress={() => { hapticLight(); setShowCreate(true); }}
                  activeOpacity={0.85}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.secondary ?? '#12ccd0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={ps.createEmptyGrad}>
                    <Icon name="plus" size={14} color="#fff" />
                    <Text style={ps.createEmptyText}>Create Playlist</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={ps.grid}>
                {playlists.map((pl: Playlist) => (
                  <TouchableOpacity
                    key={pl.id}
                    style={ps.card}
                    activeOpacity={0.82}
                    onPress={() => { hapticLight(); navigation.navigate('PlaylistDetail', { playlistId: pl.id }); }}
                    onLongPress={() => handleLongPress(pl)}>
                    {pl.coverUri ? (
                      <Image source={{ uri: pl.coverUri }} style={ps.cardCover} />
                    ) : (
                      <LinearGradient
                        colors={['#e8e0f8', '#c5b5f0']}
                        style={ps.cardCoverPlaceholder}>
                        <Icon name="music" size={28} color={COLORS.primary} />
                      </LinearGradient>
                    )}
                    <View style={ps.cardFooter}>
                      <Text style={ps.cardName} numberOfLines={1}>{pl.name}</Text>
                      <Text style={ps.cardCount}>{pl.tracks.length} songs</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </View>
        </ScrollView>
      </BackSwipeContainer>

      <CreatePlaylistModal
        visible={showCreate}
        onClose={() => { setShowCreate(false); setEditingPlaylist(null); }}
        onSave={editingPlaylist ? handleEdit : handleCreate}
        editingPlaylist={editingPlaylist}
      />
    </ScreenWithMiniPlayer>
  );
}

const ps = StyleSheet.create({
  emptyWrap: {
    alignItems: 'center',
    marginTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  createEmptyBtn: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  createEmptyGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  createEmptyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47.5%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f5f3ff',
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCover: {
    width: '100%',
    aspectRatio: 1,
  },
  cardCoverPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    padding: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  cardCount: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
});