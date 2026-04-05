import { useEffect, useRef } from 'react'

const STATUS_COPY = {
  idle:       'Connecting…',
  listening:  'Listening…',
  processing: 'Thinking…',
  speaking:   'Speaking…',
}

// Name / subtitle shown for each built-in difficulty level
const PROSPECT_INFO = {
  easy:   { name: 'Alex Thompson', sub: 'Friendly Prospect · Easy' },
  medium: { name: 'Sarah Chen',    sub: 'Skeptical Prospect · Medium' },
  hard:   { name: 'Mike Reynolds', sub: 'Tough Prospect · Hard' },
}

function WaveBar({ delay }) {
  return <div className="wave-bar" style={{ animationDelay: `${delay}ms` }} />
}

export default function CallScreen({
  isRinging,
  settings,
  callStatus,
  callDuration,
  interimText,
  conversation,
  personality,
  onEndCall,
  error,
}) {
  const transcriptRef = useRef(null)

  // Keep transcript scrolled to bottom
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [conversation, interimText])

  const info = personality
    ? { name: personality.name, sub: personality.description }
    : (PROSPECT_INFO[settings.difficulty] ?? { name: 'Unknown', sub: '' })

  const avatarLetter = info.name.charAt(0).toUpperCase()
  const statusText = STATUS_COPY[callStatus] ?? 'Active'

  return (
    <div className="call-screen">

      {/* ── Top bar: timer ── */}
      <div className="call-top-bar">
        <span className="call-timer">
          {isRinging ? 'Calling…' : callDuration}
        </span>
      </div>

      {/* ── Contact block ── */}
      <div className="contact-section">
        <div className={`avatar-wrap ${isRinging ? 'is-ringing' : ''}`}>
          <div className="avatar">{avatarLetter}</div>
          {isRinging && (
            <>
              <div className="ring-anim r1" />
              <div className="ring-anim r2" />
              <div className="ring-anim r3" />
            </>
          )}
        </div>
        <h2 className="contact-name">{info.name}</h2>
        <p className="contact-sub">
          {isRinging ? 'Calling…' : info.sub}
        </p>
      </div>

      {/* ── Status indicator ── */}
      {!isRinging && (
        <div className={`status-badge status-${callStatus}`}>
          {callStatus === 'listening' && (
            <span className="mic-pulse">🎤</span>
          )}
          {callStatus === 'speaking' && (
            <div className="wave-bars">
              {[0, 80, 160, 240, 320].map((d, i) => (
                <WaveBar key={i} delay={d} />
              ))}
            </div>
          )}
          {callStatus === 'processing' && (
            <span className="proc-dots">
              <span /><span /><span />
            </span>
          )}
          <span className="status-text">{statusText}</span>
        </div>
      )}

      {/* ── Conversation transcript ── */}
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

      {/* ── Error ── */}
      {error && <div className="call-error-msg">{error}</div>}

      {/* ── Controls ── */}
      <div className="call-controls">
        {!isRinging ? (
          <div className="controls-row">
            <div className="ctrl-btn inactive" title="Mute (cosmetic)">
              <span>🔇</span>
              <small>Mute</small>
            </div>
            <button className="end-call-btn" onClick={onEndCall} title="End Call">
              📵
            </button>
            <div className="ctrl-btn inactive" title="Speaker (cosmetic)">
              <span>🔊</span>
              <small>Speaker</small>
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
  )
}
