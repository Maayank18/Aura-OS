import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Activity } from 'lucide-react';
import useStore from '../store/useStore';

const AuraVoiceEngine = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [volume, setVolume] = useState(0);
  const [localTranscript, setLocalTranscript] = useState('');
  const [wordCount, setWordCount] = useState(0);

  // Store actions/state
  const { 
    isListening, 
    setListening, 
    dispatchVoiceTelemetry, 
    auraEmotion, 
    auraResponse 
  } = useStore();

  // Refs for Web Audio API and Speech API
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  
  // Ref to track start time of current transcription chunk
  const chunkStartTimeRef = useRef(Date.now());
  // Ref to hold the current chunk for the interval to pick up
  const currentChunkRef = useRef('');
  const currentWordCountRef = useRef(0);
  const currentVolumeSumRef = useRef(0);
  const currentVolumeSamplesRef = useRef(0);

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);

      analyzeVolume();
    } catch (err) {
      console.error('Microphone access denied:', err);
      setHasPermission(false);
    }
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // Update refs for the telemetry dispatch
      if (finalTranscript) {
        currentChunkRef.current += finalTranscript;
        const words = finalTranscript.trim().split(/\s+/).filter(w => w.length > 0).length;
        currentWordCountRef.current += words;
        
        setLocalTranscript(prev => prev + finalTranscript);
        setWordCount(prev => prev + words);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
    };

    recognition.onend = () => {
      // Auto-restart if we are still supposed to be listening
      if (isListening && speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          // Ignore restart errors
        }
      }
    };

    speechRecognitionRef.current = recognition;
  };

  const analyzeVolume = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Normalize volume between 0 and 100
    const normalizedVolume = Math.min(100, Math.max(0, average));
    setVolume(normalizedVolume);

    // Track average volume for telemetry
    currentVolumeSumRef.current += normalizedVolume;
    currentVolumeSamplesRef.current += 1;

    animationFrameRef.current = requestAnimationFrame(analyzeVolume);
  };

  const toggleListening = async () => {
    if (!isListening) {
      if (hasPermission === null || hasPermission === false) {
        await initAudio();
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      if (!speechRecognitionRef.current) {
        initSpeechRecognition();
      }
      
      setListening(true);
      chunkStartTimeRef.current = Date.now();
      try {
        speechRecognitionRef.current?.start();
      } catch (e) {} // Ignore if already started
    } else {
      setListening(false);
      speechRecognitionRef.current?.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  // Telemetry Dispatch Loop
  useEffect(() => {
    let interval;
    if (isListening) {
      interval = setInterval(() => {
        const transcriptChunk = currentChunkRef.current.trim();
        
        if (transcriptChunk.length > 0) {
          const timeElapsedMs = Date.now() - chunkStartTimeRef.current;
          const minutesElapsed = timeElapsedMs / 60000;
          const wpm = minutesElapsed > 0 ? Math.round(currentWordCountRef.current / minutesElapsed) : 0;
          
          const avgVolume = currentVolumeSamplesRef.current > 0 
            ? Math.round(currentVolumeSumRef.current / currentVolumeSamplesRef.current) 
            : 0;

          // Dispatch telemetry to backend
          dispatchVoiceTelemetry(transcriptChunk, wpm, avgVolume);

          // Reset local refs for the next chunk
          currentChunkRef.current = '';
          currentWordCountRef.current = 0;
          currentVolumeSumRef.current = 0;
          currentVolumeSamplesRef.current = 0;
          chunkStartTimeRef.current = Date.now();
        }
      }, 10000); // 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening, dispatchVoiceTelemetry]);

  // Speak the grounding response out loud when it is received
  useEffect(() => {
    if (auraResponse && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(auraResponse);
      const voices = window.speechSynthesis.getVoices();
      
      // Calming, natural-sounding English voice selection
      const preferredVoice =
        voices.find((v) => v.name.includes('Google UK English Female')) ||
        voices.find((v) => v.name.includes('Samantha')) ||
        voices.find((v) => v.name.includes('Karen')) ||
        voices.find((v) => v.name.includes('Zira')) ||
        voices.find((v) => v.lang === 'en-US' && v.name.includes('Female')) ||
        voices.find((v) => v.lang === 'en-US') ||
        voices[0];
        
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.05;
      utterance.pitch = 1.35;
      
      window.speechSynthesis.speak(utterance);
    }
  }, [auraResponse]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Determine styles based on emotion
  const getEmotionColors = () => {
    switch(auraEmotion) {
      case 'high_anxiety': return { orb: 'bg-red-500', glow: 'shadow-[0_0_60px_20px_rgba(239,68,68,0.7)]', border: 'border-red-400' };
      case 'mild_anxiety': return { orb: 'bg-yellow-500', glow: 'shadow-[0_0_50px_15px_rgba(234,179,8,0.6)]', border: 'border-yellow-400' };
      case 'calm':
      default: return { orb: 'bg-cyan-500', glow: 'shadow-[0_0_40px_10px_rgba(6,182,212,0.5)]', border: 'border-cyan-400' };
    }
  };

  const colors = getEmotionColors();

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-950 text-white rounded-2xl min-h-[400px] border border-zinc-800 shadow-2xl relative overflow-hidden">
      
      {/* Background ambient light */}
      <div className={`absolute inset-0 opacity-20 blur-3xl transition-colors duration-1000 ${colors.orb}`} />

      <div className="z-10 flex flex-col items-center space-y-8 w-full max-w-md">
        
        {/* The Cinematic Orb */}
        <div className="relative flex items-center justify-center h-48 w-48">
          <motion.div 
            className={`absolute rounded-full ${colors.border} border-2`}
            animate={{ 
              scale: isListening ? 1 + (volume / 100) : 1,
              opacity: isListening ? 0.8 + (volume / 500) : 0.4
            }}
            transition={{ type: 'spring', bounce: 0.5, damping: 10 }}
            style={{ width: '100%', height: '100%' }}
          />
          <motion.div
            className={`rounded-full ${colors.orb} ${colors.glow} z-10 transition-colors duration-700`}
            animate={{
              scale: isListening ? 0.9 + (volume / 150) : 0.9,
            }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.1 }}
            style={{ width: '80%', height: '80%' }}
          />
          
          <button 
            onClick={toggleListening}
            className="absolute z-20 flex items-center justify-center w-16 h-16 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors border border-zinc-700 shadow-lg"
          >
            {isListening ? <Activity className="text-cyan-400" /> : <Mic className="text-zinc-400" />}
          </button>
        </div>

        {/* Telemetry Readouts */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-zinc-800/50 flex flex-col items-center">
            <span className="text-zinc-500 text-xs uppercase tracking-wider mb-1">State</span>
            <span className={`text-sm font-medium ${isListening ? 'text-cyan-400' : 'text-zinc-400'}`}>
              {isListening ? 'ANALYZING' : 'STANDBY'}
            </span>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-zinc-800/50 flex flex-col items-center">
            <span className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Stress Tier</span>
            <span className={`text-sm font-medium ${auraEmotion === 'calm' ? 'text-cyan-400' : auraEmotion === 'mild_anxiety' ? 'text-yellow-400' : 'text-red-400'}`}>
              {auraEmotion.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* AI Grounding Response */}
        {auraResponse && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-xl text-center"
          >
            <p className="text-cyan-100 text-sm italic">"{auraResponse}"</p>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default AuraVoiceEngine;
