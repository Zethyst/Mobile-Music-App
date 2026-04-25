import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import TrackPlayer, { useActiveTrack } from 'react-native-track-player';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, DEFAULT_COVER_URI } from '../constants';
import { styles } from '../styles';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';
import BackSwipeContainer from '../components/BackSwipeContainer';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { usePlaylists } from '../contexts/PlaylistContext';
import { getStreamUrl } from '../services/streamService';
import { refreshStreamUrlInPlaylists, type PlaylistTrack } from '../services/playlistService';
import type { RootStackParamList } from '../navigation/types';
import { hapticLight, hapticMedium, hapticWarning } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaylistDetail'>;

export default function PlaylistDetailScreen({ route, navigation }: Props) {
  const { playlistId } = route.params;
  const { playlists, update, remove, removeTrack } = usePlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  const activeTrack = useActiveTrack();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  if (!playlist) {
    return (
      <ScreenWithMiniPlayer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.textLight }}>Playlist not found.</Text>
        </View>
      </ScreenWithMiniPlayer>
    );
  }

  const handlePlay = async (track: PlaylistTrack, startIndex: number) => {
    hapticMedium();
    setLoadingId(track.videoId);
    try {
      let streamUrl = track.streamUrl;
      let streamHeaders = track.streamHeaders;

      // Try cached URL first, fall back to fresh resolve
      if (!streamUrl) {
        const stream = await getStreamUrl(track.videoId);
        if (!stream) throw new Error('No stream');
        streamUrl = stream.url;
        streamHeaders = stream.headers as Record<string, string>;
        // Refresh cache for next time
        void refreshStreamUrlInPlaylists(track.videoId, streamUrl, streamHeaders);
      }

      // Build queue from this track onwards (remaining playlist)
      const remaining = playlist.tracks.slice(startIndex);
      await TrackPlayer.reset();
      for (const t of remaining) {
        let url = t.streamUrl;
        if (!url && t.videoId === track.videoId) url = streamUrl;
        if (!url) continue; // skip tracks without cached url (they'll error anyway)
        await TrackPlayer.add({
          id:       t.videoId,
          url,
          headers:  t.streamHeaders ?? streamHeaders,
          title:    t.title,
          artist:   t.artist,
          artwork:  t.thumbnail || DEFAULT_COVER_URI,
          duration: t.duration ?? 0,
        });
      }
      await TrackPlayer.play();
    } catch {
      // Stream URL may have expired — refresh it
      try {
        const stream = await getStreamUrl(track.videoId, true); // bust cache
        if (!stream) throw new Error('No stream after bust');
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id:       track.videoId,
          url:      stream.url,
          headers:  stream.headers,
          title:    track.title,
          artist:   track.artist,
          artwork:  track.thumbnail || DEFAULT_COVER_URI,
          duration: track.duration ?? 0,
        });
        await TrackPlayer.play();
        void refreshStreamUrlInPlaylists(track.videoId, stream.url, stream.headers as Record<string, string>);
      } catch {
        setTimeout(() => Alert.alert('Playback error', 'Could not load this track. Try again.'), 0);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handlePlayAll = () => {
    if (playlist.tracks.length === 0) return;
    void handlePlay(playlist.tracks[0], 0);
  };

  const handleRemoveTrack = (track: PlaylistTrack) => {
    hapticWarning();
    Alert.alert('Remove from playlist', `Remove "${track.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void removeTrack(playlist.id, track.videoId),
      },
    ]);
  };

  const handleDeletePlaylist = () => {
    hapticWarning();
    Alert.alert('Delete playlist', `Delete "${playlist.name}"? Songs won't be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(playlist.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScreenWithMiniPlayer>
      <BackSwipeContainer onBack={() => navigation.goBack()}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.libraryStackScrollContent, { paddingBottom: 100 }]}>

          {/* Hero header */}
          <View style={pd.hero}>
            {playlist.coverUri ? (
              <ImageBackground
                source={{ uri: playlist.coverUri }}
                style={pd.heroBg}
                imageStyle={{ borderRadius: 0 }}>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.75)']}
                  style={pd.heroGrad} />
              </ImageBackground>
            ) : (
              <LinearGradient
                colors={[COLORS.primary + 'cc', '#12ccd0cc']}
                style={pd.heroBg} />
            )}

            {/* Back + options row */}
            <View style={pd.heroNav}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={pd.heroNavBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="arrow-left" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={pd.heroNavBtn}
                onPress={() => Alert.alert(playlist.name, '', [
                  { text: 'Edit playlist', onPress: () => setShowEdit(true) },
                  { text: 'Delete playlist', style: 'destructive', onPress: handleDeletePlaylist },
                  { text: 'Cancel', style: 'cancel' },
                ])}>
                <Icon name="ellipsis-v" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Playlist info */}
            <View style={pd.heroInfo}>
              <Text style={pd.heroName}>{playlist.name}</Text>
              {!!playlist.description && (
                <Text style={pd.heroDesc} numberOfLines={2}>{playlist.description}</Text>
              )}
              <Text style={pd.heroMeta}>{playlist.tracks.length} song{playlist.tracks.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          {/* Play all button */}
          {playlist.tracks.length > 0 && (
            <TouchableOpacity style={pd.playAllBtn} onPress={handlePlayAll} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary ?? '#12ccd0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={pd.playAllGrad}>
                <Icon name="play" size={13} color="#fff" />
                <Text style={pd.playAllText}>Play all</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Tracks */}
          <View style={[styles.screenContainer, { paddingTop: 8 }]}>
            {playlist.tracks.length === 0 ? (
              <View style={pd.emptyWrap}>
                <Icon name="music" size={40} color="rgba(108,92,231,0.2)" />
                <Text style={pd.emptyTitle}>No songs yet</Text>
                <Text style={pd.emptyHint}>Add songs from Search or Downloads using the ⋮ menu.</Text>
              </View>
            ) : (
              <View style={styles.trackList}>
                {playlist.tracks.map((track, index) => {
                  const isPlaying = activeTrack?.id === track.videoId;
                  const isLoading = loadingId === track.videoId;
                  return (
                    <View key={track.videoId} style={pd.trackRow}>
                      <TouchableOpacity
                        style={pd.trackTap}
                        onPress={() => void handlePlay(track, index)}
                        activeOpacity={0.75}
                        disabled={isLoading}>
                        <Image
                          source={{ uri: track.thumbnail || DEFAULT_COVER_URI }}
                          style={styles.trackThumb}
                        />
                        <View style={styles.trackInfo}>
                          <Text
                            style={[styles.trackTitle, isPlaying && styles.trackTitlePlaying]}
                            numberOfLines={1}>
                            {track.title}
                          </Text>
                          <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={pd.trackActions}>
                        {isLoading ? (
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : isPlaying ? (
                          <Icon name="volume-up" size={14} color={COLORS.playing ?? COLORS.primary} />
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleRemoveTrack(track)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Icon name="trash-alt" size={15} color="rgba(200,60,60,0.7)" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </BackSwipeContainer>

      <CreatePlaylistModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={async (data) => { await update(playlist.id, data); setShowEdit(false); }}
        editingPlaylist={playlist}
      />
    </ScreenWithMiniPlayer>
  );
}

const pd = StyleSheet.create({
  hero: {
    height: 220,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroBg: {
    ...StyleSheet.absoluteFill,
  },
  heroGrad: {
    ...StyleSheet.absoluteFill,
  },
  heroNav: {
    position: 'absolute',
    top: 26,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    padding: 20,
    paddingBottom: 18,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  heroMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
    fontWeight: '600',
  },
  // Rounded clip on the gradient (not on TouchableOpacity) avoids iOS clipping
  // the native LinearGradient view when the parent has overflow: 'hidden'.
  playAllBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  playAllGrad: {
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  playAllText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  trackTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  trackActions: {
    paddingLeft: 12,
    paddingRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
});