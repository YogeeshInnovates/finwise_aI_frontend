import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export default function Settings(){
  const [accounts,setAccounts]=useState([]);
  const [form,setForm]=useState({
    fixed_monthly_income:"",
    fixed_savings_percent:0,
    extra_savings_percent:10,
    fixed_monthly_expense:"",
  });
  const [msg,setMsg]=useState("");
  const saveTimer=useRef(null);

  async function loadAccounts(){
    setAccounts(await api("/accounts").catch(()=>[]));
  }

  async function loadSettings(){
    const s=await api("/settings").catch(()=>null);
    if(s) setForm({
      fixed_monthly_income: s.fixed_monthly_income ?? "",
      fixed_savings_percent: Number(s.fixed_savings_percent || 0),
      extra_savings_percent: Number(s.extra_savings_percent || 0),
      fixed_monthly_expense: s.fixed_monthly_expense ?? "",
    });
  }

  useEffect(()=>{
    loadAccounts();
    loadSettings();
    return ()=>clearTimeout(saveTimer.current);
  },[]);

  async function saveAccount(a){
    await api(`/accounts/${a.id}`,{method:"PUT",body:JSON.stringify(a)});
    setMsg("Account updated");
    loadAccounts();
  }

  function payload(next){
    return {
      fixed_monthly_income: Number(next.fixed_monthly_income || 0),
      fixed_savings_percent: Number(next.fixed_savings_percent || 0),
      extra_savings_percent: Number(next.extra_savings_percent || 0),
      fixed_monthly_expense: Number(next.fixed_monthly_expense || 0),
    };
  }

  async function persist(next){
    setMsg("Saving...");
    try{
      await api("/settings",{method:"PUT",body:JSON.stringify(payload(next))});
      setMsg("Saved");
    }catch(err){
      setMsg(err.message);
    }
  }

  function scheduleSave(next){
    setMsg("Saving...");
    clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>persist(next),600);
  }

  function changeSlider(key,value){
    const next={...form,[key]:Number(value)};
    setForm(next);
    scheduleSave(next);
  }

  const income = Number(form.fixed_monthly_income || 0);
  const fixedExpense = Number(form.fixed_monthly_expense || 0);
  const fixedSavings = income * Number(form.fixed_savings_percent || 0) / 100;
  const fixedFree = income - fixedSavings;

  return (
    <div className="page">
      <h2>Settings</h2>
      <p style={{color:"var(--muted)",marginBottom:16}}>Set your fixed income, savings percentages and monthly expenses. Changes save automatically.</p>
      {msg && <div className="auth-error" style={{background:"rgba(34,197,94,.15)",color:"#86efac",borderColor:"rgba(34,197,94,.3)"}}>{msg}</div>}

      <h3>Accounts</h3>
      <p className="muted">Your bank/cash/credit accounts and current balances.</p>
      {accounts.map(a=>(
        <div key={a.id} className="txn-form" style={{marginBottom:12}}>
          <input value={a.name} onChange={e=>setAccounts(accounts.map(x=>x.id===a.id?{...x,name:e.target.value}:x))}/>
          <select value={a.account_type} onChange={e=>setAccounts(accounts.map(x=>x.id===a.id?{...x,account_type:e.target.value}:x))}>
            <option value="bank">Bank</option><option value="cash">Cash</option><option value="credit">Credit</option>
          </select>
          <input value={a.currency} onChange={e=>setAccounts(accounts.map(x=>x.id===a.id?{...x,currency:e.target.value}:x))}/>
          <input value={a.balance} onChange={e=>setAccounts(accounts.map(x=>x.id===a.id?{...x,balance:e.target.value}:x))}/>
          <button onClick={()=>saveAccount(a)}>Save</button>
        </div>
      ))}

      <form onSubmit={e=>{e.preventDefault();persist(form);}}>
        <h3>Fixed monthly income</h3>
        <p className="muted">Your salary or other income that comes every month.</p>
        <div className="txn-form" style={{marginBottom:12}}>
          <input placeholder="Monthly income (e.g. 25000)" value={form.fixed_monthly_income}
            onChange={e=>setForm({...form,fixed_monthly_income:e.target.value})}
            onBlur={()=>scheduleSave(form)}/>
        </div>
        <div style={{marginBottom:8}}>
          <label className="muted">How much to save: {form.fixed_savings_percent}%</label>
          <input type="range" min="0" max="100" step="1" style={{width:"100%"}}
            value={form.fixed_savings_percent}
            onChange={e=>changeSlider("fixed_savings_percent",e.target.value)}/>
        </div>
        <p className="muted" style={{marginBottom:8}}>
          Income {money(income)}: save {money(fixedSavings)} ({form.fixed_savings_percent}%), free to spend {money(fixedFree)}.
        </p>
        <p className="muted" style={{marginBottom:16}}>
          Fixed expenses estimate {money(fixedExpense)} is only for suggestions; it does not reduce Flexible or Balance.
        </p>

        <h3>Extra / side income</h3>
        <p className="muted">Bonus, freelance or other extra money. No amount here — it is added automatically when you enter it in chat.</p>
        <div style={{marginBottom:8}}>
          <label className="muted">How much to save from extra income: {form.extra_savings_percent}%</label>
          <input type="range" min="0" max="100" step="1" style={{width:"100%"}}
            value={form.extra_savings_percent}
            onChange={e=>changeSlider("extra_savings_percent",e.target.value)}/>
        </div>
        <p className="muted" style={{marginBottom:16}}>
          When you receive extra money, {form.extra_savings_percent}% goes to savings and the rest is free to spend.
        </p>

        <h3>Fixed monthly expenses (approx)</h3>
        <p className="muted">Rent, bills, EMI and other fixed monthly costs. Used for suggestions only; it does not reduce your balance or Flexible.</p>
        <div className="txn-form" style={{marginBottom:16}}>
          <input placeholder="Approx monthly expenses (e.g. 17000)" value={form.fixed_monthly_expense}
            onChange={e=>setForm({...form,fixed_monthly_expense:e.target.value})}
            onBlur={()=>scheduleSave(form)}/>
        </div>

        <button className="auth-btn" type="submit" style={{width:"auto"}}>
          Save Settings
        </button>
      </form>
    </div>
  );
}

function money(value){
  return Number(value||0).toLocaleString();
}
