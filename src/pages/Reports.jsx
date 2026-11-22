import { useCallback, useEffect, useMemo, useState } from "react";
import { api, apiDownload } from "../lib/api";
import { formatDateTime, formatMoney } from "../lib/format";

const money = (value) => `₹${formatMoney(value)}`;

export default function Reports(){
  const [report,setReport]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [downloading,setDownloading]=useState("");
  const [downloadError,setDownloadError]=useState("");
  const [query,setQuery]=useState("");

  const load=useCallback(()=>{
    api("/reports/passbook")
      .then(data=>{
        setReport(data);
        setError("");
      })
      .catch(err=>{
        setError(err.message || "Could not load your passbook");
        setReport(null);
      })
      .finally(()=>setLoading(false));
  },[]);

  function retry(){
    setLoading(true);
    setError("");
    load();
  }

  useEffect(()=>{ load(); },[load]);

  const rows=useMemo(()=>{
    const txns=report?.transactions || [];
    const q=query.trim().toLowerCase();
    if(!q) return txns;
    return txns.filter(t=>
      (t.description||"").toLowerCase().includes(q) ||
      (t.category||"").toLowerCase().includes(q) ||
      (t.account||"").toLowerCase().includes(q) ||
      (t.type||"").toLowerCase().includes(q) ||
      (t.status||"").toLowerCase().includes(q)
    );
  },[report,query]);

  async function download(kind){
    if(downloading) return;
    setDownloading(kind);
    setDownloadError("");
    try{
      await apiDownload(`/reports/export.${kind}`, `finwise-passbook.${kind}`);
    }catch(err){
      setDownloadError(err.message || "Could not download the passbook");
    }finally{
      setDownloading("");
    }
  }

  return (
    <div className="reports-page">
      <header className="reports-head">
        <div>
          <h2>Reports & Passbook</h2>
          <p>Download every transaction, every date, with your balance and running passbook.</p>
        </div>
        <div className="reports-actions">
          <button
            type="button"
            className="rp-btn primary"
            onClick={()=>download("pdf")}
            disabled={!!downloading}
          >
            {downloading==="pdf" ? "Preparing PDF…" : "Download passbook PDF"}
          </button>
          <button
            type="button"
            className="rp-btn"
            onClick={()=>download("csv")}
            disabled={!!downloading}
          >
            {downloading==="csv" ? "Preparing CSV…" : "Download CSV"}
          </button>
        </div>
      </header>

      {downloadError && <div className="rp-alert error">{downloadError}</div>}

      {loading && <div className="rp-loading">Loading your passbook…</div>}

      {error && !loading && (
        <div className="rp-alert error">
          <span>{error}</span>
          <button type="button" onClick={retry}>Retry</button>
        </div>
      )}

      {report && !loading && !error && (
        <>
          <section className="rp-summary">
            <SummaryCard label="Current balance" value={money(report.current_balance)} accent="#06b6d4" sub="As of now" />
            <SummaryCard label="Opening balance" value={money(report.opening_balance)} accent="#8b5cf6" sub="Before first transaction" />
            <SummaryCard label="Total credits" value={money(report.total_income)} accent="#22c55e" sub="Confirmed income" />
            <SummaryCard label="Total debits" value={money(report.total_expense)} accent="#ef4444" sub="Confirmed expenses" />
            <SummaryCard label="Net change" value={money(report.net_change)} accent="#f59e0b" sub="Credits minus debits" />
            <SummaryCard
              label="Transactions"
              value={String(report.count)}
              accent="#38bdf8"
              sub={`${report.confirmed_count} confirmed · ${report.pending_count} pending`}
            />
          </section>

          <section className="rp-panel">
            <div className="rp-panel-head">
              <div>
                <h3>Bank passbook</h3>
                <p>All transactions with running balance. Newest entries are at the bottom.</p>
              </div>
              <input
                className="rp-search"
                value={query}
                onChange={e=>setQuery(e.target.value)}
                placeholder="Search transactions…"
                aria-label="Search passbook transactions"
              />
            </div>

            <div className="rp-table-wrap">
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th>Type</th>
                    <th className="num">Debit</th>
                    <th className="num">Credit</th>
                    <th className="num">Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(t=>(
                    <tr key={t.id}>
                      <td className="nowrap">{formatDateTime(t.date) || "—"}</td>
                      <td className="rp-desc">{t.description || "—"}</td>
                      <td>{t.category || "Uncategorized"}</td>
                      <td>{t.account || "Unassigned"}</td>
                      <td><span className={"rp-type "+t.type}>{t.type}</span></td>
                      <td className="num debit">{t.debit ? money(t.debit) : "—"}</td>
                      <td className="num credit">{t.credit ? money(t.credit) : "—"}</td>
                      <td className="num balance">{money(t.balance)}</td>
                      <td><span className={"rp-status "+(t.status||"confirmed")}>{t.status || "confirmed"}</span></td>
                    </tr>
                  ))}
                  {rows.length===0 && (
                    <tr>
                      <td colSpan="9" className="rp-empty">
                        {report.count===0 ? "No transactions yet." : "No transactions match your search."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="rp-table-foot">
              <span>Showing {rows.length} of {report.count} transactions</span>
              <span>Generated {formatDateTime(report.generated_at)}</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({label,value,accent,sub}){
  return (
    <div className="rp-card" style={{borderTopColor:accent}}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
