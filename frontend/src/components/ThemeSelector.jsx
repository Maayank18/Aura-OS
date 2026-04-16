import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Cloud,
  Coffee,
  Leaf,
  Moon,
  Sparkles,
  Sun,
  Target,
  Umbrella,
} from "lucide-react";
import { MOOD_THEMES } from "../theme/themeOptions.js";

const THEME_ICON_MAP = {
  dark: Moon,
  light: Sun,
  calm: Cloud,
  relaxing: Coffee,
  happy: Sparkles,
  nature: Leaf,
  overwhelmed: Umbrella,
  focus: Target,
};

export default function ThemeSelector({ currentTheme, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const onDocumentMouseDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const onDocumentKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, []);

  const activeTheme = MOOD_THEMES.find((theme) => theme.id === currentTheme) || MOOD_THEMES[0];
  const ActiveIcon = THEME_ICON_MAP[activeTheme.id] || Moon;

  return (
    <div className="theme-selector" ref={containerRef}>
      <motion.button
        ref={triggerRef}
        type="button"
        className={`theme-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        whileTap={{ scale: 0.98 }}
        style={{ "--theme-accent": activeTheme.color }}
        aria-label="Select mood theme"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="theme-trigger-icon">
          <ActiveIcon size={15} />
        </span>
        <span className="theme-trigger-copy">
          <span className="theme-trigger-title">{activeTheme.shortLabel}</span>
          <span className="theme-trigger-subtitle">Mood Theme</span>
        </span>
        <ChevronDown size={14} className={`theme-chevron ${isOpen ? "open" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="theme-menu"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            role="listbox"
            aria-label="Mood themes"
          >
            <p className="theme-menu-title">Choose Your Mood</p>
            {MOOD_THEMES.map((theme) => {
              const ThemeIcon = THEME_ICON_MAP[theme.id] || Moon;
              const isActive = theme.id === currentTheme;

              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-option ${isActive ? "active" : ""}`}
                  style={{ "--theme-accent": theme.color }}
                  onClick={() => {
                    onChange(theme.id);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isActive}
                >
                  <span className="theme-option-icon">
                    <ThemeIcon size={14} />
                  </span>
                  <span className="theme-option-copy">
                    <span className="theme-option-label">{theme.label}</span>
                    <span className="theme-option-description">{theme.description}</span>
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
