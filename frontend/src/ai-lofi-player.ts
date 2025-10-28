import type { SpotifyTrack, LofiMood } from './types';

interface AIDecision {
  shouldTransition: boolean;
  crossfadeStart: number;
  crossfadeDuration: number;
  tempoAdjustment: number;
  aiReasoning: string;
  confidence: number;
}

interface AIAnalysis {
  tempo: number;
  key: number;
  energy: number;
  mood: LofiMood;
  djRating: number;
  mixability: number;
  harmonicKey: {
    key: string;
    mode: string;
    camelot: string;
  };
  transitionPoints: {
    introEnd: number;
    outroStart: number;
    breakdowns: number[];
    buildups: number[];
  };
}

interface AITrack extends SpotifyTrack {
  analysis: AIAnalysis;
}

interface AILoFiState {
  isPlaying: boolean;
  currentTrack: AITrack | null;
  nextTrack: AITrack | null;
  mood: LofiMood;
  playlist: AITrack[];
  currentIndex: number;
  aiDecision: AIDecision | null;
  crossfadeProgress: number;
}

export class AILoFiPlayer {
  private state: AILoFiState;
  private spotifyPlayer: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private accessToken: string = '';
  private transitionTimer: NodeJS.Timeout | null = null;
  private positionTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      isPlaying: false,
      currentTrack: null,
      nextTrack: null,
      mood: 'chill',
      playlist: [],
      currentIndex: 0,
      aiDecision: null,
      crossfadeProgress: 0
    };
  }

  async initialize(accessToken: string): Promise<boolean> {
    try {
      console.log('🤖 Initializing AI Lo-Fi Player...');
      this.accessToken = accessToken;
      
      // Initialize Spotify Web Playbook SDK
      if (!window.Spotify) {
        throw new Error('Spotify Web Playbook SDK not loaded');
      }

      this.spotifyPlayer = new window.Spotify.Player({
        name: 'AI Lo-Fi DJ Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken);
        },
        volume: 0.7
      });

      this.setupSpotifyListeners();
      await this.spotifyPlayer.connect();
      await this.initializeAudioEffects();

      console.log('✅ AI Lo-Fi Player initialized successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize AI Lo-Fi Player:', error);
      return false;
    }
  }

  private setupSpotifyListeners(): void {
    if (!this.spotifyPlayer) return;

    this.spotifyPlayer.addListener('ready', ({ device_id }) => {
      console.log('🎵 AI DJ Device Ready:', device_id);
      this.deviceId = device_id;
    });

    this.spotifyPlayer.addListener('player_state_changed', (state) => {
      if (!state) return;

      this.state.isPlaying = !state.paused;
      
      if (state.track_window.current_track) {
        const track = state.track_window.current_track;
        console.log(`🎵 AI DJ Now Playing: ${track.name}`);
        
        // Start AI decision making for transitions
        this.startAIMonitoring();
      }
    });
  }

  private async initializeAudioEffects(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create lo-fi effects chain
      this.gainNode = this.audioContext.createGain();
      this.filterNode = this.audioContext.createBiquadFilter();
      this.compressorNode = this.audioContext.createDynamicsCompressor();

      // Configure lo-fi effects
      this.setupLoFiEffects();
      
      console.log('🎛️ AI Lo-Fi audio effects initialized');
    } catch (error) {
      console.error('Failed to initialize audio effects:', error);
    }
  }

  private setupLoFiEffects(): void {
    if (!this.filterNode || !this.compressorNode || !this.gainNode) return;

    // Lo-Fi Low-pass filter
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(4000, this.audioContext!.currentTime);
    this.filterNode.Q.setValueAtTime(0.7, this.audioContext!.currentTime);

    // Vintage compression
    this.compressorNode.threshold.setValueAtTime(-24, this.audioContext!.currentTime);
    this.compressorNode.knee.setValueAtTime(30, this.audioContext!.currentTime);
    this.compressorNode.ratio.setValueAtTime(12, this.audioContext!.currentTime);

    this.gainNode.gain.setValueAtTime(0.8, this.audioContext!.currentTime);
  }

  async startAIMix(tracks: SpotifyTrack[], mood: LofiMood): Promise<boolean> {
    try {
      console.log(`🤖 Starting AI Lo-Fi Mix: ${tracks.length} tracks, ${mood} mood`);
      
      // Send tracks to AI for analysis and optimization
      const response = await fetch('http://localhost:3000/api/ai-dj/analyze-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ tracks, mood })
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const aiResult = await response.json();
      console.log('🎯 AI Playlist Analysis Complete:', aiResult.aiInsights);

      this.state.playlist = aiResult.playlist;
      this.state.mood = mood;
      this.state.currentIndex = 0;
      this.state.currentTrack = this.state.playlist[0];
      this.state.nextTrack = this.state.playlist[1];

      // Apply mood-specific lo-fi settings
      this.applyMoodSettings(mood);

      // Transfer playback and start playing
      await this.startPlayback();

      console.log('✅ AI Lo-Fi Mix started successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to start AI Mix:', error);
      return false;
    }
  }

  private async startPlayback(): Promise<void> {
    if (!this.deviceId || this.state.playlist.length === 0) return;

    try {
      // Transfer playback to our device
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [this.deviceId],
          play: false
        })
      });

      // Start playing first track
      const trackUris = this.state.playlist.map(track => `spotify:track:${track.id}`);
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: trackUris,
          offset: { position: 0 }
        })
      });

      this.state.isPlaying = true;
      this.startAIMonitoring();
    } catch (error) {
      console.error('Failed to start playback:', error);
      throw error;
    }
  }

  private startAIMonitoring(): void {
    // Monitor playback position for AI transition decisions
    this.positionTimer = setInterval(async () => {
      if (!this.state.isPlaying || !this.state.currentTrack || !this.state.nextTrack) return;

      const state = await this.spotifyPlayer?.getCurrentState();
      if (!state) return;

      const position = state.position / 1000; // Convert to seconds
      
      // Get AI decision for potential transition
      const decision = await this.getAITransitionDecision(position);
      this.state.aiDecision = decision;

      if (decision.shouldTransition && !this.transitionTimer) {
        console.log(`🤖 AI Decision: ${decision.aiReasoning}`);
        this.startCrossfade(decision);
      }
    }, 1000);
  }

  private async getAITransitionDecision(position: number): Promise<AIDecision> {
    try {
      const response = await fetch('http://localhost:3000/api/ai-dj/transition-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentTrack: this.state.currentTrack,
          nextTrack: this.state.nextTrack,
          playbackPosition: position
        })
      });

      const result = await response.json();
      return result.decision;
    } catch (error) {
      console.error('Failed to get AI transition decision:', error);
      return {
        shouldTransition: false,
        crossfadeStart: 0,
        crossfadeDuration: 8,
        tempoAdjustment: 1.0,
        aiReasoning: 'AI decision unavailable',
        confidence: 0
      };
    }
  }

  private startCrossfade(decision: AIDecision): void {
    console.log(`🎛️ Starting AI crossfade: ${decision.crossfadeDuration}s`);
    
    const startTime = Date.now();
    const duration = decision.crossfadeDuration * 1000; // Convert to ms

    this.transitionTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      this.state.crossfadeProgress = progress;
      
      // Apply crossfade effect
      if (this.gainNode) {
        const volume = 1 - (progress * 0.3); // Gentle volume reduction during crossfade
        this.gainNode.gain.setValueAtTime(volume, this.audioContext!.currentTime);
      }

      if (progress >= 1) {
        this.completeCrossfade();
      }
    }, 100);
  }

  private completeCrossfade(): void {
    if (this.transitionTimer) {
      clearInterval(this.transitionTimer);
      this.transitionTimer = null;
    }

    // Move to next track
    this.state.currentIndex++;
    this.state.currentTrack = this.state.playlist[this.state.currentIndex];
    this.state.nextTrack = this.state.playlist[this.state.currentIndex + 1] || null;
    this.state.crossfadeProgress = 0;

    // Reset volume
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(0.8, this.audioContext!.currentTime);
    }

    console.log(`🎵 AI transition complete: ${this.state.currentTrack?.name}`);
  }

  private applyMoodSettings(mood: LofiMood): void {
    if (!this.filterNode || !this.compressorNode || !this.audioContext) return;

    const currentTime = this.audioContext.currentTime;

    switch (mood) {
      case 'chill':
        this.filterNode.frequency.setValueAtTime(3500, currentTime);
        this.compressorNode.ratio.setValueAtTime(8, currentTime);
        break;
      case 'study':
        this.filterNode.frequency.setValueAtTime(5000, currentTime);
        this.compressorNode.ratio.setValueAtTime(6, currentTime);
        break;
      case 'cafe':
        this.filterNode.frequency.setValueAtTime(4000, currentTime);
        this.compressorNode.ratio.setValueAtTime(10, currentTime);
        break;
      case 'party':
        this.filterNode.frequency.setValueAtTime(6000, currentTime);
        this.compressorNode.ratio.setValueAtTime(4, currentTime);
        break;
    }

    console.log(`🎛️ Applied AI-optimized ${mood} lo-fi settings`);
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

  getState(): AILoFiState {
    return { ...this.state };
  }

  getAIInsights(): string {
    if (!this.state.aiDecision) return 'AI analyzing...';
    
    return `AI Confidence: ${Math.round(this.state.aiDecision.confidence)}% | ${this.state.aiDecision.aiReasoning}`;
  }

  disconnect(): void {
    if (this.transitionTimer) clearInterval(this.transitionTimer);
    if (this.positionTimer) clearInterval(this.positionTimer);
    if (this.spotifyPlayer) this.spotifyPlayer.disconnect();
    if (this.audioContext) this.audioContext.close();
  }
}

export const aiLoFiPlayer = new AILoFiPlayer();