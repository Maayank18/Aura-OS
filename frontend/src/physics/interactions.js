// src/physics/interactions.js
// Attaches Matter.js MouseConstraint to the canvas so users can
// grab and drag worry blocks with their mouse/touch.

import Matter from 'matter-js';

const { Mouse, MouseConstraint, World } = Matter;

/**
 * Adds a drag-and-drop mouse constraint to the physics world.
 * Returns the MouseConstraint so it can be removed on cleanup.
 *
 * @param {object} engine
 * @param {object} render
 * @param {HTMLCanvasElement} canvas
 * @returns {MouseConstraint}
 */
export const addMouseInteraction = (engine, render, canvas) => {
  const mouse = Mouse.create(canvas);

  // Keep the internal DPR scaling in sync with the renderer
  mouse.pixelRatio = render.options.pixelRatio;

  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.2,
      damping: 0.1,
      render: {
        // Show a subtle spring line when dragging
        visible: true,
        lineWidth: 1,
        strokeStyle: 'rgba(167,139,250,0.5)', // --purple-light
      },
    },
  });

  World.add(engine.world, mouseConstraint);

  // Prevent canvas mouse events from scrolling the page
  canvas.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

  return mouseConstraint;
};

/**
 * Removes the mouse constraint when the component unmounts.
 */
export const removeMouseInteraction = (world, mouseConstraint) => {
  if (mouseConstraint) {
    World.remove(world, mouseConstraint);
  }
};