// src/App.jsx — Master router with auth guards and public landing.
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/guards/RequireAuth.jsx';

import { Suspense, lazy } from 'react';

// Public (Keep synchronous for instant FCP)
import Landing        from './pages/Landing.jsx';
import AuthPage       from './pages/AuthPage.jsx';

// Patient (Heavy 3D models and Dashboards — Lazy Load!)
const AuraShell = lazy(() => import('./AuraShell.jsx'));
const PatientIntake = lazy(() => import('./pages/PatientIntake.jsx'));
const PatientOnboarding = lazy(() => import('./components/auth/PatientOnboarding.jsx'));
const OrbCompanion = lazy(() => import('./components/OrbCompanion/OrbCompanion.jsx'));

// Guardian (Heavy Recharts and Data Grids — Lazy Load!)
const GuardianLayout = lazy(() => import('./pages/GuardianLayout.jsx'));
const GuardianDashboard = lazy(() => import('./pages/GuardianDashboard.jsx'));
const GuardianLink = lazy(() => import('./components/auth/GuardianLink.jsx'));
const GuardianIntake = lazy(() => import('./components/auth/GuardianIntake.jsx'));
const GuardianLogin = lazy(() => import('./components/auth/GuardianLogin.jsx'));

const FallbackLoader = () => (
  <div className="min-h-screen bg-[#020817] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<FallbackLoader />}>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"      element={<Landing />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        
        {/* ── Desktop Orb Widget ── */}
        <Route path="/orb-widget" element={
          <>
            <style>
              {`
                html, body, #root {
                  background: transparent !important;
                  background-image: none !important;
                  background-color: transparent !important;
                  overflow: hidden !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
              `}
            </style>
            <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
              <OrbCompanion role="client" />
            </div>
          </>
        } />

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
    </Suspense>
  );
}
