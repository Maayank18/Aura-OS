// src/hooks/usePhysics.js
// React wrapper around the Matter.js physics engine.
// Exposes a clean API so CognitiveForge.jsx never touches Matter directly.

import { useRef, useCallback, useEffect } from 'react';
import { initEngine, destroyEngine } from '../physics/engine.js';
import { spawnAllWorries, clearAllBlocks } from '../physics/entities.js';
import { addMouseInteraction, removeMouseInteraction } from '../physics/interactions.js';

/**
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {(uuid: string) => void} onBlockDestroyed
 *   Callback fired when a worry block lands in the fireplace.
 */
export default function usePhysics(canvasRef, onBlockDestroyed) {
  const engineRef          = useRef(null);
  const renderRef          = useRef(null);
  const runnerRef          = useRef(null);
  const worldRef           = useRef(null);
  const mouseConstraintRef = useRef(null);

  // ── Initialise ─────────────────────────────────────────────────────────────
  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return; // already initialised

    const { engine, render, runner, world } = initEngine(canvas, onBlockDestroyed);

    engineRef.current = engine;
    renderRef.current = render;
    runnerRef.current = runner;
    worldRef.current  = world;

    mouseConstraintRef.current = addMouseInteraction(engine, render, canvas);
  }, [canvasRef, onBlockDestroyed]);

  // ── Spawn worries ──────────────────────────────────────────────────────────
  const spawnWorries = useCallback((worries) => {
    if (!worldRef.current || !canvasRef.current) return;
    const W = canvasRef.current.width;
    spawnAllWorries(worldRef.current, worries, W);
  }, [canvasRef]);

  // ── Clear all blocks ───────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    if (!worldRef.current) return;
    clearAllBlocks(worldRef.current);
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      removeMouseInteraction(worldRef.current, mouseConstraintRef.current);
      if (renderRef.current && runnerRef.current) {
        destroyEngine(renderRef.current, runnerRef.current);
      }
      engineRef.current = null;
    };
  }, []);

  return { init, spawnWorries, clearAll };
}