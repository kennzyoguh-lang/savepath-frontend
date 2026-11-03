import { money } from '../lib/projection'

export function HouseholdPanel({ household, currency }) {
  return (
    <section className="card">
      <div className="card-head"><h3>Household</h3><span className="chip idle">Synthetic</span></div>
      <ul className="rows">
        {household.members.map((m) => (
          <li key={m.id}><span>{m.name}, age {m.age}</span><b>{money(m.monthly_income, currency)}<small> / mo</small></b></li>
        ))}
      </ul>
      <p className="muted">Combined monthly income <b>{money(household.monthlyIncome, currency)}</b></p>
    </section>
  )
}

export function ContributionsPanel({ savings, currency }) {
  const list = savings.contributions || []
  return (
    <section className="card">
      <div className="card-head"><h3>Savings history</h3></div>
      <ul className="rows">
        <li><span>Total contributed</span><b>{money(savings.totalContributed, currency)}</b></li>
        <li><span>Total withdrawn</span><b>{money(savings.totalWithdrawn, currency)}</b></li>
        <li><span>Monthly plan</span><b>{money(savings.plannedMonthly, currency)}</b></li>
      </ul>
      {list.length === 0 ? <p className="muted">No history yet.</p> : (
        <div className="wrap">
          <table className="tbl">
            <thead><tr><th>Month</th><th>Planned</th><th>Actual</th><th>vs plan</th></tr></thead>
            <tbody>
              {list.map((c) => {
                const diff = Number(c.amount) - Number(c.planned)
                return (
                  <tr key={c.month}>
                    <td>{c.month}</td>
                    <td>{Number(c.planned).toLocaleString()}</td>
                    <td>{Number(c.amount).toLocaleString()}</td>
                    <td className={diff >= 0 ? 'credit' : 'debit'}>{diff >= 0 ? '+' : '−'}{Math.abs(diff).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function TransactionsPanel({ transactions }) {
  const spent = transactions.filter((t) => t.type === 'expense' || t.type === 'debit')
  const byCat = Object.entries(spent.reduce((m, t) => ({ ...m, [t.category]: (m[t.category] || 0) + Number(t.amount) }), {})).sort((a, b) => b[1] - a[1])
  const total = byCat.reduce((s, [, v]) => s + v, 0)
  return (
    <section className="card">
      <div className="card-head"><h3>Where the money goes</h3></div>
      {byCat.length === 0 ? <p className="muted">No transactions found.</p> : (
        <ul className="cats">
          {byCat.map(([cat, v]) => (
            <li key={cat}>
              <div><span className="cap">{cat}</span><b>{money(v)}</b></div>
              <div className="bar"><i style={{ width: `${Math.round((v / total) * 100)}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
      <h4>Recent</h4>
      <ul className="rows">
        {transactions.slice(-6).reverse().map((t) => {
          const out = t.type === 'expense' || t.type === 'debit'
          return (
            <li key={t.id}>
              <span>{t.description} <small className="muted">{t.date}</small></span>
              <b className={out ? 'debit' : 'credit'}>{out ? '−' : '+'}{Number(t.amount).toLocaleString()}</b>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
