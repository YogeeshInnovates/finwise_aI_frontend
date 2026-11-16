import { useEffect, useState } from "react";
import { api } from "../lib/api";
export default function Reports(){
  const [s,setS]=useState(null);
  useEffect(()=>{ api("/reports/summary?days=30").then(setS).catch(()=>setS(null)); },[]);
  return (
    <div className="page">
      <h2>Reports</h2>
      {s && <div className="dash-cards">
        <div className="dash-card"><div className="dash-card-title">Income</div><div className="dash-card-value">{s.income}</div></div>
        <div className="dash-card"><div className="dash-card-title">Expense</div><div className="dash-card-value">{s.expense}</div></div>
        <div className="dash-card"><div className="dash-card-title">Net</div><div className="dash-card-value">{s.net}</div></div>
        <div className="dash-card"><div className="dash-card-title">Count</div><div className="dash-card-value">{s.count}</div></div>
      </div>}
      <a href="http://localhost:8000/api/v1/reports/export.csv" target="_blank" rel="noreferrer" className="auth-btn" style={{display:"inline-block",width:"auto",textDecoration:"none"}}>Download CSV</a>
    </div>
  );
}
