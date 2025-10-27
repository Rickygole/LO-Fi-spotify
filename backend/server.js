const express = require('express');
const cors = require('cors');
const querystring = require('querystring');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true
}));
app.use(express.json());

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
  res.json({ message: 'Lo-Fi Spotify Backend is running!' });
});

// Step 1: Redirect to Spotify authorization
app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email playlist-read-private streaming user-read-playback-state user-modify-playback-state';
  
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
      state: state
    }));
});

// Step 2: Handle callback and exchange code for tokens
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (state === null || !code) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
    return;
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
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

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Redirect back to frontend with tokens
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
    res.redirect(`${clientUrl}/?` +
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

// Get playlist tracks
app.get('/playlist/:id/tracks', async (req, res) => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
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

// Get audio features for tracks (for BPM and energy analysis)
app.get('/audio-features/:ids', async (req, res) => {
  const { ids } = req.params;
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const response = await axios.get(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
      headers: {
        'Authorization': authHeader
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching audio features:', error.response?.data);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch audio features' });
  }
});

app.listen(port, () => {
  console.log(`🎵 Lo-Fi Spotify Backend listening at http://localhost:${port}`);
  console.log(`🔐 Make sure to set up your .env file with Spotify credentials`);
});