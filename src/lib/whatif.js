// What-if simulator maths. Deterministic, local only: nothing here is saved to the API or the blockchain.
import { monthsUntil } from './projection.js'

const num = (v) => Number(v) || 0
const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x }

/** Average monthly spend per category, largest first, with the long tail folded into "other". */
export function categoryBaseline(transactions = [], maxCategories = 4) {
  const spent = transactions.filter((t) => t.type === 'expense' || t.type === 'debit')
  const months = Math.max(1, new Set(spent.map((t) => String(t.date).slice(0, 7))).size)
  const totals = {}
  for (const t of spent) totals[t.category] = (totals[t.category] || 0) + num(t.amount)
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name, total]) => ({ name, monthly: Math.round(total / months) }))
  if (sorted.length <= maxCategories) return sorted
  const head = sorted.slice(0, maxCategories - 1)
  const rest = sorted.slice(maxCategories - 1).reduce((s, c) => s + c.monthly, 0)
  return [...head, { name: 'other', monthly: rest }]
}

// The supplied data lists few expense categories. The simulator adds clearly labelled, synthetic
// estimates (shares of income) for the common household categories that are missing, so each lever can be tried.
const SHARES = { food: 0.18, transport: 0.08, other: 0.05 }
const ALIASES = { food: ['food', 'groceries', 'grocery'], transport: ['transport', 'transportation'], other: ['other', 'miscellaneous'] }
export function withIllustrative(categories, income) {
  const have = new Set(categories.map((c) => String(c.name).toLowerCase()))
  const extra = Object.entries(SHARES)
    .filter(([k]) => income > 0 && !ALIASES[k].some((a) => have.has(a)))
    .map(([k, share]) => ({ name: k, monthly: Math.round((income * share) / 1000) * 1000, synthetic: true }))
  return [...categories, ...extra]
}

export function simulate({ data, categories, levers = {}, baseMonthly, unexpected = 0, redirect = true, now = new Date() }) {
  const income = num(data.household.monthlyIncome)
  const target = num(data.goal.targetAmount)
  const balance = num(data.savings.currentBalance)
  const monthsLeft = monthsUntil(data.goal.targetDate, now)
  const baselineExpenses = categories.reduce((s, c) => s + c.monthly, 0)
  const scenarioExpenses = categories.reduce((s, c) => s + c.monthly * (1 + num(levers[c.name]) / 100), 0)
  const freed = baselineExpenses - scenarioExpenses
  const effectiveMonthly = Math.max(0, num(baseMonthly) + (redirect ? freed : 0))
  const projected = balance + effectiveMonthly * monthsLeft - Math.max(0, num(unexpected))
  const remaining = Math.max(0, target - balance)
  const afterShock = Math.max(0, target - projected)
  const monthsToFinish = effectiveMonthly > 0 ? Math.ceil((remaining + Math.max(0, num(unexpected))) / effectiveMonthly) : Infinity
  const disposable = income - scenarioExpenses - effectiveMonthly
  const extra = Math.max(0, (target - projected) / monthsLeft)
  return {
    monthsLeft, baselineExpenses: Math.round(baselineExpenses), scenarioExpenses: Math.round(scenarioExpenses),
    freed: Math.round(freed), effectiveMonthly: Math.round(effectiveMonthly), disposable: Math.round(disposable),
    affordable: disposable >= 0, projected: Math.round(projected),
    shortfall: Math.round(afterShock), surplus: Math.round(Math.max(0, projected - target)), onTrack: projected >= target,
    finishDate: Number.isFinite(monthsToFinish) ? addMonths(now, monthsToFinish) : null,
    extraNeeded: Math.ceil(extra / 500) * 500,
  }
}

export function nextAction(sim, fmt) {
  if (!sim.affordable) return `This plan spends more than the household earns (${fmt(Math.abs(sim.disposable))} over each month). Ease one of the levers.`
  if (sim.onTrack) return `This plan reaches the goal with ${fmt(sim.surplus)} to spare. Agree it together and record the first contribution.`
  return `Still ${fmt(sim.shortfall)} short. Saving about ${fmt(sim.extraNeeded)} more each month, or moving the target date, closes the gap.`
}
