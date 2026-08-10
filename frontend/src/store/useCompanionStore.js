// frontend/src/store/useCompanionStore.js
// Dedicated external store for the Aura Orb Companion.
// Decoupled from the main clinical useStore.js.

import { create } from 'zustand';
import { clinicalApi } from '../services/api.js';

const useCompanionStore = create((set, get) => ({
  isOpen: false,
  isExpanded: false,
  activeView: 'summary', // 'summary' | 'chat' | 'calm' | 'shatter' | 'guardian'
  pipWindow: null, // Holds the reference to the Document PiP window if active
  mode: 'gentle', // 'gentle' | 'focus' | 'spike' | 'emergency' | 'guardian'
  message: "I'm here.",
  chatHistory: [{ role: 'assistant', text: "I'm here. What's on your mind?" }],
  isSyncing: false,
  lastSync: 0,
  position: { x: window.innerWidth - 100, y: window.innerHeight - 150 },
  customAudioSrc: null,
  isCustomAudioPlaying: false,
  
  setOpen: (v) => set({ isOpen: v }),
  setExpanded: (v) => set({ isExpanded: v }),
  setActiveView: (view) => set({ activeView: view }),
  setPipWindow: (win) => set({ pipWindow: win }),
  setPosition: (pos) => set({ position: pos }),
  setEmergency: () => set({ mode: 'emergency', isOpen: true, message: "Emergency Triage Mode. Contacting Guardian." }),
  
  setCustomAudioSrc: (src) => set({ customAudioSrc: src }),
  setIsCustomAudioPlaying: (val) => set({ isCustomAudioPlaying: val }),
  toggleCustomAudio: () => set((state) => ({ isCustomAudioPlaying: !state.isCustomAudioPlaying })),
  
  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [{ role: 'assistant', text: "I'm here. What's on your mind?" }] }),

  syncWithTelemetry: async (telemetry) => {
    const now = Date.now();
    // Throttle syncs to once every 15 seconds max unless emergency
    if (now - get().lastSync < 15000 && telemetry.emotion !== 'high_anxiety') return;
    
    set({ isSyncing: true });
    try {
      const res = await clinicalApi.orbSync(telemetry);
      if (res && res.success) {
        set({
          mode: res.mode || 'gentle',
          message: res.message || "I'm here.",
          lastSync: now,
          // Auto-expand if the mode escalates to spike or emergency
          isOpen: (res.mode === 'spike' || res.mode === 'emergency') ? true : get().isOpen
        });
      }
    } catch (err) {
      console.error('[Orb Sync] Failed:', err);
    } finally {
      set({ isSyncing: false });
    }
  }
}));

export default useCompanionStore;
