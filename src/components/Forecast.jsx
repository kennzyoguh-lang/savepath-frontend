import { useMemo } from 'react'
import { forecasts, milestones, riskIndicators } from '../lib/forecast'
import { money } from '../lib/projection'

const LEVEL = { good: 'Strong', watch: 'Watch', risk: 'At risk' }

export default function Forecast({ data, analysis, monthly, spendingMonthly }) {
  const { currency } = data
  const fmt = (n) => money(n, currency)
  const f = useMemo(() => forecasts(data), [data])
  const risks = useMemo(() => riskIndicators({ data, analysis, monthly, spendingMonthly }), [data, analysis, monthly, spendingMonthly])
  const marks = useMemo(() => milestones(analysis.target, analysis.balance), [analysis])
  const next = marks.find((m) => !m.reached)

  return (
    <section className="card" id="sec-forecast" aria-labelledby="fc-h">
      <div className="card-head">
        <h3 id="fc-h">Success forecast</h3>
        <span className="chip idle">Estimate, not a promise</span>
      </div>
      <div className="fc-grid">
        {f.scenarios.map((s) => (
          <article key={s.key} className={`fc ${s.onTrack ? 'on' : 'off'}`}>
            <h4>{s.label}</h4>
            <p className="fc-amt">{fmt(s.projected)}</p>
            <p className="muted small">by the deadline at {fmt(s.monthly)} a month</p>
            <p className={s.onTrack ? 'credit' : 'debit'}>{s.onTrack ? `${fmt(s.surplus)} above goal` : `${fmt(s.shortfall)} short`}</p>
            {!s.onTrack && <p className="muted small">Needs about {fmt(s.extraNeeded)} more a month</p>}
          </article>
        ))}
      </div>
      <p className="muted small">
        How these are made: the three cases use your last three months of saving ({fmt(f.pace.recent)} a month on average). Conservative is 75% of that, baseline is that pace, optimistic is your own plan. Over {f.monthsLeft} months that is simple multiplication; there is no machine-learning model, so treat them as scenarios, not predictions.
      </p>

      <h4>Resilience check</h4>
      <ul className="risks">
        {risks.map((r) => (
          <li key={r.label} className={r.level}><span className="lvl">{LEVEL[r.level]}</span><div><b>{r.label}</b><p>{r.detail}</p></div></li>
        ))}
      </ul>

      <h4>Milestones</h4>
      <ol className="miles">
        {marks.map((m) => (
          <li key={m.percent} className={m.reached ? 'done' : ''}><span>{m.reached ? '★' : m.percent}</span><b>{m.percent}%</b><small>{fmt(m.amount)}</small></li>
        ))}
      </ol>
      {next && <p className="muted small">Next milestone: {fmt(next.amount)}, {fmt(next.remaining)} to go.</p>}
    </section>
  )
}
