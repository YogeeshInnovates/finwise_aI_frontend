import { useEffect, useState } from "react";
import { api } from "../lib/api";
export default function Notifications(){
  const [items,setItems]=useState([]);
  useEffect(()=>{ api("/notifications").then(setItems).catch(()=>setItems([])); },[]);
  async function read(id){ await api(`/notifications/${id}/read`,{method:"POST"}); api("/notifications").then(setItems); }
  return (
    <div className="page">
      <h2>Notifications</h2>
      <ul className="txn-list big">
        {items.map(n=><li key={n.id}><span>{n.title}: {n.body}</span>{!n.read && <button onClick={()=>read(n.id)}>Mark read</button>}</li>)}
        {items.length===0 && <li className="muted">No notifications</li>}
      </ul>
    </div>
  );
}
