// src/components/cognitive-forge/CognitiveForge.jsx
// Calm, meditative Cognitive Forge — peaceful but deeply engaging

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';
import useStore from '../../store/useStore.js';
import usePhysics from '../../hooks/usePhysics.js';
import { forgeApi } from '../../services/api.js';

const PHYSICS_W = 760;
const PHYSICS_H = 440;

const releaseConfetti = () => confetti({
  particleCount: 38,
  spread: 52,
  origin: { x: 0.5, y: 0.96 },
  colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fff7ed'],
  ticks: 90,
  gravity: 0.38,
  scalar: 0.75,
  startVelocity: 18,
});

export default function CognitiveForge() {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);

  const [text, setText]                     = useState('');
  const [isLoading, setLoading]             = useState(false);
  const [error, setError]                   = useState(null);
  const [hasBlocks, setHasBlocks]           = useState(false);
  const [destroyedCount, setDestroyedCount] = useState(0);
  const [showInput, setShowInput]           = useState(true);

  const { userId, worries, setWorries, markWorryDestroyed } = useStore();

  const handleBlockDestroyed = useCallback((uuid) => {
    markWorryDestroyed(uuid);
    setDestroyedCount(n => n + 1);
    releaseConfetti();
    if (userId) forgeApi.destroy(userId, uuid).catch(() => {});
  }, [userId, markWorryDestroyed]);

  const { init, spawnWorries, clearAll } = usePhysics(canvasRef, handleBlockDestroyed);

  useEffect(() => {
    if (canvasRef.current) init();
  }, [init]);

  const handleExtract = async () => {
    if (!text.trim() || isLoading) return;
    setError(null);
    setLoading(true);
    try {
      const data = await forgeApi.extract(text.trim(), userId);
      setWorries(data.worries);
      setHasBlocks(true);
      setShowInput(false);
      clearAll();
      spawnWorries(data.worries);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    clearAll();
    setWorries([]);
    setHasBlocks(false);
    setDestroyedCount(0);
    setShowInput(true);
  };

  const activeCount = worries.filter(w => w.status !== 'destroyed').length;

  return (
    <div className="page fade-up" style={{ maxWidth: 900 }}>

      {/* Header */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} style={{ marginBottom:32 }}>
        <span className="badge badge-amber" style={{ marginBottom:14 }}>
          <Wind size={10} />
          Cognitive Forge
        </span>
        <h1 className="section-title">Release the weight</h1>
        <p className="section-sub">
          Pour everything out — worries, fears, racing thoughts. Aura shapes them into objects you can
          hold, examine, and finally let go.
        </p>
      </motion.div>

      {/* Input card */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.97}}
            className="glass"
            style={{ padding:'28px', marginBottom:24 }}
          >
            <textarea
              className="textarea"
              rows={5}
              placeholder="Type everything that's in your head right now. There's no right way — just let it out."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleExtract(); }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
              <span style={{ fontSize:12.5, color:'var(--text-3)', fontWeight:500 }}>
                {text.length} chars · ⌘↵ to release
              </span>
              <motion.button
                className="btn btn-primary"
                onClick={handleExtract}
                disabled={isLoading || text.trim().length < 5}
                whileHover={{scale:1.02}} whileTap={{scale:0.97}}
              >
                {isLoading ? <span className="spinner" /> : <Sparkles size={14} />}
                {isLoading ? 'Extracting…' : 'Extract & release'}
              </motion.button>
            </div>
            {error && (
              <motion.p initial={{opacity:0}} animate={{opacity:1}}
                style={{ marginTop:12, fontSize:13, color:'#fca5a5', lineHeight:1.5 }}>
                {error}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Physics arena */}
      <div ref={containerRef} style={{
        position:'relative',
        borderRadius:22,
        overflow:'hidden',
        border:'1px solid var(--border)',
        /* Calm deep radial — meditation space */
        background:`
          radial-gradient(ellipse at 50% 25%, rgba(0,60,100,0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.06) 0%, transparent 40%),
          linear-gradient(180deg, #020e1c 0%, #010a14 100%)
        `,
      }}>
        {/* Subtle dot grid */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', opacity:0.03,
          backgroundImage:'radial-gradient(rgba(0,229,255,1) 1px, transparent 1px)',
          backgroundSize:'28px 28px',
        }} />

        <canvas
          ref={canvasRef}
          width={PHYSICS_W}
          height={PHYSICS_H}
          style={{ display:'block', width:'100%', height:'auto', position:'relative', zIndex:1 }}
        />

        {/* Empty state */}
        <AnimatePresence>
          {!hasBlocks && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              style={{
                position:'absolute', inset:0, zIndex:2, pointerEvents:'none',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12,
              }}>
              <motion.div
                animate={{ scale:[1, 1.06, 1], opacity:[0.35, 0.55, 0.35] }}
                transition={{ duration:4, repeat:Infinity, ease:'easeInOut' }}
                style={{
                  width:64, height:64, borderRadius:'50%',
                  background:'radial-gradient(circle, rgba(0,229,255,0.12), transparent 70%)',
                  border:'1px solid rgba(0,229,255,0.14)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}
              >
                <Wind size={22} color="rgba(0,229,255,0.4)" />
              </motion.div>
              <p style={{ color:'var(--text-3)', fontSize:14, fontWeight:500 }}>Your worry blocks appear here</p>
              <p style={{ color:'var(--text-3)', fontSize:12, opacity:0.7 }}>Drag them into the warmth below</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fireplace zone */}
        <div className="fire-glow" style={{
          position:'absolute', bottom:0, left:0, right:0, height:58, zIndex:3,
          background:'linear-gradient(to top, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.06) 60%, transparent 100%)',
          borderTop:'1px solid rgba(245,158,11,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        }}>
          <motion.span style={{fontSize:18}} animate={{y:[0,-3,0],scale:[1,1.08,1]}} transition={{duration:1.4,repeat:Infinity}}>🕯️</motion.span>
          <motion.span style={{fontSize:20}} animate={{y:[0,-4,0],scale:[1,1.1,1]}} transition={{duration:1.1,repeat:Infinity,delay:0.2}}>🔥</motion.span>
          <motion.span style={{fontSize:20}} animate={{y:[0,-4,0],scale:[1,1.1,1]}} transition={{duration:1.3,repeat:Infinity,delay:0.4}}>🔥</motion.span>
          <motion.span style={{fontSize:18}} animate={{y:[0,-3,0],scale:[1,1.08,1]}} transition={{duration:1.2,repeat:Infinity,delay:0.1}}>🕯️</motion.span>
          <span style={{ fontSize:12, color:'rgba(245,158,11,0.75)', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:700 }}>
            Drag here — let it go
          </span>
        </div>
      </div>

      {/* Controls */}
      {hasBlocks && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
          style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {destroyedCount > 0 && <span className="badge badge-green">✦ {destroyedCount} released</span>}
            {activeCount > 0 && <span className="badge badge-cyan">{activeCount} remaining</span>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {activeCount === 0 && (
              <motion.button className="btn btn-secondary" onClick={handleReset}
                whileTap={{scale:0.96}} style={{fontSize:13}}>
                <RotateCcw size={13} /> New session
              </motion.button>
            )}
            <motion.button className="btn btn-ghost" onClick={handleReset} whileTap={{scale:0.95}}>
              <Trash2 size={13} /> Clear
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}