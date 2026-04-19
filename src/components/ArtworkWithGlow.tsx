import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { DEFAULT_COVER_URI } from '../constants';

const { width } = Dimensions.get('window');

const ARTWORK_SIZE = width * 0.72;
const PAD          = 64;                        // ambient glow beyond the disc
const CONTAINER    = ARTWORK_SIZE + PAD * 2;
const HALF         = CONTAINER / 2;
// Blobs are smaller than the canvas so their gradient fades out before
// reaching the canvas edge — no hard clip needed at all.
const BLOB         = CONTAINER * 0.70;
const BLOB_HALF    = BLOB / 2;
const MAX_TRAVEL   = HALF * 0.38;

// ─── Palette ─────────────────────────────────────────────────────────────────

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function hsl(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n), 8 - k(n), 1))));
  return `#${[f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function palette(key: string): [string, string, string] {
  const h = djb2(key) % 360;
  return [hsl(h, 72, 58), hsl((h + 137) % 360, 68, 62), hsl((h + 274) % 360, 70, 60)];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useOscillate(from: number, to: number, ms: number): Animated.Value {
  const v = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: to,   duration: ms, easing: ease, useNativeDriver: true }),
        Animated.timing(v, { toValue: from, duration: ms, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, from, to, ms]);
  return v;
}

// Radial-gradient blob: solid at center → fully transparent at edge
function Blob({ color }: { color: string }) {
  return (
    <Svg width={BLOB} height={BLOB}>
      <Defs>
        <RadialGradient id="rg" cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor={color} stopOpacity="0.75" />
          <Stop offset="40%"  stopColor={color} stopOpacity="0.35" />
          <Stop offset="75%"  stopColor={color} stopOpacity="0.10" />
          <Stop offset="100%" stopColor={color} stopOpacity="0"    />
        </RadialGradient>
      </Defs>
      <Circle cx={BLOB_HALF} cy={BLOB_HALF} r={BLOB_HALF} fill="url(#rg)" />
    </Svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  artworkUri:  string | undefined;
  imageRotate: Animated.AnimatedInterpolation<string>;
}

export default function ArtworkWithGlow({ artworkUri, imageRotate }: Props) {
  const uri          = artworkUri || DEFAULT_COVER_URI;
  const [c0, c1, c2] = useMemo(() => palette(uri), [uri]);

  const D = MAX_TRAVEL;

  // Five blobs with mutually prime durations → never perfectly in sync
  const b1x = useOscillate(-D,        D,        7300);
  const b1y = useOscillate(-D * 0.6,  D * 0.9,  5900);
  const b2x = useOscillate( D,       -D * 0.7,  6200);
  const b2y = useOscillate(-D * 0.5,  D,        8500);
  const b3x = useOscillate(-D * 0.4,  D * 0.8,  9100);
  const b3y = useOscillate( D,       -D,        6700);
  const b4x = useOscillate( D * 0.6, -D * 0.9,  5300);
  const b4y = useOscillate( D * 0.3, -D * 0.7,  7900);
  const b5x = useOscillate(-D * 0.8,  D * 0.5,  8200);
  const b5y = useOscillate(-D * 0.6,  D * 0.4,  5600);

  const blobStyle = (ox: number, oy: number, tx: Animated.Value, ty: Animated.Value) => ({
    position: 'absolute' as const,
    left: HALF - BLOB_HALF + ox,
    top:  HALF - BLOB_HALF + oy,
    transform: [{ translateX: tx }, { translateY: ty }],
  });

  return (
    <View style={ss.outer}>
      {/* Transparent canvas — blobs fade to transparent so the app bg shows */}
      <View style={ss.canvas}>
        <Animated.View style={blobStyle(-BLOB * 0.10, -BLOB * 0.12, b1x, b1y)}>
          <Blob color={c0} />
        </Animated.View>
        <Animated.View style={blobStyle( BLOB * 0.08,  BLOB * 0.08, b2x, b2y)}>
          <Blob color={c1} />
        </Animated.View>
        <Animated.View style={blobStyle(-BLOB * 0.04,  BLOB * 0.06, b3x, b3y)}>
          <Blob color={c2} />
        </Animated.View>
        <Animated.View style={blobStyle( BLOB * 0.14, -BLOB * 0.08, b4x, b4y)}>
          <Blob color={c0} />
        </Animated.View>
        <Animated.View style={blobStyle(-BLOB * 0.10,  BLOB * 0.14, b5x, b5y)}>
          <Blob color={c1} />
        </Animated.View>
      </View>

      <Animated.Image
        source={{ uri }}
        style={[ss.image, { transform: [{ rotate: imageRotate }] }]}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  outer: {
    width: CONTAINER,
    height: CONTAINER,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 10,
  },
  canvas: {
    position: 'absolute',
    width: CONTAINER,
    height: CONTAINER,
    // No borderRadius, no overflow:hidden — the blobs' own radial gradients
    // fade to transparent before reaching the canvas edge, so the shape is
    // defined entirely by the gradients, not by a hard geometric clip.
  },
  image: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: ARTWORK_SIZE / 2,
  },
});
