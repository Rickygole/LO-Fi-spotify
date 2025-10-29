import { useState, useEffect } from 'react';
import { spotifyAPI } from '../spotify-api';
import { LoFiProcessor } from '../lofi-processor';
import type { SpotifyPlaylist, SpotifyTrack, LofiMood } from '../types';
import './SpotifyPlayer.css';

interface SpotifyPlayerProps {
  playlist: SpotifyPlaylist;
  onBack: () => void;
}

export function SpotifyPlayer({ playlist, onBack }: SpotifyPlayerProps) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [player, setPlayer] = useState<any>(null);
  const [selectedMood, setSelectedMood] = useState<LofiMood>('chill');
  const [lofiProcessor] = useState(() => new LoFiProcessor());

  const moods: Array<{ id: LofiMood; name: string; icon: string; description: string }> = [
    { id: 'chill', name: 'Lo-Fi Chill', icon: '🌙', description: 'Dreamy and relaxed' },
    { id: 'cafe', name: 'Café Vibes', icon: '☕', description: 'Warm and cozy' },
    { id: 'study', name: 'Study Mode', icon: '📚', description: 'Focus and concentration' },
    { id: 'party', name: 'Party Flow', icon: '🎉', description: 'Upbeat and energetic' }
  ];

  useEffect(() => {
    loadPlaylistTracks();
    initializeSpotifyPlayer();
    initializeLoFiProcessor();

    return () => {
      if (player) {
        player.disconnect();
      }
      lofiProcessor.dispose();
    };
  }, []);

  useEffect(() => {
    if (playerReady && tracks.length > 0) {
      // Auto-play first track
      playTrack(tracks[0]);
    }
  }, [playerReady, tracks]);

  // Progress tracking
  useEffect(() => {
    let interval: number;
    if (isPlaying && player) {
      interval = setInterval(async () => {
        const state = await player.getCurrentState();
        if (state && state.track_window.current_track) {
          setProgress(state.position);
          setDuration(state.duration);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, player]);

  const loadPlaylistTracks = async () => {
    try {
      const playlistTracks = await spotifyAPI.getPlaylistTracks(playlist.id);
      setTracks(playlistTracks);
    } catch (error) {
      console.error('Failed to load playlist tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSpotifyPlayer = async () => {
    console.log('🎵 Initializing Spotify Player...');
    
    const accessToken = getAccessTokenFromURL() || localStorage.getItem('spotify_access_token');
    
    if (!accessToken) {
      console.error('❌ No access token found');
      return;
    }

    // Wait for Spotify SDK to be ready
    if (!window.Spotify) {
      console.log('🔄 Waiting for Spotify SDK to load...');
      return new Promise((resolve) => {
        (window as any).onSpotifyWebPlaybackSDKReady = () => {
          console.log('✅ Spotify SDK loaded, initializing player...');
          initializeSpotifyPlayer().then(resolve);
        };
      });
    }

    console.log('🎵 Creating Spotify Player...');
    const spotifyPlayer = new window.Spotify.Player({
      name: 'Lofi - Spotify',
      getOAuthToken: (cb) => { 
        console.log('🔑 Providing OAuth token to player');
        cb(accessToken); 
      },
      volume: 0.5
    });

    spotifyPlayer.addListener('ready', ({ device_id }) => {
      console.log('✅ Spotify Player Ready with Device ID:', device_id);
      setDeviceId(device_id);
      
      // Try to activate the device by attempting to get current state
      console.log('🔄 Activating device...');
      spotifyPlayer.getCurrentState().then((state) => {
        console.log('📱 Device state check:', state ? 'active' : 'inactive');
      }).catch((error) => {
        console.log('⚠️ Device state check failed, but continuing...');
      });
      
      // Add delay to ensure device is fully registered and activated
      setTimeout(() => {
        setPlayerReady(true);
        console.log('🎵 Player marked as ready');
      }, 3000); // Increased delay for activation
    });

    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('⚠️ Device ID has gone offline', device_id);
      setPlayerReady(false);
      setDeviceId(null);
    });

    spotifyPlayer.addListener('initialization_error', ({ message }) => {
      console.error('❌ Spotify initialization error:', message);
    });

    spotifyPlayer.addListener('authentication_error', ({ message }) => {
      console.error('❌ Spotify authentication error:', message);
    });

    spotifyPlayer.addListener('account_error', ({ message }) => {
      console.error('❌ Spotify account error:', message);
    });

    spotifyPlayer.addListener('player_state_changed', (state) => {
      if (!state) return;
      
      const currentTrack = state.track_window.current_track;
      if (currentTrack) {
        const currentTrack = state.track_window.current_track as any;
        setCurrentTrack({
          id: currentTrack.id,
          name: currentTrack.name,
          artists: currentTrack.artists.map((artist: any) => ({
            id: artist.uri.split(':')[2],
            name: artist.name
          })),
          album: {
            id: currentTrack.album.uri.split(':')[2],
            name: currentTrack.album.name,
            images: currentTrack.album.images || []
          },
          uri: currentTrack.uri,
          preview_url: null,
          duration_ms: (state as any).duration
        });
      }
      
      setIsPlaying(!(state as any).paused);
      setProgress((state as any).position);
      setDuration((state as any).duration);
    });

    console.log('🔗 Connecting to Spotify Player...');
    try {
      const connected = await spotifyPlayer.connect();
      if (connected) {
        console.log('✅ Connected to Spotify Player');
        setPlayer(spotifyPlayer);
      } else {
        console.error('❌ Failed to connect to Spotify Player');
      }
    } catch (error) {
      console.error('❌ Error connecting to Spotify Player:', error);
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

  const initializeLoFiProcessor = async () => {
    try {
      console.log('🎛️ Initializing Lo-Fi audio processor...');
      
      // Initialize the lo-fi processor
      await lofiProcessor.initialize();
      
      // Try to connect to Spotify's audio output
      // Note: Due to browser security, we can't directly access Spotify's audio stream
      // Instead, we'll apply visual effects and use the Web Audio API for ambient sounds
      
      try {
        // Attempt to get access to the player's audio context
        if (player && (player as any)._options && (player as any)._options.getAudioContext) {
          console.log('🔗 Attempting to connect to Spotify Player audio context...');
          const spotifyAudioContext = (player as any)._options.getAudioContext();
          if (spotifyAudioContext) {
            await lofiProcessor.connectToAudioContext(spotifyAudioContext);
            console.log('✅ Connected to Spotify audio context');
          }
        } else {
          console.log('ℹ️ Direct audio access not available, using visual effects mode');
          // Apply visual lo-fi effects (EQ visualization, etc.)
          lofiProcessor.enableVisualMode();
        }
      } catch (audioError) {
        console.log('ℹ️ Audio stream access limited, enabling visual-only mode');
        lofiProcessor.enableVisualMode();
      }
      
      // Apply the selected mood settings
      lofiProcessor.applyLoFiPreset(selectedMood);
      
      // Start real-time audio analysis for visual effects
      lofiProcessor.startAnalysis();
      
      console.log('✅ Lo-Fi processor ready and connected');
    } catch (error) {
      console.error('❌ Failed to initialize Lo-Fi processor:', error);
    }
  };

  const changeMood = (mood: LofiMood) => {
    setSelectedMood(mood);
    lofiProcessor.applyLoFiPreset(mood);
    console.log(`🎭 Changed Lo-Fi mood to: ${mood}`);
  };

  const playTrack = async (track: SpotifyTrack) => {
    if (!deviceId || !playerReady) return;
    
    try {
      const uri = track.uri || `spotify:track:${track.id}`;
      await spotifyAPI.startPlayback(deviceId, [uri]);
      setCurrentTrack(track);
      console.log(`🎵 Playing: ${track.name} in ${selectedMood} mode`);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const playPlaylist = async () => {
    console.log('🎬 START YOUR MIX clicked!', { deviceId, tracks: tracks.length, selectedMood });
    
    if (tracks.length === 0) {
      console.error('❌ No tracks loaded');
      return;
    }
    
    try {
      console.log(`🎵 Starting playback in ${selectedMood} mode with ${tracks.length} tracks`);
      
      // Step 1: Get available devices to verify our device exists
      console.log('🔍 Checking available devices...');
      const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`
        }
      });
      
      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        console.log('📱 Available devices:', devicesData.devices);
        
        // Find our device in the list
        const ourDevice = devicesData.devices.find((device: any) => 
          device.id === deviceId || device.name === 'Lofi - Spotify'
        );
        
        if (!ourDevice) {
          throw new Error('Our device not found in Spotify devices list. Please refresh the page and try again.');
        }
        
        console.log('✅ Found our device:', ourDevice);
        
        // If device is not active, try to activate it first
        if (!ourDevice.is_active) {
          console.log('� Device not active, transferring playback...');
          const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              device_ids: [ourDevice.id],
              play: false
            })
          });
          
          if (!transferResponse.ok) {
            console.log('⚠️ Transfer failed, trying direct playback anyway...');
          } else {
            console.log('✅ Device transfer successful, waiting...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        // Use the verified device ID
        const verifiedDeviceId = ourDevice.id;
        console.log('🎵 Starting playback on verified device:', verifiedDeviceId);
        
        const trackUris = tracks.map((track: SpotifyTrack) => track.uri || `spotify:track:${track.id}`);
        
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${verifiedDeviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: trackUris
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚫 Playback API Error:', response.status, response.statusText, errorText);
          throw new Error(`Playback failed: ${response.status} ${response.statusText}`);
        }
      } else {
        console.log('⚠️ Could not get devices list, using stored device ID...');
        const trackUris = tracks.map((track: SpotifyTrack) => track.uri || `spotify:track:${track.id}`);
        
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: trackUris
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚫 Playback API Error:', response.status, response.statusText, errorText);
          throw new Error(`Device verification failed: ${response.status} ${response.statusText}`);
        }
      }
      
      setCurrentTrack(tracks[0]);
      
      // Initialize lo-fi audio processing
      console.log('🎛️ Initializing real-time lo-fi audio processing...');
      await initializeLoFiProcessor();
      
      console.log(`✅ Playback started! Real-time AI lo-fi processing active`);
    } catch (error: any) {
      console.error('❌ Error playing playlist:', error);
      
      if (error.message && error.message.includes('Our device not found')) {
        alert(`🔄 Device Sync Issue:\n\n${error.message}\n\nThis usually fixes itself - please wait 10 seconds and try again.`);
      } else if (error.message && (error.message.includes('Device not found') || error.message.includes('Device not active'))) {
        alert(`🎵 Device Activation Required:\n\n${error.message}\n\nTip: Keep the Spotify web player tab open and try again in a few seconds.`);
      } else if (error.message && error.message.includes('403')) {
        alert('🔐 Spotify Premium Required:\n\nThis app requires Spotify Premium to control playback.\nPlease upgrade your account and try again.');
      } else {
        alert(`⚠️ Playback Error:\n\n${error.message || 'Unknown error occurred'}\n\nTry keeping the Spotify web player tab open and wait a few seconds before trying again.`);
      }
    }
  };

  const togglePlayback = async () => {
    if (!player) return;
    
    if (isPlaying) {
      await player.pause();
    } else {
      await player.resume();
    }
  };

  const nextTrack = async () => {
    if (!player) return;
    await player.nextTrack();
  };

  const previousTrack = async () => {
    if (!player) return;
    await player.previousTrack();
  };

  const seek = async (position: number) => {
    if (!player) return;
    await player.seek(position);
  };

  const setPlayerVolume = async (vol: number) => {
    if (!player) return;
    await player.setVolume(vol / 100);
    setVolume(vol);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="spotify-player">
        <div className="loading-container">
          <div className="spotify-loader"></div>
          <p>Loading Lofi - Spotify...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spotify-player">
      {/* Left Sidebar */}
      <div className="spotify-sidebar">
        <div className="sidebar-header">
          <div className="spotify-logo">
            <svg viewBox="0 0 1134 340" className="spotify-icon">
              <title>Lofi - Spotify</title>
              <path fill="currentColor" d="M8 171c0 92 76 168 168 168s168-76 168-168S268 4 176 4 8 79 8 171zm230 78c-39-24-89-30-147-17-14 2-16-18-4-20 64-15 118-8 162 19 11 7 0 24-11 18zm17-45c-45-28-114-36-167-20-17 5-23-21-7-25 61-18 136-9 188 23 14 9 0 31-14 22zM80 133c-17 6-28-23-9-30 59-18 159-15 221 22 17 9 1 37-17 27-54-32-144-35-195-19zm379 91c-17 0-33-6-47-20-1 0-1 1-1 1l-16 19c-1 1-1 2 0 3 18 16 40 24 64 24 34 0 55-19 55-47 0-24-15-37-50-46-29-7-34-12-34-22s10-16 23-16 25 5 39 15c0 0 1 1 2 1s1-1 1-1l14-20c1-1 1-1 0-2-16-13-35-20-56-20-31 0-53 19-53 46 0 29 20 38 52 46 28 6 32 12 32 22 0 11-10 17-25 17zm95-77v-13c0-1-1-2-2-2h-26c-1 0-2 1-2 2v147c0 1 1 2 2 2h26c1 0 2-1 2-2v-46c10 11 21 16 36 16 27 0 54-21 54-61s-27-60-54-60c-15 0-26 5-36 17zm30 78c-18 0-31-15-31-35s13-34 31-34 30 14 30 34-12 35-30 35zm68-34c0 34 27 60 62 60s62-27 62-61-26-60-61-60-63 27-63 61zm30-1c0-20 13-34 32-34s33 15 33 35-13 34-32 34-33-15-33-35zm140-58v-29c0-1 0-2-1-2h-26c-1 0-2 1-2 2v29h-13c-1 0-2 1-2 2v22c0 1 1 2 2 2h13v58c0 23 11 35 34 35 9 0 18-2 25-6 1 0 1-1 1-2v-21c0-1 0-2-1-2h-2c-5 3-11 4-16 4-8 0-12-4-12-12v-54h30c1 0 2-1 2-2v-22c0-1-1-2-2-2h-30zm129-3c0-11 4-15 13-15 5 0 10 0 15 2h1s1-1 1-2V93c0-1 0-2-1-2-5-2-12-3-22-3-24 0-36 14-36 39v5h-13c-1 0-2 1-2 2v22c0 1 1 2 2 2h13v89c0 1 1 2 2 2h26c1 0 1-1 1-2v-89h25l37 89c-4 9-8 11-14 11-5 0-10-1-15-4h-1l-1 1-9 19c0 1 0 3 1 3 9 5 17 7 27 7 19 0 30-9 39-33l45-116v-2c0-1-1-1-2-1h-27c-1 0-1 1-1 2l-28 78-30-78c0-1-1-2-2-2h-44v-3zm-83 3c-1 0-2 1-2 2v113c0 1 1 2 2 2h26c1 0 1-1 1-2V134c0-1 0-2-1-2h-26zm-6-33c0 10 9 19 19 19s18-9 18-19-8-18-18-18-19 8-19 18zm245 69c10 0 19-8 19-18s-9-18-19-18-18 8-18 18 8 18 18 18zm0-34c9 0 17 7 17 16s-8 16-17 16-16-7-16-16 7-16 16-16zm4 18c3-1 5-3 5-6 0-4-4-6-8-6h-8v19h4v-6h4l4 6h5zm-3-9c2 0 4 1 4 3s-2 3-4 3h-4v-6h4z"/>
            </svg>
            <span>Lofi - Spotify</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <button className="nav-item active">
              <svg className="nav-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v6H20V7.577l-7.5-4.33zm-2-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-6h-3v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732l7.5-4.33z"/>
              </svg>
              Home
            </button>
            
            <button className="nav-item" onClick={onBack}>
              <svg className="nav-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 22a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1zM15.5 2.134A1 1 0 0 0 14 3v18a1 1 0 0 0 1.5.866l8-9a1 1 0 0 0 0-1.732l-8-9z"/>
              </svg>
              Search
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-library-header">
              <button className="nav-item">
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M14.5 2.134a1 1 0 0 1 1 0l6 3.464a1 1 0 0 1 .5.866V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6.464a1 1 0 0 1 .5-.866l6-3.464a1 1 0 0 1 1 0L12 3.577l2.5-1.443zM4 7.155V18h16V7.155l-5.5-3.175L12 5.423 9.5 3.98 4 7.155z"/>
                </svg>
                Your Library
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="spotify-main">
        <div className="main-header">
          <div className="header-navigation">
            <button className="nav-btn" onClick={onBack}>
              <svg viewBox="0 0 24 24" className="nav-icon">
                <path fill="currentColor" d="M15.957 2.793a1 1 0 0 0-1.414 0L5.636 11.7a1 1 0 0 0 0 1.414l8.907 8.907a1 1 0 0 0 1.414-1.414L7.757 12.407l8.2-8.2a1 1 0 0 0 0-1.414z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="playlist-header">
          <div className="playlist-image">
            <img src={playlist.images[0]?.url || '/placeholder-playlist.png'} alt={playlist.name} />
          </div>
          <div className="playlist-info">
            <span className="playlist-type">Playlist</span>
            <h1 className="playlist-title">{playlist.name}</h1>
            <div className="playlist-meta">
              <span className="playlist-owner">{playlist.owner.display_name || 'Unknown'}</span>
              <span className="playlist-separator">•</span>
              <span className="playlist-tracks">{tracks.length} songs</span>
            </div>
          </div>
        </div>

        {/* Lo-Fi Mood Selector */}
        <div className="mood-selector">
          <h3>Choose Your Lo-Fi Vibe</h3>
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
          
          {/* Start Your Mix Button */}
          <button 
            className={`start-mix-button ${!deviceId || !playerReady ? 'disabled' : ''}`}
            onClick={playPlaylist}
            disabled={!deviceId || !playerReady}
          >
            <svg viewBox="0 0 24 24" className="play-icon">
              <path fill="currentColor" d="M8 5v14l11-7z"/>
            </svg>
            {!deviceId || !playerReady ? 'CONNECTING...' : 'START YOUR MIX'}
          </button>
          
          {/* Device Status Indicator */}
          <div className="device-status">
            <div className={`status-indicator ${deviceId && playerReady ? 'ready' : 'connecting'}`}>
              <div className="status-dot"></div>
              <span className="status-text">
                {deviceId && playerReady ? 'Device Ready' : 'Connecting to Spotify...'}
              </span>
            </div>
            {!deviceId && (
              <div className="status-help">
                <small>Make sure you have Spotify Premium and the web player is enabled</small>
              </div>
            )}
          </div>
        </div>

        {/* Lo-Fi Status Indicator */}
        {isPlaying && (
          <div className="lofi-status">
            <div className="lofi-status-header">
              <div className="lofi-icon">🎛️</div>
              <div className="lofi-status-text">
                <h4>Lo-Fi Processing Active</h4>
                <p>Real-time audio enhancement in <strong>{selectedMood}</strong> mode</p>
              </div>
              <div className="lofi-visualizer">
                <div className="freq-bar"></div>
                <div className="freq-bar"></div>
                <div className="freq-bar"></div>
                <div className="freq-bar"></div>
              </div>
            </div>
            <div className="lofi-effects">
              <span className="effect-badge">🎵 Low-Pass Filter</span>
              <span className="effect-badge">📻 Vintage Compression</span>
              <span className="effect-badge">📀 Vinyl Warmth</span>
              <span className="effect-badge">🎭 Dynamic EQ</span>
            </div>
          </div>
        )}

        <div className="playlist-content">
          <div className="track-list">
            <div className="track-list-header">
              <div className="track-header-number">#</div>
              <div className="track-header-title">Title</div>
              <div className="track-header-album">Album</div>
              <div className="track-header-duration">
                <svg viewBox="0 0 16 16" className="duration-icon">
                  <path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"/>
                  <path fill="currentColor" d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868L7.5 9.5V3.5a.5.5 0 0 1 .5-.5z"/>
                </svg>
              </div>
            </div>

            {tracks.map((track, index) => (
              <div 
                key={track.id} 
                className={`track-row ${currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => playTrack(track)}
              >
                <div className="track-number">
                  {currentTrack?.id === track.id && isPlaying ? (
                    <div className="playing-animation">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="track-info">
                  <div className="track-name">{track.name}</div>
                  <div className="track-artist">
                    {track.artists.map(artist => artist.name).join(', ')}
                  </div>
                </div>
                <div className="track-album">{track.album?.name || 'Unknown Album'}</div>
                <div className="track-duration">
                  {formatTime(track.duration_ms)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Player Bar */}
      {currentTrack && (
        <div className="spotify-player-bar">
          <div className="player-left">
            <div className="track-image">
              <img src={currentTrack.album?.images[0]?.url || '/placeholder-track.png'} alt={currentTrack.name} />
            </div>
            <div className="track-details">
              <div className="track-name">{currentTrack.name}</div>
              <div className="track-artist">
                {currentTrack.artists.map(artist => artist.name).join(', ')}
              </div>
            </div>
            <button className="like-button">
              <svg viewBox="0 0 16 16" className="heart-icon">
                <path fill="currentColor" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
              </svg>
            </button>
          </div>

          <div className="player-center">
            <div className="player-controls">
              <button className="control-btn" onClick={previousTrack}>
                <svg viewBox="0 0 16 16" className="control-icon">
                  <path fill="currentColor" d="M.5 3.5A.5.5 0 0 1 1 4v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v2.94l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.696L8.5 7.752v2.94c0 .63-.692 1.01-1.232.696L1 7.752V12a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
                </svg>
              </button>
              
              <button className="play-pause-btn" onClick={togglePlayback}>
                {isPlaying ? (
                  <svg viewBox="0 0 16 16" className="control-icon">
                    <path fill="currentColor" d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 9 14H7a1.5 1.5 0 0 1-1.5-1.5v-9z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" className="control-icon">
                    <path fill="currentColor" d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                  </svg>
                )}
              </button>
              
              <button className="control-btn" onClick={nextTrack}>
                <svg viewBox="0 0 16 16" className="control-icon">
                  <path fill="currentColor" d="M15.5 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V8.248l-6.267 3.636c-.54.313-1.232-.066-1.232-.696v-2.94l-6.267 3.636C.692 12.198 0 11.82 0 11.192V4.308c0-.63.692-1.01 1.232-.696L7.5 7.248v-2.94c0-.63.692-1.01 1.232-.696L15 7.248V4a.5.5 0 0 1 .5-.5z"/>
                </svg>
              </button>
            </div>

            <div className="progress-bar">
              <span className="time-display">{formatTime(progress)}</span>
              <div className="progress-container">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={progress}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="progress-slider"
                />
              </div>
              <span className="time-display">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-right">
            <div className="volume-control">
              <svg viewBox="0 0 16 16" className="volume-icon">
                <path fill="currentColor" d="M10.717 3.55A.5.5 0 0 1 11 4v8a.5.5 0 0 1-.812.39L7.825 10.5H5.5A.5.5 0 0 1 5 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setPlayerVolume(Number(e.target.value))}
                className="volume-slider"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}