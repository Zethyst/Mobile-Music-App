import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Player: undefined;
  Search: undefined;
  Library: undefined;
  Downloads: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList> | undefined;
  FullAlbums: undefined;
  FullSongs: undefined;
  Lyrics: undefined;
  Queue: undefined;
};
