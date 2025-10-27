import axios from 'axios';
import type { SpotifyTokens, SpotifyUser, SpotifyPlaylist, SpotifyTrack, AudioFeatures } from './types';

const API_BASE_URL = 'http://127.0.0.1:3000';

class SpotifyAPI {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  // Set tokens after authentication
  setTokens(tokens: SpotifyTokens) {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    
    // Store in localStorage for persistence
    localStorage.setItem('spotify_access_token', tokens.access_token);
    localStorage.setItem('spotify_refresh_token', tokens.refresh_token);
    localStorage.setItem('spotify_expires_at', (Date.now() + tokens.expires_in * 1000).toString());
  }

  // Load tokens from localStorage
  loadTokensFromStorage() {
    const accessToken = localStorage.getItem('spotify_access_token');
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    const expiresAt = localStorage.getItem('spotify_expires_at');

    if (accessToken && refreshToken && expiresAt) {
      const now = Date.now();
      if (now < parseInt(expiresAt)) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        return true;
      } else {
        // Token expired, try to refresh
        this.refreshAccessToken();
      }
    }
    return false;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Clear tokens (logout)
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_expires_at');
  }

  // Redirect to Spotify login
  login() {
    window.location.href = `${API_BASE_URL}/login`;
  }

  // Handle OAuth callback
  handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const expiresIn = urlParams.get('expires_in');

    if (accessToken && refreshToken && expiresIn) {
      this.setTokens({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: parseInt(expiresIn)
      });

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
    return false;
  }

  // Refresh access token
  async refreshAccessToken() {
    if (!this.refreshToken) return false;

    try {
      const response = await axios.post(`${API_BASE_URL}/refresh_token`, {
        refresh_token: this.refreshToken
      });

      const { access_token, expires_in } = response.data;
      this.setTokens({
        access_token,
        refresh_token: this.refreshToken,
        expires_in
      });
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.clearTokens();
      return false;
    }
  }

  // Get authorization header
  private getAuthHeader() {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  // Get current user info
  async getCurrentUser(): Promise<SpotifyUser> {
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: this.getAuthHeader()
    });
    return response.data;
  }

  // Get user's playlists
  async getPlaylists(): Promise<SpotifyPlaylist[]> {
    const response = await axios.get(`${API_BASE_URL}/playlists`, {
      headers: this.getAuthHeader()
    });
    return response.data.items;
  }

  // Get playlist tracks
  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    const response = await axios.get(`${API_BASE_URL}/playlist/${playlistId}/tracks`, {
      headers: this.getAuthHeader()
    });
    return response.data.items.map((item: any) => item.track);
  }

  // Get audio features for tracks
  async getAudioFeatures(trackIds: string[]): Promise<AudioFeatures[]> {
    const ids = trackIds.join(',');
    const response = await axios.get(`${API_BASE_URL}/audio-features/${ids}`, {
      headers: this.getAuthHeader()
    });
    return response.data.audio_features;
  }
}

export const spotifyAPI = new SpotifyAPI();