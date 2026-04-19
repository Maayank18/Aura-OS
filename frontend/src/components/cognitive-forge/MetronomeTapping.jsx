import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.15;
const TAPS_PER_ROUND = 20;
const TOTAL_ROUNDS = 3;
const MAX_SCORING_OFFSET = 150;

const BPM_PRESETS = [
  { label: 'Slow', bpm: 44, desc: 'Easy lock-in' },
  { label: 'Steady', bpm: 60, desc: 'Clinical baseline' },
  { label: 'Brisk', bpm: 80, desc: 'Sharper focus' },
  { label: 'Fast', bpm: 104, desc: 'Expert pace' },
];

const ACCURACY_THRESHOLDS = [
  { max: 15, label: 'Perfect', color: '#00e676', bg: 'rgba(0,230,118,0.12)', pts: 100 },
  { max: 30, label: 'Excellent', color: '#5eead4', bg: 'rgba(94,234,212,0.12)', pts: 85 },
  { max: 60, label: 'Good', color: '#00e5ff', bg: 'rgba(0,229,255,0.12)', pts: 65 },
  { max: 100, label: 'Close', color: '#ffb300', bg: 'rgba(255,179,0,0.12)', pts: 40 },
  { max: 150, label: 'Late', color: '#ff6b8a', bg: 'rgba(255,107,138,0.12)', pts: 15 },
  { max: Infinity, label: 'Miss', color: '#4a6275', bg: 'rgba(74,98,117,0.10)', pts: 0 },
];

const getAccuracy = (offsetMs) =>
  ACCURACY_THRESHOLDS.find((threshold) => offsetMs <= threshold.max) ||
  ACCURACY_THRESHOLDS[ACCURACY_THRESHOLDS.length - 1];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const computeSessionScore = (taps, totalBeats = taps.length) => {
  if (!totalBeats) {
    return {
      attentionScore: 0,
      avgOffsetMs: 0,
      timingVariance: 0,
      streakMax: 0,
      validTaps: 0,
      totalBeats: 0,
    };
  }

  const uniqueByBeat = new Map();
  taps.forEach((tap) => {
    if (!uniqueByBeat.has(tap.beatKey)) uniqueByBeat.set(tap.beatKey, tap);
  });

  const scoredTaps = [...uniqueByBeat.values()];
  const valid = scoredTaps.filter((tap) => tap.offsetMs <= MAX_SCORING_OFFSET);
  const avgOffsetMs = valid.length
    ? Math.round(valid.reduce((sum, tap) => sum + tap.offsetMs, 0) / valid.length)
    : MAX_SCORING_OFFSET;
  const timingVariance = valid.length > 1
    ? Math.round(Math.sqrt(
      valid.reduce((sum, tap) => sum + Math.pow(tap.offsetMs - avgOffsetMs, 2), 0) / valid.length
    ))
    : 0;

  const rhythmTracking = valid.length / totalBeats;
  const precision = 1 - Math.min(avgOffsetMs / MAX_SCORING_OFFSET, 1);
  const attentionScore = Math.round(clamp(rhythmTracking * precision * 100, 0, 100));

  let streakMax = 0;
  let streak = 0;
  scoredTaps.forEach((tap) => {
    if (tap.pts >= 65) {
      streak += 1;
      streakMax = Math.max(streakMax, streak);
    } else {
      streak = 0;
    }
  });

  return {
    attentionScore,
    avgOffsetMs,
    timingVariance,
    streakMax,
    validTaps: valid.length,
    totalBeats,
  };
};

const getClinicalNote = (score, avgOffset, variance) => {
  if (score >= 80) {
    return `Strong timing precision this round: average offset ${avgOffset}ms with ${variance}ms variance. Attention timing looked well regulated in this session.`;
  }
  if (score >= 60) {
    return `Good synchronization with some drift: average offset ${avgOffset}ms. Continued metronome practice can strengthen steadier beat tracking.`;
  }
  if (score >= 40) {
    return `Moderate timing difficulty: average offset ${avgOffset}ms with ${variance}ms variance. The pattern suggests inconsistent beat tracking today.`;
  }
  if (score >= 20) {
    return `Significant timing imprecision: average offset ${avgOffset}ms. Start slower and prioritize one calm tap per beat.`;
  }
  return `Very high timing variance today. Begin with the slow tempo, keep the session short, and treat this as practice data rather than a diagnosis.`;
};

const useAudioEngine = () => {
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const scheduleClick = useCallback((atTime, isAccent = false) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = isAccent ? 1200 : 820;
    gain.gain.setValueAtTime(0.0001, atTime);
    gain.gain.exponentialRampToValueAtTime(isAccent ? 0.28 : 0.14, atTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + 0.075);
    osc.start(atTime);
    osc.stop(atTime + 0.1);
  }, [getCtx]);

  const playFeedbackTone = useCallback((pts) => {
    const ctx = getCtx();
    const freq = pts >= 100 ? 880 : pts >= 65 ? 660 : pts >= 40 ? 440 : 200;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = pts >= 65 ? 'triangle' : 'sawtooth';
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.15);
  }, [getCtx]);

  const getCurrentTime = useCallback(() => getCtx().currentTime, [getCtx]);

  const close = useCallback(() => {
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => {});
    }
  }, []);

  return useMemo(() => ({
    scheduleClick,
    playFeedbackTone,
    getCurrentTime,
    close,
  }), [scheduleClick, playFeedbackTone, getCurrentTime, close]);
};

function BeatOrb({ isBeating, isAccent, orbColor }) {
  return (
    <div style={STYLES.orbStage}>
      <motion.div
        animate={{ scale: isBeating ? (isAccent ? 1.34 : 1.2) : 1, opacity: isBeating ? 0.18 : 0.06 }}
        transition={{ duration: isBeating ? 0.06 : 0.28, ease: 'easeOut' }}
        style={{ ...STYLES.orbGlow, background: orbColor }}
      />
      <AnimatePresence>
        {isBeating && (
          <motion.div
            key="beat-ripple"
            initial={{ width: 112, height: 112, opacity: 0.7 }}
            animate={{ width: 248, height: 248, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.54, ease: 'easeOut' }}
            style={{ ...STYLES.orbRipple, borderColor: orbColor }}
          />
        )}
      </AnimatePresence>
      <motion.div
        animate={{
          scale: isBeating ? (isAccent ? 1.12 : 1.07) : 1,
          boxShadow: isBeating
            ? `0 0 0 2px ${orbColor}, 0 0 22px 7px ${orbColor}55, 0 0 60px 18px ${orbColor}22`
            : `0 0 0 1px ${orbColor}55, 0 0 10px 2px ${orbColor}18`,
        }}
        transition={{ duration: 0.06, ease: 'easeOut' }}
        style={{
          ...STYLES.orbCore,
          background: `radial-gradient(circle at 40% 38%, ${orbColor}1f, transparent 70%)`,
        }}
      >
        <div style={{ color: orbColor, fontSize: 42, fontWeight: 900, letterSpacing: 0 }}>IM</div>
      </motion.div>
    </div>
  );
}

function TapHistoryDots({ taps }) {
  const shown = taps.slice(-10);
  const emptyCount = Math.max(0, 10 - shown.length);
  return (
    <div style={STYLES.dotRow}>
      {Array.from({ length: emptyCount }, (_, index) => (
        <div key={`empty-${index}`} style={STYLES.emptyDot} />
      ))}
      {shown.map((tap) => {
        const acc = getAccuracy(tap.offsetMs);
        return (
          <motion.div
            key={tap.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14 }}
            title={`${acc.label}: ${tap.offsetMs}ms`}
            style={{
              ...STYLES.tapDot,
              background: acc.color,
              boxShadow: `0 0 6px ${acc.color}80`,
            }}
          />
        );
      })}
    </div>
  );
}

function DistributionBar({ taps }) {
  const counts = ACCURACY_THRESHOLDS.slice(0, -1).map((threshold) => ({
    ...threshold,
    count: taps.filter((tap) => tap.label === threshold.label).length,
  }));
  const max = Math.max(...counts.map((count) => count.count), 1);

  return (
    <div style={STYLES.distribution}>
      {counts.map((count, index) => (
        <div key={count.label} style={STYLES.distributionRow}>
          <span style={{ ...STYLES.distributionLabel, color: count.color }}>{count.label}</span>
          <div style={STYLES.distributionTrack}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(count.count / max) * 100}%` }}
              transition={{ duration: 0.6, delay: index * 0.05, ease: 'easeOut' }}
              style={{ ...STYLES.distributionFill, background: count.color }}
            />
          </div>
          <span style={STYLES.distributionCount}>{count.count}</span>
        </div>
      ))}
    </div>
  );
}

function OffsetTimeline({ taps }) {
  const last20 = taps.slice(-20);

  return (
    <div style={STYLES.timeline}>
      <div style={STYLES.timelineCenter} />
      <div style={{ ...STYLES.timelineGuide, top: '25%' }} />
      <div style={{ ...STYLES.timelineGuide, top: '75%' }} />
      <span style={{ ...STYLES.timelineText, top: 0 }}>early</span>
      <span style={{ ...STYLES.timelineText, bottom: 0 }}>late</span>
      {last20.map((tap, index) => {
        const acc = getAccuracy(tap.offsetMs);
        const yPct = 50 + (tap.rawOffset / MAX_SCORING_OFFSET) * 45;
        const xPct = (index / Math.max(last20.length - 1, 1)) * 100;
        return (
          <motion.div
            key={tap.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              ...STYLES.timelineDot,
              left: `${xPct}%`,
              top: `${clamp(yPct, 10, 90)}%`,
              background: acc.color,
              boxShadow: `0 0 5px ${acc.color}88`,
            }}
          />
        );
      })}
    </div>
  );
}

function AttentionRing({ score }) {
  const size = 132;
  const radius = (size / 2) - 12;
  const circumference = 2 * Math.PI * radius;
  const scoreColor = score >= 80 ? '#00e676' : score >= 60 ? '#00e5ff' : score >= 40 ? '#ffb300' : '#ff6b8a';
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 40;
    const timer = setInterval(() => {
      frame += 1;
      const eased = 1 - Math.pow(1 - frame / totalFrames, 3);
      setAnimatedScore(Math.round(score * eased));
      if (frame >= totalFrames) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [score]);

  return (
    <div style={{ ...STYLES.attentionRing, width: size, height: size }}>
      <svg width={size} height={size} style={STYLES.attentionSvg}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (animatedScore / 100) * circumference}
        />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: scoreColor, letterSpacing: '-0.04em', lineHeight: 1 }}>{animatedScore}</div>
        <div style={STYLES.ringLabel}>attention</div>
      </div>
    </div>
  );
}

export default function MetronomeTapping({ onSessionEnd, onClose }) {
  const audio = useAudioEngine();
  const [phase, setPhase] = useState('intro');
  const phaseRef = useRef('intro');
  const [selectedBPM, setSelectedBPM] = useState(60);
  const bpmRef = useRef(60);

  const [round, setRound] = useState(1);
  const roundRef = useRef(1);
  const [beatCount, setBeatCount] = useState(0);
  const beatCountRef = useRef(0);
  const [isBeating, setIsBeating] = useState(false);
  const [isAccentBeat, setIsAccentBeat] = useState(false);

  const [taps, setTaps] = useState([]);
  const allTapsRef = useRef([]);
  const [roundTaps, setRoundTaps] = useState([]);
  const roundTapsRef = useRef([]);
  const tappedBeatKeysRef = useRef(new Set());
  const [lastFeedback, setLastFeedback] = useState(null);
  const [streak, setStreak] = useState(0);
  const streakRef = useRef(0);
  const [orbColor, setOrbColor] = useState('#00e5ff');

  const [countdownNum, setCountdownNum] = useState(3);
  const countdownTimerRef = useRef(null);
  const schedulerTimerRef = useRef(null);
  const visualTimersRef = useRef([]);
  const schedStateRef = useRef({ nextBeatTime: 0, beatSeq: 0 });
  const beatAudioTimesRef = useRef([]);

  const sessionIdRef = useRef(uuidv4());
  const sessionStartRef = useRef(null);

  const expectedTotalBeats = TOTAL_ROUNDS * TAPS_PER_ROUND;
  const currentRoundBeats = phase === 'roundSummary' || phase === 'results' ? TAPS_PER_ROUND : beatCount;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    bpmRef.current = selectedBPM;
  }, [selectedBPM]);

  const clearVisualTimers = useCallback(() => {
    visualTimersRef.current.forEach((timer) => clearTimeout(timer));
    visualTimersRef.current = [];
  }, []);

  const stopScheduler = useCallback(() => {
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
  }, []);

  const completeRound = useCallback(() => {
    if (phaseRef.current !== 'active') return;
    stopScheduler();
    phaseRef.current = 'roundSummary';
    setPhase('roundSummary');
  }, [stopScheduler]);

  const runScheduler = useCallback(() => {
    const now = audio.getCurrentTime();
    const sched = schedStateRef.current;

    while (sched.nextBeatTime < now + SCHEDULE_AHEAD) {
      const beatTime = sched.nextBeatTime;
      const beatIndex = sched.beatSeq + 1;
      const isAccent = sched.beatSeq % 4 === 0;

      audio.scheduleClick(beatTime, isAccent);
      beatAudioTimesRef.current = [
        ...beatAudioTimesRef.current.slice(-5),
        { time: beatTime, index: beatIndex, round: roundRef.current, key: `${roundRef.current}:${beatIndex}` },
      ];

      const delayMs = Math.max(0, (beatTime - now) * 1000);
      const visualTimer = setTimeout(() => {
        if (phaseRef.current !== 'active') return;
        setIsBeating(true);
        setIsAccentBeat(isAccent);
        setBeatCount((prev) => {
          const next = Math.min(prev + 1, TAPS_PER_ROUND);
          beatCountRef.current = next;
          return next;
        });

        const offTimer = setTimeout(() => setIsBeating(false), 90);
        visualTimersRef.current.push(offTimer);

        if (beatIndex >= TAPS_PER_ROUND) {
          completeRound();
        }
      }, delayMs);
      visualTimersRef.current.push(visualTimer);

      sched.beatSeq += 1;
      sched.nextBeatTime += 60 / bpmRef.current;
    }
  }, [audio, completeRound]);

  const startScheduler = useCallback(() => {
    stopScheduler();
    clearVisualTimers();
    const now = audio.getCurrentTime();
    schedStateRef.current = { nextBeatTime: now + 0.4, beatSeq: 0 };
    beatAudioTimesRef.current = [];
    schedulerTimerRef.current = setInterval(runScheduler, LOOKAHEAD_MS);
    runScheduler();
  }, [audio, clearVisualTimers, runScheduler, stopScheduler]);

  const beginRound = useCallback(() => {
    beatCountRef.current = 0;
    roundTapsRef.current = [];
    tappedBeatKeysRef.current = new Set();
    setBeatCount(0);
    setRoundTaps([]);
    streakRef.current = 0;
    setStreak(0);
    setLastFeedback(null);
    phaseRef.current = 'active';
    setPhase('active');
    if (!sessionStartRef.current) sessionStartRef.current = Date.now();
    startScheduler();
  }, [startScheduler]);

  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    stopScheduler();
    clearVisualTimers();
    phaseRef.current = 'countdown';
    setPhase('countdown');
    setCountdownNum(3);

    let next = 3;
    countdownTimerRef.current = setInterval(() => {
      next -= 1;
      setCountdownNum(next);
      if (next <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        beginRound();
      }
    }, 900);
  }, [beginRound, clearVisualTimers, stopScheduler]);

  const finishSession = useCallback(() => {
    stopScheduler();
    clearVisualTimers();
    const allTaps = allTapsRef.current;
    const stats = computeSessionScore(allTaps, expectedTotalBeats);
    const clinicalNote = getClinicalNote(stats.attentionScore, stats.avgOffsetMs, stats.timingVariance);
    const accurateTaps = allTaps.filter((tap) => tap.pts >= 65).length;
    const durationSeconds = Math.round((Date.now() - (sessionStartRef.current || Date.now())) / 1000);

    const payload = {
      gameId: 'metronome_tapping',
      gameName: 'Rhythm Sync',
      sessionId: sessionIdRef.current,
      durationSeconds,
      interactions: allTaps.length,
      avgReactionMs: stats.avgOffsetMs,
      accuracy: Math.round((accurateTaps / expectedTotalBeats) * 100),
      score: allTaps.reduce((sum, tap) => sum + tap.pts, 0),
      taps: allTaps,
      extraData: {
        ...stats,
        rounds: TOTAL_ROUNDS,
        tapsPerRound: TAPS_PER_ROUND,
        bpm: bpmRef.current,
        clinicalNote,
      },
      predictedEffects: {
        stressReduction: 4,
        dopamineActivation: Math.min(10, Math.round(stats.attentionScore / 12)),
        focusScore: Math.min(10, Math.round(stats.attentionScore / 10)),
        arousalLevel: stats.attentionScore < 40 ? 'high' : stats.attentionScore < 65 ? 'moderate' : 'low',
        clinicalNote,
      },
      completedAt: new Date().toISOString(),
    };

    if (stats.attentionScore >= 85) {
      confetti({
        particleCount: 45,
        spread: 65,
        origin: { y: 0.55 },
        colors: ['#00e5ff', '#00e676', '#c4b5fd'],
        ticks: 70,
      });
    }

    phaseRef.current = 'results';
    setPhase('results');
    onSessionEnd?.(payload);
  }, [clearVisualTimers, expectedTotalBeats, onSessionEnd, stopScheduler]);

  const nextRound = useCallback(() => {
    const next = roundRef.current + 1;
    roundRef.current = next;
    setRound(next);
    if (next > TOTAL_ROUNDS) {
      finishSession();
    } else {
      startCountdown();
    }
  }, [finishSession, startCountdown]);

  const handleTap = useCallback((event) => {
    event?.preventDefault?.();
    if (phaseRef.current !== 'active') return;

    const tapAudioTime = audio.getCurrentTime();
    const recentBeats = beatAudioTimesRef.current;
    if (!recentBeats.length) return;

    const nearest = recentBeats.reduce((best, beat) =>
      Math.abs(beat.time - tapAudioTime) < Math.abs(best.time - tapAudioTime) ? beat : best
    );

    if (tappedBeatKeysRef.current.has(nearest.key)) {
      setLastFeedback({ label: 'One tap', color: '#4a6275', offsetMs: 0 });
      setTimeout(() => setLastFeedback(null), 500);
      return;
    }
    tappedBeatKeysRef.current.add(nearest.key);

    const rawOffset = (tapAudioTime - nearest.time) * 1000;
    const offsetMs = Math.round(Math.abs(rawOffset));
    const acc = getAccuracy(offsetMs);
    const tapRecord = {
      id: uuidv4(),
      round: roundRef.current,
      beatIndex: nearest.index,
      beatKey: nearest.key,
      offsetMs,
      rawOffset: Math.round(rawOffset),
      label: acc.label,
      color: acc.color,
      pts: acc.pts,
      timestamp: Date.now(),
    };

    if (acc.pts >= 65) {
      streakRef.current += 1;
    } else {
      streakRef.current = 0;
    }
    setStreak(streakRef.current);

    if (acc.pts >= 85) setOrbColor('#00e676');
    else if (acc.pts >= 65) setOrbColor('#00e5ff');
    else if (acc.pts >= 40) setOrbColor('#ffb300');
    else setOrbColor('#ff6b8a');

    audio.playFeedbackTone(acc.pts);
    setLastFeedback({ ...acc, offsetMs });
    setTimeout(() => setLastFeedback(null), 700);

    roundTapsRef.current = [...roundTapsRef.current, tapRecord];
    allTapsRef.current = [...allTapsRef.current, tapRecord];
    setRoundTaps((prev) => [...prev, tapRecord]);
    setTaps((prev) => [...prev, tapRecord]);
  }, [audio]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleTap]);

  useEffect(() => () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    stopScheduler();
    clearVisualTimers();
    audio.close();
  }, [audio, clearVisualTimers, stopScheduler]);

  const resetSession = useCallback(() => {
    sessionIdRef.current = uuidv4();
    sessionStartRef.current = null;
    allTapsRef.current = [];
    roundTapsRef.current = [];
    roundRef.current = 1;
    beatCountRef.current = 0;
    beatAudioTimesRef.current = [];
    tappedBeatKeysRef.current = new Set();
    setTaps([]);
    setRoundTaps([]);
    setRound(1);
    setBeatCount(0);
    setStreak(0);
    setOrbColor('#00e5ff');
    setLastFeedback(null);
    phaseRef.current = 'intro';
    setPhase('intro');
  }, []);

  const roundStats = useMemo(() => computeSessionScore(roundTaps, Math.max(currentRoundBeats, 1)), [currentRoundBeats, roundTaps]);
  const sessionStats = useMemo(() => computeSessionScore(taps, expectedTotalBeats), [expectedTotalBeats, taps]);

  if (phase === 'intro') {
    return (
      <div style={STYLES.page}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} style={STYLES.introWrap}>
          <div style={STYLES.introHeader}>
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              style={STYLES.introIcon}
            >
              IM
            </motion.div>
            <h1 style={STYLES.h1}>Rhythm Sync</h1>
            <p style={STYLES.sub}>Tap with the beat. Build a steadier internal clock.</p>
          </div>

          <div style={STYLES.sciencePill}>
            <span style={STYLES.kicker}>Timing protocol</span>
            <p style={STYLES.bodyCopy}>
              The session measures tap-to-beat offset in milliseconds using the same AudioContext clock for both the click and your tap. Results are practice telemetry, not a diagnosis.
            </p>
          </div>

          <div style={STYLES.presetSection}>
            <p style={STYLES.sectionLabel}>Choose tempo</p>
            <div style={STYLES.presetGrid}>
              {BPM_PRESETS.map((preset) => (
                <motion.button
                  key={preset.bpm}
                  onClick={() => setSelectedBPM(preset.bpm)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    ...STYLES.presetButton,
                    background: selectedBPM === preset.bpm ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.025)',
                    borderColor: selectedBPM === preset.bpm ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: selectedBPM === preset.bpm ? '#00e5ff' : '#e8f4fb' }}>{preset.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{preset.bpm} BPM - {preset.desc}</div>
                </motion.button>
              ))}
            </div>
          </div>

          <div style={STYLES.instructionRow}>
            {[
              { icon: '1', text: 'Listen' },
              { icon: '2', text: 'Tap each pulse' },
              { icon: '3', text: 'Stay steady' },
            ].map((item) => (
              <div key={item.icon} style={STYLES.instructionItem}>
                <div style={STYLES.instructionIcon}>{item.icon}</div>
                <div style={STYLES.instructionText}>{item.text}</div>
              </div>
            ))}
          </div>

          <motion.button onClick={startCountdown} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={STYLES.ctaBtn}>
            Start - {TOTAL_ROUNDS} rounds of {TAPS_PER_ROUND} beats
          </motion.button>
          <p style={STYLES.hint}>Use Space, Enter, or tap the beat zone.</p>
        </motion.div>
      </div>
    );
  }

  if (phase === 'countdown') {
    return (
      <div style={STYLES.page}>
        <div style={STYLES.centerStack}>
          <p style={STYLES.countdownMeta}>Round {round} of {TOTAL_ROUNDS} - {selectedBPM} BPM</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={countdownNum}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={STYLES.countdownNumber}
            >
              {countdownNum <= 0 ? 'GO' : countdownNum}
            </motion.div>
          </AnimatePresence>
          <p style={STYLES.hint}>Get ready to tap.</p>
        </div>
      </div>
    );
  }

  if (phase === 'active') {
    const roundProgress = Math.min(100, (beatCount / TAPS_PER_ROUND) * 100);
    const sessionPts = allTapsRef.current.reduce((sum, tap) => sum + tap.pts, 0);

    return (
      <div style={STYLES.page}>
        <div style={STYLES.topBar}>
          <div>
            <div style={STYLES.topLabel}>Round</div>
            <div style={STYLES.topValue}>{round} / {TOTAL_ROUNDS}</div>
          </div>
          <div style={STYLES.progressWrap}>
            <div style={STYLES.progressMeta}>
              <span>Beat progress</span>
              <span style={{ color: orbColor }}>{beatCount} / {TAPS_PER_ROUND}</span>
            </div>
            <div style={STYLES.progressTrack}>
              <motion.div animate={{ width: `${roundProgress}%` }} transition={{ duration: 0.3 }} style={{ ...STYLES.progressFill, background: orbColor }} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={STYLES.topLabel}>BPM</div>
            <div style={STYLES.topValue}>{selectedBPM}</div>
          </div>
        </div>

        <AnimatePresence>
          {streak >= 3 && (
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} style={STYLES.streak}>
              {streak}x streak
            </motion.div>
          )}
        </AnimatePresence>

        <div style={STYLES.tapZone} onClick={handleTap} onTouchStart={handleTap}>
          <BeatOrb isBeating={isBeating} isAccent={isAccentBeat} orbColor={orbColor} />
          <AnimatePresence>
            {lastFeedback && (
              <motion.div
                key={`${lastFeedback.label}-${lastFeedback.offsetMs}`}
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.15 }}
                style={STYLES.feedback}
              >
                <div style={{ fontSize: 22, fontWeight: 900, color: lastFeedback.color, letterSpacing: '-0.03em', textShadow: `0 0 20px ${lastFeedback.color}80` }}>
                  {lastFeedback.label}
                </div>
                {lastFeedback.offsetMs > 0 && <div style={STYLES.feedbackSub}>{lastFeedback.offsetMs}ms off</div>}
              </motion.div>
            )}
          </AnimatePresence>
          <p style={STYLES.tapInstruction}>Tap on every pulse</p>
        </div>

        <div style={STYLES.historyBand}>
          <TapHistoryDots taps={roundTaps} />
        </div>

        <div style={STYLES.statBand}>
          {[
            { label: 'accuracy', value: `${Math.round((roundStats.validTaps / Math.max(currentRoundBeats, 1)) * 100)}%` },
            { label: 'avg offset', value: roundTaps.length ? `${roundStats.avgOffsetMs}ms` : '-' },
            { label: 'points', value: sessionPts },
          ].map((stat) => (
            <div key={stat.label} style={STYLES.statItem}>
              <div style={STYLES.statValue}>{stat.value}</div>
              <div style={STYLES.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'roundSummary') {
    const isLastRound = round >= TOTAL_ROUNDS;
    const scoreColor = roundStats.attentionScore >= 80 ? '#00e676' : roundStats.attentionScore >= 60 ? '#00e5ff' : roundStats.attentionScore >= 40 ? '#ffb300' : '#ff6b8a';

    return (
      <div style={STYLES.page}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={STYLES.summaryWrap}>
          <div style={STYLES.summaryHeader}>
            <div style={STYLES.summaryMeta}>Round {round} complete</div>
            <h2 style={{ ...STYLES.summaryTitle, color: scoreColor }}>
              {roundStats.attentionScore >= 80 ? 'Locked in.' : roundStats.attentionScore >= 60 ? 'Good rhythm.' : roundStats.attentionScore >= 40 ? 'Keep tuning.' : 'Slow it down.'}
            </h2>
          </div>

          <div style={STYLES.metricGrid}>
            {[
              { label: 'Attention', value: roundStats.attentionScore, unit: '/100', color: scoreColor },
              { label: 'Avg offset', value: roundStats.avgOffsetMs, unit: 'ms', color: '#e8f4fb' },
              { label: 'Best streak', value: roundStats.streakMax, unit: 'x', color: '#ffb300' },
            ].map((metric) => (
              <div key={metric.label} style={STYLES.metricCard}>
                <div style={{ fontSize: 22, fontWeight: 900, color: metric.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {metric.value}<span style={STYLES.metricUnit}>{metric.unit}</span>
                </div>
                <div style={STYLES.metricLabel}>{metric.label}</div>
              </div>
            ))}
          </div>

          <Panel title="Tap distribution">
            <DistributionBar taps={roundTaps} />
          </Panel>

          {!isLastRound && (
            <div style={STYLES.tempoAdjust}>
              <p style={STYLES.sectionLabel}>Tempo for round {round + 1}</p>
              <div style={STYLES.tempoButtons}>
                {BPM_PRESETS.map((preset) => (
                  <motion.button
                    key={preset.bpm}
                    onClick={() => {
                      setSelectedBPM(preset.bpm);
                      bpmRef.current = preset.bpm;
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      ...STYLES.tempoButton,
                      background: selectedBPM === preset.bpm ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.025)',
                      borderColor: selectedBPM === preset.bpm ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.06)',
                      color: selectedBPM === preset.bpm ? '#00e5ff' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {preset.bpm}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <motion.button onClick={isLastRound ? finishSession : nextRound} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={STYLES.ctaBtn}>
            {isLastRound ? 'View full report' : `Start round ${round + 1}`}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (phase === 'results') {
    const stats = sessionStats;
    const clinicalNote = getClinicalNote(stats.attentionScore, stats.avgOffsetMs, stats.timingVariance);
    const totalPts = taps.reduce((sum, tap) => sum + tap.pts, 0);
    const duration = Math.round((Date.now() - (sessionStartRef.current || Date.now())) / 1000);

    return (
      <div style={STYLES.page}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={STYLES.resultsWrap}>
          <div style={STYLES.summaryHeader}>
            <div style={STYLES.summaryMeta}>Session complete - {duration}s</div>
            <h2 style={STYLES.resultsTitle}>Attention timing profile</h2>
          </div>

          <div style={STYLES.resultsHero}>
            <AttentionRing score={stats.attentionScore} />
            <div style={STYLES.keyStats}>
              {[
                { label: 'Average offset', value: `${stats.avgOffsetMs}ms`, desc: 'lower is steadier' },
                { label: 'Timing variance', value: `${stats.timingVariance}ms`, desc: 'consistency' },
                { label: 'Best streak', value: `${stats.streakMax}x`, desc: 'accurate taps' },
                { label: 'Total taps', value: taps.length, desc: `${totalPts} pts earned` },
              ].map((stat) => (
                <div key={stat.label} style={STYLES.keyStatRow}>
                  <div style={STYLES.keyStatValue}>{stat.value}</div>
                  <div>
                    <div style={STYLES.keyStatLabel}>{stat.label}</div>
                    <div style={STYLES.keyStatDesc}>{stat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Panel title="Full session distribution">
            <DistributionBar taps={taps} />
          </Panel>

          <Panel title="Timing scatter - last 20 taps">
            <OffsetTimeline taps={taps} />
          </Panel>

          <div style={STYLES.notePanel}>
            <p style={STYLES.noteTitle}>Practice observation</p>
            <p style={STYLES.noteCopy}>{clinicalNote}</p>
          </div>

          <div style={STYLES.actions}>
            <motion.button onClick={resetSession} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} style={STYLES.ctaBtn}>
              New session
            </motion.button>
            {onClose && (
              <motion.button onClick={onClose} whileTap={{ scale: 0.97 }} style={STYLES.secondaryBtn}>
                Exit to Forge
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}

function Panel({ title, children }) {
  return (
    <div style={STYLES.panel}>
      <p style={STYLES.panelTitle}>{title}</p>
      {children}
    </div>
  );
}

const STYLES = {
  page: {
    minHeight: 0,
    height: '100%',
    width: '100%',
    background: '#020915',
    color: '#e8f4fb',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    fontFamily: 'inherit',
    backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,60,110,0.5) 0%, transparent 55%)',
    overflowY: 'auto',
  },
  introWrap: { maxWidth: 440, width: '100%', padding: '28px 20px 20px', display: 'flex', flexDirection: 'column' },
  introHeader: { textAlign: 'center', marginBottom: 22 },
  introIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 58,
    height: 58,
    borderRadius: '50%',
    border: '1.5px solid rgba(0,229,255,0.4)',
    background: 'rgba(0,229,255,0.06)',
    color: '#00e5ff',
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 16,
  },
  h1: { fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 900, letterSpacing: '-0.045em', color: '#e8f4fb', lineHeight: 1.1, marginBottom: 9 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' },
  sciencePill: {
    background: 'rgba(0,229,255,0.04)',
    border: '1px solid rgba(0,229,255,0.15)',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 22,
  },
  kicker: { fontSize: 11, color: '#00e5ff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' },
  bodyCopy: { fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginTop: 5 },
  presetSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 },
  presetGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 },
  presetButton: {
    padding: '12px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid',
    color: '#e8f4fb',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  instructionRow: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '12px 0',
    marginBottom: 22,
    borderTop: '1px solid rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  instructionItem: { textAlign: 'center' },
  instructionIcon: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '1px solid rgba(0,229,255,0.22)',
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  instructionText: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  ctaBtn: {
    width: '100%',
    padding: '15px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, rgba(0,229,255,0.85), rgba(0,180,210,0.9))',
    color: '#020915',
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: '-0.025em',
    cursor: 'pointer',
  },
  secondaryBtn: {
    width: '100%',
    padding: '13px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.58)',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.24)', textAlign: 'center', marginTop: 12 },
  centerStack: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 18, minHeight: 420 },
  countdownMeta: { fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' },
  countdownNumber: { fontSize: 88, fontWeight: 900, color: '#00e5ff', letterSpacing: '-0.06em', lineHeight: 1, textShadow: '0 0 30px rgba(0,229,255,0.4)' },
  topBar: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 },
  topLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  topValue: { fontSize: 16, fontWeight: 800, color: '#e8f4fb' },
  progressWrap: { flex: 1, margin: '0 16px' },
  progressMeta: { display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 9.5, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  progressTrack: { height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, transition: 'background 0.4s' },
  streak: { textAlign: 'center', marginTop: 8, fontSize: 12, fontWeight: 800, color: '#ffb300', letterSpacing: '0.05em', textTransform: 'uppercase' },
  tapZone: { flex: 1, minHeight: 245, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative', cursor: 'pointer' },
  orbStage: { position: 'relative', width: 210, height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  orbGlow: { position: 'absolute', inset: -34, borderRadius: '50%', pointerEvents: 'none' },
  orbRipple: { position: 'absolute', borderRadius: '50%', border: '1.5px solid', pointerEvents: 'none' },
  orbCore: {
    width: 150,
    height: 150,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'box-shadow 0.06s',
  },
  feedback: { position: 'absolute', top: '26%', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' },
  feedbackSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  tapInstruction: { fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.12em', textTransform: 'uppercase' },
  historyBand: { width: '100%', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.04)' },
  dotRow: { display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' },
  emptyDot: { width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' },
  tapDot: { width: 10, height: 10, borderRadius: '50%' },
  statBand: { display: 'flex', justifyContent: 'space-around', width: '100%', padding: '10px 0 12px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 },
  statItem: { textAlign: 'center' },
  statValue: { fontSize: 16, fontWeight: 800, color: '#e8f4fb', letterSpacing: '-0.03em' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 },
  summaryWrap: { maxWidth: 430, width: '100%', padding: '28px 20px 22px' },
  summaryHeader: { textAlign: 'center', marginBottom: 22 },
  summaryMeta: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 },
  summaryTitle: { fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', marginBottom: 4 },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 16 },
  metricCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 10px', textAlign: 'center' },
  metricUnit: { fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)' },
  metricLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 },
  panel: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 },
  panelTitle: { fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 },
  distribution: { display: 'flex', flexDirection: 'column', gap: 6 },
  distributionRow: { display: 'flex', alignItems: 'center', gap: 8 },
  distributionLabel: { fontSize: 11, fontWeight: 700, width: 64, textAlign: 'right', letterSpacing: '0.02em' },
  distributionTrack: { flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  distributionFill: { height: '100%', borderRadius: 3 },
  distributionCount: { fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 20 },
  tempoAdjust: { marginBottom: 18 },
  tempoButtons: { display: 'flex', gap: 8 },
  tempoButton: { flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', fontWeight: 800 },
  resultsWrap: { maxWidth: 510, width: '100%', padding: '24px 20px 26px' },
  resultsTitle: { fontSize: 26, fontWeight: 900, color: '#e8f4fb', letterSpacing: '-0.04em', marginBottom: 6 },
  resultsHero: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginBottom: 22 },
  attentionRing: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  attentionSvg: { position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' },
  ringLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 },
  keyStats: { display: 'flex', flexDirection: 'column', gap: 9 },
  keyStatRow: { display: 'flex', gap: 10, alignItems: 'center' },
  keyStatValue: { minWidth: 54, fontSize: 14, fontWeight: 800, color: '#e8f4fb', letterSpacing: '-0.02em' },
  keyStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  keyStatDesc: { fontSize: 10, color: 'rgba(255,255,255,0.2)' },
  timeline: { position: 'relative', height: 48 },
  timelineCenter: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,229,255,0.2)', borderRadius: 1 },
  timelineGuide: { position: 'absolute', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.05)' },
  timelineText: { position: 'absolute', right: 0, fontSize: 9, color: 'rgba(255,255,255,0.2)' },
  timelineDot: { position: 'absolute', transform: 'translate(-50%, -50%)', width: 7, height: 7, borderRadius: '50%' },
  notePanel: { background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.16)', borderRadius: 8, padding: '14px 16px', marginBottom: 18 },
  noteTitle: { fontSize: 10.5, color: '#00e5ff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 },
  noteCopy: { fontSize: 12.5, color: 'rgba(255,255,255,0.58)', lineHeight: 1.65 },
  actions: { display: 'flex', flexDirection: 'column', gap: 8 },
};
