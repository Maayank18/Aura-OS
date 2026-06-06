// src/components/guards/RequireAuth.jsx
// Enforces JWT auth + role.  Unauthenticated → '/' (Landing).
// Wrong role  → appropriate home for their role.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

export default function RequireAuth({ role, roles, children }) {
  const { isAuthenticated, role: userRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Normalize legacy 'patient' role to 'client'
  const normalizedRole = userRole === 'patient' ? 'client' : userRole;
  const allowedRoles = roles || (role ? [role] : []);

  if (allowedRoles.length > 0 && !allowedRoles.includes(normalizedRole)) {
    if (normalizedRole === 'guardian' || normalizedRole === 'committee') {
      return <Navigate to="/guardian/dashboard" replace />;
    } else {
      if (location.pathname === '/app') return <Navigate to="/" replace />;
      return <Navigate to="/app" replace />;
    }
  }

  return children;
}
