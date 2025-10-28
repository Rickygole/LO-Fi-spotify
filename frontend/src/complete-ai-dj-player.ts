// Complete AI DJ Player that integrates all intelligent systems
import { aiDJEngine, type TrackAnalysis, type LofiMood } from './ai-dj-engine';
import { realTimeAudioTransformer } from './real-time-audio-transformer';
import { intelligentDJTransitions } from './intelligent-dj-transitions';
import { spotifyAPI } from './spotify-api';

export interface AIDJState {
  isPlaying: boolean;
  currentTrack: TrackAnalysis | null;
  nextTrack: TrackAnalysis | null;
  mood: LofiMood;
  playlist: TrackAnalysis[];
  playlistIndex: number;
  isTransitioning: boolean;
  transitionProgress: number;
  audioAnalysis: {
    frequencies: Uint8Array;
    rms: number;
  } | null;
}

export class CompleteAIDJPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  
  private djState: AIDJState;
  private originalTracks: any[] = [];
  private playbackTimer: number | null = null;
  private transitionTimer: number | null = null;
  
  private isInitialized: boolean = false;
  private audioElements: HTMLAudioElement[] = [];

  constructor() {
    this.djState = {
      isPlaying: false,
      currentTrack: null,
      nextTrack: null,
      mood: 'chill',
      playlist: [],
      playlistIndex: 0,
      isTransitioning: false,
      transitionProgress: 0,
      audioAnalysis: null
    };
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('🤖 Initializing Complete AI DJ Player...');

      // Initialize audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100
      });

      // Initialize all AI systems
      const transformerInit = await realTimeAudioTransformer.initialize();
      const transitionsInit = await intelligentDJTransitions.initialize(this.audioContext);

      if (!transformerInit || !transitionsInit) {
        throw new Error('Failed to initialize AI systems');
      }

      // Set up audio elements pool
      this.createAudioElementPool();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ Complete AI DJ Player initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize AI DJ Player:', error);
      return false;
    }
  }

  private createAudioElementPool() {
    // Create a pool of audio elements for seamless transitions
    for (let i = 0; i < 3; i++) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'metadata';
      audio.volume = 1;
      
      // Hide from DOM but keep accessible
      audio.style.display = 'none';
      document.body.appendChild(audio);
      
      this.audioElements.push(audio);
    }
    
    console.log('🎵 Audio element pool created for seamless transitions');
  }

  private setupEventListeners() {
    // Listen for transition completion
    window.addEventListener('dj-transition-complete', (event: any) => {
      this.onTransitionComplete(event.detail.track);
    });

    // Listen for track end to prepare next transition
    this.audioElements.forEach((audio, index) => {
      audio.addEventListener('timeupdate', () => {
        if (audio === this.currentAudio) {
          this.checkTransitionTiming();
        }
      });

      audio.addEventListener('ended', () => {
        if (audio === this.currentAudio) {
          this.playNextTrack();
        }
      });

      audio.addEventListener('error', (error) => {
        console.error(`Audio element ${index} error:`, error);
        this.handleAudioError();
      });
    });
  }

  async startAIDJMix(tracks: any[], mood: LofiMood): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('AI DJ Player not initialized');
      return false;
    }

    try {
      console.log(`🎛️ Starting AI DJ Mix in ${mood} mode with ${tracks.length} tracks...`);

      this.originalTracks = tracks;
      this.djState.mood = mood;

      // Set AI DJ mood
      aiDJEngine.setMood(mood);

      // Get audio features for tracks (if available) or use mock data
      const tracksWithFeatures = await this.enrichTracksWithAudioFeatures(tracks);

      // Analyze tracks with AI
      const analyzedTracks = await aiDJEngine.analyzeTracks(tracksWithFeatures);
      
      // Create mood-optimized playlist
      const moodPlaylist = aiDJEngine.createMoodPlaylist(mood, Math.min(25, tracks.length));
      
      // Optimize track order for seamless flow
      this.djState.playlist = aiDJEngine.optimizeTrackOrder(moodPlaylist);
      this.djState.playlistIndex = 0;

      console.log(`🎵 AI created optimized playlist: ${this.djState.playlist.length} tracks`);

      if (this.djState.playlist.length === 0) {
        throw new Error('No suitable tracks found for the selected mood');
      }

      // Start playing first track
      await this.startFirstTrack();

      // Apply lo-fi transformation
      realTimeAudioTransformer.applyMoodPreset(mood);

      this.djState.isPlaying = true;
      this.startRealTimeAnalysis();

      console.log('✅ AI DJ Mix started successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to start AI DJ Mix:', error);
      return false;
    }
  }

  private async enrichTracksWithAudioFeatures(tracks: any[]): Promise<any[]> {
    // For now, add mock audio features to tracks
    // In a real implementation, you'd fetch from Spotify's audio features API
    return tracks.map(track => ({
      ...track,
      audio_features: {
        danceability: Math.random(),
        energy: Math.random(),
        key: Math.floor(Math.random() * 12),
        loudness: -60 + Math.random() * 60,
        mode: Math.round(Math.random()),
        speechiness: Math.random() * 0.3,
        acousticness: Math.random(),
        instrumentalness: Math.random(),
        liveness: Math.random() * 0.3,
        valence: Math.random(),
        tempo: 80 + Math.random() * 80,
        time_signature: 4
      }
    }));
  }

  private async startFirstTrack(): Promise<void> {
    if (this.djState.playlist.length === 0) {
      throw new Error('No tracks in playlist');
    }

    const firstTrack = this.djState.playlist[0];
    this.djState.currentTrack = firstTrack;
    
    // Use first audio element
    this.currentAudio = this.audioElements[0];
    
    try {
      // Try to use preview URL first
      const previewUrl = await this.getTrackPreviewUrl(firstTrack.id);
      
      if (previewUrl) {
        this.currentAudio.src = previewUrl;
        console.log(`🎵 Playing preview: ${firstTrack.name}`);
        
        // Wait for audio to load
        await new Promise((resolve, reject) => {
          this.currentAudio!.onloadeddata = resolve;
          this.currentAudio!.onerror = reject;
          this.currentAudio!.load();
        });
        
        // Connect to audio transformer
        const connected = realTimeAudioTransformer.connectToAudioElement(this.currentAudio);
        if (connected) {
          console.log('✅ Audio transformer connected');
        } else {
          console.warn('⚠️ Could not connect audio transformer');
        }

        // Start playback
        await this.currentAudio.play();
        console.log('🎵 First track started playing');
        
        // Prepare next track
        this.prepareNextTrack();

      } else {
        console.warn(`No preview available for ${firstTrack.name}, trying next track...`);
        this.djState.playlistIndex++;
        if (this.djState.playlistIndex < this.djState.playlist.length) {
          return this.startFirstTrack();
        }
        throw new Error('No playable tracks found');
      }

    } catch (error) {
      console.error('Failed to start first track:', error);
      throw error;
    }
  }

  private async getTrackPreviewUrl(trackId: string): Promise<string | null> {
    try {
      const token = spotifyAPI.getAccessToken();
      if (!token) {
        console.error('No access token available');
        return null;
      }

      const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const track = await response.json();
        return track.preview_url;
      } else {
        console.error(`Failed to fetch track ${trackId}:`, response.status);
        return null;
      }
    } catch (error) {
      console.error('Failed to get track preview URL:', error);
    }
    
    return null;
  }

  private async prepareNextTrack(): Promise<void> {
    const nextIndex = this.djState.playlistIndex + 1;
    
    if (nextIndex >= this.djState.playlist.length) {
      // End of playlist - could implement auto-generation here
      console.log('End of playlist reached');
      return;
    }

    const nextTrack = this.djState.playlist[nextIndex];
    this.djState.nextTrack = nextTrack;

    // Use next available audio element
    this.nextAudio = this.audioElements[1];
    
    try {
      const previewUrl = await this.getTrackPreviewUrl(nextTrack.id);
      
      if (previewUrl) {
        this.nextAudio.src = previewUrl;
        
        // Prepare for transition
        await intelligentDJTransitions.prepareNextTrack(nextTrack, this.nextAudio);
        
        console.log(`🔄 Next track prepared: ${nextTrack.name}`);
      } else {
        console.warn(`No preview for next track: ${nextTrack.name}, will skip`);
      }
    } catch (error) {
      console.error('Failed to prepare next track:', error);
    }
  }

  private checkTransitionTiming(): void {
    if (!this.currentAudio || !this.djState.currentTrack || !this.djState.nextTrack) return;
    
    const currentTime = this.currentAudio.currentTime;
    const duration = this.currentAudio.duration;
    const timeRemaining = duration - currentTime;

    // Start transition with 20 seconds remaining (or 2/3 through track)
    const transitionPoint = Math.min(20, duration * 0.33);
    
    if (timeRemaining <= transitionPoint && !this.djState.isTransitioning) {
      this.executeIntelligentTransition();
    }
  }

  private async executeIntelligentTransition(): Promise<void> {
    if (!this.djState.currentTrack || !this.djState.nextTrack) return;

    this.djState.isTransitioning = true;

    try {
      // Calculate optimal transition using AI
      const transition = aiDJEngine.calculateTransition(
        this.djState.currentTrack,
        this.djState.nextTrack
      );

      console.log(`🎛️ AI calculated ${transition.transitionType} transition`);

      // Execute the transition
      const success = await intelligentDJTransitions.executeTransition(transition);

      if (success) {
        // Update transition progress in real-time
        this.monitorTransitionProgress();
      } else {
        console.error('Transition failed, falling back to simple crossfade');
        this.playNextTrack();
      }
    } catch (error) {
      console.error('Intelligent transition failed:', error);
      this.playNextTrack();
    }
  }

  private monitorTransitionProgress(): void {
    const monitor = () => {
      const transitionState = intelligentDJTransitions.getTransitionState();
      this.djState.transitionProgress = transitionState.progress;

      if (transitionState.isTransitioning) {
        requestAnimationFrame(monitor);
      } else {
        this.djState.isTransitioning = false;
        this.djState.transitionProgress = 0;
      }
    };

    monitor();
  }

  private onTransitionComplete(track: TrackAnalysis): void {
    console.log(`✅ Transition completed to: ${track?.name || 'Unknown track'}`);
    
    // Update DJ state
    this.djState.playlistIndex++;
    this.djState.currentTrack = this.djState.nextTrack;
    this.djState.nextTrack = null;
    this.djState.isTransitioning = false;

    // Swap audio elements
    const temp = this.currentAudio;
    this.currentAudio = this.nextAudio;
    this.nextAudio = temp;

    // Prepare next track
    this.prepareNextTrack();
  }

  private async playNextTrack(): Promise<void> {
    if (this.djState.playlistIndex + 1 >= this.djState.playlist.length) {
      // Auto-generate more tracks or loop
      console.log('🔄 End of playlist - could implement auto-generation');
      this.djState.isPlaying = false;
      return;
    }

    this.djState.playlistIndex++;
    const nextTrack = this.djState.playlist[this.djState.playlistIndex];
    
    if (this.nextAudio) {
      try {
        await this.nextAudio.play();
        this.onTransitionComplete(nextTrack);
      } catch (error) {
        console.error('Failed to play next track:', error);
      }
    }
  }

  private startRealTimeAnalysis(): void {
    const analyze = () => {
      if (!this.djState.isPlaying) return;

      // Get audio analysis from transformer
      const analysis = realTimeAudioTransformer.getAudioAnalysis();
      this.djState.audioAnalysis = analysis;

      // Continue analysis
      setTimeout(analyze, 100); // 10 FPS analysis
    };

    analyze();
  }

  private handleAudioError(): void {
    console.error('Audio playback error, attempting to recover...');
    
    // Try to skip to next track
    this.playNextTrack();
  }

  // Public control methods
  async changeMood(newMood: LofiMood): Promise<void> {
    console.log(`🎭 Changing mood from ${this.djState.mood} to ${newMood}`);
    
    this.djState.mood = newMood;
    aiDJEngine.setMood(newMood);
    
    // Apply new audio transformation in real-time
    realTimeAudioTransformer.applyMoodPreset(newMood);
    
    // Regenerate playlist with new mood
    if (this.originalTracks.length > 0) {
      const analyzedTracks = await aiDJEngine.analyzeTracks(this.originalTracks);
      const newPlaylist = aiDJEngine.createMoodPlaylist(newMood, Math.min(25, this.originalTracks.length));
      const optimizedPlaylist = aiDJEngine.optimizeTrackOrder(newPlaylist);
      
      // Update playlist but keep current playing
      this.djState.playlist = [
        this.djState.currentTrack!,
        ...optimizedPlaylist.filter(track => track.id !== this.djState.currentTrack?.id)
      ];
      
      this.djState.playlistIndex = 0;
      this.prepareNextTrack();
    }
  }

  pause(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.djState.isPlaying = false;
    }
  }

  resume(): void {
    if (this.currentAudio) {
      this.currentAudio.play().catch(console.error);
      this.djState.isPlaying = true;
    }
  }

  skip(): void {
    this.playNextTrack();
  }

  // Get current DJ state for UI
  getDJState(): AIDJState {
    return { ...this.djState };
  }

  // Manual crossfade control
  setCrossfade(position: number): void {
    intelligentDJTransitions.setCrossfadePosition(position);
  }

  // Cleanup
  dispose(): void {
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
    }
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }

    this.audioElements.forEach(audio => {
      audio.pause();
      audio.src = '';
      audio.remove();
    });

    realTimeAudioTransformer.dispose();
    intelligentDJTransitions.dispose();

    if (this.audioContext) {
      this.audioContext.close();
    }

    console.log('🧹 Complete AI DJ Player disposed');
  }
}

export const completeAIDJPlayer = new CompleteAIDJPlayer();