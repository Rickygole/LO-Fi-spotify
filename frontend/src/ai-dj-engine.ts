// AI-Powered DJ Engine for intelligent track selection and mixing
export interface TrackAnalysis {
  id: string;
  uri: string;
  name: string;
  artist: string;
  audioFeatures: {
    danceability: number;
    energy: number;
    key: number;
    loudness: number;
    mode: number;
    speechiness: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    valence: number;
    tempo: number;
    time_signature: number;
  };
  moodScore: {
    chill: number;
    cafe: number;
    study: number;
    party: number;
  };
  mixingCompatibility: number;
}

export interface DJTransition {
  fromTrack: TrackAnalysis;
  toTrack: TrackAnalysis;
  transitionType: 'crossfade' | 'beatmatch' | 'harmonic' | 'energy_build' | 'energy_drop';
  duration: number;
  fadeOutStart: number;
  fadeInStart: number;
  tempoAdjustment: number;
  keyCompatibility: number;
}

export type LofiMood = 'chill' | 'cafe' | 'study' | 'party';

export class AIDJEngine {
  private tracks: TrackAnalysis[] = [];
  private currentMood: LofiMood = 'chill';
  private currentTrackIndex: number = 0;
  private mixingHistory: string[] = [];
  private energyFlow: number[] = [];

  // Analyze tracks using Spotify's audio features
  async analyzeTracks(trackData: any[]): Promise<TrackAnalysis[]> {
    console.log('🤖 AI analyzing tracks for optimal DJ mixing...');
    
    const analyzed: TrackAnalysis[] = trackData.map(track => {
      const audioFeatures = track.audio_features || this.generateMockAudioFeatures();
      
      return {
        id: track.id,
        uri: track.uri,
        name: track.name,
        artist: track.artists?.[0]?.name || 'Unknown',
        audioFeatures,
        moodScore: this.calculateMoodScores(audioFeatures),
        mixingCompatibility: this.calculateMixingCompatibility(audioFeatures)
      };
    });

    this.tracks = analyzed;
    console.log(`✅ Analyzed ${analyzed.length} tracks for AI DJ mixing`);
    return analyzed;
  }

  // Calculate mood compatibility scores for each track
  private calculateMoodScores(features: any): TrackAnalysis['moodScore'] {
    return {
      // Chill: low energy, high acousticness, mid valence
      chill: (
        (1 - features.energy) * 0.4 +
        features.acousticness * 0.3 +
        (features.valence * 0.7) * 0.2 +
        (1 - features.danceability) * 0.1
      ),
      
      // Cafe: mid energy, acoustic elements, positive valence
      cafe: (
        (features.energy * 0.6) * 0.3 +
        features.acousticness * 0.25 +
        features.valence * 0.3 +
        (features.danceability * 0.7) * 0.15
      ),
      
      // Study: low energy, instrumental, consistent tempo
      study: (
        (1 - features.energy) * 0.35 +
        features.instrumentalness * 0.4 +
        (1 - features.speechiness) * 0.15 +
        (features.valence * 0.5) * 0.1
      ),
      
      // Party: high energy, high danceability, upbeat
      party: (
        features.energy * 0.4 +
        features.danceability * 0.35 +
        features.valence * 0.2 +
        (features.tempo / 200) * 0.05
      )
    };
  }

  // Calculate how well a track mixes with others
  private calculateMixingCompatibility(features: any): number {
    // Tracks with stable tempo, clear beat, and moderate complexity mix better
    return (
      (features.danceability * 0.3) +
      ((features.tempo > 80 && features.tempo < 140) ? 0.3 : 0.1) +
      (features.energy * 0.2) +
      ((1 - features.speechiness) * 0.2)
    );
  }

  // Generate mock audio features for testing
  private generateMockAudioFeatures() {
    return {
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
    };
  }

  // Create an intelligent playlist for the selected mood
  createMoodPlaylist(mood: LofiMood, maxTracks: number = 20): TrackAnalysis[] {
    console.log(`🎵 Creating AI-curated ${mood} playlist...`);
    
    // Sort tracks by mood compatibility
    const sortedTracks = [...this.tracks].sort((a, b) => 
      b.moodScore[mood] - a.moodScore[mood]
    );

    // Select top tracks with variety
    const selected: TrackAnalysis[] = [];
    const usedKeys: Set<number> = new Set();
    const energyTargets = this.generateEnergyFlow(mood, maxTracks);

    for (let i = 0; i < Math.min(maxTracks, sortedTracks.length); i++) {
      const targetEnergy = energyTargets[i];
      
      // Find track that matches energy target and adds variety
      const candidate = sortedTracks.find(track => 
        !selected.includes(track) &&
        Math.abs(track.audioFeatures.energy - targetEnergy) < 0.3 &&
        track.moodScore[mood] > 0.4
      ) || sortedTracks.find(track => !selected.includes(track));

      if (candidate) {
        selected.push(candidate);
        usedKeys.add(candidate.audioFeatures.key);
      }
    }

    this.energyFlow = energyTargets;
    console.log(`✅ Created ${selected.length} track playlist with AI curation`);
    return selected;
  }

  // Generate dynamic energy flow for the playlist
  private generateEnergyFlow(mood: LofiMood, trackCount: number): number[] {
    const flow: number[] = [];
    
    switch (mood) {
      case 'chill':
        // Gentle waves, mostly low energy
        for (let i = 0; i < trackCount; i++) {
          flow.push(0.2 + Math.sin(i * 0.3) * 0.15 + Math.random() * 0.1);
        }
        break;
        
      case 'cafe':
        // Steady mid-energy with gentle peaks
        for (let i = 0; i < trackCount; i++) {
          flow.push(0.4 + Math.sin(i * 0.2) * 0.2 + Math.random() * 0.1);
        }
        break;
        
      case 'study':
        // Very consistent, minimal variation
        for (let i = 0; i < trackCount; i++) {
          flow.push(0.25 + Math.random() * 0.1);
        }
        break;
        
      case 'party':
        // Building energy with peaks and valleys
        for (let i = 0; i < trackCount; i++) {
          const progress = i / trackCount;
          flow.push(0.5 + progress * 0.3 + Math.sin(i * 0.5) * 0.2);
        }
        break;
    }
    
    return flow.map(x => Math.max(0.1, Math.min(0.9, x)));
  }

  // Calculate optimal transition between two tracks
  calculateTransition(fromTrack: TrackAnalysis, toTrack: TrackAnalysis): DJTransition {
    const tempoRatio = toTrack.audioFeatures.tempo / fromTrack.audioFeatures.tempo;
    const keyDistance = this.calculateKeyDistance(
      fromTrack.audioFeatures.key, 
      toTrack.audioFeatures.key
    );
    const energyDiff = Math.abs(toTrack.audioFeatures.energy - fromTrack.audioFeatures.energy);

    // Determine transition type based on track characteristics
    let transitionType: DJTransition['transitionType'] = 'crossfade';
    let duration = 8000; // Default 8 seconds

    if (Math.abs(tempoRatio - 1) < 0.1 && keyDistance <= 2) {
      transitionType = 'beatmatch';
      duration = 16000; // Longer for beatmatching
    } else if (keyDistance <= 1) {
      transitionType = 'harmonic';
      duration = 12000;
    } else if (energyDiff > 0.3) {
      transitionType = energyDiff > 0 ? 'energy_build' : 'energy_drop';
      duration = 10000;
    }

    return {
      fromTrack,
      toTrack,
      transitionType,
      duration,
      fadeOutStart: 30000 - duration, // Start fade out before track ends
      fadeInStart: 0,
      tempoAdjustment: Math.max(0.8, Math.min(1.2, tempoRatio)),
      keyCompatibility: 1 - (keyDistance / 6) // Normalize to 0-1
    };
  }

  // Calculate musical key distance (Circle of Fifths)
  private calculateKeyDistance(key1: number, key2: number): number {
    const circleOfFifths = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
    const pos1 = circleOfFifths.indexOf(key1);
    const pos2 = circleOfFifths.indexOf(key2);
    
    if (pos1 === -1 || pos2 === -1) return 6; // Maximum distance if key not found
    
    const distance = Math.abs(pos1 - pos2);
    return Math.min(distance, 12 - distance); // Wrap around the circle
  }

  // Get next track recommendation
  getNextTrack(currentTrack: TrackAnalysis, remainingTracks: TrackAnalysis[]): TrackAnalysis | null {
    if (remainingTracks.length === 0) return null;

    // Score each remaining track for compatibility
    const scored = remainingTracks.map(track => ({
      track,
      score: this.calculateTransitionScore(currentTrack, track)
    }));

    // Sort by score and add some randomness for variety
    scored.sort((a, b) => b.score - a.score);
    
    // Pick from top 3 candidates with weighted randomness
    const topCandidates = scored.slice(0, Math.min(3, scored.length));
    const weights = [0.5, 0.3, 0.2];
    const random = Math.random();
    
    let cumulative = 0;
    for (let i = 0; i < topCandidates.length; i++) {
      cumulative += weights[i] || 0.1;
      if (random < cumulative) {
        return topCandidates[i].track;
      }
    }

    return topCandidates[0]?.track || null;
  }

  // Calculate transition compatibility score
  private calculateTransitionScore(from: TrackAnalysis, to: TrackAnalysis): number {
    const tempoCompatibility = 1 - Math.abs(from.audioFeatures.tempo - to.audioFeatures.tempo) / 100;
    const keyCompatibility = 1 - this.calculateKeyDistance(from.audioFeatures.key, to.audioFeatures.key) / 6;
    const energyCompatibility = 1 - Math.abs(from.audioFeatures.energy - to.audioFeatures.energy);
    const moodCompatibility = to.moodScore[this.currentMood];

    return (
      tempoCompatibility * 0.3 +
      keyCompatibility * 0.25 +
      energyCompatibility * 0.25 +
      moodCompatibility * 0.2
    );
  }

  // Set current mood for track selection
  setMood(mood: LofiMood) {
    this.currentMood = mood;
    console.log(`🎭 AI DJ mood set to: ${mood}`);
  }

  // Get optimal track order for seamless mixing
  optimizeTrackOrder(tracks: TrackAnalysis[]): TrackAnalysis[] {
    if (tracks.length <= 1) return tracks;

    console.log('🔄 AI optimizing track order for seamless flow...');
    
    const optimized: TrackAnalysis[] = [];
    const remaining = [...tracks];

    // Start with a good opening track (moderate energy, good mixing compatibility)
    const startTrack = remaining.reduce((best, track) => 
      track.mixingCompatibility > best.mixingCompatibility ? track : best
    );
    
    optimized.push(startTrack);
    remaining.splice(remaining.indexOf(startTrack), 1);

    // Build the rest of the playlist using AI transition scoring
    while (remaining.length > 0) {
      const current = optimized[optimized.length - 1];
      const next = this.getNextTrack(current, remaining);
      
      if (next) {
        optimized.push(next);
        remaining.splice(remaining.indexOf(next), 1);
      } else {
        // Fallback: add remaining tracks
        optimized.push(...remaining);
        break;
      }
    }

    console.log('✅ Track order optimized for AI DJ mixing');
    return optimized;
  }
}

export const aiDJEngine = new AIDJEngine();