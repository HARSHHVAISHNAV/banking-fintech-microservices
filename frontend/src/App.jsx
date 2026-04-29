import { useState, useEffect, useCallback } from 'react'
import {
  getAccount, getHistory, getStatement, sendMoney, login,
  adminGetAllUsers, adminCreateUser, adminUpdateUser, adminDeleteUser,
} from './services/api.js'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt     = (n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
const uid     = () => crypto.randomUUID()

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy:        #0a1628;
    --navy-mid:    #112240;
    --navy-light:  #1a3a5c;
    --gold:        #c9a84c;
    --gold-light:  #e8c97a;
    --gold-pale:   #f5e9c8;
    --cream:       #faf7f2;
    --white:       #ffffff;
    --green:       #22c55e;
    --red:         #ef4444;
    --border:      #e8e2d9;
    --border-dark: rgba(255,255,255,0.08);
    --text-primary:#0a1628;
    --text-secondary:#6b7280;
    --text-muted:  #9ca3af;
    --shadow-sm:   0 1px 3px rgba(0,0,0,0.06);
    --shadow-md:   0 4px 16px rgba(0,0,0,0.08);
    --shadow-lg:   0 12px 40px rgba(0,0,0,0.14);
    --r-sm:        8px;
    --r-md:        12px;
    --r-lg:        20px;
    --font-serif:  'Instrument Serif', Georgia, serif;
    --font-sans:   'DM Sans', system-ui, sans-serif;
    --font-mono:   'JetBrains Mono', monospace;
  }

  body { font-family: var(--font-sans); background: var(--cream); color: var(--text-primary); }

  @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(20px) } to { opacity: 1; transform: none } }
  @keyframes pulse   { 0%,100% { opacity: 1 } 50% { opacity: .4 } }

  .skeleton { background: linear-gradient(90deg,#f0ece4 25%,#e8e2d9 50%,#f0ece4 75%);
    background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: var(--r-sm); }
  @keyframes shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }

  input, button { font-family: var(--font-sans); }
  input:focus { outline: none; }

  /* scrollbar */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

  /* admin badge */
  .admin-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700;
    letter-spacing: 0.08em; background: var(--gold-pale); color: #92680a;
    border: 1px solid var(--gold);
  }
  .user-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700;
    letter-spacing: 0.08em; background: #eff6ff; color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }
  .status-active  { color: var(--green); background: #f0fdf4; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
  .status-inactive{ color: var(--red);   background: #fef2f2; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
`

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const icons = {
    home:     <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>,
    send:     <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    history:  <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></>,
    statement:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    logout:   <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    arrow_up: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrow_dn: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    check:    <polyline points="20 6 9 17 4 12"/>,
    x:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    refresh:  <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>,
    bank:     <><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 2 7 22 7"/></>,
    users:    <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    edit:     <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash:    <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    shield:   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    filter:   <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    eye:      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eye_off:  <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    wallet:   <><path d="M20 12V22H4a2 2 0 01-2-2V6a2 2 0 012-2h16v4"/><path d="M22 12h-4a2 2 0 000 4h4v-4z"/></>,
    copy:     <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  )
}

// ─── COPY UUID ────────────────────────────────────────────────────────────────
const CopyUUID = ({ value, label }) => {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
      {label && <span style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--text-secondary)', wordBreak: 'break-all',
      }}>{value}</span>
      <button onClick={copy} title="Copy" style={{
        flexShrink: 0, background: copied ? '#f0fdf4' : 'var(--cream)',
        border: `1px solid ${copied ? '#bbf7d0' : 'var(--border)'}`,
        borderRadius: 5, padding: '2px 6px', cursor: 'pointer',
        color: copied ? 'var(--green)' : 'var(--text-muted)',
        fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
        transition: 'all 0.2s',
      }}>
        <Icon name={copied ? 'check' : 'copy'} size={10} />
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
const Spinner = ({ size = 18, color = 'var(--gold)' }) => (
  <div style={{
    width: size, height: size,
    border: `2px solid ${color}30`,
    borderTop: `2px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block', flexShrink: 0,
  }} />
)

// ─── TOAST ────────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null
  const ok = toast.type === 'success'
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: ok ? '#112240' : '#7f1d1d',
      color: '#fff', padding: '14px 20px', borderRadius: '12px',
      borderRadius: '12px',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500,
      boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
      borderLeft: `3px solid ${ok ? 'var(--gold)' : '#f87171'}`,
      animation: 'slideIn 0.3s ease',
      maxWidth: 380,
    }}>
      <Icon name={ok ? 'check' : 'x'} size={15} />
      {toast.message}
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, width = 480 }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  }} onClick={onClose}>
    <div style={{
      width: '100%', maxWidth: width, background: '#fff',
      borderRadius: '20px', padding: 32,
      boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
      animation: 'fadeUp 0.25s ease',
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--navy)' }}>{title}</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: 4,
        }}><Icon name="x" size={18} /></button>
      </div>
      {children}
    </div>
  </div>
)

// ─── INPUT ────────────────────────────────────────────────────────────────────
const Input = ({ label, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {label && <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</label>}
    <input {...props} style={{
      width: '100%', padding: '11px 14px',
      borderRadius: 'var(--r-sm)', border: '1px solid var(--border)',
      fontSize: 14, color: 'var(--navy)', background: 'var(--cream)',
      transition: 'border-color 0.15s',
      ...(props.style || {}),
    }}
      onFocus={e => e.target.style.borderColor = 'var(--gold)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  </div>
)

// ─── BTN ──────────────────────────────────────────────────────────────────────
const Btn = ({ children, variant = 'primary', loading, icon, style: s, ...props }) => {
  const styles = {
    primary: { background: 'var(--navy)', color: '#fff', border: 'none' },
    gold:    { background: 'var(--gold)', color: 'var(--navy)', border: 'none' },
    outline: { background: 'transparent', color: 'var(--navy)', border: '1px solid var(--border)' },
    danger:  { background: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' },
    ghost:   { background: 'transparent', color: 'var(--text-secondary)', border: 'none' },
  }
  return (
    <button {...props} disabled={loading || props.disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      padding: '10px 18px', borderRadius: 'var(--r-sm)',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      transition: 'opacity 0.15s, transform 0.1s',
      opacity: (loading || props.disabled) ? 0.65 : 1,
      fontFamily: 'var(--font-sans)',
      ...styles[variant],
      ...(s || {}),
    }}
      onMouseDown={e => { if (!loading && !props.disabled) e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => e.currentTarget.style.transform = 'none'}
      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
    >
      {loading ? <Spinner size={14} color={variant === 'primary' || variant === 'gold' ? '#fff' : 'var(--gold)'} /> : icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  )
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────
const PageHeader = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.14em', marginBottom: 6, fontWeight: 500 }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
      </div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, color: 'var(--navy)', lineHeight: 1.1 }}>{title}</h1>
      {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>{subtitle}</p>}
    </div>
    {action}
  </div>
)

// ─── TXN ROW ──────────────────────────────────────────────────────────────────
const TxnRow = ({ txn, accountId, compact = false }) => {
  const isDebit = txn.from_account === accountId
  const statusColor = { APPROVED: 'var(--green)', PENDING: '#d97706', FAILED: 'var(--red)' }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: compact ? '12px 0' : '16px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--r-sm)',
          background: isDebit ? '#fef2f2' : '#f0fdf4',
          color: isDebit ? 'var(--red)' : 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name={isDebit ? 'arrow_up' : 'arrow_dn'} size={15} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {isDebit ? 'Transfer sent' : 'Transfer received'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {fmtDate(txn.created_at)}
          </div>
          <CopyUUID value={txn.transaction_id} label="TXN:" />
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: isDebit ? 'var(--red)' : 'var(--green)' }}>
          {isDebit ? '−' : '+'}{fmt(txn.amount)}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: statusColor[txn.status] || 'var(--text-muted)', marginTop: 2 }}>
          {txn.status}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  USER PAGES
// ══════════════════════════════════════════════════════════════════════════════

// ─── USER DASHBOARD ───────────────────────────────────────────────────────────
const UserDashboard = ({ account, transactions, loading, onRefresh, setPage, user }) => {
  const accountId = account?.account_id
  const totalIn   = transactions.filter(t => t.to_account   === accountId).reduce((s, t) => s + Number(t.amount), 0)
  const totalOut  = transactions.filter(t => t.from_account === accountId).reduce((s, t) => s + Number(t.amount), 0)
  const recent    = [...transactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <PageHeader
        title={`Good morning, ${user?.name?.split(' ')[0] || 'there'}.`}
        subtitle="Here's your financial overview for today."
        action={
          <Btn variant="outline" icon={loading ? null : 'refresh'} loading={loading} onClick={onRefresh}>
            Refresh
          </Btn>
        }
      />

      {/* Hero balance */}
      <div style={{
        background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
        borderRadius: 'var(--r-lg)', padding: '36px 40px', marginBottom: 20,
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(10,22,40,0.28)',
        animation: 'fadeUp 0.4s ease both',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.12)' }} />
        <div style={{ position: 'absolute', top: -20, right: -20, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.08)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: '0.18em', marginBottom: 10, fontWeight: 600 }}>AVAILABLE BALANCE</div>
          {loading
            ? <div className="skeleton" style={{ width: 220, height: 52, marginBottom: 10, background: 'rgba(255,255,255,0.08)' }} />
            : <div style={{ fontFamily: 'var(--font-serif)', fontSize: 54, color: '#fff', lineHeight: 1, marginBottom: 8 }}>
                {account ? fmt(account.balance) : '—'}
              </div>
          }
          <div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
            {account?.upi_id || 'Primary Account'} · {account?.status || ''}
          </div>
          {account?.account_id && (
            <div style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px',
              display: 'inline-flex', marginTop: 4,
            }}>
              <div style={{ '--text-muted': 'rgba(255,255,255,0.5)', '--text-secondary': 'rgba(255,255,255,0.85)', '--border': 'rgba(255,255,255,0.15)', '--cream': 'rgba(255,255,255,0.08)', '--green': '#4ade80' }}>
                <CopyUUID value={account.account_id} label="ACCOUNT ID:" />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 32, marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { label: 'TOTAL IN',      value: `+${fmt(totalIn)}`,          color: '#4ade80' },
              { label: 'TOTAL OUT',     value: `−${fmt(totalOut)}`,         color: '#f87171' },
              { label: 'TRANSACTIONS',  value: transactions.length,         color: '#fff'    },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: '0.14em', marginBottom: 4, fontWeight: 600 }}>{label}</div>
                <div style={{ color, fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-serif)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Send Money',   icon: 'send',      page: 'send',      color: 'var(--navy)' },
          { label: 'History',      icon: 'history',   page: 'history',   color: '#0369a1'     },
          { label: 'Statement',    icon: 'statement', page: 'statement', color: '#047857'     },
        ].map(({ label, icon, page, color }) => (
          <button key={page} onClick={() => setPage(page)} style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
            padding: '20px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10, transition: 'all 0.15s',
            boxShadow: 'var(--shadow-sm)',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 'var(--r-sm)', background: color + '12', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon} size={20} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Recent transactions */}
      <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px', border: '1px solid var(--border)', animation: 'fadeUp 0.5s ease 0.15s both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--navy)' }}>Recent Transactions</h2>
          <button onClick={() => setPage('history')} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View all →</button>
        </div>
        {loading
          ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, margin: '10px 0' }} />)
          : recent.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>No transactions yet</div>
            : recent.map(t => <TxnRow key={t.transaction_id} txn={t} accountId={accountId} compact />)
        }
      </div>
    </div>
  )
}

// ─── SEND MONEY ───────────────────────────────────────────────────────────────
const SendMoney = ({ accountId, onSuccess }) => {
  const [form, setForm]     = useState({ to: '', amount: '' })
  const [loading, setLoading] = useState(false)
  const [status, setStatus]  = useState(null)
  const [errMsg, setErrMsg]  = useState('')

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) return setErrMsg('Enter a valid amount')
    if (!form.to.trim()) return setErrMsg('Enter recipient account ID')
    setLoading(true); setStatus(null); setErrMsg('')
    try {
      await sendMoney({ from_account: accountId, to_account: form.to, amount: Number(form.amount), idempotencyKey: uid() })
      setStatus('success')
      setForm(f => ({ ...f, amount: '' }))
      onSuccess()
    } catch (e) {
      setStatus('error')
      setErrMsg(e.response?.data?.error || 'Transfer failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 540 }}>
      <PageHeader title="Send Money" subtitle="Transfer funds to any account instantly." />
      <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 36, border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
        {/* Amount */}
        <div style={{ textAlign: 'center', marginBottom: 32, padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.14em', marginBottom: 12, fontWeight: 600 }}>AMOUNT TO SEND</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 42, color: 'var(--text-muted)' }}>$</span>
            <input
              type="number" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              style={{
                border: 'none', outline: 'none', fontSize: 54, fontWeight: 700,
                fontFamily: 'var(--font-serif)', color: 'var(--navy)',
                width: 220, textAlign: 'center', background: 'transparent',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div style={{ padding: '14px 18px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--cream)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600 }}>FROM — YOUR ACCOUNT ID</div>
            <div style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14, marginBottom: 6 }}>Primary Account</div>
            <CopyUUID value={accountId} />
          </div>
          <Input
            label="TO (RECIPIENT ACCOUNT UUID)"
            placeholder="Enter recipient account UUID"
            value={form.to}
            onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
          />
        </div>

        {errMsg && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 'var(--r-sm)', color: 'var(--red)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="x" size={13} /> {errMsg}
          </div>
        )}
        {status === 'success' && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 'var(--r-sm)', color: 'var(--green)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size={13} /> Transfer initiated successfully!
          </div>
        )}

        <Btn variant="primary" loading={loading} icon="send" onClick={handleSubmit} style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 'var(--r-md)' }}>
          Send Money
        </Btn>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
          Secured by Kafka event streaming and fraud detection
        </p>
      </div>
    </div>
  )
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
const History = ({ transactions, loading, onRefresh, accountId }) => {
  const [filter, setFilter] = useState('ALL')
  const filtered = transactions
    .filter(t => filter === 'ALL' || t.status === filter)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <PageHeader
        title="Transaction History"
        subtitle={`${transactions.length} total transactions`}
        action={<Btn variant="outline" icon={loading ? null : 'refresh'} loading={loading} onClick={onRefresh}>Refresh</Btn>}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['ALL', 'APPROVED', 'PENDING', 'FAILED'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 99,
            background: filter === f ? 'var(--navy)' : '#fff',
            color: filter === f ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${filter === f ? 'var(--navy)' : 'var(--border)'}`,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>{f}</button>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '8px 24px', border: '1px solid var(--border)' }}>
        {loading
          ? [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, margin: '10px 0' }} />)
          : filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)' }}>
                <Icon name="history" size={32} />
                <p style={{ marginTop: 12, fontSize: 14 }}>No transactions found</p>
              </div>
            : filtered.map(t => <TxnRow key={t.transaction_id} txn={t} accountId={accountId} />)
        }
      </div>
    </div>
  )
}

// ─── STATEMENT ────────────────────────────────────────────────────────────────
const Statement = ({ accountId }) => {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0])
  const [to, setTo]     = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(''); setData(null)
    try { setData(await getStatement(accountId, from, to)) }
    catch (e) { setError(e.response?.data?.error || 'Failed to load statement') }
    finally { setLoading(false) }
  }, [accountId, from, to])

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <PageHeader title="Account Statement" subtitle="Running balance for a selected date range." />
      <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 24, border: '1px solid var(--border)', marginBottom: 20, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <Input label="FROM DATE" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <Input label="TO DATE" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <Btn variant="primary" icon={loading ? null : 'filter'} loading={loading} onClick={load} style={{ padding: '11px 24px', whiteSpace: 'nowrap' }}>
          Generate
        </Btn>
      </div>
      {error && <div style={{ padding: 14, background: '#fef2f2', borderRadius: 'var(--r-md)', color: 'var(--red)', marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {data && (
        <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', background: 'var(--navy)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: '0.14em', fontWeight: 600 }}>STATEMENT PERIOD</div>
              <div style={{ color: '#fff', fontFamily: 'var(--font-serif)', fontSize: 18, marginTop: 2 }}>{fmtDate(from)} — {fmtDate(to)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: '0.14em', fontWeight: 600 }}>TRANSACTIONS</div>
              <div style={{ color: 'var(--gold)', fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>{data.statement?.length || 0}</div>
            </div>
          </div>
          <div style={{ padding: '0 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 110px', padding: '12px 0', borderBottom: '2px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 700 }}>
              <span>TRANSACTION</span><span>TYPE</span><span style={{ textAlign: 'right' }}>AMOUNT</span><span style={{ textAlign: 'right' }}>BALANCE</span>
            </div>
            {!data.statement?.length
              ? <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>No transactions in this period</div>
              : data.statement.map((entry, i) => (
                <div key={entry.transaction_id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 110px', padding: '14px 0', borderBottom: i < data.statement.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{entry.direction === 'DEBIT' ? 'Transfer out' : 'Transfer in'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{fmtDate(entry.created_at)} · {fmtTime(entry.created_at)}</div>
                    <CopyUUID value={entry.transaction_id} label="TXN:" />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: entry.direction === 'DEBIT' ? 'var(--red)' : 'var(--green)', padding: '3px 8px', borderRadius: 4, background: entry.direction === 'DEBIT' ? '#fef2f2' : '#f0fdf4', width: 'fit-content' }}>{entry.direction}</span>
                  <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 14, color: entry.direction === 'DEBIT' ? 'var(--red)' : 'var(--green)' }}>
                    {entry.direction === 'DEBIT' ? '−' : '+'}{fmt(entry.amount)}
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--navy)', fontWeight: 500 }}>{fmt(entry.balance_after)}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}
      {!data && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Icon name="statement" size={36} />
          <p style={{ marginTop: 14, fontSize: 15 }}>Select a date range and click Generate</p>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN PAGES
// ══════════════════════════════════════════════════════════════════════════════

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
const AdminDashboard = ({ users, loading }) => {
  const totalBalance = users.reduce((s, u) => s + Number(u.balance || 0), 0)
  const activeUsers  = users.filter(u => u.status === 'ACTIVE').length
  const cards = [
    { label: 'TOTAL USERS',    value: users.filter(u => u.role !== 'admin').length, icon: 'users',    color: '#3b82f6' },
    { label: 'TOTAL BALANCE',  value: fmt(totalBalance),                             icon: 'wallet',   color: 'var(--gold)' },
    { label: 'ACTIVE ACCOUNTS',value: activeUsers,                                  icon: 'check',    color: 'var(--green)' },
    { label: 'INACTIVE',       value: users.length - activeUsers,                   icon: 'x',        color: 'var(--red)' },
  ]

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <PageHeader title="Admin Overview" subtitle="System-wide banking statistics." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {cards.map(({ label, value, icon, color }, i) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 'var(--r-lg)', padding: 24,
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
            animation: `fadeUp 0.4s ease ${i * 0.06}s both`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 8, fontWeight: 600 }}>{label}</div>
                {loading
                  ? <div className="skeleton" style={{ width: 80, height: 28 }} />
                  : <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--navy)', lineHeight: 1 }}>{value}</div>
                }
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: color + '15', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent users preview */}
      <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--navy)' }}>Recent Users</h2>
        </div>
        {loading
          ? <div style={{ padding: 24 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, margin: '8px 0' }} />)}</div>
          : users.filter(u => u.role !== 'admin').slice(0, 5).map((u, i, arr) => (
            <div key={u.user_id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 24px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--navy), var(--navy-light))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--navy)' }}>{u.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.email}</div>
                <CopyUUID value={u.account_id} label="ACC:" />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{fmt(u.balance || 0)}</div>
                <span className={u.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}>{u.status}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── ADMIN USER MANAGEMENT ───────────────────────────────────────────────────
const AdminUsers = ({ users, loading, onRefresh, showToast }) => {
  const [search, setSearch]     = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [deleteUser, setDeleteUser] = useState(null)
  const [showPwd, setShowPwd]   = useState(false)

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', mobile: '', initial_balance: '1000' })
  const [createLoading, setCreateLoading] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filtered = users.filter(u => u.role !== 'admin').filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      showToast('Name, email and password are required', 'error'); return
    }
    setCreateLoading(true)
    try {
      await adminCreateUser({ ...createForm, initial_balance: Number(createForm.initial_balance) || 1000 })
      showToast('User account created successfully!')
      setShowCreate(false)
      setCreateForm({ name: '', email: '', password: '', mobile: '', initial_balance: '1000' })
      onRefresh()
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to create user', 'error')
    } finally { setCreateLoading(false) }
  }

  const handleEdit = async () => {
    setEditLoading(true)
    try {
      await adminUpdateUser(editUser.user_id, editForm)
      showToast('User updated successfully!')
      setEditUser(null)
      onRefresh()
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to update user', 'error')
    } finally { setEditLoading(false) }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await adminDeleteUser(deleteUser.user_id)
      showToast('User deleted successfully!')
      setDeleteUser(null)
      onRefresh()
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to delete user', 'error')
    } finally { setDeleteLoading(false) }
  }

  const openEdit = (u) => {
    setEditUser(u)
    setEditForm({ name: u.name, email: u.email, mobile: u.mobile || '', balance: u.balance, status: u.status })
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s ease' }}>
      <PageHeader
        title="User Management"
        subtitle={`${filtered.length} user${filtered.length !== 1 ? 's' : ''} in the system`}
        action={<Btn variant="gold" icon="plus" onClick={() => setShowCreate(true)}>Create User</Btn>}
      />

      {/* Search */}
      <div style={{ background: '#fff', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="filter" size={16} color="var(--text-muted)" />
        <input
          placeholder="Search users by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--navy)', background: 'transparent' }}
        />
        <Btn variant="ghost" icon={loading ? null : 'refresh'} loading={loading} onClick={onRefresh} style={{ padding: '4px 8px' }} />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 100px', padding: '12px 24px', background: 'var(--cream)', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 700 }}>
          <span>USER</span><span>ACCOUNT</span><span>BALANCE</span><span>STATUS</span><span>JOINED</span><span style={{ textAlign: 'right' }}>ACTIONS</span>
        </div>
        {loading
          ? <div style={{ padding: 24 }}>{[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56, margin: '8px 0' }} />)}</div>
          : filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)' }}>
                <Icon name="users" size={32} />
                <p style={{ marginTop: 12, fontSize: 14 }}>No users found</p>
              </div>
            : filtered.map((u, i) => (
              <div key={u.user_id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 100px',
                padding: '14px 24px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--navy), var(--navy-light))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                </div>
                <div>
                  <CopyUUID value={u.account_id} label="ACC:" />
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4 }}>{u.upi_id}</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)', fontFamily: 'var(--font-serif)' }}>{fmt(u.balance || 0)}</div>
                <div><span className={u.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}>{u.status}</span></div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(u.created_at)}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => openEdit(u)} title="Edit" style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: '#eff6ff', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="edit" size={13} />
                  </button>
                  <button onClick={() => setDeleteUser(u)} title="Delete" style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: '#fef2f2', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            ))
        }
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <Modal title="Create New User Account" onClose={() => setShowCreate(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="FULL NAME" placeholder="John Doe" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="EMAIL ADDRESS" type="email" placeholder="john@example.com" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
            <div style={{ position: 'relative' }}>
              <Input label="PASSWORD" type={showPwd ? 'text' : 'password'} placeholder="Minimum 8 characters" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} />
              <button onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 12, bottom: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <Icon name={showPwd ? 'eye_off' : 'eye'} size={15} />
              </button>
            </div>
            <Input label="MOBILE (optional)" type="tel" placeholder="+91 98765 43210" value={createForm.mobile} onChange={e => setCreateForm(f => ({ ...f, mobile: e.target.value }))} />
            <Input label="INITIAL BALANCE ($)" type="number" placeholder="1000" value={createForm.initial_balance} onChange={e => setCreateForm(f => ({ ...f, initial_balance: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <Btn variant="outline" onClick={() => setShowCreate(false)}>Cancel</Btn>
            <Btn variant="gold" loading={createLoading} icon="plus" onClick={handleCreate}>Create Account</Btn>
          </div>
        </Modal>
      )}

      {/* ── EDIT MODAL ── */}
      {editUser && (
        <Modal title={`Edit — ${editUser.name}`} onClose={() => setEditUser(null)}>
          <div style={{ background: 'var(--cream)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <CopyUUID value={editUser.user_id} label="USER ID:" />
            <CopyUUID value={editUser.account_id} label="ACCT ID:" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="FULL NAME" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="EMAIL" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="MOBILE" value={editForm.mobile} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} />
            <Input label="BALANCE ($)" type="number" value={editForm.balance} onChange={e => setEditForm(f => ({ ...f, balance: e.target.value }))} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>ACCOUNT STATUS</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} style={{ padding: '11px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 14, color: 'var(--navy)', background: 'var(--cream)', fontFamily: 'var(--font-sans)' }}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="FROZEN">FROZEN</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <Btn variant="outline" onClick={() => setEditUser(null)}>Cancel</Btn>
            <Btn variant="primary" loading={editLoading} icon="check" onClick={handleEdit}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteUser && (
        <Modal title="Delete User Account" onClose={() => setDeleteUser(null)} width={400}>
          <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon name="trash" size={24} />
            </div>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--navy)' }}>{deleteUser.name}</strong>? This will permanently remove their account and all associated data.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Btn>
            <Btn variant="danger" loading={deleteLoading} icon="trash" onClick={handleDelete} style={{ background: 'var(--red)', color: '#fff', border: 'none' }}>Delete Permanently</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════════════════════════
const Sidebar = ({ page, setPage, account, user, onLogout }) => {
  const isAdmin = user?.role === 'admin'
  const userNav = [
    { id: 'dashboard', label: 'Dashboard',   icon: 'home'      },
    { id: 'send',      label: 'Send Money',  icon: 'send'      },
    { id: 'history',   label: 'History',     icon: 'history'   },
    { id: 'statement', label: 'Statement',   icon: 'statement' },
  ]
  const adminNav = [
    { id: 'admin_dashboard', label: 'Overview',    icon: 'trending' },
    { id: 'admin_users',     label: 'Users',        icon: 'users'    },
  ]
  const nav = isAdmin ? adminNav : userNav

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: 'var(--navy)',
      display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 22px', borderBottom: '1px solid var(--border-dark)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--gold)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bank" size={17} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', color: '#fff', fontSize: 20, lineHeight: 1 }}>NexBank</div>
            <div style={{ color: 'var(--gold)', fontSize: 9, letterSpacing: '0.18em', marginTop: 2, fontWeight: 600 }}>DIGITAL BANKING</div>
          </div>
        </div>
      </div>

      {/* Role badge + balance */}
      <div style={{ padding: '14px 18px', margin: '14px 12px', background: 'rgba(201,168,76,0.08)', borderRadius: 'var(--r-md)', border: '1px solid rgba(201,168,76,0.18)' }}>
        <div style={{ marginBottom: 8 }}>
          <span className={isAdmin ? 'admin-badge' : 'user-badge'}>
            <Icon name={isAdmin ? 'shield' : 'wallet'} size={10} />
            {isAdmin ? 'ADMIN' : 'USER'}
          </span>
        </div>
        {isAdmin
          ? <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Full system access</div>
          : <>
              <div style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: '0.14em', marginBottom: 3, fontWeight: 600 }}>BALANCE</div>
              <div style={{ color: '#fff', fontSize: 20, fontFamily: 'var(--font-serif)' }}>{account ? fmt(account.balance) : '—'}</div>
            </>
        }
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 12px' }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px', borderRadius: 'var(--r-sm)', border: 'none',
            background: page === item.id ? 'rgba(201,168,76,0.14)' : 'transparent',
            color: page === item.id ? 'var(--gold-light)' : 'rgba(255,255,255,0.45)',
            fontSize: 13, fontWeight: page === item.id ? 600 : 400,
            cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
            borderLeft: page === item.id ? '2px solid var(--gold)' : '2px solid transparent',
            marginBottom: 2,
          }}>
            <Icon name={item.icon} size={15} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border-dark)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--navy-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
          <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 4 }}>
            <Icon name="logout" size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const LoginPage = ({ onAuth }) => {
  const [form, setForm]   = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      const data = await login(form.email, form.password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onAuth(data.user)
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid credentials. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--cream)' }}>
      {/* Left panel */}
      <div style={{
        flex: 1, background: 'var(--navy)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 60,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.1)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.07)' }} />
        <div style={{ position: 'absolute', top: '40%', right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(201,168,76,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          <div style={{ width: 64, height: 64, background: 'var(--gold)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
            <Icon name="bank" size={28} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 44, color: '#fff', lineHeight: 1.1, marginBottom: 16 }}>
            NexBank
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7 }}>
            Modern microservices banking platform. Secure, fast, and reliable financial infrastructure.
          </p>
          <div style={{ display: 'flex', gap: 20, marginTop: 40, justifyContent: 'center' }}>
            {[
              { icon: 'shield', label: 'Secure' },
              { icon: 'trending', label: 'Real-time' },
              { icon: 'bank', label: 'Reliable' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', background: 'rgba(201,168,76,0.12)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={icon} size={18} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{ width: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', animation: 'fadeUp 0.5s ease both' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, color: 'var(--navy)', marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>Sign in to access your account</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="EMAIL ADDRESS"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="email"
            />
            <div style={{ position: 'relative' }}>
              <Input
                label="PASSWORD"
                type={showPwd ? 'text' : 'password'}
                placeholder="Your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
              />
              <button onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 12, bottom: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <Icon name={showPwd ? 'eye_off' : 'eye'} size={15} />
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: '11px 14px', background: '#fef2f2', borderRadius: 'var(--r-sm)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="x" size={13} /> {error}
            </div>
          )}

          <Btn
            variant="primary" loading={loading} onClick={handleLogin}
            style={{ width: '100%', marginTop: 22, padding: '14px', fontSize: 15, borderRadius: 'var(--r-md)' }}
          >
            Sign In
          </Btn>

          <div style={{ marginTop: 24, padding: 16, background: 'var(--cream)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>DEMO CREDENTIALS</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8, fontFamily: 'var(--font-mono)' }}>
              <div>Admin: <strong>admin@nexbank.com</strong></div>
              <div>Password: <strong>Admin@123</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  const isAdmin  = user?.role === 'admin'
  const [page, setPage]           = useState(isAdmin ? 'admin_dashboard' : 'dashboard')
  const [account, setAccount]     = useState(null)
  const [transactions, setTransactions] = useState([])
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [toast, setToast]         = useState(null)

  const accountId = user?.account_id

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleAuth = (userData) => {
    setUser(userData)
    setPage(userData.role === 'admin' ? 'admin_dashboard' : 'dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null); setAccount(null); setTransactions([]); setUsers([])
  }

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!accountId || isAdmin) return
    setLoading(true)
    try {
      const [acc, hist] = await Promise.all([getAccount(accountId), getHistory(accountId)])
      setAccount(acc)
      setTransactions(hist.transactions || [])
    } catch { showToast('Could not reach backend services', 'error') }
    finally { setLoading(false) }
  }, [accountId, isAdmin])

  // Load admin data
  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const { users } = await adminGetAllUsers()
      setUsers(users || [])
    } catch { showToast('Could not load user data', 'error') }
    finally { setLoading(false) }
  }, [isAdmin])

  useEffect(() => { loadUserData() }, [loadUserData])
  useEffect(() => { loadAdminData() }, [loadAdminData])

  if (!user) return (
    <>
      <style>{CSS}</style>
      <LoginPage onAuth={handleAuth} />
    </>
  )

  const userPages = {
    dashboard: <UserDashboard account={account} transactions={transactions} loading={loading} onRefresh={loadUserData} setPage={setPage} user={user} />,
    send:      <SendMoney accountId={accountId} onSuccess={() => { showToast('Transfer initiated!'); loadUserData() }} />,
    history:   <History transactions={transactions} loading={loading} onRefresh={loadUserData} accountId={accountId} />,
    statement: <Statement accountId={accountId} />,
  }

  const adminPages = {
    admin_dashboard: <AdminDashboard users={users} loading={loading} />,
    admin_users:     <AdminUsers users={users} loading={loading} onRefresh={loadAdminData} showToast={showToast} />,
  }

  const currentPage = isAdmin ? adminPages[page] : userPages[page]

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar page={page} setPage={setPage} account={account} user={user} onLogout={handleLogout} />
        <main style={{ marginLeft: 240, flex: 1, padding: '44px 48px 48px 52px', minHeight: '100vh', background: 'var(--cream)' }}>
          {currentPage || <div style={{ color: 'var(--text-muted)', padding: 40 }}>Page not found</div>}
        </main>
        <Toast toast={toast} />
      </div>
    </>
  )
}