import { useMemo } from 'react'
import { money, monthLabel, series } from '../lib/projection'

const W = 640, H = 250, P = { l: 56, r: 16, t: 16, b: 28 }

export default function Projection({ data, monthly, setMonthly, base }) {
  const { currency } = data
  const { past, future, a } = useMemo(() => series(data, monthly), [data, monthly])
  const n = past.length + future.length - 1
  const ymax = Math.max(a.target, ...past.map((p) => p.v), ...future.map((f) => f.scenario), 1) * 1.08
  const x = (i) => P.l + (i / Math.max(n, 1)) * (W - P.l - P.r)
  const y = (v) => H - P.b - (v / ymax) * (H - P.t - P.b)
  const line = (pts) => pts.map(([i, v], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const nowIdx = Math.max(past.length - 1, 0)
  const actual = past.map((p, i) => [i, p.v])
  const scen = future.map((f, i) => [nowIdx + i, f.scenario])
  const plan = future.map((f, i) => [nowIdx + i, f.plan])
  const area = `${line(scen)} L${x(nowIdx + future.length - 1)},${y(0)} L${x(nowIdx)},${y(0)} Z`
  const max = Math.max(Math.round(a.required * 2), Math.round(base * 2), 10000)
  const ticks = [0, 0.5, 1].map((t) => t * a.target)
  const members = data.household.members || []
  const income = members.reduce((s, m) => s + Number(m.monthly_income || 0), 0)
  const need = Math.ceil(a.required / 1000) * 1000

  return (
    <section className="card" aria-labelledby="proj-h">
      <div className="card-head">
        <h3 id="proj-h">Savings projection</h3>
        <span className={`chip ${a.onTrack ? 'good' : 'warn'}`}>{a.onTrack ? 'Reaches goal' : 'Misses goal'}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img"
        aria-label={`Projected balance ${money(a.projected, currency)} against a target of ${money(a.target, currency)}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{t >= 1e6 ? `${(t / 1e6).toFixed(1)}M` : `${Math.round(t / 1000)}k`}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(a.target)} y2={y(a.target)} className="target-line" />
        <text x={W - P.r} y={y(a.target) - 6} textAnchor="end" className="axis strong">Goal {money(a.target, currency)}</text>
        <path d={area} className="area" />
        <path d={line(plan)} className="line-plan" />
        <path d={line(scen)} className="line-scn" />
        {actual.length > 0 && <path d={line(actual)} className="line-act" />}
        <circle cx={x(nowIdx)} cy={y(a.balance)} r="5" className="now" />
        <text x={P.l} y={H - 8} className="axis">{past[0]?.label ?? 'Now'}</text>
        <text x={W - P.r} y={H - 8} textAnchor="end" className="axis">{monthLabel(new Date(data.goal.targetDate))}</text>
      </svg>
      <ul className="legend">
        <li><i className="k act" /> Recorded</li>
        <li><i className="k scn" /> Your pace</li>
        <li><i className="k plan" /> Needed to hit goal</li>
      </ul>

      <div className="slider">
        <label htmlFor="monthly">If I save <b>{money(monthly, currency)}</b> a month…</label>
        <input id="monthly" type="range" min="0" max={max} step="5000" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
        <div className="slider-ends"><span>{money(0, currency)}</span><button className="link" onClick={() => setMonthly(base)}>Reset to current</button><span>{money(max, currency)}</span></div>
      </div>
      <p className="whatif">
        {a.onTrack
          ? <>You would have <b>{money(a.projected, currency)}</b> by {new Date(data.goal.targetDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}, <b>{money(a.projected - a.target, currency)}</b> above the goal.</>
          : <>You would have <b>{money(a.projected, currency)}</b>, which is <b>{money(a.shortfall, currency)}</b> short. Saving <b>{money(Math.ceil(a.required / 1000) * 1000, currency)}</b> a month closes the gap.</>}
      </p>
      {members.length > 1 && income > 0 && a.remaining > 0 && (
        <div className="fair">
          <h4>A fair split of the {money(need, currency)} needed each month</h4>
          <ul>
            {members.map((m) => (
              <li key={m.id}><span>{m.name}</span><b>{money(Math.round((need * m.monthly_income) / income / 500) * 500, currency)}</b><small>{Math.round((m.monthly_income / income) * 100)}% of income</small></li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
