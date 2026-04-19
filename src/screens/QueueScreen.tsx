import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import TrackPlayer, { Track, useActiveTrack } from 'react-native-track-player';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { styles as sh } from '../styles';
import ScreenWithMiniPlayer from '../components/ScreenWithMiniPlayer';
import BackSwipeContainer from '../components/BackSwipeContainer';
import type { RootStackParamList } from '../navigation/types';
import {
  hapticDragStart,
  hapticLight,
  hapticMedium,
  hapticSeekComplete,
  hapticSelection,
  hapticWarning,
} from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Queue'>;

const ITEM_H = 72;

export default function QueueScreen({ navigation }: Props) {
  const [queue, setQueue] = useState<Track[]>([]);
  const activeTrack = useActiveTrack();
  const insets = useSafeAreaInsets();

  // Drag refs — mutated directly inside touch handlers to avoid stale closures
  const fromRef = useRef<number | null>(null);
  const hoverRef = useRef<number | null>(null);
  const cloneYAnim = useRef(new Animated.Value(0)).current;
  const listPageYRef = useRef(0);
  const scrollYRef = useRef(0);
  const queueRef = useRef<Track[]>([]);
  const scrollContainerRef = useRef<View>(null);

  // State just for triggering re-renders during drag
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragHover, setDragHover] = useState<number | null>(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);

  const loadQueue = useCallback(async () => {
    const q = await TrackPlayer.getQueue();
    setQueue(q);
    queueRef.current = q;
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // Measure list top position on mount (stable — list doesn't move)
  useEffect(() => {
    const t = setTimeout(() => {
      scrollContainerRef.current?.measureInWindow((_, y) => {
        listPageYRef.current = y;
      });
    }, 150);
    return () => clearTimeout(t);
  }, []);

  // ── Touch handlers attached to each drag handle ─────────────

  const onHandleGrant = useCallback(
    (index: number) => (e: GestureResponderEvent) => {
      hapticDragStart();
      // Refresh list position on each drag start
      scrollContainerRef.current?.measureInWindow((_, y) => {
        listPageYRef.current = y;
      });
      fromRef.current = index;
      hoverRef.current = index;
      cloneYAnim.setValue(e.nativeEvent.pageY - ITEM_H / 2);
      setDragFrom(index);
      setDragHover(index);
    },
    [cloneYAnim],
  );

  const onHandleMove = useCallback(
    (e: GestureResponderEvent) => {
      if (fromRef.current === null) return;
      cloneYAnim.setValue(e.nativeEvent.pageY - ITEM_H / 2);
      const relY =
        e.nativeEvent.pageY - listPageYRef.current + scrollYRef.current;
      const hover = Math.max(
        0,
        Math.min(
          Math.round(relY / ITEM_H - 0.5),
          queueRef.current.length - 1,
        ),
      );
      if (hover !== hoverRef.current) {
        hoverRef.current = hover;
        hapticSelection();
        setDragHover(hover);
      }
    },
    [cloneYAnim],
  );

  const onHandleRelease = useCallback(async () => {
    const from = fromRef.current;
    const to = hoverRef.current;
    fromRef.current = null;
    hoverRef.current = null;
    setDragFrom(null);
    setDragHover(null);

    if (from === null || to === null || from === to) return;

    const newQueue = [...queueRef.current];
    const [moved] = newQueue.splice(from, 1);
    newQueue.splice(to, 0, moved);
    queueRef.current = newQueue;
    setQueue(newQueue);

    try {
      await TrackPlayer.move(from, to);
      hapticSeekComplete();
    } catch {
      loadQueue();
    }
  }, [loadQueue]);

  // ── Play a track from the queue ──────────────────────────────

  const playTrack = useCallback(async (index: number) => {
    if (isDraggingRef.current) return;
    hapticMedium();
    try {
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
    } catch {
      // skip failed — track may no longer exist
    }
  }, []);

  // Ref so playTrack can read it without stale closure
  const isDraggingRef = useRef(false);

  useEffect(() => {
    isDraggingRef.current = dragFrom !== null;
  }, [dragFrom]);

  // ── Remove a single track ────────────────────────────────────

  const removeTrack = async (index: number) => {
    try {
      await TrackPlayer.remove(index);
      setQueue(q => q.filter((_, i) => i !== index));
    } catch {
      setTimeout(() => Alert.alert('Error', 'Could not remove track.'), 0);
    }
  };

  // ── Clear entire queue ───────────────────────────────────────

  const clearQueue = () => {
    hapticWarning();
    setTimeout(() => {
      Alert.alert('Clear queue', 'Remove all tracks from the queue?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              hapticWarning();
              await TrackPlayer.reset();
              setQueue([]);
              queueRef.current = [];
            } catch {
              setTimeout(() => Alert.alert('Error', 'Could not clear queue.'), 0);
            }
          },
        },
      ]);
    }, 0);
  };

  // ── Render ───────────────────────────────────────────────────

  const isDragging = dragFrom !== null;

  return (
    <ScreenWithMiniPlayer>
      <BackSwipeContainer edgeWidth={14} onBack={() => navigation.goBack()}>
      <View style={sh.container}>

        {/* Header */}
        <View style={qs.header}>
          <View style={sh.headerRow}>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                navigation.goBack();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back">
              <Icon name="arrow-left" size={20} color="#444" />
            </TouchableOpacity>
            <Text style={sh.nowPlayingTitle}>Queue</Text>
            <View style={qs.headerActions}>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  void loadQueue();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Icon name="sync-alt" size={15} color={COLORS.textLight} />
              </TouchableOpacity>
              {queue.length > 0 && (
                <TouchableOpacity
                  onPress={clearQueue}
                  style={{ marginLeft: 16 }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Icon name="trash-alt" size={15} color="rgba(220,60,60,0.7)" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={qs.count}>{queue.length} tracks</Text>
        </View>

        {/* List */}
        <ScrollView
          scrollEnabled={!isDragging}
          onScroll={e => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 96,
          }}>

          <View
            ref={scrollContainerRef}
            style={qs.listWrapper}>

            {queue.length === 0 ? (
              <View style={qs.emptyWrap}>
                <Icon name="list-ul" size={40} color={COLORS.border} />
                <Text style={qs.emptyText}>Queue is empty</Text>
                <Text style={qs.emptyHint}>
                  Search YouTube and add tracks to build your queue.
                </Text>
              </View>
            ) : (
              queue.map((item, index) => {
                const isActive = item.id === activeTrack?.id;
                const isGhost = index === dragFrom;
                const isTarget =
                  isDragging && index === dragHover && index !== dragFrom;

                return (
                  <View
                    key={String(index)}
                    style={[
                      qs.item,
                      isActive && qs.itemPlaying,
                      isGhost && qs.itemGhost,
                      isTarget && qs.itemTarget,
                    ]}>

                    {/* Drag handle */}
                    <View
                      style={qs.handle}
                      onStartShouldSetResponder={() => true}
                      onMoveShouldSetResponder={() => true}
                      onResponderGrant={onHandleGrant(index)}
                      onResponderMove={onHandleMove}
                      onResponderRelease={onHandleRelease}
                      onResponderTerminate={onHandleRelease}>
                      <Icon
                        name="grip-lines"
                        size={17}
                        color={COLORS.textLight}
                      />
                    </View>

                    {/* Tappable area: badge + artwork + text */}
                    <TouchableOpacity
                      style={qs.tappable}
                      activeOpacity={0.65}
                      onPress={() => playTrack(index)}>
                      <Text style={[qs.indexBadge, isActive && qs.indexBadgeActive]}>
                        {isActive ? '▶' : String(index + 1)}
                      </Text>

                      {item.artwork ? (
                        <Image
                          source={{ uri: item.artwork as string }}
                          style={qs.thumb}
                        />
                      ) : (
                        <View style={[qs.thumb, qs.thumbPlaceholder]}>
                          <Icon name="music" size={16} color={COLORS.border} />
                        </View>
                      )}

                      <View style={qs.textBlock}>
                        <Text
                          style={[qs.title, isActive && qs.titleActive]}
                          numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={qs.artist} numberOfLines={1}>
                          {String(item.artist ?? '')}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Right action */}
                    {isActive ? (
                      <Icon
                        name="volume-up"
                        size={14}
                        color={COLORS.playing}
                        style={qs.rightIcon}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => removeTrack(index)}
                        style={qs.removeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon
                          name="times"
                          size={13}
                          color="rgba(128,128,128,0.55)"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Floating drag clone — follows the finger */}
        {isDragging && dragFrom !== null && queue[dragFrom] && (
          <Animated.View
            pointerEvents="none"
            style={[qs.clone, { transform: [{ translateY: cloneYAnim }] }]}>
            <Icon
              name="grip-lines"
              size={17}
              color={COLORS.primary}
              style={{ marginRight: 8 }}
            />
            {queue[dragFrom].artwork ? (
              <Image
                source={{ uri: queue[dragFrom].artwork as string }}
                style={qs.thumb}
              />
            ) : (
              <View style={[qs.thumb, qs.thumbPlaceholder]}>
                <Icon name="music" size={16} color={COLORS.border} />
              </View>
            )}
            <View style={qs.textBlock}>
              <Text style={qs.title} numberOfLines={1}>
                {queue[dragFrom].title}
              </Text>
              <Text style={qs.artist} numberOfLines={1}>
                {String(queue[dragFrom].artist ?? '')}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
      </BackSwipeContainer>
    </ScreenWithMiniPlayer>
  );
}

const qs = StyleSheet.create({
  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    // Match `screenContainer` top padding (24) on iOS; Queue doesn’t use that wrapper
    paddingTop: Platform.select({ ios: 24, default: 15 }),
    paddingBottom: 6,
    marginTop: 15,
    marginHorizontal: 16,
    zIndex: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 2,
  },
  listWrapper: {
    paddingTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 19,
  },
  item: {
    height: ITEM_H,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 8,
    paddingRight: 12,

  },
  itemPlaying: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.playing,
    backgroundColor: '#eef8ff',
  },
  itemGhost: {
    opacity: 0.22,
  },
  itemTarget: {
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    marginTop: -2,
  },
  handle: {
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  indexBadge: {
    width: 22,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'right',
    marginRight: 10,
  },
  indexBadgeActive: {
    color: COLORS.playing,
    fontSize: 10,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: COLORS.border,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tappable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  textBlock: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  titleActive: {
    color: COLORS.playing,
  },
  artist: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  rightIcon: {
    marginLeft: 4,
  },
  removeBtn: {
    padding: 4,
  },
  clone: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: ITEM_H,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingRight: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(82,50,193,0.18)',
  },
});
