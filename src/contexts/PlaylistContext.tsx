import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
  } from 'react';
  import {
    getPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    type Playlist,
    type PlaylistTrack,
  } from '../services/playlistService';
  
  type PlaylistContextValue = {
    playlists: Playlist[];
    loading: boolean;
    reload: () => Promise<void>;
    createNew: (input: { name: string; description?: string; coverUri?: string }) => Promise<Playlist>;
    update: (id: string, patch: Partial<Pick<Playlist, 'name' | 'description' | 'coverUri'>>) => Promise<void>;
    remove: (id: string) => Promise<void>;
    addTrack: (playlistId: string, track: Omit<PlaylistTrack, 'addedAt'>) => Promise<void>;
    removeTrack: (playlistId: string, videoId: string) => Promise<void>;
  };
  
  const PlaylistContext = createContext<PlaylistContextValue | null>(null);
  
  export function PlaylistProvider({ children }: { children: React.ReactNode }) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
  
    const reload = useCallback(async () => {
      setLoading(true);
      try {
        const data = await getPlaylists();
        setPlaylists(data);
      } finally {
        setLoading(false);
      }
    }, []);
  
    useEffect(() => { void reload(); }, [reload]);
  
    const createNew = useCallback(async (input: { name: string; description?: string; coverUri?: string }) => {
      const pl = await createPlaylist(input);
      setPlaylists(prev => [pl, ...prev]);
      return pl;
    }, []);
  
    const update = useCallback(async (id: string, patch: Partial<Pick<Playlist, 'name' | 'description' | 'coverUri'>>) => {
      const updated = await updatePlaylist(id, patch);
      if (updated) {
        setPlaylists(prev => prev.map(p => p.id === id ? updated : p));
      }
    }, []);
  
    const remove = useCallback(async (id: string) => {
      await deletePlaylist(id);
      setPlaylists(prev => prev.filter(p => p.id !== id));
    }, []);
  
    const addTrack = useCallback(async (playlistId: string, track: Omit<PlaylistTrack, 'addedAt'>) => {
      const updated = await addTrackToPlaylist(playlistId, track);
      if (updated) {
        setPlaylists(prev => prev.map(p => p.id === playlistId ? updated : p));
      }
    }, []);
  
    const removeTrack = useCallback(async (playlistId: string, videoId: string) => {
      const updated = await removeTrackFromPlaylist(playlistId, videoId);
      if (updated) {
        setPlaylists(prev => prev.map(p => p.id === playlistId ? updated : p));
      }
    }, []);
  
    return (
      <PlaylistContext.Provider value={{ playlists, loading, reload, createNew, update, remove, addTrack, removeTrack }}>
        {children}
      </PlaylistContext.Provider>
    );
  }
  
  export function usePlaylists() {
    const ctx = useContext(PlaylistContext);
    if (!ctx) throw new Error('usePlaylists must be used inside PlaylistProvider');
    return ctx;
  }