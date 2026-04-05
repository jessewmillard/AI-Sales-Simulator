import { useEffect, useRef } from 'react'

// ─── Prospect info per difficulty ─────────────────────────────────────────────
const PROSPECT_INFO = {
  easy:   { name: 'Alex Thompson', sub: 'Friendly Prospect · Easy' },
  medium: { name: 'Sarah Chen',    sub: 'Skeptical Prospect · Medium' },
  hard:   { name: 'Mike Reynolds', sub: 'Tough Prospect · Hard' },
}

const STATUS_COPY = {
  idle:       'Connecting…',
  listening:  'Listening…',
  processing: 'Thinking…',
  speaking:   'Speaking…',
}

// ─── Voice Orb ────────────────────────────────────────────────────────────────
// Animated orb that changes appearance based on call state:
//   idle       → slow blue pulse
//   listening  → faster indigo beat (user is speaking)
//   speaking   → seafoam green wave (AI is speaking)
//   processing → amber slow rotation (AI is thinking)
function VoiceOrb({ status }) {
  return (
    <div className={`voice-orb orb-${status}`}>
      <div className="orb-ring r1" />
      <div className="orb-ring r2" />
      <div className="orb-ring r3" />
      <div className="orb-core" />
    </div>
  )
}

// ─── CallScreen ───────────────────────────────────────────────────────────────
export default function CallScreen({
  isRinging,
  settings,
  callStatus,
  callDuration,
  interimText,
  conversation,
  personality,
  onEndCall,
  onReplay,
  canReplay,
  error,
}) {
  const transcriptRef = useRef(null)

  // Keep transcript scrolled to latest message
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [conversation, interimText])

  const info = personality
    ? { name: personality.name, sub: personality.description }
    : (PROSPECT_INFO[settings.difficulty] ?? { name: 'Prospect', sub: '' })

  const avatarLetter = info.name.charAt(0).toUpperCase()
  const statusText = STATUS_COPY[callStatus] ?? 'Active'
  // While ringing, orb stays idle; once connected use real status
  const orbStatus = isRinging ? 'idle' : callStatus

  return (
    /* Outer page — full viewport, dark gradient background */
    <div className="call-page">

      {/* The "floating phone" mockup */}
      <div className="phone-mockup screen-fade-in">

        {/* Dynamic Island–style top notch */}
        <div className="phone-notch" />

        {/* ── Timer bar ── */}
        <div className="call-top-bar">
          {isRinging ? (
            <span className="call-status-chip ringing">● Calling…</span>
          ) : (
            <>
              <span className="call-status-chip connected">● Connected</span>
              <span className="call-timer">{callDuration}</span>
            </>
          )}
        </div>

        {/* ── Contact info ── */}
        <div className="contact-section">
          <div className={`avatar ${isRinging ? 'avatar-ringing' : ''}`}>
            {avatarLetter}
            {isRinging && (
              <>
                <div className="ring-anim r1" />
                <div className="ring-anim r2" />
                <div className="ring-anim r3" />
              </>
            )}
          </div>
          <h2 className="contact-name">{info.name}</h2>
          <p className="contact-sub">{isRinging ? 'Calling…' : info.sub}</p>
        </div>

        {/* ── Voice Orb (center of call screen) ── */}
        <VoiceOrb status={orbStatus} />

        {/* ── Status label under orb ── */}
        {!isRinging && (
          <p className="orb-status-label">{statusText}</p>
        )}

        {/* ── Replay last AI response ── */}
        {!isRinging && canReplay && callStatus === 'listening' && (
          <button className="replay-btn" onClick={onReplay} title="Replay last AI response">
            🔁 Replay
          </button>
        )}

        {/* ── Transcript bubbles ── */}
        {!isRinging && conversation.length > 0 && (
          <div className="call-transcript" ref={transcriptRef}>
            {conversation.map((msg, i) => (
              <div
                key={i}
                className={`bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}
              >
                <span className="bubble-label">
                  {msg.role === 'user' ? 'You' : 'Prospect'}
                </span>
                <span className="bubble-text">{msg.content}</span>
              </div>
            ))}
            {interimText && (
              <div className="bubble user-bubble interim">
                <span className="bubble-label">You</span>
                <span className="bubble-text">{interimText}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Error message ── */}
        {error && <div className="call-error-msg">{error}</div>}

        {/* ── Call controls ── */}
        <div className="call-controls">
          {!isRinging ? (
            <div className="controls-row">
              <div className="ctrl-btn inactive" title="Mute (cosmetic)">
                <span>🔇</span><small>Mute</small>
              </div>
              <button className="end-call-btn" onClick={onEndCall} title="End Call">
                📵
              </button>
              <div className="ctrl-btn inactive" title="Speaker (cosmetic)">
                <span>🔊</span><small>Speaker</small>
              </div>
            </div>
          ) : (
            <div className="controls-row">
              <button className="end-call-btn" onClick={onEndCall} title="Decline">
                📵
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
