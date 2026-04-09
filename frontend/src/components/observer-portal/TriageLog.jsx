// TriageLog.jsx  🌟 NEW — Recent clinical alerts list
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Eye } from 'lucide-react';

const RISK_CONFIG = {
  'watch':          { color:'#ffb300', icon:Eye,           label:'Watch' },
  'pre-burnout':    { color:'#ff6b8a', icon:AlertTriangle, label:'Pre-Burnout' },
  'acute-distress': { color:'#ff3860', icon:AlertTriangle, label:'Acute Distress' },
};

export default function TriageLog({ alerts }) {
  if (!alerts?.length) return (
    <div style={{ padding:'24px', textAlign:'center' }}>
      <p style={{ fontSize:13, color:'#4a6275' }}>No alerts sent yet — all clear.</p>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {alerts.map((alert, i) => {
        const cfg = RISK_CONFIG[alert.riskLevel] || RISK_CONFIG['watch'];
        const Icon = cfg.icon;
        return (
          <motion.div key={alert._id || i}
            initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.05 }}
            style={{
              display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px',
              background:`${cfg.color}08`, border:`1px solid ${cfg.color}25`,
              borderRadius:14,
            }}>
            <div style={{ width:34, height:34, borderRadius:10, background:`${cfg.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={16} color={cfg.color} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:700, color:cfg.color, textTransform:'uppercase', letterSpacing:'0.07em' }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize:10, color:'#4a6275' }}>
                  {new Date(alert.sentAt).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' })}
                </span>
              </div>
              <p style={{ fontSize:12, color:'#8bafc2', lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {alert.triggerReason || 'Stress spike detected'}
              </p>
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <span style={{ fontSize:10, color:'#4a6275', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:99 }}>
                  via {alert.channel || 'mock'}
                </span>
                {alert.deliveryStatus === 'sent' && (
                  <span style={{ fontSize:10, color:'#00e676', display:'flex', alignItems:'center', gap:3 }}>
                    <CheckCircle2 size={10}/> Delivered
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}