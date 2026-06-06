// src/App.jsx — Master router with auth guards and public landing.
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/guards/RequireAuth.jsx';

// Public
import Landing        from './pages/Landing.jsx';
import AuthPage       from './pages/AuthPage.jsx';

// Patient
import AuraShell      from './AuraShell.jsx';
import PatientIntake  from './pages/PatientIntake.jsx';
import PatientOnboarding from './components/auth/PatientOnboarding.jsx';

// Guardian
import GuardianLayout    from './pages/GuardianLayout.jsx';
import GuardianDashboard from './pages/GuardianDashboard.jsx';
import GuardianLink      from './components/auth/GuardianLink.jsx';
import GuardianIntake    from './components/auth/GuardianIntake.jsx';
import GuardianLogin     from './components/auth/GuardianLogin.jsx';

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"      element={<Landing />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />

      {/* ── Client & Employee protected ── */}
      <Route path="/app" element={
        <RequireAuth roles={['client', 'employee']}>
          <AuraShell />
        </RequireAuth>
      } />
      <Route path="/patient/onboarding" element={
        <RequireAuth roles={['client', 'employee']}>
          <PatientIntake />
        </RequireAuth>
      } />
      {/* legacy route from old PatientOnboarding */}
      <Route path="/patient/onboarding/legacy" element={
        <RequireAuth roles={['client', 'employee']}>
          <PatientOnboarding />
        </RequireAuth>
      } />

      {/* ── Guardian auth ── */}
      <Route path="/guardian/login" element={<GuardianLogin />} />

      <Route path="/guardian" element={
        <RequireAuth roles={['guardian', 'committee']}>
          <GuardianLayout />
        </RequireAuth>
      }>
        <Route index          element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<GuardianDashboard />} />
        <Route path="link"      element={<GuardianLink />} />
        <Route path="patient/:patientId/intake" element={<GuardianIntake />} />
        <Route path="intake"    element={<GuardianIntake />} />
        <Route path="reports"   element={<GuardianDashboard />} />
        <Route path="alerts"    element={<GuardianDashboard />} />
        <Route path="settings"  element={<GuardianDashboard />} />
      </Route>

      {/* ── Catch all ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
