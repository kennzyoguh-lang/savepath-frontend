# SavePath: from intention to habit

A household savings coach for David and Amara, a young Nigerian couple saving ₦2 million over 12 months.
Built for the AI × Web3 Developers Challenge (theme: *Resilient Households, Smarter Savings*).

Most savings apps only show a balance. SavePath focuses on the real problem in the brief: **staying consistent**.
It shows how the habit is going, what-if scenarios, AI coaching, and a verifiable on-chain record of every commitment.

## What it does (mapped to the brief)

| Brief | Where |
|---|---|
| A. Household dashboard (income, expenses, balance, goal) | Goal summary, "Where each month's income goes", Household, Where the money goes |
| B. Savings goal management (target, 12-month period, balance, remaining, progress) | Goal summary ring and stats; create or replace the goal on-chain |
| C. Activity and history | Savings history table (planned vs actual), monthly habit bars, on-chain timeline |
| D. AI insights (observations, patterns, progress, recommendations, next action) | "Savings coach" card from the supplied `/ai/analyse-savings` endpoint, with the pre-written response as fallback |
| E. Web3 (wallet, create goal, retrieve goal, record contribution, show on-chain total) | "Commit your goal on-chain" and "Verified on Celo" |
| F. User experience | Responsive, dark mode, keyboard and screen-reader friendly, loading and error states |

### What goes beyond a tracker
- **Savings habit score**: consistency score, saving streak, best streak, and a bar per month against the plan, with plain-language coaching (protect the weakest month, set a floor for hard months, catch up in small steps, find the spending lever).
- **What-if projection**: drag "if I save ₦X a month" and instantly see the projected balance, the shortfall or surplus, and the finish date. Every number is computed in code, never by the AI.
- **Verified on Celo**: the backend watches the SavingsGoal contract and the dashboard shows each goal and contribution as it is confirmed on-chain, with explorer links. The suggested contribution to record is pre-filled with the amount needed to stay on plan.

## Architecture

```
Browser (React + Vite)
 ├─ GET  Apidog mock API   /customer /transactions /savings /goal   (falls back to built-in sample data)
 ├─ POST backend           /ai/analyse-savings                      (Mistral, validated, mock fallback)
 ├─ GET  backend           /goal /transactions                      (what the contract events confirmed)
 └─ wallet (MetaMask)  ──► SavingsGoal contract on Celo Sepolia  ◄── backend event listener
```

- `src/lib/projection.js`, `src/lib/habit.js`: pure functions for projections and habit analytics (unit tested).
- `src/lib/api.js`, `src/lib/ai.js`, `src/lib/savingsContract.js`: the provided integrations (data adapter, AI client, contract client), reused rather than rewritten.
- `src/components/`: one component per card. `App.jsx` composes them.

## Key decisions
1. **Numbers in code, words from AI.** Projections and habit scores are deterministic and tested. The AI only explains figures the backend already calculated and validated, so it cannot invent numbers.
2. **The app never breaks when AI does.** If Mistral is slow, rate limited, or returns something that fails validation, the backend serves the pre-written response and the UI labels it as a placeholder.
3. **Blockchain as a commitment record, not a bank.** The contract stores numbers only. The UI says so everywhere and nothing implies real money moves.
4. **Build on the boilerplate.** The data adapter, wallet hook and contract helper are kept. The work is in the experience and the intelligence on top.

## Run it

```bash
# backend (see the backend README for its .env)
cd backend && npm install && npm run dev      # http://localhost:5000

# frontend
cd frontend && npm install
cp .env.example .env                          # set VITE_AI_API_URL=http://localhost:5000
npm run dev                                   # http://localhost:5173
npm test                                      # unit tests for projections and habit analytics
```

Needs MetaMask on Celo Sepolia (the app offers to add the network) and a little testnet CELO from https://faucet.celo.org/celo-sepolia.

## Demo script (about 4 minutes)
1. **Problem and goal**: the summary shows ₦650,000 of ₦2,000,000, behind plan, with the needed monthly amount.
2. **Habit**: the consistency score, streak and monthly bars show where the habit slipped. Read one coaching tip.
3. **What-if**: drag the slider to the needed amount and watch the verdict flip to "reaches goal".
4. **AI coach**: show the insights card, then explain the fallback (the label tells which one you are seeing).
5. **Web3**: connect MetaMask, create the goal, record a contribution, and watch it appear under "Verified on Celo" with its explorer link.

## Limitations
- Synthetic data only. Contribution records are numbers on a testnet, not payments.
- Goals belong to one wallet address, so a couple shares a goal by using one wallet for the shared goal.
- If the hosted mock API is unreachable, the app shows built-in sample data and says so.
