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