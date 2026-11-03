import { useState, useCallback, useEffect } from 'react'
import { validateAmount, validateGoal } from '../lib/validate'
import { readGoal, createGoal, recordContribution, txLink, friendlyError } from '../lib/savingsContract'

export default function OnchainPanel({ wallet, defaults, onChange }) {
  const { signer, status, wrongNetwork } = wallet
  const [goal, setGoal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [msg, setMsg] = useState(null) // { kind: 'ok' | 'err' | 'pending', text, hash? }
  const [target, setTarget] = useState(defaults.targetAmount)
  const [date, setDate] = useState(defaults.targetDate)
  const [amount, setAmount] = useState(defaults.contribution || 5000)
  const ready = status === 'connected' && !wrongNetwork
  const goalCheck = validateGoal(target, date)
  const amountCheck = validateAmount(amount, 'Contribution')

const refresh = useCallback(async () => {
  setReading(true)
  try { setGoal(await readGoal(signer)) } catch (e) { setMsg({ kind: 'err', text: friendlyError(e) }) } finally { setReading(false) }
}, [signer])
  useEffect(() => { if (ready) refresh(); else setGoal(null) }, [ready, refresh])
const onGetGoal = async () => {
  await refresh()
  setMsg((m) => (m?.kind === 'err' ? m : { kind: 'ok', text: 'Goal read from the contract.' }))
}
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
    <section className="card chain" id="sec-chain" aria-labelledby="chain-h">
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
          <button className="ghost" disabled={busy || reading} onClick={onGetGoal}>{reading ? 'Reading…' : 'Get goal'}</button>
          {goal && (goal.active ? (
            <>
              <p className="big">{Number(goal.totalContributed).toLocaleString()} <span>recorded of {Number(goal.targetAmount).toLocaleString()} · due {new Date(goal.targetDate * 1000).toLocaleDateString()}</span></p>
              <ul className="rows">
                <li><span>Target amount</span><b>{Number(goal.targetAmount).toLocaleString()}</b></li>
                <li><span>Target date</span><b>{new Date(goal.targetDate * 1000).toLocaleDateString()}</b></li>
                <li><span>Total contributed</span><b>{Number(goal.totalContributed).toLocaleString()}</b></li>
                <li><span>Active</span><b>yes</b></li>
              </ul>
            </>
          ) : <p>No active on-chain goal for this wallet yet.</p>)}
          <div className="form">
            <label>Target amount<input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
            <label>Target date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <button disabled={busy || !goalCheck.ok}
              onClick={() => run('Create goal', (cb) => createGoal(signer, goalCheck.value.target, goalCheck.value.dateUnix, cb))}>
              {goal?.active ? 'Replace goal' : 'Create goal'}
            </button>
          </div>
          {!goalCheck.ok && <p className="err small" role="alert">{goalCheck.error}</p>}
          {goal?.active && <p className="muted">Replacing the goal resets the recorded total to 0.</p>}
          {goal?.active && (
            <div className="form">
              <label>Contribution to record<input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <button disabled={busy || !amountCheck.ok} onClick={() => run('Record contribution', (cb) => recordContribution(signer, amountCheck.value, cb))}>Record contribution</button>
            </div>
          )}
          {goal?.active && !amountCheck.ok && <p className="err small" role="alert">{amountCheck.error}</p>}
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
