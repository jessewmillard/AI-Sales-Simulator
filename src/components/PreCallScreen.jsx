import { RANDOM_PERSONALITIES } from '../services/openai'

const DIFFICULTIES = [
  { id: 'easy',   emoji: '😊', label: 'Easy',   desc: 'Friendly, curious, open to listening' },
  { id: 'medium', emoji: '🤔', label: 'Medium', desc: 'Skeptical, asks questions, needs convincing' },
  { id: 'hard',   emoji: '😤', label: 'Hard',   desc: 'Busy, dismissive, throws objections' },
]

export default function PreCallScreen({ settings, onSettingsChange, onStartCall, error }) {
  const update = (field, value) => onSettingsChange({ ...settings, [field]: value })

  // Warn if browser doesn't support speech recognition
  const hasSTT = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  return (
    <div className="pre-call">
      <div className="pre-call-inner">

        {/* ── Header ── */}
        <div className="header">
          <div className="header-logo">📞</div>
          <h1>AI Sales Call Simulator</h1>
          <p className="header-sub">Practice cold calling with a realistic AI prospect</p>
        </div>

        {/* ── Browser warning ── */}
        {!hasSTT && (
          <div className="warn-banner">
            ⚠️ Your browser doesn't support speech recognition. Use <strong>Chrome</strong> or{' '}
            <strong>Edge</strong> for voice input. You can still listen to the AI prospect.
          </div>
        )}

        {/* ── API Key ── */}
        <div className="field-group">
          <label className="field-label">OpenAI API Key</label>
          <input
            type="password"
            className="text-input"
            placeholder="sk-..."
            value={settings.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="field-hint">
            Required for AI voice &amp; responses.{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              Get your key →
            </a>
          </p>
        </div>

        {/* ── Difficulty ── */}
        <div className="field-group">
          <label className="field-label">Prospect Difficulty</label>
          <div className="difficulty-grid">
            {DIFFICULTIES.map(({ id, emoji, label, desc }) => (
              <button
                key={id}
                className={`diff-card diff-${id} ${settings.difficulty === id ? 'selected' : ''}`}
                onClick={() => update('difficulty', id)}
              >
                <span className="diff-emoji">{emoji}</span>
                <span className="diff-label">{label}</span>
                <span className="diff-desc">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Random Personality Toggle ── */}
        <div className="field-group">
          <div className="toggle-row">
            <div className="toggle-info">
              <label className="field-label" style={{ marginBottom: 0 }}>
                🎲 Random Personality Mode
              </label>
              <p className="field-hint" style={{ marginTop: 3 }}>
                Each call surprises you with a different prospect type
              </p>
            </div>
            <button
              className={`toggle-switch ${settings.useRandom ? 'on' : ''}`}
              onClick={() => update('useRandom', !settings.useRandom)}
              role="switch"
              aria-checked={settings.useRandom}
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          {settings.useRandom && (
            <div className="personality-chips">
              {RANDOM_PERSONALITIES.map((p) => (
                <div key={p.name} className="personality-chip">
                  <strong>{p.name}</strong>
                  <span>{p.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Practice Focus ── */}
        <div className="field-group">
          <label className="field-label">
            Practice Focus{' '}
            <span className="optional-tag">optional</span>
          </label>
          <input
            type="text"
            className="text-input"
            placeholder="e.g., overcoming price objections, closing, building rapport…"
            value={settings.practiceArea}
            onChange={(e) => update('practiceArea', e.target.value)}
          />
          <p className="field-hint">
            The AI will create targeted challenges around this skill
          </p>
        </div>

        {/* ── Error ── */}
        {error && <div className="error-banner">{error}</div>}

        {/* ── Start ── */}
        <button className="start-button" onClick={onStartCall}>
          <span className="start-icon">📱</span>
          <span>Start Call</span>
        </button>

        <p className="footer-note">
          Chrome / Edge recommended · OpenAI gpt-4o-mini + tts-1 · Microphone required
        </p>
      </div>
    </div>
  )
}
