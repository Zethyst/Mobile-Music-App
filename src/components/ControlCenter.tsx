import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  DeviceEventEmitter,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import TrackPlayer, {
  useActiveTrack,
  usePlaybackState,
  State,
} from 'react-native-track-player';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { styles } from '../styles';
import { COLORS } from '../constants';
import type { RootStackParamList } from '../navigation/types';
import {
  hapticHeavy,
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from '../utils/haptics';
import {
  DOWNLOAD_PROGRESS_EVENT,
  DOWNLOAD_SAVED_BANNER_EVENT,
  downloadTrackToDevice,
  getDownloads,
  isTrackAvailableOffline,
  isYoutubeStyleTrackId,
} from '../services/downloadService';

/** Shared neumorphic gradient colours matching the CSS spec */
const NEUMORPH_GRADIENT: string[] = ['#cacaca', '#f8f4fc'];
const NEUMORPH_ANGLE = { x: 0.15, y: 0 };        // ≈ 145 deg start
const NEUMORPH_ANGLE_END = { x: 0.85, y: 1 };    // ≈ 145 deg end

/** Same as SongSlider muted (unplayed) / vivid (progress) track fills */
const SLIDER_MUTED_GRADIENT = ['#5232c155', '#12ccd055'] as const;
const SLIDER_VIVID_GRADIENT = ['#5232c1', '#12ccd0'] as const;
const SLIDER_MUTED_GRADIENT_H = { start: { x: 0, y: 0.5 } as const, end: { x: 1, y: 0.5 } as const };

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ControlCenter() {
  const navigation = useNavigation<NavProp>();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const [downloadedYouTubeIds, setDownloadedYouTubeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [downloadBusy, setDownloadBusy] = useState(false);

  const refreshDownloadedIds = useCallback(async () => {
    const list = await getDownloads();
    setDownloadedYouTubeIds(new Set(list.map(t => t.videoId)));
  }, []);

  useEffect(() => {
    void refreshDownloadedIds();
  }, [refreshDownloadedIds]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      DOWNLOAD_PROGRESS_EVENT,
      (p: { percent: number }) => {
        if (p.percent === 100) void refreshDownloadedIds();
      },
    );
    return () => sub.remove();
  }, [refreshDownloadedIds]);

  const isOffline = isTrackAvailableOffline(activeTrack, downloadedYouTubeIds);
  /** Muted = already on device or not downloadable; vivid = YouTube stream that can be saved. */
  const useVividDownloadBg =
    downloadBusy || (!isOffline && isYoutubeStyleTrackId(activeTrack?.id ?? null));
  const downloadGradientColors = useVividDownloadBg
    ? SLIDER_VIVID_GRADIENT
    : SLIDER_MUTED_GRADIENT;

  const handleDownloadPress = useCallback(async () => {
    hapticLight();
    if (isOffline) {
      return;
    }
    if (!activeTrack?.id) return;
    if (!isYoutubeStyleTrackId(activeTrack.id)) {
      Alert.alert(
        'Not available to download',
        'Only songs from Search can be saved from here when streaming.',
      );
      return;
    }
    if (downloadBusy) return;
    setDownloadBusy(true);
    const art = activeTrack.artwork;
    const thumb =
      typeof art === 'string'
        ? art
        : art != null && typeof art === 'object' && 'uri' in art
          ? String((art as { uri: string }).uri)
          : '';
    try {
      await downloadTrackToDevice({
        videoId: String(activeTrack.id),
        title: activeTrack.title ?? 'Unknown',
        artist: activeTrack.artist ?? 'Unknown',
        thumbnail: thumb,
        duration: typeof activeTrack.duration === 'number' ? activeTrack.duration : null,
      });
      hapticSuccess();
      void refreshDownloadedIds();
      DeviceEventEmitter.emit(DOWNLOAD_SAVED_BANNER_EVENT);
    } catch (e) {
      const isFormatError = e instanceof Error && e.message === 'FORMAT_UNAVAILABLE';
      setTimeout(
        () =>
          Alert.alert(
            'Download failed',
            isFormatError
              ? 'This track is not available for download.'
              : 'Could not save the file. Try again.',
          ),
        0,
      );
    } finally {
      setDownloadBusy(false);
    }
  }, [activeTrack, downloadBusy, isOffline, refreshDownloadedIds]);

  const skipToNext = async () => {
    hapticMedium();
    await TrackPlayer.skipToNext();
  };
  const skipToPrevious = async () => {
    hapticMedium();
    await TrackPlayer.skipToPrevious();
  };

  const togglePlayback = async () => {
    const currentTrack = await TrackPlayer.getActiveTrackIndex();
    if (currentTrack === null || currentTrack === undefined) return;
    hapticHeavy();
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  return (
    <View style={styles.controlsRow}>
      {/* Queue */}
      <TouchableOpacity
        style={styles.iconBtn}
        activeOpacity={0.7}
        onPress={() => {
          hapticLight();
          navigation.navigate('Queue');
        }}
        accessibilityRole="button"
        accessibilityLabel="Open queue">
        <Icon name="list-ul" size={20} color="rgba(128,128,128,0.6)" />
      </TouchableOpacity>

      {/* Previous */}
      <TouchableOpacity onPress={skipToPrevious} activeOpacity={0.75}>
        <LinearGradient
          colors={NEUMORPH_GRADIENT}
          start={NEUMORPH_ANGLE}
          end={NEUMORPH_ANGLE_END}
          style={cc.prevNext}>
          <Icon name="step-backward" size={20} color="#50515395" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Play / Pause */}
      <TouchableOpacity onPress={togglePlayback} activeOpacity={0.8}>
        <LinearGradient
          colors={NEUMORPH_GRADIENT}
          start={NEUMORPH_ANGLE}
          end={NEUMORPH_ANGLE_END}
          style={cc.playPause}>
          {/* Gradient icon: two absolutely-positioned icons stacked & blended */}
          <View style={cc.playIconWrapper}>
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={30}
              color={COLORS.primary}
              style={[cc.centeredIcon, !isPlaying && { marginLeft: 3 }]}
            />
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={30}
              color={COLORS.secondary}
              style={[cc.centeredIcon, cc.iconOverlay, !isPlaying && { marginLeft: 3 }]}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Next */}
      <TouchableOpacity onPress={skipToNext} activeOpacity={0.75}>
        <LinearGradient
          colors={NEUMORPH_GRADIENT}
          start={NEUMORPH_ANGLE}
          end={NEUMORPH_ANGLE_END}
          style={cc.prevNext}>
          <Icon name="step-forward" size={20} color="#50515395" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Download: vivid = can save; muted = already on device or not available from here */}
      <TouchableOpacity
        style={styles.iconBtn}
        activeOpacity={0.7}
        disabled={downloadBusy}
        onPress={() => void handleDownloadPress()}
        accessibilityRole="button"
        accessibilityLabel={
          isOffline
            ? 'Already on this device'
            : useVividDownloadBg
              ? 'Download the current track'
              : 'Download not available for this track'
        }>
        <LinearGradient
          colors={[...downloadGradientColors]}
          {...SLIDER_MUTED_GRADIENT_H}
          style={cc.downloadCircle}>
          {downloadBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="long-arrow-alt-down" size={16} color="#fff" />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const cc = StyleSheet.create({
  downloadCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevNext: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    // neumorphic dual shadow: dark bottom-right, white top-left
    shadowColor: '#aaaaaa',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  playPause: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#aaaaaa',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 13,
    elevation: 8,
  },
  playIconWrapper: {
    width: 36,
    height: 36,
  },
  /** Both icons are absolutely centered in the wrapper so they stack precisely */
  centeredIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    lineHeight: 36,
  },
  /** Semi-transparent teal blends with the primary purple below */
  iconOverlay: {
    opacity: 0.55,
  },
});
