import { useState, useRef, useEffect } from 'react'
import PreCallScreen from './components/PreCallScreen'
import CallScreen from './components/CallScreen'
import SummaryScreen from './components/SummaryScreen'
import {
  getAIResponse,
  generateSpeech,
  analyzeCall,
  RANDOM_PERSONALITIES,
  getVoiceForDifficulty,
} from './services/openai'

// ─── Ring Tone Generator (Web Audio API — no external file needed) ────────────
function createRingTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const master = ctx.createGain()
    master.connect(ctx.destination)

    const playRing = (start) => {
      const g = ctx.createGain()
      const o1 = ctx.createOscillator()
      const o2 = ctx.createOscillator()
      o1.frequency.value = 440
      o2.frequency.value = 480
      o1.connect(g)
      o2.connect(g)
      g.connect(master)
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.22, start + 0.06)
      g.gain.setValueAtTime(0.22, start + 1.5)
      g.gain.linearRampToValueAtTime(0, start + 1.7)
      o1.start(start); o2.start(start)
      o1.stop(start + 2); o2.stop(start + 2)
    }

    const now = ctx.currentTime
    playRing(now)
    playRing(now + 2.5)

    return {
      stop: () => {
        try {
          master.gain.setValueAtTime(0, ctx.currentTime)
          setTimeout(() => ctx.close(), 200)
        } catch (_) {}
      },
    }
  } catch (_) {
    return { stop: () => {} }
  }
}

// ─── Prospect greeting lines ──────────────────────────────────────────────────
function getInitialGreeting(difficulty, personality) {
  if (personality) {
    const map = {
      'Angry Executive': "Yeah? Who is this?",
      'Curious Skeptic': "Hello, who am I speaking with?",
      'The Confused One': "Hello? Um… who's calling?",
      'The Talker': "Oh hey! Who's this calling?",
      'Budget Hawk': "Hello?",
      'Gatekeeper Gloria': "Good afternoon, how may I direct your call?",
      'The Rushed CEO': "Yeah, make it fast.",
      'Friendly Tire-Kicker': "Hey! Who's this?",
    }
    return map[personality.name] ?? "Hello?"
  }

  const options = {
    easy: ["Hello?", "Hi there, who's calling?", "Good morning!"],
    medium: ["Yeah, who is this?", "Hello?", "Yes?"],
    hard: ["Yeah? I'm in a meeting.", "What is it?", "I'm busy — who's calling?"],
  }
  const opts = options[difficulty] ?? options.medium
  return opts[Math.floor(Math.random() * opts.length)]
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Screen: 'pre-call' | 'ringing' | 'call' | 'summary'
  const [screen, setScreen] = useState('pre-call')

  const [settings, setSettings] = useState({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
    difficulty: 'medium',
    practiceArea: '',
    useRandom: false,
  })

  // Call state (rendered to UI)
  const [callStatus, setCallStatus] = useState('idle') // idle | listening | processing | speaking
  const [conversation, setConversation] = useState([]) // { role, content }[]
  const [interimText, setInterimText] = useState('')
  const [callDuration, setCallDuration] = useState(0)
  const [personality, setPersonality] = useState(null)

  // Post-call
  const [summary, setSummary] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // UI
  const [error, setError] = useState('')

  // ── Refs (stable across renders, safe inside async callbacks) ──
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  const personalityRef = useRef(null)
  const convRef = useRef([])          // mirrors conversation state
  const callActiveRef = useRef(false) // false = call has ended, abort everything
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const audioResolveRef = useRef(null) // lets handleEndCall unblock speakAI's await
  const timerRef = useRef(null)
  const ringRef = useRef(null)
  // Replay: stores the last AI audio URL so the user can replay it
  const lastAudioUrlRef = useRef(null)
  const [canReplay, setCanReplay] = useState(false)

  // Function refs — break the circular dependency between speakAI ↔ listen ↔ handleSpeech
  const speakAIRef = useRef(null)
  const startListeningRef = useRef(null)
  const handleUserSpeechRef = useRef(null)

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const setConv = (msgs) => {
    convRef.current = msgs
    setConversation([...msgs])
  }

  const fmt = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // ── 3. Handle what the user said ─────────────────────────────────────────────
  // Defined first so startListening can reference it via ref.
  const handleUserSpeech = async (text) => {
    if (!text?.trim() || !callActiveRef.current) return

    setCallStatus('processing')
    setInterimText('')

    const newConv = [...convRef.current, { role: 'user', content: text.trim() }]
    setConv(newConv)

    try {
      const { apiKey, difficulty, practiceArea } = settingsRef.current
      const aiText = await getAIResponse(apiKey, newConv, difficulty, practiceArea, personalityRef.current)

      if (!callActiveRef.current) return // Call ended while we were waiting

      const withAI = [...newConv, { role: 'assistant', content: aiText }]
      setConv(withAI)

      speakAIRef.current?.(aiText)
    } catch (e) {
      console.error('AI response error:', e)
      setError(`AI Error: ${e.message}`)
      if (callActiveRef.current) setTimeout(() => startListeningRef.current?.(), 600)
    }
  }
  handleUserSpeechRef.current = handleUserSpeech

  // ── 2. Start speech recognition ───────────────────────────────────────────────
  const startListeningForUser = () => {
    if (!callActiveRef.current) return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition requires Chrome or Edge. TTS will still play, but you cannot speak.')
      return
    }

    // Tear down any previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch (_) {}
    }

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    setCallStatus('listening')
    setInterimText('')

    recognition.onresult = (event) => {
      let final = '', interim = ''
      for (const result of event.results) {
        if (result.isFinal) final += result[0].transcript
        else interim += result[0].transcript
      }
      setInterimText(interim || final)
      if (final.trim()) {
        recognition.stop()
        handleUserSpeechRef.current?.(final.trim())
      }
    }

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') {
        // Restart automatically on silence — user may just be thinking
        if (callActiveRef.current) setTimeout(() => startListeningRef.current?.(), 250)
      } else if (e.error !== 'aborted') {
        console.warn('Speech recognition error:', e.error)
      }
    }

    try { recognition.start() } catch (_) {}
  }
  startListeningRef.current = startListeningForUser

  // ── 1. Speak AI text via TTS, then start listening ───────────────────────────
  const speakAI = async (text) => {
    if (!callActiveRef.current) return

    setCallStatus('speaking')

    // Stop whatever is currently playing
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    window.speechSynthesis.cancel()

    const { apiKey, difficulty } = settingsRef.current
    const voice = personalityRef.current?.voice ?? getVoiceForDifficulty(difficulty)
    let played = false

    // ── Try OpenAI TTS (higher quality) ──
    if (apiKey) {
      try {
        const audioUrl = await generateSpeech(apiKey, text, voice)
        if (!callActiveRef.current) return

        // Store for replay button
        lastAudioUrlRef.current = audioUrl
        setCanReplay(true)

        const audio = new Audio(audioUrl)
        audioRef.current = audio

        await new Promise((resolve, reject) => {
          // Store resolve so handleEndCall can unblock us immediately
          audioResolveRef.current = resolve
          audio.onended = () => { audioResolveRef.current = null; resolve() }
          audio.onerror = () => { audioResolveRef.current = null; reject(new Error('Audio playback failed')) }
          audio.play().catch(reject)
        })

        played = true
      } catch (e) {
        if (e.message !== 'Audio playback failed') {
          console.warn('OpenAI TTS failed, falling back to browser TTS:', e.message)
        }
      }
    }

    // ── Fallback: browser Web Speech Synthesis ──
    if (!played && callActiveRef.current) {
      await new Promise((resolve) => {
        audioResolveRef.current = resolve
        const utt = new SpeechSynthesisUtterance(text)
        utt.rate = 1.0
        utt.pitch = 0.85
        utt.volume = 1.0
        // Prefer a network voice if available
        const voices = window.speechSynthesis.getVoices()
        const pick =
          voices.find((v) => v.lang === 'en-US' && !v.localService) ??
          voices.find((v) => v.lang.startsWith('en'))
        if (pick) utt.voice = pick
        utt.onend = () => { audioResolveRef.current = null; resolve() }
        utt.onerror = () => { audioResolveRef.current = null; resolve() }
        window.speechSynthesis.speak(utt)
      })
    }

    // After AI finishes speaking, hand the mic back to the user
    if (callActiveRef.current) startListeningRef.current?.()
  }
  speakAIRef.current = speakAI

  // ── Start Call ────────────────────────────────────────────────────────────────
  const handleStartCall = async () => {
    if (!settings.apiKey.trim()) {
      setError('Please enter your OpenAI API key to continue.')
      return
    }

    setError('')
    callActiveRef.current = true
    convRef.current = []
    setConversation([])
    setSummary(null)
    setCallDuration(0)
    setInterimText('')

    // Pick personality
    let p = null
    if (settings.useRandom) {
      p = RANDOM_PERSONALITIES[Math.floor(Math.random() * RANDOM_PERSONALITIES.length)]
    }
    setPersonality(p)
    personalityRef.current = p

    setScreen('ringing')
    ringRef.current = createRingTone()

    // Answer after 3 seconds
    setTimeout(async () => {
      ringRef.current?.stop()
      ringRef.current = null

      setScreen('call')
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000)

      const greeting = getInitialGreeting(settings.difficulty, p)
      setConv([{ role: 'assistant', content: greeting }])

      await speakAI(greeting)
    }, 3000)
  }

  // ── End Call ──────────────────────────────────────────────────────────────────
  const handleEndCall = async () => {
    callActiveRef.current = false

    // Stop mic
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch (_) {}
      recognitionRef.current = null
    }

    // Stop audio and unblock any waiting speakAI promise
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    audioResolveRef.current?.()
    audioResolveRef.current = null
    window.speechSynthesis.cancel()

    // Stop timer
    clearInterval(timerRef.current)
    timerRef.current = null

    setCallStatus('idle')
    setInterimText('')
    setScreen('summary')
    setIsAnalyzing(true)

    try {
      const analysis = await analyzeCall(
        settingsRef.current.apiKey,
        convRef.current,
        settingsRef.current.difficulty,
        settingsRef.current.practiceArea,
      )
      setSummary(analysis)
    } catch (e) {
      console.error('Analysis failed:', e)
      setSummary({ error: `Could not generate analysis: ${e.message}` })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Replay last AI audio ──────────────────────────────────────────────────────
  const handleReplay = () => {
    if (!lastAudioUrlRef.current) return
    const audio = new Audio(lastAudioUrlRef.current)
    audio.play().catch(() => {})
  }

  // ── New Call ──────────────────────────────────────────────────────────────────
  const handleNewCall = () => {
    setSummary(null)
    setConversation([])
    convRef.current = []
    setPersonality(null)
    personalityRef.current = null
    setCallDuration(0)
    setError('')
    setCanReplay(false)
    lastAudioUrlRef.current = null
    setScreen('pre-call')
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {screen === 'pre-call' && (
        <PreCallScreen
          settings={settings}
          onSettingsChange={setSettings}
          onStartCall={handleStartCall}
          error={error}
        />
      )}

      {(screen === 'ringing' || screen === 'call') && (
        <CallScreen
          isRinging={screen === 'ringing'}
          settings={settings}
          callStatus={callStatus}
          callDuration={fmt(callDuration)}
          interimText={interimText}
          conversation={conversation}
          personality={personality}
          onEndCall={handleEndCall}
          onReplay={handleReplay}
          canReplay={canReplay}
          error={error}
        />
      )}

      {screen === 'summary' && (
        <SummaryScreen
          summary={summary}
          conversation={conversation}
          callDuration={fmt(callDuration)}
          isAnalyzing={isAnalyzing}
          settings={settings}
          onNewCall={handleNewCall}
        />
      )}
    </div>
  )
}
