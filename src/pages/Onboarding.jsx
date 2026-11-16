import { useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Onboarding(){
  const navigate = useNavigate();
  const [form,setForm]=useState({starting_balance:"",monthly_income:"",protected_savings:"",account_name:"Primary Account"});
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  async function submit(e){
    e.preventDefault();
    setErr("");
    setLoading(true);
    try{
      await api("/profile/onboarding",{method:"POST",body:JSON.stringify({
        starting_balance:Number(form.starting_balance),
        monthly_income:Number(form.monthly_income),
        protected_savings:Number(form.protected_savings||0),
        account_name:form.account_name,
      })});
      navigate("/");
    }catch(e){ setErr(e.message); } finally { setLoading(false); }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{maxWidth:520}}>
        <div className="auth-brand">FinWise AI</div>
        <h1>Welcome! Let's set up your finances</h1>
        <p className="auth-sub">Enter your starting details to personalize your dashboard.</p>
        <form onSubmit={submit}>
          <input className="auth-input" placeholder="Starting bank balance" value={form.starting_balance} onChange={e=>setForm({...form,starting_balance:e.target.value})} required />
          <input className="auth-input" placeholder="Monthly income" value={form.monthly_income} onChange={e=>setForm({...form,monthly_income:e.target.value})} required />
          <input className="auth-input" placeholder="Protected savings (optional)" value={form.protected_savings} onChange={e=>setForm({...form,protected_savings:e.target.value})} />
          <input className="auth-input" placeholder="Account name" value={form.account_name} onChange={e=>setForm({...form,account_name:e.target.value})} />
          <button className="auth-btn" type="submit" disabled={loading}>{loading?"Saving...":"Continue"}</button>
        </form>
        {err && <div className="auth-error">{err}</div>}
      </div>
    </div>
  );
}
