// Savings projection maths. Pure functions, no network.
export const money = (n, cur = 'NGN') => {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const sym = cur === 'NGN' ? '₦' : `${cur} `
  return `${sym}${Math.round(Number(n)).toLocaleString('en-NG')}`
}

const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x }
export const monthLabel = (d) => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

export function monthsUntil(dateStr, now = new Date()) {
  const end = new Date(dateStr)
  const m = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()) + (end.getDate() >= now.getDate() ? 0 : -1)
  return Math.max(1, m + 1)
}

// What the household is saving per month today: the latest recorded month, else the plan.
export function currentMonthly(data) {
  const last = data.savings.contributions?.at(-1)?.amount
  return Number(last ?? data.savings.plannedMonthly ?? 0)
}

export function analyse(data, monthly, now = new Date()) {
  const target = Number(data.goal.targetAmount)
  const balance = Number(data.savings.currentBalance)
  const monthsLeft = monthsUntil(data.goal.targetDate, now)
  const remaining = Math.max(0, target - balance)
  const required = remaining / monthsLeft
  const projected = balance + monthly * monthsLeft
  const monthsToFinish = remaining === 0 ? 0 : monthly > 0 ? Math.ceil(remaining / monthly) : Infinity
  return {
    target, balance, monthsLeft, remaining, required, projected,
    shortfall: Math.max(0, target - projected),
    onTrack: projected >= target,
    percent: target ? Math.min(100, Math.round((balance / target) * 100)) : 0,
    finishDate: Number.isFinite(monthsToFinish) ? addMonths(now, monthsToFinish) : null,
    monthsToFinish,
  }
}

// Points for the chart: recorded history, then straight lines to the target date.
export function series(data, monthly, now = new Date()) {
  const a = analyse(data, monthly, now)
  const past = (data.savings.contributions || []).map((c) => ({ label: c.month, v: Number(c.balanceAfter) }))
  const future = Array.from({ length: a.monthsLeft + 1 }, (_, i) => ({
    label: monthLabel(addMonths(now, i)),
    plan: a.balance + a.required * i,
    scenario: a.balance + monthly * i,
  }))
  return { past, future, a }
}
