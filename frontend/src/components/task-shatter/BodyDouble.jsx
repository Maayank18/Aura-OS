// BodyDouble.jsx — Floating corner widget + fullscreen tab-switch alert
// Fixed: uses only valid CSS variables from the new design system

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const AvatarSVG = ({ size = 100 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="36" r="22" fill="var(--purple)" opacity="0.92"/>
    <circle cx="43" cy="33" r="3.5" fill="white"/>
    <circle cx="57" cy="33" r="3.5" fill="white"/>
    <circle cx="44.5" cy="34.2" r="2" fill="#1a0a2e"/>
    <circle cx="58.5" cy="34.2" r="2" fill="#1a0a2e"/>
    <path d="M44 42 Q50 46 56 42" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <rect x="32" y="60" width="36" height="28" rx="12" fill="var(--purple)" opacity="0.75"/>
    <rect x="14" y="62" width="18" height="8" rx="4" fill="var(--purple)" opacity="0.6"/>
    <rect x="68" y="62" width="18" height="8" rx="4" fill="var(--purple)" opacity="0.6"/>
    <path d="M40 27 Q43 24 46 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M54 27 Q57 24 60 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* Sparkle decorations */}
    <circle cx="22" cy="20" r="1.5" fill="#c4b5fd" opacity="0.7"/>
    <circle cx="78" cy="25" r="1" fill="#80deea" opacity="0.7"/>
    <circle cx="18" cy="45" r="1" fill="#c4b5fd" opacity="0.5"/>
  </svg>
);

export default function BodyDouble({ taskAction, onDismiss, isFullscreen = false }) {
  if (isFullscreen) {
    return (
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        onClick={onDismiss}
        style={{
          position:'fixed',inset:0,zIndex:9999,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          background:'var(--bg-glass-deep)',backdropFilter:'blur(24px)',
          cursor:'pointer',gap:28,
        }}
      >
        <motion.div animate={{y:[0,-10,0]}} transition={{duration:2.5,repeat:Infinity,ease:'easeInOut'}}>
          <AvatarSVG size={110}/>
        </motion.div>
        <div style={{textAlign:'center',maxWidth:380,padding:'0 24px'}}>
          <h2 style={{fontSize:24,fontWeight:800,letterSpacing:'-0.04em',color:'var(--text-1)',marginBottom:14}}>
            Hey — you were in a focus block.
          </h2>
          {taskAction && (
            <div style={{
              padding:'14px 20px',marginBottom:16,fontSize:15,
              background:'var(--bg-glass)',
              border:'1px solid var(--border)',
              borderRadius:14,color:'var(--purple-soft)',lineHeight:1.5,
            }}>
              {taskAction}
            </div>
          )}
          <p style={{fontSize:14,color:'var(--text-2)',lineHeight:1.65}}>
            This was the next step. Let's finish it first, then celebrate.
          </p>
          <p style={{fontSize:12,color:'var(--text-3)',marginTop:20}}>Tap anywhere to return</p>
        </div>
      </motion.div>
    );
  }

  // Corner widget — always visible during a focus block
  return (
    <motion.div
      initial={{opacity:0,scale:0.8,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.8,y:20}}
      style={{
        position:'fixed',bottom:24,right:24,zIndex:500,
        background:'var(--bg-glass-deep)',backdropFilter:'blur(20px)',
        border:'1px solid var(--border)',
        borderRadius:20,padding:'12px 16px',
        display:'flex',alignItems:'center',gap:10,
        boxShadow:'0 8px 32px rgba(0,0,0,0.45),0 0 0 1px rgba(196,181,253,0.1)',
        maxWidth:210,
      }}
    >
      <motion.div animate={{y:[0,-4,0]}} transition={{duration:3,repeat:Infinity,ease:'easeInOut'}}>
        <AvatarSVG size={38}/>
      </motion.div>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:11,color:'var(--purple-soft)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>
          Body Double
        </p>
        <p style={{fontSize:12,color:'var(--text-2)',lineHeight:1.4}}>I'm here with you 👋</p>
      </div>
      <button onClick={onDismiss} style={{color:'var(--text-3)',flexShrink:0,padding:2}}>
        <X size={14}/>
      </button>
    </motion.div>
  );
}