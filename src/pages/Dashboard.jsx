import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatDateTime, formatMoney } from "../lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const COLORS = ["#0ea5e9","#22c55e","#f59e0b","#ef4444","#8b5cf6","#14b8a6"];

export default function Dashboard(){
  const navigate = useNavigate();
  const [data,setData]=useState(null);
  const [txns,setTxns]=useState([]);
  const [error,setError]=useState("");

  const load = useCallback(()=>{
    Promise.all([api("/dashboard"), api("/transactions?days=30")])
      .then(([dashboard, transactions])=>{
        setData(dashboard);
        setTxns(transactions || []);
        setError("");
      })
      .catch(err=>setError(err.message || "Could not load dashboard"));
  },[]);

  const retry = ()=>{
    setError("");
    load();
  };

  useEffect(()=>{ (async()=>{ try{ const st=await api("/profile/status"); if(!st.onboarded) navigate("/onboarding"); }catch{} })(); },[navigate]);
  useEffect(()=>{
    load();
    const h = ()=>load();
    window.addEventListener("finwise:refresh",h);
    return ()=>window.removeEventListener("finwise:refresh",h);
  },[load]);

  if(error) return (
    <div className="dash-loading">
      <p>{error}</p>
      <button type="button" onClick={retry}>Retry</button>
    </div>
  );
  if(!data) return <div className="dash-loading">Loading dashboard…</div>;

  const f = data.flexible || {};
  const pie = (data.categories||[]).map(c=>({name:c.category,value:c.amount}));
  const bar = [
    {name:"Fixed Income", value:f.month_income||0},
    {name:"Extra Income", value:f.side_income||0},
    {name:"Expense", value:data.month_expense},
    {name:"Savings", value:f.savings_this_month||0},
    {name:"Flexible", value:f.flexible_remaining||0},
  ];

  return (
    <div className="dash">
      <div className="dash-inner">
        <header className="dash-header">
          <div>
            <h1>Financial Overview</h1>
            <p>Your money at a glance</p>
          </div>
        </header>

        <section className="dash-cards">
          <Card title="Current Balance" value={data.balance} accent="#0ea5e9" />
          <Card title="Fixed Monthly Income" value={f.month_income||0} accent="#22c55e" />
          <Card title="Monthly Spent" value={data.month_expense} accent="#ef4444" />
          <Card title="Savings This Month" value={f.savings_this_month||0} accent="#14b8a6" />
          <Card title="Flexible Remaining" value={f.flexible_remaining||0} accent="#8b5cf6" />
        </section>

        <section className="dash-grid">
          <div className="dash-panel">
            <h3>Spending by Category</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pie.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="dash-panel">
            <h3>Cash Flow</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bar}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#0ea5e9" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dash-grid">
          <div className="dash-panel">
            <h3>This Month Plan</h3>
            <ul className="txn-list">
              <li><span>Fixed income</span><span>{money(f.month_income)}</span></li>
              <li><span>Fixed savings ({Number(f.fixed_savings_percent||0)}%)</span><span>{money(f.monthly_savings)}</span></li>
              <li><span>Extra income</span><span>{money(f.side_income)}</span></li>
              <li><span>Extra savings ({Number(f.extra_savings_percent||0)}%)</span><span>{money(f.side_savings)}</span></li>
              <li><span>Rollover from last month</span><span>{money(f.rollover)}</span></li>
              <li><span>Fixed expenses (suggestion)</span><span>{money(f.fixed_monthly_expense)}</span></li>
              <li><span><b>Flexible remaining</b></span><span><b>{money(f.flexible_remaining)}</b></span></li>
            </ul>
            <p className="muted">Total savings accumulated: {money(f.savings_total)}</p>
            {Number(f.savings_used_this_month||0) > 0 && <p className="muted">Savings used this month: {money(f.savings_used_this_month)}</p>}
          </div>
          <div className="dash-panel">
            <h3>Recent Transactions</h3>
            <ul className="txn-list recent">
              {(txns||[]).slice(0,8).map(t=>(
                <li key={t.id} className="txn-row">
                  <div className="txn-row-main">
                    <span className="txn-row-desc">{t.description||t.txn_type}</span>
                    <span className="txn-row-meta">
                      <span>{formatDateTime(t.txn_date)}</span>
                      <span className={"txn-type "+(t.txn_type==="expense"?"expense":"income")}>{t.txn_type}</span>
                    </span>
                  </div>
                  <span className={"txn-row-amount "+(t.txn_type==="expense"?"neg":"pos")}>
                    {t.txn_type==="expense"?"-":"+"}{formatMoney(t.amount)}
                  </span>
                </li>
              ))}
              {(!txns||txns.length===0) && <li className="muted">No transactions yet</li>}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({title,value,accent}){
  return (
    <div className="dash-card" style={{borderTop:`4px solid ${accent}`}}>
      <div className="dash-card-title">{title}</div>
      <div className="dash-card-value">{Number(value).toLocaleString()}</div>
    </div>
  );
}

function money(value){
  return Number(value||0).toLocaleString();
}
