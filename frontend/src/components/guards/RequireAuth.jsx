// src/components/guards/RequireAuth.jsx
// Enforces JWT auth + role.  Unauthenticated → '/' (Landing).
// Wrong role  → appropriate home for their role.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export default function RequireAuth({ role, children }) {
  const { isAuthenticated, role: userRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (role && userRole !== role) {
    return <Navigate to={userRole === 'guardian' ? '/guardian/dashboard' : '/app'} replace />;
  }

  return children;
}
