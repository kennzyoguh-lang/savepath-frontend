import { MOCK_API_BASE_URL } from "./config.js";
import { sampleRaw } from "./mockData.js";

// Data adapter. The UI only calls loadAll() and receives a clean view model.
// Everything specific to the API response shapes lives in this file.
const ENDPOINTS = {
  customer: "/customer",
  transactions: "/transactions",
  savings: "/savings",
  goal: "/goal",
};
// Each inner list means "at least one of these keys must be present".
const REQUIRED = {
  customer: [["id"], ["household"]],
  transactions: [["transactions"]],
  savings: [["history", "contributions"]],
  goal: [["target_amount"]],
};
const has = (json, keys) => keys.some((k) => json?.[k] !== undefined);

async function getJson(path, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(MOCK_API_BASE_URL + path, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function normalise(raw) {
  const { customer: c, savings: s, goal: g, transactions: t } = raw;
  const members = c.household?.members || [];
  const rows = s.history ?? s.contributions ?? [];
  const monthlyTarget = s.monthly_target ?? s.planned_monthly_contribution;
  return {
    customerId: c.id,
    currency: c.currency || s.currency || t.currency || "NGN",
    household: {
      name: c.household?.name,
      location: c.household?.location,
      members,
      monthlyIncome: members.reduce(
        (sum, m) => sum + (m.monthly_income || 0),
        0,
      ),
    },
    goal: {
      id: g.goal_id,
      name: g.name,
      purpose: g.purpose,
      targetAmount: g.target_amount,
      currentBalance: g.current_balance,
      amountRemaining: g.amount_remaining,
      targetDate: g.target_date,
      monthsRemaining: g.months_remaining,
      status: g.status,
      progress: g.progress_percentage,
      originalMonthly: g.original_monthly_target,
      requiredMonthly: g.current_required_monthly_contribution,
    },
    savings: {
      currentBalance: s.current_balance,
      totalContributed: s.total_contributed,
      totalWithdrawn: s.total_withdrawn,
      frequency: s.contribution_frequency,
      plannedMonthly: monthlyTarget,
      contributions: rows.map((x) => ({
        month: x.month,
        planned: x.planned_contribution ?? monthlyTarget,
        amount: x.actual_contribution ?? x.amount ?? 0,
        balanceAfter: x.balance_after ?? x.balance_after_contribution,
      })),
    },
    transactions: (t.transactions || []).map(
      ({ id, date, type, category, description, amount }) => ({
        id,
        date,
        type,
        category,
        description,
        amount,
      }),
    ),
  };
}

function checkConsistency(raw) {
  const w = [];
  const ids = new Set(
    [
      raw.customer.id,
      raw.savings.customer_id,
      raw.goal.customer_id,
      raw.transactions.customer_id,
    ].filter(Boolean),
  );
  if (ids.size > 1)
    w.push(
      `Customer identifiers differ between endpoints (${[...ids].join(", ")}).`,
    );
  const balances = new Set(
    [
      raw.customer.current_savings_balance,
      raw.savings.current_balance,
      raw.goal.current_balance,
    ].filter((x) => x != null),
  );
  if (balances.size > 1)
    w.push(
      `Savings balance differs between endpoints (${[...balances].join(", ")}).`,
    );
  const last = (raw.savings.history ?? raw.savings.contributions ?? []).at(-1);
  const lastBalance = last?.balance_after ?? last?.balance_after_contribution;
  if (last && lastBalance !== raw.savings.current_balance)
    w.push("Last history balance does not match the current savings balance.");
  return w;
}

export async function loadAll() {
  if (!MOCK_API_BASE_URL)
    return { ...normalise(sampleRaw), source: "sample", warnings: [] };
  const warnings = [];
  const raw = {};
  let source = "api";
  await Promise.all(
    Object.entries(ENDPOINTS).map(async ([key, path]) => {
      try {
        const json = await getJson(path);
        const missing = REQUIRED[key].find((keys) => !has(json, keys));
        if (missing) {
          console.warn(`[api] ${path} returned`, json);
          throw new Error(
            `unexpected response (expected ${missing.join(" or ")}; received keys: ${Object.keys(json || {}).join(", ") || "none"})`,
          );
        }
        raw[key] = json;
      } catch (e) {
        warnings.push(
          `${path}: ${e.message}. Showing sample data for this part.`,
        );
        raw[key] = sampleRaw[key];
        source = "partial";
      }
    }),
  );
  if (source === "api") warnings.push(...checkConsistency(raw));
  return { ...normalise(raw), source, warnings };
}
