// Intelligent DJ Transition System with AI-Powered Crossfading
import type { TrackAnalysis, DJTransition } from './ai-dj-engine';

export interface TransitionState {
  isTransitioning: boolean;
  fromTrack: TrackAnalysis | null;
  toTrack: TrackAnalysis | null;
  progress: number; // 0-1
  fadeOutGain: number;
  fadeInGain: number;
  crossfadePosition: number;
}

export class IntelligentDJTransitions {
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  
  // Audio nodes for crossfading
  private currentSource: MediaElementAudioSourceNode | null = null;
  private nextSource: MediaElementAudioSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private nextGain: GainNode | null = null;
  private crossfadeGain: GainNode | null = null;
  
  // Transition management
  private transitionState: TransitionState;
  private transitionTimeout: number | null = null;
  private beatSyncInterval: number | null = null;
  
  // AI analysis
  private currentTransition: DJTransition | null = null;
  private isActive: boolean = false;

  constructor() {
    this.transitionState = {
      isTransitioning: false,
      fromTrack: null,
      toTrack: null,
      progress: 0,
      fadeOutGain: 1,
      fadeInGain: 0,
      crossfadePosition: 0
    };
  }

  async initialize(audioContext: AudioContext): Promise<boolean> {
    try {
      console.log('🎛️ Initializing intelligent DJ transitions...');
      
      this.audioContext = audioContext;
      
      // Create crossfade gain nodes
      this.currentGain = audioContext.createGain();
      this.nextGain = audioContext.createGain();
      this.crossfadeGain = audioContext.createGain();
      
      // Initial gains
      this.currentGain.gain.value = 1;
      this.nextGain.gain.value = 0;
      this.crossfadeGain.gain.value = 0.8;
      
      this.isActive = true;
      console.log('✅ DJ transitions initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize DJ transitions:', error);
      return false;
    }
  }

  // Prepare next track for seamless transition
  async prepareNextTrack(track: TrackAnalysis, audioElement: HTMLAudioElement): Promise<boolean> {
    if (!this.audioContext) return false;

    try {
      console.log(`🎵 Preparing next track: ${track.name} by ${track.artist}`);
      
      // Set up next audio element
      this.nextAudio = audioElement;
      audioElement.currentTime = 0;
      audioElement.volume = 1;
      
      // Create audio source
      this.nextSource = this.audioContext.createMediaElementSource(audioElement);
      
      // Connect to gain node
      this.nextSource.connect(this.nextGain!);
      this.nextGain!.connect(this.crossfadeGain!);
      
      // Preload audio
      audioElement.load();
      
      console.log('✅ Next track prepared for transition');
      return true;
    } catch (error) {
      console.error('❌ Failed to prepare next track:', error);
      return false;
    }
  }

  // Execute intelligent transition between tracks
  async executeTransition(transition: DJTransition): Promise<boolean> {
    if (!this.audioContext || !this.nextAudio || this.transitionState.isTransitioning) {
      console.warn('Cannot execute transition - system not ready');
      return false;
    }

    console.log(`🔄 Executing ${transition.transitionType} transition: ${transition.fromTrack.name} → ${transition.toTrack.name}`);
    
    this.currentTransition = transition;
    this.transitionState.isTransitioning = true;
    this.transitionState.fromTrack = transition.fromTrack;
    this.transitionState.toTrack = transition.toTrack;
    this.transitionState.progress = 0;

    try {
      switch (transition.transitionType) {
        case 'beatmatch':
          return await this.executeBeatmatchTransition(transition);
        case 'harmonic':
          return await this.executeHarmonicTransition(transition);
        case 'energy_build':
          return await this.executeEnergyBuildTransition(transition);
        case 'energy_drop':
          return await this.executeEnergyDropTransition(transition);
        default:
          return await this.executeCrossfadeTransition(transition);
      }
    } catch (error) {
      console.error('❌ Transition execution failed:', error);
      this.transitionState.isTransitioning = false;
      return false;
    }
  }

  private async executeBeatmatchTransition(transition: DJTransition): Promise<boolean> {
    console.log('🥁 Executing beatmatch transition with tempo sync...');
    
    const duration = transition.duration;
    const startTime = this.audioContext!.currentTime;
    
    // Calculate beat alignment
    const fromTempo = transition.fromTrack.audioFeatures.tempo;
    const toTempo = transition.toTrack.audioFeatures.tempo;
    const beatLength = 60 / fromTempo; // seconds per beat
    
    // Align to beat boundary
    const alignmentDelay = this.calculateBeatAlignment(fromTempo);
    
    // Start next track with tempo adjustment
    if (this.nextAudio) {
      this.nextAudio.playbackRate = transition.tempoAdjustment;
      
      setTimeout(() => {
        this.nextAudio!.play().catch(console.error);
      }, alignmentDelay * 1000);
    }
    
    // Execute crossfade with beat synchronization
    this.animateTransition(duration, 'beatmatch');
    
    return true;
  }

  private async executeHarmonicTransition(transition: DJTransition): Promise<boolean> {
    console.log('🎼 Executing harmonic transition with key matching...');
    
    // Apply harmonic mixing techniques
    const keyCompatibility = transition.keyCompatibility;
    const transitionCurve = this.generateHarmonicCurve(keyCompatibility);
    
    // Start next track
    if (this.nextAudio) {
      this.nextAudio.play().catch(console.error);
    }
    
    // Custom crossfade curve for harmonic mixing
    this.animateTransitionWithCurve(transition.duration, transitionCurve);
    
    return true;
  }

  private async executeEnergyBuildTransition(transition: DJTransition): Promise<boolean> {
    console.log('⚡ Executing energy build transition...');
    
    // Quick crossfade to build energy
    const duration = Math.min(transition.duration, 6000); // Shorter for energy builds
    
    if (this.nextAudio) {
      this.nextAudio.play().catch(console.error);
    }
    
    // Fast fade for energy impact
    this.animateTransition(duration, 'energy_build');
    
    return true;
  }

  private async executeEnergyDropTransition(transition: DJTransition): Promise<boolean> {
    console.log('📉 Executing energy drop transition...');
    
    // Longer, smoother fade for energy drops
    const duration = Math.max(transition.duration, 12000);
    
    if (this.nextAudio) {
      // Delay start slightly for dramatic effect
      setTimeout(() => {
        this.nextAudio!.play().catch(console.error);
      }, 2000);
    }
    
    this.animateTransition(duration, 'energy_drop');
    
    return true;
  }

  private async executeCrossfadeTransition(transition: DJTransition): Promise<boolean> {
    console.log('🔄 Executing standard crossfade transition...');
    
    if (this.nextAudio) {
      this.nextAudio.play().catch(console.error);
    }
    
    this.animateTransition(transition.duration, 'crossfade');
    
    return true;
  }

  private calculateBeatAlignment(tempo: number): number {
    // Calculate optimal start time to align beats
    const beatLength = 60 / tempo;
    const currentTime = performance.now() / 1000;
    const beatPosition = (currentTime % beatLength) / beatLength;
    
    // Wait for next beat if we're past halfway
    return beatPosition > 0.5 ? beatLength - beatPosition : -beatPosition;
  }

  private generateHarmonicCurve(keyCompatibility: number): number[] {
    const points = 100;
    const curve: number[] = [];
    
    for (let i = 0; i <= points; i++) {
      const progress = i / points;
      
      // Create curve based on key compatibility
      if (keyCompatibility > 0.8) {
        // Smooth linear for perfect key matches
        curve.push(progress);
      } else if (keyCompatibility > 0.5) {
        // S-curve for good matches
        curve.push(0.5 * (1 + Math.sin((progress - 0.5) * Math.PI)));
      } else {
        // Quick transition for poor matches
        curve.push(Math.pow(progress, 0.5));
      }
    }
    
    return curve;
  }

  private animateTransition(duration: number, type: string) {
    const startTime = performance.now();
    const endTime = startTime + duration;
    
    const animate = () => {
      const now = performance.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      this.transitionState.progress = progress;
      
      // Calculate crossfade gains based on transition type
      let fadeOutGain: number;
      let fadeInGain: number;
      
      switch (type) {
        case 'energy_build':
          fadeOutGain = Math.pow(1 - progress, 2); // Quick fade out
          fadeInGain = Math.pow(progress, 0.5); // Slower fade in
          break;
        case 'energy_drop':
          fadeOutGain = 1 - Math.pow(progress, 0.5); // Slower fade out
          fadeInGain = Math.pow(progress, 2); // Quick fade in
          break;
        case 'beatmatch':
          // Equal power crossfade
          fadeOutGain = Math.cos(progress * Math.PI / 2);
          fadeInGain = Math.sin(progress * Math.PI / 2);
          break;
        default:
          // Linear crossfade
          fadeOutGain = 1 - progress;
          fadeInGain = progress;
      }
      
      // Apply gains
      if (this.currentGain) {
        this.currentGain.gain.value = fadeOutGain;
      }
      if (this.nextGain) {
        this.nextGain.gain.value = fadeInGain;
      }
      
      this.transitionState.fadeOutGain = fadeOutGain;
      this.transitionState.fadeInGain = fadeInGain;
      this.transitionState.crossfadePosition = progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.completeTransition();
      }
    };
    
    animate();
  }

  private animateTransitionWithCurve(duration: number, curve: number[]) {
    const startTime = performance.now();
    
    const animate = () => {
      const now = performance.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const curveIndex = Math.floor(progress * (curve.length - 1));
      const curveProgress = curve[curveIndex] || progress;
      
      this.transitionState.progress = progress;
      
      const fadeOutGain = 1 - curveProgress;
      const fadeInGain = curveProgress;
      
      if (this.currentGain) {
        this.currentGain.gain.value = fadeOutGain;
      }
      if (this.nextGain) {
        this.nextGain.gain.value = fadeInGain;
      }
      
      this.transitionState.fadeOutGain = fadeOutGain;
      this.transitionState.fadeInGain = fadeInGain;
      this.transitionState.crossfadePosition = curveProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.completeTransition();
      }
    };
    
    animate();
  }

  private completeTransition() {
    console.log('✅ Transition completed');
    
    // Swap audio elements
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    
    this.currentAudio = this.nextAudio;
    this.nextAudio = null;
    
    // Swap gain nodes
    if (this.currentGain && this.nextGain) {
      this.currentGain.gain.value = 1;
      this.nextGain.gain.value = 0;
    }
    
    // Reset playback rate
    if (this.currentAudio) {
      this.currentAudio.playbackRate = 1;
    }
    
    // Reset transition state
    this.transitionState.isTransitioning = false;
    this.transitionState.progress = 0;
    this.transitionState.fromTrack = null;
    this.transitionState.toTrack = null;
    
    this.currentTransition = null;
    
    // Emit transition complete event
    window.dispatchEvent(new CustomEvent('dj-transition-complete', {
      detail: { track: this.transitionState.toTrack }
    }));
  }

  // Get current transition state for UI
  getTransitionState(): TransitionState {
    return { ...this.transitionState };
  }

  // Manual crossfade control
  setCrossfadePosition(position: number) {
    if (!this.currentGain || !this.nextGain) return;
    
    const clampedPosition = Math.max(0, Math.min(1, position));
    
    this.currentGain.gain.value = 1 - clampedPosition;
    this.nextGain.gain.value = clampedPosition;
    
    this.transitionState.crossfadePosition = clampedPosition;
  }

  // Emergency stop transition
  stopTransition() {
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
    
    if (this.beatSyncInterval) {
      clearInterval(this.beatSyncInterval);
      this.beatSyncInterval = null;
    }
    
    this.transitionState.isTransitioning = false;
    console.log('🛑 Transition stopped');
  }

  // Cleanup
  dispose() {
    this.stopTransition();
    this.isActive = false;
    
    if (this.currentSource) {
      this.currentSource.disconnect();
    }
    if (this.nextSource) {
      this.nextSource.disconnect();
    }
    
    console.log('🧹 DJ transitions disposed');
  }
}

export const intelligentDJTransitions = new IntelligentDJTransitions();