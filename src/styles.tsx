import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from './constants';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 15,
  },

  /** Fills ScrollView viewport so `space-between` can spread the three player blocks */
  playerScrollContent: {
    flexGrow: 1,
  },
  /** Library-style stack screens: same horizontal inset as `screenContainer` only (no extra top pad). */
  libraryStackScrollContent: {
    flexGrow: 1,
    paddingBottom: 96,
  },
  playerScreenLayout: {
    flex: 1,
    justifyContent: 'space-between',
  },
  playerArtworkSongBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    paddingVertical: 8,
    transform: [{ translateY: -14 }],
  },
  playerControlsBlock: {
    width: '100%',
    alignItems: 'stretch',
    gap: 12,
    transform: [{ translateY: -14 }],
  },

  // ── Cards ─────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 6,
  },

  // ── Header ────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  headerIcon: {
    fontSize: 22,
    color: COLORS.text,
  },
  nowPlayingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    flex: 1,
  },

  // ── Artwork ───────────────────────────────────────────────
  artworkContainer: {
    alignItems: 'center',
  },
  artwork: {
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: (width * 0.72) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },

  // ── Song Info ─────────────────────────────────────────────
  songDetailsContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
  songArtist: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Progress ──────────────────────────────────────────────
  progressContainer: {
    marginBottom: 0,
  },
  sliderStyle: {
    width: '100%',
    height: 30,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 4,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },

  // ── Controls ─────────────────────────────────────────────
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iconBtn: {
    padding: 6,
  },
  neumorphBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#aaaaaa',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  playPauseBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#aaaaaa',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 13,
    elevation: 6,
  },

  // ── Lyrics toggle ─────────────────────────────────────────
  lyricsToggleContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  lyricsToggleText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // ── Library: Artist banner carousel ───────────────────────
  bannerCarouselOuter: {
    alignSelf: 'stretch',
    marginBottom: 18,
  },
  bannerCarouselViewport: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    height: 120,
  },
  bannerCarouselSlide: {
    height: 120,
    justifyContent: 'flex-end',
  },
  bannerCarouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  bannerCarouselDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#b8b8b8',
    backgroundColor: 'transparent',
  },
  bannerCarouselDotActive: {
    backgroundColor: '#b8b8b8',
  },
  bannerCarouselTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    paddingLeft: 4,
  },
  bannerCarouselListeners: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    paddingLeft: 4,
  },
  bannerContainer: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    height: 130,
    marginBottom: 18,
    backgroundColor: '#111',
    justifyContent: 'flex-end',
  },
  bannerImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerContent: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    height: '100%',
  },
  bannerTextBlock: {
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  bannerArtist: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  bannerArtistSpotlight: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  bannerListeners: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  bannerListenersSpotlight: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  followBtnSpotlight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  followBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Library: Section Header ───────────────────────────────
  sectionHeader: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.textLight,
  },

  // ── Albums ────────────────────────────────────────────────
  albumsRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  albumCard: {
    flex: 1,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    justifyContent: 'flex-end',
  },
  albumCoverImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  albumOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  /** Solid footer layout (no blur); prefer `albumFooterBlur*` + `AlbumCardFooterBlur`. */
  albumFooter: {

  },
  albumFooterBlurWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  albumFooterBlurInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  albumTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  albumArtist: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  albumPlayIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    gap: 12,
    width: '100%',
  },
  albumGridCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  albumGridCardActive: {
    opacity: 0.95,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  albumGridCover: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },

  // ── Lyrics screen ────────────────────────────────────────
  lyricsScreenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  lyricsScreenArtist: {
    fontSize: 15,
    color: '#888',
    marginTop: 6,
    fontWeight: '600',
  },
  lyricsBody: {
    fontSize: 16,
    lineHeight: 26,
    color: COLORS.text,
    fontFamily: 'System',
  },

  // ── Track List ────────────────────────────────────────────
  trackList: {
    marginTop: 4,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trackItemPlaying: {
    backgroundColor: '#f6edff',
  },
  trackThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  trackTitlePlaying: {
    color: COLORS.playing,
  },
  trackArtist: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    paddingLeft: 4,
  },
  trackDuration: {
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 8,
  },
  trackPlayingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(82,50,193,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Small Player Bar ──────────────────────────────────────
  miniPlayerContainer: {
    margin: 16,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  miniThumb: {
    width: 44,
    height: 44,
    borderRadius: 13,
    marginRight: 10,
  },
  miniInfo: {
    flex: 1,
  },
  miniTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  miniArtist: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 1,
  },
  miniControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};