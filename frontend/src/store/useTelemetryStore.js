import { create } from 'zustand';
import { clinicalApi } from '../services/api.js';
import useStore from './useStore.js'; // to update the main store (Aura's response/emotion)

const useTelemetryStore = create((set, get) => ({
  telemetryInterval: null,
  textBuffer: '',
  volumeBuffer: [],
  startTime: null,

  appendTelemetry: (textChunk, volume) => {
    set((state) => ({
      textBuffer: state.textBuffer + ' ' + textChunk,
      volumeBuffer: [...state.volumeBuffer, volume].slice(-500), // keep last 500 volume ticks
    }));
  },

  startTelemetryLoop: (userId) => {
    // Prevent multiple loops
    if (get().telemetryInterval) return;

    set({ startTime: Date.now(), textBuffer: '', volumeBuffer: [] });

    const interval = setInterval(async () => {
      const { textBuffer, volumeBuffer, startTime } = get();
      
      const text = textBuffer.trim();
      if (!text) return; // Nothing to process

      // Calculate metrics
      const durationMinutes = (Date.now() - startTime) / 60000;
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const wpm = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0;
      const averageVolume = volumeBuffer.length 
        ? volumeBuffer.reduce((a, b) => a + b, 0) / volumeBuffer.length 
        : 0;

      // Reset buffers immediately for the next chunk
      set({ textBuffer: '', volumeBuffer: [], startTime: Date.now() });

      try {
        const json = await clinicalApi.voiceTriage(userId, text, wpm, averageVolume);
        
        if (json?.success && json.data) {
          const { stressTier, groundingResponse } = json.data;
          let mappedEmotion = 'calm';
          if (stressTier === 'ELEVATED') mappedEmotion = 'mild_anxiety';
          else if (stressTier === 'PANIC_FREEZE') mappedEmotion = 'high_anxiety';

          // Update the main Aura UI store with the real-time AI response!
          useStore.getState().setAuraEmotion(mappedEmotion);
          useStore.getState().setAuraResponse(groundingResponse);
        }
      } catch (err) {
        console.error('[TelemetryStore] Background flush failed:', err);
      }

    }, 10000); // 10-second background flush interval

    set({ telemetryInterval: interval });
  },

  stopTelemetryLoop: () => {
    const { telemetryInterval } = get();
    if (telemetryInterval) {
      clearInterval(telemetryInterval);
      set({ telemetryInterval: null, textBuffer: '', volumeBuffer: [] });
    }
  }
}));

export default useTelemetryStore;
