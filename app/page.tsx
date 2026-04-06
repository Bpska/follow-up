'use client';

import { useState, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   TYPES & CONSTANTS
───────────────────────────────────────────── */
interface Status { label: string; color: string; bg: string; }
const STATUSES: Record<string, Status> = {
  new:       { label: "New Lead",       color: "#60a5fa", bg: "#1e3a5f" },
  called:    { label: "Called",         color: "#f59e0b", bg: "#3d2a00" },
  followup:  { label: "Follow-up Due",  color: "#f97316", bg: "#3d1a00" },
  converted: { label: "Converted ✓",   color: "#34d399", bg: "#063d2a" },
  dead:      { label: "Not Interested", color: "#9ca3af", bg: "#1f2937" },
};

interface Lead {
  id: string; name: string; company?: string; phone: string;
  calledBy: string; status: string; followUpDate: string;
  notes?: string; lastCalled?: string; createdAt: string;
}

interface UserAccount { name: string; pin: string; isAdmin: boolean; }

const ADMIN_ACCOUNT: UserAccount = { name: "Admin", pin: "admin123", isAdmin: true };

const SESSION_KEY      = "calltrack-session";  // sessionStorage — cleared on tab close
const LEADS_PREFIX     = "calltrack-leads-";   // localStorage key per user
const USERS_STORE_KEY  = "calltrack-users";    // localStorage key for user list

/* Default seed users */
const DEFAULT_USERS: UserAccount[] = [
  { name: "Ravi",   pin: "1111", isAdmin: false },
  { name: "Priya",  pin: "2222", isAdmin: false },
  { name: "Suresh", pin: "3333", isAdmin: false },
  { name: "Ankita", pin: "4444", isAdmin: false },
];

/* ── Dynamic user helpers ── */
function loadStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORE_KEY);
    if (raw) return JSON.parse(raw) as UserAccount[];
  } catch { /* ignore */ }
  // First time: seed defaults
  localStorage.setItem(USERS_STORE_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}
function saveStoredUsers(users: UserAccount[]) {
  localStorage.setItem(USERS_STORE_KEY, JSON.stringify(users));
}

/* ── Lead helpers ── */
function userLeadsKey(name: string) { return LEADS_PREFIX + name.toLowerCase(); }
function loadUserLeads(name: string): Lead[] {
  try { return JSON.parse(localStorage.getItem(userLeadsKey(name)) || "[]"); }
  catch { return []; }
}
function saveUserLeads(name: string, leads: Lead[]) {
  localStorage.setItem(userLeadsKey(name), JSON.stringify(leads));
}
function loadAllLeads(users: UserAccount[]): Lead[] {
  return users.filter(u => !u.isAdmin).flatMap(u => loadUserLeads(u.name));
}

function todayStr()    { return new Date().toISOString().split("T")[0]; }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }
function isOverdue(d?: string)  { return d && d < todayStr(); }
function isDueToday(d?: string) { return d === todayStr(); }
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const AVATAR_COLORS = ["#f97316","#60a5fa","#34d399","#a78bfa","#f59e0b","#f87171","#38bdf8"];
function avatarColor(name: string) {
  if (!name) return "#374151";
  let h = 0; for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/* ═══════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════ */
function LoginScreen({ onLogin }: { onLogin: (user: UserAccount) => void }) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [selected, setSelected] = useState<UserAccount | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [showPin, setShowPin] = useState(false);
  // New user creation
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [addError, setAddError] = useState("");
  // Admin login panel
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showAdminPwd, setShowAdminPwd] = useState(false);

  useEffect(() => {
    setUsers(loadStoredUsers());
  }, []);

  const handleLogin = () => {
    if (!selected) return;
    if (selected.pin !== pin) { setError("❌ Wrong PIN. Try again."); setPin(""); return; }
    onLogin(selected);
  };

  const handleAddUser = () => {
    const trimmed = newName.trim();
    const trimmedPin = newPin.trim();
    if (!trimmed) { setAddError("Please enter a name."); return; }
    if (trimmedPin.length < 4) { setAddError("PIN must be at least 4 characters."); return; }
    if (users.find(u => u.name.toLowerCase() === trimmed.toLowerCase())) {
      setAddError("A user with that name already exists."); return;
    }
    const newUser: UserAccount = { name: trimmed, pin: trimmedPin, isAdmin: false };
    const updated = [...users, newUser];
    saveStoredUsers(updated);
    setUsers(updated);
    setSelected(newUser);
    setPin("");
    setShowAddForm(false);
    setNewName(""); setNewPin(""); setAddError("");
  };

  const handleAdminLogin = () => {
    if (adminPwd !== ADMIN_ACCOUNT.pin) { setAdminError("❌ Wrong admin password."); setAdminPwd(""); return; }
    onLogin(ADMIN_ACCOUNT);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f111a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "var(--font-dm-sans), sans-serif" }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, background: "linear-gradient(135deg,#f97316,#fb923c)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 12px" }}>📞</div>
        <div style={{ fontFamily: "var(--font-space-mono), monospace", fontWeight: 700, fontSize: 24, color: "#f1f5f9" }}>CallTrack</div>
        <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>Cold Call Command Center</div>
      </div>

      <div style={{ background: "#181b2e", border: "1px solid #252840", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <h2 style={{ fontFamily: "var(--font-space-mono), monospace", color: "#f1f5f9", fontSize: 16, marginBottom: 6 }}>👋 Who are you?</h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Select your name or add a new one</p>

        {/* ── User buttons ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {users.map(u => {
            const color = avatarColor(u.name);
            const sel = selected?.name === u.name;
            return (
              <button key={u.name} className="btn"
                onClick={() => { setSelected(u); setPin(""); setError(""); setShowAddForm(false); }}
                style={{ padding: "10px 16px", fontSize: 13, background: sel ? color : "#1e2240", color: sel ? "#fff" : "#94a3b8", border: `1.5px solid ${sel ? color : "#252840"}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: sel ? "rgba(255,255,255,0.28)" : color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{u.name[0]}</span>
                {u.name}
              </button>
            );
          })}

          {/* + Add Name button */}
          <button className="btn"
            onClick={() => { setShowAddForm(true); setSelected(null); setPin(""); setError(""); }}
            style={{ padding: "10px 16px", fontSize: 13, background: showAddForm ? "#1e3a5f" : "#1e2240", color: showAddForm ? "#60a5fa" : "#6b7280", border: `1.5px dashed ${showAddForm ? "#60a5fa" : "#374151"}`, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> Add Name
          </button>
        </div>

        {/* ── Add new user form ── */}
        {showAddForm && (
          <div style={{ background: "#0f111a", border: "1px solid #1e3a5f", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 12 }}>➕ Create New Team Member</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input className="input-field" placeholder="Full name (e.g. Kiran)" value={newName}
                onChange={e => { setNewName(e.target.value); setAddError(""); }} autoFocus />
              <input className="input-field" placeholder="Set a PIN (min 4 chars)" value={newPin}
                onChange={e => { setNewPin(e.target.value); setAddError(""); }} />
              {addError && <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>{addError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => { setShowAddForm(false); setNewName(""); setNewPin(""); setAddError(""); }}
                  style={{ flex: 1, background: "#1e2240", color: "#94a3b8", padding: "10px" }}>Cancel</button>
                <button className="btn" onClick={handleAddUser}
                  style={{ flex: 2, background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", padding: "10px", fontSize: 14 }}>
                  ✓ Create &amp; Select
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PIN login for selected regular user ── */}
        {selected && !showAddForm && (
          <>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
              Enter PIN for {selected.name}
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input className="input-field" type={showPin ? "text" : "password"} placeholder="Enter PIN"
                value={pin} onChange={e => { setPin(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()} autoFocus />
              <button className="btn" type="button" onClick={() => setShowPin(!showPin)}
                style={{ background: "#1e2240", color: "#94a3b8", padding: "0 14px", flexShrink: 0, fontSize: 16 }}>
                {showPin ? "🙈" : "👁️"}
              </button>
            </div>
            {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{error}</div>}
            <button className="btn" onClick={handleLogin}
              style={{ width: "100%", background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "13px", fontSize: 15 }}>
              Login as {selected.name} →
            </button>
          </>
        )}

        {!selected && !showAddForm && (
          <div style={{ textAlign: "center", padding: "8px 0", fontSize: 13, color: "#4b5563" }}>↑ Select your name or add a new one above</div>
        )}

        {/* ── Admin login link ── */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button type="button" onClick={() => { setShowAdminLogin(!showAdminLogin); setAdminPwd(""); setAdminError(""); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", fontSize: 12, textDecoration: "underline", fontFamily: "inherit" }}>
            🔐 Admin Login
          </button>
        </div>

        {showAdminLogin && (
          <div style={{ marginTop: 12, background: "#1a0a0a", border: "1px solid #ef444430", borderRadius: 12, padding: "16px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 10 }}>🛡️ Admin Access</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input className="input-field" type={showAdminPwd ? "text" : "password"} placeholder="Admin password"
                value={adminPwd} onChange={e => { setAdminPwd(e.target.value); setAdminError(""); }}
                onKeyDown={e => e.key === "Enter" && handleAdminLogin()} autoFocus />
              <button className="btn" type="button" onClick={() => setShowAdminPwd(!showAdminPwd)}
                style={{ background: "#1e2240", color: "#94a3b8", padding: "0 14px", flexShrink: 0, fontSize: 16 }}>
                {showAdminPwd ? "🙈" : "👁️"}
              </button>
            </div>
            {adminError && <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{adminError}</div>}
            <button className="btn" onClick={handleAdminLogin}
              style={{ width: "100%", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", padding: "11px", fontSize: 14 }}>
              🔓 Login as Admin
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState("today");
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [weeklyThreshold, setWeeklyThreshold] = useState("");

  /* ── Restore session ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          const user = JSON.parse(raw) as UserAccount;
          setCurrentUser(user);
          const l = user.isAdmin ? loadAllLeads(loadStoredUsers()) : loadUserLeads(user.name);
          setLeads(l);
        } catch { /* ignore */ }
      }
      setWeeklyThreshold(new Date(Date.now() - 7 * 864e5).toISOString().split("T")[0]);
      setLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (user: UserAccount) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
    const l = user.isAdmin ? loadAllLeads(loadStoredUsers()) : loadUserLeads(user.name);
    setLeads(l);
    showToast(`✅ Welcome back, ${user.name}!`, "#34d399");
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setLeads([]);
    setView("today");
  };

  /* ── Save (scoped to current user) ── */
  const save = useCallback((newLeads: Lead[], user: UserAccount | null) => {
    if (!user) return;
    setLeads(newLeads);
    if (!user.isAdmin) {
      // Regular user: save only their own leads
      saveUserLeads(user.name, newLeads);
    } else {
      // Admin edited a lead: persist to the original owner's store
      // Group by calledBy and save each group
      const nonAdminUsers = loadStoredUsers().filter(u => !u.isAdmin).map(u => u.name);
      const byUser: Record<string, Lead[]> = {};
      nonAdminUsers.forEach(n => { byUser[n] = []; });
      newLeads.forEach(l => {
        const owner = nonAdminUsers.find(n => n.toLowerCase() === l.calledBy?.toLowerCase());
        if (owner) byUser[owner].push(l);
        else if (byUser["Ravi"]) byUser["Ravi"].push(l); // fallback
      });
      nonAdminUsers.forEach(n => saveUserLeads(n, byUser[n]));
    }
  }, []);

  const showToast = (msg: string, color = "#f97316") => {
    setToast({ msg, color }); setTimeout(() => setToast(null), 2500);
  };

  const addOrUpdateLead = (lead: Lead) => {
    if (!currentUser) return;
    let updated: Lead[];
    if (lead.id) {
      updated = leads.map(l => l.id === lead.id ? lead : l);
      showToast("Lead updated!");
    } else {
      const newLead: Lead = { ...lead, id: Date.now().toString(), createdAt: todayStr() };
      // For regular users, always set calledBy to themselves
      if (!currentUser.isAdmin) newLead.calledBy = currentUser.name;
      updated = [newLead, ...leads];
      showToast("Lead added!");
    }
    save(updated, currentUser);
    setShowForm(false); setEditLead(null);
  };

  const deleteLead = (id: string) => {
    if (!currentUser) return;
    if (!window.confirm("Delete this lead permanently?")) return;
    const updated = leads.filter(l => l.id !== id);
    save(updated, currentUser);
    showToast("Lead deleted.", "#ef4444");
  };

  const markStatus = (id: string, status: string) => {
    if (!currentUser) return;
    const updated = leads.map(l => {
      if (l.id !== id) return l;
      const u: Partial<Lead> = { status };
      if (status === "called") u.lastCalled = todayStr();
      if (status === "followup") u.followUpDate = tomorrowStr();
      return { ...l, ...u };
    });
    save(updated, currentUser);
  };

  /* ── Derived data ── */
  const todayLeads   = leads.filter(l => isDueToday(l.followUpDate) || (isOverdue(l.followUpDate) && l.status !== "converted" && l.status !== "dead"));
  const weeklyLeads  = leads.filter(l => l.createdAt >= weeklyThreshold);
  const filteredAll  = leads.filter(l => {
    const q = search.toLowerCase();
    return !q || l.name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q) || l.phone?.includes(q) || l.calledBy?.toLowerCase().includes(q);
  });

  /* ── Loading / auth gates ── */
  if (!loaded) return <div style={{ color: "#fff", padding: 40, fontFamily: "sans-serif" }}>Loading...</div>;
  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  const isAdmin = currentUser.isAdmin;

  return (
    <div style={{ minHeight: "100vh", background: "#0f111a", fontFamily: "var(--font-dm-sans), sans-serif", color: "#e2e8f0" }}>

      {/* ── Header ── */}
      <div style={{ background: "#0d0f1a", borderBottom: "1px solid #1e2240", padding: "12px var(--px-main)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#f97316,#fb923c)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📞</div>
          <div>
            <div style={{ fontFamily: "var(--font-space-mono), monospace", fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>CallTrack</div>
            <div style={{ fontSize: 11, color: "#4b5563", fontWeight: 500 }}>Cold Call Command Center</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Current user badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: isAdmin ? "#ef444420" : avatarColor(currentUser.name) + "22", border: `1px solid ${isAdmin ? "#ef444440" : avatarColor(currentUser.name) + "44"}`, borderRadius: 20, padding: "5px 12px" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: isAdmin ? "#ef4444" : avatarColor(currentUser.name), color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
              {currentUser.name[0]}
            </span>
            <span style={{ fontSize: 12, color: isAdmin ? "#ef4444" : avatarColor(currentUser.name), fontWeight: 700 }}>
              {isAdmin ? "🔓 Admin" : currentUser.name}
            </span>
          </div>

          {!isAdmin && (
            <button className="btn" onClick={() => { setEditLead(null); setShowForm(true); }}
              style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "9px 20px", fontSize: 13 }}>
              + Add Lead
            </button>
          )}
          <button className="btn" onClick={handleLogout} style={{ background: "#1e2240", color: "#94a3b8", padding: "7px 14px", fontSize: 12 }}>
            Logout
          </button>
        </div>
      </div>

      {/* ── Admin top banner ── */}
      {isAdmin && (
        <div style={{ background: "linear-gradient(90deg,#3d1a1a,#1a1040)", borderBottom: "1px solid #ef444430", padding: "10px var(--px-main)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <div>
            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13 }}>Admin View — Seeing All Team Leads</span>
            <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 10 }}>You can view, edit, and manage every team member&apos;s leads.</span>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 12, padding: "16px var(--px-main)", overflowX: "auto", scrollbarWidth: "none" }}>
        {[
          { label: isAdmin ? "All Team Leads" : "My Leads", value: leads.length, icon: "👥", color: "#60a5fa" },
          { label: "Due Today",  value: todayLeads.length,  icon: "🔔", color: "#f97316", pulse: todayLeads.length > 0 },
          { label: "Converted", value: leads.filter(l => l.status === "converted").length, icon: "✅", color: "#34d399" },
          { label: "This Week", value: weeklyLeads.length,  icon: "📅", color: "#a78bfa" },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: "0 0 auto", minWidth: 130, textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "var(--font-space-mono), monospace" }} className={s.pulse ? "badge-pulse" : ""}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Nav ── */}
      <div style={{ display: "flex", gap: 4, padding: "0 var(--px-main) 16px", overflowX: "auto", scrollbarWidth: "none" }}>
        <button className={`nav-btn ${view === "today" ? "active" : ""}`} onClick={() => setView("today")}>
          🔔 Today&apos;s Follow-ups {todayLeads.length > 0 && <span style={{ background: "#f97316", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 11, marginLeft: 4 }}>{todayLeads.length}</span>}
        </button>
        <button className={`nav-btn ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>📋 All Leads</button>
        {isAdmin && <button className={`nav-btn ${view === "team" ? "active" : ""}`} onClick={() => setView("team")}>👥 Team Report</button>}
      </div>

      <div style={{ padding: "0 var(--px-main) 40px" }}>
        {view === "today" && <TodayView leads={todayLeads} onEdit={l => { setEditLead(l); setShowForm(true); }} onDelete={deleteLead} onMarkStatus={markStatus} />}
        {view === "all"   && <AllView leads={filteredAll} search={search} setSearch={setSearch} onEdit={l => { setEditLead(l); setShowForm(true); }} onDelete={deleteLead} onMarkStatus={markStatus} isAdmin={isAdmin} />}
        {view === "team"  && isAdmin && <TeamReport />}
      </div>

      {showForm && <LeadForm lead={editLead} currentUser={currentUser} onSave={addOrUpdateLead} onClose={() => { setShowForm(false); setEditLead(null); }} />}
      {toast && <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TEAM REPORT (Admin only)
═══════════════════════════════════════════ */
function TeamReport() {
  const nonAdmins = loadStoredUsers().filter(u => !u.isAdmin);
  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 14, color: "#94a3b8", fontWeight: 600 }}>📊 Team Performance Overview</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {nonAdmins.map(user => {
          const userLeads = loadUserLeads(user.name);
          const converted = userLeads.filter(l => l.status === "converted").length;
          const dueToday  = userLeads.filter(l => isDueToday(l.followUpDate) || (isOverdue(l.followUpDate) && l.status !== "converted" && l.status !== "dead")).length;
          const color = avatarColor(user.name);
          return (
            <div key={user.name} className="card" style={{ borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: "#fff" }}>
                  {user.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Team Member</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Total Leads",  value: userLeads.length, color: "#60a5fa" },
                  { label: "Converted",    value: converted,          color: "#34d399" },
                  { label: "Due Today",    value: dueToday,           color: "#f97316" },
                  { label: "Conv. Rate",   value: userLeads.length > 0 ? `${Math.round(converted / userLeads.length * 100)}%` : "—", color: "#a78bfa" },
                ].map(stat => (
                  <div key={stat.label} style={{ flex: "1 1 80px", background: "#0f111a", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, fontFamily: "var(--font-space-mono), monospace" }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{stat.label}</div>
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
   TODAY VIEW
═══════════════════════════════════════════ */
function TodayView({ leads, onEdit, onDelete, onMarkStatus }: { leads: Lead[], onEdit: (l: Lead) => void, onDelete: (id: string) => void, onMarkStatus: (id: string, s: string) => void }) {
  if (!leads.length) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#6b7280" }}>No follow-ups due today!</div>
      <div style={{ fontSize: 13, color: "#4b5563", marginTop: 6 }}>All caught up. Go add some new leads.</div>
    </div>
  );
  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 13, color: "#6b7280", fontWeight: 600 }}>{leads.length} contact{leads.length !== 1 ? "s" : ""} need attention today</div>
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
  leads: Lead[], search: string, setSearch: (s: string) => void,
  onEdit: (l: Lead) => void, onDelete: (id: string) => void,
  onMarkStatus: (id: string, s: string) => void, isAdmin: boolean
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
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input-field" style={{ flex: "1 1 200px", maxWidth: 280 }}
          placeholder="🔍 Name, company, phone, caller..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field" style={{ flex: "0 0 auto", width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {isAdmin && callers.length > 0 && (
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
  lead: Lead, onEdit: (l: Lead) => void, onDelete: (id: string) => void,
  onMarkStatus: (id: string, s: string) => void, highlight?: boolean
}) {
  const [expanded, setExpanded] = useState(false);
  const status     = STATUSES[lead.status] || STATUSES.new;
  const overdue    = isOverdue(lead.followUpDate);
  const dueToday   = isDueToday(lead.followUpDate);
  const callerColor = avatarColor(lead.calledBy);

  return (
    <div className="card" style={{ borderColor: highlight ? (overdue ? "#7f1d1d" : "#3d2a00") : undefined, position: "relative" }}>
      {overdue  && <div style={{ position: "absolute", top: -1, right: 16, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "0 0 6px 6px", letterSpacing: 0.5 }}>OVERDUE</div>}
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
            {lead.phone   && <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "var(--font-space-mono), monospace" }}>📱 {lead.phone}</span>}
          </div>

          {/* Caller badge — always shown for admin, shown for regular users too */}
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
          <button className="btn" onClick={() => onDelete(lead.id)}
            style={{ background: "#3d1a1a", color: "#f87171", padding: "6px 12px", fontSize: 12 }}>
            ✕
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

/* ═══════════════════════════════════════════
   LEAD FORM
═══════════════════════════════════════════ */

function LeadForm({ lead, currentUser, onSave, onClose }: {
  lead: Lead | null, currentUser: UserAccount,
  onSave: (l: Lead) => void, onClose: () => void
}) {
  const [form, setForm] = useState({
    id: lead?.id || "", name: lead?.name || "", company: lead?.company || "",
    phone: lead?.phone || "",
    calledBy: lead?.calledBy || (currentUser.isAdmin ? "" : currentUser.name),
    status: lead?.status || "new",
    followUpDate: lead?.followUpDate || tomorrowStr(),
    notes: lead?.notes || "", lastCalled: lead?.lastCalled || "",
    createdAt: lead?.createdAt || todayStr(),
  });
  const teamMembers = loadStoredUsers().filter(u => !u.isAdmin).map(u => u.name);
  const [customCaller, setCustomCaller] = useState(!teamMembers.includes(lead?.calledBy || "") && !!lead?.calledBy);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

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

          {/* WHO CALLED — admin can pick anyone, regular user is locked to themselves */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#f97316", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>📞 Who Made This Call? *</label>
            {currentUser.isAdmin ? (
              // Admin: pick any team member
              !customCaller ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {teamMembers.map(m => {
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
              )
            ) : (
              // Regular user: locked to themselves
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: avatarColor(currentUser.name) + "18", border: `1.5px solid ${avatarColor(currentUser.name)}44`, borderRadius: 8, padding: "10px 14px" }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: avatarColor(currentUser.name), color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                  {currentUser.name[0]}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: avatarColor(currentUser.name) }}>{currentUser.name}</span>
                <span style={{ fontSize: 11, color: "#6b7280", marginLeft: "auto" }}>🔒 Locked to you</span>
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
