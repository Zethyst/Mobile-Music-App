/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/services/musicPlayerServices', () => ({
  setupPlayer: jest.fn(async () => true),
  addTracks: jest.fn(async () => undefined),
  playbackService: jest.fn(),
}));

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {},
  Event: {},
  RepeatMode: { Queue: 0 },
  State: { Playing: 'playing', Paused: 'paused' },
  useActiveTrack: () => null,
  usePlaybackState: () => ({ state: 'paused' }),
}));

import App from '../src/App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
