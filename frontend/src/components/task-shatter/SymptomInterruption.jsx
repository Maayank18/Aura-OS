// SymptomInterruption.jsx  🌟 NEW
// 5-second animated breathing ring deployed during acute overwhelm.
// Masks the API latency while keeping the user calm.
// Inspired by STARR (Stop, Think, Act, Review, Reward) therapeutic technique.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PHASES = [
  { label: 'Breathe in',  duration: 4000, scale: 1.55, color: '#00e5ff' },
  { label: 'Hold',        duration: 2000, scale: 1.55, color: '#c4b5fd' },
  { label: 'Breathe out', duration: 4000, scale: 1.0,  color: '#5eead4' },
  { label: 'Hold',        duration: 2000, scale: 1.0,  color: '#c4b5fd' },
];

const TOTAL_CYCLES  = 2;           // 2 full cycles = ~24 seconds
const TOTAL_MS      = PHASES.reduce((s,p) => s+p.duration, 0) * TOTAL_CYCLES;

export default function SymptomInterruption({ onComplete, coachMessage }) {
  const [phaseIdx,   setPhaseIdx]   = useState(0);
  const [cycle,      setCycle]      = useState(0);
  const [elapsed,    setElapsed]    = useState(0);
  const [done,       setDone]       = useState(false);

  const phase = PHASES[phaseIdx];

  // ── Advance through breathing phases ─────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const nextPhase = (phaseIdx + 1) % PHASES.length;
      if (nextPhase === 0) {
        const nextCycle = cycle + 1;
        if (nextCycle >= TOTAL_CYCLES) { setDone(true); return; }
        setCycle(nextCycle);
      }
      setPhaseIdx(nextPhase);
    }, phase.duration);
    return () => clearTimeout(timer);
  }, [phaseIdx, cycle, phase.duration]);

  // ── Elapsed progress bar ──────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => Math.min(e + 100, TOTAL_MS)), 100);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.round((elapsed / TOTAL_MS) * 100);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,9,21,0.97)', backdropFilter: 'blur(28px)',
      gap: 32,
    }}>
      {/* Coach message */}
      <AnimatePresence>
        {coachMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              maxWidth: 460, textAlign: 'center', padding: '16px 24px',
              background: 'rgba(0,229,255,0.06)',
              border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: 18,
            }}
          >
            <p style={{ fontSize: 11, color: '#00e5ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Aura Coach
            </p>
            <p style={{ fontSize: 15, color: '#e8f4fb', lineHeight: 1.7 }}>{coachMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breathing ring */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer glow pulse */}
        <motion.div
          key={phaseIdx}
          animate={{ scale: [1, phase.scale], opacity: [0.15, 0.04] }}
          transition={{ duration: phase.duration / 1000, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 260, height: 260,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${phase.color}22, transparent 70%)`,
            filter: 'blur(12px)',
          }}
        />

        {/* The ring itself */}
        <motion.div
          key={`ring-${phaseIdx}`}
          animate={{ scale: phase.scale }}
          transition={{
            duration: phase.duration / 1000,
            ease: phaseIdx % 2 === 0 ? [0.25, 0.46, 0.45, 0.94] : 'easeInOut',
          }}
          style={{
            width: 160, height: 160, borderRadius: '50%',
            border: `3px solid ${phase.color}`,
            boxShadow: `0 0 24px ${phase.color}80, 0 0 60px ${phase.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle, ${phase.color}08, transparent 70%)`,
          }}
        >
          <motion.p
            key={phase.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              fontSize: 13, fontWeight: 700,
              color: phase.color, textTransform: 'uppercase',
              letterSpacing: '0.12em', textAlign: 'center',
              userSelect: 'none',
            }}
          >
            {phase.label}
          </motion.p>
        </motion.div>
      </div>

      {/* Cycle indicator */}
      <p style={{ fontSize: 12, color: '#4a6275', fontWeight: 500 }}>
        Cycle {cycle + 1} of {TOTAL_CYCLES}
      </p>

      {/* Progress bar */}
      <div style={{
        width: 260, height: 2,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 999, overflow: 'hidden',
      }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${phase.color}, #7c3aed)`,
            borderRadius: 999,
          }}
        />
      </div>

      {/* Done state */}
      <AnimatePresence>
        {done && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={onComplete}
            style={{
              padding: '14px 36px', borderRadius: 999, border: 'none',
              background: 'linear-gradient(135deg, #00b4d8, #00e5ff)',
              color: '#020915', fontFamily: 'inherit',
              fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em',
              cursor: 'pointer', boxShadow: '0 6px 28px rgba(0,229,255,0.35)',
            }}
          >
            I'm back — let's go 🚀
          </motion.button>
        )}
      </AnimatePresence>

      {/* Skip for demo */}
      {!done && (
        <button
          onClick={onComplete}
          style={{ fontSize: 11, color: '#4a6275', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}
        >
          skip (demo)
        </button>
      )}
    </div>
  );
}