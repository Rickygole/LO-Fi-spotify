import axios from 'axios';
import type { SpotifyTokens, SpotifyUser, SpotifyPlaylist, SpotifyTrack, AudioFeatures } from './types';
import { spotifyPlayer } from './spotify-player';

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
    
    // Initialize Spotify Player with the access token
    spotifyPlayer.setAccessToken(tokens.access_token);
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
        // Initialize player with stored token
        spotifyPlayer.setAccessToken(accessToken);
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

  // Get current access token
  getAccessToken(): string | null {
    return this.accessToken;
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
    // Check URL hash first (Spotify uses hash for implicit flow)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    
    // Also check URL search params as fallback
    const searchParams = new URLSearchParams(window.location.search);
    
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
    const expiresIn = hashParams.get('expires_in') || searchParams.get('expires_in');

    if (accessToken && expiresIn) {
      this.setTokens({
        access_token: accessToken,
        refresh_token: refreshToken || '', // refresh_token might not be provided in implicit flow
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

  // Check if user has Premium
  async checkPremiumStatus(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      console.log('User account info:', {
        id: user.id,
        product: user.product,
        country: user.country
      });
      return user.product === 'premium';
    } catch (error) {
      console.error('Failed to check Premium status:', error);
      return false;
    }
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

  // Start playback on a specific device
  async startPlayback(deviceId: string, trackUris: string[]): Promise<void> {
    try {
      console.log('🎵 Starting playback with device ID:', deviceId, 'tracks:', trackUris.length);
      
      // First, ensure device is active by transferring playback to it
      console.log('📱 Transferring playback to device...');
      await axios.put('https://api.spotify.com/v1/me/player', {
        device_ids: [deviceId],
        play: false
      }, {
        headers: this.getAuthHeader()
      });

      // Wait for the transfer to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify device is now active by checking current playback state
      try {
        const playbackResponse = await axios.get('https://api.spotify.com/v1/me/player', {
          headers: this.getAuthHeader()
        });
        
        if (playbackResponse.data?.device?.id !== deviceId) {
          console.log('🔄 Device not active yet, trying alternative approach...');
          
          // Alternative: Start playback without device transfer first
          await axios.put(`https://api.spotify.com/v1/me/player/play`, {
            uris: trackUris.slice(0, 1) // Start with just one track
          }, {
            headers: this.getAuthHeader()
          });
          
          // Wait a moment then transfer to our device
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await axios.put('https://api.spotify.com/v1/me/player', {
            device_ids: [deviceId],
            play: true
          }, {
            headers: this.getAuthHeader()
          });
          
          // Wait and then start our full playlist
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (stateError) {
        console.log('🔄 No current playback state, proceeding with direct playback...');
      }

      // Now start playing the tracks on our device
      console.log('▶️ Starting playback on device...');
      await axios.put(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        uris: trackUris
      }, {
        headers: this.getAuthHeader()
      });

      console.log('✅ Playback started successfully');
    } catch (error: any) {
      console.error('❌ Error starting playback:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        if (error.response.status === 404) {
          throw new Error('Device not found or not active. Please ensure the Spotify player is ready.');
        } else if (error.response.status === 403) {
          throw new Error('Premium account required for playback control.');
        } else if (error.response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
      }
      
      throw error;
    }
  }

  // Get Spotify Player instance
  getPlayer() {
    return spotifyPlayer;
  }
}

export const spotifyAPI = new SpotifyAPI();