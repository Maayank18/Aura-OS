import OpenAI from 'openai';

const MAX_BASE64_CHARS = 1_500_000;
const HEX_RE = /^#[0-9a-f]{6}$/i;

let client = null;

const getClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set.');

  if (!client) {
    client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'AuraOS',
      },
    });
  }

  return client;
};

const cleanJson = (raw) => {
  const stripped = String(raw || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Sketch transformer returned non-JSON content.');
  }
  return JSON.parse(stripped.slice(start, end + 1));
};

const sanitizeText = (value, fallback = '', max = 500) =>
  String(value || fallback).replace(/[<>]/g, '').slice(0, max).trim();

export const sanitizeSvg = (svgInput) => {
  let svg = String(svgInput || '').trim();
  if (!svg) return '';

  svg = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(?:href|xlink:href)\s*=\s*(['"])\s*(?:javascript:|data:text\/html)[\s\S]*?\1/gi, '');

  const match = svg.match(/<svg[\s\S]*<\/svg>/i);
  svg = match ? match[0] : '';
  if (!svg) return '';

  if (!/\sviewBox=/i.test(svg)) {
    svg = svg.replace(/<svg/i, '<svg viewBox="0 0 800 500"');
  }
  if (!/\sxmlns=/i.test(svg)) {
    svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return svg.slice(0, 80_000);
};

const normalizeResult = (parsed, fallback) => {
  const palette = Array.isArray(parsed.palette)
    ? parsed.palette.filter((color) => typeof color === 'string' && HEX_RE.test(color)).slice(0, 5)
    : [];

  return {
    what_i_see: sanitizeText(parsed.what_i_see, fallback.what_i_see, 360),
    real_world_title: sanitizeText(parsed.real_world_title, fallback.real_world_title, 80),
    emotion_unlocked: sanitizeText(parsed.emotion_unlocked, fallback.emotion_unlocked, 40).toLowerCase(),
    subject_category: sanitizeText(parsed.subject_category, fallback.subject_category, 40).toLowerCase(),
    palette: palette.length ? palette : fallback.palette,
    clinical_observation: sanitizeText(parsed.clinical_observation, fallback.clinical_observation, 420),
    svg_world: sanitizeSvg(parsed.svg_world) || fallback.svg_world,
    fallback: false,
  };
};

const buildFallbackSvg = (metrics = {}) => {
  const energy = metrics.strokeEnergy || 'moderate';
  const density = metrics.expressionDensity || 'moderate';
  const colorA = energy === 'high' ? '#f97316' : energy === 'low' ? '#5eead4' : '#00e5ff';
  const colorB = density === 'dense' ? '#ffb300' : density === 'sparse' ? '#c4b5fd' : '#00e676';

  return `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Generated abstract landscape">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#07111f"/>
        <stop offset="55%" stop-color="#102846"/>
        <stop offset="100%" stop-color="#06141a"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="32%" r="48%">
        <stop offset="0%" stop-color="${colorA}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${colorA}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="path" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${colorA}" stop-opacity="0.18"/>
        <stop offset="50%" stop-color="${colorB}" stop-opacity="0.72"/>
        <stop offset="100%" stop-color="${colorA}" stop-opacity="0.18"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#sky)"/>
    <circle cx="410" cy="150" r="220" fill="url(#glow)"/>
    <path d="M0 340 C120 290 220 325 340 270 C480 205 610 280 800 220 L800 500 L0 500 Z" fill="#0d2c38"/>
    <path d="M0 382 C150 332 255 380 392 315 C525 252 650 315 800 286 L800 500 L0 500 Z" fill="#081d27"/>
    <path d="M110 430 C245 330 325 405 405 292 C490 405 580 330 710 430" fill="none" stroke="url(#path)" stroke-width="22" stroke-linecap="round"/>
    <path d="M144 422 C270 348 326 395 405 318 C487 395 538 348 676 422" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3" stroke-linecap="round"/>
    <g fill="${colorB}" opacity="0.85">
      <circle cx="174" cy="246" r="3"/><circle cx="236" cy="196" r="2"/><circle cx="596" cy="180" r="3"/><circle cx="658" cy="250" r="2"/>
      <circle cx="444" cy="116" r="2"/><circle cx="362" cy="174" r="3"/><circle cx="512" cy="240" r="2"/>
    </g>
    <g stroke="${colorA}" stroke-width="3" stroke-linecap="round" opacity="0.72">
      <path d="M190 312 q24 -30 48 0"/><path d="M544 308 q30 -38 60 0"/><path d="M374 255 q31 -44 64 0"/>
    </g>
    <text x="400" y="462" text-anchor="middle" fill="#dff7ff" opacity="0.62" font-family="Inter, system-ui, sans-serif" font-size="18">A small world made from motion</text>
  </svg>`;
};

export const buildLocalSketchFallback = (metrics = {}) => {
  const coverage = Number(metrics.coverage || 0);
  const energy = metrics.strokeEnergy || 'moderate';
  const title = coverage < 20 ? 'Quiet Hidden Clearing' : energy === 'high' ? 'Bright Moving Field' : 'Soft Signal Valley';

  return {
    what_i_see: coverage < 20
      ? 'I see a restrained spark: a small mark that still carries a clear wish to become visible.'
      : 'I see movement searching for shape, like a feeling becoming a place before it has words.',
    real_world_title: title,
    emotion_unlocked: energy === 'high' ? 'energy' : coverage < 20 ? 'calm' : 'wonder',
    subject_category: 'abstract',
    palette: ['#00e5ff', '#c4b5fd', '#00e676'],
    clinical_observation: 'Your drawing pattern can be read as a moment of expression taking form; use it as reflection, not diagnosis.',
    svg_world: buildFallbackSvg(metrics),
    fallback: true,
  };
};

const buildPrompt = (metrics = {}) => `You are the creative transformation engine inside AuraOS, a mental health support app.

A user made a 30-second freehand sketch. Interpret the drawing generously and transform it into a beautiful SVG world.

Stroke metadata:
- Canvas coverage: ${metrics.coverage || 0}%
- Stroke energy: ${metrics.strokeEnergy || 'moderate'}
- Expression density: ${metrics.expressionDensity || 'moderate'}
- Hesitation: ${metrics.hesitationIndex || 'low'}
- Total strokes: ${metrics.totalStrokes || 0}
- Stroke complexity: ${metrics.strokeComplexity || 'gestural'}

Return ONLY valid JSON:
{
  "what_i_see": "Warm 1-2 sentence interpretation. No diagnosis.",
  "real_world_title": "3-5 words",
  "emotion_unlocked": "one simple emotion",
  "subject_category": "nature | figure | architecture | abstract | animal | cosmos | ocean | forest | city",
  "palette": ["#hex1", "#hex2", "#hex3"],
  "clinical_observation": "One compassionate sentence about what the drawing pattern might reflect emotionally. Do not diagnose.",
  "svg_world": "<svg viewBox='0 0 800 500' xmlns='http://www.w3.org/2000/svg'>complete self-contained SVG scene, no scripts, no foreignObject, 20-55 elements</svg>"
}`;

export const transformSketch = async ({ imageBase64, strokeMetrics }) => {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new Error('imageBase64 is required.');
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    throw new Error('Sketch image is too large.');
  }

  const fallback = buildLocalSketchFallback(strokeMetrics);
  const model = process.env.OPENROUTER_VISION_MODEL ||
    process.env.OPENROUTER_SKETCH_MODEL ||
    'openai/gpt-4o-mini';

  try {
    const response = await getClient().chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildPrompt(strokeMetrics) },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4500,
      temperature: 0.85,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices?.[0]?.message?.content || '';
    return normalizeResult(cleanJson(raw), fallback);
  } catch (err) {
    console.warn(`[SketchTransformer] OpenRouter transform failed: ${err.message}`);
    return fallback;
  }
};
