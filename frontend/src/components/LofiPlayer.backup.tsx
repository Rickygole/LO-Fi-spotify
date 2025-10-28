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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [trackInfo, setTrackInfo] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
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

  useEffect(() => {
    if (playerReady && tracks.length > 0 && !isPlaying) {
      // Auto-start with first track when ready
      startLofiMix();
    }
  }, [playerReady, tracks]);

  // Progress tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && player) {
      interval = setInterval(async () => {
        const state = await player.getCurrentState();
        if (state && state.track_window.current_track) {
          setProgress(state.position);
          setDuration(state.duration);
          
          // Update current track info
          const spotifyTrack = tracks.find(t => t.id === state.track_window.current_track.id);
          if (spotifyTrack && spotifyTrack.id !== currentTrack?.id) {
            setCurrentTrack(spotifyTrack);
            setTrackInfo(`${spotifyTrack.name} by ${spotifyTrack.artists[0].name} - ${selectedMood} mode`);
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, player, tracks, currentTrack, selectedMood]);

  const initializeSpotifyPlayer = async () => {
    try {
      console.log('🎵 Initializing Spotify Web Playback SDK for Lo-Fi...');
      
      if (!window.Spotify) {
        console.error('Spotify Web Playback SDK not loaded');
        return;
      }

      const token = spotifyAPI.getAccessToken();
      if (!token) {
        console.error('No access token available');
        return;
      }

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Lofi - Spotify Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(token);
        },
        volume: 0.7
      });

      // Error handling
      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize:', message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Failed to authenticate:', message);
      });

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Failed to validate Spotify account:', message);
      });

      spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Failed to perform playback:', message);
      });

      // Playback status updates
      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        
        setIsPlaying(!state.paused);
        setProgress(state.position);
        setDuration(state.duration);
        
        if (state.track_window.current_track) {
          const track = tracks.find(t => t.id === state.track_window.current_track.id);
          if (track) {
            setCurrentTrack(track);
            setTrackInfo(`${track.name} by ${track.artists[0].name} - ${selectedMood} mode`);
          }
        }
      });

      // Ready
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('✅ Spotify Player ready with Device ID:', device_id);
        setDeviceId(device_id);
        setPlayerReady(true);
      });

      // Connect to the player
      const connected = await spotifyPlayer.connect();
      if (connected) {
        console.log('🔗 Connected to Spotify Player');
        setPlayer(spotifyPlayer);
      }
    } catch (error) {
      console.error('Error initializing Spotify Player:', error);
    }
  };
      console.error('Simple AI DJ initialization error:', error);
    }
  };

  const startDJStateMonitoring = () => {
    const monitor = () => {
      const state = simpleAIDJPlayer.getState();
      setIsPlaying(state.isPlaying);
      setCurrentTrack(state.currentTrack);
      setTrackInfo(state.currentTrack ? 
        `Track ${state.trackIndex + 1} of ${state.totalTracks}` : 
        ''
      );
      
      if (state.isPlaying) {
        setTimeout(monitor, 1000); // Update every second
      }
    };
    
    monitor();
  };

  const loadPlaylistTracks = async () => {
    try {
      setIsLoading(true);
      const tracksData = await spotifyAPI.getPlaylistTracks(playlist.id);
      setTracks(tracksData);
    } catch (error) {
      console.error('Failed to load playlist tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

    const startSimpleAIDJMix = async () => {
    if (tracks.length === 0) {
      alert('Please wait for tracks to load first');
      return;
    }

    setIsAnalyzing(true);
    setTrackInfo('Starting AI DJ Mix...');

    try {
      const success = await simpleAIDJPlayer.startMix(tracks, selectedMood);
      
      if (success) {
        setIsPlaying(true);
        setCurrentTrack(simpleAIDJPlayer.getState().currentTrack);
        setTrackInfo('AI DJ Mix Active');
        console.log('✅ AI DJ Mix started successfully!');
      } else {
        setIsPlaying(true);
        setCurrentTrack(simpleAIDJPlayer.getState().currentTrack);
        setTrackInfo('Demo Mode Active - Lo-Fi Effects Ready');
        console.log('🎵 Demo mode activated with lo-fi processing!');
      }
    } catch (error) {
      console.error('Failed to start AI DJ Mix:', error);
      setTrackInfo('Failed to start AI DJ Mix');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        simpleAIDJPlayer.pause();
        setIsPlaying(false);
      } else {
        simpleAIDJPlayer.resume();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  const skipTrack = () => {
    simpleAIDJPlayer.skip();
  };

  const changeMood = async (newMood: LofiMood) => {
    setSelectedMood(newMood);
    
    if (isPlaying) {
      console.log(`🎭 Changing mood to ${newMood} in real-time...`);
      simpleAIDJPlayer.changeMood(newMood);
    }
  };

  if (isLoading) {
    return (
      <div className="lofi-player">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading playlist tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lofi-player">
      <header className="player-header">
        <button onClick={onBack} className="back-button">
          ← Back to Playlists
        </button>
        <div className="playlist-info">
          <h1>{playlist.name}</h1>
          <p>{tracks.length} tracks ready for lo-fi transformation</p>
        </div>
      </header>

      <div className="player-content">
        <div className="playlist-artwork">
          {playlist.images?.[0] ? (
            <img src={playlist.images[0].url} alt={playlist.name} />
          ) : (
            <div className="artwork-placeholder">🎵</div>
          )}
        </div>

        <div className="mood-selector">
          <h3>Choose Your Vibe</h3>
          <div className="mood-grid">
            {moods.map((mood) => (
              <button
                key={mood.id}
                className={`mood-card ${selectedMood === mood.id ? 'selected' : ''}`}
                onClick={() => changeMood(mood.id)}
              >
                <span className="mood-icon">{mood.icon}</span>
                <span className="mood-name">{mood.name}</span>
                <span className="mood-description">{mood.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="start-section">
          {!isPlaying ? (
            <div>
              <button 
                onClick={startSimpleAIDJMix}
                className="start-button"
                disabled={isAnalyzing || tracks.length === 0}
              >
                {isAnalyzing ? (
                  <>
                    <div className="button-spinner"></div>
                    🎵 Finding playable tracks...
                  </>
                ) : (
                  <>
                    🎛️ Start Lo-Fi DJ Mix
                  </>
                )}
              </button>
              
              <div style={{ marginTop: '10px' }}>
                <button 
                  onClick={() => window.open('http://localhost:5177/diagnostics.html', '_blank')}
                  style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px', 
                    background: '#555', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  Debug App Settings
                </button>
              </div>
            </div>
          ) : (
            <div className="playback-controls">
              <button onClick={togglePlayback} className="control-button">
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>
              <button onClick={skipTrack} className="control-button">
                ⏭️ Skip Track
              </button>
              {currentTrack && (
                <div className="current-track-info">
                  <p>🎵 Now Playing: {currentTrack.name}</p>
                  <p>🎤 Artist: {currentTrack.artists[0]?.name}</p>
                  <p>� {trackInfo}</p>
                </div>
              )}
            </div>
          )}
          
          <p className="start-note">
            {playerReady 
              ? '🎵 Simple Lo-Fi DJ ready to mix your tracks...' 
              : '🔄 Initializing audio systems...'
            }
          </p>
        </div>

        <div className="track-preview">
          <h4>Track Preview</h4>
          <div className="track-list">
            {tracks.slice(0, 5).map((track, index) => (
              <div key={track.id} className="track-item">
                <span className="track-number">{index + 1}</span>
                <div className="track-info">
                  <span className="track-name">{track.name}</span>
                  <span className="track-artist">
                    {track.artists.map(artist => artist.name).join(', ')}
                  </span>
                </div>
              </div>
            ))}
            {tracks.length > 5 && (
              <div className="track-item more">
                <span className="track-number">...</span>
                <div className="track-info">
                  <span className="track-name">+{tracks.length - 5} more tracks</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}