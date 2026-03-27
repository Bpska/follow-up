'use client';

import { useState, useEffect, useCallback } from "react";

interface Status {
  label: string;
  color: string;
  bg: string;
}

const STATUSES: Record<string, Status> = {
  new: { label: "New Lead", color: "#60a5fa", bg: "#1e3a5f" },
  called: { label: "Called", color: "#f59e0b", bg: "#3d2a00" },
  followup: { label: "Follow-up Due", color: "#f97316", bg: "#3d1a00" },
  converted: { label: "Converted ✓", color: "#34d399", bg: "#063d2a" },
  dead: { label: "Not Interested", color: "#9ca3af", bg: "#1f2937" },
};

interface Lead {
  id: string;
  name: string;
  company?: string;
  phone: string;
  calledBy: string;
  status: string;
  followUpDate: string;
  notes?: string;
  lastCalled?: string;
  createdAt: string;
}

const STORAGE_KEY = "cold-call-leads";
const ADMIN_PASSWORD = "admin123";

const TEAM_MEMBERS = ["Ravi", "Priya", "Suresh", "Ankita", "You"];

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function todayStr() { return new Date().toISOString().split("T")[0]; }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }
function isOverdue(dateStr: string | undefined) { return dateStr && dateStr < todayStr(); }
function isDueToday(dateStr: string | undefined) { return dateStr === todayStr(); }

const AVATAR_COLORS = ["#f97316","#60a5fa","#34d399","#a78bfa","#f59e0b","#f87171","#38bdf8"];
function avatarColor(name: string) {
  if (!name) return "#374151";
  let h = 0; for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState("today");
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [weeklyThreshold, setWeeklyThreshold] = useState("");

  useEffect(() => {
    // Break the synchronous execution chain to avoid React 19's cascading render warning
    const timer = setTimeout(() => {
      const rawLeads = localStorage.getItem(STORAGE_KEY);
      let initialLeads: Lead[] = [];
      if (rawLeads) {
        try {
          initialLeads = JSON.parse(rawLeads);
        } catch (e) {
          console.error("Failed to parse leads from storage", e);
        }
      }
      const threshold = new Date(Date.now() - 7 * 864e5).toISOString().split("T")[0];
      
      setLeads(initialLeads);
      setWeeklyThreshold(threshold);
      setLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const save = useCallback((newLeads: Lead[]) => {
    setLeads(newLeads);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLeads));
  }, []);

  const showToast = (msg: string, color = "#f97316") => { setToast({ msg, color }); setTimeout(() => setToast(null), 2500); };

  const addOrUpdateLead = (lead: Lead) => {
    let updated: Lead[];
    if (lead.id) { updated = leads.map(l => l.id === lead.id ? lead : l); showToast("Lead updated!"); }
    else { updated = [{ ...lead, id: Date.now().toString(), createdAt: todayStr() }, ...leads]; showToast("Lead added!"); }
    save(updated); setShowForm(false); setEditLead(null);
  };

  const requestDelete = (id: string) => {
    if (isAdmin) { if (window.confirm("Delete this lead permanently?")) { save(leads.filter(l => l.id !== id)); showToast("Lead deleted.", "#ef4444"); } }
    else { setPendingDeleteId(id); setShowAdminLogin(true); }
  };

  const handleAdminAuth = (pwd: string, forDelete: boolean) => {
    if (pwd !== ADMIN_PASSWORD) { showToast("❌ Wrong admin password!", "#ef4444"); return false; }
    setIsAdmin(true); setShowAdminLogin(false);
    if (forDelete && pendingDeleteId) { save(leads.filter(l => l.id !== pendingDeleteId)); setPendingDeleteId(null); showToast("Lead deleted.", "#ef4444"); }
    else { showToast("✅ Admin access granted!", "#34d399"); }
    return true;
  };

  const markStatus = (id: string, status: string) => {
    save(leads.map(l => { 
      if (l.id !== id) return l; 
      const update: Partial<Lead> = { status }; 
      if (status === "called") update.lastCalled = todayStr(); 
      if (status === "followup") update.followUpDate = tomorrowStr(); 
      return { ...l, ...update }; 
    }));
  };

  const todayLeads = leads.filter(l => isDueToday(l.followUpDate) || (isOverdue(l.followUpDate) && l.status !== "converted" && l.status !== "dead"));
  const weeklyLeads = leads.filter(l => l.createdAt >= weeklyThreshold);
  
  const filteredAll = leads.filter(l => { 
    const q = search.toLowerCase(); 
    return !q || l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.phone?.includes(q) || l.calledBy?.toLowerCase().includes(q); 
  });

  if (!loaded) return <div style={{ color: "#fff", padding: 40, fontFamily: "var(--font-dm-sans), sans-serif" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0f111a", fontFamily: "var(--font-dm-sans), sans-serif", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ background: "#0d0f1a", borderBottom: "1px solid #1e2240", padding: "12px var(--px-main)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#f97316,#fb923c)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📞</div>
          <div>
            <div style={{ fontFamily: "var(--font-space-mono), monospace", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>CallTrack</div>
            <div style={{ fontSize: 11, color: "#4b5563", fontWeight: 500 }}>Cold Call Command Center</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isAdmin && <span style={{ fontSize: 11, background: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>🔓 Admin Mode</span>}
          {!isAdmin
            ? <button className="btn" onClick={() => { setPendingDeleteId(null); setShowAdminLogin(true); }} style={{ background: "#1e2240", color: "#94a3b8", padding: "7px 14px", fontSize: 12 }}>🔐 Admin Login</button>
            : <button className="btn" onClick={() => setIsAdmin(false)} style={{ background: "#3d1a1a", color: "#f87171", padding: "7px 14px", fontSize: 12 }}>Logout</button>
          }
          <button className="btn" onClick={() => { setEditLead(null); setShowForm(true); }} style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "9px 20px", fontSize: 13 }}>+ Add Lead</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, padding: "16px var(--px-main)", overflowX: "auto", scrollbarWidth: "none" }}>
        {[
          { label: "Total Leads", value: leads.length, icon: "👥", color: "#60a5fa" },
          { label: "Due Today", value: todayLeads.length, icon: "🔔", color: "#f97316", pulse: todayLeads.length > 0 },
          { label: "Converted", value: leads.filter(l => l.status === "converted").length, icon: "✅", color: "#34d399" },
          { label: "This Week", value: weeklyLeads.length, icon: "📅", color: "#a78bfa" },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: "0 0 auto", minWidth: 130, textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "var(--font-space-mono), monospace" }} className={s.pulse ? "badge-pulse" : ""}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 4, padding: "0 var(--px-main) 16px", overflowX: "auto", scrollbarWidth: "none" }}>
        <button className={`nav-btn ${view === "today" ? "active" : ""}`} onClick={() => setView("today")}>
          🔔 Today&apos;s Follow-ups {todayLeads.length > 0 && <span style={{ background: "#f97316", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 11, marginLeft: 4 }}>{todayLeads.length}</span>}
        </button>
        <button className={`nav-btn ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>📋 All Leads</button>
      </div>

      <div style={{ padding: "0 var(--px-main) 40px" }}>
        {view === "today" && <TodayView leads={todayLeads} onEdit={l => { setEditLead(l); setShowForm(true); }} onDelete={requestDelete} onMarkStatus={markStatus} isAdmin={isAdmin} />}
        {view === "all" && <AllView leads={filteredAll} search={search} setSearch={setSearch} onEdit={l => { setEditLead(l); setShowForm(true); }} onDelete={requestDelete} onMarkStatus={markStatus} isAdmin={isAdmin} />}
      </div>

      {showForm && <LeadForm lead={editLead} onSave={addOrUpdateLead} onClose={() => { setShowForm(false); setEditLead(null); }} />}
      {showAdminLogin && <AdminLoginModal isDeletePending={!!pendingDeleteId} onAuth={handleAdminAuth} onClose={() => { setShowAdminLogin(false); setPendingDeleteId(null); }} />}
      {toast && <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>}
    </div>
  );
}

function TodayView({ leads, onEdit, onDelete, onMarkStatus, isAdmin }: { leads: Lead[], onEdit: (l: Lead) => void, onDelete: (id: string) => void, onMarkStatus: (id: string, s: string) => void, isAdmin: boolean }) {
  if (!leads.length) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#6b7280" }}>No follow-ups due today!</div>
      <div style={{ fontSize: 13, color: "#4b5563", marginTop: 6 }}>All caught up. Go add some new leads.</div>
    </div>
  );
  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 13, color: "#6b7280", fontWeight: 600 }}>{leads.length} contact{leads.length !== 1 ? "s" : ""} need your attention today</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {leads.map(l => <LeadCard key={l.id} lead={l} onEdit={onEdit} onDelete={onDelete} onMarkStatus={onMarkStatus} highlight isAdmin={isAdmin} />)}
      </div>
    </div>
  );
}

function AllView({ leads, search, setSearch, onEdit, onDelete, onMarkStatus, isAdmin }: { leads: Lead[], search: string, setSearch: (s: string) => void, onEdit: (l: Lead) => void, onDelete: (id: string) => void, onMarkStatus: (id: string, s: string) => void, isAdmin: boolean }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCaller, setFilterCaller] = useState("all");
  const callers = Array.from(new Set(leads.map(l => l.calledBy).filter(Boolean)));
  const filtered = leads.filter(l => (filterStatus === "all" || l.status === filterStatus) && (filterCaller === "all" || l.calledBy === filterCaller));
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input-field" style={{ flex: "1 1 200px", maxWidth: 280 }} placeholder="🔍 Name, company, phone, caller..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field" style={{ flex: "0 0 auto", width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {callers.length > 0 && (
          <select className="input-field" style={{ flex: "0 0 auto", width: "auto" }} value={filterCaller} onChange={e => setFilterCaller(e.target.value)}>
            <option value="all">All Callers</option>
            {callers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      {!filtered.length ? (
        <div style={{ textAlign: "center", padding: "50px 20px" }}><div style={{ fontSize: 40 }}>📭</div><div style={{ fontSize: 16, color: "#6b7280", marginTop: 8 }}>No leads found</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(l => <LeadCard key={l.id} lead={l} onEdit={onEdit} onDelete={onDelete} onMarkStatus={onMarkStatus} isAdmin={isAdmin} />)}
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, onEdit, onDelete, onMarkStatus, highlight, isAdmin }: { lead: Lead, onEdit: (l: Lead) => void, onDelete: (id: string) => void, onMarkStatus: (id: string, s: string) => void, highlight?: boolean, isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUSES[lead.status] || STATUSES.new;
  const overdue = isOverdue(lead.followUpDate);
  const dueToday = isDueToday(lead.followUpDate);
  const callerColor = avatarColor(lead.calledBy);

  return (
    <div className="card" style={{ borderColor: highlight ? (overdue ? "#7f1d1d" : "#3d2a00") : undefined, position: "relative" }}>
      {overdue && <div style={{ position: "absolute", top: -1, right: 16, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "0 0 6px 6px", letterSpacing: 0.5 }}>OVERDUE</div>}
      {dueToday && !overdue && <div style={{ position: "absolute", top: -1, right: 16, background: "#f97316", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "0 0 6px 6px", letterSpacing: 0.5 }}>TODAY</div>}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: status.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, border: `1.5px solid ${status.color}30` }}>
          {lead.name?.[0]?.toUpperCase() || "?"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }} className="lead-card-content">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{lead.name || "Unnamed"}</span>
            <span className="tag" style={{ background: status.bg, color: status.color }}>{status.label}</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
            {lead.company && <span style={{ fontSize: 12, color: "#94a3b8" }}>🏢 {lead.company}</span>}
            {lead.phone && <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "var(--font-space-mono), monospace" }}>📱 {lead.phone}</span>}
          </div>

          {/* ── CALLER BADGE ── */}
          {lead.calledBy && (
            <div style={{ marginTop: 7 }}>
              <span className="caller-chip" style={{ background: callerColor + "22", color: callerColor, border: `1px solid ${callerColor}44` }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: callerColor, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {lead.calledBy[0].toUpperCase()}
                </span>
                📞 Called by <strong>{lead.calledBy}</strong>
              </span>
            </div>
          )}

          {lead.followUpDate && (
            <div style={{ fontSize: 12, marginTop: 5, color: overdue ? "#ef4444" : dueToday ? "#f97316" : "#60a5fa" }}>
              📅 Follow-up: {formatDate(lead.followUpDate)}
              {lead.lastCalled && <span style={{ color: "#6b7280", marginLeft: 10 }}>Last called: {formatDate(lead.lastCalled)}</span>}
            </div>
          )}
        </div>

        <div className="lead-actions">
          <button className="btn" onClick={() => setExpanded(!expanded)} style={{ background: "#1e2240", color: "#94a3b8", padding: "6px 10px", fontSize: 12 }}>{expanded ? "▲" : "▼"}</button>
          <button className="btn" onClick={() => onEdit(lead)} style={{ background: "#1e3a5f", color: "#60a5fa", padding: "6px 12px", fontSize: 12 }}>Edit</button>
          <button className="btn" onClick={() => onDelete(lead.id)} title={isAdmin ? "Delete lead" : "Admin only — click to authenticate"}
            style={{ background: isAdmin ? "#3d1a1a" : "#1e2240", color: isAdmin ? "#f87171" : "#6b7280", padding: "6px 12px", fontSize: 12 }}>
            {isAdmin ? "✕ Delete" : "🔐"}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #252840" }}>
          {lead.notes && <div style={{ fontSize: 13, color: "#94a3b8", background: "#0f111a", borderRadius: 8, padding: "10px 14px", marginBottom: 12, lineHeight: 1.6 }}>📝 {lead.notes}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#4b5563", fontWeight: 600, alignSelf: "center" }}>Mark as:</span>
            {Object.entries(STATUSES).map(([k, v]) => (
              <button key={k} className="status-btn" onClick={() => onMarkStatus(lead.id, k)}
                style={{ background: lead.status === k ? v.bg : "transparent", color: v.color, borderColor: v.color + "60" }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadForm({ lead, onSave, onClose }: { lead: Lead | null, onSave: (l: Lead) => void, onClose: () => void }) {
  const [form, setForm] = useState({
    id: lead?.id || null, name: lead?.name || "", company: lead?.company || "", phone: lead?.phone || "",
    calledBy: lead?.calledBy || "", status: lead?.status || "new",
    followUpDate: lead?.followUpDate || tomorrowStr(), notes: lead?.notes || "",
    lastCalled: lead?.lastCalled || "", createdAt: lead?.createdAt || todayStr(),
  });
  const [customCaller, setCustomCaller] = useState(!TEAM_MEMBERS.includes(lead?.calledBy || "") && !!lead?.calledBy);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="overlay">
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 18, color: "#f1f5f9" }}>{lead ? "Edit Lead" : "Add New Lead"}</h2>
          <button className="btn" onClick={onClose} style={{ background: "#252840", color: "#94a3b8", padding: "6px 12px", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Client Full Name *</label>
            <input className="input-field" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Company</label>
            <input className="input-field" placeholder="e.g. TechSoft Solutions" value={form.company} onChange={e => set("company", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Phone Number *</label>
            <input className="input-field" placeholder="e.g. 9876543210" value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>

          {/* WHO CALLED */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#f97316", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>📞 Who Made This Call? *</label>
            {!customCaller ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TEAM_MEMBERS.map(m => {
                  const c = avatarColor(m); const sel = form.calledBy === m;
                  return (
                    <button key={m} type="button" className="btn" onClick={() => set("calledBy", m)}
                      style={{ padding: "8px 16px", fontSize: 13, background: sel ? c : "#1e2240", color: sel ? "#fff" : "#94a3b8", border: `1.5px solid ${sel ? c : "#252840"}`, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: sel ? "rgba(255,255,255,0.3)" : c, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{m[0]}</span>
                      {m}
                    </button>
                  );
                })}
                <button type="button" className="btn" onClick={() => { setCustomCaller(true); set("calledBy", ""); }}
                  style={{ padding: "8px 16px", fontSize: 13, background: "#1e2240", color: "#94a3b8", border: "1.5px dashed #374151" }}>
                  + Other
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input-field" placeholder="Type caller name..." value={form.calledBy} onChange={e => set("calledBy", e.target.value)} autoFocus />
                <button type="button" className="btn" onClick={() => { setCustomCaller(false); set("calledBy", ""); }}
                  style={{ background: "#252840", color: "#94a3b8", padding: "0 14px", flexShrink: 0 }}>↩</button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Status</label>
              <select className="input-field" value={form.status} onChange={e => set("status", e.target.value)}>
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Follow-up Date</label>
              <input className="input-field" type="date" value={form.followUpDate} onChange={e => set("followUpDate", e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Notes / Call Summary</label>
            <textarea className="input-field" placeholder="What happened on the call? What did they say?..." rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} style={{ resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn" onClick={onClose} style={{ flex: 1, background: "#1e2240", color: "#94a3b8", padding: "12px" }}>Cancel</button>
            <button className="btn" onClick={() => {
              if (!form.name || !form.phone) return alert("Please fill Name and Phone");
              if (!form.calledBy) return alert("Please select who made this call");
              onSave(form as Lead);
            }} style={{ flex: 2, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "12px", fontSize: 15 }}>
              {lead ? "Update Lead" : "Save Lead"} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLoginModal({ isDeletePending, onAuth, onClose }: { isDeletePending: boolean, onAuth: (pwd: string, forDelete: boolean) => boolean, onClose: () => void }) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔐</div>
          <h2 style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 17, color: "#f1f5f9" }}>Admin Access Required</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8, lineHeight: 1.6 }}>
            {isDeletePending
              ? "Only admin can delete leads.\nEnter password to confirm."
              : "Enter admin password to unlock delete & admin features."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input className="input-field" type={show ? "text" : "password"} placeholder="Enter admin password" value={pwd}
            onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && onAuth(pwd, isDeletePending)} autoFocus />
          <button className="btn" type="button" onClick={() => setShow(!show)}
            style={{ background: "#1e2240", color: "#94a3b8", padding: "0 14px", flexShrink: 0, fontSize: 16 }}>
            {show ? "🙈" : "👁️"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={onClose} style={{ flex: 1, background: "#1e2240", color: "#94a3b8", padding: "11px" }}>Cancel</button>
          <button className="btn" onClick={() => onAuth(pwd, isDeletePending)}
            style={{ flex: 2, background: isDeletePending ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "11px", fontSize: 14 }}>
            {isDeletePending ? "🗑️ Confirm Delete" : "🔓 Login as Admin"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#4b5563", textAlign: "center", marginTop: 14 }}>
          Default password: <span style={{ fontFamily: "monospace", background: "#1e2240", padding: "1px 6px", borderRadius: 4, color: "#94a3b8" }}>admin123</span>
        </p>
      </div>
    </div>
  );
}
