import { useMemo, useState } from 'react'
import { useWallet } from './hooks/useWallet'
import { useDashboardData } from './hooks/useDashboardData'
import { analyse, currentMonthly } from './lib/projection'
import WalletBar from './components/WalletBar'
import Hero from './components/Hero'
import Projection from './components/Projection'
import ChainFeed from './components/ChainFeed'
import { HouseholdPanel, ContributionsPanel, TransactionsPanel } from './components/OffchainPanels'
import OnchainPanel from './components/OnchainPanel'
import AIPanel from './components/AIPanel'

function Dashboard({ data }) {
  const wallet = useWallet()
  const base = useMemo(() => currentMonthly(data), [data])
  const [monthly, setMonthly] = useState(base)
  const [tick, setTick] = useState(0)
  const analysis = useMemo(() => analyse(data, monthly), [data, monthly])
  return (
    <>
      <header className="top">
        <div className="brand">
          <svg viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="9" fill="var(--brand)" /><path d="M8 20l6-6 4 4 6-8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div><b>SavePath</b><span>{data.household.name} · {data.household.location}</span></div>
        </div>
        <WalletBar wallet={wallet} />
      </header>
      <main>
        {(data.source !== 'api' || data.warnings.length > 0) && (
          <details className="notice">
            <summary>{data.source === 'sample' ? 'Showing built-in sample data (the mock API is not configured).' : 'The bank data service did not answer, so sample data is shown.'}</summary>
            {data.warnings.map((w) => <p key={w}>{w}</p>)}
          </details>
        )}
        <Hero data={data} analysis={analysis} />
        <div className="grid2">
          <div className="col">
            <Projection data={data} monthly={monthly} setMonthly={setMonthly} base={base} />
            <AIPanel data={data} />
          </div>
          <div className="col">
            <OnchainPanel wallet={wallet} defaults={{ targetAmount: data.goal.targetAmount, targetDate: data.goal.targetDate }} onChange={() => setTick((t) => t + 1)} />
            <ChainFeed currency={data.currency} refreshKey={tick} />
          </div>
        </div>
        <div className="grid3">
          <ContributionsPanel savings={data.savings} currency={data.currency} />
          <TransactionsPanel transactions={data.transactions} />
          <HouseholdPanel household={data.household} currency={data.currency} />
        </div>
        <footer>All figures are synthetic and the blockchain part runs on a test network. Insights are suggestions, not financial advice.</footer>
      </main>
    </>
  )
}

export default function App() {
  const { loading, error, data, reload } = useDashboardData()
  if (loading) return <div className="boot" role="status"><span className="spinner" /> Loading your savings…</div>
  if (error) return <div className="boot err" role="alert">Could not load data: {error} <button onClick={reload}>Try again</button></div>
  return <Dashboard data={data} />
}
