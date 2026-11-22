import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./lib/api";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import Goals from "./pages/Goals";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Documents from "./pages/Documents";
import Notifications from "./pages/Notifications";
import Commitments from "./pages/Commitments";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import "./auth.css";
import "./dashboard.css";
import "./shell.css";
import "./transactions.css";
import "./goals.css";
import "./reports.css";

export default function App(){
  const [authed, setAuthed] = useState(!!localStorage.getItem("access_token"));
  const [checking, setChecking] = useState(!!localStorage.getItem("access_token"));

  useEffect(()=>{
    if(!localStorage.getItem("access_token")) return;
    let alive = true;
    api("/auth/me")
      .then(()=>{ if(alive) setAuthed(true); })
      .catch(()=>{ if(alive) setAuthed(false); })
      .finally(()=>{ if(alive) setChecking(false); });
    return ()=>{ alive = false; };
  },[]);

  if(checking){
    return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"system-ui"}}>Checking session…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding/>} />
        <Route path="/" element={authed ? <AppShell/> : <Navigate to="/login"/>}>
          <Route index element={<Dashboard/>} />
          <Route path="transactions" element={<Transactions/>} />
          <Route path="accounts" element={<Accounts/>} />
          <Route path="goals" element={<Goals/>} />
          <Route path="reports" element={<Reports/>} />
          <Route path="commitments" element={<Commitments/>} />
          <Route path="notifications" element={<Notifications/>} />
          <Route path="documents" element={<Documents/>} />
          <Route path="savings" element={<Navigate to="/settings" replace/>} />
          <Route path="settings" element={<Settings/>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
