// VsiChart.jsx  🌟 NEW — Vocal Stress Index line chart (recharts)
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const color = val >= 7 ? '#ff6b8a' : val >= 5 ? '#ffb300' : '#00e676';
  return (
    <div style={{ background:'rgba(6,14,30,0.95)', border:`1px solid ${color}40`, borderRadius:10, padding:'10px 14px' }}>
      <p style={{ fontSize:11, color:'#4a6275', marginBottom:4 }}>{label}</p>
      <p style={{ fontSize:16, fontWeight:700, color }}>{val?.toFixed(1)} / 10</p>
    </div>
  );
};

export default function VsiChart({ data }) {
  if (!data?.length) return (
    <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ fontSize:13, color:'#4a6275' }}>No vocal data yet</p>
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top:10, right:10, left:-10, bottom:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="day" tick={{ fontSize:11, fill:'#4a6275' }} tickLine={false} axisLine={false}
          tickFormatter={d => d.slice(5)} />
        <YAxis domain={[0, 10]} tick={{ fontSize:11, fill:'#4a6275' }} tickLine={false} axisLine={false} />
        <ReferenceLine y={7} stroke="rgba(255,107,138,0.4)" strokeDasharray="4 4" label={{ value:'High risk', fill:'#ff6b8a', fontSize:10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="vsi" stroke="#00e5ff" strokeWidth={2.5}
          dot={{ fill:'#00e5ff', r:4, strokeWidth:0 }}
          activeDot={{ r:6, fill:'#00e5ff', stroke:'rgba(0,229,255,0.3)', strokeWidth:4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}