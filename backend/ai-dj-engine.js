const axios = require('axios');

class AIDJEngine {
  constructor() {
    this.currentMix = null;
    this.trackQueue = [];
    this.audioFeatures = new Map();
    this.analysisCache = new Map();
  }

  // Analyze a track's audio features for DJ mixing
  async analyzeTrack(trackId, accessToken) {
    if (this.audioFeatures.has(trackId)) {
      return this.audioFeatures.get(trackId);
    }

    try {
      // Get audio features from Spotify
      const [featuresResponse, analysisResponse] = await Promise.all([
        axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        axios.get(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
      ]);

      const features = featuresResponse.data;
      const analysis = analysisResponse.data;

      const aiAnalysis = {
        // Basic audio features
        tempo: features.tempo,
        key: features.key,
        mode: features.mode,
        energy: features.energy,
        valence: features.valence,
        danceability: features.danceability,
        acousticness: features.acousticness,
        loudness: features.loudness,
        
        // Advanced analysis for DJ mixing
        timeSignature: features.time_signature,
        bars: analysis.bars?.length || 0,
        beats: analysis.beats?.length || 0,
        sections: analysis.sections || [],
        segments: analysis.segments || [],
        
        // AI-computed DJ metrics
        mixability: this.calculateMixability(features),
        energyFlow: this.calculateEnergyFlow(features),
        harmonicKey: this.getHarmonicKey(features.key, features.mode),
        beatMatchability: this.calculateBeatMatchability(features.tempo),
        transitionPoints: this.findTransitionPoints(analysis),
        
        // Mood classification
        mood: this.classifyMood(features),
        djRating: this.calculateDJRating(features, analysis)
      };

      this.audioFeatures.set(trackId, aiAnalysis);
      return aiAnalysis;
    } catch (error) {
      console.error(`Failed to analyze track ${trackId}:`, error);
      return null;
    }
  }

  // Calculate how well a track mixes with others
  calculateMixability(features) {
    const tempoScore = Math.max(0, 1 - Math.abs(features.tempo - 120) / 60); // Prefer 120 BPM
    const energyScore = features.energy;
    const danceabilityScore = features.danceability;
    
    return (tempoScore * 0.4 + energyScore * 0.3 + danceabilityScore * 0.3) * 100;
  }

  // Calculate energy progression for seamless mixing
  calculateEnergyFlow(features) {
    const energy = features.energy;
    const valence = features.valence;
    const danceability = features.danceability;
    
    return {
      intro: energy * 0.7,
      build: energy * 0.85,
      peak: energy,
      breakdown: energy * 0.6,
      outro: energy * 0.5,
      overallEnergy: (energy + valence + danceability) / 3
    };
  }

  // Get harmonic key for key-compatible mixing
  getHarmonicKey(key, mode) {
    const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const keyName = keyNames[key] || 'Unknown';
    const modeName = mode === 1 ? 'Major' : 'Minor';
    
    // Camelot key system for harmonic mixing
    const camelotKeys = {
      'C Major': '8B', 'C Minor': '5A',
      'C# Major': '3B', 'C# Minor': '12A',
      'D Major': '10B', 'D Minor': '7A',
      'D# Major': '5B', 'D# Minor': '2A',
      'E Major': '12B', 'E Minor': '9A',
      'F Major': '7B', 'F Minor': '4A',
      'F# Major': '2B', 'F# Minor': '11A',
      'G Major': '9B', 'G Minor': '6A',
      'G# Major': '4B', 'G# Minor': '1A',
      'A Major': '11B', 'A Minor': '8A',
      'A# Major': '6B', 'A# Minor': '3A',
      'B Major': '1B', 'B Minor': '10A'
    };
    
    return {
      key: keyName,
      mode: modeName,
      camelot: camelotKeys[`${keyName} ${modeName}`] || 'Unknown',
      numeric: key
    };
  }

  // Calculate how well track tempo can be beat-matched
  calculateBeatMatchability(tempo) {
    // Higher score for tempos that are easy to match
    const idealRange = tempo >= 100 && tempo <= 140;
    const stability = 100 - Math.abs(tempo % 1); // Prefer whole BPM values
    
    return {
      score: idealRange ? 90 + stability * 0.1 : 60 + stability * 0.1,
      canHalveTime: tempo >= 140,
      canDoubleTime: tempo <= 90,
      originalTempo: tempo
    };
  }

  // Find the best points to transition in/out of track
  findTransitionPoints(analysis) {
    const sections = analysis.sections || [];
    const bars = analysis.bars || [];
    
    return {
      introEnd: sections.find(s => s.confidence > 0.5)?.start || 8,
      outroStart: sections.length > 1 ? sections[sections.length - 2].start : -32,
      breakdowns: sections.filter(s => s.loudness < -20).map(s => s.start),
      buildups: sections.filter(s => s.loudness > -10).map(s => s.start),
      phraseMarkers: bars.filter((_, i) => i % 16 === 0).map(b => b.start)
    };
  }

  // AI mood classification for lo-fi vibes
  classifyMood(features) {
    const { energy, valence, acousticness, danceability, tempo } = features;
    
    if (energy < 0.4 && valence < 0.5 && acousticness > 0.3) {
      return 'chill';
    } else if (energy < 0.6 && acousticness > 0.2 && tempo < 110) {
      return 'cafe';
    } else if (energy < 0.5 && valence < 0.6 && danceability < 0.6) {
      return 'study';
    } else if (energy > 0.6 && danceability > 0.6) {
      return 'party';
    } else {
      return 'chill'; // Default to chill
    }
  }

  // Overall DJ rating for track selection
  calculateDJRating(features, analysis) {
    const mixability = this.calculateMixability(features);
    const energyConsistency = 100 - (Math.abs(features.energy - 0.5) * 100);
    const tempoStability = features.tempo % 1 === 0 ? 100 : 80;
    const sectionCount = (analysis.sections?.length || 0) > 3 ? 100 : 60;
    
    return Math.round((mixability + energyConsistency + tempoStability + sectionCount) / 4);
  }

  // AI-powered track ordering for optimal flow
  async createIntelligentPlaylist(tracks, mood, accessToken) {
    console.log(`🤖 AI analyzing ${tracks.length} tracks for optimal ${mood} flow...`);
    
    // Analyze all tracks
    const analyzedTracks = [];
    for (const track of tracks) {
      const analysis = await this.analyzeTrack(track.id, accessToken);
      if (analysis) {
        analyzedTracks.push({ ...track, analysis });
      }
    }

    // Filter tracks that match the mood
    const moodTracks = analyzedTracks.filter(track => 
      track.analysis.mood === mood || track.analysis.djRating > 70
    );

    // AI sorting algorithm for optimal energy flow
    const sortedTracks = this.aiSortTracks(moodTracks, mood);
    
    console.log(`🎯 AI selected ${sortedTracks.length} tracks with optimal flow`);
    return sortedTracks;
  }

  // Advanced AI sorting for energy flow and harmonic mixing
  aiSortTracks(tracks, mood) {
    if (tracks.length === 0) return [];

    // Define energy curves for different moods
    const energyCurves = {
      chill: [0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.2],
      study: [0.3, 0.4, 0.5, 0.5, 0.4, 0.3, 0.2],
      cafe: [0.4, 0.5, 0.6, 0.5, 0.4, 0.3, 0.2],
      party: [0.5, 0.6, 0.7, 0.8, 0.9, 0.7, 0.5]
    };

    const targetCurve = energyCurves[mood];
    const result = [];
    const remaining = [...tracks];

    // Start with a good opening track
    let currentTrack = remaining.reduce((best, track) => 
      Math.abs(track.analysis.energyFlow.overallEnergy - targetCurve[0]) < 
      Math.abs(best.analysis.energyFlow.overallEnergy - targetCurve[0]) ? track : best
    );

    result.push(currentTrack);
    remaining.splice(remaining.indexOf(currentTrack), 1);

    // Build the rest of the playlist with AI logic
    for (let i = 1; i < Math.min(remaining.length + 1, 20); i++) {
      const targetEnergy = targetCurve[Math.floor(i * (targetCurve.length - 1) / 19)];
      
      const nextTrack = this.findBestNextTrack(currentTrack, remaining, targetEnergy);
      if (nextTrack) {
        result.push(nextTrack);
        remaining.splice(remaining.indexOf(nextTrack), 1);
        currentTrack = nextTrack;
      }
    }

    return result;
  }

  // Find the best next track based on harmonic mixing and energy flow
  findBestNextTrack(currentTrack, candidates, targetEnergy) {
    if (candidates.length === 0) return null;

    return candidates.reduce((best, candidate) => {
      const currentScore = this.calculateTransitionScore(currentTrack, candidate, targetEnergy);
      const bestScore = this.calculateTransitionScore(currentTrack, best, targetEnergy);
      return currentScore > bestScore ? candidate : best;
    });
  }

  // Score how well two tracks transition together
  calculateTransitionScore(trackA, trackB, targetEnergy) {
    const tempoCompatibility = this.calculateTempoCompatibility(trackA.analysis.tempo, trackB.analysis.tempo);
    const keyCompatibility = this.calculateKeyCompatibility(trackA.analysis.harmonicKey, trackB.analysis.harmonicKey);
    const energyFlow = 100 - Math.abs(trackB.analysis.energyFlow.overallEnergy - targetEnergy) * 100;
    const moodConsistency = trackA.analysis.mood === trackB.analysis.mood ? 100 : 70;

    return (tempoCompatibility * 0.3 + keyCompatibility * 0.25 + energyFlow * 0.3 + moodConsistency * 0.15);
  }

  // Calculate tempo compatibility for beat-matching
  calculateTempoCompatibility(tempoA, tempoB) {
    const diff = Math.abs(tempoA - tempoB);
    if (diff <= 3) return 100; // Perfect match
    if (diff <= 6) return 90;  // Good match
    if (diff <= 10) return 70; // Okay match
    
    // Check for harmonic tempo relationships (2:1, 3:2, etc.)
    const ratios = [2, 1.5, 0.75, 0.5];
    for (const ratio of ratios) {
      if (Math.abs(tempoA - (tempoB * ratio)) <= 3) {
        return 85; // Good harmonic match
      }
    }
    
    return Math.max(0, 50 - diff * 2); // Penalty for large differences
  }

  // Calculate harmonic key compatibility
  calculateKeyCompatibility(keyA, keyB) {
    if (keyA.camelot === keyB.camelot) return 100; // Same key
    
    // Compatible keys in Camelot system
    const camelotA = keyA.camelot;
    const camelotB = keyB.camelot;
    
    if (!camelotA || !camelotB) return 50;
    
    const numA = parseInt(camelotA);
    const letterA = camelotA.slice(-1);
    const numB = parseInt(camelotB);
    const letterB = camelotB.slice(-1);
    
    // Perfect harmony rules
    if (letterA === letterB && Math.abs(numA - numB) === 1) return 95; // Adjacent same letter
    if (numA === numB && letterA !== letterB) return 90; // Same number different letter
    if (Math.abs(numA - numB) === 7) return 85; // Perfect fifth
    
    return 60; // Neutral compatibility
  }

  // Real-time AI decisions during playback
  makeRealtimeDecision(currentTrack, nextTrack, playbackPosition) {
    const transition = this.calculateOptimalTransition(currentTrack, nextTrack, playbackPosition);
    
    return {
      shouldTransition: transition.shouldStart,
      crossfadeStart: transition.crossfadeStart,
      crossfadeDuration: transition.duration,
      tempoAdjustment: transition.tempoAdjustment,
      aiReasoning: transition.reasoning,
      confidence: transition.confidence
    };
  }

  // Calculate optimal transition timing
  calculateOptimalTransition(currentTrack, nextTrack, position) {
    const trackDuration = currentTrack.duration_ms / 1000;
    const timeRemaining = trackDuration - position;
    
    // AI decision logic
    const outroStart = currentTrack.analysis?.transitionPoints?.outroStart || (trackDuration - 30);
    const shouldStart = position >= outroStart && timeRemaining <= 30;
    
    const tempoRatio = nextTrack.analysis.tempo / currentTrack.analysis.tempo;
    const crossfadeDuration = this.calculateCrossfadeDuration(currentTrack.analysis, nextTrack.analysis);
    
    return {
      shouldStart,
      crossfadeStart: Math.max(outroStart, trackDuration - crossfadeDuration),
      duration: crossfadeDuration,
      tempoAdjustment: tempoRatio > 1.1 || tempoRatio < 0.9 ? tempoRatio : 1.0,
      reasoning: `AI suggests ${crossfadeDuration}s crossfade based on tempo compatibility and energy flow`,
      confidence: this.calculateTransitionScore(currentTrack, nextTrack, nextTrack.analysis.energyFlow.overallEnergy)
    };
  }

  // Calculate optimal crossfade duration based on track characteristics
  calculateCrossfadeDuration(analysisA, analysisB) {
    const tempoCompatibility = this.calculateTempoCompatibility(analysisA.tempo, analysisB.tempo);
    const keyCompatibility = this.calculateKeyCompatibility(analysisA.harmonicKey, analysisB.harmonicKey);
    
    // Longer crossfades for difficult transitions
    if (tempoCompatibility < 70 || keyCompatibility < 70) {
      return 12; // Long crossfade for difficult mixes
    } else if (tempoCompatibility > 90 && keyCompatibility > 90) {
      return 6;  // Short crossfade for perfect matches
    } else {
      return 8;  // Medium crossfade for good matches
    }
  }
}

module.exports = new AIDJEngine();