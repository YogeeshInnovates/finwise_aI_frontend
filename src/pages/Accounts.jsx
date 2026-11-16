import { useEffect, useState } from "react";
import { api } from "../lib/api";
export default function Accounts(){
  const [accs,setAccs]=useState([]);
  const [form,setForm]=useState({name:"",account_type:"bank",balance:""});
  useEffect(()=>{ api("/accounts").then(setAccs).catch(()=>setAccs([])); },[]);
  async function submit(e){
    e.preventDefault();
    await api("/accounts",{method:"POST",body:JSON.stringify({...form,balance:Number(form.balance||0)})});
    setForm({name:"",account_type:"bank",balance:""});
    api("/accounts").then(setAccs);
  }
  return (
    <div className="page">
      <h2>Accounts</h2>
      <form className="txn-form" onSubmit={submit}>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
        <select value={form.account_type} onChange={e=>setForm({...form,account_type:e.target.value})}>
          <option value="bank">Bank</option><option value="cash">Cash</option><option value="credit">Credit</option>
        </select>
        <input placeholder="Balance" value={form.balance} onChange={e=>setForm({...form,balance:e.target.value})}/>
        <button type="submit">Add</button>
      </form>
      <ul className="txn-list big">{accs.map(a=><li key={a.id}><span>{a.name} ({a.account_type})</span><span>{a.balance}</span></li>)}</ul>
    </div>
  );
}
