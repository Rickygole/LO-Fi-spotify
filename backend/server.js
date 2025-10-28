const express = require('express');
const cors = require('cors');
const querystring = require('querystring');
const axios = require('axios');
const session = require('express-session');
const aiDJ = require('./ai-dj-engine');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Spotify API configuration
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/callback';

// Generate random string for state parameter
const generateRandomString = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Lofi - Spotify Backend is running!' });
});

// Debug endpoint to check credentials (remove in production!)
app.get('/debug', (req, res) => {
  res.json({ 
    client_id: CLIENT_ID ? `${CLIENT_ID.substring(0, 8)}...` : 'NOT_SET',
    client_secret: CLIENT_SECRET ? `${CLIENT_SECRET.substring(0, 8)}...` : 'NOT_SET',
    redirect_uri: REDIRECT_URI,
    all_env_vars: Object.keys(process.env).filter(key => key.startsWith('SPOTIFY'))
  });
});

// Step 1: Redirect to Spotify authorization
app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state streaming';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
      state: state
    }));
});

// Step 2: Handle the callback from Spotify
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (state === null) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token',
        querystring.stringify({
          code: code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        }), {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      // Store tokens in session
      req.session.access_token = access_token;
      req.session.refresh_token = refresh_token;

      // Redirect to frontend with token
      res.redirect((process.env.CLIENT_URL || 'http://localhost:5173') + '/#' +
        querystring.stringify({
          access_token: access_token,
          refresh_token: refresh_token,
          expires_in: expires_in
        }));
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data);
      res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
    }
  }
});

// Step 3: Refresh access token
app.post('/refresh_token', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      }), {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data);
    res.status(400).json({ error: 'Invalid refresh token' });
  }
});

// Get user's playlists
app.get('/playlists', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': authHeader
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching playlists:', error.response?.data);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get current access token for Web Playback SDK
app.get('/api/token', (req, res) => {
  // This should ideally get the token from session/storage
  // For now, we'll use a stored token from the OAuth flow
  const token = req.session?.access_token;
  
  if (!token) {
    return res.status(401).json({ error: 'No access token available. Please login again.' });
  }
  
  res.json({ access_token: token });
});

// AI DJ Routes

// Analyze playlist and create AI-optimized track order
app.post('/api/ai-dj/analyze-playlist', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const { tracks, mood } = req.body;
    const accessToken = authHeader.replace('Bearer ', '');
    
    console.log(`🤖 AI DJ analyzing ${tracks.length} tracks for ${mood} mood...`);
    
    const optimizedPlaylist = await aiDJ.createIntelligentPlaylist(tracks, mood, accessToken);
    
    res.json({
      success: true,
      originalCount: tracks.length,
      optimizedCount: optimizedPlaylist.length,
      playlist: optimizedPlaylist,
      aiInsights: {
        averageEnergy: optimizedPlaylist.reduce((sum, t) => sum + t.analysis.energyFlow.overallEnergy, 0) / optimizedPlaylist.length,
        tempoRange: {
          min: Math.min(...optimizedPlaylist.map(t => t.analysis.tempo)),
          max: Math.max(...optimizedPlaylist.map(t => t.analysis.tempo))
        },
        keyDistribution: optimizedPlaylist.reduce((acc, t) => {
          const key = t.analysis.harmonicKey.camelot;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
        mood: mood,
        djRating: optimizedPlaylist.reduce((sum, t) => sum + t.analysis.djRating, 0) / optimizedPlaylist.length
      }
    });
  } catch (error) {
    console.error('AI playlist analysis failed:', error);
    res.status(500).json({ error: 'Failed to analyze playlist with AI' });
  }
});

// Get real-time AI transition decision
app.post('/api/ai-dj/transition-decision', async (req, res) => {
  try {
    const { currentTrack, nextTrack, playbackPosition } = req.body;
    
    const decision = aiDJ.makeRealtimeDecision(currentTrack, nextTrack, playbackPosition);
    
    res.json({
      success: true,
      decision,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('AI transition decision failed:', error);
    res.status(500).json({ error: 'Failed to get AI transition decision' });
  }
});

// Analyze single track with AI
app.get('/api/ai-dj/analyze-track/:trackId', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const { trackId } = req.params;
    const accessToken = authHeader.replace('Bearer ', '');
    
    const analysis = await aiDJ.analyzeTrack(trackId, accessToken);
    
    if (analysis) {
      res.json({ success: true, analysis });
    } else {
      res.status(404).json({ error: 'Track analysis failed' });
    }
  } catch (error) {
    console.error('Track analysis failed:', error);
    res.status(500).json({ error: 'Failed to analyze track' });
  }
});

// Get playlist tracks with optional limit
app.get('/playlist/:id/tracks', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const { id } = req.params;
    const limit = req.query.limit || 50;
    
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=${limit}`, {
      headers: {
        'Authorization': authHeader
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching playlist tracks:', error.response?.data);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch playlist tracks' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(port, () => {
  console.log(`🎵 Lofi - Spotify backend running on http://127.0.0.1:${port}`);
});