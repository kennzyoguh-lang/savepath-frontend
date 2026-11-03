import { useMemo } from 'react'
import { habitStats, habitTips, spendingBreakdown } from '../lib/habit'
import { money } from '../lib/projection'

const LABEL = { met: 'Met the plan', partial: 'Partly', missed: 'Missed' }

export default function HabitPanel({ data, analysis, monthly }) {
  const { currency } = data
  const fmt = (n) => money(n, currency)
  const stats = useMemo(() => habitStats(data.savings.contributions), [data])
  const spend = useMemo(() => spendingBreakdown(data.transactions), [data])
  const tips = useMemo(() => habitTips({ stats, analysis, topCategory: spend.top, fmt }), [stats, analysis, spend]) // eslint-disable-line
  const income = data.household.monthlyIncome
  const left = income - spend.monthly - monthly
  const share = (v) => (income ? Math.max(2, Math.round((v / income) * 100)) : 0)

  return (
    <section className="card habit" id="sec-habit" aria-labelledby="habit-h">
      <div className="card-head">
        <h3 id="habit-h">Savings habit</h3>
        <span className={`chip ${stats.score >= 55 ? 'good' : 'warn'}`}>{stats.level}</span>
      </div>
      <div className="habit-top">
        <div className="score"><b>{stats.score}</b><span>/ 100<br />consistency</span></div>
        <dl className="mini">
          <div><dt>Saving streak</dt><dd>{stats.streak} {stats.streak === 1 ? 'month' : 'months'}</dd></div>
          <div><dt>Best streak</dt><dd>{stats.best} {stats.best === 1 ? 'month' : 'months'}</dd></div>
          <div><dt>Months on plan</dt><dd>{stats.metCount} of {stats.months.length}</dd></div>
        </dl>
      </div>

      <ul className="strip" aria-label="Monthly savings against plan">
        {stats.months.map((m) => (
          <li key={m.month} className={m.status} title={`${m.month}: saved ${fmt(m.actual)} of ${fmt(m.planned)} planned (${LABEL[m.status]})`}>
            <i style={{ height: `${Math.max(8, Math.min(100, Math.round(m.ratio * 100)))}%` }} />
            <span>{m.month.slice(5)}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">Each bar is one month's saving as a share of the plan. Green met it, amber was half or more, red was under half.</p>

      <h4>Where each month's income goes</h4>
      <div className="split" role="img" aria-label={`Of ${fmt(income)} income: ${fmt(spend.monthly)} spending, ${fmt(monthly)} saving, ${fmt(Math.max(0, left))} left over`}>
        <i className="spend" style={{ width: `${share(spend.monthly)}%` }} />
        <i className="save" style={{ width: `${share(monthly)}%` }} />
        <i className="free" style={{ width: `${Math.max(0, 100 - share(spend.monthly) - share(monthly))}%` }} />
      </div>
      <ul className="legend">
        <li><i className="k" style={{ background: 'var(--warn)' }} /> Spending ≈ {fmt(spend.monthly)}</li>
        <li><i className="k" style={{ background: 'var(--brand)' }} /> Saving {fmt(monthly)}</li>
        <li><i className="k" style={{ background: 'var(--line)' }} /> Left over {fmt(Math.max(0, left))}</li>
      </ul>

      <h4>Coaching for a steadier habit</h4>
      <ul className="tips">
        {tips.map((t) => <li key={t.title}><b>{t.title}</b><p>{t.text}</p></li>)}
      </ul>
    </section>
  )
}
