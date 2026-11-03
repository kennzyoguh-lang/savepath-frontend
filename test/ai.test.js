import test from 'node:test'
import assert from 'node:assert/strict'
import { analyseSavings, buildPayload, localInsight } from '../src/lib/ai.js'

const data = {
  customerId: 'c1', currency: 'NGN',
  household: { name: 'Household A', monthlyIncome: 850000 },
  goal: { targetAmount: 2000000, targetDate: '2027-10-01' },
  savings: { currentBalance: 650000, plannedMonthly: 166667, contributions: [{ month: '2026-06', amount: 100000, planned: 166667, balanceAfter: 650000 }] },
  transactions: [{ id: 't1', date: '2026-06-05', type: 'expense', category: 'electricity', description: 'Bill', amount: 35000 }],
}

test('buildPayload maps the dashboard data to the endpoint contract', () => {
  const p = buildPayload(data)
  assert.equal(p.financial_summary.target_amount, 2000000)
  assert.equal(p.financial_summary.monthly_savings_contribution, 100000)
  assert.equal(p.savings_history[0].actual, 100000)
})

test('localInsight is a complete, number-safe fallback', () => {
  const i = localInsight(buildPayload(data))
  assert.ok(i.summary && Array.isArray(i.observations) && Array.isArray(i.recommendations))
})

test('analyseSavings falls back to a labelled local insight when no AI backend is configured', async () => {
  const out = await analyseSavings(data)
  assert.ok(['mock', 'fallback', 'mockapi', 'backendmock'].includes(out.source))
  assert.notEqual(out.source, 'live')
  assert.ok(out.summary)
})
