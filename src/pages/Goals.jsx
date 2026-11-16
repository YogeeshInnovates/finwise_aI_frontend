import { useEffect, useState } from "react";
import { api, apiUpload } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";

const TYPES = [
  { value: "trip", label: "Trip" },
  { value: "purchase", label: "Purchase" },
  { value: "event", label: "Event" },
  { value: "education", label: "Education" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
];

const emptyDetails = () => ({
  goal_type: "trip",
  name: "",
  current_location: "",
  destination: "",
  days: "",
  travelers: "1",
  start_date: "",
  target_date: "",
  budget: "",
  transport: "",
  preferences: "",
  notes: "",
  priority: "medium",
  document_id: null,
});

function errText(err){
  let message = err?.message || "Something went wrong";
  try{ message = JSON.parse(message).detail || message; }catch{}
  return message;
}

function dateInput(value){
  if(!value) return "";
  return String(value).slice(0,10);
}

function toNumber(value){
  if(value==="" || value===null || value===undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildPayload(details, goalId){
  const isTrip = details.goal_type === "trip";
  return {
    goal_id: goalId || null,
    name: details.name?.trim() || null,
    goal_type: details.goal_type || "other",
    current_location: details.current_location?.trim() || null,
    destination: isTrip ? (details.destination?.trim() || null) : null,
    days: isTrip ? toNumber(details.days) : null,
    travelers: isTrip ? toNumber(details.travelers) : null,
    start_date: isTrip ? (details.start_date || null) : null,
    target_date: details.target_date || null,
    budget: toNumber(details.budget),
    transport: isTrip ? (details.transport?.trim() || null) : null,
    preferences: isTrip ? (details.preferences?.trim() || null) : null,
    notes: details.notes?.trim() || null,
    priority: details.priority || "medium",
    document_id: details.document_id || null,
    use_rag: true,
  };
}

function typeLabel(value){
  return TYPES.find(type=>type.value===value)?.label || "Plan";
}

function verdictLabel(value){
  if(value==="affordable") return "Affordable";
  if(value==="tight") return "Tight but possible";
  if(value==="not_affordable") return "Needs more savings";
  return "Plan estimate";
}

function goalSubtitle(goal){
  const details = goal.details || {};
  const parts = [];
  if((goal.goal_type || details.goal_type) === "trip"){
    if(details.current_location && details.destination) parts.push(`${details.current_location} → ${details.destination}`);
    else if(details.destination) parts.push(details.destination);
    else if(details.current_location) parts.push(`From ${details.current_location}`);
    if(details.days) parts.push(`${details.days} day${Number(details.days)===1?"":"s"}`);
    if(details.travelers && Number(details.travelers)>1) parts.push(`${details.travelers} travelers`);
  } else if(details.notes){
    parts.push(String(details.notes).slice(0, 90));
  }
  if(goal.target_date) parts.push(`Target ${formatDate(goal.target_date)}`);
  return parts.join(" · ") || "Plan details";
}

export default function Goals(){
  const [goals,setGoals]=useState([]);
  const [context,setContext]=useState(null);
  const [details,setDetails]=useState(emptyDetails);
  const [editingId,setEditingId]=useState(null);
  const [formOpen,setFormOpen]=useState(false);
  const [active,setActive]=useState(null);
  const [uploadInfo,setUploadInfo]=useState(null);
  const [loading,setLoading]=useState(true);
  const [generating,setGenerating]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState("");
  const [savedMsg,setSavedMsg]=useState("");

  async function load(){
    setLoading(true);
    try{
      const [goalList, dashboard] = await Promise.all([
        api("/goals"),
        api("/dashboard").catch(()=>null),
      ]);
      setGoals(Array.isArray(goalList) ? goalList : []);
      if(dashboard) setContext({ balance: dashboard.balance, ...(dashboard.flexible || {}) });
    }catch(err){
      setError(errText(err));
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); },[]);

  const activeGoals = goals.filter(goal=>goal.status==="active");
  const totalTarget = activeGoals.reduce((sum,goal)=>sum+Number(goal.target_amount||0),0);
  const totalSaved = activeGoals.reduce((sum,goal)=>sum+Number(goal.current_amount||0),0);
  const monthlyNeeded = activeGoals.reduce((sum,goal)=>sum+Number(goal.plan?.affordability?.monthly_saving_needed||0),0);
  const sortedGoals = [...goals].sort((a,b)=> (a.status==="active"?0:1) - (b.status==="active"?0:1));

  async function resetForm(){
    await discardPendingUpload();
    setDetails(emptyDetails());
    setEditingId(null);
    setFormOpen(false);
    setError("");
  }

  async function openNew(){
    await discardPendingUpload();
    setDetails(emptyDetails());
    setEditingId(null);
    setActive(null);
    setFormOpen(true);
    setError("");
    setSavedMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function discardPendingUpload(){
    if(uploadInfo?.pending && uploadInfo.document_id){
      try{
        await api(`/goals/plan-document/${uploadInfo.document_id}`,{method:"DELETE"});
      }catch{}
    }
    setUploadInfo(null);
  }

  function editGoal(goal){
    const planDetails = goal.details || {};
    setDetails({
      ...emptyDetails(),
      ...planDetails,
      goal_type: planDetails.goal_type || goal.goal_type || "trip",
      name: planDetails.name || goal.name || "",
      days: planDetails.days ?? "",
      travelers: planDetails.travelers ?? "1",
      start_date: dateInput(planDetails.start_date),
      target_date: dateInput(planDetails.target_date || goal.target_date),
      budget: planDetails.budget ?? (goal.target_amount || ""),
      priority: planDetails.priority || goal.priority || "medium",
      document_id: goal.document_id || planDetails.document_id || null,
    });
    setEditingId(goal.id);
    setUploadInfo(goal.document_name ? {
      filename: goal.document_name,
      status: goal.document_id ? "indexed" : "text_extracted",
      rag_enabled: Boolean(goal.document_id),
      document_id: goal.document_id || null,
      pending: false,
    } : null);
    setFormOpen(true);
    setActive(null);
    setError("");
    setSavedMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectGoal(goal){
    setActive({
      goal,
      plan: goal.plan || {},
      details: goal.details || {},
      financial: goal.financial || context || {},
      rag_sources: goal.rag_sources || [],
      document_name: goal.document_name,
    });
    setFormOpen(false);
    setError("");
    setSavedMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadPlan(event){
    const file = event.target.files?.[0];
    event.target.value = "";
    if(!file) return;
    if(uploadInfo?.pending && uploadInfo.document_id){
      try{
        await api(`/goals/plan-document/${uploadInfo.document_id}`,{method:"DELETE"});
      }catch{}
    }
    setUploading(true);
    setError("");
    setUploadInfo(null);
    setSavedMsg("");
    try{
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiUpload("/goals/plan-document", formData);
      setUploadInfo({ ...data, pending: true });
      const extracted = data.extracted || {};
      setDetails(previous=>({
        ...previous,
        goal_type: extracted.goal_type || previous.goal_type,
        name: extracted.name || previous.name || file.name.replace(/\.[^.]+$/, ""),
        current_location: extracted.current_location || previous.current_location,
        destination: extracted.destination || previous.destination,
        days: extracted.days ?? previous.days,
        travelers: extracted.travelers ?? previous.travelers,
        start_date: dateInput(extracted.start_date) || previous.start_date,
        target_date: dateInput(extracted.target_date) || previous.target_date,
        budget: extracted.budget ?? previous.budget,
        transport: extracted.transport || previous.transport,
        preferences: extracted.preferences || previous.preferences,
        notes: extracted.notes || previous.notes,
        document_id: data.document_id,
      }));
    }catch(err){
      setError(errText(err));
    }finally{
      setUploading(false);
    }
  }

  async function removeUploadedDocument(){
    if(!uploadInfo) return;
    if(!window.confirm("Remove this uploaded file? AI will stop using it for this plan.")) return;
    if(!uploadInfo.document_id){
      setUploadInfo(null);
      setDetails(previous=>({ ...previous, document_id:null }));
      return;
    }
    try{
      await api(`/goals/plan-document/${uploadInfo.document_id}`,{method:"DELETE"});
      setUploadInfo(null);
      setDetails(previous=>({ ...previous, document_id:null }));
      setError("");
      setSavedMsg("Uploaded plan removed. AI will no longer use it.");
    }catch(err){
      setError(errText(err));
    }
  }

  async function generate(event){
    event.preventDefault();
    const isTrip = details.goal_type === "trip";
    if(!details.name.trim() && !details.destination.trim() && !details.notes.trim() && !details.current_location.trim()){
      setError("Add a name, location, destination, or a short description of your plan.");
      return;
    }
    if(isTrip && !details.destination.trim() && !details.current_location.trim()){
      setError("Add your current location so AI can suggest where you can go.");
      return;
    }
    if(isTrip && !details.days){
      setError("Add how many days you want to travel so AI can estimate the trip.");
      return;
    }
    setGenerating(true);
    setError("");
    setSavedMsg("");
    try{
      const result = await api("/goals/plan",{
        method:"POST",
        body:JSON.stringify(buildPayload(details, editingId)),
      });
      setActive(result);
      setFormOpen(false);
      setEditingId(null);
      setDetails(emptyDetails());
      setUploadInfo(null);
      setSavedMsg("Plan saved and added to your goals.");
      await load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }catch(err){
      setError(errText(err));
    }finally{
      setGenerating(false);
    }
  }

  async function addMoney(goalId, amount){
    const value = toNumber(amount);
    if(!value || value<=0){
      setError("Enter a valid amount to add.");
      return false;
    }
    try{
      await api(`/goals/${goalId}/contribute`,{
        method:"POST",
        body:JSON.stringify({ amount:value, direction:"in" }),
      });
      const fresh = await api("/goals");
      setGoals(fresh);
      const updated = fresh.find(goal=>goal.id===goalId);
      if(updated) setActive(current=> current && current.goal?.id===goalId ? { ...current, goal:updated } : current);
      setError("");
      setSavedMsg("Savings added to the plan.");
      return true;
    }catch(err){
      setError(errText(err));
      return false;
    }
  }

  async function toggleStatus(goal){
    const next = goal.status==="active" ? "completed" : "active";
    try{
      await api(`/goals/${goal.id}/status?status=${next}`,{method:"PATCH"});
      const fresh = await api("/goals");
      setGoals(fresh);
      if(active?.goal?.id===goal.id) setActive(current=> current ? { ...current, goal:{ ...current.goal, status:next } } : current);
    }catch(err){
      setError(errText(err));
    }
  }

  async function removeGoal(goalId){
    if(!window.confirm("Delete this plan? AI will stop using its notes and uploaded file. This cannot be undone.")) return;
    try{
      await api(`/goals/${goalId}`,{method:"DELETE"});
      if(active?.goal?.id===goalId) setActive(null);
      await load();
      setSavedMsg("Plan deleted. AI will no longer use its notes.");
    }catch(err){
      setError(errText(err));
    }
  }

  function useSuggestion(item){
    setDetails(previous=>({
      ...emptyDetails(),
      ...previous,
      goal_type:"trip",
      name: item.name ? `Trip to ${item.name}` : (previous.name || ""),
      destination:item.name || "",
      days:item.days ?? previous.days,
      budget:item.est_cost ?? previous.budget,
      transport:item.transport || previous.transport,
      current_location:previous.current_location,
      document_id:null,
    }));
    setUploadInfo(null);
    setEditingId(null);
    setActive(null);
    setFormOpen(true);
    setError("");
    setSavedMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="goal-page">
      <header className="goal-head">
        <div>
          <h2>Plans &amp; Goals</h2>
          <p>Plan trips and purchases as a reference. AI suggests costs and places — this never changes your balance, savings, or expenses.</p>
        </div>
        <button className="goal-add-btn" onClick={formOpen ? resetForm : openNew}>
          {formOpen ? "Close form" : "+ New plan"}
        </button>
      </header>

      {context && (
        <div className="goal-context">
          <span>Available flexible funds <b>{formatMoney(context.flexible_remaining)}</b></span>
          <span>Balance <b>{formatMoney(context.balance)}</b></span>
          <span>Monthly savings <b>{formatMoney(context.monthly_savings)}</b></span>
        </div>
      )}

      <section className="goal-stats">
        <div className="goal-stat"><span>Active plans</span><strong>{activeGoals.length}</strong></div>
        <div className="goal-stat"><span>Total target</span><strong>{formatMoney(totalTarget)}</strong></div>
        <div className="goal-stat"><span>Saved so far</span><strong>{formatMoney(totalSaved)}</strong></div>
        <div className="goal-stat"><span>Monthly saving needed</span><strong>{formatMoney(monthlyNeeded)}</strong></div>
      </section>

      {savedMsg && <div className="goal-success">{savedMsg}</div>}

      {formOpen && (
        <form className="goal-form" onSubmit={generate}>
          <div className="goal-form-head">
            <div>
              <h3>{editingId ? "Update your plan" : "Create a new plan"}</h3>
              <p>Add what you know. AI will fill the gaps and estimate the cost.</p>
            </div>
            <div className="goal-type-pills">
              {TYPES.map(type=>(
                <button
                  type="button"
                  key={type.value}
                  className={"goal-type-pill "+(details.goal_type===type.value?"active":"")}
                  onClick={()=>setDetails({...details,goal_type:type.value})}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="goal-form-grid">
            <label>
              Plan name
              <input value={details.name} onChange={e=>setDetails({...details,name:e.target.value})} placeholder="Goa trip with friends" />
            </label>
            <label>
              Current location
              <input value={details.current_location} onChange={e=>setDetails({...details,current_location:e.target.value})} placeholder="Bengaluru" />
            </label>
            {details.goal_type==="trip" && (
              <>
                <label>
                  Destination
                  <input value={details.destination} onChange={e=>setDetails({...details,destination:e.target.value})} placeholder="Goa" />
                </label>
                <label>
                  Days
                  <input type="number" min="1" value={details.days} onChange={e=>setDetails({...details,days:e.target.value})} placeholder="3" />
                </label>
                <label>
                  Travelers
                  <input type="number" min="1" value={details.travelers} onChange={e=>setDetails({...details,travelers:e.target.value})} placeholder="2" />
                </label>
                <label>
                  Transport
                  <input list="goal-transport-options" value={details.transport} onChange={e=>setDetails({...details,transport:e.target.value})} placeholder="Flight, train, car, bike..." />
                  <datalist id="goal-transport-options">
                    <option value="Flight" />
                    <option value="Train" />
                    <option value="Bus" />
                    <option value="Car" />
                    <option value="Bike" />
                  </datalist>
                </label>
              </>
            )}
            {details.goal_type!=="trip" && (
              <>
                <label>
                  Estimated cost (optional)
                  <input type="number" min="0" step="0.01" value={details.budget} onChange={e=>setDetails({...details,budget:e.target.value})} placeholder="Leave blank for AI estimate" />
                </label>
                <label>
                  Priority
                  <select value={details.priority} onChange={e=>setDetails({...details,priority:e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </>
            )}
            {details.goal_type==="trip" && (
              <>
                <label>
                  Start date
                  <input type="date" value={details.start_date} onChange={e=>setDetails({...details,start_date:e.target.value})} />
                </label>
                <label>
                  Trip date
                  <input type="date" value={details.target_date} onChange={e=>setDetails({...details,target_date:e.target.value})} />
                </label>
                <label>
                  Budget cap (optional)
                  <input type="number" min="0" step="0.01" value={details.budget} onChange={e=>setDetails({...details,budget:e.target.value})} placeholder="AI will estimate if blank" />
                </label>
                <label>
                  Priority
                  <select value={details.priority} onChange={e=>setDetails({...details,priority:e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </>
            )}
            {details.goal_type!=="trip" && (
              <label>
                Target date
                <input type="date" value={details.target_date} onChange={e=>setDetails({...details,target_date:e.target.value})} />
              </label>
            )}
          </div>

          {details.goal_type==="trip" && (
            <label className="goal-wide">
              Preferences
              <textarea value={details.preferences} onChange={e=>setDetails({...details,preferences:e.target.value})} placeholder="Budget stay, beaches, local food, no long treks..." rows={2} />
            </label>
          )}
          <label className="goal-wide">
            Plan details / notes
            <textarea value={details.notes} onChange={e=>setDetails({...details,notes:e.target.value})} placeholder="What does this plan include? Any must-do activities, constraints, or people involved?" rows={3} />
          </label>

          <div className="goal-upload">
            <div>
              <strong>Upload your plan report</strong>
              <p>PDF, TXT, MD, CSV, or JSON. We will read it, index it for AI, and prefill the form.</p>
            </div>
            <label className={"goal-upload-btn"+(uploading?" disabled":"")}>
              {uploading ? "Reading document..." : "Choose file"}
              <input type="file" accept=".pdf,.txt,.md,.markdown,.csv,.json" onChange={uploadPlan} disabled={uploading} />
            </label>
          </div>

          {uploadInfo && (
            <div className={"goal-upload-status "+(uploadInfo.rag_enabled?"ok":"warn")}>
              <strong>{uploadInfo.filename}</strong>
              <span>
                {uploadInfo.status==="indexed" ? "Indexed for AI" :
                  uploadInfo.status==="text_extracted" ? "Text extracted" :
                  uploadInfo.status==="empty" ? "No readable text found" : uploadInfo.status}
              </span>
              {uploadInfo.characters ? <span>{uploadInfo.characters.toLocaleString()} characters · {uploadInfo.chunks} chunks</span> : null}
              <span>AI filled the form from this file. Review the details before generating.</span>
              <button type="button" className="goal-upload-remove" onClick={removeUploadedDocument}>Remove file</button>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <p className="goal-form-note">Planning only — this does not change your balance, savings, or expenses.</p>

          <div className="goal-form-actions">
            <button className="goal-generate" type="submit" disabled={generating || uploading}>
              {generating ? "AI is building your plan..." : "Generate AI plan"}
            </button>
            <button type="button" className="goal-cancel" onClick={resetForm}>Cancel</button>
          </div>
          {generating && (
            <p className="goal-generating">Matching your plan with your balance, savings, and uploaded notes. This can take a few seconds.</p>
          )}
        </form>
      )}

      {!formOpen && error && <div className="auth-error">{error}</div>}

      {active && (
        <PlanView
          data={active}
          onEdit={editGoal}
          onDelete={removeGoal}
          onContribute={addMoney}
          onToggleStatus={toggleStatus}
          onPickDestination={useSuggestion}
        />
      )}

      <section className="goal-list">
        <div className="goal-list-head">
          <h3>Your plans</h3>
          <span>{goals.length} total</span>
        </div>
        {loading && <div className="goal-empty">Loading plans...</div>}
        {!loading && goals.length===0 && (
          <div className="goal-empty">
            No plans yet. Create one and AI will build a spending plan around your balance.
          </div>
        )}
        <div className="goal-cards">
          {sortedGoals.map(goal=>{
            const progress = Number(goal.target_amount)>0
              ? Math.min(100, (Number(goal.current_amount||0)/Number(goal.target_amount))*100)
              : 0;
            const verdict = goal.plan?.affordability?.verdict;
            return (
              <article key={goal.id} className={"goal-card"+(active?.goal?.id===goal.id?" active":"")}>
                <div className="goal-card-top">
                  <span className={"goal-type-chip "+(goal.goal_type||"other")}>{typeLabel(goal.goal_type)}</span>
                  <span className={"goal-status "+(goal.status||"active")}>{goal.status||"active"}</span>
                </div>
                <h4>{goal.name}</h4>
                <p className="goal-card-sub">{goalSubtitle(goal)}</p>
                <div className="goal-progress"><span style={{width:`${progress}%`}} /></div>
                <div className="goal-card-bottom">
                  <span>{formatMoney(goal.current_amount)} / {formatMoney(goal.target_amount)}</span>
                  {verdict ? <span className={"goal-mini-verdict "+verdict}>{verdictLabel(verdict)}</span> : <span className="muted">No AI plan</span>}
                </div>
                <div className="goal-card-actions">
                  <button onClick={()=>selectGoal(goal)}>View plan</button>
                  <button onClick={()=>editGoal(goal)}>Update</button>
                  <button onClick={()=>toggleStatus(goal)}>{goal.status==="active"?"Complete":"Reopen"}</button>
                  <button className="danger" onClick={()=>removeGoal(goal.id)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PlanView({ data, onEdit, onDelete, onContribute, onToggleStatus, onPickDestination }){
  const [contribution,setContribution]=useState("");
  const goal = data.goal || {};
  const plan = data.plan || goal.plan || {};
  const details = data.details || goal.details || {};
  const financial = data.financial || goal.financial || {};
  const ragSources = data.rag_sources || goal.rag_sources || [];
  const affordability = plan.affordability || {};
  const estimated = Number(plan.estimated_total || goal.target_amount || 0);
  const available = Number(affordability.available_funds ?? financial.flexible_remaining ?? 0);
  const recommended = Number(affordability.recommended_spend ?? available * 0.8);
  const surplus = Number(affordability.surplus_or_shortfall ?? (available - estimated));
  const verdict = affordability.verdict || "";
  const progress = Number(goal.target_amount)>0
    ? Math.min(100, (Number(goal.current_amount||0)/Number(goal.target_amount))*100)
    : 0;
  const breakdown = plan.breakdown || [];
  const itinerary = plan.itinerary || [];
  const suggestions = plan.suggested_destinations || [];
  const advice = affordability.advice || [];
  const tips = plan.tips || [];
  const assumptions = plan.assumptions || [];
  const documentName = data.document_name || goal.document_name;
  const hasPlan = Boolean(plan.summary || plan.estimated_total || breakdown.length || itinerary.length || suggestions.length);

  return (
    <article className="goal-plan">
      <div className="goal-plan-top">
        <div>
          <span className={"goal-verdict "+(verdict||"neutral")}>{verdictLabel(verdict)}</span>
          <h2>{goal.name || details.name || "Your plan"}</h2>
          <p>{plan.summary || (hasPlan ? "Here is the plan generated from your details." : "No AI plan yet. Update this goal to generate one.")}</p>
          <div className="goal-plan-meta">
            {details.current_location && <span>From {details.current_location}</span>}
            {details.destination && <span>To {details.destination}</span>}
            {details.days && <span>{details.days} days</span>}
            {details.travelers && <span>{details.travelers} travelers</span>}
            {goal.target_date && <span>Target {formatDate(goal.target_date)}</span>}
            {documentName && <span>Source: {documentName}</span>}
          </div>
        </div>
        <div className="goal-plan-actions">
          <button onClick={()=>onEdit(goal)}>Update plan</button>
          <button onClick={()=>onToggleStatus(goal)}>{goal.status==="active"?"Mark complete":"Reopen"}</button>
          <button className="danger" onClick={()=>onDelete(goal.id)}>Delete</button>
        </div>
      </div>

      {!hasPlan && (
        <section className="goal-panel goal-plan-empty">
          <h3>No AI plan yet</h3>
          <p className="muted">Update this goal to generate a fresh plan, cost estimate, and destination suggestions.</p>
        </section>
      )}

      {hasPlan && (
        <div className="goal-plan-numbers">
          <div><span>Estimated cost</span><strong>{formatMoney(estimated)}</strong></div>
          <div><span>Comfortable spend</span><strong>{formatMoney(recommended)}</strong></div>
          <div><span>Available funds</span><strong>{formatMoney(available)}</strong></div>
          <div><span>{surplus>=0?"Surplus":"Shortfall"}</span><strong className={surplus>=0?"pos":"neg"}>{formatMoney(Math.abs(surplus))}</strong></div>
          <div><span>Monthly saving needed</span><strong>{formatMoney(affordability.monthly_saving_needed||0)}</strong></div>
        </div>
      )}

      {suggestions.length>0 && (
        <section className="goal-panel">
          <h3>Where you can go</h3>
          <p className="muted">
            AI-picked options{details.current_location ? ` from ${details.current_location}` : ""} within your comfortable spend.
          </p>
          <div className="goal-suggestions">
            {suggestions.map((item,index)=>(
              <article className="goal-suggestion" key={index}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.days} days · {formatMoney(item.est_cost)}</span>
                  {item.transport && <span>{item.transport}</span>}
                  {item.why && <p>{item.why}</p>}
                </div>
                <button type="button" onClick={()=>onPickDestination(item)}>Plan this</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {(breakdown.length>0 || advice.length>0) && (
        <div className="goal-plan-columns">
          {breakdown.length>0 && (
            <section className="goal-panel">
              <h3>Cost breakdown</h3>
              <ul className="goal-breakdown">
                {breakdown.map((item,index)=>(
                  <li key={index}>
                    <span>{item.label}{item.note && <small>{item.note}</small>}</span>
                    <b>{formatMoney(item.amount)}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {advice.length>0 && (
            <section className="goal-panel">
              <h3>Affordability</h3>
              <ul className="goal-advice">
                {advice.map((item,index)=><li key={index}>{item}</li>)}
              </ul>
              {Number(affordability.months_to_goal)>0 && (
                <p className="muted">About {affordability.months_to_goal} month(s) to close the gap at your current savings pace.</p>
              )}
            </section>
          )}
        </div>
      )}

      {itinerary.length>0 && (
        <section className="goal-panel">
          <h3>Day-by-day plan</h3>
          <div className="goal-itinerary">
            {itinerary.map((day,index)=>(
              <div className="goal-day" key={index}>
                <div className="goal-day-badge">Day {day.day||index+1}</div>
                <div className="goal-day-body">
                  <strong>{day.title}</strong>
                  <ul>{(day.activities||[]).map((activity,i)=><li key={i}>{activity}</li>)}</ul>
                  {Number(day.estimated_cost)>0 && <span className="muted">Estimated {formatMoney(day.estimated_cost)}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(tips.length>0 || assumptions.length>0) && (
        <div className="goal-plan-columns">
          {tips.length>0 && (
            <section className="goal-panel">
              <h3>Tips</h3>
              <ul className="goal-advice">{tips.map((tip,index)=><li key={index}>{tip}</li>)}</ul>
            </section>
          )}
          {assumptions.length>0 && (
            <section className="goal-panel">
              <h3>Assumptions</h3>
              <ul className="goal-advice">{assumptions.map((item,index)=><li key={index}>{item}</li>)}</ul>
            </section>
          )}
        </div>
      )}

      <section className="goal-panel goal-progress-panel">
        <div className="goal-progress-head">
          <div>
            <h3>Plan savings</h3>
            <p className="muted">{formatMoney(goal.current_amount)} saved of {formatMoney(goal.target_amount)}</p>
            <p className="muted">Tracker only — this never moves money or creates an expense.</p>
          </div>
          <strong>{Math.round(progress)}%</strong>
        </div>
        <div className="goal-progress"><span style={{width:`${progress}%`}} /></div>
        <form className="goal-contrib" onSubmit={async event=>{
          event.preventDefault();
          const ok = await onContribute(goal.id, contribution);
          if(ok) setContribution("");
        }}>
          <input type="number" min="1" step="0.01" placeholder="Amount to add" value={contribution} onChange={e=>setContribution(e.target.value)} />
          <button type="submit">Add to plan</button>
        </form>
      </section>

      {ragSources.length>0 && (
        <details className="goal-rag">
          <summary>Reference notes used by AI ({ragSources.length})</summary>
          <ul>{ragSources.map((source,index)=><li key={index}>{source.text}</li>)}</ul>
        </details>
      )}
    </article>
  );
}
