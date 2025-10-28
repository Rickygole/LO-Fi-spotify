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
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<LofiMood>('chill');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTrackDemo, setCurrentTrackDemo] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const moods: Array<{ id: LofiMood; name: string; icon: string; description: string }> = [
    { id: 'chill', name: 'Lo-Fi Chill', icon: '🌙', description: 'Dreamy and relaxed' },
    { id: 'cafe', name: 'Café Vibes', icon: '☕', description: 'Warm and cozy' },
    { id: 'study', name: 'Study Mode', icon: '📚', description: 'Focus and concentration' },
    { id: 'party', name: 'Party Flow', icon: '🎉', description: 'Upbeat and energetic' }
  ];

  useEffect(() => {
    loadPlaylistTracks();
    
    // Check if Spotify SDK is available
    console.log('Spotify SDK available:', !!window.Spotify);
    console.log('SDK ready callback set:', !!window.onSpotifyWebPlaybackSDKReady);
    
    checkPlayerReady();
  }, [playlist.id]);

  const checkPlayerReady = () => {
    const player = spotifyAPI.getPlayer();
    const ready = player.isPlayerReady();
    console.log('Checking player ready status:', ready);
    console.log('Player device ID:', player.getDeviceId());
    setPlayerReady(ready);
    
    // For Premium accounts, we should try to initialize even if not immediately ready
    if (!ready) {
      const attempts = (window as any).playerCheckAttempts || 0;
      (window as any).playerCheckAttempts = attempts + 1;
      
      // Try for longer for Premium accounts (60 seconds)
      if (attempts < 30) { 
        setTimeout(checkPlayerReady, 2000);
      } else {
        console.log('Player initialization timeout - trying to force init');
        // Force try to initialize player one more time
        try {
          spotifyAPI.getPlayer();
          setTimeout(() => {
            const finalReady = spotifyAPI.getPlayer().isPlayerReady();
            console.log('Final player ready check:', finalReady);
            setPlayerReady(finalReady);
          }, 3000);
        } catch (error) {
          console.error('Player initialization failed:', error);
        }
      }
    } else {
      (window as any).playerCheckAttempts = 0;
    }
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

  const startLofiMix = async () => {
    if (tracks.length === 0) return;
    
    setIsAnalyzing(true);
    
    try {
      const player = spotifyAPI.getPlayer();
      
      console.log('Starting Premium Spotify playback...');
      
      // Get audio features for better mixing
      console.log('Loading audio features for tracks...');
      const trackIds = tracks.slice(0, 20).map(track => track.id);
      const audioFeatures = await spotifyAPI.getAudioFeatures(trackIds);
      
      console.log('Audio features loaded:', audioFeatures);
      console.log(`Starting lo-fi mix in ${selectedMood} mode with ${tracks.length} tracks`);
      
      // Create URIs for the tracks
      const trackUris = tracks.map(track => track.uri);
      console.log('Track URIs:', trackUris.slice(0, 5));
      
      // Start playback using the Spotify Web Playback SDK
      console.log('Attempting to start Premium playback...');
      await player.play(trackUris);
      
      console.log('Premium playback started successfully!');
      setIsPlaying(true);
      
    } catch (error) {
      console.error('Failed to start playback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start Premium playback: ${errorMessage}. Make sure you have Spotify Premium and try again.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

    const togglePlayback = async () => {
    try {
      const player = spotifyAPI.getPlayer();
      const state = await player.getCurrentState();
      
      if (state?.paused) {
        await player.resume();
        setIsPlaying(true);
      } else {
        await player.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  const startDemoProgress = () => {
    setPlaybackProgress(0);
    const interval = setInterval(() => {
      setPlaybackProgress(prev => {
        if (prev >= 100) {
          // Auto advance to next track
          setCurrentTrackDemo(prevTrack => {
            const nextTrack = (prevTrack + 1) % Math.min(tracks.length, 10);
            console.log(`🎵 Demo: Advancing to track ${nextTrack + 1}: ${tracks[nextTrack]?.name}`);
            return nextTrack;
          });
          return 0;
        }
        return prev + 1; // 1% per second = ~100 second tracks
      });
    }, 1000);
    
    // Store interval for cleanup
    (window as any).demoInterval = interval;
  };

  const toggleDemoPlayback = () => {
    if (isPlaying) {
      console.log('⏸️ Demo: Pausing playback');
      clearInterval((window as any).demoInterval);
      setIsPlaying(false);
    } else {
      console.log('▶️ Demo: Resuming playback');
      startDemoProgress();
      setIsPlaying(true);
    }
  };

  const nextDemoTrack = () => {
    setCurrentTrackDemo(prev => {
      const next = (prev + 1) % Math.min(tracks.length, 10);
      console.log(`⏭️ Demo: Skipping to track ${next + 1}: ${tracks[next]?.name}`);
      return next;
    });
    setPlaybackProgress(0);
  };

  const togglePlayback = async () => {
    try {
      const player = spotifyAPI.getPlayer();
      const state = await player.getCurrentState();
      
      if (state?.paused) {
        await player.resume();
        setIsPlaying(true);
      } else {
        await player.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
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
                onClick={() => setSelectedMood(mood.id)}
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
                onClick={startLofiMix}
                className="start-button"
                disabled={isAnalyzing || tracks.length === 0}
              >
                {isAnalyzing ? (
                  <>
                    <div className="button-spinner"></div>
                    Analyzing tracks...
                  </>
                ) : (
                  <>
                    Start Lo-Fi Mix
                  </>
                )}
              </button>
              
              <button 
                onClick={async () => {
                  console.log('Force Premium mode clicked');
                  setIsAnalyzing(true);
                  try {
                    const player = spotifyAPI.getPlayer();
                    console.log('Forcing Premium playback...');
                    
                    const trackIds = tracks.slice(0, 20).map(track => track.id);
                    const audioFeatures = await spotifyAPI.getAudioFeatures(trackIds);
                    console.log('Audio features loaded for Premium mode');
                    
                    const trackUris = tracks.map(track => track.uri);
                    await player.play(trackUris);
                    
                    setIsPlaying(true);
                    setDemoMode(false);
                    console.log('Premium playback forced successfully!');
                  } catch (error) {
                    console.error('Force Premium failed:', error);
                  } finally {
                    setIsAnalyzing(false);
                  }
                }}
                style={{
                  background: '#1db954',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  marginTop: '10px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Force Premium Playback
              </button>
            </div>
          ) : (
            <div className="playback-controls">
              <button onClick={demoMode ? toggleDemoPlayback : togglePlayback} className="control-button">
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>
              <button onClick={demoMode ? nextDemoTrack : () => spotifyAPI.getPlayer().nextTrack()} className="control-button">
                ⏭️ Next
              </button>
              {demoMode && (
                <div className="demo-indicator">
                  <span style={{color: '#ff6b6b', fontSize: '0.9rem'}}>
                    🎧 Demo Mode - Upgrade to Premium for playback
                  </span>
                </div>
              )}
            </div>
          )}
          
          <p className="start-note">
            {demoMode 
              ? `🎵 Now playing: ${tracks[currentTrackDemo]?.name || 'Demo Track'} (${Math.round(playbackProgress)}%)`
              : !playerReady 
                ? 'Ready to start your lo-fi journey...' 
                : 'We\'ll analyze your tracks and create a seamless DJ-style mix with lo-fi filters'
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