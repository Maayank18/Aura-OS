import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Brain, Zap, Shield, FileText, RefreshCw, User, LogOut, ChevronDown, Download } from 'lucide-react';
import VsiChart  from './VsiChart.jsx';
import TriageLog from './TriageLog.jsx';
import { clinicalApi } from '../../services/portalApi.js';
import { authApi } from '../../services/authApi.js';

const STAT_CARDS = [
  { key:'tasksCompleted', label:'Tasks Completed', icon:Zap,      color:'#00e676' },
  { key:'tasksAbandoned', label:'Tasks Abandoned', icon:Activity,  color:'#ff6b8a' },
  { key:'forgeSessions',  label:'Forge Sessions',  icon:Brain,     color:'#c4b5fd' },
  { key:'stressSpikes',   label:'Stress Spikes',   icon:Shield,    color:'#ffb300' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);
  const [generating, setGen] = useState(false);
  const [brief, setBrief] = useState(null);
  const [reportId, setReportId] = useState(null);

  const fetchDashboard = async (patientIdParam) => {
    setLoading(true); setError(null);
    try {
      const res = await clinicalApi.guardianDashboard(patientIdParam || '', days);
      setPatients(res.patients || []);
      if (res.patient) {
        setSelectedPatientId(res.patient.id);
      }
      setData(res);
      if (res.patients?.length === 0) {
        navigate('/guardian/link');
      }
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('403')) {
        authApi.logout();
        navigate('/guardian/login');
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedPatientId);
  }, [selectedPatientId, days]); // eslint-disable-line

  const handleGenerateReport = async () => {
    if (!selectedPatientId) return;
    setGen(true); setBrief(null); setReportId(null); setError(null);
    try {
      const res = await clinicalApi.guardianReport(selectedPatientId, days);
      setBrief(res.brief);
      setReportId(res.reportId);
    } catch (e) {
      setError(e.message);
    } finally {
      setGen(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportId) return;
    try {
      await clinicalApi.downloadReportPdfBuffer(reportId, `AuraOS-Guardian-Report-${days}d.pdf`);
    } catch (e) {
      setError('Failed to download PDF.');
    }
  };

  const handleLogout = () => {
    authApi.logout();
    navigate('/guardian/login');
  };

  if (loading && !data) {
    return (
      <div style={{ minHeight:'100dvh', background:'#f0f4f8', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
        <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto 16px' }}/>
        <p style={{ color:'#64748b', fontSize:14 }}>Loading Guardian Portal…</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight:'100dvh', background:'#f0f4f8',
      fontFamily:'var(--font,system-ui,sans-serif)', color:'#1a2633',
    }}>
      {/* Header */}
      <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'0 28px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'conic-gradient(from 180deg,#7c3aed,#00e5ff,#00bfa5,#7c3aed)' }}/>
          <div>
            <p style={{ fontSize:15, fontWeight:800, color:'#1a2633', letterSpacing:'-0.03em' }}>AuraOS Guardian</p>
            <p style={{ fontSize:11, color:'#64748b' }}>Clinical Telemetry Dashboard</p>
          </div>
        </div>
        
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {patients.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Patient:</span>
              <div style={{ position: 'relative' }}>
                <select 
                  value={selectedPatientId} 
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  style={{
                    appearance: 'none', padding: '8px 32px 8px 14px', borderRadius: 8,
                    border: '1px solid #e2e8f0', background: '#f8fafc',
                    fontSize: 14, fontWeight: 700, color: '#1a2633', outline: 'none', cursor: 'pointer'
                  }}
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}
          
          <button onClick={handleLogout} style={{ padding:'8px 14px', borderRadius:8, background:'transparent', border:'1px solid #e2e8f0', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600 }}>
            <LogOut size={14}/> Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>
        {/* Error */}
        {error && (
          <div style={{ background:'#fff5f5', border:'1px solid #fecaca', borderRadius:14, padding:'14px 18px', marginBottom:20, color:'#ef4444', fontSize:14 }}>
            {error}
          </div>
        )}

        {/* Dashboard content */}
        {data && !loading && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}>
            {/* Time range selector & top actions */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ display:'flex', gap:8 }}>
                {[7,14,21].map(d => (
                  <button key={d} onClick={()=>setDays(d)}
                    style={{ padding:'6px 16px', borderRadius:99, fontSize:13, fontWeight:700, border:'1px solid',
                      borderColor:days===d?'#7c3aed':'#e2e8f0', background:days===d?'#7c3aed':'white',
                      color:days===d?'white':'#64748b', cursor:'pointer', transition: 'all 0.2s' }}>
                    {d} days
                  </button>
                ))}
              </div>
              <button onClick={()=>fetchDashboard(selectedPatientId)} style={{ padding:'8px 14px', borderRadius:99, border:'1px solid #e2e8f0', background:'white', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#64748b', fontWeight:600 }}>
                <RefreshCw size={14}/> Refresh
              </button>
            </div>

            {/* Patient info bar */}
            <div style={{ background:'white', borderRadius:16, padding:'20px 24px', marginBottom:20, boxShadow:'0 2px 12px rgba(0,0,0,0.04)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
              <div>
                <p style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Selected Patient</p>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <User size={16} color="#7c3aed" /> 
                  <p style={{ fontSize:16, fontWeight:800, color:'#1a2633' }}>{data.patient?.displayName}</p>
                </div>
              </div>
              <div>
                <p style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Report Sharing</p>
                <p style={{ fontSize:14, fontWeight:700, color: data.patient?.privacyConsent?.reportSharing !== false ? '#22c55e' : '#ef4444' }}>
                  {data.patient?.privacyConsent?.reportSharing !== false ? 'Consented' : 'Revoked'}
                </p>
              </div>
              <div>
                <p style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Avg Vocal Arousal</p>
                <p style={{ fontSize:16, fontWeight:800, color: data.stats?.avgVocalArousal >= 7 ? '#ef4444' : data.stats?.avgVocalArousal >= 5 ? '#f59e0b' : '#22c55e' }}>
                  {data.stats?.avgVocalArousal || 'N/A'} / 10
                </p>
              </div>
              <button onClick={handleGenerateReport} disabled={generating || data.patient?.privacyConsent?.reportSharing === false}
                style={{ padding:'12px 20px', background:data.patient?.privacyConsent?.reportSharing === false ? '#cbd5e1' : '#7c3aed', color:'white', border:'none', borderRadius:12, fontWeight:700, fontSize:14, cursor:data.patient?.privacyConsent?.reportSharing === false ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:6, opacity:generating?0.7:1, transition: 'all 0.2s' }}>
                <FileText size={16}/> {generating ? 'Synthesizing...' : `Generate ${days}-Day Report`}
              </button>
            </div>

            {/* Stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
              {STAT_CARDS.map(sc=>{
                const Icon=sc.icon;
                return (
                  <motion.div key={sc.key} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                    style={{ background:'white', borderRadius:16, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <p style={{ fontSize:12, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em' }}>{sc.label}</p>
                      <div style={{ width:30, height:30, borderRadius:8, background:`${sc.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon size={14} color={sc.color}/>
                      </div>
                    </div>
                    <p style={{ fontSize:28, fontWeight:800, color:'#1a2633', marginTop:8 }}>
                      {data.stats?.[sc.key] ?? '—'}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* Charts row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              {/* VSI Chart */}
              <div style={{ background:'white', borderRadius:16, padding:'22px', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#1a2633', marginBottom:4 }}>Vocal Stress Index</p>
                <p style={{ fontSize:11, color:'#94a3b8', marginBottom:16 }}>Daily average arousal score (1–10)</p>
                <VsiChart data={data.charts?.vsiByDay}/>
              </div>

              {/* Executive Function */}
              <div style={{ background:'white', borderRadius:16, padding:'22px', boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#1a2633', marginBottom:4 }}>Executive Function Score</p>
                <p style={{ fontSize:11, color:'#94a3b8', marginBottom:16 }}>Daily task completion rate (%)</p>
                {data.charts?.execByDay?.length ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.charts.execByDay} margin={{top:10,right:10,left:-10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)"/>
                      <XAxis dataKey="day" tick={{fontSize:11,fill:'#94a3b8'}} tickLine={false} axisLine={false} tickFormatter={d=>d.slice(5)}/>
                      <YAxis domain={[0,100]} tick={{fontSize:11,fill:'#94a3b8'}} tickLine={false} axisLine={false}/>
                      <Tooltip formatter={v=>[`${v}%`,'Completion']} contentStyle={{borderRadius:10,border:'1px solid #e2e8f0',fontSize:12}}/>
                      <Bar dataKey="efScore" fill="#7c3aed" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p style={{fontSize:13,color:'#94a3b8',textAlign:'center',padding:'40px 0'}}>No task data yet</p>}
              </div>
            </div>

            {/* Therapy Brief */}
            <AnimatePresence>
              {brief && (
                <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                  style={{ background:'white', borderRadius:16, padding:'28px', boxShadow:'0 2px 12px rgba(0,0,0,0.04)', marginBottom:20, borderTop: '4px solid #7c3aed' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <div>
                      <p style={{ fontSize:18, fontWeight:800, color:'#1a2633' }}>Synthesized Clinical Report</p>
                      <p style={{ fontSize:13, color:'#64748b', marginTop: 4 }}>AI-generated synthesis from patient intake, guardian observations, and {days}-day telemetry.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ padding:'6px 14px', background:`${brief.risk_level==='acute-distress'?'#fef2f2':brief.risk_level==='pre-burnout'?'#fff7ed':'#f0fdf4'}`, borderRadius:99, fontSize:12, fontWeight:800, color:brief.risk_level==='acute-distress'?'#ef4444':brief.risk_level==='pre-burnout'?'#f59e0b':'#22c55e', textTransform:'uppercase', letterSpacing:'0.06em', border: `1px solid ${brief.risk_level==='acute-distress'?'#fecaca':brief.risk_level==='pre-burnout'?'#fde68a':'#bbf7d0'}` }}>
                        {brief.risk_level?.replace('-',' ')}
                      </span>
                      {reportId && (
                        <button onClick={handleDownloadPdf} style={{ padding:'8px 16px', background:'#f8fafc', border:'1px solid #e2e8f0', color:'#1a2633', borderRadius:8, display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                          <Download size={16} color="#7c3aed" /> Download PDF
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: 13, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Executive Summary</p>
                    <p style={{ fontSize: 16, color: '#1a2633', lineHeight: 1.6, fontWeight: 500 }}>{brief.executive_summary}</p>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                    {[
                      { label:'Observed Pattern',           value:brief.observed_pattern },
                      { label:'Actionable Protocol',        value:brief.actionable_protocol },
                      { label:'Clinical Analogy',           value:brief.analogy },
                      { label:'Telemetry Highlights',       value:brief.recentPatterns || brief.vocal_analysis },
                    ].map(row=>(
                      <div key={row.label} style={{ border:'1px solid #f1f5f9', borderRadius: 12, padding: 16 }}>
                        <p style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{row.label}</p>
                        <p style={{ fontSize:14, color:'#374151', lineHeight:1.6 }}>{row.value}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Triage Log */}
            <div style={{ background:'white', borderRadius:16, padding:'22px', boxShadow:'0 2px 12px rgba(0,0,0,0.04)', marginBottom:20 }}>
              <p style={{ fontSize:15, fontWeight:800, color:'#1a2633', marginBottom:4 }}>Clinical Alert Log</p>
              <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Recent guardian notifications sent by AuraOS</p>
              <TriageLog alerts={data.crisisFeed || data.recentAlerts || []}/>
            </div>
            
          </motion.div>
        )}
      </div>
    </div>
  );
}