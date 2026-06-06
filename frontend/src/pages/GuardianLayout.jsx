import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Bell, FileText, Settings, LogOut, Users, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { authApi, getStoredAccount } from '../services/authApi.js';

const NAV = [
  { to: '/guardian/dashboard', label: 'Dashboard', icon: BarChart2 },
  { to: '/guardian/reports',   label: 'Reports',   icon: FileText },
  { to: '/guardian/alerts',    label: 'Alerts',    icon: Bell },
  { to: '/guardian/link',      label: 'Link Patient', icon: LinkIcon },
  { to: '/guardian/settings',  label: 'Settings',  icon: Settings },
];

export default function GuardianLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [account, setAccount] = useState(getStoredAccount);
  const [menuOpen, setMenuOpen] = useState(false);

  // Re-read stored account when it changes
  useEffect(() => {
    const refreshed = getStoredAccount();
    if (!refreshed || refreshed.role !== 'guardian') {
      navigate('/guardian/login', { replace: true });
    } else {
      setAccount(refreshed);
    }
  }, [navigate]);

  const handleLogout = () => {
    authApi.logout();
    navigate('/', { replace: true });
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-root)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Guardian Nav ── */}
      <nav className="guardian-nav">
        {/* Logo + role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'conic-gradient(from 180deg,#7c3aed,#00e5ff,#00bfa5,#7c3aed)', boxShadow: '0 0 14px rgba(124,58,237,0.5)', animation: 'logoHue 8s linear infinite' }} />
          <div>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>AuraOS</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c4b5fd', marginLeft: 8, padding: '2px 8px', borderRadius: 999, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>Guardian</span>
          </div>
        </div>

        {/* Nav links (desktop) */}
        <div style={{ display: 'flex', gap: 4 }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`guardian-nav-link ${pathname === to || (to !== '/guardian/dashboard' && pathname.startsWith(to)) ? 'active' : ''}`}
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
        </div>

        {/* Account dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: menuOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: '1px solid', borderColor: menuOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#c4b5fd' }}>
              {account?.displayName?.[0]?.toUpperCase() || 'G'}
            </div>
            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account?.displayName || 'Guardian'}</span>
            <ChevronDown size={13} style={{ transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  minWidth: 200, borderRadius: 14, padding: 8,
                  background: 'rgba(6,15,30,0.97)', border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(20px)',
                  zIndex: 200,
                }}
              >
                <p style={{ fontSize: 11, color: 'var(--text-3)', padding: '4px 10px 8px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{account?.email}</p>
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fca5a5', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* ── Page outlet ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
