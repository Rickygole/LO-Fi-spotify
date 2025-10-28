// Spotify Web Playback SDK integration
export interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  getCurrentState(): Promise<SpotifyPlayerState | null>;
  getVolume(): Promise<number>;
  nextTrack(): Promise<void>;
  pause(): Promise<void>;
  previousTrack(): Promise<void>;
  resume(): Promise<void>;
  seek(position_ms: number): Promise<void>;
  setName(name: string): Promise<void>;
  setVolume(volume: number): Promise<void>;
  togglePlay(): Promise<void>;
  addListener(event: string, callback: Function): boolean;
  removeListener(event: string, callback?: Function): boolean;
}

export interface SpotifyPlayerState {
  context: {
    uri: string;
    metadata: any;
  };
  disallows: {
    pausing: boolean;
    peeking_next: boolean;
    peeking_prev: boolean;
    resuming: boolean;
    seeking: boolean;
    skipping_next: boolean;
    skipping_prev: boolean;
  };
  paused: boolean;
  position: number;
  repeat_mode: number;
  shuffle: boolean;
  track_window: {
    current_track: SpotifyTrack;
    next_tracks: SpotifyTrack[];
    previous_tracks: SpotifyTrack[];
  };
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: Array<{ name: string; uri: string }>;
  album: {
    name: string;
    uri: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
}

export interface WebPlaybackError {
  message: string;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

class SpotifyPlayerManager {
  private player: SpotifyPlayer | null = null;
  private deviceId: string | null = null;
  private accessToken: string | null = null;
  private isReady: boolean = false;
  private sdkReady: boolean = false;

  constructor() {
    this.setupSDK();
  }

  private setupSDK() {
    if (window.Spotify) {
      this.sdkReady = true;
      if (this.accessToken) {
        this.initializePlayer();
      }
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log('Spotify Web Playback SDK Ready');
        this.sdkReady = true;
        if (this.accessToken) {
          this.initializePlayer();
        }
      };
    }
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    // If SDK is ready and we have a token, initialize the player
    if (this.sdkReady && !this.player) {
      this.initializePlayer();
    }
  }

  private initializePlayer() {
    if (!this.accessToken) {
      console.error('Access token not set');
      return;
    }

    console.log('Initializing Spotify Player...');

    this.player = new window.Spotify.Player({
      name: 'Lo-Fi Spotify DJ',
      getOAuthToken: (callback) => {
        console.log('Providing OAuth token to player');
        callback(this.accessToken!);
      },
      volume: 0.7
    });

    // Error handling
    this.player.addListener('initialization_error', ({ message }: WebPlaybackError) => {
      console.error('Initialization Error:', message);
    });

    this.player.addListener('authentication_error', ({ message }: WebPlaybackError) => {
      console.error('Authentication Error:', message);
    });

    this.player.addListener('account_error', ({ message }: WebPlaybackError) => {
      console.error('Account Error:', message);
    });

    this.player.addListener('playback_error', ({ message }: WebPlaybackError) => {
      console.error('Playback Error:', message);
    });

    // Ready
    this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('✅ Spotify Player Ready with Device ID:', device_id);
      this.deviceId = device_id;
      this.isReady = true;
    });

    // Not Ready
    this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('❌ Device ID has gone offline:', device_id);
      this.isReady = false;
    });

    // Player state changes
    this.player.addListener('player_state_changed', (state: SpotifyPlayerState | null) => {
      if (!state) {
        console.log('Player state: No state (stopped)');
        return;
      }
      
      console.log('🎵 Player state changed:', {
        paused: state.paused,
        track: state.track_window.current_track?.name,
        position: state.position
      });
      
      // You can emit custom events here for the UI to listen to
      window.dispatchEvent(new CustomEvent('spotify-player-state-changed', { 
        detail: state 
      }));
    });

    // Connect to the player
    console.log('Connecting to Spotify Player...');
    this.player.connect();
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  isPlayerReady(): boolean {
    return this.isReady;
  }

  async play(uris?: string[], position?: number) {
    if (!this.deviceId || !this.accessToken) {
      throw new Error('Player not ready - no device ID or access token');
    }

    try {
      // First, transfer playback to this device
      await this.transferPlayback();
      
      // Wait a moment for transfer to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const endpoint = `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`;
      
      const body: any = {};
      if (uris && uris.length > 0) {
        body.uris = uris;
      }
      if (position !== undefined) {
        body.position_ms = position;
      }

      console.log('Starting playback with:', body);

      const response = await fetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorJson = await response.json();
          errorDetails = JSON.stringify(errorJson, null, 2);
          console.error('Playback failed with JSON error:', response.status, errorJson);
        } catch {
          errorDetails = await response.text();
          console.error('Playback failed with text error:', response.status, errorDetails);
        }
        throw new Error(`Failed to start playback: ${response.status} - ${errorDetails}`);
      }
      
      console.log('Playback started successfully');
    } catch (error) {
      console.error('Error in play method:', error);
      throw error;
    }
  }

  private async transferPlayback() {
    if (!this.deviceId || !this.accessToken) {
      throw new Error('Cannot transfer playback - missing device ID or token');
    }

    console.log('Transferring playback to device:', this.deviceId);

    // First, get current devices to see what's available
    try {
      const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        console.log('Available devices:', devicesData.devices);
        
        // Check if our device is in the list
        const ourDevice = devicesData.devices.find((d: any) => d.id === this.deviceId);
        if (ourDevice) {
          console.log('Our device found:', ourDevice);
        } else {
          console.warn('Our device not found in devices list');
        }
      }
    } catch (error) {
      console.warn('Could not fetch devices:', error);
    }

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      body: JSON.stringify({
        device_ids: [this.deviceId],
        play: false // Don't start playing immediately
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
    });

    if (!response.ok && response.status !== 404) {
      let errorDetails = 'Unknown error';
      try {
        const errorJson = await response.json();
        errorDetails = JSON.stringify(errorJson, null, 2);
        console.error('Transfer playback failed with JSON error:', response.status, errorJson);
      } catch {
        errorDetails = await response.text();
        console.error('Transfer playback failed with text error:', response.status, errorDetails);
      }
      throw new Error(`Failed to transfer playback: ${response.status} - ${errorDetails}`);
    }
    
    console.log('Playback transferred to device:', this.deviceId);
  }

  async pause() {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.pause();
  }

  async resume() {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.resume();
  }

  async nextTrack() {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.nextTrack();
  }

  async previousTrack() {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.previousTrack();
  }

  async setVolume(volume: number) {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.setVolume(volume);
  }

  async getCurrentState(): Promise<SpotifyPlayerState | null> {
    if (!this.player) throw new Error('Player not initialized');
    return await this.player.getCurrentState();
  }

  disconnect() {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.deviceId = null;
      this.isReady = false;
    }
  }
}

export const spotifyPlayer = new SpotifyPlayerManager();