import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Heart, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { authApi, getStoredAccount } from '../services/authApi.js';

/* ── Small floating orb ── */
function MiniOrb() {
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'conic-gradient(from 180deg,#7c3aed,#00e5ff,#00bfa5,#7c3aed)', boxShadow: '0 0 14px rgba(0,229,255,0.5)', animation: 'logoHue 8s linear infinite, voidBreathe 4s ease-in-out infinite', flexShrink: 0 }} />
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = params.get('role') === 'guardian' ? 'guardian' : 'patient';
  const initialMode = params.get('mode') === 'login' ? 'login' : 'signup';

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Redirect if already logged in
  useEffect(() => {
    const acct = getStoredAccount();
    if (acct?.role === 'guardian') { navigate('/guardian/dashboard', { replace: true }); return; }
    if (acct?.role === 'patient')  { navigate('/app',            { replace: true }); }
  }, []); // eslint-disable-line

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    try {
      if (mode === 'signup') {
        if (role === 'patient') {
          await authApi.patientRegister({ ...form, privacyConsent: { reportSharing: true, guardianAlerts: true, rawWorrySharing: false } });
          navigate('/patient/onboarding');
        } else {
          await authApi.guardianRegister({ ...form, alertPreferences: { email: true } });
          navigate('/guardian/link');
        }
      } else {
        const res = await authApi.login({ ...form, role });
        if (res?.account?.role === 'guardian') {
          navigate(res.account.linkedPatientIds?.length > 0 ? '/guardian/dashboard' : '/guardian/link', { replace: true });
        } else {
          navigate('/app', { replace: true });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isLogin  = mode === 'login';
  const isGuardian = role === 'guardian';
  const accentColor = isGuardian ? '#c4b5fd' : '#00e5ff';
  const accentGlow  = isGuardian ? 'rgba(124,58,237,0.3)' : 'rgba(0,229,255,0.2)';

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-root)', padding: '24px 16px',
      backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 0%, ${isGuardian ? 'rgba(124,58,237,0.18)' : 'rgba(0,60,110,0.85)'}, transparent 60%)`,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="tg-surface"
        style={{ width: '100%', maxWidth: 460, borderRadius: 28, padding: '40px 36px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <MiniOrb />
          <div>
            <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>AuraOS</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{isLogin ? 'Welcome back' : 'Create account'}</p>
          </div>
        </div>

        {/* Role switcher */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
          background: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: 4, marginBottom: 28,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          {[
            { r: 'patient', icon: Heart, label: 'Patient', color: '#00e5ff' },
            { r: 'guardian', icon: Shield, label: 'Guardian', color: '#c4b5fd' },
          ].map(({ r, icon: Icon, label, color }) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: role === r ? `1px solid ${color}30` : '1px solid transparent',
                background: role === r ? `${color}14` : 'transparent',
                color: role === r ? color : 'var(--text-3)',
                transition: 'all 0.2s', cursor: 'pointer',
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Title */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${role}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{ marginBottom: 28 }}
          >
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1.15, marginBottom: 6 }}>
              {isLogin
                ? `${isGuardian ? 'Observer' : 'Patient'} login`
                : isGuardian ? 'Join as Guardian' : 'Begin your intake'}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.6 }}>
              {isLogin
                ? 'Enter your credentials to continue.'
                : isGuardian
                  ? 'You\'ll receive a secure invite code from your patient to link.'
                  : 'A private account keeps your telemetry safe across sessions.'}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!isLogin && (
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Name</label>
                <input className="tg-input" placeholder={isGuardian ? 'Your name' : 'How you\'d like to be called'} value={form.displayName} onChange={set('displayName')} required />
              </div>
            )}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Email</label>
              <input className="tg-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required autoComplete="email" />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input className="tg-input" type={showPw ? 'text' : 'password'} placeholder={isLogin ? '••••••••' : '8+ characters'} value={form.password} onChange={set('password')} required autoComplete={isLogin ? 'current-password' : 'new-password'} style={{ paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Error / success */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 14, padding: '11px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13 }}>
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 14, padding: '11px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={14} /> {success}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={busy} className="tg-btn-primary" style={{ marginTop: 24 }}>
            {busy
              ? <><span className="spinner" /> {isLogin ? 'Authenticating...' : 'Creating account...'}</>
              : <>{isLogin ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></>
            }
          </button>
        </form>

        {/* Mode toggle */}
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(isLogin ? 'signup' : 'login'); setError(null); }}
            style={{ color: accentColor, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: 12, color: 'var(--text-3)' }}>← Back to home</Link>
        </div>
      </motion.div>
    </div>
  );
}
