import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { formatDateTime, formatMoney, toLocalInput } from "../lib/format";

const blankForm = () => ({
  amount: "",
  description: "",
  category: "",
  txn_type: "expense",
  txn_date: toLocalInput(new Date()),
});

export default function Transactions(){
  const [txns,setTxns]=useState([]);
  const [showAdd,setShowAdd]=useState(false);
  const [editing,setEditing]=useState(null);
  const [filters,setFilters]=useState({days:"",type:"",q:""});
  const [form,setForm]=useState(blankForm);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  async function load(){
    setLoading(true);
    setError("");
    try{
      let url="/transactions";
      if(filters.days) url+=`?days=${filters.days}`;
      const data=await api(url);
      let filtered=data;
      if(filters.type) filtered=filtered.filter(t=>t.txn_type===filters.type);
      if(filters.q){
        const q=filters.q.toLowerCase();
        filtered=filtered.filter(t=>
          (t.description||"").toLowerCase().includes(q) ||
          (t.category_name||"").toLowerCase().includes(q) ||
          (t.txn_type||"").toLowerCase().includes(q)
        );
      }
      setTxns(filtered);
    }catch(err){
      setError(err.message||"Could not load transactions");
      setTxns([]);
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); },[filters]);

  const totals=useMemo(()=>{
    let income=0, expense=0;
    for(const t of txns){
      if(t.txn_type==="income") income+=Number(t.amount||0);
      else if(t.txn_type==="expense") expense+=Number(t.amount||0);
    }
    return {income,expense,net:income-expense};
  },[txns]);

  function resetForm(){
    setForm(blankForm());
    setEditing(null);
    setError("");
  }

  function toggleAdd(){
    if(showAdd){
      resetForm();
      setShowAdd(false);
    } else {
      resetForm();
      setShowAdd(true);
    }
  }

  async function submit(e){
    e.preventDefault();
    setSaving(true);
    setError("");
    try{
      const payload={
        amount:Number(form.amount),
        txn_type:form.txn_type,
        description:form.description,
        category:form.category,
      };
      if(form.txn_date) payload.txn_date=new Date(form.txn_date).toISOString();
      if(editing){
        await api(`/transactions/${editing}`,{method:"PUT",body:JSON.stringify(payload)});
      } else {
        await api("/transactions",{method:"POST",body:JSON.stringify(payload)});
      }
      resetForm();
      setShowAdd(false);
      await load();
    }catch(err){
      setError(err.message||"Could not save transaction");
    }finally{
      setSaving(false);
    }
  }

  function startEdit(t){
    setEditing(t.id);
    setForm({
      amount:String(t.amount??""),
      description:t.description||"",
      category:t.category_name||"",
      txn_type:t.txn_type||"expense",
      txn_date:toLocalInput(t.txn_date),
    });
    setShowAdd(true);
    setError("");
  }

  async function remove(t){
    if(!window.confirm("Delete this transaction?")) return;
    setError("");
    try{
      await api(`/transactions/${t.id}`,{method:"DELETE"});
      await load();
    }catch(err){
      setError(err.message||"Could not delete transaction");
    }
  }

  return (
    <div className="txn-page">
      <header className="txn-head">
        <div>
          <h2>Transactions</h2>
          <p>Track every rupee that comes in and goes out.</p>
        </div>
        <button className="txn-add-btn" onClick={toggleAdd}>
          {showAdd ? "Close" : "+ Add Transaction"}
        </button>
      </header>

      <section className="txn-stats">
        <div className="txn-stat income"><span>Income</span><strong>{formatMoney(totals.income)}</strong></div>
        <div className="txn-stat expense"><span>Expense</span><strong>{formatMoney(totals.expense)}</strong></div>
        <div className="txn-stat net"><span>Net</span><strong>{formatMoney(totals.net)}</strong></div>
      </section>

      <section className="txn-toolbar">
        <select value={filters.days} onChange={e=>setFilters({...filters,days:e.target.value})}>
          <option value="">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select value={filters.type} onChange={e=>setFilters({...filters,type:e.target.value})}>
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <label className="txn-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            placeholder="Filter category / description"
            value={filters.q}
            onChange={e=>setFilters({...filters,q:e.target.value})}
          />
        </label>
        <button className="txn-reset" onClick={()=>setFilters({days:"",type:"",q:""})}>Reset</button>
      </section>

      {showAdd && (
        <form className="txn-editor" onSubmit={submit}>
          <div className="txn-editor-title">{editing ? "Edit transaction" : "New transaction"}</div>
          <div className="txn-editor-grid">
            <label>
              Amount
              <input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required />
            </label>
            <label>
              Type
              <select value={form.txn_type} onChange={e=>setForm({...form,txn_type:e.target.value})}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              Category
              <input placeholder="Food, rent, bonus..." value={form.category} onChange={e=>setForm({...form,category:e.target.value})} />
            </label>
            <label>
              Description
              <input placeholder="What was this for?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
            </label>
            <label className="wide">
              Date &amp; time
              <input type="datetime-local" value={form.txn_date} onChange={e=>setForm({...form,txn_date:e.target.value})} />
            </label>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div className="txn-editor-actions">
            <button type="submit" className="txn-save" disabled={saving}>
              {saving ? "Saving..." : (editing ? "Update transaction" : "Add transaction")}
            </button>
            <button type="button" className="txn-cancel" onClick={()=>{resetForm();setShowAdd(false);}}>Cancel</button>
          </div>
        </form>
      )}

      {!showAdd && error && <div className="auth-error">{error}</div>}

      <section className="txn-list-panel">
        <div className="txn-list-head">
          <span>Transaction</span>
          <span>Amount</span>
        </div>
        {loading && <div className="txn-empty">Loading transactions...</div>}
        {!loading && txns.length===0 && <div className="txn-empty">No transactions found.</div>}
        <ul className="txn-cards">
          {txns.map(t=>(
            <li key={t.id} className="txn-card">
              <div className={"txn-badge "+(t.txn_type==="expense"?"expense":"income")}>
                {t.txn_type==="expense" ? "-" : "+"}
              </div>
              <div className="txn-card-main">
                <div className="txn-card-desc">{t.description || (t.txn_type==="income" ? "Income" : "Expense")}</div>
                <div className="txn-card-meta">
                  {t.category_name && <span className="txn-chip">{t.category_name}</span>}
                  <span>{formatDateTime(t.txn_date)}</span>
                  <span className={"txn-status "+(t.status||"")}>{t.status}</span>
                </div>
              </div>
              <div className={"txn-card-amount "+(t.txn_type==="expense"?"neg":"pos")}>
                {t.txn_type==="expense" ? "-" : "+"}{formatMoney(t.amount)}
              </div>
              <div className="txn-card-actions">
                <button onClick={()=>startEdit(t)}>Edit</button>
                <button className="danger" onClick={()=>remove(t)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
