import { useEffect, useRef, useState } from 'react'
import { analyseSavings } from '../lib/ai'
import { money } from '../lib/projection'

const LABELS = {
  live: 'AI-generated from the data on this page.',
  mockapi: 'Sample response from the mock API. It is fixed text, not generated from this data.',
  backendmock: 'Placeholder from the backend (AI is not set to live).',
  mock: 'Local placeholder: simple rules, no AI service connected.',
  fallback: 'The AI service was unavailable, so this is a local placeholder.',
}
const ICON = { consistency: '📈', spending: '🧾', progress: '🎯' }

const FIGURES = (f) => [
  ['Required per month', f.requiredMonthly, 'money'],
  ['Current monthly saving', f.monthlySavingsContribution, 'money'],
  ['Monthly gap', f.monthlyGap, 'money'],
  ['Projected balance at current pace', f.projectedBalanceAtCurrentPace, 'money'],
  ['Projected shortfall', f.projectedShortfall, 'money'],
  ['Share of plan met', f.percentOfPlanMet, 'pct'],
].filter(([, v]) => v != null)

export default function AIPanel({ data }) {
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState(null)
  const started = useRef(false)
  const key = `insight:${data.customerId}:${data.savings.currentBalance}:${data.goal.targetAmount}`
  const run = async (force) => {
    if (!force) {
      try { const hit = JSON.parse(sessionStorage.getItem(key)); if (hit) return setInsight(hit) } catch { /* no cache */ }
    }
    setLoading(true)
    try {
      const result = await analyseSavings(data)
      setInsight(result)
      if (result.source === 'live') try { sessionStorage.setItem(key, JSON.stringify(result)) } catch { /* storage full */ }
    } finally { setLoading(false) }
  }
  useEffect(() => { if (!started.current) { started.current = true; run(false) } }, []) // eslint-disable-line

  return (
    <section className="card" id="sec-ai" aria-labelledby="ai-h" aria-busy={loading}>
      <div className="card-head">
        <h3 id="ai-h">Savings coach</h3>
        {insight && <span className={`chip ${insight.source === 'live' ? 'good' : 'idle'}`}>{insight.source === 'live' ? 'Live AI' : 'Fallback analysis'}</span>}
      </div>
      {loading && !insight && <div className="skeleton" aria-label="Analysing your savings"><i /><i /><i /><i /></div>}
      {insight && (
        <>
          <p className="lead">{insight.summary}</p>
          {insight.observations.length > 0 && (
            <ul className="obs">{insight.observations.map((o, i) => <li key={i}><span aria-hidden>{ICON[o.type] || '•'}</span><div><b>{o.type}</b><p>{o.message}</p></div></li>)}</ul>
          )}
          {insight.recommendations.length > 0 && (
            <>
              <h4>What to do next</h4>
              <ol className="recs">{insight.recommendations.map((r, i) => <li key={i}><b>{r.title}</b><p>{r.description}</p></li>)}</ol>
            </>
          )}
          {insight.facts && FIGURES(insight.facts).length > 0 && (
            <dl className="figs">{FIGURES(insight.facts).map(([k, v, t]) => <div key={k}><dt>{k}</dt><dd>{t === 'pct' ? `${v}%` : money(v, insight.facts.currency || data.currency)}</dd></div>)}</dl>
          )}
          {insight.suggestedAction && <p className="next"><b>Suggested next step:</b> {insight.suggestedAction.label}</p>}
          <p className="muted small">{LABELS[insight.source]} {insight.meta?.confidence && `Confidence: ${insight.meta.confidence}. `}{insight.meta?.disclaimer || 'Suggestions only, not financial advice or a guaranteed outcome.'}</p>
        </>
      )}
      <button className="ghost" disabled={loading} onClick={() => run(true)}>{loading ? 'Analysing…' : insight ? 'Refresh insights' : 'Get insights'}</button>
    </section>
  )
}
