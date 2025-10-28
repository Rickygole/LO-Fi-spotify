import { useState, useEffect } from 'react';
import { spotifyAPI } from '../spotify-api';
import { aiLoFiPlayer } from '../ai-lofi-player';
import type { SpotifyPlaylist, SpotifyTrack, LofiMood } from '../types';
import './LofiPlayer.css';

interface AILofiPlayerProps {
  playlist: SpotifyPlaylist;
  onBack: () => void;
}

export function AILofiPlayer({ playlist, onBack }: AILofiPlayerProps) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<LofiMood>('chill');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [trackInfo, setTrackInfo] = useState<string>('');
  const [aiInsights, setAiInsights] = useState<string>('');

  const moods: Array<{ id: LofiMood; name: string; icon: string; description: string }> = [
    { id: 'chill', name: 'AI Chill', icon: '🤖', description: 'AI-curated dreamy vibes' },
    { id: 'cafe', name: 'AI Café', icon: '🧠', description: 'Intelligent cozy atmosphere' },
    { id: 'study', name: 'AI Focus', icon: '📊', description: 'Data-driven concentration' },
    { id: 'party', name: 'AI Energy', icon: '⚡', description: 'Algorithm-powered beats' }
  ];

  useEffect(() => {
    loadPlaylistTracks();
    initializeAIPlayer();

    return () => {
      aiLoFiPlayer.disconnect();
    };
  }, []);

  const loadPlaylistTracks = async () => {
    try {
      const playlistTracks = await spotifyAPI.getPlaylistTracks(playlist.id);
      setTracks(playlistTracks);
      setTrackInfo(`${playlistTracks.length} tracks loaded for AI analysis`);
    } catch (error) {
      console.error('Failed to load playlist tracks:', error);
      setTrackInfo('Failed to load tracks');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeAIPlayer = async () => {
    try {
      setIsInitializing(true);
      setTrackInfo('🤖 Initializing AI DJ Engine...');
      
      const accessToken = getAccessTokenFromURL() || localStorage.getItem('spotify_access_token');
      
      if (!accessToken) {
        setTrackInfo('❌ No access token found. Please login with Spotify Premium.');
        setIsInitializing(false);
        return;
      }

      const initializePlayer = async () => {
        try {
          const success = await aiLoFiPlayer.initialize(accessToken);
          if (success) {
            setPlayerReady(true);
            setTrackInfo('✅ AI DJ Engine ready! Premium account detected.');
          } else {
            setTrackInfo('❌ Failed to initialize AI DJ. Premium required.');
          }
        } catch (error) {
          console.error('AI Player initialization error:', error);
          setTrackInfo('❌ AI DJ initialization failed. Check Premium subscription.');
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
      console.error('Failed to initialize AI player:', error);
      setTrackInfo('❌ Failed to initialize AI DJ');
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

  const startAIMix = async () => {
    if (tracks.length === 0) {
      alert('Please wait for tracks to load first');
      return;
    }

    if (!playerReady) {
      alert('AI DJ not ready yet. Please wait...');
      return;
    }

    setIsInitializing(true);
    setTrackInfo('🤖 AI analyzing tracks and creating optimal mix...');

    try {
      const success = await aiLoFiPlayer.startAIMix(tracks, selectedMood);
      
      if (success) {
        setIsPlaying(true);
        setTrackInfo('🎛️ AI DJ Mix Active - Learning your preferences');
        
        // Update UI with AI insights
        const updateAIStatus = () => {
          const state = aiLoFiPlayer.getState();
          setCurrentTrack(state.currentTrack);
          setIsPlaying(state.isPlaying);
          setAiInsights(aiLoFiPlayer.getAIInsights());
        };
        
        updateAIStatus();
        setInterval(updateAIStatus, 2000);
        
        console.log('✅ AI DJ Mix started successfully!');
      } else {
        setTrackInfo('❌ Failed to start AI DJ Mix');
      }
    } catch (error) {
      console.error('Failed to start AI Mix:', error);
      setTrackInfo('❌ AI DJ Mix failed to start');
    } finally {
      setIsInitializing(false);
    }
  };

  const handlePause = async () => {
    if (isPlaying) {
      await aiLoFiPlayer.pause();
      setIsPlaying(false);
      setTrackInfo('⏸️ AI Mix Paused');
    } else {
      await aiLoFiPlayer.resume();
      setIsPlaying(true);
      setTrackInfo('▶️ AI Mix Resumed');
    }
  };

  const handleNext = async () => {
    await aiLoFiPlayer.nextTrack();
    setTrackInfo('⏭️ AI selecting next optimal track');
  };

  if (isLoading) {
    return (
      <div className="lofi-player">
        <div className="loading-container">
          <div className="vinyl-loader"></div>
          <p>Loading tracks for AI analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lofi-player ai-theme">
      <div className="player-header">
        <button onClick={onBack} className="back-button">
          ← Back to Playlists
        </button>
        <h2>🤖 AI DJ: {playlist.name}</h2>
        <p className="playlist-description">Intelligent lo-fi mixing with real-time AI decisions</p>
      </div>

      <div className="playlist-info">
        <div className="playlist-details">
          <img src={playlist.images[0]?.url} alt={playlist.name} className="playlist-image" />
          <div className="track-count">
            <span className="count">{tracks.length}</span>
            <span className="label">tracks</span>
            <div className="ai-badge">🧠 AI Analyzed</div>
          </div>
        </div>
      </div>

      <div className="controls-section">
        {/* AI Mood Selection */}
        <div className="mood-section">
          <h3>🤖 Choose AI Mood Algorithm</h3>
          <div className="mood-grid">
            {moods.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                className={`mood-card ai-mood ${selectedMood === mood.id ? 'selected' : ''}`}
              >
                <div className="mood-icon">{mood.icon}</div>
                <div className="mood-name">{mood.name}</div>
                <div className="mood-description">{mood.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Start Button */}
        <div className="start-section">
          {!isPlaying ? (
            <div>
              <button 
                onClick={startAIMix}
                className="start-button ai-dj-start"
                disabled={isInitializing || tracks.length === 0 || !playerReady}
              >
                {isInitializing ? (
                  <>
                    <div className="button-spinner"></div>
                    🤖 AI Analyzing Tracks...
                  </>
                ) : !playerReady ? (
                  <>
                    ⚠️ AI DJ Not Ready - Check Premium
                  </>
                ) : (
                  <>
                    🤖 Start AI DJ Mix
                  </>
                )}
              </button>
              <p className="start-description">
                AI analyzes tempo, key, energy & mood for perfect transitions
              </p>
            </div>
          ) : (
            <div className="playing-controls ai-controls">
              <div className="now-playing ai-playing">
                <div className="track-info">
                  {currentTrack && (
                    <>
                      <div className="track-name">{currentTrack.name}</div>
                      <div className="artist-name">{currentTrack.artists[0]?.name}</div>
                    </>
                  )}
                </div>
                <div className="ai-status">
                  <div className="ai-indicator">🤖 AI DJ Active</div>
                  <div className="ai-insights">{aiInsights}</div>
                </div>
              </div>
              
              <div className="control-buttons">
                <button onClick={handlePause} className="control-btn primary ai-btn">
                  {isPlaying ? '⏸️ Pause AI' : '▶️ Resume AI'}
                </button>
                <button onClick={handleNext} className="control-btn ai-btn">
                  ⏭️ AI Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Status */}
        <div className="status-section ai-status-section">
          <div className="status-text">{trackInfo}</div>
        </div>
      </div>

      {/* AI Track Analysis Preview */}
      <div className="track-preview ai-preview">
        <h4>🧠 AI Track Analysis Preview</h4>
        <div className="track-list">
          {tracks.slice(0, 5).map((track, index) => (
            <div key={track.id} className="track-item ai-track">
              <span className="track-number">{index + 1}</span>
              <span className="track-name">{track.name}</span>
              <span className="track-artist">{track.artists[0]?.name}</span>
              <span className="ai-score">🧠 Analyzing...</span>
            </div>
          ))}
          {tracks.length > 5 && (
            <div className="track-item more ai-more">
              <span>... and {tracks.length - 5} more tracks being analyzed by AI</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}