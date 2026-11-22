import { useState } from "react";
import { auth, setToken } from "../lib/api";

export default function Login(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [mode,setMode]=useState("login");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(e){
    e.preventDefault();
    setErr("");
    if(!email || !password){ setErr("Email and password are required."); return; }
    if(password.length < 6){ setErr("Password must be at least 6 characters."); return; }
    setLoading(true);
    try{
      const r = mode==="login"
        ? await auth.login({email,password})
        : await auth.register({email,password,full_name:name||null});
      setToken(r.access_token, r.refresh_token);
      window.location.href = "/";
    }catch(e){
      let msg = e.message;
      try { msg = JSON.parse(msg).detail || msg; } catch {}
      setErr(msg || "Authentication failed.");
    }finally{ setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">FinWise AI</div>
        <h1>{mode==="login" ? "Welcome back" : "Create account"}</h1>
        <p className="auth-sub">{mode==="login" ? "Sign in to continue" : "Start tracking your finances"}</p>
        <form onSubmit={submit}>
          {mode==="register" && (
            <input className="auth-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name (optional)" />
          )}
          <input className="auth-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required />
          <input className="auth-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required />
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Please wait..." : (mode==="login" ? "Sign in" : "Create account")}
          </button>
        </form>
        {err && <div className="auth-error">{err}</div>}
        <div className="auth-switch">
          {mode==="login" ? "No account?" : "Already have an account?"}
          <button type="button" onClick={()=>{setMode(mode==="login"?"register":"login");setErr("");}}>
            {mode==="login" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
