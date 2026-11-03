import { money, monthLabel } from '../lib/projection'

function Ring({ percent }) {
  const r = 54, c = 2 * Math.PI * r
  return (
    <svg className="ring" viewBox="0 0 128 128" role="img" aria-label={`${percent}% of the goal saved`}>
      <circle cx="64" cy="64" r={r} className="ring-bg" />
      <circle cx="64" cy="64" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      <text x="64" y="62" textAnchor="middle" className="ring-num">{percent}%</text>
      <text x="64" y="82" textAnchor="middle" className="ring-sub">saved</text>
    </svg>
  )
}

export default function Hero({ data, analysis }) {
  const { goal, currency } = data
  const a = analysis
  return (
    <section className="hero" aria-label="Goal summary">
      <Ring percent={a.percent} />
      <div className="hero-main">
        <p className="eyebrow">{goal.purpose || 'Savings goal'} · 12-month plan</p>
        <h2>{goal.name}</h2>
        <p className="hero-amount">{money(a.balance, currency)} <span>of {money(a.target, currency)}</span></p>
        <p className={`verdict ${a.onTrack ? 'good' : 'warn'}`}>
          <span className="dot" />
          {a.onTrack
            ? `On track: at this pace you reach the goal${a.finishDate ? ` by ${monthLabel(a.finishDate)}` : ''}.`
            : `Behind plan: ${money(a.shortfall, currency)} short by ${goal.targetDate}. ${a.finishDate ? `At this pace you finish in ${monthLabel(a.finishDate)}.` : 'Start contributing to get back on track.'}`}
        </p>
      </div>
      <dl className="stats">
        <div><dt>Still to save</dt><dd>{money(a.remaining, currency)}</dd></div>
        <div><dt>Needed per month</dt><dd>{money(a.required, currency)}</dd></div>
        <div><dt>Months left</dt><dd>{a.monthsLeft}</dd></div>
        <div><dt>Target date</dt><dd>{new Date(goal.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
      </dl>
    </section>
  )
}
