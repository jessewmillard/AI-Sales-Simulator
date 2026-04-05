import { useState } from 'react'

// ─── Download transcript as a .txt file ───────────────────────────────────────
function downloadTranscript(conversation, callDuration, settings, summary) {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  const header = [
    'AI SALES CALL SIMULATOR — TRANSCRIPT',
    '═'.repeat(44),
    `Date:       ${date}`,
    `Duration:   ${callDuration}`,
    `Difficulty: ${cap(settings.difficulty)}`,
    settings.practiceArea ? `Focus:      ${settings.practiceArea}` : '',
    summary?.score        ? `Score:      ${summary.score}/10`        : '',
    '═'.repeat(44),
    '',
  ].filter(Boolean).join('\n')

  const body = conversation
    .map((m) => `[${m.role === 'user' ? 'YOU' : 'PROSPECT'}]\n${m.content}`)
    .join('\n\n')

  const blob = new Blob([header + '\n' + body], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `sales-call-${Date.now()}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Transcript section (collapsible + download) ──────────────────────────────
function TranscriptSection({ conversation, callDuration, settings, summary }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="feedback-card transcript-card">
      <div className="transcript-header">
        <button className="transcript-toggle" onClick={() => setOpen((o) => !o)}>
          📋 {open ? 'Hide' : 'Show'} Full Transcript
        </button>
        {/* Download button always visible */}
        <button
          className="download-btn"
          onClick={() => downloadTranscript(conversation, callDuration, settings, summary)}
          title="Download transcript as .txt"
        >
          ⬇ Download
        </button>
      </div>

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

// ─── Analyzing state ──────────────────────────────────────────────────────────
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

// ─── Main SummaryScreen ───────────────────────────────────────────────────────
export default function SummaryScreen({
  summary,
  conversation,
  callDuration,
  isAnalyzing,
  settings,
  onNewCall,
}) {
  if (isAnalyzing) return <AnalyzingState />

  // Error / no-summary state
  if (!summary || summary.error) {
    return (
      <div className="summary-screen">
        <div className="summary-inner screen-fade-in">
          <h1>Call Complete</h1>
          {summary?.error && <div className="error-banner">{summary.error}</div>}
          {conversation.length > 0 && (
            <TranscriptSection
              conversation={conversation}
              callDuration={callDuration}
              settings={settings}
              summary={summary}
            />
          )}
          <div className="summary-actions">
            <button className="new-call-btn" onClick={onNewCall}>📞 Start New Call</button>
          </div>
        </div>
      </div>
    )
  }

  const score      = summary.score ?? 0
  const scoreColor = score >= 8 ? '#22C55E' : score >= 5 ? '#F59E0B' : '#EF4444'
  const scoreLabel = score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Needs Work' : 'Poor'
  const cap        = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div className="summary-screen">
      <div className="summary-inner screen-fade-in">

        {/* ── Header ── */}
        <div className="summary-header">
          <h1>Call Complete</h1>
          <div className="summary-meta">
            <span>⏱ {callDuration}</span>
            <span className="dot">·</span>
            <span>🎯 {cap(settings.difficulty)}</span>
            {settings.practiceArea && (
              <><span className="dot">·</span><span>📌 {settings.practiceArea}</span></>
            )}
          </div>
        </div>

        {/* ── Score card ── */}
        <div className="score-card">
          <div className="score-ring" style={{ '--score-color': scoreColor }}>
            <span className="score-num">{score}</span>
            <span className="score-denom">/10</span>
          </div>
          <div className="score-info">
            <div className="score-grade" style={{ color: scoreColor }}>{scoreLabel}</div>
            <p className="score-rationale">{summary.scoreRationale}</p>
          </div>
        </div>

        {/* ── Score progress bar ── */}
        <div className="score-bar-wrap">
          <div className="score-bar-track">
            <div
              className="score-bar-fill"
              style={{ width: `${score * 10}%`, background: scoreColor }}
            />
          </div>
          <div className="score-bar-labels">
            <span>0</span><span>5</span><span>10</span>
          </div>
        </div>

        {/* ── Strengths + Weaknesses (side by side) ── */}
        {(summary.strengths?.length > 0 || summary.weaknesses?.length > 0) && (
          <div className="feedback-grid">
            {summary.strengths?.length > 0 && (
              <div className="feedback-card card-strengths">
                <h3>✅ What You Did Well</h3>
                <ul>{summary.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {summary.weaknesses?.length > 0 && (
              <div className="feedback-card card-weaknesses">
                <h3>⚠️ Areas to Improve</h3>
                <ul>{summary.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {/* ── Missed Opportunities ── */}
        {summary.missedOpportunities?.length > 0 && (
          <div className="feedback-card card-opportunities">
            <h3>💡 Missed Opportunities</h3>
            <ul>{summary.missedOpportunities.map((o, i) => <li key={i}>{o}</li>)}</ul>
          </div>
        )}

        {/* ── Suggested Better Responses ── */}
        {summary.suggestedResponses?.length > 0 && (
          <div className="feedback-card card-suggestions">
            <h3>💬 Suggested Better Responses</h3>
            {summary.suggestedResponses.map((sr, i) => (
              <div key={i} className="suggestion-item">
                <div className="situation-label">Situation: <em>{sr.situation}</em></div>
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

        {/* ── Transcript + Download ── */}
        {conversation.length > 0 && (
          <TranscriptSection
            conversation={conversation}
            callDuration={callDuration}
            settings={settings}
            summary={summary}
          />
        )}

        {/* ── New call ── */}
        <div className="summary-actions">
          <button className="new-call-btn" onClick={onNewCall}>📞 Start New Call</button>
        </div>

      </div>
    </div>
  )
}
