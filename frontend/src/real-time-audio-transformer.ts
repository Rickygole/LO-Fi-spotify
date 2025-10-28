// Advanced Real-Time Audio Transformer for Lo-Fi Effects
import type { LofiMood } from './ai-dj-engine';

export interface AudioTransformSettings {
  lowPassFreq: number;
  highPassFreq: number;
  compressionRatio: number;
  compressionThreshold: number;
  distortionAmount: number;
  reverbAmount: number;
  vinylCrackleVolume: number;
  bitCrushBits: number;
  saturationGain: number;
  stereoWidth: number;
}

export class RealTimeAudioTransformer {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private masterGain: GainNode | null = null;
  
  // Effect nodes
  private lowPassFilter: BiquadFilterNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private distortion: WaveShaperNode | null = null;
  private reverb: ConvolverNode | null = null;
  private vinylNoise: AudioBufferSourceNode | null = null;
  private vinylGain: GainNode | null = null;
  private saturationNode: WaveShaperNode | null = null;
  
  // Advanced processing
  private analyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private isProcessing: boolean = false;
  private currentSettings: AudioTransformSettings;

  constructor() {
    this.currentSettings = this.getDefaultSettings('chill');
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('🎛️ Initializing advanced audio transformer...');
      
      // Create audio context with optimal settings
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100
      });

      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.8;

      // Create analyser for real-time analysis
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

      // Create effect chain
      await this.createEffectChain();
      
      console.log('✅ Advanced audio transformer initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio transformer:', error);
      return false;
    }
  }

  private async createEffectChain() {
    if (!this.audioContext) return;

    // High-pass filter (remove muddy lows)
    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 80;
    this.highPassFilter.Q.value = 0.7;

    // Low-pass filter (lo-fi muffled sound)
    this.lowPassFilter = this.audioContext.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 3000;
    this.lowPassFilter.Q.value = 2;

    // Compressor for vintage dynamics
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.1;

    // Saturation for warmth
    this.saturationNode = this.audioContext.createWaveShaper();
    this.saturationNode.curve = this.createSaturationCurve(0.4);
    this.saturationNode.oversample = '4x';

    // Distortion for analog character
    this.distortion = this.audioContext.createWaveShaper();
    this.distortion.curve = this.createDistortionCurve(20);
    this.distortion.oversample = '2x';

    // Reverb for space
    this.reverb = this.audioContext.createConvolver();
    await this.createReverbImpulse();

    // Vinyl crackle setup
    this.vinylGain = this.audioContext.createGain();
    this.vinylGain.gain.value = 0.02;
    this.createVinylCrackle();

    console.log('🔗 Audio effect chain created');
  }

  private createSaturationCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * amount * 2) * 0.95;
    }
    
    return curve;
  }

  private createDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    
    return curve;
  }

  private async createReverbImpulse() {
    if (!this.audioContext || !this.reverb) return;

    const length = this.audioContext.sampleRate * 3; // 3 seconds
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2.5);
        const earlyReflections = i < this.audioContext.sampleRate * 0.1 ? 
          Math.sin(i * 0.001) * 0.3 : 0;
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.15 + earlyReflections;
      }
    }
    
    this.reverb.buffer = impulse;
  }

  private createVinylCrackle() {
    if (!this.audioContext || !this.vinylGain) return;

    const bufferSize = this.audioContext.sampleRate * 10; // 10 seconds of crackle
    const noiseBuffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = noiseBuffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        // Create realistic vinyl crackle pattern
        const crackleDensity = Math.sin(i * 0.0001) * 0.5 + 0.5;
        const iscrackle = Math.random() < crackleDensity * 0.0008;
        
        if (iscrackle) {
          data[i] = (Math.random() * 2 - 1) * 0.8;
        } else {
          data[i] = (Math.random() * 2 - 1) * 0.03; // Background noise
        }
      }
    }

    this.vinylNoise = this.audioContext.createBufferSource();
    this.vinylNoise.buffer = noiseBuffer;
    this.vinylNoise.loop = true;
    this.vinylNoise.connect(this.vinylGain);
  }

  connectToAudioElement(audioElement: HTMLAudioElement): boolean {
    if (!this.audioContext || !this.masterGain) {
      console.error('Audio transformer not initialized');
      return false;
    }

    try {
      console.log('🔌 Connecting audio transformer to audio element...');
      
      // Create source from audio element
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      
      // Connect the processing chain
      this.connectProcessingChain();
      
      // Start vinyl crackle
      if (this.vinylNoise && this.vinylGain) {
        this.vinylNoise.start();
        this.vinylGain.connect(this.masterGain);
      }

      // Connect to destination
      this.masterGain.connect(this.audioContext.destination);
      
      // Start real-time analysis
      this.startRealTimeProcessing();
      
      console.log('✅ Audio transformer connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect audio transformer:', error);
      return false;
    }
  }

  private connectProcessingChain() {
    if (!this.sourceNode || !this.masterGain) return;

    // Connect the effect chain
    this.sourceNode
      .connect(this.analyser!)
      .connect(this.highPassFilter!)
      .connect(this.saturationNode!)
      .connect(this.compressor!)
      .connect(this.distortion!)
      .connect(this.lowPassFilter!)
      .connect(this.reverb!)
      .connect(this.masterGain);
  }

  private startRealTimeProcessing() {
    if (this.isProcessing || !this.analyser || !this.frequencyData) return;
    
    this.isProcessing = true;
    
    const processFrame = () => {
      if (!this.isProcessing) return;
      
      // Get frequency data
      this.analyser!.getByteFrequencyData(this.frequencyData!);
      
      // Dynamic processing based on audio content
      this.adaptiveProcessing();
      
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
    console.log('🌊 Real-time adaptive processing started');
  }

  private adaptiveProcessing() {
    if (!this.frequencyData || !this.lowPassFilter || !this.compressor) return;

    // Calculate frequency distribution
    const lowFreqs = this.frequencyData.slice(0, 85).reduce((a, b) => a + b, 0) / 85;
    const midFreqs = this.frequencyData.slice(85, 170).reduce((a, b) => a + b, 0) / 85;
    const highFreqs = this.frequencyData.slice(170, 255).reduce((a, b) => a + b, 0) / 85;

    // Adaptive filtering based on content
    const targetLowPass = this.currentSettings.lowPassFreq + (highFreqs / 255) * 500;
    this.lowPassFilter.frequency.exponentialRampToValueAtTime(
      Math.max(1000, Math.min(8000, targetLowPass)),
      this.audioContext!.currentTime + 0.1
    );

    // Adaptive compression based on dynamics
    const dynamicRange = Math.max(...this.frequencyData) - Math.min(...this.frequencyData);
    const targetRatio = this.currentSettings.compressionRatio + (dynamicRange / 255) * 4;
    this.compressor.ratio.value = Math.max(2, Math.min(20, targetRatio));
  }

  applyMoodPreset(mood: LofiMood) {
    console.log(`🎭 Applying ${mood} audio transformation...`);
    
    this.currentSettings = this.getDefaultSettings(mood);
    this.updateEffectParameters();
  }

  private getDefaultSettings(mood: LofiMood): AudioTransformSettings {
    const presets: Record<LofiMood, AudioTransformSettings> = {
      chill: {
        lowPassFreq: 2500,
        highPassFreq: 60,
        compressionRatio: 6,
        compressionThreshold: -20,
        distortionAmount: 15,
        reverbAmount: 0.3,
        vinylCrackleVolume: 0.015,
        bitCrushBits: 12,
        saturationGain: 0.3,
        stereoWidth: 0.8
      },
      cafe: {
        lowPassFreq: 3200,
        highPassFreq: 80,
        compressionRatio: 4,
        compressionThreshold: -16,
        distortionAmount: 10,
        reverbAmount: 0.4,
        vinylCrackleVolume: 0.02,
        bitCrushBits: 14,
        saturationGain: 0.25,
        stereoWidth: 0.9
      },
      study: {
        lowPassFreq: 2000,
        highPassFreq: 100,
        compressionRatio: 8,
        compressionThreshold: -24,
        distortionAmount: 20,
        reverbAmount: 0.2,
        vinylCrackleVolume: 0.025,
        bitCrushBits: 10,
        saturationGain: 0.4,
        stereoWidth: 0.6
      },
      party: {
        lowPassFreq: 4000,
        highPassFreq: 40,
        compressionRatio: 3,
        compressionThreshold: -12,
        distortionAmount: 8,
        reverbAmount: 0.5,
        vinylCrackleVolume: 0.01,
        bitCrushBits: 16,
        saturationGain: 0.2,
        stereoWidth: 1.0
      }
    };

    return presets[mood];
  }

  private updateEffectParameters() {
    const settings = this.currentSettings;
    const currentTime = this.audioContext?.currentTime || 0;
    const rampTime = currentTime + 0.5; // 500ms transition

    if (this.lowPassFilter) {
      this.lowPassFilter.frequency.exponentialRampToValueAtTime(settings.lowPassFreq, rampTime);
    }

    if (this.highPassFilter) {
      this.highPassFilter.frequency.exponentialRampToValueAtTime(settings.highPassFreq, rampTime);
    }

    if (this.compressor) {
      this.compressor.ratio.value = settings.compressionRatio;
      this.compressor.threshold.value = settings.compressionThreshold;
    }

    if (this.distortion) {
      this.distortion.curve = this.createDistortionCurve(settings.distortionAmount);
    }

    if (this.vinylGain) {
      this.vinylGain.gain.exponentialRampToValueAtTime(settings.vinylCrackleVolume, rampTime);
    }

    if (this.saturationNode) {
      this.saturationNode.curve = this.createSaturationCurve(settings.saturationGain);
    }

    console.log(`🎛️ Audio parameters updated for lo-fi transformation`);
  }

  // Real-time parameter adjustment
  adjustParameter(param: keyof AudioTransformSettings, value: number) {
    this.currentSettings[param] = value;
    this.updateEffectParameters();
  }

  // Get current audio analysis data
  getAudioAnalysis(): { frequencies: Uint8Array; rms: number } | null {
    if (!this.frequencyData || !this.analyser) return null;

    this.analyser.getByteFrequencyData(this.frequencyData);
    
    // Calculate RMS for volume level
    const rms = Math.sqrt(
      this.frequencyData.reduce((sum, value) => sum + value * value, 0) / this.frequencyData.length
    ) / 255;

    return {
      frequencies: this.frequencyData,
      rms
    };
  }

  // Cleanup
  dispose() {
    this.isProcessing = false;
    
    if (this.vinylNoise) {
      this.vinylNoise.stop();
      this.vinylNoise.disconnect();
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    console.log('🧹 Audio transformer disposed');
  }
}

export const realTimeAudioTransformer = new RealTimeAudioTransformer();