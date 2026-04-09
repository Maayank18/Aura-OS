// src/physics/engine.js
// Initialises the Matter.js world for the Cognitive Forge canvas.
// Returns engine, render, runner, and the world reference.

import Matter from 'matter-js';

const { Engine, Render, Runner, World, Bodies, Events } = Matter;

// Weight (1-10) → block width in pixels
export const weightToWidth  = (w) => 90 + w * 18;
// Weight → fill color (low = cool blue, high = hot red)
export const weightToColor  = (w) => {
  if (w >= 8) return '#f43f5e';   // coral – high urgency
  if (w >= 5) return '#f59e0b';   // amber – medium
  return '#7c3aed';               // purple – lower
};

/**
 * Creates and starts a Matter.js world bound to a canvas element.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {(bodyLabel: string) => void} onBlockDestroyed
 *   Called when a worry block falls into the fireplace sensor.
 *
 * @returns {{ engine, render, runner, world }}
 */
export const initEngine = (canvas, onBlockDestroyed) => {
  const W = canvas.width;
  const H = canvas.height;

  const engine = Engine.create({ gravity: { x: 0, y: 0.8 } });
  const { world } = engine;

  const render = Render.create({
    canvas,
    engine,
    options: {
      width: W,
      height: H,
      background: 'transparent',
      wireframes: false,
      pixelRatio: window.devicePixelRatio || 1,
    },
  });

  // ── Static walls ───────────────────────────────────────────────────────────
  const wallOpts = { isStatic: true, render: { fillStyle: 'transparent' }, label: 'wall' };
  World.add(world, [
    Bodies.rectangle(W / 2, H + 25, W, 50, wallOpts),  // floor (hidden, below canvas)
    Bodies.rectangle(-25,   H / 2, 50, H, wallOpts),   // left wall
    Bodies.rectangle(W + 25, H / 2, 50, H, wallOpts),  // right wall
  ]);

  // ── Fireplace sensor ───────────────────────────────────────────────────────
  // Invisible sensor; the visual fireplace is drawn in React DOM
  const fireplace = Bodies.rectangle(W / 2, H - 14, W - 80, 28, {
    isStatic: true,
    isSensor: true,
    label: 'fireplace',
    render: { fillStyle: 'transparent', strokeStyle: 'transparent' },
  });
  World.add(world, fireplace);

  // ── Collision: block enters fireplace → destroy it ─────────────────────────
  Events.on(engine, 'collisionStart', ({ pairs }) => {
    pairs.forEach(({ bodyA, bodyB }) => {
      const block =
        bodyA.label === 'fireplace' ? bodyB :
        bodyB.label === 'fireplace' ? bodyA : null;

      if (block && block.label !== 'fireplace' && block.label !== 'wall') {
        World.remove(world, block);
        onBlockDestroyed?.(block.worryUuid);
      }
    });
  });

  // ── Custom render: draw worry text on each block ───────────────────────────
  Events.on(render, 'afterRender', () => {
    const ctx = render.context;

    world.bodies.forEach((body) => {
      if (body.label === 'wall' || body.label === 'fireplace' || !body.worryText) return;

      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);

      // White text, two lines if needed
      const text = body.worryText;
      const maxWidth = body.worryWidth - 24;

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '500 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Simple line-break: if text too long, split roughly in half
      if (ctx.measureText(text).width > maxWidth) {
        const words = text.split(' ');
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        ctx.fillText(line1, 0, -8);
        ctx.fillText(line2, 0, 8);
      } else {
        ctx.fillText(text, 0, 0);
      }

      ctx.restore();
    });
  });

  const runner = Runner.create();
  Render.run(render);
  Runner.run(runner, engine);

  return { engine, render, runner, world };
};

/**
 * Stops the engine and renderer cleanly.
 */
export const destroyEngine = (render, runner) => {
  Render.stop(render);
  Runner.stop(runner);
};