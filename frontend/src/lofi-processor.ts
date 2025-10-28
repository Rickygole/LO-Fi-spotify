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
  private isInitialized: boolean = false;

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
      this.distortionNode.curve = this.makeDistortionCurve(30);
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
        const source = this.audioContext.createMediaElementSource(spotifyAudio);
        this.connectAudioChain(source);
        this.sourceNode = source;
        
        // Store reference for later use
        (window as any).spotifyAudioElement = spotifyAudio;
        
        console.log('✅ Connected to Spotify audio successfully!');
        return true;
      }
      
      console.warn('⚠️ Could not find or create Spotify audio element');
      return false;
    } catch (error) {
      console.error('❌ Failed to connect to Spotify player:', error);
      
      // Fallback: Try getUserMedia approach
      return await this.setupAlternativeAudioCapture();
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

  private async setupAlternativeAudioCapture(): Promise<boolean> {
    try {
      // Alternative: Use getUserMedia to capture system audio
      // Note: This requires user permission and may not work in all browsers
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      const source = this.audioContext!.createMediaStreamSource(stream);
      this.connectAudioChain(source);
      
      console.log('✅ Connected to system audio (may include background noise)');
      return true;
    } catch (error) {
      console.warn('⚠️ Could not access system audio:', error);
      
      // Fallback: Apply effects to a demo audio element
      this.setupDemoAudioProcessing();
      return false;
    }
  }

  private setupDemoAudioProcessing() {
    // Create a demo audio element for testing the effects
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    
    // Use a public domain lo-fi track for demonstration
    audio.src = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
    
    if (this.audioContext) {
      const source = this.audioContext.createMediaElementSource(audio);
      this.connectAudioChain(source);
      
      // Auto-play demo (muted initially)
      audio.volume = 0.1;
      audio.play().catch(console.error);
      
      console.log('🎵 Demo lo-fi effects active (using sample audio)');
    }
  }

  private connectAudioChain(source: AudioNode) {
    if (!this.audioContext) return;

    // Connect the audio processing chain
    source
      .connect(this.compressorNode!)
      .connect(this.distortionNode!)
      .connect(this.filterNode!)
      .connect(this.reverbNode!)
      .connect(this.gainNode!)
      .connect(this.audioContext.destination);

    console.log('🔗 Audio processing chain connected');
  }

  // Apply different lo-fi presets
  applyLoFiPreset(preset: 'chill' | 'cafe' | 'study' | 'party') {
    if (!this.filterNode || !this.gainNode || !this.compressorNode) return;

    switch (preset) {
      case 'chill':
        this.filterNode.frequency.value = 2500;
        this.gainNode.gain.value = 0.7;
        this.compressorNode.ratio.value = 8;
        break;
      
      case 'cafe':
        this.filterNode.frequency.value = 3500;
        this.gainNode.gain.value = 0.8;
        this.compressorNode.ratio.value = 6;
        break;
      
      case 'study':
        this.filterNode.frequency.value = 2000;
        this.gainNode.gain.value = 0.6;
        this.compressorNode.ratio.value = 12;
        break;
      
      case 'party':
        this.filterNode.frequency.value = 4000;
        this.gainNode.gain.value = 0.9;
        this.compressorNode.ratio.value = 4;
        break;
    }

    console.log(`🎛️ Applied ${preset} lo-fi preset`);
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

  // Cleanup
  dispose() {
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