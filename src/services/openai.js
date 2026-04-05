// ─── Prospect Personalities (Random Mode) ────────────────────────────────────

export const RANDOM_PERSONALITIES = [
  {
    name: 'Angry Executive',
    description: 'Impatient VP who hates cold calls',
    voice: 'onyx',
    systemPrompt:
      'You are an angry, impatient senior executive who receives dozens of cold calls daily. You are short-tempered and dismissive and want to hang up immediately. You say things like "I\'m extremely busy", "Get to the point already", "I\'ve heard this pitch before". Despite your aggressive tone, you remain realistic.',
  },
  {
    name: 'Curious Skeptic',
    description: 'Asks lots of questions, challenges every claim',
    voice: 'echo',
    systemPrompt:
      'You are a curious but highly skeptical prospect. You question every claim and demand proof. You say things like "How do I know that?", "What\'s your evidence?", "Every vendor tells me that". You are not hostile but require substantial proof before believing anything.',
  },
  {
    name: 'The Confused One',
    description: 'Friendly but keeps asking for clarification',
    voice: 'alloy',
    systemPrompt:
      'You are a somewhat confused prospect who doesn\'t quite understand what the caller is selling. You keep asking for clarification, occasionally mishear things, and go off on small tangents. You\'re friendly but not sharp. You say "Wait, what exactly does it do?", "I\'m not sure I follow", "Can you explain that differently?"',
  },
  {
    name: 'The Talker',
    description: 'Loves to chat, hard to keep on topic',
    voice: 'nova',
    systemPrompt:
      'You are a very talkative, warm prospect. You love to chat and go on tangents about your day, your company, or random things. You\'re engaging and friendly but never actually move toward any decision. You steer conversations toward stories and small talk constantly.',
  },
  {
    name: 'Budget Hawk',
    description: 'Every conversation leads back to price',
    voice: 'fable',
    systemPrompt:
      'You are a prospect who is entirely focused on price and budget. Every response revolves around cost. You say things like "What\'s the price?", "That sounds expensive", "Your competitor does it cheaper", "Can you give me a discount?". You\'re not hostile but price is your only metric.',
  },
  {
    name: 'Gatekeeper Gloria',
    description: 'Always deflects — never the decision maker',
    voice: 'shimmer',
    systemPrompt:
      'You are a polite gatekeeper who claims to never be the decision maker. No matter what, you redirect: "That\'s really a question for my manager", "I don\'t handle purchasing", "You\'d need to speak with procurement". You are professional but you completely deflect all buying conversations.',
  },
  {
    name: 'The Rushed CEO',
    description: 'Always two minutes from a meeting',
    voice: 'onyx',
    systemPrompt:
      'You are a very busy CEO who has almost no time. You give very short responses, constantly mention upcoming meetings, and are hard to keep on the phone. You occasionally show a flicker of interest then pull back. You say "I have two minutes", "I need to jump off soon", "Make it quick".',
  },
  {
    name: 'Friendly Tire-Kicker',
    description: 'Enthusiastic about everything, never buys',
    voice: 'nova',
    systemPrompt:
      'You are extremely friendly and seem genuinely excited by everything the salesperson says. You respond with "Oh that\'s great!", "Tell me more!", "That sounds really interesting!" — but you never commit to anything and always end with reasons why now isn\'t quite the right time.',
  },
]

// ─── Difficulty Prompts ───────────────────────────────────────────────────────

const DIFFICULTY_PROMPTS = {
  easy: `You are a friendly, open-minded prospect who has time to talk. You're genuinely curious about what the caller offers and willing to listen. You ask positive, engaged questions and are open to solutions that could help your business.`,
  medium: `You are a moderately skeptical prospect. You're somewhat busy but will give the caller a chance. You ask probing questions and raise standard objections (timing, budget, current vendor) but are open-minded if the salesperson is compelling and professional.`,
  hard: `You are a very skeptical, busy prospect. You immediately raise objections like "We already have something for that", "Just send me an email", "I'm not interested right now". You try to end the call after 2–3 exchanges. Only soften very slightly if the salesperson handles your objections exceptionally well.`,
}

export const getVoiceForDifficulty = (difficulty) =>
  ({ easy: 'alloy', medium: 'nova', hard: 'onyx' }[difficulty] ?? 'alloy')

// ─── Backend endpoint ─────────────────────────────────────────────────────────
// All OpenAI calls are proxied through this Netlify Function.
// The API key lives only in the server environment — never in the browser.
const API_ENDPOINT = '/.netlify/functions/ai'

// ─── AI Chat Response ─────────────────────────────────────────────────────────

export async function getAIResponse(messages, difficulty, practiceArea, personality) {
  // Build the system prompt on the frontend — this contains no secrets,
  // just personality/difficulty config that we send to the backend.
  const basePrompt =
    personality?.systemPrompt ?? DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS.medium

  const practiceContext = practiceArea
    ? `\n\nThe salesperson is specifically practising: "${practiceArea}". Create natural opportunities and challenges related to this skill in your responses.`
    : ''

  const systemPrompt = `${basePrompt}${practiceContext}

CRITICAL RULES FOR REALISM:
- Respond in 1–3 SHORT sentences MAXIMUM. This is a phone call — no paragraphs.
- No markdown, bullet points, or formatted text. Only natural spoken language.
- Never break character or acknowledge you are an AI under any circumstances.
- If asked your name, use a realistic-sounding name. If asked your company, invent a plausible one.
- Use natural speech patterns occasionally: "uh", "um", "look", "listen", "actually", "yeah".
- React to specific things the salesperson just said to show you are listening.
- Remember earlier parts of the conversation and stay consistent.`

  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'chat', messages, systemPrompt }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `AI API error: ${res.status}`)
  }

  const data = await res.json()
  return data.reply
}

// ─── Text-to-Speech ───────────────────────────────────────────────────────────

export async function generateSpeech(text, voice = 'onyx') {
  // The backend returns raw audio binary — isBase64Encoded is handled by Netlify
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'tts', text, voice }),
  })

  if (!res.ok) throw new Error(`TTS error: ${res.status}`)

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// ─── Post-Call Analysis ───────────────────────────────────────────────────────

export async function analyzeCall(conversation, difficulty, practiceArea) {
  if (!conversation?.length) throw new Error('No conversation to analyze')

  const transcript = conversation
    .map((m) => `${m.role === 'user' ? 'SALESPERSON' : 'PROSPECT'}: ${m.content}`)
    .join('\n')

  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'analyze', transcript, difficulty, practiceArea }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Analysis error: ${res.status}`)
  }

  const data = await res.json()
  return data.analysis
}
