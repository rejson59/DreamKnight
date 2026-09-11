// Proceduralne tekstury malowane na canvas — zero zewnętrznych assetów.
import * as THREE from 'three';

// Polyfill roundRect dla starszych przeglądarek
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) {
    this.rect(x, y, w, h);
    return this;
  };
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function tex(c, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function noise(ctx, s, n, colors, rMin = 1, rMax = 3) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.globalAlpha = 0.25 + Math.random() * 0.5;
    const r = rMin + Math.random() * (rMax - rMin);
    ctx.beginPath();
    ctx.arc(Math.random() * s, Math.random() * s, r, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function grassDetail() {
  const [c, x] = canvas(256);
  x.fillStyle = '#5d7a35'; x.fillRect(0, 0, 256, 256);
  // duże plamy odcieni
  for (let i = 0; i < 26; i++) {
    const g = x.createRadialGradient(Math.random() * 256, Math.random() * 256, 2, Math.random() * 256, Math.random() * 256, 20 + Math.random() * 40);
    const col = ['#4a6530', '#6b8a42', '#55702c', '#75924a'][(Math.random() * 4) | 0];
    g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  }
  noise(x, 256, 2600, ['#4a6530', '#6b8a42', '#55702c', '#75924a', '#3f5a28'], 1, 2.5);
  for (let i = 0; i < 1500; i++) {
    x.strokeStyle = ['#6b8a42', '#7fa050', '#4a6530', '#8fb45a'][(Math.random() * 4) | 0];
    x.globalAlpha = 0.75; x.lineWidth = 1;
    const px = Math.random() * 256, py = Math.random() * 256;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 5, py - 3 - Math.random() * 5); x.stroke();
  }
  // drobne listki i kwiatki
  for (let i = 0; i < 60; i++) {
    x.globalAlpha = 0.9;
    x.fillStyle = ['#8fb45a', '#a8cc6a', '#e8e8d0'][(Math.random() * 3) | 0];
    x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 1.5, 2.5, Math.random() * 3, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
  return c;
}

function dirt() {
  const [c, x] = canvas(256);
  x.fillStyle = '#6b4e2e'; x.fillRect(0, 0, 256, 256);
  noise(x, 256, 2200, ['#5a4025', '#7a5a36', '#4e3720', '#86643c'], 1, 4);
  return c;
}

function cobble() {
  const [c, x] = canvas(256);
  x.fillStyle = '#4a4a52'; x.fillRect(0, 0, 256, 256);
  const n = 6, s = 256 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const g = 110 + Math.random() * 50;
    x.fillStyle = `rgb(${g},${g},${g + 8})`;
    x.beginPath();
    x.roundRect(i * s + 3 + Math.random() * 3, j * s + 3 + Math.random() * 3, s - 7, s - 7, 8);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.beginPath(); x.roundRect(i * s + 6, j * s + 5, s - 14, 8, 4); x.fill();
  }
  noise(x, 256, 500, ['#33333a', '#88888f'], 1, 2);
  return c;
}

function stoneWall() {
  const [c, x] = canvas(256);
  x.fillStyle = '#3d3d45'; x.fillRect(0, 0, 256, 256);
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const y = (r * 256) / rows, off = (r % 2) * 32;
    for (let i = -1; i < 5; i++) {
      const g = 120 + Math.random() * 45;
      x.fillStyle = `rgb(${g - 8},${g - 4},${g + 6})`;
      x.fillRect(i * 64 + off + 2, y + 2, 60, 256 / rows - 4);
      x.fillStyle = 'rgba(255,255,255,0.10)';
      x.fillRect(i * 64 + off + 2, y + 2, 60, 5);
      x.fillStyle = 'rgba(0,0,0,0.18)';
      x.fillRect(i * 64 + off + 2, y + 256 / rows - 8, 60, 6);
    }
  }
  noise(x, 256, 700, ['#2c2c33', '#9a9aa5', '#5a5a64'], 1, 3);
  return c;
}

function rock() {
  const [c, x] = canvas(256);
  x.fillStyle = '#6e6e78'; x.fillRect(0, 0, 256, 256);
  noise(x, 256, 2800, ['#5a5a64', '#82828c', '#4c4c55', '#94949e', '#3f3f47'], 1, 5);
  // rysy
  x.strokeStyle = 'rgba(30,30,36,0.5)'; x.lineWidth = 2;
  for (let i = 0; i < 22; i++) {
    x.beginPath();
    let px = Math.random() * 256, py = Math.random() * 256;
    x.moveTo(px, py);
    for (let k = 0; k < 4; k++) { px += (Math.random() - 0.5) * 60; py += (Math.random() - 0.5) * 60; x.lineTo(px, py); }
    x.stroke();
  }
  return c;
}

function planks(base = '#7a5a30', dark = '#5a4020') {
  const [c, x] = canvas(256);
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    x.fillStyle = dark; x.fillRect(0, i * 32, 256, 2);
    x.strokeStyle = 'rgba(60,35,10,0.4)'; x.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      x.beginPath();
      const y = i * 32 + 4 + Math.random() * 26;
      x.moveTo(0, y);
      x.bezierCurveTo(80, y + (Math.random() - 0.5) * 6, 170, y + (Math.random() - 0.5) * 6, 256, y);
      x.stroke();
    }
    // sęki
    if (Math.random() < 0.7) {
      x.fillStyle = 'rgba(50,30,8,0.55)';
      x.beginPath(); x.ellipse(Math.random() * 256, i * 32 + 16, 5, 3, 0, 0, 7); x.fill();
    }
  }
  noise(x, 256, 300, [dark], 1, 2);
  return c;
}

function roof() {
  const [c, x] = canvas(256);
  x.fillStyle = '#6e2f1e'; x.fillRect(0, 0, 256, 256);
  const rows = 8, cols = 8;
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
    const off = (r % 2) * 16;
    const v = 100 + Math.random() * 45;
    x.fillStyle = `rgb(${v + 30},${v * 0.45},${v * 0.3})`;
    x.beginPath(); x.roundRect(i * 32 + off - 16 + 1, r * 32 + 1, 30, 30, 6); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.fillRect(i * 32 + off - 16 + 1, r * 32 + 27, 30, 4);
  }
  return c;
}

function thatch() {
  const [c, x] = canvas(256);
  x.fillStyle = '#a8874a'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    x.strokeStyle = ['#c0a05a', '#8a6e35', '#b3924f'][(Math.random() * 3) | 0];
    x.globalAlpha = 0.8; x.lineWidth = 1;
    const px = Math.random() * 256, py = Math.random() * 256;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 3, py + 5 + Math.random() * 6); x.stroke();
  }
  x.globalAlpha = 1;
  return c;
}

function plaster() {
  const [c, x] = canvas(256);
  x.fillStyle = '#d8c9a8'; x.fillRect(0, 0, 256, 256);
  noise(x, 256, 1500, ['#c9b895', '#e5d7b8', '#bfab84'], 1, 4);
  return c;
}

function marble() {
  const [c, x] = canvas(256);
  x.fillStyle = '#cfd2d8'; x.fillRect(0, 0, 256, 256);
  noise(x, 256, 500, ['#e8ebf0', '#b9bec8'], 1, 6);
  x.strokeStyle = 'rgba(120,128,145,0.5)'; x.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    x.beginPath();
    let px = Math.random() * 256, py = Math.random() * 256;
    x.moveTo(px, py);
    for (let k = 0; k < 6; k++) { px += (Math.random() - 0.5) * 90; py += (Math.random() - 0.5) * 90; x.lineTo(px, py); }
    x.stroke();
  }
  return c;
}

function bark() {
  const [c, x] = canvas(128);
  const g0 = x.createLinearGradient(0, 0, 128, 0);
  g0.addColorStop(0, '#3a2812'); g0.addColorStop(0.35, '#5a4125'); g0.addColorStop(0.65, '#4a3520'); g0.addColorStop(1, '#2e1f0e');
  x.fillStyle = g0; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 56; i++) {
    x.strokeStyle = Math.random() < 0.5 ? '#2a1d0c' : '#6b4f2d';
    x.lineWidth = 1 + Math.random() * 3;
    const px = Math.random() * 128;
    x.beginPath(); x.moveTo(px, 0);
    x.bezierCurveTo(px + (Math.random() - 0.5) * 14, 40, px + (Math.random() - 0.5) * 14, 90, px, 128);
    x.stroke();
  }
  return c;
}

function leaves(base, light, dark) {
  const [c, x] = canvas(128);
  x.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) {
    x.fillStyle = [base, light, dark][(Math.random() * 3) | 0];
    x.globalAlpha = 0.85;
    const px = Math.random() * 128, py = Math.random() * 128, r = 3 + Math.random() * 6;
    x.beginPath(); x.ellipse(px, py, r, r * 0.7, Math.random() * 3, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
  return c;
}

function water() {
  const [c, x] = canvas(256);
  const g = x.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, '#1d4e5f'); g.addColorStop(0.5, '#256b7d'); g.addColorStop(1, '#1a4552');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    x.beginPath();
    const y = Math.random() * 256, px = Math.random() * 256, len = 20 + Math.random() * 60;
    x.moveTo(px, y);
    x.quadraticCurveTo(px + len / 2, y + (Math.random() - 0.5) * 8, px + len, y);
    x.stroke();
  }
  // drobne błyski tafli
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(220,245,255,${0.08 + Math.random() * 0.14})`;
    x.beginPath();
    x.ellipse(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 1 + Math.random() * 1.6, 0, 0, 7);
    x.fill();
  }
  x.strokeStyle = 'rgba(10,30,40,0.25)';
  for (let i = 0; i < 40; i++) {
    x.beginPath();
    const y = Math.random() * 256, px = Math.random() * 256, len = 30 + Math.random() * 50;
    x.moveTo(px, y); x.lineTo(px + len, y + (Math.random() - 0.5) * 6); x.stroke();
  }
  return c;
}

function cloth(color, stripe) {
  const [c, x] = canvas(128);
  x.fillStyle = color; x.fillRect(0, 0, 128, 128);
  if (stripe) { x.fillStyle = stripe; for (let i = 0; i < 4; i++) x.fillRect(i * 32, 0, 16, 128); }
  noise(x, 128, 500, ['rgba(0,0,0,0.15)', 'rgba(255,255,255,0.12)'], 1, 2);
  return c;
}

function metal() {
  const [c, x] = canvas(128);
  const g = x.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, '#8a8f98'); g.addColorStop(0.4, '#c9ced6'); g.addColorStop(0.6, '#9aa0aa'); g.addColorStop(1, '#6e737c');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  noise(x, 128, 260, ['rgba(40,40,48,0.4)', 'rgba(255,255,255,0.25)'], 1, 2);
  return c;
}

function hay() {
  const [c, x] = canvas(128);
  x.fillStyle = '#b99a4e'; x.fillRect(0, 0, 128, 128);
  noise(x, 128, 1200, ['#d0b25e', '#9a7c3a', '#c4a652'], 1, 2);
  return c;
}

function ironBars() {
  const [c, x] = canvas(128);
  x.clearRect(0, 0, 128, 128);
  x.fillStyle = '#22242a';
  for (let i = 0; i < 8; i++) x.fillRect(i * 16 + 5, 0, 6, 128);
  x.fillRect(0, 20, 128, 6); x.fillRect(0, 100, 128, 6);
  return c;
}

function bannerEmblem() {
  const [c, x] = canvas(128);
  x.fillStyle = '#7a1010'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#e8b64c';
  x.font = 'bold 74px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('♛', 64, 56);
  x.fillRect(20, 100, 88, 6);
  x.strokeStyle = '#e8b64c'; x.lineWidth = 5; x.strokeRect(3, 3, 122, 122);
  return c;
}

function softCircle(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const [c, x] = canvas(64);
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function flame() {
  const [c, x] = canvas(64);
  let g = x.createRadialGradient(32, 40, 2, 32, 36, 28);
  g.addColorStop(0, 'rgba(255,240,180,1)');
  g.addColorStop(0.35, 'rgba(255,160,40,0.9)');
  g.addColorStop(0.7, 'rgba(220,60,10,0.5)');
  g.addColorStop(1, 'rgba(120,20,0,0)');
  x.fillStyle = g;
  x.beginPath(); x.ellipse(32, 36, 22, 28, 0, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function questionMark(char, color) {
  const [c, x] = canvas(64);
  x.font = 'bold 46px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.strokeStyle = '#000'; x.lineWidth = 8; x.strokeText(char, 32, 34);
  x.fillStyle = color; x.fillText(char, 32, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let cache = null;
export function makeTextures() {
  if (cache) return cache;
  cache = {
    grass: tex(grassDetail(), 90),
    dirt: tex(dirt(), 40),
    cobble: tex(cobble(), 1),
    stoneWall: tex(stoneWall(), 1),
    rock: tex(rock(), 1),
    wood: tex(planks(), 1),
    woodDark: tex(planks('#5a4020', '#3a2812'), 1),
    roof: tex(roof(), 1),
    thatch: tex(thatch(), 1),
    plaster: tex(plaster(), 1),
    marble: tex(marble(), 1),
    bark: tex(bark(), 1),
    leafOak: tex(leaves('#3f6b2a', '#5a8f3c', '#2c4f1e'), 1),
    leafPine: tex(leaves('#1f4a2e', '#2f6b42', '#143423'), 1),
    leafMagic: tex(leaves('#2a6b8f', '#5fd0ff', '#174a63'), 1),
    leafAutumn: tex(leaves('#8f5a1e', '#d09a3c', '#6b3f10'), 1),
    water: tex(water(), 1),
    clothRed: tex(cloth('#8f1f1f'), 1),
    clothBlue: tex(cloth('#1f3f8f'), 1),
    stallStripe: tex(cloth('#c9bfa8', '#8f1f1f'), 1),
    stallStripe2: tex(cloth('#c9bfa8', '#1f5a3a'), 1),
    metal: tex(metal(), 1),
    hay: tex(hay(), 1),
    ironBars: tex(ironBars(), 1),
    banner: tex(bannerEmblem(), 1),
    soft: softCircle(),
    softWarm: softCircle('rgba(255,220,150,1)', 'rgba(255,150,50,0)'),
    flame: flame(),
    markQuest: questionMark('!', '#ffd75e'),
    markTurn: questionMark('?', '#8fd18f'),
    markTalk: questionMark('…', '#cfe3ff'),
  };
  return cache;
}
