import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useCompanionStore from '../../store/useCompanionStore.js';
import useStore from '../../store/useStore.js';
import { MessageSquare, Heart, CheckSquare, Shield, Activity, X, Maximize, Mic } from 'lucide-react';
import OrbChat from './OrbChat.jsx';
import OrbCalm from './OrbCalm.jsx';
import OrbShatter from './OrbShatter.jsx';
import AuraVoice from '../aura-voice/AuraVoice.jsx';

export default function OrbExpandedPanel({ role }) {
  const { activeView, setActiveView, setExpanded, mode, message, pipWindow } = useCompanionStore();
  const { auraEmotion, baselineArousalScore } = useStore();
  const isDesktop = typeof window !== 'undefined' && !!window.electronAPI;

  const TABS = [
    { id: 'summary', icon: Activity, label: 'State', roles: ['client', 'guardian'] },
    { id: 'voice', icon: Mic, label: 'Voice', roles: ['client'] },
    { id: 'chat', icon: MessageSquare, label: 'Chat', roles: ['client'] },
    { id: 'calm', icon: Heart, label: 'Calm', roles: ['client'] },
    { id: 'shatter', icon: CheckSquare, label: 'Shatter', roles: ['client'] },
    { id: 'guardian', icon: Shield, label: 'Guardian', roles: ['client', 'guardian'] },
  ];

  const visibleTabs = TABS.filter(t => t.roles.includes(role));

  const handlePopOut = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert('Document Picture-in-Picture is not supported in your browser.');
      return;
    }
    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 380,
        height: 600,
        disallowReturnToOpener: false
      });
      useCompanionStore.getState().setPipWindow(pip);
      
      // Copy stylesheets
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = styleSheet.media;
          link.href = styleSheet.href;
          pip.document.head.appendChild(link);
        }
      });
      
      pip.addEventListener('pagehide', () => {
        useCompanionStore.getState().setPipWindow(null);
      });
    } catch (err) {
      console.error('Failed to open PiP:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      style={{
        position: 'relative',
        width: pipWindow ? '100vw' : 360,
        height: pipWindow ? '100vh' : 500,
        background: 'rgba(5, 5, 8, 0.96)',
        backdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: pipWindow ? 0 : 24,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', WebkitAppRegion: isDesktop ? 'drag' : 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: mode === 'emergency' ? '#ef4444' : mode === 'spike' ? '#ffb300' : '#00e5ff', boxShadow: `0 0 10px ${mode === 'emergency' ? '#ef4444' : '#00e5ff'}` }} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Aura Command Center</span>
        </div>
        <div style={{ display: 'flex', gap: 8, WebkitAppRegion: 'no-drag' }}>
          {!pipWindow && !isDesktop && (
            <button onClick={handlePopOut} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} title="Pop out to Desktop">
              <Maximize size={18} />
            </button>
          )}
          {!pipWindow && (
            <button onClick={() => {
              setExpanded(false);
              if (isDesktop) window.electronAPI.resizeWindow(100, 100);
            }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs / Action Chips ── */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)', scrollbarWidth: 'none' }}>
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999,
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Content Area ── */}
      <style>{`
        .orb-panel-scroll::-webkit-scrollbar { width: 6px; }
        .orb-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .orb-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.0); border-radius: 4px; }
        .orb-panel-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
      <div className="orb-panel-scroll" style={{ flex: 1, padding: 20, overflowY: 'auto', overflowX: 'hidden' }}>
        <AnimatePresence mode="wait">
          {activeView === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ color: 'white', fontSize: 14, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                  {message || "Aura telemetry is active. Monitoring your biological baseline."}
                </p>
              </div>

              {/* Arousal Metric */}
              <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex justify-between items-center mb-2">
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Autonomic Arousal</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{baselineArousalScore || 5}<span style={{fontSize:12, color:'rgba(255,255,255,0.4)'}}>/10</span></div>
                </div>
                <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((baselineArousalScore || 5) / 10) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', background: (baselineArousalScore || 5) > 7 ? '#ff6b8a' : (baselineArousalScore || 5) > 4 ? '#ffb300' : '#00e5ff', borderRadius: 3 }}
                  />
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                  <strong style={{color:'rgba(255,255,255,0.7)'}}>AI Insight:</strong> Measures your central nervous system activation. Used to proactively detect stress spikes before cognitive overload occurs.
                </p>
              </div>

              {/* Emotion Metric */}
              <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex justify-between items-center mb-3">
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Vocal Emotion</span>
                  <motion.div 
                    animate={{ opacity: [0.7, 1, 0.7] }} 
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{ 
                      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                      background: (auraEmotion || 'calm') === 'calm' ? 'rgba(0,229,255,0.1)' : 'rgba(255,107,138,0.1)',
                      color: (auraEmotion || 'calm') === 'calm' ? '#00e5ff' : '#ff6b8a',
                      border: `1px solid ${(auraEmotion || 'calm') === 'calm' ? 'rgba(0,229,255,0.3)' : 'rgba(255,107,138,0.3)'}`
                    }}
                  >
                    {auraEmotion || 'Calm'}
                  </motion.div>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                  <strong style={{color:'rgba(255,255,255,0.7)'}}>AI Insight:</strong> Analyzes vocal prosody and semantic context. Used by the biological engine to dynamically adapt UI and response tone.
                </p>
              </div>
            </motion.div>
          )}

          {activeView === 'voice' && (
            <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AuraVoice compact={true} />
            </motion.div>
          )}
          {activeView === 'chat' && <OrbChat />}
          {activeView === 'calm' && <OrbCalm />}
          {activeView === 'shatter' && <OrbShatter />}
          {activeView === 'guardian' && (
            <motion.div key="guardian" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 16 }}>
                {role === 'guardian' ? 'Guardian Insights summary (anonymized)' : 'Send a secure update to your Guardian.'}
              </p>
              <button style={{ width: '100%', padding: 12, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>
                {role === 'guardian' ? 'Refresh Insights' : 'Ping Guardian'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
