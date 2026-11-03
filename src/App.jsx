import { useMemo, useState } from 'react'
import { useWallet } from './hooks/useWallet'
import { useDashboardData } from './hooks/useDashboardData'
import { analyse, currentMonthly } from './lib/projection'
import { categoryBaseline, simulate, withIllustrative } from './lib/whatif'
import { spendingBreakdown } from './lib/habit'
import WalletBar from './components/WalletBar'
import Hero from './components/Hero'
import Projection from './components/Projection'
import Simulator from './components/Simulator'
import Forecast from './components/Forecast'
import DemoGuide from './components/DemoGuide'
import ChainFeed from './components/ChainFeed'
import { HouseholdPanel, ContributionsPanel, TransactionsPanel } from './components/OffchainPanels'
import OnchainPanel from './components/OnchainPanel'
import AIPanel from './components/AIPanel'
import HabitPanel from './components/HabitPanel'

function Dashboard({ data }) {
  const wallet = useWallet()
  const base = useMemo(() => currentMonthly(data), [data])
  const categories = useMemo(() => withIllustrative(categoryBaseline(data.transactions), data.household.monthlyIncome), [data])
  const spend = useMemo(() => spendingBreakdown(data.transactions), [data])
  const [scn, setScn] = useState({ baseMonthly: base, levers: {}, unexpected: 0, redirect: true })
  const [tick, setTick] = useState(0)
  const [guide, setGuide] = useState(false)

  const current = useMemo(() => analyse(data, base), [data, base])
  const sim = useMemo(() => simulate({ data, categories, levers: scn.levers, baseMonthly: scn.baseMonthly, unexpected: scn.unexpected, redirect: scn.redirect }), [data, categories, scn])
  const scenario = useMemo(() => analyse(data, sim.effectiveMonthly), [data, sim.effectiveMonthly])

  return (
    <>
      <header className="top">
        <div className="brand">
          <svg viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="9" fill="var(--brand)" /><path d="M8 20l6-6 4 4 6-8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div><b>SaveTogether AI</b><span>Smarter Savings. Stronger Households.</span></div>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={() => setGuide((g) => !g)} aria-expanded={guide}>Jury demo</button>
          <WalletBar wallet={wallet} />
        </div>
      </header>
      <main>
        {(data.source !== 'api' || data.warnings.length > 0) && (
          <details className="notice">
            <summary>{data.source === 'sample' ? 'Showing built-in sample data (the mock API is not configured).' : 'The bank data service did not answer, so sample data is shown.'}</summary>
            {data.warnings.map((w) => <p key={w}>{w}</p>)}
          </details>
        )}
        <Hero data={data} analysis={current} />
        <div className="grid2">
          <div className="col">
            <Projection data={data} monthly={scn.baseMonthly} effective={sim.effectiveMonthly} setMonthly={(v) => setScn((s) => ({ ...s, baseMonthly: v }))} base={base} />
            <Simulator data={data} categories={categories} sim={sim} current={{ ...current, baseMonthly: base }} state={scn} setState={setScn} />
            <Forecast data={data} analysis={scenario} monthly={sim.effectiveMonthly} spendingMonthly={sim.baselineExpenses} />
          </div>
          <div className="col">
            <HabitPanel data={data} analysis={current} monthly={base} />
            <AIPanel data={data} />
            <OnchainPanel wallet={wallet} defaults={{ targetAmount: data.goal.targetAmount, targetDate: data.goal.targetDate, contribution: Math.max(1000, Math.ceil(current.required / 1000) * 1000) }} onChange={() => setTick((t) => t + 1)} />
            <ChainFeed currency={data.currency} refreshKey={tick} />
          </div>
        </div>
        <div className="grid3">
          <ContributionsPanel savings={data.savings} currency={data.currency} />
          <TransactionsPanel transactions={data.transactions} />
          <HouseholdPanel household={data.household} currency={data.currency} />
        </div>
        <footer>All figures are synthetic and the blockchain part runs on a test network: contract records are numbers, not money. Insights and forecasts are suggestions, not financial advice.</footer>
      </main>
      <DemoGuide open={guide} onClose={() => setGuide(false)} />
    </>
  )
}

export default function App() {
  const { loading, error, data, reload } = useDashboardData()
  if (loading) return <div className="boot" role="status"><span className="spinner" /> Loading your savings…</div>
  if (error) return <div className="boot err" role="alert">Could not load data: {error} <button onClick={reload}>Try again</button></div>
  return <Dashboard data={data} />
}
