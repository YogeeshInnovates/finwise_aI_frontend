import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";

export default function AppShell(){
  const navigate = useNavigate();
  const [chat,setChat]=useState([{role:"assistant",text:"Hi! Ask me about your finances."}]);
  const [msg,setMsg]=useState("");
  const [sending,setSending]=useState(false);
  const [chatWidth,setChatWidth]=useState(360);
  const resizing=useRef(false);

  useEffect(()=>{
    function onMove(e){
      if(!resizing.current) return;
      const w = window.innerWidth - e.clientX;
      setChatWidth(Math.min(720, Math.max(280, w)));
    }
    function onUp(){ resizing.current=false; document.body.style.cursor=""; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return ()=>{ window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  },[]);

  async function send(e){
    e.preventDefault();
    if(!msg.trim()) return;
    const m=msg; setMsg("");
    setChat(c=>[...c,{role:"user",text:m}]);
    setSending(true);
    try{
      const r = await api("/ai/chat",{method:"POST",body:JSON.stringify({message:m})});
      let reply = r.reply || "";
      if(reply.includes("[ACTION:ONBOARD]")){ navigate("/onboarding"); reply = reply.replace("[ACTION:ONBOARD]","").trim(); }
      if(reply.includes("[ACTION:SETTINGS]")){ navigate("/settings"); reply = reply.replace("[ACTION:SETTINGS]","").trim(); }
      if(reply.includes("[ACTION:REFRESH]")){ window.dispatchEvent(new Event("finwise:refresh")); reply = reply.replace("[ACTION:REFRESH]","").trim(); }
      setChat(c=>[...c,{role:"assistant",text:reply}]);
      window.dispatchEvent(new Event("finwise:refresh"));
    }catch(err){
      let m2=err.message;
      try{ m2=JSON.parse(m2).detail || m2; }catch{}
      if(String(m2).includes("invalid token") || String(m2).includes("401")){ localStorage.removeItem("access_token"); window.location.href="/login"; return; }
      setChat(c=>[...c,{role:"assistant",text:"Sorry, I couldn't process that. "+m2}]);
    }finally{setSending(false);}
  }

  return (
    <div className="shell" style={{gridTemplateColumns:`260px 1fr ${chatWidth}px`}}>
      <aside className="shell-side">
        <div className="shell-logo">FinWise AI</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/accounts">Accounts</NavLink>
          <NavLink to="/goals">Goals</NavLink>
          <NavLink to="/commitments">Commitments</NavLink>
          <NavLink to="/documents">Documents</NavLink>
          <NavLink to="/notifications">Notifications</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <button className="shell-logout" onClick={()=>{localStorage.removeItem("access_token");navigate("/login");}}>Logout</button>
      </aside>
      <main className="shell-main"><Outlet/></main>
      <aside className="shell-chat" style={{width:chatWidth,position:"relative"}}>
        <div className="chat-resize" onMouseDown={()=>{resizing.current=true;document.body.style.cursor="col-resize";}} />
        <div className="chat-title">AI Assistant</div>
        <div className="chat-body">
          {chat.map((c,i)=><div key={i} className={"chat-msg "+c.role} style={{whiteSpace:"pre-wrap"}}>{c.text}</div>)}
        </div>
        <form className="chat-form" onSubmit={send}>
          <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Ask about your money…" disabled={sending}/>
          <button type="submit" disabled={sending}>Send</button>
        </form>
      </aside>
    </div>
  );
}
