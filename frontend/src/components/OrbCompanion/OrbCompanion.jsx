import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useCompanionStore from '../../store/useCompanionStore.js';
import useStore from '../../store/useStore.js';
import { AlertTriangle, Sparkles, Target, Zap, Shield } from 'lucide-react';
import OrbExpandedPanel from './OrbExpandedPanel.jsx';

const MODE_CONFIGS = {
  gentle: {
    color: '#00e5ff',
    icon: Sparkles,
    glow: '0 0 20px rgba(0, 229, 255, 0.4)',
    animation: { scale: [1, 1.05, 1], transition: { duration: 4, repeat: Infinity } }
  },
  focus: {
    color: '#c4b5fd',
    icon: Target,
    glow: '0 0 15px rgba(196, 181, 253, 0.6)',
    animation: { scale: 1 } // Still for focus
  },
  spike: {
    color: '#ffb300',
    icon: Zap,
    glow: '0 0 25px rgba(255, 179, 0, 0.8)',
    animation: { scale: [1, 1.1, 1], transition: { duration: 1.5, repeat: Infinity } }
  },
  emergency: {
    color: '#ef4444',
    icon: AlertTriangle,
    glow: '0 0 35px rgba(239, 68, 68, 0.9)',
    animation: { scale: [1, 1.2, 1], transition: { duration: 0.8, repeat: Infinity } }
  },
  guardian: {
    color: '#22c55e',
    icon: Shield,
    glow: '0 0 15px rgba(34, 197, 94, 0.3)',
    animation: { scale: 1 }
  }
};

export default function OrbCompanion({ role = 'client' }) {
  const { 
    isExpanded, pipWindow, mode, message, isSyncing, position, 
    setExpanded, setPosition, syncWithTelemetry,
    customAudioSrc, isCustomAudioPlaying, toggleCustomAudio,
    setCustomAudioSrc, setIsCustomAudioPlaying
  } = useCompanionStore();
  
  const isDesktop = typeof window !== 'undefined' && !!window.electronAPI;
  
  // Read core telemetry from main store
  const { 
    userId, activeTab, activeTask, auraEmotion, baselineArousalScore 
  } = useStore();

  const constraintsRef = useRef(null);
  const dragTimeoutRef = useRef(null);
  const globalAudioRef = useRef(null);

  // Safe hoisted function for next track
  const playNextTrack = async () => {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('AuraAudioDB', 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction('customAudioStore', 'readonly');
      const store = tx.objectStore('customAudioStore');
      const req = store.get('customPlaylist');
      req.onsuccess = () => {
        const playlist = req.result || [];
        if (playlist.length > 0) {
          let nextIndex = 0; 
          if (customAudioSrc) {
            nextIndex = Math.floor(Math.random() * playlist.length);
          }
          const nextTrack = playlist[nextIndex];
          setCustomAudioSrc(URL.createObjectURL(nextTrack.file));
          setIsCustomAudioPlaying(true);
        }
      };
    } catch (e) {
      console.warn("Could not load next track from DB", e);
    }
  };

  // Global Audio Playback Sync
  useEffect(() => {
    if (globalAudioRef.current) {
      if (isCustomAudioPlaying) {
        globalAudioRef.current.play().catch(e => console.warn('Audio play prevented:', e));
      } else {
        globalAudioRef.current.pause();
      }
    }
  }, [isCustomAudioPlaying, customAudioSrc]);

  // Global Hotkey handlers (Browser + Electron IPC)
  useEffect(() => {
    // 1. Electron IPC Listener
    if (window.electronAPI && window.electronAPI.onGlobalHotkey) {
      window.electronAPI.onGlobalHotkey(async (action) => {
        if (action === 'toggle-music') {
          toggleCustomAudio();
        } else if (action === 'next-music') {
          playNextTrack();
        }
      });
    }

    // 2. Browser keydown listener (Ctrl + Shift + M / Ctrl + Shift + N)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        toggleCustomAudio();
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        playNextTrack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCustomAudio, customAudioSrc, setCustomAudioSrc, setIsCustomAudioPlaying]);

  // Sync logic when telemetry changes
  useEffect(() => {
    if (!userId) return;
    const telemetry = {
      userId,
      role,
      activeTask: activeTask ? activeTask.originalTask : null,
      emotion: auraEmotion,
      vocalArousal: baselineArousalScore,
      recentEvent: `Navigated to ${activeTab}`
    };
    syncWithTelemetry(telemetry);
  }, [userId, activeTab, activeTask, auraEmotion, baselineArousalScore, role, syncWithTelemetry]);

  const config = MODE_CONFIGS[mode] || MODE_CONFIGS.gentle;
  const Icon = config.icon;

  const getPanelStyle = () => {
    if (typeof window === 'undefined') return { position: 'fixed', right: 24, bottom: 90, zIndex: 9999 };

    if (isDesktop) {
      // Lock panel exactly below the orb
      return { position: 'absolute', top: 90, left: 20, zIndex: 10001, pointerEvents: 'auto' };
    }
    
    const panelW = 360;
    const panelH = 500;
    const margin = 20;
    const orbSize = 56;
    
    const cx = position.x + orbSize / 2;
    const cy = position.y + orbSize / 2;
    
    let left = cx < window.innerWidth / 2 ? position.x + orbSize + margin : position.x - panelW - margin;
    let top = cy < window.innerHeight / 2 ? position.y : position.y - panelH + orbSize;
    
    left = Math.max(margin, Math.min(left, window.innerWidth - panelW - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - panelH - margin));
    
    return { position: 'fixed', zIndex: 10001, pointerEvents: 'none', left, top };
  };

  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartPos = useRef(null);

  const handlePointerDown = (e) => {
    if (!isDesktop || e.button !== 0) return;
    dragStartPos.current = { x: e.screenX, y: e.screenY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (dragStartPos.current && window.electronAPI) {
      const dx = e.screenX - dragStartPos.current.x;
      const dy = e.screenY - dragStartPos.current.y;
      
      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        setIsDragging(true);
      }
      
      if (isDragging) {
        window.electronAPI.moveWindow(dx, dy);
        dragStartPos.current = { x: e.screenX, y: e.screenY };
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isDesktop) return;
    if (dragStartPos.current) {
      e.target.releasePointerCapture(e.pointerId);
      dragStartPos.current = null;
      if (!isDragging) {
        const nextExpanded = !isExpanded;
        setExpanded(nextExpanded);
        if (nextExpanded) window.electronAPI.resizeWindow(400, 600);
        else window.electronAPI.resizeWindow(100, 100);
      }
      setIsDragging(false);
    }
  };

  return (
    <>
      <div ref={constraintsRef} style={{ position: 'fixed', inset: 10, pointerEvents: 'none', zIndex: 9999 }} />
      <motion.div
        drag={!isDesktop}
        dragConstraints={constraintsRef}
        dragMomentum={false}
        initial={isDesktop ? { x: 0, y: 0 } : position}
        onDragEnd={(e, info) => {
          if (!isDesktop) {
            setPosition({ x: position.x + info.offset.x, y: position.y + info.offset.y });
          }
        }}
        style={{
          position: isDesktop ? 'absolute' : 'fixed',
          top: isDesktop ? 22 : 'auto',
          left: isDesktop ? 22 : 'auto',
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
      >
        {!pipWindow && (
          <motion.div
            animate={config.animation}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => {
              if (isDesktop) return; // Handled by pointer logic
              setExpanded(!isExpanded);
            }}
            style={{
              width: 56,
              height: 56,
              marginTop: isDesktop ? 0 : 12,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${config.color}, rgba(0,0,0,0.8))`,
              boxShadow: config.glow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: `2px solid ${config.color}80`,
              flexShrink: 0
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Icon size={24} color="#fff" style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.5))' }} />
          </motion.div>
        )}
      </motion.div>

      {/* ── Fixed Screen Panel ── */}
      <AnimatePresence>
        {isExpanded && !pipWindow && (
          <div style={getPanelStyle()}>
            <OrbExpandedPanel role={role} />
          </div>
        )}
      </AnimatePresence>
      
      {/* ── Document Picture-in-Picture Portal ── */}
      {pipWindow && createPortal(<OrbExpandedPanel role={role} />, pipWindow.document.body)}

      {/* ── Global Audio Player ── */}
      {customAudioSrc && <audio ref={globalAudioRef} src={customAudioSrc} loop preload="auto" style={{ display: 'none' }} />}
    </>
  );
}
