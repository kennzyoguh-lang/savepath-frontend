import { useState, useCallback, useEffect } from 'react'
import { readGoal, createGoal, recordContribution, txLink, friendlyError } from '../lib/savingsContract'

export default function OnchainPanel({ wallet, defaults, onChange }) {
  const { signer, status, wrongNetwork } = wallet
  const [goal, setGoal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { kind: 'ok' | 'err' | 'pending', text, hash? }
  const [target, setTarget] = useState(defaults.targetAmount)
  const [date, setDate] = useState(defaults.targetDate)
  const [amount, setAmount] = useState(5000)
  const ready = status === 'connected' && !wrongNetwork

  const refresh = useCallback(async () => {
    try { setGoal(await readGoal(signer)) } catch (e) { setMsg({ kind: 'err', text: friendlyError(e) }) }
  }, [signer])
  useEffect(() => { if (ready) refresh(); else setGoal(null) }, [ready, refresh])

  const run = async (label, fn) => {
    setBusy(true); setMsg({ kind: 'pending', text: `${label}: confirm in your wallet…` })
    try {
      const hash = await fn((h) => setMsg({ kind: 'pending', text: `${label}: waiting for confirmation…`, hash: h }))
      await refresh()
      onChange?.()
      setMsg({ kind: 'ok', text: `${label}: confirmed on-chain.`, hash })
    } catch (e) { setMsg({ kind: 'err', text: friendlyError(e) }) } finally { setBusy(false) }
  }

  const steps = [
    { n: 1, t: 'Connect wallet', done: status === 'connected' },
    { n: 2, t: 'Celo Sepolia', done: ready },
    { n: 3, t: 'Goal on-chain', done: Boolean(goal?.active) },
  ]

  return (
    <section className="card chain" aria-labelledby="chain-h">
      <div className="card-head">
        <h3 id="chain-h">Commit your goal on-chain</h3>
        <span className="chip idle">Test network</span>
      </div>
      <ol className="steps">{steps.map((s) => <li key={s.n} className={s.done ? 'done' : ''}><span>{s.done ? '✓' : s.n}</span>{s.t}</li>)}</ol>
      <p className="muted">Demo records written by your wallet on Celo Sepolia. No money moves and nothing is checked against a real payment.</p>
      {!ready ? (
        <p className="callout">{status === 'connected' ? 'Switch to Celo Sepolia to continue.' : 'Connect a wallet (top right) to record your goal and contributions.'}</p>
      ) : (
        <>
          {goal?.active && (
            <p className="big">{Number(goal.totalContributed).toLocaleString()} <span>recorded of {Number(goal.targetAmount).toLocaleString()} · due {new Date(goal.targetDate * 1000).toLocaleDateString()}</span></p>
          )}
          <div className="form">
            <label>Target amount<input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
            <label>Target date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <button disabled={busy || !(Number(target) > 0) || !date}
              onClick={() => run('Create goal', (cb) => createGoal(signer, target, Math.floor(new Date(date).getTime() / 1000), cb))}>
              {goal?.active ? 'Replace goal' : 'Create goal'}
            </button>
          </div>
          {goal?.active && <p className="muted">Replacing the goal resets the recorded total to 0.</p>}
          {goal?.active && (
            <div className="form">
              <label>Contribution to record<input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <button disabled={busy || !(Number(amount) > 0)} onClick={() => run('Record contribution', (cb) => recordContribution(signer, amount, cb))}>Record contribution</button>
            </div>
          )}
        </>
      )}
      {msg && (
        <p className={`status ${msg.kind}`} role={msg.kind === 'err' ? 'alert' : 'status'}>
          {msg.text} {msg.hash && <a href={txLink(msg.hash)} target="_blank" rel="noreferrer">View transaction ↗</a>}
        </p>
      )}
    </section>
  )
}
