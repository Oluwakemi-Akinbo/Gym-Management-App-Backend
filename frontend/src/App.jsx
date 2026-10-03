import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowUpRight, BarChart3, Bell, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleDollarSign, Clock3, Dumbbell, Ellipsis, FileText, Filter, LayoutDashboard,
  LogOut, Menu, Plus, Search, Settings2, ShieldCheck, Users, Wallet, X, CalendarDays
} from 'lucide-react';
import { api, apiUrl, tokenStore } from './api';

const sections = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'plans', label: 'Membership plans', icon: FileText },
  { id: 'trainers', label: 'Trainers', icon: Dumbbell },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'attendance', label: 'Attendance', icon: CalendarDays },
  { id: 'team', label: 'Team access', icon: ShieldCheck, admin: true }
];

const schemas = {
  members: {
    title: 'Members', singular: 'member', path: '/members', searchPlaceholder: 'Search members...',
    columns: [
      { key: 'person', label: 'MEMBER', render: (r) => <Person name={`${r.firstName} ${r.lastName}`} sub={r.email} /> },
      { key: 'phone', label: 'PHONE', render: (r) => r.phone || '—' },
      { key: 'plan', label: 'PLAN', render: (r) => r.plan?.name || 'No plan' },
      { key: 'membershipEnd', label: 'MEMBERSHIP ENDS', render: (r) => date(r.membershipEnd) },
      { key: 'status', label: 'STATUS', render: (r) => <Status value={r.status} /> }
    ],
    fields: (data = {}, options = {}) => [
      field('firstName', 'First name', data.firstName, { required: true }), field('lastName', 'Last name', data.lastName, { required: true }),
      field('email', 'Email', data.email, { type: 'email', required: true }), field('phone', 'Phone', data.phone),
      field('dateOfBirth', 'Date of birth', dateInput(data.dateOfBirth), { type: 'date' }),
      field('plan', 'Membership plan', idOf(data.plan), { type: 'select', options: [{ value: '', label: 'No plan assigned' }, ...options.plans.map((x) => ({ value: x._id, label: x.name }))] }),
      field('trainer', 'Trainer', idOf(data.trainer), { type: 'select', options: [{ value: '', label: 'No trainer assigned' }, ...options.trainers.map((x) => ({ value: x._id, label: `${x.firstName} ${x.lastName}` }))] }),
      field('status', 'Status', data.status || 'active', { type: 'select', options: choices(['active', 'inactive', 'suspended']) }),
      field('membershipStart', 'Membership start', dateInput(data.membershipStart), { type: 'date' }), field('membershipEnd', 'Membership end', dateInput(data.membershipEnd), { type: 'date' }),
      field('notes', 'Notes', data.notes, { type: 'textarea', wide: true })
    ],
    toBody: (v) => compact({ ...v, dateOfBirth: v.dateOfBirth || undefined, plan: v.plan || undefined, trainer: v.trainer || undefined, membershipStart: v.membershipStart || undefined, membershipEnd: v.membershipEnd || undefined })
  },
  plans: {
    title: 'Membership plans', singular: 'plan', path: '/plans', searchPlaceholder: 'Search plans...', adminOnly: true,
    columns: [
      { key: 'name', label: 'PLAN', render: (r) => <Person name={r.name} sub={r.description || `${r.durationDays} days`} /> },
      { key: 'durationDays', label: 'DURATION', render: (r) => `${r.durationDays} days` },
      { key: 'price', label: 'PRICE', render: (r) => money(r.price) },
      { key: 'active', label: 'STATUS', render: (r) => <Status value={r.active ? 'active' : 'inactive'} /> }
    ],
    fields: (data = {}) => [field('name', 'Plan name', data.name, { required: true }), field('durationDays', 'Duration in days', data.durationDays, { type: 'number', required: true, min: 1 }), field('price', 'Price (₦)', data.price, { type: 'number', required: true, min: 0, step: '0.01' }), field('active', 'Availability', String(data.active ?? true), { type: 'select', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Archived' }] }), field('description', 'Description', data.description, { type: 'textarea', wide: true })],
    toBody: (v) => ({ ...v, durationDays: Number(v.durationDays), price: Number(v.price), active: v.active === 'true' })
  },
  trainers: {
    title: 'Trainers', singular: 'trainer', path: '/trainers', searchPlaceholder: 'Search trainers...',
    columns: [
      { key: 'person', label: 'TRAINER', render: (r) => <Person name={`${r.firstName} ${r.lastName}`} sub={r.email} /> },
      { key: 'phone', label: 'PHONE', render: (r) => r.phone || '—' },
      { key: 'specialties', label: 'SPECIALTIES', render: (r) => r.specialties?.join(', ') || '—' },
      { key: 'active', label: 'STATUS', render: (r) => <Status value={r.active ? 'active' : 'inactive'} /> }
    ],
    fields: (data = {}) => [field('firstName', 'First name', data.firstName, { required: true }), field('lastName', 'Last name', data.lastName, { required: true }), field('email', 'Email', data.email, { type: 'email', required: true }), field('phone', 'Phone', data.phone), field('specialties', 'Specialties (comma separated)', data.specialties?.join(', '), { wide: true }), field('active', 'Availability', String(data.active ?? true), { type: 'select', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Archived' }] }), field('notes', 'Notes', data.notes, { type: 'textarea', wide: true })],
    toBody: (v) => compact({ ...v, active: v.active === 'true', specialties: v.specialties ? v.specialties.split(',').map((s) => s.trim()).filter(Boolean) : [] })
  }
};

function field(name, label, value = '', rest = {}) { return { name, label, value: value ?? '', ...rest }; }
function choices(values) { return values.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })); }
function compact(object) { return Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined && v !== '')); }
function idOf(value) { return typeof value === 'object' && value ? value._id || value.id : value || ''; }
function dateInput(value) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
function date(value) { return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
function time(value) { return value ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'; }
function money(value) { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value || 0)); }
function initials(value = '') { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || 'GM'; }

export default function App() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [sessionChecking, setSessionChecking] = useState(Boolean(tokenStore.get()));
  useNavigationEvents(setSection);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(window.__gymToastTimer);
    window.__gymToastTimer = window.setTimeout(() => setToast(''), 3800);
  }, []);

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); setSection('dashboard'); }, []);

  useEffect(() => {
    const expired = () => { logout(); notify('Your session expired. Please sign in again.'); };
    window.addEventListener('gym:session-expired', expired);
    return () => window.removeEventListener('gym:session-expired', expired);
  }, [logout, notify]);

  useEffect(() => {
    if (!tokenStore.get()) { setSessionChecking(false); return; }
    api('/auth/me').then((data) => setUser(data.user)).catch(() => tokenStore.clear()).finally(() => setSessionChecking(false));
  }, []);

  if (sessionChecking) return <div className="screen-center"><span className="spinner" /> Checking your session…</div>;
  if (!user) return <Login onLogin={setUser} notify={notify} />;

  const activeSection = sections.find((item) => item.id === section) || sections[0];
  const allowed = sections.filter((item) => !item.admin || user.role === 'admin');
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Dumbbell size={20} /></span><span>form<span className="brand-light">&</span>function<small>GYM MANAGEMENT</small></span><button className="icon-btn sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
      <div className="workspace-switch"><span className="gym-dot" /><span><b>Form & Function</b><small>Downtown location</small></span><ChevronDown size={15} /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="nav-list">{allowed.map((item) => <button key={item.id} className={`nav-item ${section === item.id ? 'selected' : ''}`} onClick={() => { setSection(item.id); setSidebarOpen(false); }}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'attendance' && <span className="nav-live" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><Activity size={17} /></span><b>Need a hand?</b><p>Everything in one place to keep your gym running smoothly.</p></div><button className="nav-item"><Settings2 size={18} /><span>Settings</span></button><div className="profile-row"><div className="avatar avatar-small">{initials(user.name)}</div><span className="profile-name"><b>{user.name}</b><small>{user.role === 'admin' ? 'Administrator' : 'Staff member'}</small></span><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17} /></button></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{activeSection.label}</b></div><div className="topbar-right"><div className="api-status"><span /> API connected</div><button className="icon-btn notification-btn" aria-label="Notifications"><Bell size={18} /><i /></button><div className="avatar">{initials(user.name)}</div><div className="top-user"><b>{user.name}</b><small>{user.role}</small></div><button className="icon-btn top-logout" title="Sign out" onClick={logout}><LogOut size={17} /></button></div></header>
      <div className="page-content">
        {section === 'dashboard' && <Dashboard user={user} notify={notify} />}
        {schemas[section] && <ResourcePage key={section} type={section} user={user} notify={notify} />}
        {section === 'payments' && <PaymentsPage user={user} notify={notify} />}
        {section === 'attendance' && <AttendancePage notify={notify} />}
        {section === 'team' && user.role === 'admin' && <TeamPage notify={notify} />}
      </div>
      <footer className="footer"><span>Form & Function Gym</span><span>Connected to <code>{apiUrl.replace('/api/v1', '')}</code></span></footer>
    </main>
    {toast && <div className="toast"><span className="toast-check"><Check size={14} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </div>;
}

function Login({ onLogin, notify }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { const data = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false }); tokenStore.set(data.token); onLogin(data.user); notify('Welcome back. You are signed in.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="login-layout"><div className="login-art"><div className="login-art-top"><span className="brand-mark"><Dumbbell size={20} /></span><span>form<span className="brand-light">&</span>function</span></div><div className="art-copy"><span className="eyebrow"><span /> BUILT FOR YOUR EVERYDAY</span><h1>Make room<br />for <em>progress.</em></h1><p>Good routines make great communities. Keep your members moving and your gym running smoothly.</p></div><div className="art-bottom"><span><Activity size={17} /> MEMBER EXPERIENCE, MADE SIMPLE</span><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/></div></div><div className="login-main"><div className="login-card"><div className="login-icon"><Dumbbell size={21} /></div><span className="eyebrow muted">YOUR GYM, IN GOOD SHAPE</span><h2>Welcome back</h2><p className="login-sub">Sign in to manage your gym workspace.</p>{error && <div className="error-banner">{error}</div>}<form onSubmit={submit} className="login-form"><label>Email address<input type="email" autoComplete="username" placeholder="you@gym.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><div className="form-note"><ShieldCheck size={15} /> Your account is managed by your gym administrator.</div><button className="primary-btn full-btn" disabled={busy}>{busy ? <><span className="spinner spinner-light" /> Signing in…</> : <>Sign in <ArrowUpRight size={17} /></>}</button></form><div className="login-foot">Secure staff access <span>·</span> Gym Management MVP</div></div><div className="login-help">Need an account? Ask your gym administrator to create staff access.</div></div></div>;
}

function Dashboard({ user, notify }) {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const endpoints = ['/members?limit=100', '/plans?limit=100', '/trainers?limit=100', '/payments?limit=100', '/attendance?limit=100', '/attendance?limit=100&openOnly=true'];
      const [members, plans, trainers, payments, visits, openVisits] = await Promise.all(endpoints.map((path) => api(path)));
      setData({ members: members.items || [], memberCount: members.pagination?.total || 0, plans: plans.items || [], planCount: plans.pagination?.total || 0, trainers: trainers.items || [], trainerCount: trainers.pagination?.total || 0, payments: payments.items || [], paymentCount: payments.pagination?.total || 0, visits: visits.items || [], openVisits: openVisits.items || [] });
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const paid = data?.payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
  const active = data?.members.filter((m) => m.status === 'active').length || 0;
  return <>
    <div className="welcome-row"><div><div className="eyebrow"><span className="green-pip" /> YOUR GYM AT A GLANCE</div><h1>Good day, {user.name.split(' ')[0]} <span className="wave">✳</span></h1><p>Here’s what’s happening at your gym today.</p></div><button className="secondary-btn" onClick={load}><Activity size={16} /> Refresh data</button></div>
    <div className="date-banner"><div className="date-banner-icon"><CalendarDays size={18} /></div><div><b>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b><small>A good day to show up and get stronger.</small></div><span className="banner-decoration">MOVE WELL · FEEL WELL</span></div>
    {error && <ErrorBanner message={error} retry={load} />}
    {loading && !data ? <LoadingBlock label="Loading your gym overview…" /> : <>
      <div className="stats-grid">
        <StatCard label="Total members" value={data?.memberCount || 0} hint={`${active} active memberships`} icon={Users} tone="mint" trend="Members" />
        <StatCard label="Payments collected" value={money(paid)} hint={`${data?.paymentCount || 0} recorded payments`} icon={CircleDollarSign} tone="peach" trend="All time" />
        <StatCard label="Checked in now" value={data?.openVisits.length || 0} hint="Members currently at the gym" icon={Activity} tone="lavender" trend="Live" />
        <StatCard label="Active trainers" value={data?.trainers.filter((t) => t.active).length || 0} hint={`${data?.trainerCount || 0} trainer profiles`} icon={Dumbbell} tone="blue" trend="Team" />
      </div>
      <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow muted">RECENT MOVEMENT</span><h3>Latest check-ins</h3></div><button className="text-btn" onClick={() => window.dispatchEvent(new CustomEvent('gym:navigate', { detail: 'attendance' }))}>View attendance <ArrowUpRight size={15} /></button></div>{data?.visits.length ? <div className="activity-list">{data.visits.slice(0, 6).map((visit) => <div className="activity-row" key={visit._id}><div className="activity-avatar">{initials(`${visit.member?.firstName || ''} ${visit.member?.lastName || ''}`)}</div><div className="activity-info"><b>{visit.member?.firstName || 'Member'} {visit.member?.lastName || ''}</b><small>{visit.checkOutAt ? 'Completed visit' : 'Currently at the gym'}</small></div><span className={`activity-state ${visit.checkOutAt ? '' : 'state-live'}`}>{time(visit.checkInAt)}{!visit.checkOutAt && <i />}</span></div>)}</div> : <EmptyInline title="No visits yet" text="Member check-ins will show here." />}</section>
      <section className="panel quick-panel"><div className="panel-heading"><div><span className="eyebrow muted">QUICK ACCESS</span><h3>Jump back in</h3></div><Ellipsis size={19} className="muted-icon" /></div><div className="quick-links"><QuickLink icon={Users} label="Add a member" detail="Create a new member profile" onClick={() => window.dispatchEvent(new CustomEvent('gym:navigate', { detail: 'members' }))} color="mint" /><QuickLink icon={Wallet} label="Record a payment" detail="Add a member payment" onClick={() => window.dispatchEvent(new CustomEvent('gym:navigate', { detail: 'payments' }))} color="peach" /><QuickLink icon={CalendarDays} label="Check in a member" detail="Log a gym visit" onClick={() => window.dispatchEvent(new CustomEvent('gym:navigate', { detail: 'attendance' }))} color="lavender" /></div></section></div>
      <div className="bottom-grid"><section className="panel plan-summary"><div className="panel-heading"><div><span className="eyebrow muted">MEMBERSHIP OPTIONS</span><h3>Your plans</h3></div><span className="count-pill">{data?.planCount || 0} total</span></div>{data?.plans.length ? data.plans.slice(0, 4).map((plan, i) => <div className="plan-row" key={plan._id}><span className={`plan-dot pdot-${i % 4}`} /><span className="plan-row-name"><b>{plan.name}</b><small>{plan.durationDays} days</small></span><b>{money(plan.price)}</b><Status value={plan.active ? 'active' : 'inactive'} /></div>) : <EmptyInline title="No plans added" text="Create a membership plan to get started." />}</section><section className="panel member-summary"><div className="panel-heading"><div><span className="eyebrow muted">MEMBER SNAPSHOT</span><h3>Recently joined</h3></div><span className="count-pill">{data?.memberCount || 0} members</span></div>{data?.members.length ? data.members.slice(0, 4).map((member) => <div className="member-row" key={member._id}><Person name={`${member.firstName} ${member.lastName}`} sub={member.plan?.name || 'No plan assigned'} /><Status value={member.status} /></div>) : <EmptyInline title="Your member list is empty" text="New members will appear here." />}</section></div>
    </>}
    <div className="dashboard-note"><span><BarChart3 size={16} /></span> Your overview updates from the latest records in your gym database.</div>
  </>;
}

function StatCard({ label, value, hint, icon: Icon, tone, trend }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={18} /></span></div><div className="stat-value">{value}</div><div className="stat-foot"><span>{hint}</span><span className="stat-trend"><ArrowUpRight size={13} /> {trend}</span></div></div>; }
function QuickLink({ icon: Icon, label, detail, onClick, color }) { return <button className="quick-link" onClick={onClick}><span className={`quick-icon ${color}`}><Icon size={17} /></span><span><b>{label}</b><small>{detail}</small></span><ChevronRight size={16} /></button>; }
function Person({ name, sub }) { return <span className="person-cell"><span className="avatar avatar-soft">{initials(name)}</span><span><b>{name}</b><small>{sub}</small></span></span>; }
function Status({ value }) { const normalized = String(value || 'unknown').toLowerCase(); return <span className={`status status-${normalized.replace(/\s/g, '-')}`}><i />{normalized.replace(/-/g, ' ')}</span>; }
function EmptyInline({ title, text }) { return <div className="empty-inline"><div className="empty-icon"><Activity size={18} /></div><b>{title}</b><span>{text}</span></div>; }
function LoadingBlock({ label = 'Loading…' }) { return <div className="loading-block"><span className="spinner" />{label}</div>; }
function ErrorBanner({ message, retry }) { return <div className="error-banner error-wide"><span>{message}</span>{retry && <button className="text-btn" onClick={retry}>Try again</button>}</div>; }

function ResourcePage({ type, user, notify }) {
  const schema = schemas[type]; const [items, setItems] = useState([]); const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 }); const [search, setSearch] = useState(''); const [filter, setFilter] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [modal, setModal] = useState(null); const [working, setWorking] = useState(false); const [options, setOptions] = useState({ plans: [], trainers: [] });
  const canEdit = type !== 'plans' || user.role === 'admin';
  const load = useCallback(async (page = pagination.page, term = search, status = filter) => {
    setLoading(true); setError('');
    try {
      const [result, plansResult, trainersResult] = await Promise.all([
        api(`${schema.path}`, { query: { page, limit: 20, search: term, status } }),
        type === 'members' ? api('/plans', { query: { limit: 100, status: 'active' } }) : Promise.resolve({ items: [] }),
        type === 'members' ? api('/trainers', { query: { limit: 100, status: 'active' } }) : Promise.resolve({ items: [] })
      ]);
      setItems(result.items || []); setPagination(result.pagination || { page, pages: 1, total: 0, limit: 20 }); setOptions({ plans: plansResult.items || [], trainers: trainersResult.items || [] });
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [filter, pagination.page, schema.path, search, type]);
  useEffect(() => { load(1, '', ''); }, [type]);
  useEffect(() => { const timer = setTimeout(() => load(1, search, filter), 250); return () => clearTimeout(timer); }, [search, filter]);

  async function save(values) {
    setWorking(true);
    try { const body = schema.toBody(values); await api(modal.item ? `${schema.path}/${modal.item._id}` : schema.path, { method: modal.item ? 'PATCH' : 'POST', body }); notify(`${schema.singular[0].toUpperCase()}${schema.singular.slice(1)} ${modal.item ? 'updated' : 'created'} successfully.`); setModal(null); await load(); }
    catch (e) { setError(e.message); } finally { setWorking(false); }
  }
  async function archive(item) {
    if (!window.confirm(`Archive ${type === 'plans' ? item.name : `${item.firstName} ${item.lastName}`}?`)) return;
    try { await api(`${schema.path}/${item._id}`, { method: 'DELETE' }); notify(`${schema.singular[0].toUpperCase()}${schema.singular.slice(1)} archived.`); await load(); } catch (e) { setError(e.message); }
  }
  const titleName = type === 'members' ? 'Member directory' : type === 'plans' ? 'Membership plans' : 'Trainer directory';
  const desc = type === 'members' ? 'Keep member profiles, memberships and coaching assignments up to date.' : type === 'plans' ? 'Set up the memberships your gym offers and keep pricing clear.' : 'Manage your coaching team and the specialties they bring.';
  return <>
    <PageHeader eyebrow={type === 'members' ? 'PEOPLE & MEMBERSHIPS' : type === 'plans' ? 'MEMBERSHIP SETUP' : 'YOUR COACHING TEAM'} title={titleName} description={desc} action={canEdit ? <button className="primary-btn" onClick={() => setModal({ item: null })}><Plus size={17} /> Add {schema.singular}</button> : null} />
    <section className="panel table-panel"><div className="table-toolbar"><div className="search-wrap"><Search size={16} /><input placeholder={schema.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>⌘ K</kbd></div><div className="toolbar-right"><label className="filter-select"><Filter size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option><option value={type === 'plans' || type === 'trainers' ? 'active' : 'active'}>Active</option>{type === 'members' && <><option value="inactive">Inactive</option><option value="suspended">Suspended</option></>}</select></label><button className="icon-btn table-menu" title="Refresh" onClick={() => load()}><Activity size={17} /></button></div></div>
      {error && <ErrorBanner message={error} retry={() => load()} />}
      {loading ? <LoadingBlock label={`Loading ${schema.title.toLowerCase()}…`} /> : items.length ? <><div className="table-scroll"><table><thead><tr>{schema.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="actions-col">ACTIONS</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}>{schema.columns.map((column) => <td key={column.key}>{column.render(item)}</td>)}<td><div className="row-actions">{canEdit && <button onClick={() => setModal({ item })}>Edit</button>}{user.role === 'admin' && <button className="danger-link" onClick={() => archive(item)}>Archive</button>}</div></td></tr>)}</tbody></table></div><Pagination pagination={pagination} onPage={(page) => load(page)} /></> : <EmptyPanel title={search ? 'No matching records' : `No ${schema.title.toLowerCase()} yet`} text={search ? 'Try a different search term or filter.' : `Add your first ${schema.singular} to get started.`} action={canEdit && !search ? <button className="secondary-btn" onClick={() => setModal({ item: null })}><Plus size={16} /> Add {schema.singular}</button> : null} />}
    </section>
    {modal && <RecordModal title={`${modal.item ? 'Edit' : 'Add'} ${schema.singular}`} fields={schema.fields(modal.item || {}, options)} onClose={() => setModal(null)} onSave={save} busy={working} submitLabel={modal.item ? 'Save changes' : `Create ${schema.singular}`} />}
  </>;
}

function PageHeader({ eyebrow, title, description, action }) { return <div className="page-header"><div><div className="eyebrow"><span className="green-pip" /> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function Pagination({ pagination, onPage }) { const page = pagination.page || 1; const pages = Math.max(1, pagination.pages || 1); return <div className="pagination"><span>Showing <b>{pagination.total ? Math.min((page - 1) * pagination.limit + 1, pagination.total) : 0}–{Math.min(page * pagination.limit, pagination.total || 0)}</b> of <b>{pagination.total || 0}</b> records</span><div><button className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><span className="page-count">Page {page} of {pages}</span><button className="page-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div></div>; }
function EmptyPanel({ title, text, action }) { return <div className="empty-panel"><div className="empty-icon"><Search size={20} /></div><h3>{title}</h3><p>{text}</p>{action}</div>; }

function RecordModal({ title, fields, onClose, onSave, busy, submitLabel }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.value])));
  const [error, setError] = useState('');
  function submit(e) { e.preventDefault(); setError(''); onSave(values).catch((err) => setError(err.message)); }
  return <ModalFrame title={title} onClose={onClose}><form className="record-form" onSubmit={submit}><div className="form-grid">{fields.map((f) => <label key={f.name} className={`field ${f.wide ? 'field-wide' : ''}`}>{f.label}{f.type === 'textarea' ? <textarea value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} rows="3" /> : f.type === 'select' ? <select value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>{f.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input type={f.type || 'text'} min={f.min} step={f.step} value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} required={f.required} />}</label>)}</div>{error && <div className="error-banner">{error}</div>}<div className="modal-footer"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? <><span className="spinner spinner-light" /> Saving…</> : <><Check size={16} /> {submitLabel}</>}</button></div></form></ModalFrame>;
}

function ModalFrame({ title, children, onClose, size = '' }) { useEffect(() => { const handle = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', handle); document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', handle); document.body.style.overflow = ''; }; }, [onClose]); return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className={`modal-card ${size}`}><div className="modal-heading"><div><span className="eyebrow muted">GYM MANAGEMENT</span><h2>{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button></div>{children}</section></div>; }

function PaymentsPage({ user, notify }) {
  const [items, setItems] = useState([]); const [members, setMembers] = useState([]); const [plans, setPlans] = useState([]); const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 }); const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [modal, setModal] = useState(false); const [busy, setBusy] = useState(false);
  const load = useCallback(async (page = 1, state = status) => { setLoading(true); setError(''); try { const [result, m, p] = await Promise.all([api('/payments', { query: { page, limit: 20, status: state } }), api('/members', { query: { limit: 100 } }), api('/plans', { query: { limit: 100 } })]); setItems(result.items || []); setPagination(result.pagination); setMembers(m.items || []); setPlans(p.items || []); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [status]);
  useEffect(() => { load(1); }, [status]);
  const [form, setForm] = useState({ member: '', plan: '', method: 'cash', status: 'paid', reference: '', notes: '' });
  async function recordPayment(e) { e.preventDefault(); setBusy(true); setError(''); try { await api('/payments', { method: 'POST', body: compact({ ...form, plan: form.plan || undefined, reference: form.reference || undefined, notes: form.notes || undefined }) }); setModal(false); setForm({ member: '', plan: '', method: 'cash', status: 'paid', reference: '', notes: '' }); notify('Payment recorded successfully.'); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function action(item, actionName) { try { if (actionName === 'refund' && !window.confirm(`Record a refund of ${money(item.amount)}?`)) return; await api(`/payments/${item._id}/${actionName === 'mark-paid' ? 'mark-paid' : 'refund'}`, { method: actionName === 'mark-paid' ? 'PATCH' : 'POST' }); notify(actionName === 'mark-paid' ? 'Payment marked as paid.' : 'Refund recorded.'); await load(); } catch (e) { setError(e.message); } }
  return <><PageHeader eyebrow="MONEY IN, CLEARLY TRACKED" title="Payments" description="Keep membership payments in one clear, searchable place." action={<button className="primary-btn" onClick={() => setModal(true)}><Plus size={17} /> Record payment</button>} />
    <div className="payment-kpis"><div className="mini-kpi"><span className="kpi-icon peach"><CircleDollarSign size={17} /></span><span><small>PAID RECORDS</small><b>{items.filter((x) => x.status === 'paid').length}</b></span></div><div className="mini-kpi"><span className="kpi-icon blue"><Clock3 size={17} /></span><span><small>PENDING REVIEW</small><b>{items.filter((x) => x.status === 'pending').length}</b></span></div><div className="mini-kpi"><span className="kpi-icon mint"><ArrowDownLeft size={17} /></span><span><small>PAGE TOTAL</small><b>{money(items.filter((x) => x.status === 'paid').reduce((sum, x) => sum + Number(x.amount || 0), 0))}</b></span></div></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><span className="eyebrow muted">PAYMENT HISTORY</span><h3 className="toolbar-title">Recent transactions</h3></div><label className="filter-select"><Filter size={15} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All payments</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="refunded">Refunded</option></select></label></div>{error && <ErrorBanner message={error} retry={() => load()} />}{loading ? <LoadingBlock label="Loading payments…" /> : items.length ? <><div className="table-scroll"><table><thead><tr><th>MEMBER</th><th>PLAN</th><th>DATE</th><th>METHOD</th><th>AMOUNT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td><Person name={`${item.member?.firstName || 'Member'} ${item.member?.lastName || ''}`} sub={item.member?.email || ''} /></td><td>{item.plan?.name || 'One-off payment'}</td><td>{date(item.paidAt || item.createdAt)}</td><td className="capitalize">{(item.method || '').replace('_', ' ')}</td><td><b>{money(item.amount)}</b></td><td><Status value={item.status} /></td><td><div className="row-actions">{item.status === 'pending' && user.role === 'admin' && <button onClick={() => action(item, 'mark-paid')}>Mark paid</button>}{item.status === 'paid' && user.role === 'admin' && <button className="danger-link" onClick={() => action(item, 'refund')}>Refund</button>}{item.status !== 'pending' && item.status !== 'paid' && '—'}</div></td></tr>)}</tbody></table></div><Pagination pagination={pagination} onPage={(p) => load(p)} /></> : <EmptyPanel title="No payments found" text="Record a payment when a member pays for a plan." action={<button className="secondary-btn" onClick={() => setModal(true)}><Plus size={16} /> Record payment</button>} />}</section>
    {modal && <ModalFrame title="Record a payment" onClose={() => setModal(false)}><form className="record-form" onSubmit={recordPayment}><div className="form-grid"><label className="field field-wide">Member<select required value={form.member} onChange={(e) => setForm({ ...form, member: e.target.value })}><option value="">Choose a member</option>{members.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName} · {m.email}</option>)}</select></label><label className="field field-wide">Membership plan (optional)<select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}><option value="">One-off amount instead</option>{plans.filter((p) => p.active).map((p) => <option key={p._id} value={p._id}>{p.name} · {money(p.price)}</option>)}</select><small>A paid plan payment starts or extends the member’s membership.</small></label>{!form.plan && <label className="field">Amount (₦)<input type="number" min="0.01" step="0.01" value={form.amount || ''} required onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>}<label className="field">Payment method<select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="other">Other</option></select></label><label className="field">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="paid">Paid</option><option value="pending">Pending</option></select></label><label className="field">Reference<input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional receipt/reference" /></label><label className="field field-wide">Notes<textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div>{error && <div className="error-banner">{error}</div>}<p className="form-note"><ShieldCheck size={15} /> This records a payment only; it does not charge a card or transfer money.</p><div className="modal-footer"><button type="button" className="secondary-btn" onClick={() => setModal(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Recording…' : <><Check size={16} /> Record payment</>}</button></div></form></ModalFrame>}
  </>;
}

function AttendancePage({ notify }) {
  const [items, setItems] = useState([]); const [members, setMembers] = useState([]); const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 }); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [modal, setModal] = useState(false); const [member, setMember] = useState(''); const [busy, setBusy] = useState(false); const [openOnly, setOpenOnly] = useState(false);
  const load = useCallback(async (page = 1, only = openOnly) => { setLoading(true); setError(''); try { const [result, m] = await Promise.all([api('/attendance', { query: { page, limit: 20, openOnly: only ? 'true' : '' } }), api('/members', { query: { limit: 100, status: 'active' } })]); setItems(result.items || []); setPagination(result.pagination); setMembers(m.items || []); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [openOnly]);
  useEffect(() => { load(1); }, [openOnly]);
  async function checkIn(e) { e.preventDefault(); setBusy(true); try { await api('/attendance/check-in', { method: 'POST', body: { member } }); notify('Member checked in.'); setModal(false); setMember(''); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function checkOut(item) { try { await api(`/attendance/${item._id}/check-out`, { method: 'PATCH', body: {} }); notify('Member checked out.'); await load(); } catch (e) { setError(e.message); } }
  const current = items.filter((item) => !item.checkOutAt).length;
  return <><PageHeader eyebrow="SHOWING UP IS THE FIRST REP" title="Attendance" description="A live view of who is at the gym and the visits they have made." action={<button className="primary-btn" onClick={() => setModal(true)}><Plus size={17} /> Check in member</button>} />
    <div className="attendance-banner"><div className="attendance-live"><span className="live-pulse" /><span><small>IN THE GYM RIGHT NOW</small><b>{current} <em>members</em></b></span></div><span className="attendance-tip">Check-out closes a member’s active visit.</span></div>
    <section className="panel table-panel"><div className="table-toolbar"><div><span className="eyebrow muted">VISIT LOG</span><h3 className="toolbar-title">Member attendance</h3></div><label className="check-toggle"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /><span className="toggle-track" /> Show checked in only</label></div>{error && <ErrorBanner message={error} retry={() => load()} />}{loading ? <LoadingBlock label="Loading attendance…" /> : items.length ? <><div className="table-scroll"><table><thead><tr><th>MEMBER</th><th>CHECK-IN</th><th>CHECK-OUT</th><th>VISIT DATE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td><Person name={`${item.member?.firstName || 'Member'} ${item.member?.lastName || ''}`} sub={item.member?.email || ''} /></td><td>{time(item.checkInAt)}</td><td>{time(item.checkOutAt)}</td><td>{date(item.checkInAt)}</td><td><Status value={item.checkOutAt ? 'completed' : 'checked-in'} /></td><td>{!item.checkOutAt ? <button className="small-action" onClick={() => checkOut(item)}><ArrowUpRight size={14} /> Check out</button> : <span className="muted-text">Visit closed</span>}</td></tr>)}</tbody></table></div><Pagination pagination={pagination} onPage={(p) => load(p)} /></> : <EmptyPanel title="No visits recorded" text="Check in a member to start today's visit log." action={<button className="secondary-btn" onClick={() => setModal(true)}><Plus size={16} /> Check in member</button>} />}</section>
    {modal && <ModalFrame title="Check in a member" onClose={() => setModal(false)}><form className="record-form" onSubmit={checkIn}><p className="modal-copy">Only members with an active, current membership can check in.</p><label className="field">Choose a member<select value={member} onChange={(e) => setMember(e.target.value)} required><option value="">Select a member</option>{members.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName} · {m.email}</option>)}</select></label>{error && <div className="error-banner">{error}</div>}<div className="modal-footer"><button type="button" className="secondary-btn" onClick={() => setModal(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Checking in…' : <><Check size={16} /> Confirm check-in</>}</button></div></form></ModalFrame>}
  </>;
}

function TeamPage({ notify }) {
  const [items, setItems] = useState([]); const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 }); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [modal, setModal] = useState(false); const [busy, setBusy] = useState(false); const [form, setForm] = useState({ name: '', email: '', password: '' });
  const load = useCallback(async (page = 1) => { setLoading(true); setError(''); try { const result = await api('/users', { query: { page, limit: 20 } }); setItems(result.items || []); setPagination(result.pagination); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  async function createStaff(e) { e.preventDefault(); setBusy(true); try { await api('/auth/staff', { method: 'POST', body: form }); setModal(false); setForm({ name: '', email: '', password: '' }); notify('Staff account created.'); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function toggleActive(user) { try { await api(`/users/${user._id || user.id}/active`, { method: 'PATCH', body: { active: !user.active } }); notify(`Account ${user.active ? 'deactivated' : 'activated'}.`); await load(); } catch (e) { setError(e.message); } }
  return <><PageHeader eyebrow="PEOPLE WHO KEEP THE GYM MOVING" title="Team access" description="Create staff logins and control who can access the gym workspace." action={<button className="primary-btn" onClick={() => setModal(true)}><Plus size={17} /> Add staff member</button>} /><div className="team-info"><ShieldCheck size={18} /><span><b>Admin control</b><small>Staff can manage day-to-day gym records. Only admins can manage plans, refunds and team access.</small></span></div><section className="panel table-panel"><div className="table-toolbar"><div><span className="eyebrow muted">STAFF ACCOUNTS</span><h3 className="toolbar-title">Workspace team</h3></div></div>{error && <ErrorBanner message={error} retry={() => load()} />}{loading ? <LoadingBlock label="Loading team…" /> : items.length ? <><div className="table-scroll"><table><thead><tr><th>TEAM MEMBER</th><th>ROLE</th><th>STATUS</th><th>JOINED</th><th>ACTIONS</th></tr></thead><tbody>{items.map((item) => <tr key={item._id || item.id}><td><Person name={item.name} sub={item.email} /></td><td className="capitalize">{item.role}</td><td><Status value={item.active ? 'active' : 'inactive'} /></td><td>{date(item.createdAt)}</td><td>{item.role !== 'admin' ? <button className="row-action-link" onClick={() => toggleActive(item)}>{item.active ? 'Deactivate' : 'Reactivate'}</button> : <span className="muted-text">Protected admin</span>}</td></tr>)}</tbody></table></div><Pagination pagination={pagination} onPage={load} /></> : <EmptyPanel title="No team accounts found" text="Create a staff login for someone who helps run the gym." />}</section>{modal && <ModalFrame title="Create staff login" onClose={() => setModal(false)}><form className="record-form" onSubmit={createStaff}><div className="form-grid"><label className="field field-wide">Full name<input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="field field-wide">Email address<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="field field-wide">Temporary password<input type="password" minLength="8" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><small>Use at least 8 characters and share it with the staff member securely.</small></label></div>{error && <div className="error-banner">{error}</div>}<div className="modal-footer"><button type="button" className="secondary-btn" onClick={() => setModal(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Creating…' : 'Create staff account'}</button></div></form></ModalFrame>}</>;
}

function useNavigationEvents(setSection) { useEffect(() => { const handler = (e) => setSection(e.detail); window.addEventListener('gym:navigate', handler); return () => window.removeEventListener('gym:navigate', handler); }, [setSection]); }
