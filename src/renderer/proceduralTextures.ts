import * as THREE from 'three';
import { PlanetClassId } from '../types/game';
import { PLANET_CLASSES } from '../data/planetClasses';
import { PRNG } from '../engine/prng';

const glowCache = new Map<string, THREE.CanvasTexture>();
const planetTexCache = new Map<string, THREE.CanvasTexture>();
const ringTexCache = new Map<string, THREE.CanvasTexture>();

export function getGlowTexture(innerHex: string, outerHex = '#000000'): THREE.CanvasTexture {
  const key = `${innerHex}_${outerHex}`;
  const cached = glowCache.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.18, innerHex);
  grad.addColorStop(0.55, `${innerHex}55`);
  grad.addColorStop(1, `${outerHex}00`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  glowCache.set(key, tex);
  return tex;
}

export function getTerritoryTexture(hexColor: string): THREE.CanvasTexture {
  const key = `terr_${hexColor}`;
  const cached = glowCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, size * 0.08, cx, cy, size * 0.48);
  grad.addColorStop(0, `${hexColor}26`);
  grad.addColorStop(0.75, `${hexColor}1c`);
  grad.addColorStop(0.92, `${hexColor}55`);
  grad.addColorStop(1, `${hexColor}00`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  glowCache.set(key, tex);
  return tex;
}

export function getPlanetTexture(planetClass: PlanetClassId, seed: number): THREE.CanvasTexture {
  const key = `${planetClass}_${seed % 20}`;
  const cached = planetTexCache.get(key);
  if (cached) return cached;

  const def = PLANET_CLASSES[planetClass];
  const rng = new PRNG(seed);
  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Base fill
  ctx.fillStyle = def.baseColor;
  ctx.fillRect(0, 0, w, h);

  if (planetClass === 'gas_giant') {
    // Horizontal atmospheric bands
    for (let y = 0; y < h; y += 3) {
      const alpha = rng.range(0.08, 0.35);
      ctx.fillStyle = rng.chance(0.5) ? def.secondaryColor : '#f5deb3';
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, y, w, rng.int(2, 7));
    }
    // Great storm oval
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#e07a5f';
    ctx.beginPath();
    ctx.ellipse(rng.range(40, w - 40), rng.range(36, h - 36), 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (def.habitable) {
    // Organic continent blobs
    ctx.fillStyle = def.secondaryColor;
    const blobCount = planetClass === 'ocean' ? 14 : 34;
    for (let i = 0; i < blobCount; i++) {
      const bx = rng.range(0, w);
      const by = rng.range(14, h - 14);
      const rx = rng.range(8, 28);
      const ry = rng.range(6, 18);
      ctx.globalAlpha = rng.range(0.55, 0.9);
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, rng.range(0, Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }
    // Polar ice caps
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, w, 9);
    ctx.fillRect(0, h - 9, w, 9);
    // Subtle cloud streaks
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 22; i++) {
      ctx.globalAlpha = rng.range(0.12, 0.28);
      ctx.beginPath();
      ctx.ellipse(rng.range(0, w), rng.range(10, h - 10), rng.range(12, 34), rng.range(2, 5), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (planetClass === 'molten') {
    // Dark crust + glowing lava veins
    ctx.fillStyle = '#291512';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f97316';
    for (let i = 0; i < 26; i++) {
      ctx.lineWidth = rng.range(1, 3);
      ctx.globalAlpha = rng.range(0.45, 0.95);
      ctx.beginPath();
      let x = rng.range(0, w);
      let y = rng.range(0, h);
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += rng.range(-20, 20);
        y += rng.range(-12, 12);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    // Barren / Frozen / Toxic / Asteroid craters & patches
    for (let i = 0; i < 36; i++) {
      const cx = rng.range(0, w);
      const cy = rng.range(0, h);
      const r = rng.range(3, 14);
      ctx.fillStyle = rng.chance(0.5) ? def.secondaryColor : '#1e293b';
      ctx.globalAlpha = rng.range(0.18, 0.45);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  planetTexCache.set(key, tex);
  return tex;
}

export function getRingTexture(colorHex = '#d6b28a'): THREE.CanvasTexture {
  const cached = ringTexCache.get(colorHex);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.15, `${colorHex}44`);
  grad.addColorStop(0.32, `${colorHex}bb`);
  grad.addColorStop(0.48, `${colorHex}33`);
  grad.addColorStop(0.68, `${colorHex}cc`);
  grad.addColorStop(0.88, `${colorHex}55`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  ringTexCache.set(colorHex, tex);
  return tex;
}
