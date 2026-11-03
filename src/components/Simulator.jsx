import { money, monthLabel } from '../lib/projection'
import { nextAction } from '../lib/whatif'

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export default function Simulator({ data, categories, sim, current, state, setState }) {
  const { currency } = data
  const fmt = (n) => money(n, currency)
  const { levers, unexpected, redirect } = state
  const set = (patch) => setState((s) => ({ ...s, ...patch }))
  const max = Math.max(sim.projected, current.projected, sim.projected, current.target, 1)
  const bars = [
    { label: 'Current pace', v: current.projected, cls: 'cur' },
    { label: 'This scenario', v: sim.projected, cls: sim.onTrack ? 'ok' : 'scn' },
    { label: 'Goal', v: current.target, cls: 'goal' },
  ]
  const dirty = Object.values(levers).some(Boolean) || unexpected > 0 || state.baseMonthly !== current.baseMonthly || !redirect

  return (
    <section className="card" id="sec-sim" aria-labelledby="sim-h">
      <div className="card-head">
        <h3 id="sim-h">What-if simulator</h3>
        <span className="chip idle" title="Calculated in your browser. Nothing here is saved to the API or the blockchain.">Simulated · not saved</span>
      </div>
      <p className="muted">Try changes to spending and saving. Every figure is plain arithmetic on this household's data and works even when AI is offline.</p>

      {categories.some((c) => c.synthetic) && <p className="muted small">Categories marked <em className="syn">illustrative</em> are synthetic estimates (a share of household income), added because the supplied data lists electricity only. They are not real transactions.</p>}
      <div className="levers">
        {categories.map((c) => {
          const pct = levers[c.name] || 0
          return (
            <label key={c.name} className="lever">
              <span><b>{cap(c.name)}</b>{c.synthetic && <em className="syn">illustrative</em>} <small>{fmt(c.monthly)} → {fmt(c.monthly * (1 + pct / 100))} a month ({pct > 0 ? '+' : ''}{pct}%)</small></span>
              <input type="range" min="-50" max="50" step="5" value={pct} onChange={(e) => set({ levers: { ...levers, [c.name]: Number(e.target.value) } })} />
            </label>
          )
        })}
        <label className="lever">
          <span><b>Unexpected expense</b> <small>{unexpected ? `${fmt(unexpected)} one-off, paid from savings` : 'none assumed'}</small></span>
          <input type="range" min="0" max="300000" step="10000" value={unexpected} onChange={(e) => set({ unexpected: Number(e.target.value) })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={redirect} onChange={(e) => set({ redirect: e.target.checked })} />
          Move money saved on spending into savings
        </label>
      </div>

      <dl className="figs">
        <div><dt>Saving per month</dt><dd>{fmt(sim.effectiveMonthly)}</dd></div>
        <div><dt>Left after spending and saving</dt><dd className={sim.affordable ? '' : 'debit'}>{fmt(sim.disposable)}</dd></div>
        <div><dt>Projected at deadline</dt><dd>{fmt(sim.projected)}</dd></div>
        <div><dt>{sim.onTrack ? 'Surplus' : 'Shortfall'}</dt><dd className={sim.onTrack ? 'credit' : 'debit'}>{fmt(sim.onTrack ? sim.surplus : sim.shortfall)}</dd></div>
        <div><dt>Goal reached</dt><dd>{sim.finishDate ? monthLabel(sim.finishDate) : 'Not at this pace'}</dd></div>
      </dl>

      <div className="compare" role="img" aria-label={`Projected at deadline: current pace ${fmt(current.projected)}, this scenario ${fmt(sim.projected)}, goal ${fmt(current.target)}`}>
        {bars.map((b) => (
          <div key={b.label} className="cmp-row">
            <span>{b.label}</span>
            <div className="cmp-track"><i className={b.cls} style={{ width: `${Math.max(2, Math.min(100, (b.v / max) * 100))}%` }} /></div>
            <b>{fmt(b.v)}</b>
          </div>
        ))}
      </div>

      <p className={`whatif ${sim.affordable ? '' : 'bad'}`}><b>Suggested next step:</b> {nextAction(sim, fmt)}</p>
      {dirty && <button className="ghost" onClick={() => setState((s) => ({ ...s, levers: {}, unexpected: 0, redirect: true, baseMonthly: current.baseMonthly }))}>Reset scenario</button>}
    </section>
  )
}
