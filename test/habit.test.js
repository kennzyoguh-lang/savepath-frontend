import test from 'node:test'
import assert from 'node:assert/strict'
import { habitStats, monthStatus, levelFor, spendingBreakdown, habitTips } from '../src/lib/habit.js'
import { analyse, currentMonthly, monthsUntil } from '../src/lib/projection.js'

const history = [
  { month: '2026-01', planned: 100, amount: 100 },
  { month: '2026-02', planned: 100, amount: 60 },
  { month: '2026-03', planned: 100, amount: 0 },
  { month: '2026-04', planned: 100, amount: 120 },
]

test('monthStatus classifies against the plan', () => {
  assert.equal(monthStatus({ planned: 100, amount: 100 }), 'met')
  assert.equal(monthStatus({ planned: 100, amount: 50 }), 'partial')
  assert.equal(monthStatus({ planned: 100, amount: 49 }), 'missed')
  assert.equal(monthStatus({ planned: 0, amount: 10 }), 'met')
})

test('habitStats computes score, streaks, shortfall and weakest month', () => {
  const s = habitStats(history)
  assert.equal(s.score, 63) // (1 + 0.5 + 0 + 1) / 4
  assert.equal(s.streak, 1) // only April after the zero month
  assert.equal(s.best, 2)
  assert.equal(s.shortfall, 40 + 100)
  assert.equal(s.weakest.month, '2026-03')
  assert.equal(s.level, 'Building momentum')
})

test('habitStats handles empty history', () => {
  const s = habitStats([])
  assert.equal(s.score, 0)
  assert.equal(s.weakest, null)
})

test('levelFor boundaries', () => {
  assert.equal(levelFor(80), 'Habit formed')
  assert.equal(levelFor(29), 'Needs a reset')
})

test('spendingBreakdown finds the top category and monthly average', () => {
  const b = spendingBreakdown([
    { type: 'expense', category: 'food', amount: 60, date: '2026-06-01' },
    { type: 'expense', category: 'rent', amount: 40, date: '2026-07-01' },
    { type: 'income', category: 'salary', amount: 999, date: '2026-07-01' },
  ])
  assert.equal(b.total, 100)
  assert.equal(b.monthly, 50)
  assert.deepEqual(b.top, { name: 'food', percent: 60 })
})

const data = {
  goal: { targetAmount: 1200, targetDate: '2027-06-30' },
  savings: { currentBalance: 200, plannedMonthly: 100, contributions: [{ month: '2026-06', amount: 80, planned: 100, balanceAfter: 200 }] },
}

test('analyse projects the balance and flags a shortfall', () => {
  const now = new Date('2026-07-15')
  const a = analyse(data, currentMonthly(data), now)
  assert.equal(a.target, 1200)
  assert.equal(a.remaining, 1000)
  assert.ok(a.monthsLeft >= 11 && a.monthsLeft <= 13)
  assert.equal(a.onTrack, false)
  assert.ok(a.shortfall > 0)
  assert.equal(a.percent, 17)
})

test('analyse reports on track when saving enough', () => {
  const a = analyse(data, 1000, new Date('2026-07-15'))
  assert.equal(a.onTrack, true)
  assert.equal(a.shortfall, 0)
})

test('monthsUntil never returns less than 1', () => {
  assert.equal(monthsUntil('2020-01-01', new Date('2026-01-01')), 1)
})

test('habitTips never invents advice when saving is steady', () => {
  const stats = habitStats([{ month: '2026-01', planned: 100, amount: 100 }])
  const tips = habitTips({ stats, analysis: { required: 100, monthsLeft: 6 }, topCategory: null, fmt: String })
  assert.equal(tips[0].title, 'Keep the rhythm')
})
