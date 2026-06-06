import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, CheckCircle, ShieldAlert } from 'lucide-react';
import { authApi, getStoredAccount } from '../services/authApi.js';
import useStore from '../store/useStore.js';
import AuthToggle from '../components/AuthToggle.jsx';
import { useAuth } from '../hooks/useAuth.js';

function MiniOrb() {
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'conic-gradient(from 180deg,#7c3aed,#00e5ff,#00bfa5,#7c3aed)', boxShadow: '0 0 14px rgba(0,229,255,0.5)', animation: 'logoHue 8s linear infinite, voidBreathe 4s ease-in-out infinite', flexShrink: 0 }} />
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(role === 'guardian' || role === 'committee' ? '/guardian/dashboard' : '/app', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const { authForm, setAuthFormEmployeeDetails } = useStore();
  const { currentMode, subRole, employeeDetails } = authForm;
  
  // Enforce stateless modes: Default to login/audit for secondary roles, signup for users.
  const isSecondary = subRole === 'SECONDARY';
  const defaultAction = isSecondary 
    ? 'login' 
    : (location.pathname === '/login' ? 'login' : 'signup');
  const [actionType, setActionType] = useState(defaultAction);

  // Sync actionType when subRole or pathname changes
  useEffect(() => {
    setActionType(
      subRole === 'SECONDARY' 
        ? 'login' 
        : (location.pathname === '/login' ? 'login' : 'signup')
    );
  }, [subRole, location.pathname]);

  const [form, setForm] = useState({ name: '', email: '', password: '', inviteCode: '', targetEmployeeId: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);


  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setEmp = (k) => (e) => setAuthFormEmployeeDetails({ [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    try {
      if (actionType === 'signup') {
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          accountType: isSecondary ? (currentMode === 'EMPLOYEE' ? 'COMMITTEE' : 'GUARDIAN') : currentMode,
        };

        if (currentMode === 'CLIENT' && !isSecondary && form.inviteCode) {
          payload.inviteCode = form.inviteCode;
        } else if (currentMode === 'EMPLOYEE' && !isSecondary) {
          payload.employeeId = employeeDetails.employeeId;
          payload.cohort = employeeDetails.cohort;
        }

        const res = await authApi.register(payload);
        
        // For Secondary roles (Guardian/Committee), clear their session immediately! No sticky sessions.
        if (isSecondary) {
            setSuccess('Setup complete. Please authenticate below to begin your session.');
            setActionType('login');
            // Force logout from localStorage
            localStorage.removeItem('aura-auth');
        } else {
            navigate(currentMode === 'EMPLOYEE' ? '/app' : '/patient/onboarding', { replace: true });
        }

      } else {
        // Login
        if (isSecondary) {
          // Stateless for secondary roles (Guardian/Committee)
          const role = currentMode === 'EMPLOYEE' ? 'committee' : 'guardian';
          const payload = currentMode === 'EMPLOYEE' 
             ? { name: form.name, targetEmployeeId: form.targetEmployeeId, password: form.password, role } 
             : { email: form.email, password: form.password, role };

          const res = await authApi.login(payload);
          
          if (role === 'committee') {
             navigate('/guardian/dashboard', { replace: true });
          } else {
             navigate(res.account.linkedPatientIds?.length > 0 ? '/guardian/dashboard' : '/guardian/link', { replace: true });
          }
        } else {
          // Primary role login (Client/Employee)
          const payload = { email: form.email, password: form.password };
          const res = await authApi.login(payload);
          navigate('/app', { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setBusy(false);
    }
  };

  const isEmployee = currentMode === 'EMPLOYEE';
  const accentColor = isEmployee ? (isSecondary ? '#00bfa5' : '#7c3aed') : (isSecondary ? '#ffb300' : '#00e5ff');

  const getTitle = () => {
    if (currentMode === 'CLIENT') {
      return isSecondary 
        ? (actionType === 'login' ? 'Guardian Portal' : 'Register Guardian Profile') 
        : (actionType === 'login' ? 'Welcome Back' : 'Begin your journey');
    }
    return isSecondary 
        ? (actionType === 'login' ? 'Committee Security Gateway' : 'Committee Member Setup') 
        : (actionType === 'login' ? 'Employee Login' : 'Employee Registration');
  };

  const getSubtitle = () => {
    if (isSecondary && actionType === 'login') return 'Stateless secure authentication enforced.';
    if (actionType === 'login') return 'Access your AuraOS telemetry and workspace.';
    return 'A private account keeps your telemetry safe.';
  };

  return (
    <div style={{
      height: '100dvh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-root)', padding: '24px 16px',
      backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 0%, ${isEmployee ? 'rgba(124,58,237,0.18)' : 'rgba(0,60,110,0.85)'}, transparent 60%)`,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="tg-surface no-scrollbar"
        style={{ width: '100%', maxWidth: 460, borderRadius: 28, padding: '32px 28px', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <MiniOrb />
          <div>
            <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>AuraOS</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{actionType === 'login' ? 'Secure Gateway' : 'Create account'}</p>
          </div>
        </div>

        <AuthToggle />

        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentMode}-${subRole}-${actionType}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{ marginBottom: 28 }}
          >
            <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1.15, marginBottom: 6 }}>
              {getTitle()}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isSecondary && actionType === 'login' && <ShieldAlert size={14} color={accentColor} />}
              {getSubtitle()}
            </p>
          </motion.div>
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* NAME FIELD: Needed for all signups, OR for Committee Login */}
            {(actionType === 'signup' || (currentMode === 'EMPLOYEE' && isSecondary && actionType === 'login')) && (
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {isSecondary && actionType === 'login' ? 'Committee Member Name' : 'Full Name'}
                </label>
                <input className="tg-input" placeholder={isEmployee ? 'John Doe' : 'How you\'d like to be called'} value={form.name} onChange={setF('name')} required />
              </div>
            )}
            
            {/* EMAIL FIELD: Needed for everything EXCEPT Committee Login */}
            {!(currentMode === 'EMPLOYEE' && isSecondary && actionType === 'login') && (
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {isEmployee ? 'Corporate Email' : 'Email'}
                </label>
                <input className="tg-input" type="email" placeholder="you@example.com" value={form.email} onChange={setF('email')} required autoComplete="email" />
              </div>
            )}

            {/* EMPLOYEE ONLY: Cohort & ID (Signup) */}
            {currentMode === 'EMPLOYEE' && !isSecondary && actionType === 'signup' && (
              <>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Employee ID</label>
                  <input className="tg-input" type="text" placeholder="e.g. EMP12345" value={employeeDetails.employeeId} onChange={setEmp('employeeId')} required pattern="[A-Za-z0-9]+" title="Alphanumeric characters only" />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Department Cohort</label>
                  <select className="tg-input" style={{ appearance: 'none', backgroundColor: 'rgba(255,255,255,0.03)' }} value={employeeDetails.cohort || ''} onChange={setEmp('cohort')} required>
                    <option value="" disabled>Select Department</option>
                    <option value="ENGINEERING">Engineering</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="OPERATIONS">Operations</option>
                    <option value="PRODUCT">Product</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
              </>
            )}

            {/* COMMITTEE LOGIN: Target Employee ID */}
            {currentMode === 'EMPLOYEE' && isSecondary && actionType === 'login' && (
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Target Employee ID</label>
                <input className="tg-input" type="text" placeholder="EMPXXXXX" value={form.targetEmployeeId} onChange={setF('targetEmployeeId')} required pattern="[A-Za-z0-9]+" />
              </div>
            )}




            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {isSecondary && actionType === 'login' ? 'Security Password' : 'Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input className="tg-input" type={showPw ? 'text' : 'password'} placeholder="8+ characters" value={form.password} onChange={setF('password')} required style={{ paddingRight: 48 }} minLength={8} />
                <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

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

          <button type="submit" disabled={busy} className="tg-btn-primary" style={{ marginTop: 24, background: accentColor, color: '#000', fontWeight: 'bold' }}>
            {busy
              ? <><span className="spinner" /> Processing...</>
              : <>{actionType === 'login' ? 'Authenticate' : 'Get Started'} <ArrowRight size={16} /></>
            }
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
          {isSecondary ? (
            <>
              {actionType === 'login' ? "First time reviewer? " : 'Already setup? '}
              <button
                type="button"
                onClick={() => { setActionType(actionType === 'login' ? 'signup' : 'login'); setError(null); }}
                style={{ color: accentColor, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 'inherit' }}
              >
                {actionType === 'login' ? 'Setup Profile' : 'Access Gateway'}
              </button>
            </>
          ) : (
            <>
              {actionType === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => { 
                  const nextAction = actionType === 'login' ? 'signup' : 'login';
                  setActionType(nextAction); 
                  setError(null);
                  navigate(nextAction === 'login' ? '/login' : '/signup', { replace: true });
                }}
                style={{ color: accentColor, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 'inherit' }}
              >
                {actionType === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </>
          )}
        </p>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: 12, color: 'var(--text-3)' }}>← Back to home</Link>
        </div>
      </motion.div>
    </div>
  );
}
