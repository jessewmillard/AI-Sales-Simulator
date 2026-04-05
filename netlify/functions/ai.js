// ─── Netlify Function: /netlify/functions/ai ──────────────────────────────────
// Proxies all OpenAI API calls so the API key never touches the browser.
// Handles three request types: 'chat', 'tts', and 'analyze'.

// ─── Simple in-memory rate limiter ────────────────────────────────────────────
// Prevents the same IP from hammering the function rapidly.
// Note: resets on each cold start (serverless limitation — good enough for abuse prevention).
const lastRequestTime = new Map()
const RATE_LIMIT_MS = 500 // minimum ms between requests per IP

function isRateLimited(ip) {
  const now = Date.now()
  const last = lastRequestTime.get(ip) ?? 0
  if (now - last < RATE_LIMIT_MS) return true
  lastRequestTime.set(ip, now)
  // Prevent unbounded map growth — keep at most 1000 IPs
  if (lastRequestTime.size > 1000) {
    const firstKey = lastRequestTime.keys().next().value
    lastRequestTime.delete(firstKey)
  }
  return false
}

// ─── OpenAI chat helper ────────────────────────────────────────────────────────
async function openAIChat(apiKey, body) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json() }
}

// ─── OpenAI TTS helper — returns raw audio buffer ────────────────────────────
async function openAITTS(apiKey, body) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return { status: res.status, buffer: null }
  const arrayBuffer = await res.arrayBuffer()
  return { status: res.status, buffer: Buffer.from(arrayBuffer) }
}

// ─── Handler ───────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  // ── Rate limit by client IP ────────────────────────────────────────────────
  const clientIP =
    event.headers['x-forwarded-for']?.split(',')[0].trim() ?? 'unknown'
  if (isRateLimited(clientIP)) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Too many requests — please slow down.' }),
    }
  }

  // ── Verify API key is configured on the server ─────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable is not set')
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server configuration error. Contact the site owner.' }),
    }
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    }
  }

  const { type } = body

  try {
    // ── 1. Chat completion — AI prospect response ──────────────────────────────
    if (type === 'chat') {
      // systemPrompt is built on the frontend (contains personality/difficulty config, no secrets)
      // messages is the conversation history
      const { messages, systemPrompt } = body

      const { status, data } = await openAIChat(apiKey, {
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 100,
        temperature: 0.9,
        presence_penalty: 0.3,
      })

      if (status !== 200) {
        return {
          statusCode: status,
          headers: corsHeaders,
          body: JSON.stringify({ error: data.error?.message ?? 'OpenAI API error' }),
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ reply: data.choices[0].message.content.trim() }),
      }
    }

    // ── 2. Text-to-speech — returns binary audio (base64 encoded) ─────────────
    if (type === 'tts') {
      const { text, voice } = body

      const { status, buffer } = await openAITTS(apiKey, {
        model: 'tts-1',
        input: text,
        voice: voice ?? 'onyx',
        speed: 1.0,
      })

      if (status !== 200 || !buffer) {
        return {
          statusCode: status,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Text-to-speech generation failed' }),
        }
      }

      // Netlify decodes isBase64Encoded automatically — browser receives raw audio binary
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
        },
        body: buffer.toString('base64'),
        isBase64Encoded: true,
      }
    }

    // ── 3. Post-call analysis — returns coaching feedback JSON ─────────────────
    if (type === 'analyze') {
      const { transcript, difficulty, practiceArea } = body

      if (!transcript?.trim()) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'No transcript provided' }),
        }
      }

      const prompt = `You are an expert sales coach with 20 years of B2B sales training experience. Analyze this cold sales call transcript and provide detailed, actionable coaching feedback.

CONTEXT:
- Difficulty setting: ${difficulty}
- Practice focus: ${practiceArea || 'General cold calling skills'}

TRANSCRIPT:
${transcript}

Return a JSON object with EXACTLY this structure (no extra fields):
{
  "score": <integer 1–10>,
  "scoreRationale": "<2 sentences explaining the score>",
  "strengths": ["<specific thing done well>", "..."],
  "weaknesses": ["<specific thing to improve>", "..."],
  "missedOpportunities": ["<specific opportunity not taken>", "..."],
  "suggestedResponses": [
    { "situation": "<describe the moment>", "better": "<what they should have said>" }
  ],
  "perfectCallSummary": "<3–4 sentences describing how a top performer would have handled this exact call>"
}`

      const { status, data } = await openAIChat(apiKey, {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })

      if (status !== 200) {
        return {
          statusCode: status,
          headers: corsHeaders,
          body: JSON.stringify({ error: data.error?.message ?? 'Analysis failed' }),
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ analysis: JSON.parse(data.choices[0].message.content) }),
      }
    }

    // Unknown type
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Unknown request type: "${type}"` }),
    }
  } catch (e) {
    console.error('[ai function] Unhandled error:', e)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
