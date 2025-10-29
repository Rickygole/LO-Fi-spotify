// Web Audio API Lo-Fi Effects Pipeline
export class LoFiProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private vinylNode: AudioBufferSourceNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized: boolean = false;
  
  // Real-time analysis properties
  private currentMood: 'chill' | 'cafe' | 'study' | 'party' = 'chill';
  private baseMoodSettings = {
    filterFrequency: 2500,
    gain: 0.7,
    compression: 8
  };
  private analysisInterval: number | null = null;
  private isAnalyzing: boolean = false;
  private visualMode: boolean = false;
  private frequencyData: Uint8Array | null = null;

  async initialize() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create audio nodes
      this.gainNode = this.audioContext.createGain();
      this.filterNode = this.audioContext.createBiquadFilter();
      this.reverbNode = this.audioContext.createConvolver();
      this.distortionNode = this.audioContext.createWaveShaper();
      this.compressorNode = this.audioContext.createDynamicsCompressor();
      
      // Create analyser node for real-time analysis
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Configure lo-fi filter (low-pass to muffle highs)
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 3000; // Cut off high frequencies
      this.filterNode.Q.value = 1;

      // Configure compressor for that vintage sound
      this.compressorNode.threshold.value = -24;
      this.compressorNode.knee.value = 30;
      this.compressorNode.ratio.value = 12;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.25;

      // Configure distortion for warmth
      this.distortionNode.curve = this.makeDistortionCurve(30) as Float32Array;
      this.distortionNode.oversample = '4x';

      // Create reverb impulse response
      await this.createReverbImpulse();

      // Set initial gain
      this.gainNode.gain.value = 0.8;

      this.isInitialized = true;
      console.log('✅ Lo-Fi audio processor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize lo-fi processor:', error);
    }
  }

  private makeDistortionCurve(amount: number): Float32Array {
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
    if (!this.audioContext || !this.reverbNode) return;

    const length = this.audioContext.sampleRate * 2; // 2 seconds
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
      }
    }
    
    this.reverbNode.buffer = impulse;
  }

  async connectToSpotifyPlayer(): Promise<boolean> {
    if (!this.isInitialized || !this.audioContext) {
      console.error('Lo-Fi processor not initialized');
      return false;
    }

    try {
      // Check if already connected
      if (this.sourceNode) {
        console.log('✅ Already connected to Spotify audio');
        return true;
      }

      // Look for Spotify Web Playback SDK audio element
      const audioElements = document.querySelectorAll('audio');
      let spotifyAudio: HTMLAudioElement | null = null;
      
      // Find audio element created by Spotify Web Playback SDK
      for (const audio of audioElements) {
        if (audio.src.includes('spotify') || audio.crossOrigin === 'anonymous') {
          spotifyAudio = audio;
          break;
        }
      }
      
      if (!spotifyAudio) {
        console.log('🔍 No Spotify audio element found, creating one...');
        // Create our own audio element for Spotify playback
        spotifyAudio = this.createSpotifyAudioElement();
      }
      
      if (spotifyAudio) {
        console.log('🎵 Connecting to Spotify audio element...');
        
        // Check if this element already has a source node
        try {
          const source = this.audioContext.createMediaElementSource(spotifyAudio);
          this.connectAudioChain(source);
          this.sourceNode = source;
          
          // Store reference for later use
          (window as any).spotifyAudioElement = spotifyAudio;
          
          console.log('✅ Connected to Spotify audio successfully!');
          return true;
        } catch (err: any) {
          if (err.name === 'InvalidStateError') {
            console.log('ℹ️ Audio element already connected, reusing existing connection');
            return true;
          }
          throw err;
        }
      }
      
      console.warn('⚠️ Could not find or create Spotify audio element');
      return false;
    } catch (error) {
      console.error('❌ Failed to connect to Spotify player:', error);
      
      // Don't use fallback methods - just return false
      return false;
    }
  }

  private createSpotifyAudioElement(): HTMLAudioElement {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audio.style.display = 'none';
    document.body.appendChild(audio);
    
    console.log('🎵 Created Spotify audio element');
    return audio;
  }

  private connectAudioChain(source: AudioNode) {
    if (!this.audioContext) return;

    // Connect the audio processing chain with analyser
    source
      .connect(this.analyserNode!)
      .connect(this.compressorNode!)
      .connect(this.distortionNode!)
      .connect(this.filterNode!)
      .connect(this.reverbNode!)
      .connect(this.gainNode!)
      .connect(this.audioContext.destination);

    console.log('🔗 Audio processing chain connected with real-time analysis');
  }

  // Apply different lo-fi presets
  applyLoFiPreset(preset: 'chill' | 'cafe' | 'study' | 'party') {
    if (!this.filterNode || !this.gainNode || !this.compressorNode) return;

    // Store current mood
    this.currentMood = preset;

    // Set base mood settings
    switch (preset) {
      case 'chill':
        this.baseMoodSettings = {
          filterFrequency: 2500,
          gain: 0.7,
          compression: 8
        };
        break;
      
      case 'cafe':
        this.baseMoodSettings = {
          filterFrequency: 3500,
          gain: 0.8,
          compression: 6
        };
        break;
      
      case 'study':
        this.baseMoodSettings = {
          filterFrequency: 2000,
          gain: 0.6,
          compression: 12
        };
        break;
      
      case 'party':
        this.baseMoodSettings = {
          filterFrequency: 4000,
          gain: 0.9,
          compression: 4
        };
        break;
    }

    // Apply base settings
    this.filterNode.frequency.value = this.baseMoodSettings.filterFrequency;
    this.gainNode.gain.value = this.baseMoodSettings.gain;
    this.compressorNode.ratio.value = this.baseMoodSettings.compression;

    console.log(`🎛️ Applied ${preset} lo-fi preset`);
    
    // Start real-time analysis
    this.startRealtimeAnalysis();
  }

  // Start real-time audio analysis
  private startRealtimeAnalysis() {
    // Stop any existing analysis
    this.stopRealtimeAnalysis();

    if (!this.analyserNode || !this.audioContext) return;

    this.isAnalyzing = true;
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Analysis interval - runs every 100ms
    this.analysisInterval = window.setInterval(() => {
      if (!this.analyserNode || !this.isAnalyzing) return;

      // Get frequency data
      this.analyserNode.getByteFrequencyData(dataArray);

      // Calculate frequency ranges
      const sampleRate = this.audioContext!.sampleRate;
      const nyquist = sampleRate / 2;
      const binWidth = nyquist / bufferLength;

      // Calculate bass level (0-250Hz)
      const bassEnd = Math.floor(250 / binWidth);
      let bassSum = 0;
      for (let i = 0; i < bassEnd; i++) {
        bassSum += dataArray[i];
      }
      const bassLevel = bassSum / bassEnd;

      // Calculate mid level (250-2000Hz)
      const midStart = bassEnd;
      const midEnd = Math.floor(2000 / binWidth);
      let midSum = 0;
      for (let i = midStart; i < midEnd; i++) {
        midSum += dataArray[i];
      }
      const midLevel = midSum / (midEnd - midStart);

      // Calculate treble level (2000Hz+)
      const trebleStart = midEnd;
      let trebleSum = 0;
      for (let i = trebleStart; i < bufferLength; i++) {
        trebleSum += dataArray[i];
      }
      const trebleLevel = trebleSum / (bufferLength - trebleStart);

      // Apply dynamic adjustments
      const adjustments = this.calculateDynamicAdjustments(bassLevel, midLevel, trebleLevel);
      this.applyDynamicAdjustments(adjustments);
    }, 100);

    console.log('🎯 Real-time audio analysis started');
  }

  // Calculate dynamic adjustments based on audio levels
  private calculateDynamicAdjustments(bass: number, mid: number, treble: number) {
    let filterAdjust = 0;
    let gainAdjust = 0;
    let compressionAdjust = 0;

    // Bass adjustments
    if (bass > 180) {
      filterAdjust -= 300; // Reduce filter frequency for heavy bass
    } else if (bass < 80) {
      filterAdjust += 200; // Increase filter for light bass
    }

    // Mid adjustments
    if (mid > 160) {
      gainAdjust += 0.05; // Slightly boost for rich mids
    } else if (mid < 80) {
      gainAdjust -= 0.05; // Reduce for thin mids
    }

    // Treble adjustments
    if (treble > 180) {
      compressionAdjust -= 2; // Reduce compression for bright treble
      filterAdjust -= 150; // Lower filter slightly
    } else if (treble < 60) {
      filterAdjust += 100; // Keep warmth with less treble
    }

    return {
      filterAdjust,
      gainAdjust,
      compressionAdjust
    };
  }

  // Apply dynamic adjustments smoothly
  private applyDynamicAdjustments(adjustments: { filterAdjust: number; gainAdjust: number; compressionAdjust: number }) {
    if (!this.filterNode || !this.gainNode || !this.compressorNode || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const transitionTime = 0.2; // Smooth 200ms transition

    // Calculate new values based on base + adjustments
    const newFilterFreq = Math.max(1000, Math.min(8000, 
      this.baseMoodSettings.filterFrequency + adjustments.filterAdjust
    ));
    
    const newGain = Math.max(0.3, Math.min(1.0, 
      this.baseMoodSettings.gain + adjustments.gainAdjust
    ));
    
    const newCompression = Math.max(2, Math.min(20, 
      this.baseMoodSettings.compression + adjustments.compressionAdjust
    ));

    // Apply smooth transitions
    this.filterNode.frequency.setTargetAtTime(newFilterFreq, now, transitionTime);
    this.gainNode.gain.setTargetAtTime(newGain, now, transitionTime);
    this.compressorNode.ratio.setTargetAtTime(newCompression, now, transitionTime);
  }

  // Stop real-time analysis
  private stopRealtimeAnalysis() {
    if (this.analysisInterval !== null) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    this.isAnalyzing = false;

    // Reset to base mood settings
    if (this.filterNode && this.gainNode && this.compressorNode && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.filterNode.frequency.setTargetAtTime(this.baseMoodSettings.filterFrequency, now, 0.2);
      this.gainNode.gain.setTargetAtTime(this.baseMoodSettings.gain, now, 0.2);
      this.compressorNode.ratio.setTargetAtTime(this.baseMoodSettings.compression, now, 0.2);
    }

    console.log('⏹️ Real-time audio analysis stopped');
  }

  // Add vinyl crackle effect
  addVinylCrackle() {
    if (!this.audioContext || !this.gainNode) return;

    // Create noise buffer for vinyl crackle
    const bufferSize = this.audioContext.sampleRate * 0.1; // 100ms of crackle
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    // Generate vinyl crackle noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.02; // Very quiet crackle
    }

    // Create and configure the vinyl noise source
    this.vinylNode = this.audioContext.createBufferSource();
    this.vinylNode.buffer = noiseBuffer;
    this.vinylNode.loop = true;

    const vinylGain = this.audioContext.createGain();
    vinylGain.gain.value = 0.03; // Very subtle

    this.vinylNode.connect(vinylGain).connect(this.gainNode);
    this.vinylNode.start();

    console.log('📀 Vinyl crackle effect added');
  }

  // Connect to an external audio context (like Spotify's)
  async connectToAudioContext(externalContext: AudioContext) {
    try {
      console.log('🔗 Connecting to external audio context...');
      
      // Try to tap into the external context's destination
      if (externalContext.destination) {
        // Create a script processor to intercept audio
        const scriptProcessor = externalContext.createScriptProcessor(4096, 2, 2);
        
        scriptProcessor.onaudioprocess = (event) => {
          // Process the audio data through our lo-fi effects
          this.processAudioBuffer(event.inputBuffer, event.outputBuffer);
        };
        
        // Connect to the external context's destination
        scriptProcessor.connect(externalContext.destination);
        
        console.log('✅ Connected to external audio context');
        return true;
      }
    } catch (error) {
      console.log('⚠️ Could not connect to external audio context:', error);
      return false;
    }
  }

  // Enable visual-only mode when audio stream access is not available
  enableVisualMode() {
    console.log('🎨 Enabling visual lo-fi effects mode...');
    this.visualMode = true;
    
    // Create a mock audio source for visual analysis
    this.createMockAudioAnalysis();
  }

  // Process audio buffer through lo-fi effects
  private processAudioBuffer(inputBuffer: AudioBuffer, outputBuffer: AudioBuffer) {
    if (!this.audioContext || this.visualMode) return;
    
    try {
      // Apply lo-fi processing to the audio buffer
      const inputData = inputBuffer.getChannelData(0);
      const outputData = outputBuffer.getChannelData(0);
      
      // Simple lo-fi processing: reduce bit depth and sample rate simulation
      for (let i = 0; i < inputData.length; i++) {
        // Bit crushing effect
        let sample = inputData[i];
        const bitDepth = 8; // Reduce from 16-bit to 8-bit simulation
        const step = Math.pow(2, bitDepth - 1);
        sample = Math.round(sample * step) / step;
        
        // Apply lo-fi filter (simple low-pass)
        sample *= 0.7; // Reduce amplitude for that muffled sound
        
        outputData[i] = sample;
      }
      
      // Copy to other channels if stereo
      if (outputBuffer.numberOfChannels > 1) {
        const rightOutput = outputBuffer.getChannelData(1);
        for (let i = 0; i < outputData.length; i++) {
          rightOutput[i] = outputData[i];
        }
      }
    } catch (error) {
      console.error('Error processing audio buffer:', error);
    }
  }

  // Create mock audio analysis for visual effects
  private createMockAudioAnalysis() {
    if (!this.analyserNode) return;
    
    this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
    
    // Create fake frequency data that responds to music tempo and mood
    const updateFakeData = () => {
      if (!this.frequencyData) return;
      
      // Generate realistic frequency data based on current mood
      const baseFreq = this.currentMood === 'party' ? 80 : 40;
      const variation = this.currentMood === 'chill' ? 20 : 40;
      
      for (let i = 0; i < this.frequencyData.length; i++) {
        // Simulate frequency response with some randomness
        const frequency = (i / this.frequencyData.length) * 255;
        let amplitude = Math.max(0, baseFreq + Math.sin(Date.now() * 0.01 + i * 0.1) * variation);
        
        // Apply mood-specific frequency response
        if (this.currentMood === 'chill') {
          amplitude *= i < this.frequencyData.length * 0.3 ? 1 : 0.5; // Emphasize low frequencies
        } else if (this.currentMood === 'party') {
          amplitude *= i > this.frequencyData.length * 0.7 ? 1.2 : 0.8; // Emphasize high frequencies
        }
        
        this.frequencyData[i] = Math.min(255, amplitude);
      }
    };
    
    // Update fake data regularly for visual effects
    setInterval(updateFakeData, 100);
    console.log('🎭 Mock audio analysis active for visual effects');
  }

  // Start real-time analysis for visual effects
  startAnalysis() {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    console.log('📊 Starting real-time audio analysis...');
    
    if (this.visualMode) {
      this.createMockAudioAnalysis();
    }
    
    // Start the analysis loop
    this.analysisInterval = setInterval(() => {
      this.updateRealtimeEffects();
    }, 100) as any;
    
    console.log('✅ Real-time audio analysis started');
  }

  // Update real-time effects based on audio analysis
  private updateRealtimeEffects() {
    if (!this.audioContext || !this.frequencyData) return;
    
    try {
      // Get current frequency data
      if (this.analyserNode && !this.visualMode) {
        this.analyserNode.getByteFrequencyData(this.frequencyData);
      }
      
      // Analyze the frequency data
      const bassLevel = this.getFrequencyRange(0, 85);
      const midLevel = this.getFrequencyRange(85, 170);
      const trebleLevel = this.getFrequencyRange(170, 255);
      
      // Apply dynamic adjustments based on frequency content
      this.applyDynamicEffects(bassLevel, midLevel, trebleLevel);
      
    } catch (error) {
      console.error('Error in real-time effects update:', error);
    }
  }

  // Get average amplitude for a frequency range
  private getFrequencyRange(startIndex: number, endIndex: number): number {
    if (!this.frequencyData) return 0;
    
    let sum = 0;
    const count = endIndex - startIndex;
    
    for (let i = startIndex; i < endIndex && i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    
    return sum / count / 255; // Normalize to 0-1
  }

  // Apply dynamic effects based on frequency analysis
  private applyDynamicEffects(bass: number, mid: number, treble: number) {
    if (!this.audioContext || !this.filterNode || !this.gainNode) return;
    
    const currentTime = this.audioContext.currentTime;
    
    // Adjust filter frequency based on treble content
    const targetFreq = this.baseMoodSettings.filterFrequency + (treble * 1000);
    this.filterNode.frequency.setTargetAtTime(targetFreq, currentTime, 0.1);
    
    // Adjust gain based on overall level
    const targetGain = this.baseMoodSettings.gain + ((bass + mid) * 0.1);
    this.gainNode.gain.setTargetAtTime(Math.min(1.0, targetGain), currentTime, 0.1);
    
    // Log for debugging (remove in production)
    if (Math.random() < 0.1) { // Only log occasionally to avoid spam
      console.log(`🎛️ Dynamic effects: Bass:${bass.toFixed(2)} Mid:${mid.toFixed(2)} Treble:${treble.toFixed(2)}`);
    }
  }

  // Cleanup
  dispose() {
    // Stop real-time analysis
    this.stopRealtimeAnalysis();
    
    // Stop new analysis interval
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    this.isAnalyzing = false;
    
    if (this.vinylNode) {
      this.vinylNode.stop();
      this.vinylNode.disconnect();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.isInitialized = false;
    console.log('🧹 Lo-Fi processor disposed');
  }
}

// Export singleton instance
export const lofiProcessor = new LoFiProcessor();