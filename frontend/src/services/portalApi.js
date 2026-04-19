// src/services/portalApi.js  🌟 NEW
// API calls for Observer Portal and Clinical features.

const BASE        = '/api/clinical';
const AI_TIMEOUT  = 30_000;
const API_TIMEOUT = 8_000;

const req = async (method, path, body, timeoutMs = API_TIMEOUT) => {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res  = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    // Check for empty or non-JSON responses before calling .json()
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch (e) {
      if (!res.ok) throw new Error(`Server error (${res.status}). The backend might be offline or crashing.`);
      throw new Error(`Invalid response format from server.`);
    }

    if (!res.ok || !json.success) {
      throw new Error(json.error || `Request failed (${res.status})`);
    }
    return json;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out — the AI is generating your report.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const clinicalApi = {
  // Called on "too overwhelming" selection in TaskShatter
  triggerAlert:    (body)     => req('POST', '/trigger-alert',  body, AI_TIMEOUT),

  // Full session report generation + optional guardian dispatch
  sessionReport:   (body)     => req('POST', '/session-report', body, AI_TIMEOUT),
  reportPdfUrl:    (reportId) => `${BASE}/session-report/${reportId}/pdf`,

  // Guardian setup
  setGuardian:     (body)     => req('POST', '/guardian',       body),

  // Observer Portal data (recharts-ready)
  getDashboard:    (userId, days = 7) => req('GET', `/dashboard/${userId}?days=${days}`, null, API_TIMEOUT),

  // 14-day therapy brief
  therapyBrief:    (userId)   => req('POST', '/therapy-brief', { userId }, AI_TIMEOUT),

  // Memory-safe blob download
  downloadReportPdfBuffer: async (reportId, filename = 'AuraOS-Report.pdf') => {
    const res = await fetch(`${BASE}/session-report/${reportId}/pdf`);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
