import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Copy, ShieldCheck } from 'lucide-react';
import { authApi, getStoredAccount } from '../../services/authApi.js';
import useStore from '../../store/useStore.js';

const QUESTIONS = [
  { id: 'stress_frequency', label: 'How often does stress interrupt your day?', options: ['Rarely', 'Sometimes', 'Often', 'Almost always', 'Constantly'] },
  { id: 'somatic_symptoms', label: 'How often does stress show up in your body?', options: ['Never', 'Mild tension', 'Noticeable tension', 'Pain or nausea', 'Hard to function'] },
  { id: 'sleep_disruption', label: 'How disrupted has your sleep been?', options: ['Stable', 'A little off', 'Several rough nights', 'Most nights', 'Severely disrupted'] },
  { id: 'routine_disruption', label: 'How much has routine slipped recently?', options: ['Not at all', 'Slightly', 'Moderately', 'A lot', 'Completely'] },
  { id: 'sensory_overload', label: 'How easily do noise, light, or clutter overwhelm you?', options: ['Rarely', 'Sometimes', 'Often', 'Very often', 'Immediately'] },
  { id: 'task_paralysis', label: 'How often do you freeze before starting tasks?', options: ['Rarely', 'Sometimes', 'Often', 'Daily', 'Multiple times daily'] },
  { id: 'social_withdrawal', label: 'How much have you been pulling away from people?', options: ['Not at all', 'A little', 'Somewhat', 'A lot', 'Almost fully'] },
  { id: 'panic_signals', label: 'How often do panic-like signals appear?', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often'] },
  { id: 'focus_volatility', label: 'How unstable has focus felt?', options: ['Stable', 'Slightly variable', 'Variable', 'Hard to hold', 'Nearly impossible'] },
  { id: 'recovery_capacity', label: 'After stress, how hard is it to recover?', options: ['Easy', 'A little hard', 'Moderate', 'Very hard', 'I stay stuck'] },
];

const defaultConsent = { reportSharing: true, guardianAlerts: true, rawWorrySharing: false };

export default function PatientOnboarding() {
  const navigate = useNavigate();
  const { userId, isInitialized, initSession } = useStore();
  const [mode, setMode] = useState(getStoredAccount()?.role === 'patient' ? 'intake' : 'account');
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [consent, setConsent] = useState(defaultConsent);
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isInitialized) initSession().catch(() => {});
  }, [initSession, isInitialized]);

  const current = QUESTIONS[index];
  const selected = answers[current?.id];
  const progress = mode === 'intake' ? ((index + 1) / QUESTIONS.length) * 100 : 0;
  const account = useMemo(() => getStoredAccount(), [mode]);

  const handleAccount = async (event) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      await authApi.patientRegister({
        ...form,
        userStateId: userId || undefined,
        privacyConsent: consent,
      });
      setMode('intake');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [current.id]: { id: current.id, label: current.label, value } }));
  };

  const handleNext = async () => {
    if (index < QUESTIONS.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setBusy(true); setError(null);
    try {
      await authApi.patientIntake(QUESTIONS.map((q) => answers[q.id]), consent);
      setMode('invite');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const generateInvite = async () => {
    setBusy(true); setError(null);
    try {
      const res = await authApi.generateInviteCode();
      setInvite(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#020915] text-[var(--text-1)] flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(0,229,255,0.18),transparent_55%)]" />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-xl glass p-5 sm:p-7 rounded-lg">
        <div className="flex items-center justify-between mb-5">
          <Link to="/app" className="text-xs text-[var(--text-3)] hover:text-[var(--cyan)]">Back to app</Link>
          <span className="badge badge-cyan"><ShieldCheck size={12} /> Patient setup</span>
        </div>

        {mode === 'account' && (
          <form onSubmit={handleAccount}>
            <h1 className="section-title">Create your private AuraOS account</h1>
            <p className="section-sub mb-6">This keeps your telemetry linked across sessions and lets you invite a guardian only when you choose.</p>
            <div className="space-y-3">
              <input className="input" placeholder="Name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
              <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className="input" type="password" placeholder="Password, 8+ characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <Consent consent={consent} setConsent={setConsent} />
            {error && <p className="mt-3 text-sm text-[#ff6b8a]">{error}</p>}
            <button disabled={busy} className="btn btn-primary w-full mt-5">{busy ? 'Creating...' : 'Continue to intake'}</button>
          </form>
        )}

        {mode === 'intake' && (
          <div>
            <div className="progress-track mb-6"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-3)] mb-2">Question {index + 1} of {QUESTIONS.length}</p>
            <AnimatePresence mode="wait">
              <motion.div key={current.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] mb-6">{current.label}</h1>
                <div className="grid gap-2">
                  {current.options.map((option, value) => (
                    <button key={option} onClick={() => handleAnswer(value)} className={`text-left rounded-lg border p-4 transition ${selected?.value === value ? 'border-[var(--cyan)] bg-cyan-500/10 text-[var(--cyan)]' : 'border-white/10 bg-white/[0.03] text-[var(--text-2)] hover:bg-white/[0.06]'}`}>
                      <span className="font-bold mr-3">{value + 1}</span>{option}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            {error && <p className="mt-3 text-sm text-[#ff6b8a]">{error}</p>}
            <div className="flex justify-between mt-6">
              <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="btn btn-secondary"><ArrowLeft size={14} /> Back</button>
              <button onClick={handleNext} disabled={selected == null || busy} className="btn btn-primary">{index === QUESTIONS.length - 1 ? 'Save intake' : 'Next'} <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {mode === 'invite' && (
          <div>
            <h1 className="section-title">Link a guardian when you are ready</h1>
            <p className="section-sub mb-6">Generate a 24-hour code for a parent, therapist, mentor, or trusted support person.</p>
            {invite ? (
              <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)] mb-2">Invite code</p>
                <p className="text-4xl font-black tracking-[0.08em] text-[var(--cyan)]">{invite.inviteCode}</p>
                <p className="text-xs text-[var(--text-3)] mt-3">Expires {new Date(invite.expiresAt).toLocaleString()}</p>
                <button onClick={() => navigator.clipboard?.writeText(invite.inviteCode)} className="btn btn-secondary mt-4"><Copy size={14} /> Copy code</button>
              </div>
            ) : (
              <button onClick={generateInvite} disabled={busy} className="btn btn-primary w-full">{busy ? 'Generating...' : 'Generate invite code'}</button>
            )}
            <button onClick={() => navigate('/app')} className="btn btn-ghost w-full mt-4">Enter AuraOS</button>
            {account?.email && <p className="text-center text-xs text-[var(--text-3)] mt-3">Signed in as {account.email}</p>}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Consent({ consent, setConsent }) {
  const rows = [
    ['reportSharing', 'Allow guardian clinical reports'],
    ['guardianAlerts', 'Allow crisis and spike alerts'],
    ['rawWorrySharing', 'Include raw worry text in reports'],
  ];
  return (
    <div className="mt-4 space-y-2">
      {rows.map(([key, label]) => (
        <label key={key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[var(--text-2)]">
          {label}
          <input type="checkbox" checked={Boolean(consent[key])} onChange={(e) => setConsent({ ...consent, [key]: e.target.checked })} />
        </label>
      ))}
    </div>
  );
}
