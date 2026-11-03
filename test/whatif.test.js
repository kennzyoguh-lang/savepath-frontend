import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryBaseline, simulate, nextAction } from '../src/lib/whatif.js'
import { validateAmount, validateGoal } from '../src/lib/validate.js'

const now = new Date('2026-07-15')
const data = {
  household: { monthlyIncome: 1000 },
  goal: { targetAmount: 6000, targetDate: '2027-06-30' },
  savings: { currentBalance: 1000 },
}
const tx = [
  { type: 'expense', category: 'food', amount: 300, date: '2026-06-01' },
  { type: 'expense', category: 'power', amount: 100, date: '2026-06-02' },
  { type: 'expense', category: 'transport', amount: 80, date: '2026-06-03' },
  { type: 'expense', category: 'fun', amount: 50, date: '2026-06-04' },
  { type: 'expense', category: 'misc', amount: 20, date: '2026-06-05' },
  { type: 'income', category: 'pay', amount: 999, date: '2026-06-06' },
]

test('categoryBaseline folds the long tail into other and ignores income', () => {
  const c = categoryBaseline(tx, 4)
  assert.deepEqual(c.map((x) => x.name), ['food', 'power', 'transport', 'other'])
  assert.equal(c[3].monthly, 70)
})

test('simulate with no changes matches the plain projection', () => {
  const cats = categoryBaseline(tx)
  const s = simulate({ data, categories: cats, baseMonthly: 300, now })
  assert.equal(s.freed, 0)
  assert.equal(s.effectiveMonthly, 300)
  assert.equal(s.projected, 1000 + 300 * s.monthsLeft)
})

test('cutting spending frees cash that can be redirected to saving', () => {
  const cats = categoryBaseline(tx)
  const s = simulate({ data, categories: cats, levers: { food: -50 }, baseMonthly: 300, redirect: true, now })
  assert.equal(s.freed, 150)
  assert.equal(s.effectiveMonthly, 450)
  const off = simulate({ data, categories: cats, levers: { food: -50 }, baseMonthly: 300, redirect: false, now })
  assert.equal(off.effectiveMonthly, 300)
})

test('an unexpected expense lowers the projected outcome', () => {
  const cats = categoryBaseline(tx)
  const a = simulate({ data, categories: cats, baseMonthly: 300, now })
  const b = simulate({ data, categories: cats, baseMonthly: 300, unexpected: 200, now })
  assert.equal(a.projected - b.projected, 200)
})

test('zero saving never produces a finish date, and unaffordable plans are flagged', () => {
  const cats = categoryBaseline(tx)
  const zero = simulate({ data, categories: cats, baseMonthly: 0, now })
  assert.equal(zero.finishDate, null)
  const over = simulate({ data, categories: cats, baseMonthly: 900, now })
  assert.equal(over.affordable, false)
  assert.match(nextAction(over, String), /more than the household earns/)
})

test('validateAmount accepts whole positive numbers only', () => {
  assert.equal(validateAmount('5000').ok, true)
  for (const bad of ['', 'abc', '12.5', '0', '-3', String(2e9)]) assert.equal(validateAmount(bad).ok, false, bad)
})

test('validateGoal rejects past dates and bad targets', () => {
  const n = new Date('2026-07-15')
  assert.equal(validateGoal('2000000', '2027-10-01', n).ok, true)
  assert.equal(validateGoal('2000000', '2026-01-01', n).ok, false)
  assert.equal(validateGoal('0', '2027-10-01', n).ok, false)
  assert.equal(validateGoal('100', '', n).ok, false)
})
