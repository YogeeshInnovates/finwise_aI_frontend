import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { api, clearAuth } from "../lib/api";
import TravelPanel from "./TravelPanel";

const TRIP_SUGGEST_PATTERNS = [
  /\bsug(?:gest|get|est)(?:s|ed|ing|ion|ions)?\b/i,
  /\btri\s+(?:plane|plne|plann?|plan)\b/i,
  /\btrip\s+(?:plane|plne|plann?|plan|suggestions?)\b/i,
  /\bwhere\s+(?:can|should|do)\s+i\s+go\b/i,
  /\bwhere\s+i\s+can\s+go\b/i,
  /\bplan\s+me\s+a\s+trip\b/i,
  /\btravel\s+(?:plan|suggestions?)\b/i,
  /\b\d+\s*(?:days?|nights?)\b/i,
];

function wantsTripSuggestion(text){
  const value = String(text || "");
  return TRIP_SUGGEST_PATTERNS.some(pattern=>pattern.test(value));
}

function getDeviceLocation(){
  return new Promise(resolve=>{
    if(!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      position=>resolve({
        lat:position.coords.latitude,
        lon:position.coords.longitude,
      }),
      ()=>resolve(null),
      {timeout:8000,maximumAge:60000,enableHighAccuracy:false},
    );
  });
}

const MIN_CHAT_WIDTH = 300;
const MAX_CHAT_WIDTH = 760;
const DEFAULT_CHAT_WIDTH = 360;
const CHAT_WIDTH_KEY = "finwise_chat_width";

function clampChatWidth(width){
  const max = Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, window.innerWidth - 680));
  return Math.min(max, Math.max(MIN_CHAT_WIDTH, Math.round(Number(width) || DEFAULT_CHAT_WIDTH)));
}

export default function AppShell(){
  const navigate = useNavigate();
  const [chat,setChat]=useState([{role:"assistant",text:"Hi! Ask me about your finances."}]);
  const [msg,setMsg]=useState("");
  const [sending,setSending]=useState(false);
  const [chatWidth,setChatWidth]=useState(()=>clampChatWidth(localStorage.getItem(CHAT_WIDTH_KEY)));
  const [dragging,setDragging]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [user,setUser]=useState(null);
  const [travelSuggestion,setTravelSuggestion]=useState(null);
  const resizing=useRef(false);
  const widthRef=useRef(chatWidth);
  const profileRef=useRef(null);
  const chatBodyRef=useRef(null);

  useEffect(()=>{
    api("/auth/me").then(setUser).catch(()=>{});
  },[]);

  useEffect(()=>{
    const el = chatBodyRef.current;
    if(el) el.scrollTop = el.scrollHeight;
  },[chat]);

  useEffect(()=>{
    if(!profileOpen) return;
    function onDown(e){
      if(profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    function onKey(e){
      if(e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return ()=>{
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  },[profileOpen]);

  useEffect(()=>{
    function onMove(e){
      if(!resizing.current) return;
      const next = clampChatWidth(window.innerWidth - e.clientX);
      widthRef.current = next;
      setChatWidth(next);
    }
    function stopDrag(){
      if(!resizing.current) return;
      resizing.current = false;
      setDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem(CHAT_WIDTH_KEY, String(widthRef.current));
    }
    function onResize(){
      const next = clampChatWidth(widthRef.current);
      widthRef.current = next;
      setChatWidth(next);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    window.addEventListener("resize", onResize);
    return ()=>{
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
      window.removeEventListener("resize", onResize);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  },[]);

  function saveChatWidth(width){
    const next = clampChatWidth(width);
    widthRef.current = next;
    setChatWidth(next);
    localStorage.setItem(CHAT_WIDTH_KEY, String(next));
  }

  function startResize(e){
    e.currentTarget.focus();
    e.preventDefault();
    resizing.current = true;
    setDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function resizeWithKeyboard(e){
    if(e.key === "ArrowLeft"){
      e.preventDefault();
      saveChatWidth(chatWidth + 24);
    }
    if(e.key === "ArrowRight"){
      e.preventDefault();
      saveChatWidth(chatWidth - 24);
    }
    if(e.key === "Home"){
      e.preventDefault();
      saveChatWidth(DEFAULT_CHAT_WIDTH);
    }
  }

  function logout(){
    setTravelSuggestion(null);
    clearAuth();
    navigate("/login");
  }

  async function send(e){
    e.preventDefault();
    if(!msg.trim()) return;
    const m=msg; setMsg("");
    setChat(c=>[...c,{role:"user",text:m}]);
    setSending(true);
    try{
      const location = wantsTripSuggestion(m) ? await getDeviceLocation() : null;
      const r = await api("/ai/chat",{method:"POST",body:JSON.stringify({message:m,location})});
      let reply = r.reply || "";
      if(r.travel_suggestion){
        setTravelSuggestion(r.travel_suggestion);
        reply = reply || "Opened trip suggestions in the center panel.";
      }
      if(reply.includes("[ACTION:ONBOARD]")){ navigate("/onboarding"); reply = reply.replace("[ACTION:ONBOARD]","").trim(); }
      if(reply.includes("[ACTION:SETTINGS]")){ navigate("/settings"); reply = reply.replace("[ACTION:SETTINGS]","").trim(); }
      if(reply.includes("[ACTION:REFRESH]")){ window.dispatchEvent(new Event("finwise:refresh")); reply = reply.replace("[ACTION:REFRESH]","").trim(); }
      setChat(c=>[...c,{role:"assistant",text:reply}]);
      window.dispatchEvent(new Event("finwise:refresh"));
    }catch(err){
      let m2=err.message;
      try{ m2=JSON.parse(m2).detail || m2; }catch{}
      if(String(m2).includes("invalid token") || String(m2).includes("401")){ clearAuth(); navigate("/login"); return; }
      setChat(c=>[...c,{role:"assistant",text:"Sorry, I couldn't process that. "+m2}]);
    }finally{setSending(false);}
  }

  const initials = (user?.full_name || user?.email || "U")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0,2)
    .map(part=>part[0].toUpperCase())
    .join("");

  return (
    <div className="shell" style={{"--chat-width":`${chatWidth}px`}}>
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
      </aside>

      <header className="shell-topbar">
        <div className="shell-profile" ref={profileRef}>
          <button
            type="button"
            className="profile-btn"
            onClick={()=>setProfileOpen(open=>!open)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label="Open profile menu"
          >
            <span className="profile-avatar">{initials || "U"}</span>
            <span className="profile-name">{user?.full_name || "Account"}</span>
            <svg className="profile-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {profileOpen && (
            <div className="profile-menu" role="menu">
              <div className="profile-menu-head">
                <span className="profile-avatar lg">{initials || "U"}</span>
                <div className="profile-menu-id">
                  <strong>{user?.full_name || "FinWise user"}</strong>
                  <span>{user?.email || "Signed in"}</span>
                </div>
              </div>
              <button type="button" role="menuitem" onClick={()=>{setProfileOpen(false);navigate("/settings");}}>
                Account settings
              </button>
              <button type="button" role="menuitem" className="danger" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="shell-center">
        <main className="shell-main"><Outlet/></main>
        {travelSuggestion && (
          <TravelPanel data={travelSuggestion} onClose={()=>setTravelSuggestion(null)} />
        )}
      </div>

      <aside className={"shell-chat"+(dragging?" dragging":"")}>
        <div
          className="chat-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize AI chat"
          aria-valuemin={MIN_CHAT_WIDTH}
          aria-valuemax={MAX_CHAT_WIDTH}
          aria-valuenow={chatWidth}
          tabIndex={0}
          title="Drag to resize chat. Double-click to reset."
          onPointerDown={startResize}
          onDoubleClick={()=>saveChatWidth(DEFAULT_CHAT_WIDTH)}
          onKeyDown={resizeWithKeyboard}
        />
        <div className="chat-title">AI Assistant</div>
        <div className="chat-body" ref={chatBodyRef}>
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
