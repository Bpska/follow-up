'use client';

import { useState, useEffect, useCallback } from "react";
import insforge from "@/lib/insforge";

/* ─────────────────────────────────────────────
   TYPES & CONSTANTS
───────────────────────────────────────────── */
interface StatusMeta { label: string; color: string; bg: string; emoji: string; }
const STATUSES: Record<string, StatusMeta> = {
  new:       { label: "New Lead",       color: "#60a5fa", bg: "#1e3a5f", emoji: "🆕" },
  called:    { label: "Called",         color: "#f59e0b", bg: "#3d2a00", emoji: "📞" },
  followup:  { label: "Follow-up Due",  color: "#f97316", bg: "#3d1a00", emoji: "🔔" },
  converted: { label: "Converted",     color: "#34d399", bg: "#063d2a", emoji: "✅" },
  dead:      { label: "Not Interested", color: "#9ca3af", bg: "#1f2937", emoji: "❌" },
};

interface DbUser  { id: string; name: string; pin: string; is_admin: boolean; created_at: string; }
interface DbLead  { id: string; name: string; company?: string; phone: string; place?: string; called_by: string; status: string; follow_up_date: string; notes?: string; last_called?: string; created_at: string; }
interface Lead    { id: string; name: string; company?: string; phone: string; place?: string; calledBy: string; status: string; followUpDate: string; notes?: string; lastCalled?: string; createdAt: string; }
interface UserAccount { id?: string; name: string; pin: string; isAdmin: boolean; }

const ADMIN_ACCOUNT: UserAccount = { name: "Admin", pin: "admin123", isAdmin: true };
const SESSION_KEY = "calltrack-session";

function dbLeadToLead(r: DbLead): Lead {
  return { id: r.id, name: r.name, company: r.company, phone: r.phone, place: r.place, calledBy: r.called_by, status: r.status, followUpDate: r.follow_up_date, notes: r.notes, lastCalled: r.last_called, createdAt: r.created_at };
}
function leadToDbRow(l: Lead): Omit<DbLead, 'id'> {
  return { name: l.name, company: l.company, phone: l.phone, place: l.place, called_by: l.calledBy, status: l.status, follow_up_date: l.followUpDate, notes: l.notes, last_called: l.lastCalled, created_at: l.createdAt };
}

function todayStr()    { return new Date().toISOString().split("T")[0]; }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }
function isOverdue(d?: string)  { return d && d < todayStr(); }
function isDueToday(d?: string) { return d === todayStr(); }
function fmtDate(s: string) {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const AVATAR_COLORS = ["#f97316","#60a5fa","#34d399","#a78bfa","#f59e0b","#f87171","#38bdf8"];
function avatarColor(name: string) {
  if (!name) return "#374151";
  let h = 0; for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) { return name ? name[0].toUpperCase() : "?"; }

/* ── Avatar circle ── */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const c = avatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════ */
function LoginScreen({ onLogin, dbUsers }: { onLogin: (u: UserAccount) => void; dbUsers: UserAccount[] }) {
  const [selected, setSelected] = useState<UserAccount | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [addAdminPwd, setAddAdminPwd] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleLogin = () => {
    if (!selected) return;
    if (selected.pin !== pin) { setError("❌ Wrong PIN"); setPin(""); return; }
    onLogin(selected);
  };

  const handleAddUser = async () => {
    const trimmed = newName.trim(); const trimmedPin = newPin.trim();
    if (!trimmed) { setAddError("Enter a name"); return; }
    if (trimmedPin.length < 4) { setAddError("PIN must be at least 4 chars"); return; }
    if (addAdminPwd !== ADMIN_ACCOUNT.pin) { setAddError("❌ Wrong admin password"); return; }
    if (dbUsers.find(u => u.name.toLowerCase() === trimmed.toLowerCase())) { setAddError("Name already exists"); return; }
    setAdding(true);
    const { data, error: e } = await insforge.database.from('app_users').insert([{ name: trimmed, pin: trimmedPin, is_admin: false }]).select();
    setAdding(false);
    if (e || !data?.length) { setAddError("Failed to create. Try again."); return; }
    const raw = data[0] as DbUser;
    onLogin({ id: raw.id, name: raw.name, pin: raw.pin, isAdmin: raw.is_admin });
    setShowAddForm(false); setNewName(""); setNewPin(""); setAddAdminPwd(""); setAddError("");
  };

  const handleAdminLogin = () => {
    if (adminPwd !== ADMIN_ACCOUNT.pin) { setAdminError("❌ Wrong password"); setAdminPwd(""); return; }
    onLogin(ADMIN_ACCOUNT);
  };

  return (
    <div className="login-wrap">
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ width: 72, height: 72, background: "linear-gradient(135deg,#f97316,#fb923c)", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 14px", boxShadow: "0 12px 40px rgba(249,115,22,0.35)" }}>📞</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 26, color: "#f1f5f9", letterSpacing: -0.5 }}>CallTrack</div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>Cold Call Command Center</div>
      </div>

      <div className="login-card">
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>👋 Who are you?</div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 20 }}>Select your name to login</div>

        {/* User buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {dbUsers.map(u => {
            const c = avatarColor(u.name); const sel = selected?.name === u.name;
            return (
              <button key={u.name} className="btn"
                onClick={() => { setSelected(u); setPin(""); setError(""); setShowAddForm(false); setShowAdminLogin(false); }}
                style={{ padding: "9px 14px", fontSize: 13, background: sel ? c + "33" : "var(--bg-raised)", color: sel ? c : "var(--text-muted)", border: `1.5px solid ${sel ? c : "var(--border)"}`, gap: 8 }}>
                <Avatar name={u.name} size={24} />
                {u.name}
              </button>
            );
          })}
          <button className="btn" onClick={() => { setShowAddForm(true); setSelected(null); setShowAdminLogin(false); }}
            style={{ padding: "9px 14px", fontSize: 13, background: showAddForm ? "#1e3a5f33" : "var(--bg-raised)", color: showAddForm ? "#60a5fa" : "var(--text-dim)", border: `1.5px dashed ${showAddForm ? "#60a5fa" : "var(--border)"}` }}>
            ＋ Add
          </button>
        </div>

        {/* Add user form */}
        {showAddForm && (
          <div style={{ background: "var(--bg-base)", border: "1px solid #1e3a5f", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 12 }}>➕ New Team Member</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="input-field" placeholder="Full name" value={newName} onChange={e => { setNewName(e.target.value); setAddError(""); }} autoFocus />
              <input className="input-field" placeholder="Set a PIN (min 4 chars)" value={newPin} onChange={e => { setNewPin(e.target.value); setAddError(""); }} />
              <input className="input-field" type="password" placeholder="Admin password" value={addAdminPwd} onChange={e => { setAddAdminPwd(e.target.value); setAddError(""); }} />
              {addError && <div style={{ color: "var(--red)", fontSize: 12, fontWeight: 600 }}>{addError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => { setShowAddForm(false); setNewName(""); setNewPin(""); setAddAdminPwd(""); setAddError(""); }} style={{ flex: 1, background: "var(--bg-raised)", color: "var(--text-muted)", padding: "11px" }}>Cancel</button>
                <button className="btn" onClick={handleAddUser} disabled={adding} style={{ flex: 2, background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", padding: "11px", fontSize: 14 }}>
                  {adding ? "Creating…" : "✓ Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PIN entry */}
        {selected && !showAddForm && (
          <div style={{ marginBottom: 4 }}>
            <label className="field-label">PIN for {selected.name}</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input className="input-field" type={showPin ? "text" : "password"} placeholder="Enter PIN"
                value={pin} onChange={e => { setPin(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()} autoFocus />
              <button className="btn" onClick={() => setShowPin(!showPin)} style={{ background: "var(--bg-raised)", color: "var(--text-muted)", padding: "0 14px", flexShrink: 0, fontSize: 17 }}>
                {showPin ? "🙈" : "👁️"}
              </button>
            </div>
            {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 10, fontWeight: 600 }}>{error}</div>}
            <button className="btn" onClick={handleLogin}
              style={{ width: "100%", background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "14px", fontSize: 15, borderRadius: 10, boxShadow: "0 6px 20px rgba(249,115,22,0.3)" }}>
              Login as {selected.name} →
            </button>
          </div>
        )}

        {!selected && !showAddForm && !showAdminLogin && (
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)", padding: "8px 0" }}>↑ Tap your name above</div>
        )}

        {/* Admin link */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button type="button" onClick={() => { setShowAdminLogin(!showAdminLogin); setAdminPwd(""); setAdminError(""); setSelected(null); setShowAddForm(false); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 12, textDecoration: "underline", fontFamily: "inherit" }}>
            🔐 Admin Login
          </button>
        </div>

        {showAdminLogin && (
          <div style={{ marginTop: 12, background: "#1a0a0a", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginBottom: 10 }}>🛡️ Admin Access</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input className="input-field" type="password" placeholder="Admin password"
                value={adminPwd} onChange={e => { setAdminPwd(e.target.value); setAdminError(""); }}
                onKeyDown={e => e.key === "Enter" && handleAdminLogin()} autoFocus />
            </div>
            {adminError && <div style={{ color: "var(--red)", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{adminError}</div>}
            <button className="btn" onClick={handleAdminLogin}
              style={{ width: "100%", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", padding: "12px", fontSize: 14, borderRadius: 10 }}>
              🔓 Enter as Admin
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════ */
export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [dbUsers, setDbUsers] = useState<UserAccount[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState("today");
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  const showToast = (msg: string, color = "var(--orange)") => {
    setToast({ msg, color }); setTimeout(() => setToast(null), 2500);
  };

  const fetchLeads = useCallback(async (user: UserAccount) => {
    let q = insforge.database.from('leads').select();
    if (!user.isAdmin) q = q.eq('called_by', user.name);
    const { data } = await q.order('created_at', { ascending: false });
    setLeads((data as DbLead[] || []).map(dbLeadToLead));
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await insforge.database.from('app_users').select().eq('is_admin', false).order('created_at', { ascending: true });
      setDbUsers((data as DbUser[] || []).map(u => ({ id: u.id, name: u.name, pin: u.pin, isAdmin: u.is_admin })));
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        try { const user = JSON.parse(raw) as UserAccount; setCurrentUser(user); await fetchLeads(user); } catch { /**/ }
      }
      setLoaded(true);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (user: UserAccount) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
    await fetchLeads(user);
    showToast(`✅ Welcome, ${user.name}!`, "var(--green)");
    setDbUsers(prev => prev.find(u => u.name === user.name) ? prev : [...prev, user]);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUser(null); setLeads([]); setView("today");
  };

  const addOrUpdateLead = async (lead: Lead) => {
    if (!currentUser) return;
    if (lead.id) {
      const { error } = await insforge.database.from('leads').update(leadToDbRow(lead)).eq('id', lead.id);
      if (error) { showToast("❌ Update failed", "var(--red)"); return; }
      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
      showToast("✅ Lead updated");
    } else {
      const row = { ...leadToDbRow(lead), called_by: currentUser.isAdmin ? lead.calledBy : currentUser.name, created_at: todayStr() };
      const { data, error } = await insforge.database.from('leads').insert([row]).select();
      if (error || !data?.length) { showToast("❌ Failed to add", "var(--red)"); return; }
      setLeads(prev => [dbLeadToLead(data[0] as DbLead), ...prev]);
      showToast("✅ Lead added");
    }
    setShowForm(false); setEditLead(null);
  };

  const deleteLead = async (id: string) => {
    if (!currentUser) return;
    if (!window.confirm("Delete this lead?")) return;
    const { error } = await insforge.database.from('leads').delete().eq('id', id);
    if (error) { showToast("❌ Delete failed", "var(--red)"); return; }
    setLeads(prev => prev.filter(l => l.id !== id));
    showToast("Deleted", "var(--red)");
  };

  const markStatus = async (id: string, status: string) => {
    const updates: Partial<DbLead> = { status };
    if (status === "called") updates.last_called = todayStr();
    if (status === "followup") updates.follow_up_date = tomorrowStr();
    const { error } = await insforge.database.from('leads').update(updates).eq('id', id);
    if (error) { showToast("❌ Failed", "var(--red)"); return; }
    setLeads(prev => prev.map(l => l.id !== id ? l : {
      ...l, status,
      ...(status === "called" ? { lastCalled: todayStr() } : {}),
      ...(status === "followup" ? { followUpDate: tomorrowStr() } : {}),
    }));
  };

  const handleDeleteUser = async (userName: string) => {
    if (!window.confirm(`Delete ${userName} and ALL their leads?`)) return;
    await insforge.database.from('leads').delete().eq('called_by', userName);
    const { error } = await insforge.database.from('app_users').delete().eq('name', userName);
    if (error) { showToast("❌ Failed", "var(--red)"); return; }
    setDbUsers(prev => prev.filter(u => u.name !== userName));
    if (currentUser?.isAdmin) setLeads(prev => prev.filter(l => l.calledBy !== userName));
    showToast(`Deleted ${userName}`, "var(--red)");
  };

  /* Derived */
  const weekThresh   = new Date(Date.now() - 7 * 864e5).toISOString().split("T")[0];
  const todayLeads   = leads.filter(l => isDueToday(l.followUpDate) || (isOverdue(l.followUpDate) && l.status !== "converted" && l.status !== "dead"));
  const weekLeads    = leads.filter(l => l.createdAt >= weekThresh);
  const filteredAll  = leads.filter(l => { const q = search.toLowerCase(); return !q || l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.phone?.includes(q) || l.calledBy?.toLowerCase().includes(q); });

  if (!loaded) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 40 }}>📞</div>
      <div style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}>Connecting…</div>
    </div>
  );
  if (!currentUser) return <LoginScreen onLogin={handleLogin} dbUsers={dbUsers} />;

  const isAdmin = currentUser.isAdmin;
  const converted = leads.filter(l => l.status === "converted").length;

  return (
    <div className="app-shell">
      {/* ── Top Bar ── */}
      <header className="top-bar">
        <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#f97316,#fb923c)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: "0 4px 14px rgba(249,115,22,0.3)" }}>📞</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", lineHeight: 1.2 }}>CallTrack</div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 600 }}>COMMAND CENTER</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* User chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: isAdmin ? "rgba(239,68,68,0.12)" : avatarColor(currentUser.name) + "22", border: `1px solid ${isAdmin ? "rgba(239,68,68,0.3)" : avatarColor(currentUser.name) + "44"}`, borderRadius: 20, padding: "5px 10px" }}>
            <Avatar name={isAdmin ? "A" : currentUser.name} size={22} />
            <span style={{ fontSize: 12, color: isAdmin ? "var(--red)" : avatarColor(currentUser.name), fontWeight: 700 }}>{isAdmin ? "Admin" : currentUser.name}</span>
          </div>
          <button className="btn" onClick={handleLogout} style={{ background: "var(--bg-raised)", color: "var(--text-dim)", padding: "7px 12px", fontSize: 12 }}>Out</button>
        </div>
      </header>

      {/* ── Admin Banner ── */}
      {isAdmin && (
        <div className="admin-banner" style={{ top: "var(--header-h)" }}>
          <span>🛡️</span>
          <span style={{ color: "var(--red)", fontWeight: 700 }}>Admin</span>
          <span style={{ color: "var(--text-dim)" }}>— all team leads visible</span>
        </div>
      )}

      {/* ── Content ── */}
      <main className="content-area" style={{ paddingTop: `calc(var(--header-h) + ${isAdmin ? "40px" : "12px"} + 12px)` }}>

        {/* Stats */}
        <div className="stats-row">
          {[ 
            { label: isAdmin ? "All Leads" : "My Leads", val: leads.length, accent: "#60a5fa", icon: "👥" },
            { label: "Due Today",  val: todayLeads.length,  accent: "#f97316", icon: "🔔", pulse: todayLeads.length > 0 },
            { label: "Converted", val: converted,            accent: "#34d399", icon: "✅" },
            { label: "This Week", val: weekLeads.length,     accent: "#a78bfa", icon: "📅" },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ "--accent": s.accent } as React.CSSProperties}>
              <div className="stat-icon">{s.icon}</div>
              <div className={`stat-val${s.pulse ? " pulse" : ""}`}>{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Views */}
        {view === "today" && <TodayView leads={todayLeads} onEdit={l => { setEditLead(l); setShowForm(true); }} onDelete={deleteLead} onMarkStatus={markStatus} />}
        {view === "all"   && <AllView leads={filteredAll} search={search} setSearch={setSearch} onEdit={l => { setEditLead(l); setShowForm(true); }} onDelete={deleteLead} onMarkStatus={markStatus} isAdmin={isAdmin} />}
        {view === "team"  && isAdmin && <TeamReport dbUsers={dbUsers} onDeleteUser={handleDeleteUser} />}
      </main>

      {/* ── FAB (non-admin only) ── */}
      {!isAdmin && (
        <button className="fab" onClick={() => { setEditLead(null); setShowForm(true); }} aria-label="Add Lead">
          +
        </button>
      )}

      {/* ── Bottom Nav ── */}
      <nav className="bottom-nav">
        <button className={`bnav-item${view === "today" ? " active" : ""}`} onClick={() => setView("today")}>
          {todayLeads.length > 0 && <span className="bnav-badge">{todayLeads.length}</span>}
          <span className="bnav-icon">🔔</span>
          <span className="bnav-label">Today</span>
        </button>
        <button className={`bnav-item${view === "all" ? " active" : ""}`} onClick={() => setView("all")}>
          <span className="bnav-icon">📋</span>
          <span className="bnav-label">All Leads</span>
        </button>
        {isAdmin && (
          <button className={`bnav-item${view === "team" ? " active" : ""}`} onClick={() => setView("team")}>
            <span className="bnav-icon">👥</span>
            <span className="bnav-label">Team</span>
          </button>
        )}
      </nav>

      {/* ── Lead Form Sheet ── */}
      {showForm && <LeadForm lead={editLead} currentUser={currentUser} dbUsers={dbUsers} onSave={addOrUpdateLead} onClose={() => { setShowForm(false); setEditLead(null); }} />}

      {/* ── Toast ── */}
      {toast && <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TODAY VIEW
═══════════════════════════════════════════ */
function TodayView({ leads, onEdit, onDelete, onMarkStatus }: { leads: Lead[]; onEdit:(l:Lead)=>void; onDelete:(id:string)=>void; onMarkStatus:(id:string,s:string)=>void }) {
  if (!leads.length) return (
    <div className="empty-state">
      <div style={{ fontSize: 60 }}>🎉</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-muted)" }}>All caught up!</div>
      <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No follow-ups due today.</div>
    </div>
  );
  return (
    <div>
      <div className="section-title">{leads.length} contact{leads.length !== 1 ? "s" : ""} need attention</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {leads.map(l => <LeadCard key={l.id} lead={l} onEdit={onEdit} onDelete={onDelete} onMarkStatus={onMarkStatus} highlight />)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ALL LEADS VIEW
═══════════════════════════════════════════ */
function AllView({ leads, search, setSearch, onEdit, onDelete, onMarkStatus, isAdmin }: {
  leads: Lead[]; search: string; setSearch:(s:string)=>void;
  onEdit:(l:Lead)=>void; onDelete:(id:string)=>void; onMarkStatus:(id:string,s:string)=>void; isAdmin: boolean;
}) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCaller, setFilterCaller] = useState("all");
  const callers = Array.from(new Set(leads.map(l => l.calledBy).filter(Boolean)));
  const filtered = leads.filter(l =>
    (filterStatus === "all" || l.status === filterStatus) &&
    (filterCaller === "all" || l.calledBy === filterCaller)
  );
  return (
    <div>
      <input className="input-field" style={{ marginBottom: 10 }}
        placeholder="🔍 Search name, company, phone…" value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", scrollbarWidth: "none" }}>
        <select className="input-field" style={{ flex: "0 0 auto", width: "auto", fontSize: 13, padding: "8px 12px" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
        {isAdmin && callers.length > 0 && (
          <select className="input-field" style={{ flex: "0 0 auto", width: "auto", fontSize: 13, padding: "8px 12px" }} value={filterCaller} onChange={e => setFilterCaller(e.target.value)}>
            <option value="all">All Callers</option>
            {callers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      {!filtered.length ? (
        <div className="empty-state"><div style={{ fontSize: 40 }}>📭</div><div style={{ color: "var(--text-muted)" }}>No leads found</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(l => <LeadCard key={l.id} lead={l} onEdit={onEdit} onDelete={onDelete} onMarkStatus={onMarkStatus} />)}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LEAD CARD
═══════════════════════════════════════════ */
function LeadCard({ lead, onEdit, onDelete, onMarkStatus, highlight }: {
  lead: Lead; onEdit:(l:Lead)=>void; onDelete:(id:string)=>void; onMarkStatus:(id:string,s:string)=>void; highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUSES[lead.status] || STATUSES.new;
  const overdue  = isOverdue(lead.followUpDate);
  const dueToday = isDueToday(lead.followUpDate);
  const cc = avatarColor(lead.calledBy || "");

  const borderColor = overdue ? "#7f1d1d" : dueToday ? "#3d2a00" : "var(--border)";

  return (
    <div className="lead-card" style={{ borderColor: highlight ? borderColor : "var(--border)", padding: 0 }}>
      {/* Urgency ribbon */}
      {overdue  && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--red)" }} />}
      {dueToday && !overdue && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--orange)" }} />}

      {/* Clickable Header Area */}
      <div onClick={() => setExpanded(!expanded)} style={{ padding: 14, cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start", userSelect: "none" }}>
        {/* Avatar */}
        <div style={{ width: 44, height: 44, borderRadius: 12, background: st.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: st.color, flexShrink: 0, border: `1.5px solid ${st.color}33` }}>
          {(lead.name?.[0] || "?").toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{lead.name || "Unnamed"}</span>
            <span className="lead-tag" style={{ background: st.bg, color: st.color }}>{st.emoji} {st.label}</span>
          </div>
          {lead.company && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>🏢 {lead.company}</div>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 2 }}>
            {lead.phone && <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'Space Mono', monospace" }}>📱 {lead.phone}</span>}
            {lead.place && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {lead.place}</span>}
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
            {lead.calledBy && (
              <span className="caller-chip" style={{ background: cc + "22", color: cc, border: `1px solid ${cc}44` }}>
                <Avatar name={lead.calledBy} size={18} />
                {lead.calledBy}
              </span>
            )}
            {lead.followUpDate && (
              <span style={{ fontSize: 11, color: overdue ? "var(--red)" : dueToday ? "var(--orange)" : "var(--text-dim)", fontWeight: 600, marginLeft: "auto" }}>
                📅 {fmtDate(lead.followUpDate)}
                {(overdue || dueToday) && (
                  <span style={{ marginLeft: 4, background: overdue ? "var(--red)" : "var(--orange)", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 4, fontWeight: 800 }}>
                    {overdue ? "OVERDUE" : "TODAY"}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        
        {/* Chevron */}
        <div style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 12 }}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>

      {/* Expanded Actions & Details */}
      {expanded && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            {lead.notes && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", background: "var(--bg-base)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, lineHeight: 1.6 }}>
                📝 {lead.notes}
              </div>
            )}
            {lead.lastCalled && <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>📞 Last called: {fmtDate(lead.lastCalled)}</div>}
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>Mark Status:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(STATUSES).map(([k, v]) => (
                    <button key={k} className="status-btn" onClick={() => onMarkStatus(lead.id, k)}
                      style={{ background: lead.status === k ? v.bg : "transparent", color: v.color, borderColor: v.color + "50" }}>
                      {v.emoji} {v.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Management Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => onEdit(lead)} style={{ background: "#1e3a5f", color: "#60a5fa", padding: "6px 14px", fontSize: 12 }}>Edit Lead</button>
                <button className="btn" onClick={() => onDelete(lead.id)} style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)", padding: "6px 14px", fontSize: 12 }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEAM REPORT
═══════════════════════════════════════════ */
function TeamReport({ dbUsers, onDeleteUser }: { dbUsers: UserAccount[]; onDeleteUser: (name: string) => void }) {
  const [teamLeads, setTeamLeads] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await insforge.database.from('leads').select();
      const all = (data as DbLead[] || []).map(dbLeadToLead);
      const byUser: Record<string, Lead[]> = {};
      dbUsers.forEach(u => { byUser[u.name] = []; });
      all.forEach(l => { if (byUser[l.calledBy] !== undefined) byUser[l.calledBy].push(l); });
      setTeamLeads(byUser); setLoading(false);
    };
    fetch();
  }, [dbUsers]);

  if (loading) return <div className="empty-state"><div style={{ color: "var(--text-dim)", fontSize: 14 }}>Loading…</div></div>;

  return (
    <div>
      <div className="section-title">📊 Team Performance</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {dbUsers.map(user => {
          const ul = teamLeads[user.name] || [];
          const converted = ul.filter(l => l.status === "converted").length;
          const dueToday  = ul.filter(l => isDueToday(l.followUpDate) || (isOverdue(l.followUpDate) && l.status !== "converted" && l.status !== "dead")).length;
          const color = avatarColor(user.name);
          const rate = ul.length > 0 ? `${Math.round(converted / ul.length * 100)}%` : "—";
          return (
            <div key={user.name} className="card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Avatar name={user.name} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Team Member</div>
                </div>
                <button onClick={() => onDeleteUser(user.name)}
                  style={{ background: "rgba(239,68,68,0.12)", color: "var(--red)", border: "none", padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                  Remove
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Total",      val: ul.length, color: "#60a5fa" },
                  { label: "Converted",  val: converted,  color: "#34d399" },
                  { label: "Due Today",  val: dueToday,   color: "#f97316" },
                  { label: "Conv. Rate", val: rate,        color: "#a78bfa" },
                ].map(s => (
                  <div key={s.label} className="team-stat">
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "'Space Mono', monospace" }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LEAD FORM — Bottom Sheet
═══════════════════════════════════════════ */
function LeadForm({ lead, currentUser, dbUsers, onSave, onClose }: {
  lead: Lead | null; currentUser: UserAccount; dbUsers: UserAccount[];
  onSave: (l: Lead) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    id: lead?.id || "", name: lead?.name || "", company: lead?.company || "",
    phone: lead?.phone || "", place: lead?.place || "",
    calledBy: lead?.calledBy || (currentUser.isAdmin ? "" : currentUser.name),
    status: lead?.status || "new",
    followUpDate: lead?.followUpDate || tomorrowStr(),
    notes: lead?.notes || "", lastCalled: lead?.lastCalled || "",
    createdAt: lead?.createdAt || todayStr(),
  });
  const teamMembers = dbUsers.map(u => u.name);
  const [customCaller, setCustomCaller] = useState(!teamMembers.includes(lead?.calledBy || "") && !!lead?.calledBy);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-inner">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 17, color: "var(--text-primary)" }}>
              {lead ? "✏️ Edit Lead" : "➕ Add Lead"}
            </div>
            <button className="btn" onClick={onClose} style={{ background: "var(--bg-raised)", color: "var(--text-muted)", padding: "8px 12px", fontSize: 15, borderRadius: 10 }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Name */}
            <div>
              <label className="field-label">Client Name</label>
              <input className="input-field" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            {/* Company */}
            <div>
              <label className="field-label">Company</label>
              <input className="input-field" placeholder="e.g. TechSoft Solutions" value={form.company} onChange={e => set("company", e.target.value)} />
            </div>
            {/* Phone */}
            <div>
              <label className="field-label">Phone *</label>
              <input className="input-field" placeholder="e.g. 9876543210" value={form.phone} onChange={e => set("phone", e.target.value)} inputMode="tel" />
            </div>
            {/* Place */}
            <div>
              <label className="field-label">Which Place / Location</label>
              <input className="input-field" placeholder="e.g. Mumbai, Andheri East" value={form.place} onChange={e => set("place", e.target.value)} />
            </div>

            {/* Who called */}
            <div>
              <label className="field-label" style={{ color: "var(--orange)" }}>📞 Who Made This Call? *</label>
              {currentUser.isAdmin ? (
                !customCaller ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {teamMembers.map(m => {
                      const c = avatarColor(m); const sel = form.calledBy === m;
                      return (
                        <button key={m} type="button" className="btn" onClick={() => set("calledBy", m)}
                          style={{ padding: "8px 12px", fontSize: 13, background: sel ? c + "33" : "var(--bg-raised)", color: sel ? c : "var(--text-muted)", border: `1.5px solid ${sel ? c : "var(--border)"}`, gap: 7 }}>
                          <Avatar name={m} size={20} />
                          {m}
                        </button>
                      );
                    })}
                    <button type="button" className="btn" onClick={() => { setCustomCaller(true); set("calledBy", ""); }}
                      style={{ padding: "8px 14px", fontSize: 13, background: "var(--bg-raised)", color: "var(--text-dim)", border: "1.5px dashed var(--border)" }}>
                      + Other
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="input-field" placeholder="Type caller name…" value={form.calledBy} onChange={e => set("calledBy", e.target.value)} autoFocus />
                    <button type="button" className="btn" onClick={() => { setCustomCaller(false); set("calledBy", ""); }} style={{ background: "var(--bg-raised)", color: "var(--text-muted)", padding: "0 14px", flexShrink: 0 }}>↩</button>
                  </div>
                )
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: avatarColor(currentUser.name) + "18", border: `1.5px solid ${avatarColor(currentUser.name)}44`, borderRadius: 8, padding: "12px 14px" }}>
                  <Avatar name={currentUser.name} size={28} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: avatarColor(currentUser.name) }}>{currentUser.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto" }}>🔒 Locked to you</span>
                </div>
              )}
            </div>

            {/* Status + date */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="field-label">Status</label>
                <select className="input-field" value={form.status} onChange={e => set("status", e.target.value)}>
                  {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label">Follow-up</label>
                <input className="input-field" type="date" value={form.followUpDate} onChange={e => set("followUpDate", e.target.value)} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="field-label">Notes</label>
              <textarea className="input-field" placeholder="What happened on the call?…" rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} style={{ resize: "vertical" }} />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={onClose} style={{ flex: 1, background: "var(--bg-raised)", color: "var(--text-muted)", padding: "14px", borderRadius: 10 }}>Cancel</button>
              <button className="btn" onClick={() => {
                if (!form.phone) return alert("Please fill Phone number");
                if (!form.calledBy) return alert("Please select who made this call");
                onSave(form as Lead);
              }} style={{ flex: 2, background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "14px", fontSize: 15, borderRadius: 10, boxShadow: "0 6px 20px rgba(249,115,22,0.3)" }}>
                {lead ? "✓ Update Lead" : "✓ Save Lead"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
