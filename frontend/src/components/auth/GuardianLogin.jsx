import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { authApi } from '../../services/authApi.js';

export default function GuardianLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      let res;
      if (mode === 'register') {
        res = await authApi.guardianRegister({ ...form, alertPreferences: { email: true } });
      } else {
        res = await authApi.login({ ...form, role: 'guardian' });
      }
      if (res?.account?.linkedPatientIds?.length > 0) {
        navigate('/guardian/dashboard');
      } else {
        navigate('/guardian/link');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#020915] text-[var(--text-1)] flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.18),transparent_55%)]" />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-xl glass p-5 sm:p-7 rounded-lg">
        <div className="flex items-center justify-between mb-5">
          <Link to="/app" className="text-xs text-[var(--text-3)] hover:text-[#7c3aed]">Back to app</Link>
          <span className="badge" style={{ backgroundColor: 'rgba(124,58,237,0.2)', color: '#c4b5fd' }}>
            <ShieldCheck size={12} /> Guardian Access
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <h1 className="section-title text-[#c4b5fd]">
            {mode === 'register' ? 'Create Guardian Account' : 'Observer Portal Login'}
          </h1>
          <p className="section-sub mb-6">
            Log in to monitor patient linked clinical telemetry securely without interrupting their progress.
          </p>
          
          <div className="space-y-4">
            {mode === 'register' && (
              <input 
                className="input" 
                placeholder="Name" 
                value={form.displayName} 
                onChange={(e) => setForm({ ...form, displayName: e.target.value })} 
                required 
              />
            )}
            <input 
              className="input" 
              type="email" 
              placeholder="Email address" 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              required 
            />
            <input 
              className="input" 
              type="password" 
              placeholder="Password" 
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
              required 
            />
          </div>
          
          {error && <p className="mt-4 text-sm text-[#ff6b8a]">{error}</p>}
          
          <button disabled={busy} className="btn w-full mt-6" style={{ backgroundColor: '#7c3aed', color: 'white' }}>
            {busy ? 'Authenticating...' : (mode === 'register' ? 'Sign up as Guardian' : 'Login')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-3)]">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[#c4b5fd] hover:underline font-bold">
            {mode === 'login' ? 'Register here' : 'Login instead'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
