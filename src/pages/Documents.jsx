import { useEffect, useState } from "react";
import { api } from "../lib/api";
export default function Documents(){
  const [docs,setDocs]=useState([]);
  const [file,setFile]=useState(null);
  useEffect(()=>{ api("/documents").then(setDocs).catch(()=>setDocs([])); },[]);
  async function upload(e){
    e.preventDefault();
    if(!file) return;
    const fd=new FormData(); fd.append("file",file);
    const token=localStorage.getItem("access_token");
    await fetch("http://localhost:8000/api/v1/documents/upload",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});
    setFile(null);
    api("/documents").then(setDocs);
  }
  return (
    <div className="page">
      <h2>Documents</h2>
      <form className="txn-form" onSubmit={upload}>
        <input type="file" onChange={e=>setFile(e.target.files[0])}/>
        <button type="submit">Upload</button>
      </form>
      <ul className="txn-list big">{docs.map(d=><li key={d.id}><span>{d.filename}</span><span>{d.extraction_status}</span></li>)}</ul>
    </div>
  );
}
