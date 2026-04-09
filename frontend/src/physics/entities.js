// src/physics/entities.js
// Factory functions for Matter.js physics bodies used in Cognitive Forge.

import Matter from 'matter-js';
import { weightToWidth, weightToColor } from './engine.js';

const { Bodies, World } = Matter;

const BLOCK_HEIGHT = 56;

/**
 * Spawns a single worry block into the Matter.js world.
 *
 * @param {object} world   - Matter.js world
 * @param {object} worry   - { uuid, worry, weight }
 * @param {number} canvasW - Canvas width (for random x spawn position)
 */
export const spawnWorryBlock = (world, worry, canvasW) => {
  const blockW = weightToWidth(worry.weight);
  const color  = weightToColor(worry.weight);

  // Random x in the middle third of the canvas to avoid wall hugging
  const minX = blockW / 2 + 40;
  const maxX = canvasW - blockW / 2 - 40;
  const x = minX + Math.random() * (maxX - minX);
  const y = -BLOCK_HEIGHT; // spawn just above the visible canvas

  const body = Bodies.rectangle(x, y, blockW, BLOCK_HEIGHT, {
    label: `worry-${worry.uuid}`,
    restitution: 0.35,
    friction: 0.6,
    frictionAir: 0.02,
    render: {
      fillStyle: color,
      strokeStyle: `${color}99`,
      lineWidth: 1,
    },
  });

  // Attach custom metadata so the afterRender hook can draw the label
  body.worryUuid  = worry.uuid;
  body.worryText  = worry.worry;
  body.worryWidth = blockW;
  body.weight     = worry.weight;

  // Tiny random torque for natural tumbling
  Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);

  World.add(world, body);
  return body;
};

/**
 * Spawns all worries from an array with staggered timing (visual drama).
 *
 * @param {object} world
 * @param {Array}  worries
 * @param {number} canvasW
 * @param {number} delayMs - Stagger delay between each block (ms)
 */
export const spawnAllWorries = (world, worries, canvasW, delayMs = 200) => {
  worries.forEach((worry, idx) => {
    setTimeout(() => {
      spawnWorryBlock(world, worry, canvasW);
    }, idx * delayMs);
  });
};

/**
 * Removes all worry blocks from the world (panic "destroy all" button).
 */
export const clearAllBlocks = (world) => {
  const toRemove = world.bodies.filter(
    (b) => b.label !== 'wall' && b.label !== 'fireplace'
  );
  World.remove(world, toRemove);
};