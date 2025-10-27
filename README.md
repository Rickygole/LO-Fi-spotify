# 🎵 Lo-Fi Spotify DJ

Transform your Spotify playlists into seamless lo-fi DJ mixes with real-time audio effects and intelligent transitions.

![Lo-Fi Spotify DJ](https://img.shields.io/badge/Spotify-1DB954?style=for-the-badge&logo=spotify&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)

## ✨ Features

- 🎧 **Seamless DJ-style transitions** between tracks
- ✨ **Real-time lo-fi filters** (vinyl crackle, warmth, compression)
- 🎚️ **Multiple vibes**: lo-fi chill, café, study mode, party flow
- 🎼 **AI-powered BPM and energy matching** for perfect transitions
- 🎵 **Spotify-styled interface** that feels native
- 🔐 **Secure OAuth authentication** with Spotify

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Spotify Developer Account
- Spotify Premium (required for Web Playback SDK)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rickygole/LO-Fi-spotify.git
   cd LO-Fi-spotify
   ```

2. **Set up Spotify Developer App**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add redirect URI: `http://127.0.0.1:3000/callback`
   - Note your Client ID and Client Secret

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your Spotify credentials
   npm run dev
   ```

4. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

5. **Environment Variables**
   
   Update `backend/.env` with your Spotify app credentials:
   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
   CLIENT_URL=http://localhost:5174
   PORT=3000
   ```

## 🎯 How It Works

1. **Authentication**: Secure OAuth flow with Spotify
2. **Playlist Selection**: Choose any of your Spotify playlists
3. **Audio Analysis**: Analyze BPM, energy, and key of each track
4. **Lo-Fi Processing**: Apply real-time audio effects using Web Audio API
5. **Smart Mixing**: Intelligent crossfading based on musical compatibility

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express** - Authentication server
- **Spotify Web API** - Access user data and audio features
- **OAuth 2.0** - Secure authentication flow

### Frontend
- **React** + **TypeScript** - Modern UI framework
- **Vite** - Fast development and building
- **Spotify Web Playback SDK** - Music playback
- **Web Audio API** - Real-time audio processing

## 🎚️ Audio Effects

- **Lo-Fi Filters**: Warm, vintage sound processing
- **Vinyl Crackle**: Authentic analog warmth
- **Compression**: Smooth, cohesive mixing
- **EQ Processing**: Frequency shaping for lo-fi aesthetics
- **Reverb**: Ambient spatial effects

## 🎵 Mood Presets

- **🌙 Lo-Fi Chill**: Dreamy and relaxed
- **☕ Café Vibes**: Warm and cozy
- **📚 Study Mode**: Focus and concentration
- **🎉 Party Flow**: Upbeat and energetic

## 📁 Project Structure

```
LO-Fi-spotify/
├── backend/
│   ├── server.js          # Express server with OAuth
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment template
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── types.ts       # TypeScript definitions
│   │   └── spotify-api.ts # API utilities
│   ├── package.json       # Frontend dependencies
│   └── vite.config.ts     # Vite configuration
└── README.md
```

## 🚧 Development Status

- ✅ **Phase 1**: Spotify Authentication & Playlist Selection
- 🚧 **Phase 2**: Web Playback SDK Integration
- 📋 **Phase 3**: Lo-Fi Audio Effects
- 📋 **Phase 4**: Smart Crossfading System
- 📋 **Phase 5**: UI Polish & Testing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Spotify Developer Documentation](https://developer.spotify.com/documentation/)
- [Web Audio API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [React Documentation](https://reactjs.org/)

---

**Made with ❤️ for music lovers who appreciate the lo-fi aesthetic**