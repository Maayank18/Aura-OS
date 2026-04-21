import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Copy, CheckCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { authApi, getStoredAccount } from '../services/authApi.js';
import useStore from '../store/useStore.js';

const QUESTIONS = [
  {
    id: 'stress_frequency',
    category: 'Stress',
    label: 'How often does stress completely hijack your day?',
    emoji: '⚡',
    options: ['Almost never — I handle it well', 'Occasionally — a few times a month', 'Regularly — once or twice a week', 'Almost daily — it waits for me', 'Constantly — I don\'t remember the last calm day'],
  },
  {
    id: 'somatic_symptoms',
    category: 'Body',
    label: 'How does stress physically manifest in your body?',
    emoji: '🫀',
    options: ['Never — clean and clear internally', 'Mild — occasional tightness or headache', 'Noticeable — tension, jaw clenching, nausea', 'Significant — pain, breathing changes, sweating', 'Severe — hard to function physically'],
  },
  {
    id: 'sleep_disruption',
    category: 'Sleep',
    label: 'How disrupted has your sleep been recently?',
    emoji: '🌙',
    options: ['Stable — I sleep well and wake rested', 'Slightly off — a little restless', 'Several rough nights per week', 'Most nights are difficult', 'Severely disrupted — I dread bedtime'],
  },
  {
    id: 'routine_disruption',
    category: 'Routine',
    label: 'How much has your daily structure collapsed?',
    emoji: '📅',
    options: ['Intact — routines feel grounding', 'Slightly slipping — minor inconsistencies', 'Moderate collapse — meals, timing off', 'Significant breakdown — basics are hard', 'Complete — no recognisable pattern remains'],
  },
  {
    id: 'sensory_overload',
    category: 'Sensory',
    label: 'How easily do noise, light, or clutter overwhelm you?',
    emoji: '👂',
    options: ['Rarely — I adapt easily', 'Sometimes — certain environments bother me', 'Often — loud/bright spaces are draining', 'Very often — I avoid them when possible', 'Immediately — almost everything overloads me'],
  },
  {
    id: 'task_paralysis',
    category: 'Focus',
    label: 'How often do you freeze completely before starting a task?',
    emoji: '🧊',
    options: ['Rarely — I usually start without much friction', 'Sometimes — small delays, then I manage', 'Often — it takes significant effort to begin', 'Daily — nearly every task feels impossible to start', 'Multiple times a day — I am frozen right now'],
  },
  {
    id: 'social_withdrawal',
    category: 'Social',
    label: 'How much have you been pulling away from people?',
    emoji: '🫧',
    options: ['Not at all — I crave and enjoy connection', 'A little — slightly more careful with energy', 'Somewhat — I cancel plans, reply slower', 'A lot — I avoid most social contact', 'Almost fully — isolated by choice or exhaustion'],
  },
  {
    id: 'panic_signals',
    category: 'Panic',
    label: 'How often do panic-like signals appear without a clear cause?',
    emoji: '🌊',
    options: ['Never — I don\'t experience sudden surges', 'Rarely — once or twice in recent memory', 'Sometimes — it comes and goes unpredictably', 'Often — I can feel it building throughout the day', 'Very often — it\'s become a baseline state'],
  },
  {
    id: 'focus_volatility',
    category: 'Focus',
    label: 'How unstable or scattered has your focus felt?',
    emoji: '🌀',
    options: ['Stable — I can concentrate for long periods', 'Slightly variable — some drift but manageable', 'Variable — hard to stay on one thing', 'Hard to hold — I lose the thread constantly', 'Nearly impossible — focus feels physically unavailable'],
  },
  {
    id: 'recovery_capacity',
    category: 'Recovery',
    label: 'After a stressful event, how hard is it to come back to baseline?',
    emoji: '🔋',
    options: ['Easy — I recover quickly and naturally', 'A little hard — takes a few hours', 'Moderate — it colors the rest of my day', 'Very hard — I carry it for days', 'I stay stuck — I can\'t remember recovering'],
  },
];

const CATEGORY_COLORS = {
  Stress: '#ff6b8a', Body: '#ffb300', Sleep: '#c4b5fd', Routine: '#00e5ff',
  Sensory: '#00bfa5', Focus: '#7c3aed', Social: '#e879f9', Panic: '#f97316', Recovery: '#22c55e',
};

export default function PatientIntake() {
  const navigate = useNavigate();
  const { userId, isInitialized, initSession } = useStore();
  const [index, setIndex]   = useState(0);
  const [answers, setAnswers] = useState({});
  const [direction, setDirection] = useState(1);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState(null);
  const [phase, setPhase]   = useState('intake'); // 'intake' | 'consent' | 'invite'
  const [consent, setConsent] = useState({ reportSharing: true, guardianAlerts: true, rawWorrySharing: false });
  const [invite, setInvite]  = useState(null);
  const [copied, setCopied]  = useState(false);

  useEffect(() => {
    if (!isInitialized) initSession().catch(() => {});
  }, [initSession, isInitialized]);

  // Guard: only patients
  useEffect(() => {
    const acct = getStoredAccount();
    if (!acct) { navigate('/login', { replace: true }); return; }
    if (acct.role !== 'patient') { navigate('/guardian/dashboard', { replace: true }); }
  }, []); // eslint-disable-line

  const q    = QUESTIONS[index];
  const sel  = answers[q?.id];
  const pct  = Math.round(((Object.keys(answers).length) / QUESTIONS.length) * 100);
  const color = CATEGORY_COLORS[q?.category] || '#00e5ff';
  const allAnswered = QUESTIONS.every((qq) => answers[qq.id] != null);

  const goTo = (next) => {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const pick = (value) => {
    setAnswers((prev) => ({ ...prev, [q.id]: { id: q.id, label: q.label, value } }));
  };

  const handleSaveIntake = async () => {
    setBusy(true); setError(null);
    try {
      await authApi.patientIntake(QUESTIONS.map((qq) => answers[qq.id]), consent);
      setPhase('invite');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateInvite = async () => {
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

  const handleCopy = () => {
    navigator.clipboard?.writeText(invite.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const slideVariants = {
    enter:  (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg-root)',
      backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,60,110,0.8), transparent 60%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* ── Progress bar ── */}
      {phase === 'intake' && (
        <div style={{ width: '100%', maxWidth: 580, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Clinical Intake</span>
            <span style={{ fontSize: 12, fontWeight: 700, color, transition: 'color 0.4s' }}>{pct}% complete</span>
          </div>
          <div className="progress-track">
            <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} className="progress-fill" />
          </div>
          {/* Dot indicators */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, justifyContent: 'center' }}>
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`tg-dot ${i === index ? 'tg-dot-active' : ''}`}
                style={answers[QUESTIONS[i].id] != null && i !== index ? { background: color, opacity: 0.5 } : {}}
              />
            ))}
          </div>
        </div>
      )}

      <motion.div
        className="tg-surface"
        style={{ width: '100%', maxWidth: 580, borderRadius: 28, overflow: 'hidden' }}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── INTAKE PHASE ── */}
        {phase === 'intake' && (
          <div style={{ padding: '36px 36px 32px' }}>
            {/* Category label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                color, padding: '4px 12px', borderRadius: 999,
                background: `${color}14`, border: `1px solid ${color}25`,
                transition: 'all 0.35s',
              }}>
                {q.category}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                {index + 1} / {QUESTIONS.length}
              </span>
            </div>

            {/* Question slide */}
            <div style={{ position: 'relative', overflow: 'hidden', minHeight: 380 }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={q.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  style={{ position: 'absolute', width: '100%' }}
                >
                  {/* Emoji + question */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 40, marginBottom: 12, lineHeight: 1 }}>{q.emoji}</div>
                    <h2 style={{ fontSize: 'clamp(18px,2.5vw,22px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', lineHeight: 1.3 }}>
                      {q.label}
                    </h2>
                  </div>

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {q.options.map((opt, val) => (
                      <motion.button
                        key={val}
                        onClick={() => pick(val)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className={`tg-answer ${sel?.value === val ? 'tg-answer-selected' : ''}`}
                        style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
                      >
                        <span style={{
                          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 900, marginTop: 0,
                          background: sel?.value === val ? `${color}20` : 'rgba(255,255,255,0.04)',
                          color: sel?.value === val ? color : 'var(--text-3)',
                          border: sel?.value === val ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.06)',
                          transition: 'all 0.2s',
                        }}>
                          {val + 1}
                        </span>
                        <span style={{ flex: 1, lineHeight: 1.5 }}>{opt}</span>
                        {sel?.value === val && (
                          <CheckCircle size={16} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            {error && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                className="tg-btn-secondary"
                style={{ width: 'auto', padding: '13px 20px' }}
              >
                <ArrowLeft size={16} />
              </button>
              {index < QUESTIONS.length - 1 ? (
                <button
                  onClick={() => { if (sel != null) goTo(index + 1); }}
                  disabled={sel == null}
                  className="tg-btn-primary"
                  style={{ flex: 1 }}
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setPhase('consent')}
                  disabled={!allAnswered}
                  className="tg-btn-primary"
                  style={{ flex: 1 }}
                >
                  Review & save <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── CONSENT PHASE ── */}
        {phase === 'consent' && (
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} style={{ padding: '36px' }}>
            <div style={{ marginBottom: 8 }}>
              <ShieldCheck size={32} color="#00bfa5" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 8 }}>Privacy preferences</h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.65, marginBottom: 28 }}>
              Decide what your guardian can see. These settings can be changed at any time from your profile.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {[
                { k: 'reportSharing', label: 'Allow guardian clinical reports', desc: 'Your guardian can receive AI-synthesized PDF reports.' },
                { k: 'guardianAlerts', label: 'Allow crisis alerts to guardian', desc: 'Send WhatsApp / email alerts when stress spikes are detected.' },
                { k: 'rawWorrySharing', label: 'Include raw worry text in reports', desc: 'Your private vault entries may appear in clinical PDFs.' },
              ].map(({ k, label, desc }) => (
                <label key={k} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 16px', borderRadius: 14,
                  background: consent[k] ? 'rgba(0,191,165,0.06)' : 'rgba(0,0,0,0.15)',
                  border: `1px solid ${consent[k] ? 'rgba(0,191,165,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  cursor: 'pointer', transition: 'all 0.25s',
                }}>
                  <input type="checkbox" checked={consent[k]} onChange={(e) => setConsent((c) => ({ ...c, [k]: e.target.checked }))} style={{ marginTop: 3, accentColor: '#00bfa5', width: 16, height: 16, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {error && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPhase('intake')} className="tg-btn-secondary" style={{ width: 'auto', padding: '13px 20px' }}>
                <ArrowLeft size={16} />
              </button>
              <button onClick={handleSaveIntake} disabled={busy} className="tg-btn-primary">
                {busy ? <><span className="spinner" /> Saving...</> : <>Save profile <ArrowRight size={16} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── INVITE PHASE ── */}
        {phase === 'invite' && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} style={{ padding: '40px 36px', textAlign: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <Sparkles size={40} color="#ffb300" style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 10 }}>Intake saved!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 32px' }}>
              AuraOS has your clinical baseline. Now, would you like to generate a secure <strong style={{ color: 'var(--text-2)' }}>24-hour invite code</strong> for a guardian?
            </p>

            {!invite ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={handleGenerateInvite} disabled={busy} className="tg-btn-primary">
                  {busy ? <><span className="spinner" /> Generating...</> : <>Generate guardian code <ShieldCheck size={16} /></>}
                </button>
                <button onClick={() => navigate('/app')} className="tg-btn-secondary">
                  Enter AuraOS later
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(0,229,255,0.2)',
                  borderRadius: 20, padding: '28px 32px',
                  boxShadow: '0 0 40px rgba(0,229,255,0.08)',
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Your guardian invite code</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 38, fontWeight: 900, letterSpacing: '0.12em', color: '#00e5ff', textShadow: '0 0 24px rgba(0,229,255,0.5)', marginBottom: 8 }}>
                    {invite.inviteCode}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Expires {new Date(invite.expiresAt).toLocaleString()}</p>
                </div>
                <button onClick={handleCopy} className="tg-btn-secondary" style={{ width: '100%' }}>
                  {copied ? <><CheckCircle size={15} color="#22c55e" /> Copied!</> : <><Copy size={15} /> Copy code</>}
                </button>
                <button onClick={() => navigate('/app')} className="tg-btn-primary">
                  Enter AuraOS <ArrowRight size={16} />
                </button>
              </div>
            )}
            {error && <p style={{ marginTop: 12, fontSize: 13, color: '#fca5a5' }}>{error}</p>}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
