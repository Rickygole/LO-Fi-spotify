import { useState, useEffect } from 'react';
import { spotifyAPI } from '../spotify-api';
import { realLoFiPlayer } from '../real-lofi-player';
import type { SpotifyPlaylist, SpotifyTrack, LofiMood } from '../types';
import './LofiPlayer.css';

interface LofiPlayerProps {
  playlist: SpotifyPlaylist;
  onBack: () => void;
}

export function RealLofiPlayer({ playlist, onBack }: LofiPlayerProps) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<LofiMood>('chill');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [trackInfo, setTrackInfo] = useState<string>('');

  const moods: Array<{ id: LofiMood; name: string; icon: string; description: string }> = [
    { id: 'chill', name: 'Lo-Fi Chill', icon: '🌙', description: 'Dreamy and relaxed' },
    { id: 'cafe', name: 'Café Vibes', icon: '☕', description: 'Warm and cozy' },
    { id: 'study', name: 'Study Mode', icon: '📚', description: 'Focus and concentration' },
    { id: 'party', name: 'Party Flow', icon: '🎉', description: 'Upbeat and energetic' }
  ];

  useEffect(() => {
    loadPlaylistTracks();
    initializeRealLoFiPlayer();

    return () => {
      realLoFiPlayer.disconnect();
    };
  }, []);

  const loadPlaylistTracks = async () => {
    try {
      const playlistTracks = await spotifyAPI.getPlaylistTracks(playlist.id);
      setTracks(playlistTracks);
      setTrackInfo(`${playlistTracks.length} tracks loaded`);
    } catch (error) {
      console.error('Failed to load playlist tracks:', error);
      setTrackInfo('Failed to load tracks');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeRealLoFiPlayer = async () => {
    try {
      setIsInitializing(true);
      setTrackInfo('🔐 Initializing real lo-fi player...');
      
      // Get access token from URL hash or storage
      const accessToken = getAccessTokenFromURL() || localStorage.getItem('spotify_access_token');
      
      if (!accessToken) {
        setTrackInfo('❌ No access token found. Please login with Spotify first.');
        setIsInitializing(false);
        return;
      }

      // Wait for Spotify SDK to be ready
      const initializePlayer = async () => {
        try {
          const success = await realLoFiPlayer.initialize(accessToken);
          if (success) {
            setPlayerReady(true);
            setTrackInfo('✅ Real Lo-Fi Player ready! Premium Spotify account detected.');
          } else {
            setTrackInfo('❌ Failed to initialize player. Please check your Spotify Premium subscription.');
          }
        } catch (error) {
          console.error('Player initialization error:', error);
          setTrackInfo('❌ Player initialization failed. Spotify Premium required for real lo-fi mode.');
        } finally {
          setIsInitializing(false);
        }
      };

      if (window.Spotify) {
        await initializePlayer();
      } else {
        window.onSpotifyWebPlaybackSDKReady = initializePlayer;
      }
    } catch (error) {
      console.error('Failed to initialize real lo-fi player:', error);
      setTrackInfo('❌ Failed to initialize player');
      setIsInitializing(false);
    }
  };

  const getAccessTokenFromURL = (): string | null => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    
    if (token) {
      localStorage.setItem('spotify_access_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    return token;
  };

  const startRealLoFiMix = async () => {
    if (tracks.length === 0) {
      alert('Please wait for tracks to load first');
      return;
    }

    if (!playerReady) {
      alert('Player not ready yet. Please wait...');
      return;
    }

    setIsInitializing(true);
    setTrackInfo('🎛️ Starting Real Lo-Fi Mix...');

    try {
      const success = await realLoFiPlayer.startLoFiMix(tracks, selectedMood);
      
      if (success) {
        setIsPlaying(true);
        setTrackInfo('🎛️ Real Lo-Fi Mix Active - Transforming your music!');
        console.log('✅ Real Lo-Fi Mix started successfully!');
        
        // Update track info periodically
        const updateTrack = () => {
          const state = realLoFiPlayer.getState();
          setCurrentTrack(state.currentTrack);
          setIsPlaying(state.isPlaying);
        };
        
        updateTrack();
        setInterval(updateTrack, 1000);
      } else {
        setTrackInfo('❌ Failed to start Real Lo-Fi Mix');
      }
    } catch (error) {
      console.error('Failed to start Real Lo-Fi Mix:', error);
      setTrackInfo('❌ Failed to start Real Lo-Fi Mix');
    } finally {
      setIsInitializing(false);
    }
  };

  const handlePause = async () => {
    if (isPlaying) {
      await realLoFiPlayer.pause();
      setIsPlaying(false);
      setTrackInfo('⏸️ Paused');
    } else {
      await realLoFiPlayer.resume();
      setIsPlaying(true);
      setTrackInfo('▶️ Playing with lo-fi effects');
    }
  };

  const handleNext = async () => {
    await realLoFiPlayer.nextTrack();
    setTrackInfo('⏭️ Next track');
  };

  const handlePrevious = async () => {
    await realLoFiPlayer.previousTrack();
    setTrackInfo('⏮️ Previous track');
  };

  if (isLoading) {
    return (
      <div className="lofi-player">
        <div className="loading-container">
          <div className="vinyl-loader"></div>
          <p>Loading your tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lofi-player">
      <div className="player-header">
        <button onClick={onBack} className="back-button">
          ← Back to Playlists
        </button>
        <h2>{playlist.name}</h2>
        <p className="playlist-description">{playlist.description}</p>
      </div>

      <div className="playlist-info">
        <div className="playlist-details">
          <img src={playlist.images[0]?.url} alt={playlist.name} className="playlist-image" />
          <div className="track-count">
            <span className="count">{tracks.length}</span>
            <span className="label">tracks</span>
          </div>
        </div>
      </div>

      <div className="controls-section">
        {/* Mood Selection */}
        <div className="mood-section">
          <h3>Choose Your Lo-Fi Vibe</h3>
          <div className="mood-grid">
            {moods.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                className={`mood-card ${selectedMood === mood.id ? 'selected' : ''}`}
              >
                <div className="mood-icon">{mood.icon}</div>
                <div className="mood-name">{mood.name}</div>
                <div className="mood-description">{mood.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="start-section">
          {!isPlaying ? (
            <div>
              <button 
                onClick={startRealLoFiMix}
                className="start-button real-lofi"
                disabled={isInitializing || tracks.length === 0 || !playerReady}
              >
                {isInitializing ? (
                  <>
                    <div className="button-spinner"></div>
                    🎵 Initializing Real Lo-Fi...
                  </>
                ) : !playerReady ? (
                  <>
                    ⚠️ Player Not Ready - Check Login
                  </>
                ) : (
                  <>
                    🎛️ Start Real Lo-Fi Mix
                  </>
                )}
              </button>
              <p className="start-description">
                Transform your Spotify music with real-time lo-fi effects
              </p>
            </div>
          ) : (
            <div className="playing-controls">
              <div className="now-playing">
                <div className="track-info">
                  {currentTrack && (
                    <>
                      <div className="track-name">{currentTrack.name}</div>
                      <div className="artist-name">{currentTrack.artists[0]?.name}</div>
                    </>
                  )}
                </div>
                <div className="status-indicator">
                  <div className="lo-fi-indicator">🎛️ Real Lo-Fi Active</div>
                </div>
              </div>
              
              <div className="control-buttons">
                <button onClick={handlePrevious} className="control-btn">
                  ⏮️ Previous
                </button>
                <button onClick={handlePause} className="control-btn primary">
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button onClick={handleNext} className="control-btn">
                  ⏭️ Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="status-section">
          <div className="status-text">{trackInfo}</div>
        </div>
      </div>

      {/* Track Preview */}
      <div className="track-preview">
        <h4>Track List Preview</h4>
        <div className="track-list">
          {tracks.slice(0, 5).map((track, index) => (
            <div key={track.id} className="track-item">
              <span className="track-number">{index + 1}</span>
              <span className="track-name">{track.name}</span>
              <span className="track-artist">{track.artists[0]?.name}</span>
            </div>
          ))}
          {tracks.length > 5 && (
            <div className="track-item more">
              <span>... and {tracks.length - 5} more tracks</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}