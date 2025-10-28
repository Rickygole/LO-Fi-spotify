const axios = require('axios');
require('dotenv').config();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function testSpotifyCredentials() {
  try {
    console.log('Testing Spotify credentials...');
    console.log('Client ID:', CLIENT_ID);
    console.log('Client Secret:', CLIENT_SECRET ? `${CLIENT_SECRET.substring(0, 8)}...` : 'NOT_SET');
    
    // Test client credentials flow
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'client_credentials'
      }), {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ Credentials are valid!');
    console.log('Token type:', response.data.token_type);
    console.log('Expires in:', response.data.expires_in, 'seconds');
    
    // Test a simple API call
    const apiResponse = await axios.get('https://api.spotify.com/v1/browse/categories?limit=1', {
      headers: {
        'Authorization': `Bearer ${response.data.access_token}`
      }
    });
    
    console.log('✅ API access working!');
    console.log('API Response status:', apiResponse.status);
    
  } catch (error) {
    console.error('❌ Error testing credentials:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testSpotifyCredentials();