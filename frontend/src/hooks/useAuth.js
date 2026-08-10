// src/hooks/useAuth.js
// Lightweight hook that reads the JWT from localStorage and exposes role/account.
import { useMemo } from 'react';
import useStore from '../store/useStore.js';
import { getStoredAccount, getAuthToken } from '../services/authApi.js';

export function useAuth() {
  const auth = useStore((s) => s.auth);
  
  return useMemo(() => {
    const token   = auth?.token || getAuthToken();
    const account = auth?.account || getStoredAccount();
    return {
      isAuthenticated: Boolean(token && account),
      role:    account?.role  || null,
      account: account        || null,
      token,
    };
  }, [auth]);
}
