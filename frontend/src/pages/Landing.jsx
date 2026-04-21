import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Mic, Wind, Zap, Shield, Brain, Activity,
  AlertTriangle, ChevronDown, TrendingDown, CheckCircle, Heart,
  Eye, Cpu, Radio, Layers, BarChart2,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════
   SCROLL-AWARE SECTION WRAPPER
══════════════════════════════════════════════════════════ */
function FadeUp({ children, delay = 0, className = '', style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   GLASS CARD WRAPPER
══════════════════════════════════════════════════════════ */
function GlassCard({ children, className = '', style = {}, hoverGlow = 'rgba(0,229,255,0.08)' }) {
  return (
    <motion.div
      initial={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 8px 24px rgba(0,0,0,0.3)' }}
      whileHover={{ y: -4, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 20px ${hoverGlow}, 0 16px 32px rgba(0,0,0,0.5)` }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`glass-card ${className}`}
      style={{
        borderRadius: 24, // consistent rounded-2xl/3xl
        padding: '32px', // consistent internal padding
        background: 'rgba(15, 23, 42, 0.4)', // deep dark mode glass
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   ANIMATED BIOLUMINESCENT CORE ORB
══════════════════════════════════════════════════════════ */
function CoreOrb({ size = 280 }) {
  const orbits = [
    { radius: size * 0.52, dur: 6,  size: 10, color: '#00e5ff', delay: 0 },
    { radius: size * 0.67, dur: 9,  size: 7,  color: '#7c3aed', delay: 1.5 },
    { radius: size * 0.81, dur: 13, size: 5,  color: '#00bfa5', delay: 3 },
    { radius: size * 0.92, dur: 17, size: 4,  color: '#c4b5fd', delay: 0 },
  ];
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      {/* Deep glow halo */}
      <div style={{
        position: 'absolute', inset: -size * 0.25,
        background: `radial-gradient(circle, rgba(0,229,255,0.1) 0%, rgba(124,58,237,0.08) 40%, transparent 70%)`,
        borderRadius: '50%', animation: 'coreGlow 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Orbit rings */}
      {orbits.map((o, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: o.radius * 2, height: o.radius * 2,
          marginTop: -o.radius, marginLeft: -o.radius,
          borderRadius: '50%',
          border: `1px solid ${o.color}18`,
        }}>
          {/* particle on each ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: o.dur, repeat: Infinity, ease: 'linear', delay: o.delay }}
            style={{ width: '100%', height: '100%', borderRadius: '50%', position: 'relative' }}
          >
            <div style={{
              position: 'absolute', top: -o.size / 2, left: '50%', marginLeft: -o.size / 2,
              width: o.size, height: o.size, borderRadius: '50%',
              background: o.color,
              boxShadow: `0 0 ${o.size * 3}px ${o.color}, 0 0 ${o.size * 6}px ${o.color}55`,
            }} />
          </motion.div>
        </div>
      ))}
      {/* Core sphere */}
      <div style={{
        position: 'absolute',
        top: size * 0.22, left: size * 0.22,
        width: size * 0.56, height: size * 0.56,
        borderRadius: '50%',
        background: 'conic-gradient(from 0deg, #7c3aed, #00e5ff, #00bfa5, #9b59f5, #7c3aed)',
        boxShadow: '0 0 60px rgba(0,229,255,0.5), 0 0 120px rgba(124,58,237,0.35), inset 0 0 40px rgba(255,255,255,0.06)',
        animation: 'logoHue 8s linear infinite, voidBreathe 4s ease-in-out infinite',
      }}>
        <div style={{
          position: 'absolute', inset: '14%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.28), transparent 55%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.45), transparent 55%)',
        }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ACOUSTIC WAVEFORM (Pillar A visual — Multi-layered UI Orb)
══════════════════════════════════════════════════════════ */
function AcousticWaveform() {
  return (
    <div className="relative flex items-center justify-center overflow-hidden shrink-0 aspect-square w-64 h-64 mx-auto mt-auto pt-4 shadow-inner">
      {/* Outer Conic Sweep */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', width: 140, height: 140, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, transparent 0%, rgba(0,229,255,0.05) 50%, rgba(0,229,255,0.4) 100%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 58%, black 60%)',
          maskImage: 'radial-gradient(circle, transparent 58%, black 60%)',
        }}
      />
      {/* Middle Dashed Ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', width: 110, height: 110, borderRadius: '50%',
          border: '1px dashed rgba(124,58,237,0.5)', 
          WebkitMaskImage: 'linear-gradient(rgba(0,0,0,1), rgba(0,0,0,0.2))'
        }}
      />
      {/* Inner Dotted Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', width: 90, height: 90, borderRadius: '50%',
          border: '1px dotted rgba(0,229,255,0.4)', opacity: 0.6
        }}
      />

      {/* Live Waveform Core */}
      <div style={{ position: 'absolute', width: 56, height: 56, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, rgba(124,58,237,0.4), rgba(0,229,255,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden', boxShadow: '0 0 30px rgba(124,58,237,0.6)', border: '1px solid rgba(0,229,255,0.3)' }}>
        {[1,2,3,4,5,6].map(i => (
          <motion.div key={i} animate={{ height: [12, 20 + Math.random()*24, 12] }} transition={{ duration: 0.5 + Math.random(), repeat: Infinity, ease: "easeInOut" }} style={{ width: 3, background: '#00e5ff', borderRadius: 2, boxShadow: '0 0 8px #00e5ff' }} />
        ))}
      </div>

       {/* Telemetry Labels around the orb */}
       <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} style={{ position: 'absolute', top: 30, left: '10%', fontSize: 9.5, color: '#00e5ff', fontFamily: 'var(--font)', fontWeight: 600, letterSpacing: '0.04em' }}>Jitter: 0.038ms</motion.div>
       <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} style={{ position: 'absolute', top: 50, right: '5%', fontSize: 9.5, color: '#c4b5fd', fontFamily: 'var(--font)', fontWeight: 600, letterSpacing: '0.04em' }}>Shimmer: Stable</motion.div>
       <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }} style={{ position: 'absolute', bottom: 65, left: '5%', fontSize: 9.5, color: '#00bfa5', fontFamily: 'var(--font)', fontWeight: 600, letterSpacing: '0.04em' }}>Arousal: Baseline</motion.div>

       {/* Real-time Indicator Panel */}
       <div style={{ position: 'absolute', bottom: 12, display: 'flex', gap: 10 }}>
         <div style={{ background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,229,255,0.2)', fontSize: 10, color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)' }}>
            <motion.div animate={{opacity:[0.2,1,0.2]}} transition={{duration:1,repeat:Infinity}} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }} />
            SER Active
         </div>
       </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ECOSYSTEM ORBIT DIAGRAM — Closed Loop
══════════════════════════════════════════════════════════ */
function EcosystemOrbit() {
  const rings = [
    { r: 50,  label: 'User',       color: '#00e5ff', size: 42 },
    { r: 110, label: 'Aura Voice', color: '#7c3aed', size: 28 },
    { r: 168, label: 'Forge & Shatter', color: '#00bfa5', size: 28 },
    { r: 220, label: 'Guardian Portal',  color: '#ffb300', size: 28 },
  ];
  const satellites = [
    { ring: 3, angle: 30,  label: 'Therapists', icon: '👩‍⚕️' },
    { ring: 3, angle: 150, label: 'Family Network', icon: '👨‍👩‍👧' },
    { ring: 3, angle: 270, label: 'Clinical Reports', icon: '📊' },
  ];
  return (
    <div style={{ position: 'relative', width: 480, height: 480, margin: '0 auto' }}>
      {rings.map((ring, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: ring.r * 2, height: ring.r * 2,
          marginLeft: -ring.r, marginTop: -ring.r,
          borderRadius: '50%',
          border: `1px solid ${ring.color}22`,
          background: i === 0
            ? `radial-gradient(circle, ${ring.color}18, transparent 70%)`
            : `radial-gradient(circle, ${ring.color}06, transparent 70%)`,
        }}>
          {i === 0 && (
            <div style={{
              position: 'absolute', inset: '10%',
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg,#7c3aed,#00e5ff,#00bfa5,#7c3aed)',
              animation: 'logoHue 8s linear infinite, voidBreathe 5s ease-in-out infinite',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.9)',
            }}>User</div>
          )}
        </div>
      ))}
      {/* Pillar labels at rings 1–3 */}
      {[
        { r: 110, angle: -30, label: 'Pillar A: Aura Voice', sub: '(Ambient Triage)', color: '#7c3aed' },
        { r: 168, angle: 70,  label: 'Pillar B & C: Forge & Shatter', sub: '(Regulation)', color: '#00bfa5' },
        { r: 220, angle: 160, label: 'Pillar D: Guardian Portal', sub: '(Safety Net)', color: '#ffb300' },
      ].map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = 240 + p.r * Math.cos(rad) - 70;
        const y = 240 + p.r * Math.sin(rad) - 20;
        return (
          <motion.div
            key={i}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
            style={{
              position: 'absolute', left: x, top: y,
              background: `${p.color}10`,
              border: `1px solid ${p.color}25`,
              borderRadius: 8, padding: '5px 10px',
              fontSize: 10, fontWeight: 700, color: p.color,
              whiteSpace: 'nowrap',
              boxShadow: `0 0 16px ${p.color}15`,
            }}
          >
            {p.label}<br /><span style={{ fontWeight: 400, opacity: 0.7 }}>{p.sub}</span>
          </motion.div>
        );
      })}
      {/* Satellite dots */}
      {satellites.map((s, i) => {
        const r = rings[s.ring].r;
        const rad = (s.angle * Math.PI) / 180;
        const x = 240 + r * Math.cos(rad) - 14;
        const y = 240 + r * Math.sin(rad) - 14;
        return (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity }}
            style={{
              position: 'absolute', left: x, top: y,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12,
            }}
          >
            {s.icon}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   WORRY BLOCK — Cognitive Forge animation
══════════════════════════════════════════════════════════ */
function CognitiveForgeDemo() {
  const [blocks, setBlocks] = useState([
    { id: 1, label: 'overwhelmed', x: 20, y: -20, size: 64, color: '#7c3aed' },
    { id: 2, label: 'failing',     x: -40, y: -10, size: 52, color: '#ff6b8a' },
    { id: 3, label: 'stuck',       x: 60, y: 15, size: 40, color: '#00bfa5' },
  ]);
  const [incinerated, setIncinerated] = useState([]);

  const handleDragEnd = (event, info, id) => {
    // Drop zone is near the bottom
    if (info.offset.y > 45 || info.point.y > 180) {
      setIncinerated(prev => [...prev, id]);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 230, overflow: 'hidden', marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Abstract Glowing Grid at the bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, perspective: 400, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(124,58,237,0.15), transparent)', zIndex: 1 }} />
        <div style={{
           position: 'absolute', bottom: 0, left: '-50%', width: '200%', height: 150,
           backgroundImage: 'linear-gradient(rgba(124,58,237,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.2) 1px, transparent 1px)',
           backgroundSize: '24px 24px', backgroundPosition: 'center bottom',
           transform: 'rotateX(75deg) translateY(20px)', transformOrigin: 'bottom',
        }} />
      </div>

      {/* Incinerator Drop Zone */}
      <div style={{
        position: 'absolute', bottom: 0, left: '5%', right: '5%', height: 40,
        background: 'linear-gradient(180deg, rgba(124,58,237,0.3), rgba(124,58,237,0.05))',
        borderTop: '2px solid rgba(124,58,237,0.8)',
        borderRadius: '16px 16px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: '#c4b5fd', letterSpacing: '0.1em', textTransform: 'uppercase',
        boxShadow: '0 -10px 30px rgba(124,58,237,0.4)', zIndex: 2
      }}>
        ⚡ Drag here to Burn ⚡
      </div>

      {/* Draggable Worry Blocks */}
      <div style={{ position: 'relative', width: '100%', height: 130, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence>
          {blocks.filter(b => !incinerated.includes(b.id)).map((b) => (
            <motion.div
              key={b.id}
              drag
              dragConstraints={{ left: -100, right: 100, top: -50, bottom: 80 }}
              dragSnapToOrigin={false}
              onDragEnd={(e, info) => handleDragEnd(e, info, b.id)}
              whileHover={{ scale: 1.05 }}
              whileDrag={{ scale: 1.1, cursor: 'grabbing', boxShadow: `0 0 30px ${b.color}50` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1, x: b.x, y: b.y }}
              exit={{ opacity: 0, scale: 0, y: 150, filter: 'blur(8px)' }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              style={{
                position: 'absolute',
                width: 'auto', padding: '12px 18px', height: b.size,
                background: `${b.color}15`,
                border: `2px solid ${b.color}60`,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 900, color: '#fff',
                cursor: 'grab',
                backdropFilter: 'blur(8px)',
                boxShadow: `0 8px 24px rgba(0,0,0,0.3), inset 0 0 20px ${b.color}20`,
                fontFamily: 'monospace', textTransform: 'uppercase',
                touchAction: 'none'
              }}
            >
              {b.label}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Catharsis Flash when all are gone */}
        <AnimatePresence>
          {blocks.length > 0 && incinerated.length === blocks.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 20 }}
            >
               <motion.div animate={{ textShadow: ['0 0 10px #22c55e', '0 0 30px #22c55e', '0 0 10px #22c55e'] }} transition={{ duration: 2, repeat: Infinity }}>
                 <p style={{ fontSize: 16, fontWeight: 900, color: '#22c55e', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Catharsis Achieved</p>
               </motion.div>
               <button
                onClick={() => setIncinerated([])}
                style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}
               >
                 Reset Scene
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TASK SHATTER DEMO — Prism + micro-quests
══════════════════════════════════════════════════════════ */
function TaskShatterDemo() {
  const micros = ['Identify 3 key files', 'Write 1 function', 'Test edge case', 'Commit changes', 'Update docs'];
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (!holding) { setProgress(0); return; }
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          setActive((a) => (a + 1) % micros.length);
          setHolding(false);
          return 0;
        }
        return p + 5;
      });
    }, 30);
    return () => clearInterval(id);
  }, [holding]);

  return (
    <div style={{ width: '100%', marginTop: 'auto' }}>
      {/* The Wall */}
      <div style={{
        padding: '12px 20px', borderRadius: 10, marginBottom: 16,
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-2)', letterSpacing: '-0.02em' }}>Build a backend</p>
        <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>The Wall of Awful</p>
      </div>

      {/* Prism arrow */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: 10, color: '#00bfa5', fontWeight: 700, letterSpacing: '0.04em' }}
        >
          ▼ LangChain Task Shatterer Agent ▼
        </motion.div>
      </div>

      <style>{`
        .shatter-scroll::-webkit-scrollbar { width: 4px; }
        .shatter-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 4px; }
        .shatter-scroll::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 4px; }
      `}</style>
      
      {/* Micro-quests List */}
      <div className="shatter-scroll" style={{ maxHeight: 160, overflowY: 'auto', paddingRight: 6, marginBottom: 12 }}>
        {micros.map((mq, i) => (
          <div key={i} style={{ 
            padding: '12px 14px', borderRadius: 10, marginBottom: 8,
            background: i === active ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)', 
            border: `1px solid ${i === active ? 'rgba(0,229,255,0.2)' : 'transparent'}`,
            opacity: i < active ? 0.4 : 1,
            display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.3s'
          }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${i < active ? '#00e5ff' : i === active ? '#00e5ff' : 'rgba(255,255,255,0.2)'}`, background: i < active ? '#00e5ff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {i < active && <CheckCircle size={10} color="#000" />}
              {i === active && <motion.div animate={{ scale: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5ff' }} />}
            </div>
            <p style={{ fontSize: 13, fontWeight: i === active ? 700 : 500, color: i === active ? '#00e5ff' : 'var(--text-3)' }}>{mq}</p>
          </div>
        ))}
      </div>

      {/* Pomodoro bar */}
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 }}>
        <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.03 }} style={{ height: '100%', background: 'linear-gradient(90deg,#00bfa5,#00e5ff)', borderRadius: 999 }} />
      </div>
      <p style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', marginBottom: 10 }}>Time-Blindness Pomodoro Bar</p>

      {/* Hold to complete */}
      <button
        onMouseDown={() => setHolding(true)}
        onMouseUp={() => setHolding(false)}
        onTouchStart={() => setHolding(true)}
        onTouchEnd={() => setHolding(false)}
        style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: holding ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.08)',
          border: `1px solid ${holding ? 'rgba(0,229,255,0.5)' : 'rgba(0,229,255,0.2)'}`,
          color: '#00e5ff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all 0.2s',
          boxShadow: holding ? '0 0 24px rgba(0,229,255,0.25)' : 'none',
        }}
      >
        {holding ? '⏳ Holding...' : '⊙ Hold 1.5s to Complete'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROBLEM INFOGRAPHIC — Participation Paradox
══════════════════════════════════════════════════════════ */
function ParadoxCard() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Row: Standard CBT → Failure chain */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
        {[
          { label: 'ADHD / Panic Freeze', color: '#ff6b8a', icon: '🧊' },
          { label: 'App asks: "Journal entry"', color: '#ffb300', icon: '📝' },
          { label: 'Executive function → 0', color: '#ff6b8a', icon: '⚡' },
          { label: '80%+ drop off', color: '#ef4444', icon: '📉' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              flex: 1, padding: '10px 10px', borderRadius: 10,
              background: `${s.color}0e`,
              border: `1px solid ${s.color}25`,
              textAlign: 'center', fontSize: 11, fontWeight: 700, color: s.color,
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              {s.label}
            </div>
            {i < 3 && <div style={{ color: 'rgba(255,255,255,0.15)', padding: '0 3px', fontSize: 16 }}>→</div>}
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { num: '$17B', label: 'Wellness app market size', color: '#00e5ff' },
          { num: '80%+', label: 'Drop-off inside 30 days', color: '#ff6b8a' },
          { num: '97%', label: 'Apps require high-effort input', color: '#ffb300' },
        ].map((s) => (
          <div key={s.num} style={{
            padding: '16px', borderRadius: 12,
            background: `${s.color}08`,
            border: `1px solid ${s.color}20`,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: s.color, lineHeight: 1 }}>{s.num}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
        <p style={{ fontSize: 12.5, color: '#fca5a5', lineHeight: 1.6 }}>
          <strong>The Paradox:</strong> Standard CBT apps demand maximum cognitive effort (journaling, tracking, navigation) at precisely the moment a user's executive function is at zero — during panic, ADHD freeze, or acute distress.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PILLAR CARD WRAPPER
══════════════════════════════════════════════════════════ */
function PillarCard({ letter, title, subtitle, color, glow, children, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: '100%' }}
    >
      <GlassCard hoverGlow={`${glow}20`} style={{ borderTop: `1px solid ${color}30`, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Corner accent glow */}
        <div style={{ position: 'absolute', top: -48, right: -48, width: 160, height: 160, background: `radial-gradient(circle, ${glow}20 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20, flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: `${color}14`, border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color, boxShadow: `0 0 16px ${glow}20`,
          }}>
            {letter}
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--text-1)', marginBottom: 2 }}>{title}</p>
            <p style={{ fontSize: 12, color, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{subtitle}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {children}
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   ACTIVE vs PASSIVE COMPARISON
══════════════════════════════════════════════════════════ */
function SolutionCompare() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'stretch' }}>
      {/* Legacy App Card */}
      <GlassCard hoverGlow="rgba(255,107,138,0.15)" style={{ borderTop: '1px solid rgba(255,107,138,0.3)', display: 'flex', flexDirection: 'column' }}>
        {/* Background SVG - Chaos */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, opacity: 0.15, pointerEvents: 'none' }}>
          <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
            <path d="M0,20 L10,38 L25,5 L35,30 L50,2 L65,35 L80,10 L95,28 L100,20" fill="none" stroke="#ff6b8a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <path d="M0,25 L15,8 L28,35 L45,10 L60,38 L75,5 L90,32 L100,25" fill="none" stroke="#ffb300" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4 }}>Cognitive Requirement</p>
              <h3 style={{ fontSize: 36, fontWeight: 900, color: '#fca5a5', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(255,107,138,0.2)' }}>High</h3>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', fontSize: 10, fontWeight: 800, color: '#ff6b8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Legacy App
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Manual app opening & navigation', 'Articulating trauma via text & journaling', 'Remembering to log states daily'].map((t) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <TrendingDown size={14} color="#ff6b8a" style={{ flexShrink: 0, marginTop: 2, opacity: 0.8 }} />
                <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.5, fontWeight: 500 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* AuraOS Card */}
      <GlassCard hoverGlow="rgba(0,229,255,0.2)" style={{ borderTop: '1px solid rgba(0,229,255,0.4)', display: 'flex', flexDirection: 'column' }}>
         <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 220, height: 80, background: 'radial-gradient(ellipse, rgba(0,229,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* Background SVG - Calm */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, opacity: 0.25, pointerEvents: 'none' }}>
          <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
            <path d="M0,20 Q25,0 50,20 T100,20" fill="none" stroke="#00e5ff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <path d="M0,20 Q25,10 50,20 T100,20" fill="none" stroke="#c4b5fd" strokeWidth="0.75" vectorEffect="non-scaling-stroke" style={{ opacity: 0.6 }} />
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4 }}>Cognitive Requirement</p>
              <h3 style={{ fontSize: 36, fontWeight: 900, color: '#00e5ff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 0 24px rgba(0,229,255,0.5)' }}>Zero</h3>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', fontSize: 10, fontWeight: 800, color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AuraOS
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Background acoustic biomarker triage', 'Physical somatic release via Forge', 'Automated task deconstruction'].map((t) => (
              <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <CheckCircle size={14} color="#00e5ff" style={{ flexShrink: 0, marginTop: 2, opacity: 0.9 }} />
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 500 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}



/* ══════════════════════════════════════════════════════════
   MAIN LANDING PAGE
══════════════════════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY       = useTransform(scrollY, [0, 500], [0, -100]);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-root)', overflowX: 'hidden', fontFamily: 'var(--font)' }}>

      {/* ══ STICKY NAV ══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: 'rgba(2,9,21,0.75)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-orb" />
          <span className="logo-text">AuraOS</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00e5ff', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 999, padding: '2px 8px', marginLeft: 4 }}>Beta</span>
        </div>
        <div style={{ display: 'none', gap: 24, sm_display: 'flex' }}>
          {['The Science', 'The Pillars', 'Ecosystem'].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600, transition: 'color 0.2s' }}>{l}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/login?mode=login')} className="tg-btn-secondary" style={{ width: 'auto', padding: '8px 18px', fontSize: 13 }}>Sign in</button>
          <button onClick={() => navigate('/signup?role=patient')} className="tg-btn-primary" style={{ width: 'auto', padding: '8px 20px', fontSize: 13 }}>Get started</button>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <motion.section style={{ opacity: heroOpacity, y: heroY, willChange: 'transform, opacity' }}>
        <div style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '64px 24px 80px',
          background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(0,40,90,0.9), transparent 65%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(124,58,237,0.1), transparent 65%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* BACKGROUND ORB - Moved behind text and centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ delay: 0.15, duration: 1.5, ease: 'easeOut' }}
            style={{ 
              position: 'absolute', 
              top: '48%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              zIndex: 0, 
              pointerEvents: 'none' 
            }}
          >
            <CoreOrb size={window.innerWidth < 768 ? 400 : 720} />
          </motion.div>

          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.35)',
                borderRadius: 999, padding: '6px 18px',
                fontSize: 11.5, fontWeight: 800, color: '#c4b5fd',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 24, // Reduced margin
                boxShadow: '0 0 28px rgba(124,58,237,0.2)',
              }}>
                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#c4b5fd', display: 'inline-block' }} />
                Biology-First Mental Health Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              style={{ fontSize: 'clamp(36px,5.5vw,72px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, marginBottom: 20, maxWidth: 940, color: '#fff' }}
            >
              <span className="text-shimmer">AuraOS</span>
              <span style={{ color: 'var(--text-1)' }}> — A Biology-First<br />Mental Health & Triage Platform</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.7 }}
              style={{ fontSize: 'clamp(15px,2vw,19px)', color: 'var(--text-2)', lineHeight: 1.78, maxWidth: 620, marginBottom: 48 }}
            >
              Designed for the moments when executive function hits zero. AuraOS detects distress acoustically, regulates somatically, and reports clinically — so you never have to ask for help.
            </motion.p>

            {/* CTA row */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
              <button onClick={() => navigate('/signup?role=patient')} className="tg-btn-primary" style={{ width: 'auto', padding: '17px 40px', fontSize: 16, gap: 10 }}>
                <Heart size={18} /> Enter Patient Portal
              </button>
              <button onClick={() => navigate('/guardian/login')} className="tg-btn-secondary" style={{ width: 'auto', padding: '17px 40px', fontSize: 16, gap: 10 }}>
                <Shield size={18} /> Guardian &amp; Therapist Access
              </button>
            </motion.div>
          </div>

          {/* Trust strip */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }} style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Speech Emotion Recognition', 'Physics Somatic Therapy', 'LangChain AI Triage', 'Guardian Clinical Reports'].map((t) => (
              <span key={t} style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={11} color="rgba(0,229,255,0.4)" /> {t}
              </span>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
            style={{ position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
          >
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ChevronDown size={22} color="rgba(139,175,194,0.35)" />
            </motion.div>
          </motion.div>

          {/* Seamless Bottom Fade to eliminate breakage layer */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25vh', background: 'linear-gradient(to bottom, transparent 0%, var(--bg-root) 100%)', pointerEvents: 'none', zIndex: 5 }} />
        </div>
      </motion.section>

      {/* ══ STATS STRIP ══ */}
      <section style={{ padding: '64px 24px 72px', maxWidth: 960, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
          {[
            { num: '$17B',  label: 'The wellness app market',    color: '#00e5ff' },
            { num: '80%+',  label: 'App drop-off in 30 days',   color: '#ff6b8a' },
            { num: '< 2s',  label: 'Acoustic stress detection', color: '#7c3aed' },
            { num: '4',     label: 'Integrated pillars',        color: '#00bfa5' },
          ].map((s, i) => (
            <FadeUp key={s.num} delay={i * 0.07}>
              <GlassCard hoverGlow={`${s.color}20`} style={{ padding: '32px 20px', textAlign: 'center', borderTop: `1px solid ${s.color}30` }}>
                <p style={{ 
                  fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12,
                  background: `linear-gradient(135deg, ${s.color}, #ffffff)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 0 12px ${s.color}40)`
                }}>{s.num}</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              </GlassCard>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══ THE PROBLEM ══ */}
      <section id="the-science" style={{ padding: '0 24px 96px', maxWidth: 900, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ff6b8a', display: 'block', marginBottom: 12 }}>The $17B Problem</span>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1.1 }}>The Participation Paradox</h2>
            <p style={{ fontSize: 15, color: 'var(--text-3)', marginTop: 14, lineHeight: 1.7, maxWidth: 580, margin: '14px auto 0' }}>
              Current mental health apps fail not because of poor content — but because they demand maximum effort from users at the moment of minimum capacity.
            </p>
          </div>
        </FadeUp>
        <FadeUp delay={0.12}>
          <GlassCard style={{ padding: '40px' }} hoverGlow="rgba(255,107,138,0.15)">
            <ParadoxCard />
          </GlassCard>
        </FadeUp>
      </section>

      {/* ══ THE SOLUTION ══ */}
      <section style={{ padding: '0 24px 96px', maxWidth: 960, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00e5ff', display: 'block', marginBottom: 12 }}>The AuraOS Shift</span>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1.1 }}>Active Effort → Passive Relief</h2>
          </div>
        </FadeUp>
        <FadeUp delay={0.12}>
          <SolutionCompare />
        </FadeUp>
      </section>

      {/* ══ THE 4 PILLARS ══ */}
      <section id="the-pillars" style={{ padding: '0 24px 96px', maxWidth: 1060, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 12 }}>Closed-Loop System</span>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>The Four Pillars</h2>
            <p style={{ fontSize: 14.5, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.7, maxWidth: 560, margin: '12px auto 0' }}>
              Four interconnected pillars working autonomously to triage, regulate, and report — without demanding active user input.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>

          {/* Pillar A — Aura Voice */}
          <PillarCard letter="A" title="Aura Voice" subtitle="Pillar A · Ambient Triage & Safety Net" color="#00e5ff" glow="#00e5ff" delay={0}>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 16 }}>
              A living UI orb that continuously monitors for acoustic stress. By leveraging <strong style={{ color: 'var(--text-2)' }}>Speech Emotion Recognition (SER)</strong> instead of standard Speech-to-Text, AuraOS detects silent panic attacks and deploys grounding interventions before the user asks for help.
            </p>
            <AcousticWaveform />
          </PillarCard>

          {/* Pillar B — Cognitive Forge */}
          <PillarCard letter="B" title="Cognitive Forge" subtitle="Pillar B · Physical Catharsis Engine" color="#7c3aed" glow="#7c3aed" delay={0.08}>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 16 }}>
              Translates abstract cognitive weight into <strong style={{ color: 'var(--text-2)' }}>physical digital mass</strong> using a 2D physics sandbox. Destroying "Worry Blocks" provides immediate, zero-friction dopamine release. Users achieve regulation through somatic gameplay rather than articulating their trauma.
            </p>
            <CognitiveForgeDemo />
          </PillarCard>

          {/* Pillar C — Task Shatter */}
          <PillarCard letter="C" title="Task Shatter" subtitle="Pillar C · Bypassing ADHD Paralysis" color="#00bfa5" glow="#00bfa5" delay={0.14}>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 16 }}>
              Massive, paralyzing tasks are shattered into frictionless, <strong style={{ color: 'var(--text-2)' }}>2-minute micro-quests</strong>. The somatic Hold-to-Complete button forces physical presence, grounding the user in the immediate moment.
            </p>
            <TaskShatterDemo />
          </PillarCard>

          {/* Pillar D — Guardian Portal */}
          <PillarCard letter="D" title="Guardian Portal" subtitle="Pillar D · Clinical Safety Net" color="#c4b5fd" glow="#7c3aed" delay={0.20}>
            <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 20 }}>
              Receive structured clinical insights without invading patient space. Guardians see 7/14/21-day trend dashboards, vocal arousal indexes, crisis feeds, and on-demand AI-synthesized PDF clinical reports.
            </p>
            {[
              { icon: BarChart2, label: 'Vocal Stress Index — 7/14/21 day trends',  color: '#c4b5fd' },
              { icon: AlertTriangle, label: 'Real-time crisis & spike alerts',          color: '#ff6b8a' },
              { icon: Layers, label: 'AI-synthesized PDF clinical reports',         color: '#00bfa5' },
              { icon: Cpu, label: 'LangChain + Twilio notification pipeline',    color: '#ffb300' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}14`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={color} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</p>
              </div>
            ))}
          </PillarCard>
        </div>
      </section>

      {/* ══ ECOSYSTEM ORBIT ══ */}
      <section id="ecosystem" style={{ padding: '0 24px 96px', maxWidth: 1060, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 12 }}>Orbit Model</span>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>The Closed-Loop Ecosystem</h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.7, maxWidth: 540, margin: '12px auto 0' }}>
              Four interconnected rings orbiting the user — each pillar feeds data to the next, creating a self-sustaining triage and regulation loop.
            </p>
          </div>
        </FadeUp>
        <FadeUp delay={0.1} style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="tg-surface" style={{ borderRadius: 28, padding: '40px', display: 'inline-block' }}>
            <EcosystemOrbit />
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 12 }}>Ecosystem Orbit Model</p>
          </div>
        </FadeUp>
      </section>

      {/* ══ ROLE ENTRY ══ */}
      <section style={{ padding: '0 24px 96px', maxWidth: 900, margin: '0 auto' }}>
        <FadeUp>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(26px,4vw,46px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>Two doors. One system.</h2>
          </div>
        </FadeUp>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>

          {/* Patient card */}
          <FadeUp delay={0.05}>
            <motion.div
              whileHover={{ scale: 1.02, y: -6 }}
              onClick={() => navigate('/signup?role=patient')}
              className="tg-surface"
              style={{
                borderRadius: 24, padding: '32px 28px', cursor: 'pointer',
                boxShadow: '0 0 60px rgba(0,229,255,0.1), 0 24px 48px rgba(0,0,0,0.4)',
                borderColor: 'rgba(0,229,255,0.12)', position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Heart size={24} color="#00e5ff" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00e5ff', display: 'block', marginBottom: 8 }}>Patient</span>
              <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.035em', color: 'var(--text-1)', lineHeight: 1.2, marginBottom: 10 }}>I feel like my circuits are overloaded.</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.65, marginBottom: 20 }}>You're not broken. AuraOS adapts to your somatic state in real time, breaking paralysis into micro-completions.</p>
              <ul style={{ listStyle: 'none', marginBottom: 24 }}>
                {['10-question clinical intake', 'Aura Voice passive monitoring', 'Physics-based catharsis', 'Optional guardian link — your code'].map((b) => (
                  <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', marginBottom: 7 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 8px #00e5ff', flexShrink: 0 }} />{b}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#00e5ff' }}>
                Start my journey <ArrowRight size={16} />
              </div>
            </motion.div>
          </FadeUp>

          {/* Guardian card */}
          <FadeUp delay={0.13}>
            <motion.div
              whileHover={{ scale: 1.02, y: -6 }}
              onClick={() => navigate('/guardian/login')}
              className="tg-surface"
              style={{
                borderRadius: 24, padding: '32px 28px', cursor: 'pointer',
                boxShadow: '0 0 60px rgba(124,58,237,0.12), 0 24px 48px rgba(0,0,0,0.4)',
                borderColor: 'rgba(124,58,237,0.14)', position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', borderRadius: '50%' }} />
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Shield size={24} color="#c4b5fd" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c4b5fd', display: 'block', marginBottom: 8 }}>Guardian / Therapist</span>
              <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.035em', color: 'var(--text-1)', lineHeight: 1.2, marginBottom: 10 }}>I watch and worry from a distance.</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.65, marginBottom: 20 }}>Receive structured clinical insights without entering the patient's private space or adding cognitive load.</p>
              <ul style={{ listStyle: 'none', marginBottom: 24 }}>
                {['Verified invite-code link flow', '7/14/21-day telemetry dashboards', 'Crisis & spike alert feed', 'On-demand AI clinical PDF reports'].map((b) => (
                  <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', marginBottom: 7 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c4b5fd', boxShadow: '0 0 8px #7c3aed', flexShrink: 0 }} />{b}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#c4b5fd' }}>
                Enter Observer Portal <ArrowRight size={16} />
              </div>
            </motion.div>
          </FadeUp>
        </div>
      </section>

      {/* ══ FOOTER CTA ══ */}
      <section style={{ padding: '48px 24px 80px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <FadeUp>
          <h2 style={{ fontSize: 'clamp(28px,4vw,50px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 14 }}>
            Your next small step <span className="text-shimmer">starts now.</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-3)', marginBottom: 36 }}>No performance. No pressure. Just presence.</p>
          <button onClick={() => navigate('/signup?role=patient')} className="tg-btn-primary" style={{ width: 'auto', padding: '18px 52px', fontSize: 17 }}>
            Begin intake <ArrowRight size={18} />
          </button>
        </FadeUp>
        <FadeUp delay={0.15} style={{ marginTop: 48 }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', opacity: 0.5 }}>
            AuraOS © 2026 · Built for ADHD, Panic Disorder &amp; Executive Dysfunction · Privacy-first
          </p>
        </FadeUp>
      </section>
    </div>
  );
}
