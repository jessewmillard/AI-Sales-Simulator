/**
 * AI Sales Call Simulator
 * =======================
 *
 * HOW TO RUN LOCALLY:
 *   1. Install Node.js 18+  →  https://nodejs.org
 *   2. cd into this folder
 *   3. npm install
 *   4. npm run dev
 *   5. Open  http://localhost:3000
 *   6. Paste your OpenAI API key in the app and click "Start Call"
 *
 * REQUIREMENTS:
 *   - OpenAI API key with access to gpt-4o-mini + tts-1
 *       https://platform.openai.com/api-keys
 *   - Chrome or Edge (Web Speech API for mic input)
 *   - Microphone permission when prompted
 *
 * APPROXIMATE COST PER CALL:
 *   ~$0.05–$0.15 for a 5-minute session (gpt-4o-mini + tts-1)
 *
 * BROWSER NOTES:
 *   - Chrome / Edge  → full voice in + voice out
 *   - Firefox / Safari → OpenAI TTS plays fine, but speech-to-text
 *     requires Chrome/Edge (Web Speech API limitation)
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
