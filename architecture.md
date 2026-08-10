# 🏗️ AuraOS Architecture & Technology Stack

AuraOS is built on a highly responsive, modern, and event-driven architecture designed to process biological state telemetry in real-time with zero UI friction.

The system is a **Monorepo** comprising three main pillars:
1. **Desktop Client** (`aura-desktop`)
2. **Web Client** (`frontend`)
3. **Backend Service** (`backend-node`)

---

## 1. The Native Desktop Layer (`aura-desktop`)
The desktop layer is the primary interface for users experiencing cognitive overload, designed to be completely ambient and unintrusive.

* **Core Framework:** [Electron.js](https://www.electronjs.org/)
* **Purpose:** Renders the "Orb" — a persistent, floating, transparent desktop widget.
* **Key Technical Implementations:**
  * **Absolute Positioning & Clamping:** Ensures the Orb mathematically locks to the screen and cannot be accidentally lost or dragged off-screen, providing visual stability.
  * **OS-Level Rendering:** Uses `alwaysOnTop` at the `'screen-saver'` layer to guarantee visibility over all other apps (even bypassing Windows Snipping Tool overlays).
  * **IPC (Inter-Process Communication):** Custom IPC bridges connect the raw OS-level drag/click events directly to the React physics engine for buttery smooth dragging.

---

## 2. The High-Performance Frontend (`frontend`)
A highly polished, 60fps React application that powers both the Web Interface (Portals) and the Electron Desktop views.

* **Core Framework:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
* **State Management:** [Zustand](https://github.com/pmndrs/zustand) for fast, un-opinionated global state.
* **Styling & Animations:**
  * **Framer Motion:** Drives the somatic, fluid micro-animations (like the expanding Orb and Cognitive Forge interactions).
  * **Vanilla CSS Modules:** Strict modular CSS targeting high-end glassmorphism and modern UI aesthetics without relying on heavy frameworks.
* **Key Feature Implementations:**
  * **Cognitive Forge / Sparkle Canvas:** Uses HTML5 Canvas and RequestAnimationFrame for real-time, low-latency visual feedback tied to user interaction (converting anxiety into physical rhythm).
  * **Task Shatter UI:** A dynamically rendering list component that animates micro-tasks sequentially to avoid visual overwhelm.

---

## 3. The Intelligent Backend (`backend-node`)
The backend is an event-driven Node.js server that processes telemetry, handles authentication, and orchestrates the AI neuro-engine.

* **Core Framework:** [Node.js](https://nodejs.org/) + [Express.js](https://expressjs.com/)
* **Database:** [MongoDB](https://www.mongodb.com/) + Mongoose ODM for flexible, schema-less telemetry storage.
* **Authentication:** JWT (JSON Web Tokens) with a custom dual-auth strategy (Bearer headers + query parameter fallbacks for frictionless PDF downloads).
* **AI & Clinical Engine:**
  * **LangChain.js:** Orchestrates interactions with LLMs.
  * **OpenRouter / Groq (Llama-3.1):** High-speed LLM inference.
  * **Custom JSON Extraction:** Bypasses brittle function-calling by forcing strict `jsonMode` output, ensuring complex clinical schemas (like the `GuardianBriefSchema`) never crash due to API constraints.
* **PDF Generation:** 
  * **@react-pdf/renderer:** Renders highly formal, beautifully styled Clinical PDFs entirely server-side (Node.js) based on the synthesized AI Guardian Brief.

---

## 📡 The Telemetry Data Flow (How It Connects)

1. **Passive Sensing (Frontend):** 
   The React frontend captures subtle somatic events (e.g., vocal arousal estimations, task hesitation, typing cadence, interaction bursts).
2. **Telemetry Sync (Backend):**
   These events are sent securely to the Node.js API (e.g., `POST /session-report`).
3. **Biological State Synthesis (AI Engine):**
   The backend aggregates the live telemetry with the patient's baseline (from onboarding/intake). LangChain passes this highly-structured context to the LLM.
4. **Intervention & Escalation:**
   * **Real-time:** The AI returns a state interpretation (e.g., "pre-burnout"), triggering the Frontend Orb to shift visually (e.g., into 'gentle' or 'focus' mode).
   * **Escalation:** If the risk level is `acute-distress`, the system alerts the Guardian Portal and generates a Clinical PDF Report.
