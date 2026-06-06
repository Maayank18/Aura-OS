// frontend/src/App.jsx
// Main shell with mental-health intake + corrected layout architecture.
//
// Bug fixes vs previous version:
//  1. Profile tab is set only ONCE (useRef guard) so resume-task tab wins
//  2. handleIntakeComplete respects active task resume (doesn't override its tab)
//  3. useEffect dependency arrays are correct (no eslint-disable needed)
//  4. ProfileBadge hides label on small screens via inline responsive styles
//  5. Loading state is centred properly inside the new content-scroll container

import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Wind, Zap, LogOut, Smile, ChevronDown, Copy, Check, Shield } from 'lucide-react';
import useStore from './store/useStore.js';
import { shatterApi, stateApi } from './services/api.js';
import { getStoredAccount, clearAuthSession, authApi } from './services/authApi.js';
import ErrorBoundary        from './components/ErrorBoundary.jsx';
import AuraVoice            from './components/aura-voice/AuraVoice.jsx';
import CognitiveForge       from './components/cognitive-forge/CognitiveForge.jsx';
import TaskShatter          from './components/task-shatter/TaskShatter.jsx';
import ThemeSelector        from './components/ThemeSelector.jsx';
import { PROFILES }         from './components/MentalHealthIntake.jsx';
import CalmButton           from './components/CalmButton/CalmButton.jsx';
import { DEFAULT_THEME, THEME_IDS } from './theme/themeOptions.js';
import MoodCheckIn from './components/MoodCheckIn.jsx';

/* ── Nav tabs ───────────────────────────────────────────────── */
const TABS = [
  { id: 'voice',   label: 'Aura',    Icon: Mic,  color: '#00e5ff' },
  { id: 'forge',   label: 'Forge',   Icon: Wind, color: '#ffb300' },
  { id: 'shatter', label: 'Shatter', Icon: Zap,  color: '#c4b5fd' },
];

/* ── Profile badge shown in the nav ─────────────────────────── */
function ProfileBadge({ profile, onReset }) {
  const p = PROFILES[profile?.profileId];
  if (!p) return null;
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onReset}
      title={`Your profile: ${p.label} (${profile.severity}). Click to retake.`}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 12px', borderRadius: 999,
        background: p.bg, border: `1px solid ${p.border}`,
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
      }}>
      <span style={{ fontSize: 15, lineHeight: 1 }}>{p.emoji}</span>
      {/* Label hidden on small screens via CSS class */}
      <span
        className="nav-tab-label"
        style={{ fontSize: 11, fontWeight: 700, color: p.color, letterSpacing: '-0.01em' }}>
        {p.label}
      </span>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN APP COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export default function AuraShell() {
  const navigate = useNavigate();
  const {
    activeTab, setTab,
    initSession, isInitialized, userId,
    setActiveTask,
    userProfile, setUserProfile, clearUserProfile,
  } = useStore();

  const [initError,    setInitError]    = useState(false);
  const [resumeBanner, setResumeBanner] = useState(null);
  const [moodOpen,     setMoodOpen]     = useState(false);

  const auth = useStore((s) => s.auth);
  const account = auth?.account || getStoredAccount();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync initial sync code if present and valid
  useEffect(() => {
    if (account?.guardianSyncToken && new Date(account.guardianSyncExpiresAt) > new Date()) {
      setInviteCode(account.guardianSyncToken);
    } else {
      setInviteCode(null);
    }
  }, [account]);

  // Sync fresh account data on mount
  useEffect(() => {
    authApi.me().catch(() => {});
  }, []);

  const handleGenerateCode = async () => {
    setInviteLoading(true);
    try {
      const res = await authApi.generateInviteCode();
      setInviteCode(res.inviteCode);
      // Fetch fresh /me to update local storage and Zustand account details
      await authApi.me().catch(() => {});
    } catch (err) {
      console.error('[Guardian Code] Generation failed:', err);
      alert('Failed to generate sync code. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard?.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('aura-theme');
    return storedTheme && THEME_IDS.has(storedTheme) ? storedTheme : DEFAULT_THEME;
  });

  // Ref so the profile-tab effect only fires once on mount,
  // not every time the profile object reference changes.
  const profileTabSetRef = useRef(false);

  /* ── Theme ── */
  useEffect(() => {
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aura-theme', theme);
  }, [theme]);

  /* ── Session init ── */
  useEffect(() => {
    initSession().catch(() => setInitError(true));
    // initSession is stable (created once by zustand) — no dep needed
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Show intake on first visit (no stored profile AND no JWT account) ── */
  useEffect(() => {
    if (!isInitialized) return;
    const account = getStoredAccount();
    // Only redirect to intake if user logged in as patient or client with no local profile
    if (!userProfile && (account?.role === 'patient' || account?.role === 'client')) {
      // Check if intake already done in account
      if (!account?.patientIntake?.completedAt) {
        navigate('/patient/onboarding');
      }
    }
  }, [isInitialized, userProfile, navigate]);

  /* ── Set default tab from profile — fires ONCE per session ── */
  // We use a ref guard so that if the user later navigates between tabs,
  // we don't reset them back to the profile's primaryTab.
  // Also, if a task was resumed (resume banner visible), skip the tab
  // override since TaskShatter already set the tab to 'shatter'.
  useEffect(() => {
    if (
      isInitialized &&
      userProfile?.primaryTab &&
      !profileTabSetRef.current &&
      !resumeBanner
    ) {
      profileTabSetRef.current = true;
      setTab(userProfile.primaryTab);
    }
  }, [isInitialized, userProfile, resumeBanner, setTab]);

  /* ── Resume active task from previous session ── */
  useEffect(() => {
    if (!userId || !isInitialized) return;
    shatterApi.getActive(userId)
      .then((data) => {
        if (data?.activeTask) {
          setActiveTask(data.activeTask);
          setResumeBanner(data.activeTask.originalTask);
          setTab('shatter');
          // Profile tab guard: task resume already set tab, don't override
          profileTabSetRef.current = true;
          setTimeout(() => setResumeBanner(null), 5000);
        }
      })
      .catch(() => { /* non-fatal */ });
  }, [userId, isInitialized, setActiveTask, setTab]);

  /* ── Intake handlers ── */
  const handleRetakeIntake = () => {
    clearUserProfile();
    profileTabSetRef.current = false;
    navigate('/patient/onboarding');
  };

  const handleLogout = () => {
    clearAuthSession();
    clearUserProfile();
    navigate('/login', { replace: true });
  };

  /* ── Background gradient accent from user profile ── */
  const profileColor = userProfile
    ? PROFILES[userProfile.profileId]?.glow
    : null;
  const bodyAccentStyle = profileColor
    ? { '--profile-glow': profileColor }
    : {};

  const handleThemeChange = (nextTheme) => {
    if (THEME_IDS.has(nextTheme)) {
      setTheme(nextTheme);
    }
  };

  return (
    <>
      {/* ── Resume task banner (above the nav) ── */ }
      <AnimatePresence>
        {resumeBanner && (
          <motion.div
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0,   opacity: 1 }}
            exit={{   y: -48, opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
              background: 'linear-gradient(90deg, rgba(92,33,237,0.96), rgba(0,191,165,0.96))',
              backdropFilter: 'blur(16px)',
              padding: '10px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: 600,
            }}>
            <Zap size={13} />
            Resumed: {resumeBanner}
            <button
              onClick={() => setResumeBanner(null)}
              style={{ marginLeft: 8, opacity: 0.65, fontSize: 20, color: 'white' }}>
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
          APP SHELL
          .app        → height:100dvh, overflow:hidden
          .topnav     → sticky, flex-shrink:0 (never compresses)
          .content-scroll → flex:1, min-height:0, overflow-y:auto
      ══════════════════════════════════════════════════════════ */}
      <div className="app" style={bodyAccentStyle}>

        {/* ── Sticky nav ── */}
        {/* top offset accounts for the resume banner height (40px) */}
        <nav className="topnav h-16 shrink-0 flex items-center justify-between px-6" style={{ top: resumeBanner ? 40 : 0, backgroundColor: 'var(--theme-nav-bg)' }}>

          {/* Logo */}
          <div className="topnav-logo">
            <div className="logo-orb" style={{ backgroundColor: 'var(--theme-logo-orb-bg)' }} />
            <span className="logo-text">AuraOS</span>
          </div>

          {/* Tab pills (centre) */}
          <div className="flex items-center gap-2">
            {TABS.map(({ id, label, Icon, color }) => (
              <CalmButton
                key={id}
                as={motion.button}
                whileTap={{ scale: 0.92 }}
                onClick={() => setTab(id)}
                style={{ padding: 0 }}
                className={`transition-all duration-300 rounded-full 
                  ${activeTab === id 
                    ? 'bg-white/10 ring-1 ring-white/10 opacity-100' 
                    : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-2 px-4 py-1.5 min-w-[100px] justify-center">
                  <Icon size={16} strokeWidth={2.5} />
                  <span className="nav-tab-label text-[13px] font-bold tracking-wide uppercase">{label}</span>
                </div>
              </CalmButton>
            ))}
          </div>

          {/* Right controls */}
          <div className="topnav-actions flex items-center gap-3" style={{ position: 'relative' }}>
            {/* Unified Profile Button & Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileDropdownOpen((o) => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px', borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer', color: 'var(--text-1)',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  transition: 'all 0.2s',
                }}
                className="hover:bg-white/10"
              >
                <Smile size={16} />
                <span>{account?.displayName || account?.name || 'Profile'}</span>
                <ChevronDown size={14} style={{ opacity: 0.6, transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {profileDropdownOpen && (
                <>
                  <div 
                    onClick={() => setProfileDropdownOpen(false)} 
                    style={{ position: 'fixed', inset: 0, zIndex: 100, cursor: 'default' }} 
                  />
                  <div 
                    className="tg-surface"
                    style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      width: 320, borderRadius: 20, padding: '20px', zIndex: 150,
                      display: 'flex', flexDirection: 'column', gap: 16,
                      textAlign: 'left'
                    }}
                  >
                    {/* User info */}
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1)' }}>
                        {account?.displayName || account?.name}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', wordBreak: 'break-all' }}>
                        {account?.email}
                      </p>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 10 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
                          color: 'rgba(0,229,255,1)', background: 'rgba(0,229,255,0.08)',
                          padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(0,229,255,0.2)'
                        }}>
                          {account?.role || 'Client'}
                        </span>
                        {userProfile && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
                            color: 'rgba(196,181,253,1)', background: 'rgba(196,181,253,0.08)',
                            padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(196,181,253,0.2)'
                          }}>
                            {userProfile.severity} Baseline
                          </span>
                        )}
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Log Daily Mood */}
                      <button
                        onClick={() => { setMoodOpen(true); setProfileDropdownOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-2)',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                        className="hover:bg-white/5"
                      >
                        <span style={{ fontSize: 16 }}>😊</span> Log Daily Mood
                      </button>

                      {/* Retake Intake */}
                      <button
                        onClick={() => { handleRetakeIntake(); setProfileDropdownOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-2)',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                        className="hover:bg-white/5"
                      >
                        <span style={{ fontSize: 16 }}>🔄</span> Retake Clinical Intake
                      </button>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                    {/* Guardian sync */}
                    <div>
                      <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                        🛡️ Guardian Sync
                      </h3>
                      
                      {account?.guardianId ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 12px', borderRadius: 12,
                          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                          color: '#86efac', fontSize: 12.5, fontWeight: 600
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                          Guardian Sync Active
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {inviteCode ? (
                            <div style={{
                              padding: '12px', borderRadius: 12,
                              background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                            }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Invite Sync Code</p>
                              <p style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: '#00e5ff', letterSpacing: '0.06em' }}>
                                {inviteCode}
                              </p>
                              <button
                                onClick={handleCopyCode}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%',
                                  padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-2)',
                                  fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                className="hover:bg-white/10"
                              >
                                {copied ? 'Copied!' : 'Copy Code'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={handleGenerateCode}
                              disabled={inviteLoading}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%',
                                padding: '10px 12px', borderRadius: 12, background: 'rgba(0,229,255,0.1)',
                                border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff',
                                fontSize: 12.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              className="hover:bg-cyan-glow/20"
                            >
                              {inviteLoading ? 'Generating...' : 'Generate Sync Code'}
                            </button>
                          )}
                          <p style={{ fontSize: 10.5, color: 'var(--text-3)', lineHeight: 1.4 }}>
                            Share this 24-hour sync code with your guardian to link profiles.
                          </p>
                        </div>
                      )}
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                    {/* Logout */}
                    <button
                      onClick={() => { handleLogout(); setProfileDropdownOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%',
                        padding: '12px', borderRadius: 12, background: 'rgba(255,107,138,0.08)',
                        border: '1px solid rgba(255,107,138,0.18)', color: '#ff6b8a',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      className="hover:bg-red-glow/20"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>

            <AnimatePresence>
              {moodOpen && <MoodCheckIn onClose={() => setMoodOpen(false)} />}
            </AnimatePresence>
            <ThemeSelector currentTheme={theme} onChange={handleThemeChange} />
          </div>
        </nav>

        {/* ── Content scroll region ── */}
        <div className="content-scroll">

          {/* Loading / backend-down state */}
          {!isInitialized && (
            <div style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 20,
              /* min-height fills the available scroll space */
              minHeight: 'calc(100dvh - 64px)',
            }}>
              {initError ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 8 }}>
                    Could not reach the backend.
                  </p>
                  <p style={{ color: 'var(--text-3)', fontSize: 12 }}>
                    Run <code style={{ color: 'var(--cyan-soft)' }}>npm run dev:node</code> in backend-node/
                  </p>
                </div>
              ) : (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: 'conic-gradient(from 0deg,#7c3aed,#00e5ff,#00bfa5,#7c3aed)',
                      filter: 'blur(2px)',
                      boxShadow: '0 0 30px rgba(0,229,255,0.4)',
                    }}
                  />
                  <p style={{ color: 'var(--text-3)', fontSize: 13, letterSpacing: '0.04em' }}>
                    Initializing Aura…
                  </p>
                </>
              )}
            </div>
          )}

          {/* Main page content — cross-fades between tabs */}
          {isInitialized && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{   opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {activeTab === 'voice'   && (
                  <ErrorBoundary label="Aura Voice">
                    <AuraVoice userProfile={userProfile} />
                  </ErrorBoundary>
                )}
                {activeTab === 'forge'   && (
                  <ErrorBoundary label="Cognitive Forge">
                    <CognitiveForge userProfile={userProfile} />
                  </ErrorBoundary>
                )}
                {activeTab === 'shatter' && (
                  <ErrorBoundary label="Task Shatterer">
                    <TaskShatter userProfile={userProfile} />
                  </ErrorBoundary>
                )}

              </motion.div>
            </AnimatePresence>
          )}

        </div>{/* end .content-scroll */}
      </div>{/* end .app */}
    </>
  );
}
