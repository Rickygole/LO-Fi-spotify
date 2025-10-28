// Types for our application
export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  product?: string; // 'premium' or 'free'
  country?: string;
  images: Array<{ url: string; height: number; width: number }>;
  followers?: { total: number };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string; height: number; width: number }>;
  tracks: {
    total: number;
    items?: Array<{
      track: SpotifyTrack;
    }>;
  };
  owner: {
    display_name: string;
  };
}

export interface SpotifyTrack {
  id: string;
  uri?: string;
  name: string;
  artists: Array<{ 
    id?: string; 
    name: string;
    uri?: string;
  }>;
  album?: {
    id?: string;
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  preview_url: string | null;
}

export interface AudioFeatures {
  id: string;
  tempo: number;
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  key: number;
  mode: number;
}

export type LofiMood = 'chill' | 'cafe' | 'study' | 'party';

// Spotify Web Playback SDK types
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => Spotify.Player;
    };
  }
}

declare namespace Spotify {
  interface Player {
    addListener(
      event: 'ready' | 'not_ready',
      listener: (data: { device_id: string }) => void
    ): void;
    addListener(
      event: 'player_state_changed',
      listener: (state: WebPlaybackState | null) => void
    ): void;
    connect(): Promise<boolean>;
    disconnect(): void;
    pause(): Promise<void>;
    resume(): Promise<void>;
    nextTrack(): Promise<void>;
    previousTrack(): Promise<void>;
    setVolume(volume: number): Promise<void>;
  }

  interface WebPlaybackState {
    paused: boolean;
    track_window: {
      current_track: WebPlaybackTrack;
    };
  }

  interface WebPlaybackTrack {
    id: string;
    name: string;
    artists: Array<{ name: string; uri: string }>;
    duration_ms: number;
  }
}