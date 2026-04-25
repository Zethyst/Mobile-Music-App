import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  DeviceEventEmitter,
} from 'react-native';
import TrackPlayer from 'react-native-track-player';
import Icon from 'react-native-vector-icons/FontAwesome5';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, DEFAULT_COVER_URI } from '../constants';
import { styles as sh } from '../styles';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';
import StreamRecoveryBanner from '../components/StreamRecoveryBanner';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import {
  getDownloads,
  deleteDownload,
  DOWNLOAD_PROGRESS_EVENT,
  type DownloadedTrack,
} from '../services/downloadService';
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from '../utils/haptics';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { usePlaylists } from '../contexts/PlaylistContext';
import type { PlaylistTrack } from '../services/playlistService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Downloads'>,
  NativeStackScreenProps<RootStackParamList>
>;

const formatDuration = (secs: number) => {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function DownloadsScreen(_: Props) {
  const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const { addTrack, createNew } = usePlaylists();
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<DownloadedTrack | null>(null);
  const [showCreateForDl, setShowCreateForDl] = useState(false);
  /** Long-press on a row’s action strip reveals add-to-playlist + delete. */
  const [actionsOpenForId, setActionsOpenForId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDownloads();
      setDownloads(data);
    } catch {
      setError('Could not load downloads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      DOWNLOAD_PROGRESS_EVENT,
      (e: { videoId: string; percent: number }) => {
        setDownloadProgress(prev => {
          const next = { ...prev, [e.videoId]: e.percent };
          if (e.percent >= 100) {
            const { [e.videoId]: _, ...rest } = next;
            setTimeout(() => void load(), 300);
            return rest;
          }
          return next;
        });
      },
    );
    return () => sub.remove();
  }, [load]);

  const handlePlay = async (track: DownloadedTrack) => {
    hapticMedium();
    setPlayingId(track.videoId);
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: track.videoId,
        url: track.localUri,
        title: track.title,
        artist: track.artist,
        artwork: track.thumbnail || DEFAULT_COVER_URI,
        duration: track.duration,
      });
      await TrackPlayer.play();
    } catch {
      setTimeout(() => Alert.alert('Playback error', 'Could not play this track.'), 0);
      setPlayingId(null);
    }
  };

  const handleDelete = (track: DownloadedTrack) => {
    hapticWarning();
    setTimeout(() =>
      Alert.alert('Delete download', `Remove "${track.title}" from downloads?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(track.videoId);
            try {
              const ok = await deleteDownload(track.videoId);
              if (ok) {
                hapticLight();
                setDownloads(prev => prev.filter(d => d.videoId !== track.videoId));
                if (playingId === track.videoId) setPlayingId(null);
              } else {
                setTimeout(() => Alert.alert('Error', 'Could not delete the track.'), 0);
              }
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]),
      0);
  };

  return (
    <ScreenWithMiniPlayer>
      <View style={ds.root}>
        <ScrollView
          style={sh.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={sh.libraryStackScrollContent}>
          <View style={sh.screenContainer}>

            <View style={sh.headerRow}>
              <Icon name="cloud-download-alt" size={22} color={COLORS.primary} />
              <Text style={sh.nowPlayingTitle}>Downloads</Text>
              <TouchableOpacity
                onPress={() => { hapticLight(); load(); }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="sync-alt" size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} size="large" />
            ) : error ? (
              <View style={ds.emptyWrap}>
                <Icon name="exclamation-circle" size={40} color={COLORS.textLight} />
                <Text style={ds.emptyTitle}>Something went wrong</Text>
                <Text style={ds.emptyHint}>{error}</Text>
                <TouchableOpacity style={ds.retryBtn} onPress={load}>
                  <Text style={ds.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : downloads.length === 0 ? (
              <View style={ds.emptyWrap}>
                <Icon name="cloud-download-alt" size={48} color={COLORS.border} />
                <Text style={ds.emptyTitle}>No downloads yet</Text>
                <Text style={ds.emptyHint}>
                  Search for a song, tap ⋮ on a result → Download. Files are saved on this device.
                </Text>
              </View>
            ) : (
              <View style={sh.trackList}>
                {downloads.map(track => {
                  const isPlaying = playingId === track.videoId;
                  const isDeleting = deletingId === track.videoId;
                  const pct = downloadProgress[track.videoId];
                  return (
                    <View
                      key={track.videoId}
                      style={[ds.trackCell, isPlaying && sh.trackItemPlaying]}>
                      <View style={[sh.trackItem, { borderBottomWidth: 0, paddingBottom: pct !== undefined && pct < 100 ? 6 : 14 }]}>
                        <TouchableOpacity
                          style={ds.mainTap}
                          onPress={() => handlePlay(track)}
                          activeOpacity={0.75}>
                          <Image
                            source={{ uri: track.thumbnail || DEFAULT_COVER_URI }}
                            style={sh.trackThumb}
                          />
                          <View style={sh.trackInfo}>
                            <Text
                              style={[sh.trackTitle, isPlaying && sh.trackTitlePlaying]}
                              numberOfLines={1}>
                              {track.title}
                            </Text>
                            <Text style={sh.trackArtist} numberOfLines={1}>
                              {track.artist}
                            </Text>
                            {!!track.duration && (
                              <Text style={sh.trackArtist}>{formatDuration(track.duration)}</Text>
                            )}
                          </View>
                        </TouchableOpacity>

                        <View style={ds.actions}>
                          {isDeleting ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                          ) : actionsOpenForId === track.videoId ? (
                            <>
                              <TouchableOpacity
                                onPress={() => {
                                  hapticLight();
                                  setAddToPlaylistTrack(track);
                                  setActionsOpenForId(null);
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={{ marginRight: 14 }}>
                                <Icon name="list-ul" size={15} color={COLORS.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setActionsOpenForId(null);
                                  handleDelete(track);
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Icon name="trash-alt" size={15} color="rgba(200,60,60,0.7)" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <Pressable
                              onPress={() => {
                                hapticLight();
                                setActionsOpenForId(track.videoId);
                              }}
                              delayLongPress={300}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              accessibilityRole="button"
                              accessibilityLabel="More actions, long-press to show add to playlist and delete">
                              <View style={ds.actionLongPressTarget}>
                                <Icon name="ellipsis-v" size={15} color={COLORS.textLight} />
                              </View>
                            </Pressable>
                          )}
                        </View>
                      </View>

                      {pct !== undefined && pct < 100 && (
                        <View style={ds.progressTrack}>
                          <View
                            style={[
                              ds.progressFill,
                              { width: `${pct}%`, backgroundColor: COLORS.primary },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

          </View>
        </ScrollView>

        <StreamRecoveryBanner />
      </View>
      <AddToPlaylistModal
        visible={addToPlaylistTrack != null}
        onClose={() => setAddToPlaylistTrack(null)}
        trackTitle={addToPlaylistTrack?.title}
        onSelectPlaylist={async (playlistId) => {
          if (!addToPlaylistTrack) return;
          const track: Omit<PlaylistTrack, 'addedAt'> = {
            videoId: addToPlaylistTrack.videoId,
            title: addToPlaylistTrack.title,
            artist: addToPlaylistTrack.artist,
            thumbnail: addToPlaylistTrack.thumbnail,
            duration: addToPlaylistTrack.duration,
            // Downloaded tracks use local file URI — store it as streamUrl
            // so PlaylistDetailScreen can play it without network
            streamUrl: addToPlaylistTrack.localUri,
          };
          await addTrack(playlistId, track);
          hapticSuccess();
          setAddToPlaylistTrack(null);
          setTimeout(() => Alert.alert('Added', `"${addToPlaylistTrack.title}" added to playlist.`), 0);
        }}
        onCreateNew={() => {
          setAddToPlaylistTrack(null);
          setTimeout(() => setShowCreateForDl(true), 350);
        }}
      />

      <CreatePlaylistModal
        visible={showCreateForDl}
        onClose={() => setShowCreateForDl(false)}
        onSave={async (data) => {
          const pl = await createNew(data);
          setShowCreateForDl(false);
          if (addToPlaylistTrack) {
            await addTrack(pl.id, {
              videoId: addToPlaylistTrack.videoId,
              title: addToPlaylistTrack.title,
              artist: addToPlaylistTrack.artist,
              thumbnail: addToPlaylistTrack.thumbnail,
              duration: addToPlaylistTrack.duration,
              streamUrl: addToPlaylistTrack.localUri,
            });
            setAddToPlaylistTrack(null);
          }
        }}
      />
    </ScreenWithMiniPlayer>
  );
}

const ds = StyleSheet.create({
  root: {
    flex: 1,
  },
  trackCell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  mainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  actionLongPressTarget: {
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 4,
  },
  progressFill: {
    height: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 80,
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textLight,
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
