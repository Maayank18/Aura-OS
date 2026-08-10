import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, ArrowRight, Loader2 } from 'lucide-react';
import { shatterApi } from '../../services/api.js';
import useStore from '../../store/useStore.js';

export default function OrbShatter() {
  const [taskStr, setTaskStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [quests, setQuests] = useState([]);
  const userId = useStore(s => s.userId);

  const handleShatter = async () => {
    if (!taskStr.trim()) return;
    setLoading(true);
    try {
      const res = await shatterApi.breakdown(taskStr, userId);
      if (res && res.quests) {
        setQuests(res.quests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {quests.length === 0 ? (
        <>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 16 }}>
            Overwhelmed by a task? I will atomize it into ridiculously small steps for you.
          </p>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', padding: 4 }}>
            <input 
              value={taskStr}
              onChange={e => setTaskStr(e.target.value)}
              placeholder="What are you avoiding?"
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', padding: '12px 16px', outline: 'none', fontSize: 14 }}
              onKeyDown={e => e.key === 'Enter' && handleShatter()}
            />
            <button 
              onClick={handleShatter}
              disabled={loading}
              style={{ background: '#7c3aed', border: 'none', color: 'white', padding: '0 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'white', fontSize: 14 }}>Next tiny actions:</h4>
          {quests.map(q => (
            <div key={q.id} style={{ padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <CheckSquare size={16} color="rgba(255,255,255,0.3)" style={{ marginTop: 2 }} />
              <div>
                <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{q.action || q.text}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>{q.tip}</div>
              </div>
            </div>
          ))}
          <button onClick={() => setQuests([])} style={{ marginTop: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: 8, borderRadius: 8, cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      )}
    </motion.div>
  );
}
