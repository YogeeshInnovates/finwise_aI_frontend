const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
let token = localStorage.getItem("access_token");
export function setToken(t){ token=t; if(t) localStorage.setItem("access_token",t); else localStorage.removeItem("access_token"); }
export async function api(path, opts={}){
  const res = await fetch(BASE+path, {
    ...opts,
    headers: { "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}), ...(opts.headers||{}) },
  });
  if(!res.ok) throw new Error(await res.text());
  if(res.status===204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
export async function apiUpload(path, formData){
  const res = await fetch(BASE+path, {
    method: "POST",
    headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) },
    body: formData,
  });
  if(!res.ok){
    let message = await res.text();
    try{ message = JSON.parse(message).detail || message; }catch{}
    throw new Error(message);
  }
  return res.json();
}
export const auth = {
  register: (d)=>api("/auth/register",{method:"POST",body:JSON.stringify(d)}),
  login: (d)=>api("/auth/login",{method:"POST",body:JSON.stringify(d)}),
};
