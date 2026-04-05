import { RANDOM_PERSONALITIES } from '../services/openai'

// Visual assets for hero header and difficulty card icons
import heroImg   from '../../Assets/Header.png'
import easyImg   from '../../Assets/Easy.png'
import mediumImg from '../../Assets/Medium.png'
import hardImg   from '../../Assets/Hard.png'

const DIFFICULTIES = [
  { id: 'easy',   img: easyImg,   label: 'Easy',   desc: 'Friendly, curious, open to listening' },
  { id: 'medium', img: mediumImg, label: 'Medium', desc: 'Skeptical, asks questions, needs convincing' },
  { id: 'hard',   img: hardImg,   label: 'Hard',   desc: 'Busy, dismissive, throws objections' },
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
          {/* Hero image — replaces emoji logo */}
          <img src={heroImg} alt="AI Sales Call Simulator" className="hero-img" />
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

        {/* ── Difficulty ── */}
        <div className="field-group">
          <label className="field-label">Prospect Difficulty</label>
          <div className="difficulty-grid">
            {DIFFICULTIES.map(({ id, img, label, desc }) => (
              <button
                key={id}
                className={`diff-card diff-${id} ${settings.difficulty === id ? 'selected' : ''}`}
                onClick={() => update('difficulty', id)}
              >
                {/* Personality icon image */}
                <img src={img} alt={label} className="diff-img" />
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
          Chrome / Edge recommended · Powered by GPT-4o mini · Microphone required
        </p>
      </div>
    </div>
  )
}
