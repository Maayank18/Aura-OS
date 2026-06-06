import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { forgeApi } from '../../services/api.js';

const DRAWING_TIME = 30;
const CANVAS_W = 760;
const CANVAS_H = 430;
const BRUSH_SIZES = [3, 7, 14];
const BRUSH_COLORS = ['#ffffff', '#00e5ff', '#c4b5fd', '#ff6b8a', '#ffb300', '#00e676', '#f97316', '#a78bfa'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function analyzeStrokes(strokes, canvasW, canvasH) {
  if (!strokes.length) {
    return {
      totalStrokes: 0,
      totalPoints: 0,
      coverage: 0,
      timeToFirst: DRAWING_TIME * 1000,
      avgSpeed: 0,
      hesitationIndex: 'high',
      expressionDensity: 'sparse',
      strokeEnergy: 'low',
      strokeComplexity: 'gestural',
      clinicalFlags: ['No strokes captured - emotional inhibition or technical interruption possible'],
      attentionScore: 0,
    };
  }

  const totalStrokes = strokes.length;
  const totalPoints = strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
  const allPoints = strokes.flatMap((stroke) => stroke.points);
  const timeToFirst = strokes[0]?.startOffsetMs || 0;
  const avgSpeed = Math.round(strokes.reduce((sum, stroke) => sum + (stroke.speed || 0), 0) / totalStrokes);

  const grid = new Set();
  allPoints.forEach((point) => {
    const gx = clamp(Math.floor((point.x / canvasW) * 8), 0, 7);
    const gy = clamp(Math.floor((point.y / canvasH) * 8), 0, 7);
    grid.add(`${gx},${gy}`);
  });

  const coverage = Math.round((grid.size / 64) * 100);
  const avgStrokeLen = totalPoints / totalStrokes;
  const hesitationIndex = timeToFirst > 8000 ? 'high' : timeToFirst > 4000 ? 'moderate' : 'low';
  const expressionDensity = coverage < 20 ? 'sparse' : coverage < 50 ? 'moderate' : 'dense';
  const strokeEnergy = avgSpeed > 400 ? 'high' : avgSpeed > 150 ? 'moderate' : 'low';
  const strokeComplexity = avgStrokeLen > 30 ? 'elaborate' : avgStrokeLen > 10 ? 'moderate' : 'gestural';

  const clinicalFlags = [];
  if (hesitationIndex === 'high') clinicalFlags.push('Long pause before drawing - possible inhibition or uncertainty');
  if (expressionDensity === 'sparse') clinicalFlags.push('Sparse canvas use - expression stayed contained');
  if (expressionDensity === 'dense') clinicalFlags.push('Dense canvas use - high cognitive or emotional load');
  if (strokeEnergy === 'high') clinicalFlags.push('Fast strokes - activated or energized expression');
  if (strokeEnergy === 'low') clinicalFlags.push('Slow strokes - careful control or low activation');

  const attentionScore = Math.round(clamp(
    (Math.min(totalStrokes, 20) / 20) * 38 +
    (coverage / 100) * 34 +
    (1 - Math.min(timeToFirst / 15000, 1)) * 28,
    0,
    100
  ));

  return {
    totalStrokes,
    totalPoints,
    coverage,
    timeToFirst,
    avgSpeed,
    hesitationIndex,
    expressionDensity,
    strokeEnergy,
    strokeComplexity,
    clinicalFlags,
    attentionScore,
  };
}

function CountdownRing({ timeLeft, running }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const pct = timeLeft / DRAWING_TIME;
  const color = timeLeft > 15 ? '#00e5ff' : timeLeft > 8 ? '#ffb300' : '#ff6b8a';

  return (
    <div style={S.countdown}>
      <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.4s' }}
        />
      </svg>
      <div style={S.countdownText}>
        <span style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1, fontFamily: 'monospace' }}>{timeLeft}</span>
        <span style={S.countdownLabel}>{running ? 'SEC' : 'READY'}</span>
      </div>
    </div>
  );
}

function ProcessingScreen() {
  const [stage, setStage] = useState(0);
  const stages = useMemo(() => ['Reading your strokes', 'Finding the shape', 'Building your world', 'Rendering the scene'], []);

  useEffect(() => {
    const timer = setInterval(() => setStage((current) => Math.min(current + 1, stages.length - 1)), 1500);
    return () => clearInterval(timer);
  }, [stages.length]);

  return (
    <div style={S.processing}>
      <div style={S.scanner}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              ...S.scanRing,
              inset: index * 14,
              borderColor: `rgba(0,229,255,${0.6 - index * 0.15})`,
              animationDelay: `${index * 0.2}s`,
            }}
          />
        ))}
        <div style={S.scanCore} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={S.processingTitle}>{stages[stage]}</div>
        <div style={S.stageDots}>
          {stages.map((_, index) => (
            <div key={index} style={{ ...S.stageDot, background: index <= stage ? '#00e5ff' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>

      <p style={S.processingCopy}>
        OpenRouter is transforming the sketch into a vector world. Your API key stays on the backend.
      </p>
    </div>
  );
}

function MetricPanel({ metrics, result }) {
  if (!metrics) return null;
  const scoreColor = metrics.attentionScore > 70 ? '#00e676' : metrics.attentionScore > 45 ? '#00e5ff' : '#ffb300';

  return (
    <div style={S.insightStack}>
      <div style={S.panel}>
        <div style={S.panelTitle}>Drawing metrics</div>
        <div style={S.metricGrid}>
          {[
            { label: 'Coverage', value: `${metrics.coverage}%`, desc: metrics.expressionDensity },
            { label: 'Energy', value: metrics.strokeEnergy, desc: `${metrics.totalStrokes} strokes` },
            { label: 'Engagement', value: metrics.attentionScore, desc: '/100' },
          ].map((metric) => (
            <div key={metric.label} style={S.metricCard}>
              <div style={{ ...S.metricValue, color: scoreColor }}>{metric.value}</div>
              <div style={S.metricLabel}>{metric.label}</div>
              <div style={S.metricDesc}>{metric.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {result?.clinical_observation && (
        <div style={S.observationPanel}>
          <div style={S.observationTitle}>Reflection note</div>
          <p style={S.observationCopy}>{result.clinical_observation}</p>
          {metrics.clinicalFlags?.length > 0 && (
            <div style={S.flagList}>
              {metrics.clinicalFlags.slice(0, 2).map((flag) => (
                <div key={flag} style={S.flagRow}>
                  <span style={S.flagMarker}>◆</span>
                  {flag}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SparkCanvas({ onSessionEnd, onClose }) {
  const [phase, setPhase] = useState('intro');
  const phaseRef = useRef('intro');
  const [timeLeft, setTimeLeft] = useState(DRAWING_TIME);
  const [timerRunning, setTimerRunning] = useState(false);
  const [brushSizeIndex, setBrushSizeIndex] = useState(1);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [strokeMetrics, setStrokeMetrics] = useState(null);
  const [showInsight, setShowInsight] = useState(false);
  const [sketchDataUrl, setSketchDataUrl] = useState(null);
  const [logged, setLogged] = useState(false);

  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const lastPosRef = useRef(null);
  const sessionStartRef = useRef(null);
  const canvasOpenedAtRef = useRef(null);
  const completedRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (phase !== 'drawing') return;
    canvasOpenedAtRef.current = Date.now();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [phase]);

  const getPos = useCallback((event, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const completeDrawing = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const metrics = analyzeStrokes(strokesRef.current, canvas.width, canvas.height);
    setSketchDataUrl(dataUrl);
    setStrokeMetrics(metrics);
    setPhase('processing');

    try {
      const json = await forgeApi.transformSketch(dataUrl.split(',')[1], metrics);
      setResult(json.result);
      setPhase('reveal');
    } catch (err) {
      console.error('[SparkCanvas] transform failed:', err);
      setError(err.message || 'Transformation failed');
      setPhase('error');
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    sessionStartRef.current = Date.now();
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          completeDrawing();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, [completeDrawing]);

  const startStroke = useCallback((event) => {
    if (phaseRef.current !== 'drawing') return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!timerRef.current) startTimer();

    const pos = getPos(event, canvas);
    const startOffsetMs = Date.now() - (canvasOpenedAtRef.current || Date.now());
    const size = BRUSH_SIZES[brushSizeIndex];
    const ctx = canvas.getContext('2d');

    setIsDrawing(true);
    setHasStarted(true);
    lastPosRef.current = pos;
    currentStrokeRef.current = {
      points: [pos],
      startOffsetMs,
      color: brushColor,
      size,
      timestamps: [Date.now()],
      speed: 0,
    };

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = brushColor;
    ctx.fill();
  }, [brushColor, brushSizeIndex, getPos, startTimer]);

  const continueStroke = useCallback((event) => {
    if (!isDrawing || phaseRef.current !== 'drawing') return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(event, canvas);
    const last = lastPosRef.current;
    if (!last) return;

    const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
    if (dist < 2) return;

    const size = BRUSH_SIZES[brushSizeIndex];
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPosRef.current = pos;
    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(pos);
      currentStrokeRef.current.timestamps.push(Date.now());
    }
  }, [brushColor, brushSizeIndex, getPos, isDrawing]);

  const endStroke = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const stroke = currentStrokeRef.current;
    if (stroke && stroke.points.length > 1) {
      const totalDist = stroke.points.slice(1).reduce((sum, point, index) => {
        const prev = stroke.points[index];
        return sum + Math.hypot(point.x - prev.x, point.y - prev.y);
      }, 0);
      const duration = Math.max(1, stroke.timestamps[stroke.timestamps.length - 1] - stroke.timestamps[0]);
      stroke.speed = (totalDist / duration) * 1000;
      strokesRef.current.push(stroke);
    }

    currentStrokeRef.current = null;
    lastPosRef.current = null;
  }, [isDrawing]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
    currentStrokeRef.current = null;
    lastPosRef.current = null;
    setHasStarted(false);
  }, []);

  const restart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    completedRef.current = false;
    strokesRef.current = [];
    currentStrokeRef.current = null;
    lastPosRef.current = null;
    sessionStartRef.current = null;
    canvasOpenedAtRef.current = null;
    setTimeLeft(DRAWING_TIME);
    setTimerRunning(false);
    setHasStarted(false);
    setIsDrawing(false);
    setResult(null);
    setError(null);
    setStrokeMetrics(null);
    setShowInsight(false);
    setSketchDataUrl(null);
    setLogged(false);
    setPhase('intro');
  }, []);

  const emitSession = useCallback(() => {
    if (!result || logged) return;
    const metrics = strokeMetrics || analyzeStrokes([], CANVAS_W, CANVAS_H);
    const payload = {
      gameId: 'spark_canvas',
      gameName: 'Spark Canvas',
      durationSeconds: DRAWING_TIME - timeLeft || DRAWING_TIME,
      interactions: metrics.totalStrokes || 0,
      avgReactionMs: metrics.timeToFirst || 0,
      accuracy: metrics.attentionScore || 0,
      score: metrics.attentionScore || 0,
      extraData: {
        subject_category: result.subject_category,
        emotion_unlocked: result.emotion_unlocked,
        real_world_title: result.real_world_title,
        canvas_coverage: metrics.coverage,
        stroke_energy: metrics.strokeEnergy,
        expression_density: metrics.expressionDensity,
        hesitation_index: metrics.hesitationIndex,
        clinicalNote: result.clinical_observation || '',
        clinicalFlags: metrics.clinicalFlags || [],
        usedFallback: Boolean(result.fallback),
      },
      predictedEffects: {
        stressReduction: Math.min(10, 4 + Math.round((metrics.coverage || 0) / 20)),
        dopamineActivation: result.fallback ? 6 : 8,
        focusScore: Math.min(10, Math.round((metrics.attentionScore || 0) / 10)),
        arousalLevel: metrics.strokeEnergy === 'high' ? 'high' : metrics.strokeEnergy === 'low' ? 'low' : 'moderate',
        clinicalNote: result.clinical_observation || '',
      },
      completedAt: new Date().toISOString(),
    };
    setLogged(true);
    onSessionEnd?.(payload);
  }, [logged, onSessionEnd, result, strokeMetrics, timeLeft]);

  if (phase === 'intro') {
    return (
      <div style={S.page}>
        <style>{KEYFRAMES}</style>
        <div style={S.introWrap}>
          <div style={S.introHeader}>
            <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} style={S.sparkIcon}>
              <SparkGlyph />
            </motion.div>
            <h1 style={S.h1}>Spark Canvas</h1>
            <p style={S.introSub}>Draw anything in 30 seconds. Watch it become a world.</p>
          </div>

          <div style={S.scienceCard}>
            <div style={S.sectionLabel}>Why thirty seconds?</div>
            <p style={S.bodyCopy}>
              A short drawing window keeps the sketch loose and unpolished. The value is not artistic skill; it is the shape of a first impulse.
            </p>
          </div>

          <div style={S.promptGridWrap}>
            <div style={S.sectionLabel}>Draw anything</div>
            <div style={S.promptGrid}>
              {['A feeling', 'A place', 'A person', 'An animal', 'A symbol', 'A mess'].map((prompt) => (
                <div key={prompt} style={S.promptChip}>{prompt}</div>
              ))}
            </div>
          </div>

          <motion.button onClick={() => setPhase('drawing')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={S.cta}>
            Open the canvas
          </motion.button>
          <p style={S.hint}>The timer starts with your first stroke.</p>
        </div>
      </div>
    );
  }

  if (phase === 'drawing') {
    const urgentTime = timerRunning && timeLeft <= 8;

    return (
      <div style={S.page}>
        <style>{KEYFRAMES}</style>
        <div style={S.toolbar}>
          <div style={S.brushRow}>
            {BRUSH_SIZES.map((size, index) => (
              <button key={size} onClick={() => setBrushSizeIndex(index)} style={{ ...S.brushButton, background: brushSizeIndex === index ? 'rgba(255,255,255,0.12)' : 'transparent' }}>
                <div style={{ ...S.brushPreview, width: size * 1.5, height: size * 1.5, background: brushColor }} />
              </button>
            ))}
          </div>

          <CountdownRing timeLeft={timeLeft} running={timerRunning} />

          <div style={S.actionRow}>
            <button onClick={clearCanvas} style={S.toolButton} title="Clear">Clear</button>
            <button onClick={completeDrawing} style={{ ...S.toolButton, color: '#00e5ff', borderColor: 'rgba(0,229,255,0.28)' }} title="Done">Done</button>
          </div>
        </div>

        <div style={S.paletteRow}>
          {BRUSH_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setBrushColor(color)}
              style={{
                ...S.colorButton,
                background: color,
                outlineColor: brushColor === color ? '#ffffff' : 'transparent',
                transform: brushColor === color ? 'scale(1.16)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <div style={S.canvasWrap}>
          <AnimatePresence>
            {!hasStarted && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={S.canvasPrompt}>
                <div style={S.promptStar}>✦</div>
                <p style={S.canvasPromptText}>Start drawing</p>
              </motion.div>
            )}
          </AnimatePresence>

          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              ...S.canvas,
              borderColor: urgentTime ? 'rgba(255,107,138,0.45)' : 'rgba(255,255,255,0.07)',
            }}
            onMouseDown={startStroke}
            onMouseMove={continueStroke}
            onMouseUp={endStroke}
            onMouseLeave={endStroke}
            onTouchStart={startStroke}
            onTouchMove={continueStroke}
            onTouchEnd={endStroke}
          />

          {urgentTime && <div style={S.urgent}>Almost done</div>}
        </div>
      </div>
    );
  }

  if (phase === 'processing') {
    return (
      <div style={S.page}>
        <style>{KEYFRAMES}</style>
        <ProcessingScreen />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}>
        <style>{KEYFRAMES}</style>
        <div style={S.errorBox}>
          <div style={S.errorIcon}>!</div>
          <div style={S.errorTitle}>Transformation failed</div>
          <p style={S.errorCopy}>{error || 'Could not reach the sketch transformer.'}</p>
          <button onClick={restart} style={S.cta}>Try again</button>
        </div>
      </div>
    );
  }

  if (phase === 'reveal' && result) {
    const emotionColor = getEmotionColor(result.emotion_unlocked);

    return (
      <div style={S.page}>
        <style>{KEYFRAMES}</style>
        <div style={S.revealHeader}>
          <div>
            <div style={S.revealKicker}>Your spark became</div>
            <div style={S.revealTitle}>{result.real_world_title}</div>
          </div>
          <div style={{ ...S.emotionPill, color: emotionColor, borderColor: `${emotionColor}55`, background: `${emotionColor}18` }}>
            {result.emotion_unlocked || 'spark'}
          </div>
        </div>

        <div style={S.worldFrame}>
          <div
            style={S.svgWorld}
            dangerouslySetInnerHTML={{
              __html: result.svg_world
                ?.replace(/<svg/i, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet"')
                || '',
            }}
          />
          {sketchDataUrl && (
            <div style={S.sketchThumb}>
              <img src={sketchDataUrl} style={S.sketchImg} alt="Your sketch" />
              <div style={S.sketchLabel}>Sketch</div>
            </div>
          )}
        </div>

        <div style={S.revealBody}>
          <div style={S.panel}>
            <div style={S.panelTitle}>What the world saw</div>
            <p style={S.interpretation}>{result.what_i_see}</p>
            {result.fallback && <p style={S.fallbackNote}>Local renderer used because OpenRouter was unavailable.</p>}
          </div>

          <button onClick={() => setShowInsight((show) => !show)} style={S.insightButton}>
            <span>Drawing analysis</span>
            <span>{showInsight ? 'Hide' : 'Show'}</span>
          </button>
          {showInsight && <MetricPanel metrics={strokeMetrics} result={result} />}

          <div style={S.bottomActions}>
            <button onClick={restart} style={{ ...S.cta, flex: 1, padding: '12px' }}>Draw again</button>
            <button onClick={emitSession} disabled={logged} style={{ ...S.secondaryButton, opacity: logged ? 0.5 : 1 }}>
              {logged ? 'Saved' : 'Save to Forge'}
            </button>
            {onClose && <button onClick={onClose} style={S.iconButton}>Exit</button>}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function SparkGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3z" />
      <path d="M18 15l.7 2.1L21 18l-2.3.9L18 21l-.7-2.1L15 18l2.3-.9L18 15z" />
      <path d="M6 15l.5 1.5L8 17l-1.5.5L6 19l-.5-1.5L4 17l1.5-.5L6 15z" />
    </svg>
  );
}

function getEmotionColor(emotion = '') {
  const colors = {
    joy: '#ffb300',
    love: '#ff6b8a',
    calm: '#00e5ff',
    wonder: '#c4b5fd',
    hope: '#00e676',
    melancholy: '#5eead4',
    energy: '#f97316',
    peace: '#a78bfa',
  };
  return colors[String(emotion).toLowerCase()] || '#c4b5fd';
}

const S = {
  page: {
    height: '100%',
    minHeight: 0,
    width: '100%',
    background: '#080e1c',
    color: '#e8f4fb',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'inherit',
    backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,40,90,0.5) 0%, transparent 60%)',
    overflowY: 'auto',
  },
  introWrap: { maxWidth: 440, width: '100%', margin: '0 auto', padding: '34px 22px 26px', display: 'flex', flexDirection: 'column' },
  introHeader: { textAlign: 'center', marginBottom: 24 },
  sparkIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    margin: '0 auto 18px',
    border: '1px solid rgba(0,229,255,0.3)',
    background: 'rgba(0,229,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h1: { fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 900, letterSpacing: '-0.05em', color: '#e8f4fb', lineHeight: 1.1, marginBottom: 12 },
  introSub: { fontSize: 14.5, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65, maxWidth: 320, margin: '0 auto' },
  scienceCard: { background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: 8, padding: '13px 16px', marginBottom: 18 },
  sectionLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 },
  bodyCopy: { fontSize: 12.5, color: 'rgba(255,255,255,0.54)', lineHeight: 1.65 },
  promptGridWrap: { marginBottom: 22 },
  promptGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 7 },
  promptChip: { fontSize: 11, color: 'rgba(255,255,255,0.38)', padding: '8px 6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', background: 'rgba(255,255,255,0.02)' },
  cta: {
    width: '100%',
    padding: '15px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, rgba(0,229,255,0.9), rgba(0,160,200,0.9))',
    color: '#080e1c',
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: '-0.02em',
    cursor: 'pointer',
  },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: 12 },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 },
  brushRow: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 104 },
  brushButton: { width: 30, height: 30, borderRadius: 8, border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brushPreview: { borderRadius: '50%', maxWidth: 18, maxHeight: 18 },
  countdown: { position: 'relative', width: 72, height: 72, flexShrink: 0 },
  countdownText: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  countdownLabel: { fontSize: 8, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.1em' },
  actionRow: { display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', minWidth: 104 },
  toolButton: { minWidth: 48, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800 },
  paletteRow: { display: 'flex', gap: 8, padding: '8px 16px 4px', justifyContent: 'center', flexShrink: 0 },
  colorButton: { width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', outline: '2px solid', outlineOffset: 2, transition: 'transform 0.1s, outline-color 0.1s' },
  canvasWrap: { flex: 1, minHeight: 330, padding: '8px 12px 12px', position: 'relative' },
  canvasPrompt: { position: 'absolute', inset: '8px 12px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 },
  promptStar: { fontSize: 32, marginBottom: 10, opacity: 0.18, animation: 'orbPulse 2s ease-in-out infinite' },
  canvasPromptText: { fontSize: 13, color: 'rgba(255,255,255,0.24)', letterSpacing: '0.05em' },
  canvas: { width: '100%', height: '100%', borderRadius: 8, border: '1px solid', cursor: 'crosshair', background: '#0a0f1a', touchAction: 'none', transition: 'border-color 0.3s' },
  urgent: { position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,107,138,0.76)', letterSpacing: '0.15em', textTransform: 'uppercase', animation: 'scanPulse 0.5s ease-in-out infinite', pointerEvents: 'none' },
  processing: { flex: 1, minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, padding: '40px 24px' },
  scanner: { position: 'relative', width: 120, height: 120 },
  scanRing: { position: 'absolute', borderRadius: '50%', border: '1px solid', animation: 'scanPulse 1.4s ease-in-out infinite' },
  scanCore: { position: 'absolute', inset: 44, borderRadius: '50%', background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.6)', animation: 'scanPulse 1s ease-in-out infinite' },
  processingTitle: { fontSize: 15, fontWeight: 700, color: '#e8f4fb', marginBottom: 8 },
  stageDots: { display: 'flex', gap: 5, justifyContent: 'center' },
  stageDot: { width: 6, height: 6, borderRadius: '50%', transition: 'background 0.3s' },
  processingCopy: { fontSize: 12, color: 'rgba(255,255,255,0.28)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 },
  errorBox: { textAlign: 'center', padding: 24, maxWidth: 360 },
  errorIcon: { width: 40, height: 40, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b8a', border: '1px solid rgba(255,107,138,0.3)', fontWeight: 900 },
  errorTitle: { fontSize: 15, color: '#ff6b8a', marginBottom: 8, fontWeight: 800 },
  errorCopy: { fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 20, lineHeight: 1.6 },
  revealHeader: { padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexShrink: 0 },
  revealKicker: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 },
  revealTitle: { fontSize: 20, fontWeight: 900, color: '#e8f4fb', letterSpacing: '-0.04em', lineHeight: 1.15 },
  emotionPill: { padding: '5px 13px', borderRadius: 8, fontSize: 11, fontWeight: 800, border: '1px solid', letterSpacing: '0.05em', textTransform: 'capitalize', flexShrink: 0 },
  worldFrame: { margin: '0 12px 12px', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', animation: 'revealWorld 0.8s ease-out', background: '#0a0f1a', position: 'relative', aspectRatio: '8 / 5', minHeight: 250, flexShrink: 0 },
  svgWorld: { width: '100%', height: '100%', lineHeight: 0 },
  sketchThumb: { position: 'absolute', top: 12, right: 12, width: 94, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.16)', opacity: 0.78 },
  sketchImg: { width: '100%', height: '100%', objectFit: 'cover' },
  sketchLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: '3px 5px', background: 'linear-gradient(to top, rgba(0,0,0,0.62), transparent)', fontSize: 8, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.07em', textTransform: 'uppercase' },
  revealBody: { padding: '0 12px 14px' },
  panel: { background: 'rgba(255,255,255,0.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', padding: '13px 16px', marginBottom: 10 },
  panelTitle: { fontSize: 10, color: 'rgba(255,255,255,0.32)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 },
  interpretation: { fontSize: 13.5, color: 'rgba(255,255,255,0.66)', lineHeight: 1.65 },
  fallbackNote: { marginTop: 8, fontSize: 11, color: 'rgba(255,179,0,0.72)' },
  insightButton: { width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 12, background: 'rgba(196,181,253,0.05)', border: '1px solid rgba(196,181,253,0.15)', color: '#c4b5fd', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  insightStack: { paddingBottom: 8 },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 },
  metricCard: { background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' },
  metricValue: { fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em', textTransform: 'capitalize' },
  metricLabel: { fontSize: 9, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 },
  metricDesc: { fontSize: 9, color: 'rgba(255,255,255,0.22)', marginTop: 1, textTransform: 'capitalize' },
  observationPanel: { background: 'rgba(196,181,253,0.05)', border: '1px solid rgba(196,181,253,0.15)', borderRadius: 8, padding: '13px 16px', marginBottom: 8 },
  observationTitle: { fontSize: 10, color: '#c4b5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 },
  observationCopy: { fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 },
  flagList: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 },
  flagRow: { fontSize: 11, color: 'rgba(255,179,0,0.72)', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.4 },
  flagMarker: { flexShrink: 0, color: '#ffb300', marginTop: 1 },
  bottomActions: { display: 'flex', gap: 8, marginTop: 4 },
  secondaryButton: { padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.62)', fontFamily: 'inherit', cursor: 'pointer' },
  iconButton: { padding: '12px 13px', borderRadius: 8, fontSize: 13, fontWeight: 800, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.46)', fontFamily: 'inherit', cursor: 'pointer' },
};

const KEYFRAMES = `
  @keyframes orbPulse {
    0%, 100% { opacity: 0.62; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.04); }
  }
  @keyframes scanPulse {
    0%, 100% { opacity: 0.42; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.06); }
  }
  @keyframes revealWorld {
    from { opacity: 0; transform: scale(0.97) translateY(6px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;
