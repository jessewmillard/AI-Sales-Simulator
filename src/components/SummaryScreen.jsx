import { useState } from 'react'

// ── Loading skeleton ──────────────────────────────────────────────────────────
function AnalyzingState() {
  return (
    <div className="summary-screen">
      <div className="analyzing-state">
        <div className="spinner" />
        <h2>Analyzing Your Call</h2>
        <p>Generating personalized coaching feedback…</p>
      </div>
    </div>
  )
}

// ── Transcript section (collapsible) ─────────────────────────────────────────
function TranscriptSection({ conversation }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="feedback-card transcript-card">
      <button className="transcript-toggle" onClick={() => setOpen((o) => !o)}>
        📋 {open ? 'Hide' : 'Show'} Full Transcript
      </button>
      {open && (
        <div className="transcript-box">
          {conversation.map((m, i) => (
            <div key={i} className={`tl tl-${m.role}`}>
              <span className="tl-who">{m.role === 'user' ? 'You' : 'Prospect'}</span>
              <span className="tl-text">{m.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SummaryScreen({
  summary,
  conversation,
  callDuration,
  isAnalyzing,
  settings,
  onNewCall,
}) {
  if (isAnalyzing) return <AnalyzingState />

  // Error state (analysis failed or API returned error)
  if (!summary || summary.error) {
    return (
      <div className="summary-screen">
        <div className="summary-inner">
          <h1>Call Complete</h1>
          {summary?.error && <div className="error-banner">{summary.error}</div>}
          {conversation.length > 0 && (
            <>
              <p className="summary-sub" style={{ marginBottom: 16 }}>
                The analysis couldn't be generated, but here's your transcript:
              </p>
              <TranscriptSection conversation={conversation} />
            </>
          )}
          <div className="summary-actions">
            <button className="new-call-btn" onClick={onNewCall}>📞 Start New Call</button>
          </div>
        </div>
      </div>
    )
  }

  const score = summary.score ?? 0
  const scoreColor = score >= 8 ? '#4ade80' : score >= 5 ? '#facc15' : '#f87171'
  const scoreLabel = score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Needs Work' : 'Poor'
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div className="summary-screen">
      <div className="summary-inner">

        {/* ── Header ── */}
        <div className="summary-header">
          <h1>Call Complete</h1>
          <div className="summary-meta">
            <span>⏱ {callDuration}</span>
            <span className="dot">·</span>
            <span>🎯 {cap(settings.difficulty)}</span>
            {settings.practiceArea && (
              <>
                <span className="dot">·</span>
                <span>📌 {settings.practiceArea}</span>
              </>
            )}
          </div>
        </div>

        {/* ── Score ── */}
        <div className="score-card">
          <div className="score-display" style={{ color: scoreColor }}>
            <span className="score-num">{score}</span>
            <span className="score-denom">/10</span>
          </div>
          <div className="score-info">
            <div className="score-grade" style={{ color: scoreColor }}>{scoreLabel}</div>
            <p className="score-rationale">{summary.scoreRationale}</p>
          </div>
        </div>

        {/* ── Score bar ── */}
        <div className="score-bar-bg">
          <div
            className="score-bar-fill"
            style={{ width: `${score * 10}%`, background: scoreColor }}
          />
        </div>

        {/* ── Strengths + Weaknesses (2-col grid) ── */}
        {(summary.strengths?.length > 0 || summary.weaknesses?.length > 0) && (
          <div className="feedback-grid">
            {summary.strengths?.length > 0 && (
              <div className="feedback-card card-strengths">
                <h3>✅ What You Did Well</h3>
                <ul>
                  {summary.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {summary.weaknesses?.length > 0 && (
              <div className="feedback-card card-weaknesses">
                <h3>⚠️ Areas to Improve</h3>
                <ul>
                  {summary.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Missed Opportunities ── */}
        {summary.missedOpportunities?.length > 0 && (
          <div className="feedback-card card-opportunities">
            <h3>💡 Missed Opportunities</h3>
            <ul>
              {summary.missedOpportunities.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}

        {/* ── Suggested Better Responses ── */}
        {summary.suggestedResponses?.length > 0 && (
          <div className="feedback-card card-suggestions">
            <h3>💬 Better Responses</h3>
            {summary.suggestedResponses.map((sr, i) => (
              <div key={i} className="suggestion-item">
                <div className="situation-label">
                  Situation: <em>{sr.situation}</em>
                </div>
                <div className="better-response">💡 "{sr.better}"</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Perfect Call ── */}
        {summary.perfectCallSummary && (
          <div className="feedback-card card-perfect">
            <h3>⭐ How a Top Performer Would Handle This</h3>
            <p>{summary.perfectCallSummary}</p>
          </div>
        )}

        {/* ── Transcript ── */}
        {conversation.length > 0 && (
          <TranscriptSection conversation={conversation} />
        )}

        {/* ── Actions ── */}
        <div className="summary-actions">
          <button className="new-call-btn" onClick={onNewCall}>
            📞 Start New Call
          </button>
        </div>

      </div>
    </div>
  )
}
