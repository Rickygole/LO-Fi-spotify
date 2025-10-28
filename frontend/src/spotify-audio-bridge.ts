// Bridge between Spotify Web Playback SDK and Web Audio API
export class SpotifyAudioBridge {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrackUrl: string | null = null;
  private accessToken: string | null = null;

  constructor() {
    this.setupAudioElement();
  }

  private setupAudioElement() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'metadata';
    this.audioElement.style.display = 'none';
    this.audioElement.volume = 0.8;
    
    // Add to DOM for Web Audio API access
    document.body.appendChild(this.audioElement);
    
    // Store reference globally for lo-fi processor
    (window as any).spotifyAudioElement = this.audioElement;
    
    console.log('🎵 Spotify audio bridge element created');
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.audioElement;
  }

  async playTrackPreview(trackId: string): Promise<boolean> {
    if (!this.accessToken) {
      console.error('No access token for track preview');
      return false;
    }

    try {
      // Get track details including preview URL
      const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch track: ${response.status}`);
      }

      const track = await response.json();
      
      if (track.preview_url && this.audioElement) {
        console.log(`🎵 Playing preview for: ${track.name} by ${track.artists[0]?.name}`);
        
        this.currentTrackUrl = track.preview_url;
        this.audioElement.src = track.preview_url;
        
        try {
          await this.audioElement.play();
          return true;
        } catch (playError) {
          console.error('Failed to play preview:', playError);
          
          // Try with user interaction
          if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
            console.log('Need user interaction to play audio');
            return false;
          }
        }
      } else {
        console.warn('No preview URL available for this track');
        return false;
      }
    } catch (error) {
      console.error('Error playing track preview:', error);
    }
    
    return false;
  }

  async playTrackList(trackIds: string[]): Promise<void> {
    if (!trackIds.length) return;
    
    let currentIndex = 0;
    
    const playNext = async () => {
      if (currentIndex >= trackIds.length) {
        currentIndex = 0; // Loop back to beginning
      }
      
      const success = await this.playTrackPreview(trackIds[currentIndex]);
      
      if (success && this.audioElement) {
        // Set up listener for when track ends
        this.audioElement.onended = () => {
          currentIndex++;
          playNext();
        };
      } else {
        // Skip to next track if preview not available
        currentIndex++;
        setTimeout(playNext, 1000);
      }
    };
    
    await playNext();
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  resume() {
    if (this.audioElement) {
      this.audioElement.play().catch(console.error);
    }
  }

  setVolume(volume: number) {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  getDuration(): number {
    return this.audioElement?.duration || 0;
  }

  isPaused(): boolean {
    return this.audioElement?.paused ?? true;
  }

  cleanup() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.remove();
      this.audioElement = null;
    }
    
    if ((window as any).spotifyAudioElement) {
      delete (window as any).spotifyAudioElement;
    }
  }
}

export const spotifyAudioBridge = new SpotifyAudioBridge();