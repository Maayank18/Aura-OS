// frontend/src/components/PerceptionProbe.jsx
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore.js';

const IMAGES = [
  {
    id: 'duck-rabbit',
    src: '/duck.png',
    choices: ['Duck', 'Rabbit'],
    prompt: 'What do you see first?',
    hint: (seen) => `You saw the ${seen}. Can you find the ${seen === 'Duck' ? 'Rabbit' : 'Duck'}?`,
  },
  {
    id: 'tree-animals',
    src: '/tree.png',
    choices: ['Trees', 'Hidden Animals'],
    prompt: 'What do you notice first?',
    hint: (seen) =>
      seen === 'Trees'
        ? 'You saw Trees. Can you spot the hidden animals lurking in the branches?'
        : 'You spotted Hidden Animals. Can you now see the Trees as just trees?',
  },
  {
    id: 'vase-faces',
    src: '/faces.png',
    choices: ['Faces', 'Vase'],
    prompt: 'What stands out to you first?',
    hint: (seen) => `You noticed the ${seen}. Can you see the ${seen === 'Faces' ? 'Vase' : 'Faces'} now?`,
  },
];

const BUTTON_BASE = {
  borderRadius: 14,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  padding: '16px 20px',
};

export default function PerceptionProbe({ onSessionEnd }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [firstSeen, setFirstSeen] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const switchStartRef = useRef(null);
  const gameStartRef = useRef(Date.now());
  const addProbeSession = useStore((s) => s.addProbeSession);

  const current = IMAGES[currentIdx];

  const logAndAdvance = useCallback(
    (session) => {
      if (isTransitioning) return;
      setIsTransitioning(true);

      addProbeSession(session);

      const isLast = currentIdx >= IMAGES.length - 1;

      if (isLast) {
        const durationSeconds = Math.round((Date.now() - gameStartRef.current) / 1000);
        onSessionEnd?.({
          gameId: 'perception_probe',
          gameName: 'Perspective Shift',
          durationSeconds,
          interactions: IMAGES.length,
          avgReactionMs: session.latencyMs,
          accuracy: session.canSwitchPerspective ? 100 : 0,
          score: session.canSwitchPerspective ? 100 : 0,
        });
      } else {
        // Reset state after exit animation completes (~280ms)
        setTimeout(() => {
          setCurrentIdx((i) => i + 1);
          setFirstSeen(null);
          switchStartRef.current = null;
          setIsTransitioning(false);
        }, 300);
      }
    },
    [addProbeSession, currentIdx, isTransitioning, onSessionEnd]
  );

  const handleChoice = useCallback(
    (choice) => {
      if (isTransitioning) return;

      if (choice === 'both') {
        logAndAdvance({
          imageId: current.id,
          firstSeen: 'both',
          latencyMs: 0,
          canSwitchPerspective: true,
        });
        return;
      }

      if (!firstSeen) {
        setFirstSeen(choice);
        switchStartRef.current = Date.now();
      } else {
        const latencyMs = switchStartRef.current != null ? Date.now() - switchStartRef.current : 0;
        logAndAdvance({
          imageId: current.id,
          firstSeen,
          latencyMs,
          canSwitchPerspective: true,
        });
      }
    },
    [current.id, firstSeen, isTransitioning, logAndAdvance]
  );

  const handleStuck = useCallback(() => {
    if (isTransitioning || !firstSeen) return;
    const latencyMs = switchStartRef.current != null ? Date.now() - switchStartRef.current + 20000 : 20000;
    logAndAdvance({
      imageId: current.id,
      firstSeen,
      latencyMs,
      canSwitchPerspective: false,
    });
  }, [current.id, firstSeen, isTransitioning, logAndAdvance]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        padding: '16px 20px',
        gap: 16,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 6, width: '100%', flexShrink: 0 }}>
        {IMAGES.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= currentIdx ? 'var(--cyan)' : 'var(--border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}
        >
          <p
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-1)',
              textAlign: 'center',
              lineHeight: 1.3,
              flexShrink: 0,
              margin: 0,
            }}
          >
            {!firstSeen ? current.prompt : current.hint(firstSeen)}
          </p>

          {/* Image */}
          <div
            style={{
              width: '100%',
              borderRadius: 16,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              minHeight: 0,
            }}
          >
            <img
              src={current.src}
              alt="Bistable illusion"
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 280,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {!firstSeen ? (
              <>
                {current.choices.map((c) => (
                  <motion.button
                    key={c}
                    onClick={() => handleChoice(c)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={isTransitioning}
                    style={{
                      ...BUTTON_BASE,
                      flex: 1,
                      minWidth: 110,
                      border: '1px solid var(--border-h)',
                      background: 'var(--bg-glass)',
                      color: 'var(--text-1)',
                    }}
                  >
                    {c}
                  </motion.button>
                ))}
                <motion.button
                  onClick={() => handleChoice('both')}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={isTransitioning}
                  style={{
                    ...BUTTON_BASE,
                    width: '100%',
                    fontSize: 14,
                    border: '1px solid rgba(0,229,255,0.3)',
                    background: 'rgba(0,229,255,0.08)',
                    color: 'var(--cyan)',
                  }}
                >
                  ✦ I see both immediately
                </motion.button>
              </>
            ) : (
              <>
                {current.choices
                  .filter((c) => c !== firstSeen)
                  .map((c) => (
                    <motion.button
                      key={c}
                      onClick={() => handleChoice(c)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={isTransitioning}
                      style={{
                        ...BUTTON_BASE,
                        flex: 1,
                        border: '1px solid rgba(0,229,255,0.35)',
                        background: 'rgba(0,229,255,0.09)',
                        color: 'var(--cyan)',
                      }}
                    >
                      I see the {c} now!
                    </motion.button>
                  ))}
                <motion.button
                  onClick={handleStuck}
                  whileTap={{ scale: 0.97 }}
                  disabled={isTransitioning}
                  style={{
                    ...BUTTON_BASE,
                    width: '100%',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '12px 20px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-3)',
                  }}
                >
                  I can't see the other one — skip
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}