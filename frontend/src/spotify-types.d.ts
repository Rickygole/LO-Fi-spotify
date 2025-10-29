/// <reference types="vite/client" />

// Spotify Web Playback SDK global declarations
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
    addListener(
      event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
      listener: (error: { message: string }) => void
    ): void;
    connect(): Promise<boolean>;
    disconnect(): void;
    pause(): Promise<void>;
    resume(): Promise<void>;
    nextTrack(): Promise<void>;
    previousTrack(): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getCurrentState(): Promise<WebPlaybackState | null>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    seek(position_ms: number): Promise<void>;
  }

  interface WebPlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: WebPlaybackTrack;
      previous_tracks: WebPlaybackTrack[];
      next_tracks: WebPlaybackTrack[];
    };
  }

  interface WebPlaybackTrack {
    id: string;
    name: string;
    artists: Array<{ name: string; uri: string }>;
    album: {
      name: string;
      images: Array<{ url: string; height: number; width: number }>;
    };
    duration_ms: number;
    uri: string;
  }
}

export {};