import * as THREE from 'three';

/* Prosta, deterministyczna losowość do proceduralnych tekstur. */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, size };
}

function toTexture(ctx, canvas, size, opts = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts.anisotropy ?? 8;
  tex.repeat.set(opts.repeatX ?? 1, opts.repeatY ?? 1);
  return tex;
}

export function grassTexture(seed = 1) {
  const { canvas, ctx, size } = makeCanvas(256);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#3f6b2f';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5200; i++) {
    const x = rand() * size, y = rand() * size;
    const g = 70 + Math.floor(rand() * 70);
    ctx.fillStyle = `rgba(${30 + rand() * 40},${g},${25 + rand() * 30},${0.25 + rand() * 0.4})`;
    ctx.fillRect(x, y, 1 + rand() * 2.2, 1 + rand() * 2.5);
  }
  // pojedyncze źdźbła
  for (let i = 0; i < 700; i++) {
    const x = rand() * size, y = rand() * size;
    ctx.strokeStyle = `rgba(120,${150 + rand() * 60},70,${0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 3, y - 2 - rand() * 4);
    ctx.stroke();
  }
  return toTexture(ctx, canvas, size, { repeatX: 30, repeatY: 30 });
}

export function dirtTexture(seed = 2) {
  const { canvas, ctx, size } = makeCanvas(256);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4200; i++) {
    const x = rand() * size, y = rand() * size;
    const v = rand();
    ctx.fillStyle = `rgba(${80 + v * 70},${55 + v * 45},${30 + v * 30},${0.3})`;
    ctx.fillRect(x, y, 1 + rand() * 3, 1 + rand() * 2);
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(40,30,20,${0.2 + rand() * 0.3})`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 1 + rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(ctx, canvas, size, { repeatX: 12, repeatY: 12 });
}

export function stoneWallTexture(seed = 3) {
  const { canvas, ctx, size } = makeCanvas(256);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#6f6a61';
  ctx.fillRect(0, 0, size, size);
  const rows = 7, rh = size / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : rh * 0.5;
    let x = -offset;
    while (x < size) {
      const w = rh * (1.2 + rand() * 1.3);
      const shade = 90 + rand() * 55;
      ctx.fillStyle = `rgba(${shade},${shade - 6},${shade - 14},1)`;
      ctx.fillRect(x + 2, r * rh + 2, w - 4, rh - 4);
      // tekstura kamienia
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(${30 * rand()},${30 * rand()},${30 * rand()},0.12)`;
        ctx.fillRect(x + 2 + rand() * (w - 4), r * rh + 2 + rand() * (rh - 4), 1 + rand() * 2, 1 + rand() * 2);
      }
      x += w;
    }
  }
  return toTexture(ctx, canvas, size, { repeatX: 6, repeatY: 3 });
}

export function woodTexture(seed = 4, vertical = false) {
  const { canvas, ctx, size } = makeCanvas(256);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(0, 0, size, size);
  const planks = 8, pw = size / planks;
  for (let p = 0; p < planks; p++) {
    const v = rand() * 40;
    ctx.fillStyle = `rgb(${110 + v},${78 + v * 0.6},${45 + v * 0.5})`;
    ctx.fillRect(p * pw, 0, pw, size);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(p * pw, 0, 2, size);
    // słaje drewna
    for (let i = 0; i < 50; i++) {
      ctx.strokeStyle = `rgba(${60 + rand() * 40},${40 + rand() * 30},${20},0.25)`;
      ctx.lineWidth = 1;
      const x = p * pw + rand() * pw;
      ctx.beginPath();
      ctx.moveTo(x, rand() * size);
      ctx.bezierCurveTo(x + 4, rand() * size, x - 4, rand() * size, x + 2, rand() * size);
      ctx.stroke();
    }
  }
  const tex = toTexture(ctx, canvas, size, { repeatX: 4, repeatY: 1 });
  if (vertical) tex.rotation = Math.PI / 2;
  return tex;
}

export function roofTexture(seed = 5) {
  const { canvas, ctx, size } = makeCanvas(256);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#7a2f2c';
  ctx.fillRect(0, 0, size, size);
  const tiles = 10, th = size / tiles;
  for (let r = 0; r < tiles; r++) {
    const offset = r % 2 === 0 ? 0 : th * 0.5;
    for (let x = -th; x < size; x += th) {
      const v = rand() * 40;
      ctx.fillStyle = `rgb(${140 + v},${60 + v * 0.4},${50 + v * 0.3})`;
      ctx.beginPath();
      ctx.arc(x + offset + th / 2, r * th + th * 0.45, th * 0.55, 0, Math.PI);
      ctx.fill();
    }
  }
  return toTexture(ctx, canvas, size, { repeatX: 5, repeatY: 5 });
}

export function waterTexture(seed = 6) {
  const { canvas, ctx, size } = makeCanvas(256);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#1f5f8f';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 100; i++) {
    ctx.strokeStyle = `rgba(220,240,255,${0.12 + rand() * 0.3})`;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    const y = rand() * size;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + 8, size * 0.7, y - 8, size, y);
    ctx.stroke();
  }
  const tex = toTexture(ctx, canvas, size, { repeatX: 6, repeatY: 6 });
  return tex;
}

export function rockTexture(seed = 7) {
  const { canvas, ctx, size } = makeCanvas(256);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#5b554d';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const x = rand() * size, y = rand() * size;
    const v = 50 + rand() * 120;
    ctx.fillStyle = `rgba(${v},${v - 6},${v - 16},${0.35})`;
    const r = 1 + rand() * 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // żyły kamienne
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = `rgba(30,26,22,${0.25})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x = rand() * size, y = rand() * size;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 80, y + (rand() - 0.5) * 80);
    ctx.stroke();
  }
  return toTexture(ctx, canvas, size, { repeatX: 8, repeatY: 8 });
}

export function cobbleTexture(seed = 8) {
  const { canvas, ctx, size } = makeCanvas(256);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#5f5a52';
  ctx.fillRect(0, 0, size, size);
  const cells = 9, cs = size / cells;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const v = 95 + rand() * 60;
      ctx.fillStyle = `rgb(${v},${v - 6},${v - 12})`;
      ctx.beginPath();
      ctx.ellipse(c * cs + cs / 2 + (rand() - 0.5) * 6, r * cs + cs / 2 + (rand() - 0.5) * 6, cs * 0.45, cs * 0.38, rand() * 0.6, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(0,0,0,${rand() * 0.2})`;
        ctx.fillRect(c * cs + rand() * cs, r * cs + rand() * cs, 1, 1);
      }
    }
  }
  return toTexture(ctx, canvas, size, { repeatX: 10, repeatY: 10 });
}

export function metalTexture(seed = 9) {
  const { canvas, ctx, size } = makeCanvas(128);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#8d949c';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i++) {
    const v = 100 + rand() * 100;
    ctx.fillStyle = `rgba(${v},${v},${v + 8},${0.2})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(rand() * size, rand() * size);
    ctx.lineTo(rand() * size, rand() * size);
    ctx.stroke();
  }
  return toTexture(ctx, canvas, size);
}

export function treeBarkTexture(seed = 10) {
  const { canvas, ctx, size } = makeCanvas(128);
  const rand = mulberry32(seed);
  ctx.fillStyle = '#5a3c26';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const v = rand() * 60;
    ctx.fillStyle = `rgba(${70 + v},${45 + v * 0.6},${25 + v * 0.4},0.4)`;
    ctx.fillRect(rand() * size, rand() * size, 2, 1 + rand() * 5);
  }
  return toTexture(ctx, canvas, size, { repeatX: 1, repeatY: 3 });
}
