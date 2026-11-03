import { useState } from 'react'

// Story for the jury. Every step says whether it is synthetic data, a local simulation, or a live testnet action.
const STEPS = [
  { id: 'sec-goal', tag: 'Synthetic data', title: 'Meet David and Amara', text: 'A young Nigerian couple saving ₦2,000,000 in 12 months. All data is synthetic.' },
  { id: 'sec-goal', tag: 'Synthetic data', title: 'Their goal and situation', text: 'Balance, what is left to save, and the monthly amount they need.' },
  { id: 'sec-habit', tag: 'Calculated', title: 'Why consistency is at risk', text: 'The habit score and monthly bars show where saving slipped.' },
  { id: 'sec-ai', tag: 'Live AI or fallback', title: 'Recommendations from the AI', text: 'The badge says whether this is live Mistral analysis or the organizers\' pre-written fallback.' },
  { id: 'sec-sim', tag: 'Simulated', title: 'Try a what-if', text: 'Ease a spending category or add an unexpected cost. Nothing is saved.' },
  { id: 'sec-proj', tag: 'Simulated', title: 'See the outcome change', text: 'The projection, forecast and finish date update instantly.' },
  { id: 'sec-chain', tag: 'Live on testnet', title: 'Connect a wallet', text: 'Connect MetaMask on Celo Sepolia. Approval happens in the wallet, never in the app.' },
  { id: 'sec-chain', tag: 'Live on testnet', title: 'Create or retrieve the on-chain goal', text: 'Writes the target and date to the SavingsGoal contract.' },
  { id: 'sec-chain', tag: 'Live on testnet', title: 'Record a numerical contribution', text: 'A number is recorded. No money moves and nothing is verified against a bank.' },
  { id: 'sec-feed', tag: 'Live on testnet', title: 'Verified record', text: 'The transaction hash and the on-chain total appear with an explorer link.' },
  { id: 'sec-forecast', tag: 'Calculated', title: 'The improved plan', text: 'Forecast, resilience check and milestones summarise the household impact.' },
]

export default function DemoGuide({ open, onClose }) {
  const [i, setI] = useState(0)
  const [started, setStarted] = useState(false)
  if (!open) return null
  const step = STEPS[i]
  const go = (n) => {
    const k = Math.max(0, Math.min(STEPS.length - 1, n))
    setI(k)
    const el = document.getElementById(STEPS[k].id)
    if (el) {
      el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
      el.classList.add('spot')
      setTimeout(() => el.classList.remove('spot'), 2200)
    }
  }
  return (
    <aside className="guide" role="dialog" aria-label="Jury demonstration guide">
      <div className="guide-head">
        <b>Jury demo · step {i + 1} of {STEPS.length}</b>
        <button className="link" onClick={onClose} aria-label="Close the demo guide">Close</button>
      </div>
      <span className={`chip ${step.tag.startsWith('Live') ? 'good' : 'idle'}`}>{step.tag}</span>
      <h4>{step.title}</h4>
      <p>{step.text}</p>
      <div className="guide-nav">
        <button className="ghost" disabled={i === 0} onClick={() => go(i - 1)}>Back</button>
        <button onClick={() => (started ? go(i + 1) : (setStarted(true), go(0)))}>{!started ? 'Start' : i === STEPS.length - 1 ? 'Finish' : 'Next'}</button>
      </div>
      <p className="muted small">Synthetic data throughout. Wallet actions are real testnet transactions and only run when you approve them.</p>
    </aside>
  )
}
