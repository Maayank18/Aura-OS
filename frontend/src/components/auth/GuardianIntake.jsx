import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { authApi } from '../../services/authApi.js';

const QUESTIONS = [
  { id: 'observed_isolation', label: 'How often have you noticed them withdrawing or isolating?', options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Constantly'] },
  { id: 'known_panic_triggers', label: 'How frequently do environmental/task triggers cause observed panic?', options: ['None known', 'Rarely', 'Occasionally', 'Frequently', 'Severe triggers'] },
  { id: 'sleep_disruption', label: 'Have you noticed disruption in their sleep or rest?', options: ['No disruption', 'Slightly affected', 'Moderate disruption', 'Significant disruption', 'Severe disruption'] },
  { id: 'routine_collapse', label: 'To what extent is their daily routine collapsing?', options: ['Stable', 'Slipping slightly', 'Struggling with basics', 'Mostly collapsed', 'Fully collapsed'] },
  { id: 'support_style', label: 'What type of support usually helps them most?', options: ['Space and quiet alone', 'Gentle check-ins', 'Body-doubling (doing tasks with them)', 'Direct intervention/help', 'Professional/Medical support'] },
];

export default function GuardianIntake() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const current = QUESTIONS[index];
  const selected = answers[current?.id];
  const progress = ((index + 1) / QUESTIONS.length) * 100;

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
      await authApi.guardianIntake(patientId, QUESTIONS.map((q) => answers[q.id]));
      navigate('/guardian/dashboard');
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
        <div className="flex items-center justify-end mb-5">
          <span className="badge" style={{ backgroundColor: 'rgba(124,58,237,0.2)', color: '#c4b5fd' }}>
            <ShieldCheck size={12} /> Observational Intake
          </span>
        </div>

        <div>
          <div className="progress-track mb-6"><div className="progress-fill" style={{ width: `${progress}%`, background: '#7c3aed' }} /></div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-3)] mb-2">Question {index + 1} of {QUESTIONS.length}</p>
          <motion.div key={current.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="min-h-[280px]">
            <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] mb-6">{current.label}</h1>
            <div className="grid gap-2">
              {current.options.map((option, value) => (
                <button 
                  key={option} 
                  onClick={() => handleAnswer(value)} 
                  className={`text-left rounded-lg border p-4 transition ${selected?.value === value ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#c4b5fd]' : 'border-white/10 bg-white/[0.03] text-[var(--text-2)] hover:bg-white/[0.06]'}`}
                >
                  <span className="font-bold mr-3">{value + 1}</span>{option}
                </button>
              ))}
            </div>
          </motion.div>
          {error && <p className="mt-4 text-sm text-[#ff6b8a]">{error}</p>}
          <div className="flex justify-between mt-6">
            <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="btn btn-secondary">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={handleNext} disabled={selected == null || busy} className="btn" style={{ backgroundColor: '#7c3aed', color: 'white' }}>
              {index === QUESTIONS.length - 1 ? (busy ? 'Saving...' : 'Complete Intake') : 'Next'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
