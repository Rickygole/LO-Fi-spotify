/// <reference path="./spotify-types.d.ts" />
import type { SpotifyTrack, LofiMood } from './types';

interface RealLoFiState {
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  mood: LofiMood;
  volume: number;
  lofiIntensity: number;
}

export class RealLoFiPlayer {
  private state: RealLoFiState;
  private spotifyPlayer: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;

  constructor() {
    this.state = {
      isPlaying: false,
      currentTrack: null,
      mood: 'chill',
      volume: 0.7,
      lofiIntensity: 0.8
    };
  }

  async initialize(accessToken: string): Promise<boolean> {
    try {
      console.log('🎵 Initializing Real Lo-Fi Player with Spotify Web Playback SDK...');
      
      // Initialize Spotify Web Playback SDK
      if (!window.Spotify) {
        throw new Error('Spotify Web Playback SDK not loaded');
      }

      this.spotifyPlayer = new window.Spotify.Player({
        name: 'Lo-Fi Spotify Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken);
        },
        volume: this.state.volume
      });

      // Set up event listeners
      this.setupSpotifyListeners();

      // Connect to Spotify
      const success = await this.spotifyPlayer.connect();
      if (!success) {
        throw new Error('Failed to connect to Spotify');
      }

      // Initialize Web Audio API for lo-fi effects
      await this.initializeAudioEffects();

      console.log('✅ Real Lo-Fi Player initialized successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Real Lo-Fi Player:', error);
      return false;
    }
  }

  private setupSpotifyListeners(): void {
    if (!this.spotifyPlayer) return;

    // Ready
    this.spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('🎵 Spotify Player Ready with Device ID:', device_id);
      this.deviceId = device_id;
    });

    // Not Ready
    this.spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('❌ Spotify Player Not Ready:', device_id);
    });

    // Player state changed
    this.spotifyPlayer.addListener('player_state_changed', (state: Spotify.WebPlaybackState | null) => {
      if (!state) return;

      this.state.isPlaying = !state.paused;
      
      if (state.track_window.current_track) {
        this.state.currentTrack = {
          id: state.track_window.current_track.id,
          name: state.track_window.current_track.name,
          artists: state.track_window.current_track.artists.map((artist: { name: string; uri: string }) => ({
            id: artist.uri.split(':')[2],
            name: artist.name
          })),
          duration_ms: state.track_window.current_track.duration_ms,
          preview_url: null // Not needed for Web Playback SDK
        };
      }

      console.log('🎵 Now Playing:', this.state.currentTrack?.name);
    });
  }

  private async initializeAudioEffects(): Promise<void> {
    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create audio processing chain for lo-fi effects
      this.gainNode = this.audioContext.createGain();
      this.filterNode = this.audioContext.createBiquadFilter();
      this.compressorNode = this.audioContext.createDynamicsCompressor();

      // Configure lo-fi effects
      this.setupLoFiEffects();

      // Connect the audio chain
      // Note: We'll need to intercept Spotify's audio output
      // This is a simplified setup - real implementation would need audio routing
      
      console.log('🎛️ Lo-Fi audio effects initialized');
    } catch (error) {
      console.error('Failed to initialize audio effects:', error);
    }
  }

  private setupLoFiEffects(): void {
    if (!this.filterNode || !this.compressorNode || !this.gainNode) return;

    // Lo-Fi Low-pass filter (removes high frequencies)
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(4000, this.audioContext!.currentTime);
    this.filterNode.Q.setValueAtTime(0.7, this.audioContext!.currentTime);

    // Compression for vintage sound
    this.compressorNode.threshold.setValueAtTime(-24, this.audioContext!.currentTime);
    this.compressorNode.knee.setValueAtTime(30, this.audioContext!.currentTime);
    this.compressorNode.ratio.setValueAtTime(12, this.audioContext!.currentTime);
    this.compressorNode.attack.setValueAtTime(0.003, this.audioContext!.currentTime);
    this.compressorNode.release.setValueAtTime(0.25, this.audioContext!.currentTime);

    // Overall gain
    this.gainNode.gain.setValueAtTime(0.8, this.audioContext!.currentTime);
  }

  async startLoFiMix(tracks: SpotifyTrack[], mood: LofiMood): Promise<boolean> {
    try {
      if (!this.spotifyPlayer || !this.deviceId) {
        throw new Error('Spotify player not ready');
      }

      console.log(`🎛️ Starting Real Lo-Fi Mix with ${tracks.length} tracks in ${mood} mode...`);
      
      this.state.mood = mood;

      // Apply mood-specific lo-fi settings
      this.applyMoodSettings(mood);

      // Create a queue of track URIs
      const trackUris = tracks.map(track => `spotify:track:${track.id}`);

      // Transfer playback to our device and start playing
      await this.transferPlaybackAndPlay(trackUris);

      console.log('✅ Real Lo-Fi Mix started successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to start Real Lo-Fi Mix:', error);
      return false;
    }
  }

  private async transferPlaybackAndPlay(trackUris: string[]): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Transfer playback to our device
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [this.deviceId],
          play: false
        })
      });

      // Start playing the first track
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: trackUris
        })
      });

      this.state.isPlaying = true;
    } catch (error) {
      console.error('Failed to transfer playback:', error);
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      // Try to get token from backend session first
      const response = await fetch('http://localhost:3000/api/token', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      }
      
      // Fallback to localStorage
      const storedToken = localStorage.getItem('spotify_access_token');
      if (storedToken) {
        return storedToken;
      }
      
      throw new Error('No access token found');
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw error;
    }
  }

  private applyMoodSettings(mood: LofiMood): void {
    if (!this.filterNode || !this.compressorNode || !this.audioContext) return;

    const currentTime = this.audioContext.currentTime;

    switch (mood) {
      case 'chill':
        // Warm, dreamy lo-fi
        this.filterNode.frequency.setValueAtTime(3500, currentTime);
        this.compressorNode.ratio.setValueAtTime(8, currentTime);
        break;
      case 'study':
        // Focused, clear lo-fi
        this.filterNode.frequency.setValueAtTime(5000, currentTime);
        this.compressorNode.ratio.setValueAtTime(6, currentTime);
        break;
      case 'cafe':
        // Warm, cozy lo-fi
        this.filterNode.frequency.setValueAtTime(4000, currentTime);
        this.compressorNode.ratio.setValueAtTime(10, currentTime);
        break;
      case 'party':
        // Upbeat lo-fi
        this.filterNode.frequency.setValueAtTime(6000, currentTime);
        this.compressorNode.ratio.setValueAtTime(4, currentTime);
        break;
    }

    console.log(`🎛️ Applied ${mood} lo-fi settings`);
  }

  async pause(): Promise<void> {
    if (this.spotifyPlayer) {
      await this.spotifyPlayer.pause();
    }
  }

  async resume(): Promise<void> {
    if (this.spotifyPlayer) {
      await this.spotifyPlayer.resume();
    }
  }

  async nextTrack(): Promise<void> {
    if (this.spotifyPlayer) {
      await this.spotifyPlayer.nextTrack();
    }
  }

  async previousTrack(): Promise<void> {
    if (this.spotifyPlayer) {
      await this.spotifyPlayer.previousTrack();
    }
  }

  async setVolume(volume: number): Promise<void> {
    this.state.volume = volume;
    if (this.spotifyPlayer) {
      await this.spotifyPlayer.setVolume(volume);
    }
  }

  getState(): RealLoFiState {
    return { ...this.state };
  }

  disconnect(): void {
    if (this.spotifyPlayer) {
      this.spotifyPlayer.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Create singleton instance
export const realLoFiPlayer = new RealLoFiPlayer();