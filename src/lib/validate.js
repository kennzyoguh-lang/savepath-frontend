// Input validation for on-chain actions. The contract stores whole numbers and rejects past dates.
export const MAX_AMOUNT = 1_000_000_000

export function validateAmount(raw, label = 'Amount') {
  const text = String(raw ?? '').trim()
  if (text === '') return { ok: false, error: `${label} is required.` }
  const n = Number(text)
  if (!Number.isFinite(n)) return { ok: false, error: `${label} must be a number.` }
  if (!Number.isInteger(n)) return { ok: false, error: `${label} must be a whole number (the contract stores whole numbers).` }
  if (n <= 0) return { ok: false, error: `${label} must be greater than zero.` }
  if (n > MAX_AMOUNT) return { ok: false, error: `${label} is too large for this demo.` }
  return { ok: true, value: n }
}

export function validateGoal(target, dateStr, now = new Date()) {
  const amount = validateAmount(target, 'Target amount')
  if (!amount.ok) return amount
  const date = new Date(dateStr)
  if (!dateStr || Number.isNaN(date.getTime())) return { ok: false, error: 'Choose a target date.' }
  if (date.getTime() <= now.getTime()) return { ok: false, error: 'The target date must be in the future.' }
  return { ok: true, value: { target: amount.value, dateUnix: Math.floor(date.getTime() / 1000) } }
}
