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

  const moods: Array<{ id: LofiMood; name: string; icon: string; description: string }> = [
    { id: 'chill', name: 'Lo-Fi Chill', icon: '🌙', description: 'Dreamy and relaxed' },
    { id: 'cafe', name: 'Café Vibes', icon: '☕', description: 'Warm and cozy' },
    { id: 'study', name: 'Study Mode', icon: '📚', description: 'Focus and concentration' },
    { id: 'party', name: 'Party Flow', icon: '🎉', description: 'Upbeat and energetic' }
  ];

  useEffect(() => {
    loadPlaylistTracks();
  }, [playlist.id]);

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
      // Get audio features for better mixing
      const trackIds = tracks.slice(0, 20).map(track => track.id); // Limit for demo
      const audioFeatures = await spotifyAPI.getAudioFeatures(trackIds);
      
      console.log('Audio features loaded:', audioFeatures);
      console.log(`Starting lo-fi mix in ${selectedMood} mode with ${tracks.length} tracks`);
      
      // TODO: This is where we'll integrate Spotify Web Playback SDK
      // and Web Audio API for the actual lo-fi processing
      
    } catch (error) {
      console.error('Failed to analyze tracks:', error);
    } finally {
      setIsAnalyzing(false);
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
                ✨ Start Lo-Fi Mix
              </>
            )}
          </button>
          <p className="start-note">
            We'll analyze your tracks and create a seamless DJ-style mix with lo-fi filters
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