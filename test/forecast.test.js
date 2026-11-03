import test from 'node:test'
import assert from 'node:assert/strict'
import { forecasts, milestones, riskIndicators, contributionPace } from '../src/lib/forecast.js'
import { analyse } from '../src/lib/projection.js'

const now = new Date('2026-07-15')
const data = {
  household: { monthlyIncome: 1000 },
  goal: { targetAmount: 12000, targetDate: '2027-06-30' },
  savings: {
    currentBalance: 3000, plannedMonthly: 800,
    contributions: [
      { month: '2026-04', planned: 800, amount: 400 },
      { month: '2026-05', planned: 800, amount: 600 },
      { month: '2026-06', planned: 800, amount: 500 },
    ],
  },
}

test('forecasts: baseline uses the last three months, conservative is 75% of it', () => {
  const f = forecasts(data, now)
  const [cons, base, opt] = f.scenarios
  assert.equal(base.monthly, 500)
  assert.equal(cons.monthly, 375)
  assert.equal(opt.monthly, 800) // the plan beats 115% of 500
  assert.equal(base.projected, 3000 + 500 * f.monthsLeft)
  assert.ok(cons.projected < base.projected && base.projected < opt.projected)
})

test('forecasts: shortfall and extra needed are never negative', () => {
  const f = forecasts(data, now)
  for (const s of f.scenarios) {
    assert.ok(s.shortfall >= 0 && s.surplus >= 0 && s.extraNeeded >= 0)
    assert.equal(s.onTrack, s.shortfall === 0)
  }
})

test('forecasts: no history falls back to the plan and does not divide by zero', () => {
  const empty = { ...data, savings: { ...data.savings, contributions: [] } }
  const f = forecasts(empty, now)
  assert.equal(f.scenarios[1].monthly, 800)
  assert.equal(contributionPace([]).variability, 0)
})

test('forecasts: an expired deadline still produces finite numbers', () => {
  const late = { ...data, goal: { ...data.goal, targetDate: '2020-01-01' } }
  const f = forecasts(late, now)
  assert.equal(f.monthsLeft, 1)
  assert.ok(Number.isFinite(f.required))
})

test('milestones mark reached steps', () => {
  const m = milestones(1000, 520)
  assert.deepEqual(m.map((x) => x.reached), [true, true, false, false])
  assert.equal(m[2].remaining, 230)
})

test('riskIndicators grades pace, savings rate and volatility', () => {
  const analysis = analyse(data, 500, now)
  const r = riskIndicators({ data, analysis, monthly: 500, spendingMonthly: 400 })
  const by = Object.fromEntries(r.map((x) => [x.label, x.level]))
  assert.equal(by['Goal pace'], 'risk')
  assert.equal(by['Savings rate'], 'good')
  assert.equal(by['Spending load'], 'good')
  assert.equal(r.length, 5)
})
