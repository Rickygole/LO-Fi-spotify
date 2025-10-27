import { useState, useEffect } from 'react';
import { spotifyAPI } from '../spotify-api';
import type { SpotifyPlaylist, SpotifyUser } from '../types';
import './PlaylistSelector.css';

interface PlaylistSelectorProps {
  onPlaylistSelect: (playlist: SpotifyPlaylist) => void;
  onLogout: () => void;
}

export function PlaylistSelector({ onPlaylistSelect, onLogout }: PlaylistSelectorProps) {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user info and playlists in parallel
      const [userResponse, playlistsResponse] = await Promise.all([
        spotifyAPI.getCurrentUser(),
        spotifyAPI.getPlaylists()
      ]);

      setUser(userResponse);
      setPlaylists(playlistsResponse);
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError('Failed to load your Spotify data. Please try logging in again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    spotifyAPI.clearTokens();
    onLogout();
  };

  if (loading) {
    return (
      <div className="spotify-app">
        <div className="main-view">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your Spotify playlists...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spotify-app">
        <div className="main-view">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={handleLogout} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spotify-app">
      {/* Top bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="nav-buttons">
            <button className="nav-button" disabled>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.03.47a.75.75 0 0 1 0 1.06L4.56 8l6.47 6.47a.75.75 0 1 1-1.06 1.06L2.44 8 9.97.47a.75.75 0 0 1 1.06 0z"/>
              </svg>
            </button>
            <button className="nav-button" disabled>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.97.47a.75.75 0 0 0 0 1.06L11.44 8l-6.47 6.47a.75.75 0 1 0 1.06 1.06L13.56 8 6.03.47a.75.75 0 0 0-1.06 0z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="top-bar-right">
          <div className="user-menu">
            <button className="user-button" onClick={handleLogout}>
              {user?.images?.[0] && (
                <img 
                  src={user.images[0].url} 
                  alt={user.display_name} 
                  className="user-avatar"
                />
              )}
              <span className="user-name">{user?.display_name}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 6l5 5.794L13 6z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-view">
        <div className="content-spacing">
          <div className="section-header">
            <h1>Choose a playlist for Lo-Fi transformation</h1>
            <p className="section-description">
              Select any playlist to transform it into a seamless lo-fi DJ mix
            </p>
          </div>

          {playlists.length === 0 ? (
            <div className="empty-state">
              <p>No playlists found. Create some playlists in Spotify and refresh!</p>
              <button onClick={loadUserData} className="refresh-button">
                Refresh
              </button>
            </div>
          ) : (
            <div className="playlist-grid">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="playlist-card"
                  onClick={() => onPlaylistSelect(playlist)}
                >
                  <div className="playlist-image-container">
                    {playlist.images?.[0] ? (
                      <img 
                        src={playlist.images[0].url} 
                        alt={playlist.name}
                        className="playlist-image"
                      />
                    ) : (
                      <div className="playlist-placeholder">
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
                          <path d="M25.6 11.2c-7.04 0-12.8 5.76-12.8 12.8v32c0 7.04 5.76 12.8 12.8 12.8h28.8c7.04 0 12.8-5.76 12.8-12.8V24c0-7.04-5.76-12.8-12.8-12.8H25.6zm22.4 32a6.4 6.4 0 1 1-12.8 0 6.4 6.4 0 0 1 12.8 0z"/>
                        </svg>
                      </div>
                    )}
                    <div className="play-button-overlay">
                      <div className="play-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.4 5.5c-.4-.2-.9-.2-1.2.2-.3.3-.4.7-.2 1.1l6.8 11.9c.2.4.7.6 1.1.4.4-.2.6-.7.4-1.1L7.4 5.5z"/>
                          <path d="M8 5.5v13l10.5-6.5L8 5.5z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="playlist-info">
                    <h3 className="playlist-name">{playlist.name}</h3>
                    <p className="playlist-description">
                      {playlist.description || `${playlist.tracks.total} songs • by ${playlist.owner.display_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}