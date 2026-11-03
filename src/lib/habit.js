// Habit analytics: turns monthly savings history into consistency signals. Pure functions, no network.
const num = (v) => Number(v) || 0

export function monthStatus({ planned, amount }) {
  const p = num(planned), a = num(amount)
  if (p <= 0) return a > 0 ? 'met' : 'missed'
  const ratio = a / p
  return ratio >= 1 ? 'met' : ratio >= 0.5 ? 'partial' : 'missed'
}

export function levelFor(score) {
  if (score >= 80) return 'Habit formed'
  if (score >= 55) return 'Building momentum'
  if (score >= 30) return 'Getting started'
  return 'Needs a reset'
}

export function habitStats(contributions = []) {
  const months = contributions.map((c) => {
    const planned = num(c.planned), actual = num(c.amount)
    return { month: c.month, planned, actual, status: monthStatus(c), ratio: planned ? actual / planned : actual > 0 ? 1 : 0 }
  })
  const points = months.reduce((s, m) => s + (m.status === 'met' ? 1 : m.status === 'partial' ? 0.5 : 0), 0)
  const score = months.length ? Math.round((100 * points) / months.length) : 0

  let streak = 0
  for (let i = months.length - 1; i >= 0 && months[i].actual > 0; i--) streak++
  let best = 0, run = 0
  for (const m of months) { run = m.actual > 0 ? run + 1 : 0; best = Math.max(best, run) }

  const avg = (xs) => (xs.length ? xs.reduce((s, m) => s + m.actual, 0) / xs.length : 0)
  const recent = avg(months.slice(-3)), earlier = avg(months.slice(-6, -3))
  const trend = !earlier ? 'steady' : recent > earlier * 1.1 ? 'rising' : recent < earlier * 0.9 ? 'falling' : 'steady'

  return {
    months, score, level: levelFor(score), streak, best, trend,
    metCount: months.filter((m) => m.status === 'met').length,
    shortfall: months.reduce((s, m) => s + Math.max(0, m.planned - m.actual), 0),
    weakest: months.length ? months.reduce((w, m) => (m.ratio < w.ratio ? m : w)) : null,
  }
}

// Plain-language, rule-based coaching. Separate from the AI insights and never invents numbers.
export function habitTips({ stats, analysis, topCategory, fmt }) {
  const tips = []
  const { weakest, trend, shortfall } = stats
  if (weakest && weakest.ratio < 0.5) {
    tips.push({ title: `Protect your weakest month (${weakest.month})`, text: `You saved ${Math.round(weakest.ratio * 100)}% of plan that month. Move the saving to payday with a standing order so it happens before spending does.` })
  }
  if (trend === 'falling') {
    tips.push({ title: 'Set a floor, not just a target', text: `Contributions are trending down. Agree a minimum of ${fmt(Math.round((analysis.required * 0.5) / 1000) * 1000)} for hard months so a bad month never becomes zero.` })
  }
  if (shortfall > 0) {
    tips.push({ title: 'Catch up in small steps', text: `You are ${fmt(shortfall)} behind your own plan so far. Spread over ${analysis.monthsLeft} months that is about ${fmt(Math.ceil(shortfall / analysis.monthsLeft / 500) * 500)} extra a month.` })
  }
  if (topCategory) {
    tips.push({ title: `Look at ${topCategory.name}`, text: `${topCategory.name} is ${topCategory.percent}% of tracked spending, the biggest lever for freeing up money to save.` })
  }
  if (!tips.length) tips.push({ title: 'Keep the rhythm', text: 'You are saving consistently. Record each contribution on-chain to keep a verifiable streak.' })
  return tips.slice(0, 4)
}

export function spendingBreakdown(transactions = []) {
  const spent = transactions.filter((t) => t.type === 'expense' || t.type === 'debit')
  const total = spent.reduce((s, t) => s + num(t.amount), 0)
  const byCat = Object.entries(spent.reduce((m, t) => ({ ...m, [t.category]: (m[t.category] || 0) + num(t.amount) }), {})).sort((a, b) => b[1] - a[1])
  const months = new Set(spent.map((t) => String(t.date).slice(0, 7))).size
  return {
    total,
    monthly: months ? Math.round(total / months) : 0,
    top: byCat[0] ? { name: byCat[0][0], percent: Math.round((byCat[0][1] / total) * 100) } : null,
  }
}
