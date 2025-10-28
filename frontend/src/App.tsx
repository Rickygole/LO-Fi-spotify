import { useState, useEffect } from 'react';
import { spotifyAPI } from './spotify-api';
import { LoginScreen } from './components/LoginScreen';
import { PlaylistSelector } from './components/PlaylistSelector';
import { SpotifyPlayer } from './components/SpotifyPlayer';
import type { SpotifyPlaylist } from './types';
import './App.css';

type AppState = 'login' | 'playlists' | 'player';

function App() {
  const [appState, setAppState] = useState<AppState>('login');
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    const hasTokens = spotifyAPI.loadTokensFromStorage();
    if (hasTokens && spotifyAPI.isAuthenticated()) {
      setAppState('playlists');
      return;
    }

    // Handle OAuth callback - check both hash and search params
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);
    
    if (hashParams.has('access_token') || searchParams.has('access_token')) {
      const success = spotifyAPI.handleCallback();
      if (success) {
        setAppState('playlists');
      }
    }
  }, []);

  const handlePlaylistSelect = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setAppState('player');
  };

  const handleBackToPlaylists = () => {
    setSelectedPlaylist(null);
    setAppState('playlists');
  };

  const handleLogout = () => {
    setSelectedPlaylist(null);
    setAppState('login');
  };

  return (
    <div className="app">
      {appState === 'login' && <LoginScreen />}
      
      {appState === 'playlists' && (
        <PlaylistSelector 
          onPlaylistSelect={handlePlaylistSelect}
          onLogout={handleLogout}
        />
      )}
      
      {appState === 'player' && selectedPlaylist && (
        <SpotifyPlayer 
          playlist={selectedPlaylist}
          onBack={handleBackToPlaylists}
        />
      )}
    </div>
  );
}

export default App;
