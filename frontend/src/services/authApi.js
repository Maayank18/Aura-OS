const BASE = '/api/auth';
const TOKEN_KEY = 'aura-auth-token';
const ACCOUNT_KEY = 'aura-auth-account';
const API_TIMEOUT = 12_000;

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const getStoredAccount = () => {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
  } catch {
    return null;
  }
};

export const setAuthSession = ({ token, account }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
};

export const clearAuthSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
};

const req = async (method, path, body, timeoutMs = API_TIMEOUT) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const token = getAuthToken();

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: ctrl.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `Request failed (${res.status})`);
    if (json.token || json.account) setAuthSession(json);
    return json;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export const authApi = {
  patientRegister: (body) => req('POST', '/patient/register', body),
  guardianRegister: (body) => req('POST', '/guardian/register', body),
  login: (body) => req('POST', '/login', body),
  me: () => req('GET', '/me'),
  patientIntake: (answers, privacyConsent) => req('POST', '/patient/intake', { answers, privacyConsent }),
  generateInviteCode: () => req('POST', '/patient/invite-code'),
  linkPatient: (inviteCode) => req('POST', '/guardian/link-patient', { inviteCode }),
  guardianIntake: (patientId, answers) => req('POST', `/guardian/patient/${patientId}/intake`, { answers }),
  guardianPatients: () => req('GET', '/guardian/patients'),
  logout: clearAuthSession,
};
