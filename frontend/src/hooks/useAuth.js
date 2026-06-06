// src/hooks/useAuth.js
// Lightweight hook that reads the JWT from localStorage and exposes role/account.
import { useMemo } from 'react';
import { getStoredAccount, getAuthToken } from '../services/authApi.js';

export function useAuth() {
  return useMemo(() => {
    const token   = getAuthToken();
    const account = getStoredAccount();
    return {
      isAuthenticated: Boolean(token && account),
      role:    account?.role  || null,
      account: account        || null,
      token,
    };
  }, []);
}
