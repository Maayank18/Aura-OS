import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Activity, Brain, Zap, Shield, FileText, RefreshCw, ChevronDown, Download, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clinicalApi } from '../services/portalApi.js';
import { authApi } from '../services/authApi.js';

/* ── Custom recharts tooltip ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontWeight: 700, fontSize: 13 }}>
          {entry.value} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{entry.name}</span>
        </p>
      ))}
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, color, delta }) {
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta > 0 ? '#ff6b8a' : delta < 0 ? '#22c55e' : 'var(--text-3)';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45 }}
      className="tg-surface"
      style={{ borderRadius: 20, padding: '22px', flex: 1, minWidth: 160 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' }}>{label}</p>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <p style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', lineHeight: 1, marginBottom: 8 }}>{value ?? '—'}</p>
      {delta != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: deltaColor, fontWeight: 700 }}>
          <DeltaIcon size={13} />
          {Math.abs(delta)} vs last period
        </div>
      )}
    </motion.div>
  );
}

/* ── Risk badge ── */
function RiskBadge({ level }) {
  const map = {
    'acute-distress': { label: 'Acute Distress', cls: 'risk-acute',       icon: '🔴' },
    'pre-burnout':    { label: 'Pre-Burnout',    cls: 'risk-pre-burnout', icon: '🟡' },
    'watch':          { label: 'Monitoring',     cls: 'risk-watch',       icon: '🟢' },
  };
  const m = map[level] || map['watch'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', border: '1px solid' }} className={`badge ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  );
}

/* ── Section card wrapper ── */
function Card({ title, subtitle, action, children }) {
  return (
    <div className="tg-surface" style={{ borderRadius: 20, padding: '24px 24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: 3 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ message }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
      <Activity size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
      <p style={{ fontSize: 13 }}>{message}</p>
    </div>
  );
}

const PERIOD_DAYS = [7, 14, 21];

export default function GuardianDashboard() {
  const navigate = useNavigate();
  const [days, setDays]           = useState(7);
  const [patients, setPatients]   = useState([]);
  const [patientId, setPatientId] = useState('');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [generating, setGen]      = useState(false);
  const [report, setReport]       = useState(null);
  const [reportId, setReportId]   = useState(null);

  const fetchDashboard = useCallback(async (pid) => {
    setLoading(true); setError(null);
    try {
      const res = await clinicalApi.guardianDashboard(pid || '', days);
      setPatients(res.patients || []);
      if (res.patient?.id && !pid) setPatientId(res.patient.id);
      setData(res);
      if ((res.patients?.length === 0) && !res.patient) {
        navigate('/guardian/link');
      }
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('403')) {
        authApi.logout(); navigate('/guardian/login', { replace: true });
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [days, navigate]);

  useEffect(() => { fetchDashboard(patientId); }, [patientId, days]); // eslint-disable-line

  const handleGenerateReport = async () => {
    if (!patientId) return;
    setGen(true); setReport(null); setReportId(null); setError(null);
    try {
      const res = await clinicalApi.guardianReport(patientId, days);
      setReport(res.brief);
      setReportId(res.reportId);
    } catch (e) { setError(e.message); }
    finally { setGen(false); }
  };

  const handleDownload = async () => {
    if (!reportId) return;
    try { await clinicalApi.downloadReportPdfBuffer(reportId, `AuraOS-${days}d-Report.pdf`); }
    catch { setError('PDF download failed.'); }
  };

  if (loading && !data) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed' }} />
        </motion.div>
        <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading clinical data…</p>
      </div>
    );
  }

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const currentPatient = data?.patient;

  return (
    <div style={{ padding: '28px 24px 64px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          {/* Patient selector */}
          {patients.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Patient</span>
              <div style={{ position: 'relative' }}>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  style={{
                    appearance: 'none', padding: '9px 36px 9px 14px',
                    borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(0,0,0,0.35)', color: 'var(--text-1)',
                    fontSize: 14, fontWeight: 700, outline: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id} style={{ background: '#060f1e' }}>{p.displayName}</option>
                  ))}
                </select>
                <ChevronDown size={13} color="var(--text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          {/* Period selector */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
            {PERIOD_DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700,
                  background: days === d ? '#7c3aed' : 'transparent',
                  color: days === d ? '#fff' : 'var(--text-3)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: days === d ? '0 2px 12px rgba(124,58,237,0.4)' : 'none',
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => fetchDashboard(patientId)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={handleGenerateReport} disabled={generating || !currentPatient?.privacyConsent?.reportSharing} className="tg-btn-primary" style={{ width: 'auto', padding: '9px 20px', fontSize: 13 }}>
            {generating ? <><span className="spinner" /> Synthesizing…</> : <><FileText size={14} /> Generate Report</>}
          </button>
        </div>
      </div>

      {/* ── Patient info strip ── */}
      {currentPatient && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tg-surface" style={{ borderRadius: 16, padding: '16px 22px', marginBottom: 22, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 4 }}>Monitoring</p>
            <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)' }}>{currentPatient.displayName}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 4 }}>Avg Vocal Arousal</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: stats.avgVocalArousal >= 7 ? '#ef4444' : stats.avgVocalArousal >= 5 ? '#f59e0b' : '#22c55e' }}>
              {stats.avgVocalArousal || '—'}<span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}> / 10</span>
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 4 }}>Report Sharing</p>
            <span className={`badge ${currentPatient.privacyConsent?.reportSharing !== false ? 'badge-green' : 'badge-coral'}`}>
              {currentPatient.privacyConsent?.reportSharing !== false ? '✓ Consented' : '✗ Revoked'}
            </span>
          </div>
          <RiskBadge level={report?.risk_level || data?.recentReports?.[0]?.riskLevel || 'watch'} />
        </motion.div>
      )}

      {error && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13 }}>{error}</div>
      )}

      {/* ── Stat cards ── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <StatCard icon={Zap}      label="Tasks Completed" value={stats.tasksCompleted}  color="#22c55e" />
        <StatCard icon={Activity} label="Tasks Abandoned"  value={stats.tasksAbandoned}  color="#ff6b8a" />
        <StatCard icon={Brain}    label="Forge Sessions"   value={stats.forgeSessions}    color="#c4b5fd" />
        <StatCard icon={Shield}   label="Stress Spikes"    value={stats.stressSpikes}     color="#ffb300" />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 22 }}>
        {/* VSI area chart */}
        <Card title="Vocal Stress Index" subtitle={`Daily avg arousal score over ${days} days`}>
          {charts.vsiByDay?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts.vsiByDay} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="vsiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00e5ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="vsi" stroke="#00e5ff" strokeWidth={2.5} fill="url(#vsiGrad)" name="Arousal" dot={false} activeDot={{ r: 5, fill: '#00e5ff', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No vocal stress data yet" />}
        </Card>

        {/* Exec function bar chart */}
        <Card title="Executive Function" subtitle="Daily task completion rate (%)">
          {charts.execByDay?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.execByDay} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="efScore" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Completion %" maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No task data yet" />}
        </Card>

        {/* Forge sessions line */}
        <Card title="Worry Block Density" subtitle="Cognitive Forge offloading intensity">
          {charts.forgeByDay?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charts.forgeByDay} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="forgeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ffb300" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ffb300" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="density" stroke="#ffb300" strokeWidth={2.5} dot={false} name="Density" activeDot={{ r: 4, fill: '#ffb300', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No Forge session data yet" />}
        </Card>

        {/* Game focus */}
        <Card title="Game Focus Score" subtitle="Perception & rhythm session focus">
          {charts.gameFocusByDay?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts.gameFocusByDay} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gameGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#c4b5fd" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c4b5fd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="focus" stroke="#c4b5fd" strokeWidth={2.5} fill="url(#gameGrad)" name="Focus" dot={false} activeDot={{ r: 4, fill: '#c4b5fd', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No game session data yet" />}
        </Card>

        {/* Daily mood trend */}
        <Card title="Daily Mood Trend" subtitle="Patient 5-axis check-in scores (1–5 scale)">
          {charts.moodByDay?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charts.moodByDay} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Line type="monotone" dataKey="battery"  stroke="#22c55e" strokeWidth={2} dot={false} name="🔋 Battery" />
                <Line type="monotone" dataKey="energy"   stroke="#00e5ff" strokeWidth={2} dot={false} name="⚡ Energy" />
                <Line type="monotone" dataKey="anxiety"  stroke="#ff6b8a" strokeWidth={2} dot={false} name="🌪️ Anxiety" />
                <Line type="monotone" dataKey="brainFog" stroke="#ffb300" strokeWidth={2} dot={false} name="🧠 Fog" />
                <Line type="monotone" dataKey="sociability" stroke="#c4b5fd" strokeWidth={2} dot={false} name="🫳 Social" />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No mood check-ins yet — encourage patient to use the daily mood tracker." />}
        </Card>
      </div>

      {/* ── AI Report card ── */}
      <AnimatePresence>
        {report && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 22 }}>
            <div className="tg-surface" style={{ borderRadius: 20, padding: '28px', borderLeft: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 4 }}>Synthesized Clinical Report</p>
                  <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>AI synthesis of patient intake, guardian observations, and {days}-day telemetry</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <RiskBadge level={report.risk_level} />
                  {reportId && (
                    <button onClick={handleDownload} className="tg-btn-secondary" style={{ width: 'auto', padding: '9px 16px', fontSize: 13 }}>
                      <Download size={14} /> PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Executive summary highlight */}
              <div style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#c4b5fd', marginBottom: 8 }}>Executive Summary</p>
                <p style={{ fontSize: 15, color: 'var(--text-1)', lineHeight: 1.7, fontWeight: 500 }}>{report.executive_summary}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Observed Pattern',     value: report.observed_pattern },
                  { label: 'Actionable Protocol',  value: report.actionable_protocol },
                  { label: 'Clinical Analogy',     value: report.analogy },
                  { label: 'Telemetry Highlights', value: report.recentPatterns || report.vocal_analysis },
                ].filter((r) => r.value).map((row) => (
                  <div key={row.label} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '16px' }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>{row.label}</p>
                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Crisis / Alert feed ── */}
      <Card title="Crisis & Spike Feed" subtitle="Recent stress events and guardian notifications">
        {data?.crisisFeed?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.crisisFeed.slice(0, 8).map((item) => (
              <div key={item.id} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '14px 16px', borderRadius: 12,
                background: item.riskLevel === 'acute-distress' ? 'rgba(239,68,68,0.06)' : item.riskLevel === 'pre-burnout' ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${item.riskLevel === 'acute-distress' ? 'rgba(239,68,68,0.15)' : item.riskLevel === 'pre-burnout' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)'}`,
              }}>
                <AlertTriangle size={16} color={item.riskLevel === 'acute-distress' ? '#ef4444' : item.riskLevel === 'pre-burnout' ? '#f59e0b' : '#22c55e'} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{item.title}</p>
                    <RiskBadge level={item.riskLevel} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{item.summary}</p>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{new Date(item.timestamp).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState message="No crisis events in this period — great sign." />}
      </Card>
    </div>
  );
}
