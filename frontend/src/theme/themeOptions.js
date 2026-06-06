export const DEFAULT_THEME = "dark";

export const MOOD_THEMES = [
  {
    id: "dark",
    label: "Deep Night",
    shortLabel: "Dark",
    color: "#7c3aed",
    description: "Grounding and low-glare for evening use.",
  },
  {
    id: "light",
    label: "Bright",
    shortLabel: "Bright",
    color: "#f59e0b",
    description: "Clear daylight contrast with a clean surface.",
  },
  {
    id: "calm",
    label: "Calm Ocean",
    shortLabel: "Calm",
    color: "#38bdf8",
    description: "Cool tones to ease mental noise.",
  },
  {
    id: "relaxing",
    label: "Relaxing Dusk",
    shortLabel: "Relax",
    color: "#c084fc",
    description: "Soft purple ambience for unwinding.",
  },
  {
    id: "happy",
    label: "Happy Glow",
    shortLabel: "Happy",
    color: "#fb7185",
    description: "Warm energetic palette for positive momentum.",
  },
  {
    id: "nature",
    label: "Stress Reliever",
    shortLabel: "Nature",
    color: "#34d399",
    description: "Nature-inspired greens for nervous system reset.",
  },
  {
    id: "overwhelmed",
    label: "Low Sensory",
    shortLabel: "Low Sensory",
    color: "#94a3b8",
    description: "Muted contrast to reduce visual overload.",
  },
  {
    id: "focus",
    label: "Focus Mode",
    shortLabel: "Focus",
    color: "#e2e8f0",
    description: "Minimal distractions for deep work blocks.",
  },
];

export const THEME_IDS = new Set(MOOD_THEMES.map((theme) => theme.id));
