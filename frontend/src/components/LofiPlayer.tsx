import { useState, useEffect } from 'react';
import { spotifyAPI } from '../spotify-api';
import type { SpotifyPlaylist, SpotifyTrack, LofiMood } from '../types';
import './LofiPlayer.css';

interface LofiPlayerProps {
  playlist: SpotifyPlaylist;
  onBack: () => void;
}

export function LofiPlayer({ playlist, onBack }: LofiPlayerProps) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<LofiMood>('chill');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [trackInfo, setTrackInfo] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const moods: Array<{ id: LofiMood; name: string; icon: string; description: string }> = [
    { id: 'chill', name: 'Lo-Fi Chill', icon: '🌙', description: 'Dreamy and relaxed' },
    { id: 'cafe', name: 'Café Vibes', icon: '☕', description: 'Warm and cozy' },
    { id: 'study', name: 'Study Mode', icon: '📚', description: 'Focus and concentration' },
    { id: 'party', name: 'Party Flow', icon: '🎉', description: 'Upbeat and energetic' }
  ];

  useEffect(() => {
    loadPlaylistTracks();
    initializeSpotifyPlayer();

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [playlist.id]);

  // Progress tracking
  useEffect(() => {
    let interval: any;
    if (isPlaying && player) {
      interval = setInterval(async () => {
        try {
          const state = await player.getCurrentState();
          if (state && state.track_window.current_track) {
            setProgress(state.position);
            setDuration(state.duration);
            
            const spotifyTrack = tracks.find(t => t.id === state.track_window.current_track.id);
            if (spotifyTrack && spotifyTrack.id !== currentTrack?.id) {
              setCurrentTrack(spotifyTrack);
              setTrackInfo(`${spotifyTrack.name} by ${spotifyTrack.artists[0].name} - ${selectedMood} mode`);
            }
          }
        } catch (error) {
          console.error('Error getting player state:', error);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, player, tracks, currentTrack, selectedMood]);

  const initializeSpotifyPlayer = async () => {
    try {
      console.log('🎵 Initializing Spotify Web Playback SDK for Lo-Fi...');
      
      // Wait for Spotify SDK to be ready
      if (!(window as any).Spotify) {
        console.log('🔄 Waiting for Spotify SDK to load...');
        return new Promise((resolve) => {
          (window as any).onSpotifyWebPlaybackSDKReady = () => {
            console.log('✅ Spotify SDK loaded, initializing player...');
            initializeSpotifyPlayer().then(resolve);
          };
        });
      }

      const token = spotifyAPI.getAccessToken();
      if (!token) {
        console.error('❌ No access token available');
        setTrackInfo('Authentication required - please refresh the page');
        return;
      }

      console.log('🎵 Creating Spotify Player with token...');
      const spotifyPlayer = new (window as any).Spotify.Player({
        name: 'Lofi - Spotify Player',
        getOAuthToken: (cb: (token: string) => void) => {
          console.log('🔑 Providing OAuth token to player');
          cb(token);
        },
        volume: 0.7
      });

      spotifyPlayer.addListener('initialization_error', ({ message }: any) => {
        console.error('❌ Failed to initialize:', message);
        setTrackInfo('Player initialization failed');
      });

      spotifyPlayer.addListener('authentication_error', ({ message }: any) => {
        console.error('❌ Failed to authenticate:', message);
        setTrackInfo('Authentication failed - please refresh the page');
      });

      spotifyPlayer.addListener('account_error', ({ message }: any) => {
        console.error('❌ Failed to validate Spotify account:', message);
        setTrackInfo('Account error - Premium account may be required');
      });

      spotifyPlayer.addListener('playback_error', ({ message }: any) => {
        console.error('❌ Failed to perform playback:', message);
        setTrackInfo('Playback error occurred');
      });

      spotifyPlayer.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        
        console.log('🎵 Player state changed:', { paused: state.paused });
        setIsPlaying(!state.paused);
        
        if (state.track_window.current_track) {
          const track = tracks.find(t => t.id === state.track_window.current_track.id);
          if (track) {
            setCurrentTrack(track);
            setTrackInfo(`${track.name} by ${track.artists[0].name} - ${selectedMood} mode`);
          }
        }
      });

      spotifyPlayer.addListener('ready', ({ device_id }: any) => {
        console.log('✅ Spotify Player ready with Device ID:', device_id);
        setDeviceId(device_id);
        setTrackInfo('Spotify Player connected and ready!');
        
        // Add a delay to ensure device is fully registered
        setTimeout(() => {
          setPlayerReady(true);
          setTrackInfo('Ready to start your Lo-Fi mix!');
          console.log('🎵 Player marked as ready');
        }, 2000);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }: any) => {
        console.log('❌ Spotify Player not ready:', device_id);
        setPlayerReady(false);
        setTrackInfo('Player disconnected');
      });

      console.log('🔗 Connecting to Spotify Player...');
      const connected = await spotifyPlayer.connect();
      if (connected) {
        console.log('✅ Connected to Spotify Player');
        setPlayer(spotifyPlayer);
      } else {
        console.error('❌ Failed to connect to Spotify Player');
        setTrackInfo('Failed to connect to Spotify - please refresh the page');
      }
    } catch (error) {
      console.error('❌ Error initializing Spotify Player:', error);
      setTrackInfo('Error initializing player - please refresh the page');
    }
  };

  const loadPlaylistTracks = async () => {
    try {
      setIsLoading(true);
      const tracksData = await spotifyAPI.getPlaylistTracks(playlist.id);
      setTracks(tracksData);
      setTrackInfo(`Loaded ${tracksData.length} tracks`);
    } catch (error) {
      console.error('Failed to load playlist tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startLofiMix = async () => {
    console.log('🎵 Starting Lo-Fi Mix...', { playerReady, deviceId, tracksCount: tracks.length });
    
    if (!playerReady || !deviceId || tracks.length === 0) {
      console.log('Player not ready or no tracks available');
      setTrackInfo('Player not ready - please wait...');
      return;
    }

    try {
      setTrackInfo('Starting Lo-Fi DJ Mix...');
      
      // Check if we have a valid access token
      const token = spotifyAPI.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }
      
      console.log('🎵 Device ID:', deviceId);
      console.log('🎵 Tracks to play:', tracks.length);
      
      const trackUris = tracks.map(track => `spotify:track:${track.id}`);
      console.log('🎵 Track URIs:', trackUris.slice(0, 3), '...');
      
      await spotifyAPI.startPlayback(deviceId, trackUris);
      
      setIsPlaying(true);
      setTrackInfo(`Lo-Fi DJ Mix Active - ${selectedMood} mode`);
      console.log('✅ Lo-Fi DJ Mix started!');
      
    } catch (error: any) {
      console.error('❌ Error starting playback:', error);
      let errorMessage = 'Error starting playback';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'Device not found - please refresh and try again';
      } else if (error.response?.status === 403) {
        errorMessage = 'Premium account required for playback';
      }
      
      setTrackInfo(errorMessage);
    }
  };

  const togglePlayback = async () => {
    if (!player) return;

    try {
      const state = await player.getCurrentState();
      if (!state) return;

      if (state.paused) {
        await player.resume();
      } else {
        await player.pause();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const skipTrack = async () => {
    if (!player) return;
    
    try {
      await player.nextTrack();
      setTrackInfo('Skipping to next track...');
    } catch (error) {
      console.error('Error skipping track:', error);
    }
  };

  const changeMood = (mood: LofiMood) => {
    setSelectedMood(mood);
    if (currentTrack) {
      setTrackInfo(`${currentTrack.name} by ${currentTrack.artists[0].name} - ${mood} mode`);
    }
    console.log(`🎭 Changed mood to: ${mood}`);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="lofi-player loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lofi-player">
      {/* Header */}
      <div className="player-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <h2>{playlist.name}</h2>
        <div className="track-count">{tracks.length} tracks</div>
      </div>

      {/* Mood Selector */}
      <div className="mood-selector">
        <h3>Choose Your Vibe</h3>
        <div className="mood-grid">
          {moods.map((mood) => (
            <button
              key={mood.id}
              className={`mood-button ${selectedMood === mood.id ? 'active' : ''}`}
              onClick={() => changeMood(mood.id)}
            >
              <div className="mood-icon">{mood.icon}</div>
              <div className="mood-name">{mood.name}</div>
              <div className="mood-description">{mood.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Track Info */}
      {currentTrack && (
        <div className="current-track">
          <div className="track-art">
            {currentTrack.album?.images?.[0] && (
              <img src={currentTrack.album.images[0].url} alt={currentTrack.album.name} />
            )}
          </div>
          <div className="track-details">
            <h4>{currentTrack.name}</h4>
            <p>{currentTrack.artists[0].name}</p>
            <div className="track-info-text">{trackInfo}</div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {duration > 0 && (
        <div className="progress-container">
          <span className="time">{formatTime(progress)}</span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(progress / duration) * 100}%` }}
            ></div>
          </div>
          <span className="time">{formatTime(duration)}</span>
        </div>
      )}

      {/* Controls */}
      <div className="player-controls">
        {!playerReady ? (
          <div className="status">Connecting to Spotify...</div>
        ) : (
          <>
            <button 
              className="control-button play-button"
              onClick={isPlaying ? togglePlayback : startLofiMix}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            
            <button 
              className="control-button skip-button"
              onClick={skipTrack}
              disabled={!isPlaying}
            >
              ⏭️ Skip Track
            </button>
          </>
        )}
      </div>

      {/* Status */}
      <div className="dj-status">
        {isPlaying ? (
          <div className="status-active">
            🎵 AI DJ Mix Active
            <div className="status-indicator">
              🎧 {selectedMood} mode
            </div>
          </div>
        ) : (
          <div className="status-inactive">
            🎵 Simple Lo-Fi DJ ready to mix your tracks...
            <div className="track-info-text">{trackInfo}</div>
          </div>
        )}
      </div>

      {/* Track Preview */}
      <div className="track-preview">
        <h4>Track Preview</h4>
        <div className="track-list">
          {tracks.slice(0, 5).map((track, index) => (
            <div 
              key={track.id} 
              className={`track-item ${currentTrack?.id === track.id ? 'current' : ''}`}
            >
              <span className="track-number">{index + 1}</span>
              <div className="track-info">
                <div className="track-name">{track.name}</div>
                <div className="track-artist">{track.artists[0].name}</div>
              </div>
              <div className="track-duration">{formatTime(track.duration_ms)}</div>
            </div>
          ))}
          {tracks.length > 5 && (
            <div className="more-tracks">
              ...and {tracks.length - 5} more tracks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
