const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const AUTH_PATHS = ["/auth/login", "/auth/register"];
let token = localStorage.getItem("access_token");

export function clearAuth(){
  token = null;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function setToken(t, refresh){
  token = t;
  if(t){
    localStorage.setItem("access_token", t);
    if(refresh) localStorage.setItem("refresh_token", refresh);
  }else{
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
}

function handleAuthFailure(path, status){
  if(status !== 401 || AUTH_PATHS.some(p => path.startsWith(p))) return;
  clearAuth();
  if(window.location.pathname !== "/login") window.location.href = "/login";
}

async function errorFrom(res){
  const text = await res.text();
  let message = text;
  try{
    const body = JSON.parse(text);
    message = body.detail || text;
  }catch{}
  const err = new Error(message || `Request failed (${res.status})`);
  err.status = res.status;
  return err;
}

export async function api(path, opts={}){
  const res = await fetch(BASE+path, {
    ...opts,
    headers: { "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}), ...(opts.headers||{}) },
  });
  if(!res.ok){
    const err = await errorFrom(res);
    handleAuthFailure(path, res.status);
    throw err;
  }
  if(res.status===204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
function downloadName(res, fallbackName){
  const disposition = res.headers.get("Content-Disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if(encoded) return decodeURIComponent(encoded[1].trim());
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : fallbackName;
}

export async function apiDownload(path, fallbackName){
  const res = await fetch(BASE+path, {
    headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) },
  });
  if(!res.ok){
    const err = await errorFrom(res);
    handleAuthFailure(path, res.status);
    throw err;
  }
  const blob = await res.blob();
  const filename = downloadName(res, fallbackName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
  return filename;
}
export async function apiUpload(path, formData){
  const res = await fetch(BASE+path, {
    method: "POST",
    headers: { ...(token?{Authorization:`Bearer ${token}`}:{}) },
    body: formData,
  });
  if(!res.ok){
    const err = await errorFrom(res);
    handleAuthFailure(path, res.status);
    throw err;
  }
  return res.json();
}
export const auth = {
  register: (d)=>api("/auth/register",{method:"POST",body:JSON.stringify(d)}),
  login: (d)=>api("/auth/login",{method:"POST",body:JSON.stringify(d)}),
};
