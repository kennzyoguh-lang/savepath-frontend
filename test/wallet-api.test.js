import test from 'node:test'
import assert from 'node:assert/strict'
import { friendlyError, ABI, txLink, addressLink } from '../src/lib/savingsContract.js'
import { findMetaMask } from '../src/lib/walletDiscovery.js'
import { CONTRACT_ADDRESS, CHAIN_ID, CELO_SEPOLIA } from '../src/lib/config.js'
import { loadAll, normalise } from '../src/lib/api.js'
import { sampleRaw } from '../src/lib/mockData.js'

test('contract address, chain and ABI are the organizers\' supplied values', () => {
  assert.equal(CONTRACT_ADDRESS, '0xf3bF2289BB778bE70829DC4E7C630db4B348f5DE')
  assert.equal(CHAIN_ID, 11142220)
  assert.equal(CELO_SEPOLIA.chainId, '0xaa044c')
  assert.deepEqual(ABI, [
    'function createGoal(uint256 targetAmount, uint256 targetDate)',
    'function getGoal() view returns (uint256 targetAmount, uint256 targetDate, uint256 totalContributed, bool active)',
    'function recordContribution(uint256 amount)',
    'event GoalCreated(address indexed user, uint256 targetAmount, uint256 targetDate)',
    'event ContributionRecorded(address indexed user, uint256 amount, uint256 totalContributed)',
  ])
})

test('explorer links point at Celo Sepolia Blockscout', () => {
  assert.equal(txLink('0xabc'), 'https://celo-sepolia.blockscout.com/tx/0xabc')
  assert.equal(addressLink('0xdef'), 'https://celo-sepolia.blockscout.com/address/0xdef')
})

test('friendlyError maps wallet outcomes to plain language (rejected, no gas, wrong network, past date)', () => {
  assert.match(friendlyError({ code: 'ACTION_REJECTED' }), /rejected/i)
  assert.match(friendlyError({ code: 4001 }), /rejected/i)
  assert.match(friendlyError({ message: 'insufficient funds for gas' }), /Not enough testnet CELO/)
  assert.match(friendlyError({ message: 'network changed' }), /Wrong network/)
  assert.match(friendlyError({ shortMessage: 'date must be in the future' }), /future/)
  assert.equal(friendlyError({}), 'Something went wrong.')
})

test('findMetaMask picks MetaMask among several announced wallets (EIP-6963)', async () => {
  const bus = new EventTarget()
  globalThis.window = bus
  const announce = (rdns, provider) =>
    bus.dispatchEvent(Object.assign(new Event('eip6963:announceProvider'), { detail: { info: { rdns }, provider } }))
  bus.addEventListener('eip6963:requestProvider', () => {
    announce('com.coinbase.wallet', { id: 'coinbase' })
    announce('io.metamask', { id: 'metamask' })
  })
  assert.deepEqual(await findMetaMask(20), { id: 'metamask' })
})

test('findMetaMask returns null when no MetaMask announces itself', async () => {
  globalThis.window = new EventTarget()
  assert.equal(await findMetaMask(20), null)
})

test('loadAll without a configured mock API serves the built-in sample and does not throw', async () => {
  const d = await loadAll()
  assert.equal(d.source, 'sample')
  assert.deepEqual(d.warnings, [])
  assert.ok(d.goal.targetAmount > 0 && d.savings.contributions.length > 0)
})

test('normalise tolerates missing optional parts of the API data', () => {
  const raw = structuredClone(sampleRaw)
  raw.transactions = { transactions: [] }
  raw.savings = { history: [] }
  const d = normalise(raw)
  assert.deepEqual(d.transactions, [])
  assert.deepEqual(d.savings.contributions, [])
  assert.ok(Number.isFinite(d.goal.targetAmount))
})
