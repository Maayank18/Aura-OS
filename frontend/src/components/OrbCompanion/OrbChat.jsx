import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, BarChart2 } from 'lucide-react';
import { clinicalApi } from '../../services/api.js';
import useStore from '../../store/useStore.js';
import useCompanionStore from '../../store/useCompanionStore.js';

export default function OrbChat() {
  const { chatHistory, addChatMessage } = useCompanionStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const { userId, baselineArousalScore, auraEmotion } = useStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput('');
    
    // Add user message to global state
    addChatMessage({ role: 'user', text: userText });
    setLoading(true);

    try {
      const res = await clinicalApi.orbChat({
        userId,
        message: userText,
        history: chatHistory,
        context: { arousal: baselineArousalScore, emotion: auraEmotion }
      });
      
      if (res && res.reply) {
        addChatMessage({ role: 'assistant', text: res.reply, action: res.action, stats: res.stats });
      }
    } catch (err) {
      addChatMessage({ role: 'assistant', text: "I'm having trouble connecting right now." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        .orb-chat-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .orb-chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .orb-chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.0);
          border-radius: 4px;
        }
        .orb-chat-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
      <div className="orb-chat-scroll" ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16, paddingRight: 4 }}>
        {chatHistory.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.role === 'user' ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 16, borderBottomRightRadius: m.role === 'user' ? 4 : 16, borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16, border: `1px solid ${m.role === 'user' ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.1)'}`, color: 'white', fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ marginBottom: (m.action === 'SHOW_STATS' && m.stats) ? 8 : 0 }}>{m.text}</div>
            
            {/* Inline Graphical Statistics */}
            {m.action === 'SHOW_STATS' && m.stats && (
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 12, marginTop: 8, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `conic-gradient(#00e5ff ${m.stats.arousal * 10}%, transparent 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold' }}>
                    {m.stats.arousal}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Current Arousal</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#00e5ff' }}>{m.stats.emotion || 'Calm'}</div>
                </div>
                <BarChart2 size={18} color="rgba(255,255,255,0.2)" />
              </div>
            )}
            
            {/* Guardian Alert Feedback */}
            {m.action === 'SEND_REPORT' && (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: 11, padding: '4px 8px', borderRadius: 4, marginTop: 8, display: 'inline-block', fontWeight: 600 }}>
                ✓ Report generated and dispatched
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 16, borderBottomLeftRadius: 4, color: 'rgba(255,255,255,0.5)' }}>
            <Loader2 size={14} className="animate-spin" />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 4 }}>
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '10px 12px', outline: 'none', fontSize: 13 }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ background: '#00e5ff', border: 'none', color: '#000', width: 36, height: 36, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: input.trim() ? 1 : 0.5 }}
        >
          <Send size={16} />
        </button>
      </div>
    </motion.div>
  );
}
