import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore.js';
import { Shield, Building2, UserCircle2, Users } from 'lucide-react';

export default function AuthToggle() {
  const { authForm, setAuthFormMode, setAuthFormSubRole } = useStore();
  const { currentMode, subRole } = authForm;

  const handleModeChange = (mode) => {
    if (mode === currentMode) return;
    setAuthFormMode(mode);
    setAuthFormSubRole('USER'); // reset sub-role when switching modes
  };

  const modes = [
    { id: 'CLIENT', label: 'Consumer', icon: UserCircle2 },
    // { id: 'EMPLOYEE', label: 'Enterprise', icon: Building2 },
  ];

  const subRolesClient = [
    { id: 'USER', label: 'Client' },
    { id: 'SECONDARY', label: 'Guardian' },
  ];

  const subRolesEmployee = [
    { id: 'USER', label: 'Employee' },
    { id: 'SECONDARY', label: 'Welfare Committee' },
  ];

  const activeSubRoles = currentMode === 'CLIENT' ? subRolesClient : subRolesEmployee;
  const activeColor = currentMode === 'CLIENT' ? 'rgba(0,229,255,0.2)' : 'rgba(124,58,237,0.2)';
  const activeBorder = currentMode === 'CLIENT' ? 'rgba(0,229,255,0.4)' : 'rgba(124,58,237,0.4)';

  return (
    <div className="flex flex-col items-center gap-4 w-full mb-6 select-none">
      {/* Primary Toggle (Mode) */}
      <div className="relative flex p-1 bg-black/40 border border-white/10 rounded-full w-full max-w-[320px] shadow-inner backdrop-blur-md">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              className="relative flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-full z-10 transition-colors"
              style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.4)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMode"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: activeColor,
                    border: `1px solid ${activeBorder}`,
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon size={16} className="relative z-10" />
              <span className="relative z-10 tracking-wide">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Tabs (Sub-role) */}
      <div className="flex items-center gap-2 mt-1">
        {activeSubRoles.map((role) => {
          const isActive = subRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setAuthFormSubRole(role.id)}
              className="relative px-4 py-1.5 text-[13px] font-medium transition-colors"
              style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.4)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSubRole"
                  className="absolute inset-0 border-b-2"
                  style={{ borderColor: currentMode === 'CLIENT' ? '#00e5ff' : '#7c3aed' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{role.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
