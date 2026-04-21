// frontend/src/components/MoodCheckIn.jsx
// Daily 5-axis emoji mood check-in panel.
// Accessible from the Patient Navbar as a slide-out panel.
// Each axis uses 5 emoji-buttons so the interaction is purely visual and tactile.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader, Smile } from 'lucide-react';
import { authApi } from '../services/authApi.js';

/* ── Question definitions ────────────────────────────────────────────────── */
const QUESTIONS = [
  {
    key: 'battery',
    label: 'Energy Reserve',
    icon: '🔋',
    description: 'How full is your tank right now?',
    emojis: ['💀', '😩', '😐', '😊', '⚡'],
    low: 'Completely drained',
    high: 'Full power',
  },
  {
    key: 'brainFog',
    label: 'Mental Clarity',
    icon: '🧠',
    description: 'How clear is your thinking?',
    emojis: ['🌫️', '😵‍💫', '🤔', '💡', '🎯'],
    low: 'Total fog',
    high: 'Crystal clear',
  },
  {
    key: 'anxiety',
    label: 'Anxiety Level',
    icon: '🌪️',
    description: 'How wound-up or nervous do you feel?',
    emojis: ['😌', '😤', '😟', '😰', '🆘'],
    low: 'Completely calm',
    high: 'Acute distress',
  },
  {
    key: 'energy',
    label: 'Physical Energy',
    icon: '⚡',
    description: 'How does your body feel physically?',
    emojis: ['🛌', '🐢', '🚶', '🏃', '🚀'],
    low: 'Need to lie down',
    high: 'Ready to go',
  },
  {
    key: 'sociability',
    label: 'Social Readiness',
    icon: '🫂',
    description: 'How open are you to interaction?',
    emojis: ['🙈', '😶', '🙂', '😁', '🥳'],
    low: 'Need space',
    high: 'Love being around people',
  },
];

/* ── Emoji score button ──────────────────────────────────────────────────── */
function EmojiOption({ emoji, value, selected, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.12, y: -3 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => onClick(value)}
      style={{
        width: 52, height: 52, borderRadius: 14, fontSize: 26,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        background: selected ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
        border: selected ? '2px solid rgba(0,229,255,0.5)' : '2px solid rgba(255,255,255,0.06)',
        boxShadow: selected ? '0 0 14px rgba(0,229,255,0.25)' : 'none',
        transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
      }}
      title={`Score ${value}`}
    >
      {emoji}
    </motion.button>
  );
}

export default function MoodCheckIn({ onClose }) {
  const [step, setStep] = useState(0);          // 0..4 = question index, 5 = done
  const [scores, setScores] = useState({});     // { battery: 3, brainFog: 2, ... }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const q = QUESTIONS[step];
  const currentScore = scores[q?.key];
  const allAnswered = QUESTIONS.every((qq) => scores[qq.key] !== undefined);

  const select = (value) => {
    setScores((prev) => ({ ...prev, [q.key]: value }));
    // Auto-advance after a brief delay for satisfying UX
    setTimeout(() => {
      if (step < QUESTIONS.length - 1) setStep((s) => s + 1);
    }, 320);
  };

  const handleSave = async () => {
    if (!allAnswered) return;
    setSaving(true); setError(null);
    try {
      await authApi.moodLog(scores);
      setSaved(true);
      setTimeout(() => onClose?.(), 1800);
    } catch (err) {
      setError(err.message || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="tg-surface"
      style={{
        position: 'absolute', top: 56, right: 8, zIndex: 9999,
        width: 360, borderRadius: 22, padding: '24px 24px 20px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>
            {saved ? '✅' : QUESTIONS[Math.min(step, QUESTIONS.length - 1)].icon}
          </span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-1)', lineHeight: 1.2 }}>
              {saved ? 'Logged!' : 'Daily Check-In'}
            </p>
            {!saved && (
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                {step < QUESTIONS.length ? `${step + 1} of ${QUESTIONS.length}` : 'All answered'}
              </p>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4, borderRadius: 8 }}>
          <X size={16} />
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
        {QUESTIONS.map((qq, i) => (
          <div
            key={qq.key}
            onClick={() => setStep(i)}
            style={{
              flex: 1, height: 3, borderRadius: 99, cursor: 'pointer',
              background: scores[qq.key] !== undefined
                ? '#00e5ff'
                : i === step ? 'rgba(0,229,255,0.35)' : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Question content */}
      <AnimatePresence mode="wait">
        {!saved ? (
          step < QUESTIONS.length ? (
            <motion.div
              key={`q-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                {q.label}
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 20, lineHeight: 1.5 }}>
                {q.description}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                {q.emojis.map((emoji, i) => (
                  <EmojiOption
                    key={i}
                    emoji={emoji}
                    value={i + 1}
                    selected={currentScore === i + 1}
                    onClick={select}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{q.low}</span>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{q.high}</span>
              </div>
            </motion.div>
          ) : (
            /* Review & submit */
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14, textAlign: 'center' }}>
                Here's how you're feeling today
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {QUESTIONS.map((qq) => (
                  <div key={qq.key} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {qq.icon} {qq.label}
                    </span>
                    <span style={{ fontSize: 18 }}>{qq.emojis[(scores[qq.key] || 1) - 1]}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        ) : (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '16px 0' }}
          >
            <p style={{ fontSize: 28, marginBottom: 8 }}>🌟</p>
            <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 700 }}>Check-in saved!</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              Your mood data is now part of your AuraOS profile.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {!saved && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {step < QUESTIONS.length && step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-3)', cursor: 'pointer' }}
            >
              ← Back
            </button>
          )}
          {step < QUESTIONS.length - 1 && currentScore && (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{ flex: 2, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff', cursor: 'pointer' }}
            >
              Next →
            </button>
          )}
          {(step === QUESTIONS.length - 1 && currentScore) || step >= QUESTIONS.length ? (
            <button
              onClick={step >= QUESTIONS.length ? handleSave : () => { setStep(QUESTIONS.length); }}
              disabled={saving}
              style={{ flex: 2, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, background: allAnswered ? '#00e5ff' : 'rgba(0,229,255,0.1)', border: 'none', color: allAnswered ? '#000' : '#00e5ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
              {step >= QUESTIONS.length ? (saving ? 'Saving…' : 'Save Check-In') : 'Review'}
            </button>
          ) : null}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: '#fca5a5', marginTop: 10, textAlign: 'center' }}>{error}</p>
      )}
    </motion.div>
  );
}
