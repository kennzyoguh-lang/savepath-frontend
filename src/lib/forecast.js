// Explainable savings forecasts and risk indicators. Plain arithmetic on the supplied data: no machine learning, no guarantees.
import { habitStats } from './habit.js'
import { monthsUntil } from './projection.js'

const num = (v) => Number(v) || 0
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

export function contributionPace(contributions = []) {
  const actuals = contributions.map((c) => num(c.amount))
  const recent = avg(actuals.slice(-3))
  const mean = avg(actuals)
  const sd = Math.sqrt(avg(actuals.map((a) => (a - mean) ** 2)))
  return { recent, mean, variability: mean ? sd / mean : 0, months: actuals.length }
}

/**
 * Three transparent scenarios, all based on the last three months of recorded saving:
 *  baseline     = that recent average continues
 *  conservative = 75% of it (a harder stretch)
 *  optimistic   = the household's own monthly plan, or 115% of recent pace if that is higher
 */
export function forecasts(data, now = new Date()) {
  const target = num(data.goal.targetAmount)
  const balance = num(data.savings.currentBalance)
  const monthsLeft = monthsUntil(data.goal.targetDate, now)
  const remaining = Math.max(0, target - balance)
  const required = remaining / monthsLeft
  const pace = contributionPace(data.savings.contributions)
  const base = pace.months ? pace.recent : num(data.savings.plannedMonthly)
  const plan = num(data.savings.plannedMonthly)
  const make = (key, label, monthly, how) => {
    const projected = balance + monthly * monthsLeft
    return {
      key, label, how, monthly: Math.round(monthly), projected: Math.round(projected),
      shortfall: Math.max(0, Math.round(target - projected)),
      surplus: Math.max(0, Math.round(projected - target)),
      extraNeeded: Math.max(0, Math.round(required - monthly)),
      onTrack: projected >= target,
    }
  }
  return {
    monthsLeft, required: Math.round(required), remaining, pace,
    scenarios: [
      make('conservative', 'Conservative', base * 0.75, '75% of your recent monthly saving'),
      make('baseline', 'Baseline', base, 'Your last three months continue'),
      make('optimistic', 'Optimistic', Math.max(plan, base * 1.15), 'You follow your own monthly plan'),
    ],
  }
}

export function milestones(target, balance, steps = [25, 50, 75, 100]) {
  return steps.map((p) => {
    const amount = Math.round((target * p) / 100)
    return { percent: p, amount, reached: balance >= amount, remaining: Math.max(0, amount - balance) }
  })
}

const level = (good, watch) => (good ? 'good' : watch ? 'watch' : 'risk')

export function riskIndicators({ data, analysis, monthly, spendingMonthly }) {
  const income = num(data.household.monthlyIncome)
  const stats = habitStats(data.savings.contributions)
  const pace = contributionPace(data.savings.contributions)
  const rate = income ? monthly / income : 0
  const spendShare = income ? spendingMonthly / income : 0
  const gap = analysis.remaining ? analysis.shortfall / analysis.remaining : 0
  return [
    { label: 'Goal pace', level: level(analysis.onTrack, gap < 0.2), detail: analysis.onTrack ? 'At this pace the goal is reached on time.' : `Projected ${Math.round(gap * 100)}% short of what is still needed.` },
    { label: 'Savings rate', level: level(rate >= 0.15, rate >= 0.08), detail: `${Math.round(rate * 100)}% of income goes to saving (15% or more is strong).` },
    { label: 'Spending load', level: level(spendShare < 0.5, spendShare < 0.7), detail: spendingMonthly ? `Tracked spending is about ${Math.round(spendShare * 100)}% of income.` : 'No spending data to assess.' },
    { label: 'Consistency', level: level(stats.score >= 70, stats.score >= 40), detail: `${stats.metCount} of ${stats.months.length} months met the plan (score ${stats.score}).` },
    { label: 'Volatility', level: level(pace.variability < 0.25, pace.variability < 0.5), detail: pace.months ? `Monthly saving swings by about ${Math.round(pace.variability * 100)}% around its average.` : 'Not enough history.' },
  ]
}
