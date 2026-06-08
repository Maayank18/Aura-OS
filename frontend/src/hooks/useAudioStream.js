import { useRef, useCallback, useEffect } from 'react';
import useStore from '../store/useStore.js';
import { clinicalApi } from '../services/api.js';

const isBrowser = typeof window !== 'undefined';
const SAMPLE_RATE = 16000;

export default function useAudioStream() {
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioMutedRef = useRef(false);
  const transcriptStartTimeRef = useRef(null);
  const latestTranscriptRef = useRef('');
  const processingRef = useRef(false);
  const sessionActiveRef = useRef(false);
  
  // Track continuous volume
  const volumeHistoryRef = useRef([]);

  const {
    userId,
    setListening,
    setAuraEmotion,
    setAuraTranscript,
    setAuraResponse,
    audioMuted,
    setAuraSpeaking,
  } = useStore();

  useEffect(() => {
    audioMutedRef.current = audioMuted;
    if (audioMuted && isBrowser) {
      window.speechSynthesis.cancel();
      setAuraSpeaking(false);
    }
  }, [audioMuted, setAuraSpeaking]);

  const cleanupAudioSession = useCallback(({
    stopRecognition = true,
    cancelSpeech = false,
    clearTranscript = false,
  } = {}) => {
    try {
      if (recognitionRef.current && stopRecognition) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }

      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch (_) {}
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      if (isBrowser && cancelSpeech) {
        window.speechSynthesis.cancel();
      }
    } finally {
      analyserRef.current = null;
      streamRef.current = null;
      audioCtxRef.current = null;
      animFrameRef.current = null;
      sessionActiveRef.current = false;
      setListening(false);
      volumeHistoryRef.current = [];
      if (clearTranscript) {
        latestTranscriptRef.current = '';
      }
    }
  }, [setListening, setAuraSpeaking]);

  const speakGroundingResponse = useCallback((groundingResponse) => {
    if (!isBrowser || audioMutedRef.current || !groundingResponse) return;

    window.speechSynthesis.cancel();
    setAuraSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(groundingResponse);

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.name.includes('Google UK English Female'))
      || voices.find((v) => v.name.includes('Samantha'))
      || voices.find((v) => v.name.includes('Karen'))
      || voices.find((v) => v.name.includes('Zira'))
      || voices.find((v) => v.lang === 'en-US' && v.name.includes('Female'))
      || voices.find((v) => v.lang === 'en-US')
      || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 1.05;
    utterance.pitch = 1.35;
    utterance.onend = () => setAuraSpeaking(false);
    utterance.onerror = () => setAuraSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [setAuraSpeaking]);

  const processTranscript = useCallback(async (rawText) => {
    const text = String(rawText || '').trim();
    if (processingRef.current) return;

    if (!text) {
      cleanupAudioSession({ cancelSpeech: false, clearTranscript: true });
      return;
    }

    processingRef.current = true;
    setListening(false);

    const durationMinutes = (Date.now() - (transcriptStartTimeRef.current || Date.now())) / 60000;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const wpm = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0;

    const vols = volumeHistoryRef.current;
    const averageVolume = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;

    try {
      const json = await clinicalApi.voiceTriage(userId, text, wpm, averageVolume);

      if (!json?.success || !json.data) {
        throw new Error(json?.error || json?.message || 'Voice triage failed.');
      }

      const { stressTier, groundingResponse } = json.data;

      let mappedEmotion = 'calm';
      if (stressTier === 'ELEVATED') mappedEmotion = 'mild_anxiety';
      else if (stressTier === 'PANIC_FREEZE') mappedEmotion = 'high_anxiety';

      setAuraEmotion(mappedEmotion);
      setAuraResponse(groundingResponse);
      speakGroundingResponse(groundingResponse);
    } catch (e) {
      console.error('[VoiceTriage] Error fetching response:', e);
      const fallbackResponse = 'I heard you. Let us pause for one slow breath, then choose the smallest next step.';
      setAuraEmotion('mild_anxiety');
      setAuraResponse(fallbackResponse);
      speakGroundingResponse(fallbackResponse);
    } finally {
      processingRef.current = false;
      cleanupAudioSession({ stopRecognition: false, cancelSpeech: false, clearTranscript: false });
    }
  }, [
    cleanupAudioSession,
    setListening,
    setAuraEmotion,
    setAuraResponse,
    speakGroundingResponse,
  ]);

  const stop = useCallback(() => {
    const text = latestTranscriptRef.current.trim();
    sessionActiveRef.current = false;

    if (text && !processingRef.current) {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }
      void processTranscript(text);
      return;
    }

    cleanupAudioSession({ cancelSpeech: true, clearTranscript: true });
    setAuraSpeaking(false);
  }, [cleanupAudioSession, processTranscript, setAuraSpeaking]);

  const drawVisualizer = useCallback((canvas, analyser) => {
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume for telemetry
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avgVolume = sum / bufferLength;
      volumeHistoryRef.current.push(avgVolume);
      if (volumeHistoryRef.current.length > 200) {
        volumeHistoryRef.current.shift(); // Keep recent history
      }

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const barWidth = (width / barCount) * 0.6;
      const gap = (width / barCount) * 0.4;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * (bufferLength / 2));
        const value = dataArray[dataIndex] / 255;
        const barHeight = value * height * 0.85;

        const x = i * (barWidth + gap) + gap / 2;
        const y = height - barHeight;

        const r = Math.round(124 + (13 - 124) * value);
        const g = Math.round(58 + (148 - 58) * value);
        const b = Math.round(237 + (136 - 237) * value);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.globalAlpha = 0.7 + value * 0.3;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barHeight, 3);
        } else {
          const radius = Math.min(3, barWidth / 2, barHeight / 2);
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + barWidth - radius, y);
          ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
          ctx.lineTo(x + barWidth, y + barHeight - radius);
          ctx.quadraticCurveTo(
            x + barWidth,
            y + barHeight,
            x + barWidth - radius,
            y + barHeight
          );
          ctx.lineTo(x + radius, y + barHeight);
          ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    draw();
  }, []);

  const start = useCallback(
    async (visualizerCanvas) => {
      try {
        if (!isBrowser) throw new Error('Audio stream can only start in a browser environment.');

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Microphone access is not supported in this browser.');
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          throw new Error('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        setAuraTranscript('');
        setAuraResponse('');
        setAuraEmotion('calm');
        volumeHistoryRef.current = [];
        latestTranscriptRef.current = '';
        processingRef.current = false;
        sessionActiveRef.current = true;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass({ sampleRate: SAMPLE_RATE });
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        source.connect(analyser);
        drawVisualizer(visualizerCanvas, analyser);

        // ── Speech Recognition Setup ──
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscriptStr = '';

        recognition.onstart = () => {
          setListening(true);
          transcriptStartTimeRef.current = Date.now();
        };

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let newFinal = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              newFinal += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (newFinal) {
            finalTranscriptStr += newFinal;
          }

          const visibleTranscript = (finalTranscriptStr + interimTranscript).trim();
          latestTranscriptRef.current = visibleTranscript;
          setAuraTranscript(visibleTranscript);
        };

        recognition.onerror = (event) => {
          console.error('[SpeechRecognition] error:', event.error);
          if (event.error === 'not-allowed') {
            setAuraTranscript('[Microphone access denied. Please check browser permissions.]');
            sessionActiveRef.current = false;
          } else if (event.error === 'network') {
            setAuraTranscript('[Network error. Web Speech API requires an internet connection.]');
            sessionActiveRef.current = false;
          }
        };

        recognition.onend = () => {
          // Do not process on end, just silently restart to keep the session alive
          // until the user explicitly calls stop().
          if (!sessionActiveRef.current || processingRef.current) return;
          
          // IMPORTANT: A small delay is strictly required by Chrome before restarting 
          // to prevent an InvalidStateError that permanently kills the speech engine!
          setTimeout(() => {
            try {
              if (streamRef.current && sessionActiveRef.current) {
                recognition.start();
              }
            } catch (e) {
              console.error('[SpeechRecognition] Failed to restart:', e);
            }
          }, 350);
        };

        recognition.start();

      } catch (err) {
        console.error('[AudioStream] Failed to start:', err);
        cleanupAudioSession({ cancelSpeech: true, clearTranscript: true });
        throw err;
      }
    },
    [
      drawVisualizer,
      cleanupAudioSession,
      processTranscript,
      setListening,
      setAuraEmotion,
      setAuraTranscript,
      setAuraResponse,
    ]
  );

  useEffect(() => () => stop(), [stop]);

  return { start, stop, analyserRef };
}
