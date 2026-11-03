import { useEffect, useState } from 'react'
import { AI_API_URL } from '../lib/config'
import { money } from '../lib/projection'

// Reads what the backend's event listener has verified on the Celo Sepolia contract.
export default function ChainFeed({ currency, refreshKey }) {
  const [state, setState] = useState({ goal: null, items: [], status: AI_API_URL ? 'loading' : 'off' })

  useEffect(() => {
    if (!AI_API_URL) return
    let alive = true
    const load = async () => {
      try {
        const [g, t] = await Promise.all([fetch(`${AI_API_URL}/goal`), fetch(`${AI_API_URL}/transactions`)])
        const goal = g.ok ? await g.json() : null
        const items = t.ok ? (await t.json()).contributions : []
        if (alive) setState({ goal, items, status: 'ok' })
      } catch {
        if (alive) setState((s) => ({ ...s, status: 'down' }))
      }
    }
    load()
    const id = setInterval(load, 6000)
    return () => { alive = false; clearInterval(id) }
  }, [refreshKey])

  const { goal, items, status } = state
  return (
    <section className="card" aria-labelledby="feed-h">
      <div className="card-head">
        <h3 id="feed-h">Verified on Celo</h3>
        <span className={`chip ${status === 'ok' ? 'good' : 'idle'}`}>{status === 'ok' ? 'Live' : status === 'loading' ? 'Syncing' : 'Offline'}</span>
      </div>
      {status === 'off' && <p className="muted">Set VITE_AI_API_URL to see backend-verified records.</p>}
      {status === 'down' && <p className="muted">The backend is not reachable. Start it, and records will appear here.</p>}
      {status === 'ok' && !goal && <p className="muted">No goal recorded on-chain yet. Create one above and it appears here within seconds, confirmed by the blockchain.</p>}
      {goal && (
        <>
          <div className="proof">
            <b>{money(goal.totalContributed, currency)}</b> recorded of <b>{money(goal.targetAmount, currency)}</b>
            <div className="bar" role="progressbar" aria-valuenow={goal.percentComplete} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${goal.percentComplete}%` }} /></div>
            <a href={goal.explorerUrl} target="_blank" rel="noreferrer">Goal created {new Date(goal.recordedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} ↗</a>
          </div>
          <ol className="timeline">
            {[...items].reverse().map((c) => (
              <li key={c.txHash}>
                <span className="tl-dot" />
                <div><b>+{money(c.amount, currency)}</b> <span className="muted">· {c.date}</span></div>
                <a href={c.explorerUrl} target="_blank" rel="noreferrer">{c.txHash.slice(0, 10)}… ↗</a>
              </li>
            ))}
            {items.length === 0 && <li className="muted">No contributions yet.</li>}
          </ol>
        </>
      )}
    </section>
  )
}
