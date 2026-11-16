import { useEffect, useState } from "react";
import { api } from "../lib/api";
export default function Commitments(){
  const [items,setItems]=useState([]);
  const [form,setForm]=useState({name:"",amount:"",due_date:""});
  useEffect(()=>{ api("/commitments").then(setItems).catch(()=>setItems([])); },[]);
  async function submit(e){
    e.preventDefault();
    await api("/commitments",{method:"POST",body:JSON.stringify({...form,amount:Number(form.amount),due_date:new Date(form.due_date).toISOString()})});
    setForm({name:"",amount:"",due_date:""});
    api("/commitments").then(setItems);
  }
  async function pay(id){ await api(`/commitments/${id}/pay`,{method:"POST"}); api("/commitments").then(setItems); }
  return (
    <div className="page">
      <h2>Fixed Commitments</h2>
      <form className="txn-form" onSubmit={submit}>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
        <input placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/>
        <input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} required/>
        <button type="submit">Add</button>
      </form>
      <ul className="txn-list big">
        {items.map(c=><li key={c.id}><span>{c.name} — {c.amount} (due {new Date(c.due_date).toLocaleDateString()}) [{c.status}]</span>
          {c.status==="unpaid" && <button onClick={()=>pay(c.id)}>Mark paid</button>}
        </li>)}
      </ul>
    </div>
  );
}
