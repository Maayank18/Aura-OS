import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, Moon, Play, Square, Pause, ChevronLeft, Upload, Music } from 'lucide-react';
import useCompanionStore from '../../store/useCompanionStore.js';

function BoxBreathing() {
  const [phase, setPhase] = useState('Inhale');
  const phases = ['Inhale', 'Hold', 'Exhale', 'Hold'];
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % 4;
      setPhase(phases[i]);
    }, 4000); // 4 seconds per phase (Box breathing)
    return () => clearInterval(interval);
  }, []);

  const scale = phase === 'Inhale' || (phase === 'Hold' && phases.indexOf(phase) === 1) ? 1.5 : 1;

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <motion.div 
        animate={{ scale }} 
        transition={{ duration: 4, ease: 'linear' }}
        style={{
          width: 120, height: 120, borderRadius: '50%',
          border: '4px solid rgba(0, 229, 255, 0.4)',
          background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(0, 229, 255, 0.2)'
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: '#00e5ff' }}>{phase}</span>
      </motion.div>
      <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Breathe with the expanding circle. 4s per phase.</p>
    </div>
  );
}

// --- IndexedDB Helper for local track persistence ---
const DB_NAME = 'AuraAudioDB';
const STORE_NAME = 'customAudioStore';

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPlaylistFromDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get('customPlaylist');
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function savePlaylistToDB(playlist) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(playlist, 'customPlaylist');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
// --------------------------------------------------

function CustomAudio() {
  const { customAudioSrc, setCustomAudioSrc, isCustomAudioPlaying, setIsCustomAudioPlaying, toggleCustomAudio } = useCompanionStore();
  const [playlist, setPlaylist] = useState([]);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const fileInputRef = useRef(null);

  // Load persisted playlist on mount
  useEffect(() => {
    getPlaylistFromDB().then((data) => {
      if (Array.isArray(data)) {
        setPlaylist(data);
        // Auto-select first track if nothing is playing globally
        if (!customAudioSrc && data.length > 0) {
          const first = data[0];
          setCustomAudioSrc(URL.createObjectURL(first.file));
          setActiveTrackId(first.id);
        }
      }
    }).catch(e => console.warn('Failed to load playlist from DB', e));
  }, [customAudioSrc, setCustomAudioSrc]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const newTrack = { id: Date.now().toString(), file, name: file.name.replace(/\.[^/.]+$/, "") };
      const newPlaylist = [...playlist, newTrack];
      setPlaylist(newPlaylist);
      
      const url = URL.createObjectURL(file);
      setCustomAudioSrc(url);
      setActiveTrackId(newTrack.id);
      setIsCustomAudioPlaying(true);
      
      try {
        await savePlaylistToDB(newPlaylist);
      } catch (err) {
        console.warn('Could not save playlist to IndexedDB', err);
      }
    }
  };

  const playTrack = (track) => {
    setCustomAudioSrc(URL.createObjectURL(track.file));
    setActiveTrackId(track.id);
    setIsCustomAudioPlaying(true);
  };

  const deleteTrack = async (id, e) => {
    e.stopPropagation();
    const newPlaylist = playlist.filter(t => t.id !== id);
    setPlaylist(newPlaylist);
    if (activeTrackId === id) {
      setIsCustomAudioPlaying(false);
      setCustomAudioSrc(null);
      setActiveTrackId(null);
    }
    await savePlaylistToDB(newPlaylist);
  };

  const updateTrackName = async (id, newName) => {
    const newPlaylist = playlist.map(t => t.id === id ? { ...t, name: newName } : t);
    setPlaylist(newPlaylist);
    await savePlaylistToDB(newPlaylist);
  };

  return (
    <div className="flex flex-col items-center justify-start py-4 w-full px-2 h-full">
      <input 
        type="file" 
        accept="audio/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
      />

      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 8px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Your Library</span>
        {customAudioSrc && (
          <button 
            onClick={toggleCustomAudio}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 6, background: isCustomAudioPlaying ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255,255,255,0.05)', 
              color: isCustomAudioPlaying ? '#00e5ff' : '#fff', border: `1px solid ${isCustomAudioPlaying ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255,255,255,0.1)'}`, 
              padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' 
            }}
          >
            {isCustomAudioPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
            {isCustomAudioPlaying ? 'Playing' : 'Paused'}
          </button>
        )}
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 240, padding: '0 4px', marginBottom: 12 }} className="orb-panel-scroll">
        {playlist.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            Your library is empty. Upload a track to begin.
          </div>
        ) : (
          playlist.map(track => {
            const isActive = activeTrackId === track.id;
            return (
              <div 
                key={track.id}
                onClick={() => playTrack(track)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: isActive ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <div style={{ 
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: isActive ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? '#00e5ff' : 'rgba(255,255,255,0.5)',
                  boxShadow: isActive && isCustomAudioPlaying ? '0 0 10px rgba(0,229,255,0.3)' : 'none'
                }}>
                  {isActive && isCustomAudioPlaying ? <Music size={14} className="animate-pulse" /> : <Music size={14} />}
                </div>
                
                <input 
                  type="text" 
                  value={track.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateTrackName(track.id, e.target.value)}
                  style={{ 
                    flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid transparent',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.8)', fontSize: 13, outline: 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                  onFocus={(e) => e.target.style.borderBottom = '1px solid rgba(255,255,255,0.2)'}
                  onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
                />

                <button 
                  onClick={(e) => deleteTrack(track.id, e)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      <button 
        onClick={() => fileInputRef.current.click()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '12px 0', borderRadius: 12,
          background: 'rgba(255, 179, 0, 0.1)', border: '1px dashed rgba(255, 179, 0, 0.3)',
          color: '#ffb300', cursor: 'pointer', transition: 'all 0.2s', marginTop: 'auto'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 179, 0, 0.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 179, 0, 0.1)'}
      >
        <Upload size={16} />
        <span style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload Track</span>
      </button>
    </div>
  );
}

export default function OrbCalm() {
  const [activeView, setActiveView] = useState(null); // null, 'breathe', 'audio'

  const actions = [
    { id: 'breathe', label: 'Box Breathing', icon: Wind, color: '#00e5ff', desc: 'Sync your breath to a 4-second rhythm.' },
    { id: 'audio', label: 'Local Music Player', icon: Music, color: '#ffb300', desc: 'Play your own calming MP3 files on loop.' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {!activeView ? (
          <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 20 }}>
              Select a grounding protocol to recalibrate your baseline.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => setActiveView(action.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 16, cursor: 'pointer',
                    color: 'white', textAlign: 'left', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color, flexShrink: 0 }}>
                    <action.icon size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{action.label}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{action.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="active" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex-1 flex flex-col">
            <button 
              onClick={() => setActiveView(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20, padding: 0 }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <div className="flex-1 flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-white/5 overflow-hidden p-2">
              {activeView === 'breathe' && <BoxBreathing />}
              {activeView === 'audio' && <CustomAudio />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
