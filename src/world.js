// Świat gry: teren, królestwo, zamek, rynek, las, góry, jaskinia, niebo, dzień/noc.
import * as THREE from 'three';
import { WORLD_SIZE, WORLD_HALF, KINGDOM_HALF, MOAT_IN, MOAT_OUT, WATER_Y, BRIDGE_HALF, LOC, DAY_LENGTH } from './config.js';

export function rand(a, b) { return a + Math.random() * (b - a); }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function smoothstep(a, b, v) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) {
  return vnoise(x, z) * 0.6 + vnoise(x * 2.3 + 5, z * 2.3 + 9) * 0.28 + vnoise(x * 5.1 + 13, z * 5.1 + 3) * 0.12;
}
const dist = (x1, z1, x2, z2) => Math.hypot(x2 - x1, z2 - z1);
const sqDist = (x, z) => Math.max(Math.abs(x), Math.abs(z));

// ---------- WYSOKOŚĆ TERENU ----------
function rawHeight(x, z) {
  const sq = sqDist(x, z);
  if (sq < MOAT_IN - 2) return 0;
  let h = (fbm(x * 0.012, z * 0.012) - 0.5) * 7 + (fbm(x * 0.05 + 9, z * 0.05) - 0.5) * 1.2;
  h *= smoothstep(MOAT_OUT, MOAT_OUT + 45, sq); // łagodne przejście spod murów
  h += 0.4;
  // Góry na północy
  if (z < -110) {
    const mh = clamp((-110 - z) / 150, 0, 1);
    const ridge = 1 - Math.abs(fbm(x * 0.03, z * 0.03) * 2 - 1);
    h += mh * mh * 58 + ridge * mh * 10;
  }
  // Wzniesienia na krawędziach mapy
  h += smoothstep(235, 310, Math.abs(x)) * 16;
  h += smoothstep(245, 310, z) * 10;
  return h;
}

function distRoad(x, z) {
  let d = 1e9;
  d = Math.min(d, Math.abs(x) * (z > 100 && z < 318 ? 1 : 1e9));           // południowa
  d = Math.min(d, Math.abs(z - 160) * (Math.abs(x) < 235 ? 1 : 1e9));      // wschód-zachód
  d = Math.min(d, Math.abs(x - 40) * (z < 162 && z > -262 ? 1 : 1e9));     // do gór i areny
  d = Math.min(d, Math.abs(x + 168) * (z > 55 && z < 165 ? 1 : 1e9));      // do jaskini
  d = Math.min(d, Math.abs(x - 190) * (z > 35 && z < 165 ? 1 : 1e9));      // do lasu
  d = Math.min(d, Math.abs(x - 140) * (z > 160 && z < 250 ? 1 : 1e9));     // do ruin
  return d;
}

// Odcinki ścieżek 3D (wypełnia buildPaths) — odstraszają roślinność
let PATH_SEGS = [];
function distPath(x, z) {
  let best = 1e9;
  for (const [x1, z1, x2, z2] of PATH_SEGS) {
    const dx = x2 - x1, dz = z2 - z1;
    const len2 = dx * dx + dz * dz;
    let t = len2 > 0 ? ((x - x1) * dx + (z - z1) * dz) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const ddx = x - (x1 + dx * t), ddz = z - (z1 + dz * t);
    const d = Math.sqrt(ddx * ddx + ddz * ddz);
    if (d < best) best = d;
  }
  return best;
}

let campH = null;
let arenaH = null;
export function groundHeight(x, z) {
  const sq = sqDist(x, z);
  let h;
  if (sq < MOAT_IN - 2) h = 0;
  else h = rawHeight(x, z);
  // Polany / wyrównania
  const dCave = dist(x, z, LOC.caveCenter.x, LOC.caveCenter.z);
  if (dCave < 40) h = h * (1 - smoothstep(40, 26, dCave)) + 1.5 * smoothstep(40, 26, dCave);
  const dCamp = dist(x, z, LOC.goblinCamp.x, LOC.goblinCamp.z);
  if (dCamp < 34) {
    if (campH === null) campH = rawHeight(LOC.goblinCamp.x, LOC.goblinCamp.z);
    h = h * (1 - smoothstep(34, 16, dCamp)) + campH * smoothstep(34, 16, dCamp);
  }
  // Arena na szczycie (Mroczny Rycerz)
  const dArena = dist(x, z, LOC.arena.x, LOC.arena.z);
  if (dArena < 30) {
    if (arenaH === null) arenaH = rawHeight(LOC.arena.x, LOC.arena.z);
    h = h * (1 - smoothstep(30, 18, dArena)) + arenaH * smoothstep(30, 18, dArena);
  }
  // Ruiny — wyrównanie polany
  const dRuins = dist(x, z, LOC.ruins.x, LOC.ruins.z);
  if (dRuins < 30) h = h * (1 - smoothstep(30, 16, dRuins)) + 0.6 * smoothstep(30, 16, dRuins);
  const dFarm = dist(x, z, LOC.farm.x, LOC.farm.z);
  if (dFarm < 34) h = h * (1 - smoothstep(34, 18, dFarm)) + 0.5 * smoothstep(34, 18, dFarm);
  const dMill = dist(x, z, LOC.windmill.x, LOC.windmill.z);
  if (dMill < 20) h = h * (1 - smoothstep(20, 10, dMill)) + 0.6 * smoothstep(20, 10, dMill);
  // Staw w lesie
  const dPond = dist(x, z, LOC.forestPond.x, LOC.forestPond.z);
  if (dPond < 24) h -= smoothstep(24, 8, dPond) * 2.6;
  // Drogi
  const dr = distRoad(x, z);
  if (dr < 10 && sq > MOAT_OUT) {
    let target = 0.4;
    if (z < 0 && Math.abs(x - 40) < 10) { // ścieżka w góry wspina się
      const mh = clamp((-110 - z) / 150, 0, 1);
      target = mh * mh * 52 + 0.5;
    }
    h = h * (1 - smoothstep(10, 4, dr) * 0.92) + target * smoothstep(10, 4, dr) * 0.92;
  }
  // Fosa — wycięcie na końcu
  if (sq > MOAT_IN - 2 && sq < MOAT_OUT + 2) {
    const f = smoothstep(MOAT_IN - 2, MOAT_IN + 5, sq) * (1 - smoothstep(MOAT_OUT - 5, MOAT_OUT + 2, sq));
    h = h * (1 - f) + (-2.6) * f;
  }
  return h;
}

// ---------- SYSTEM CZĄSTECZEK ----------
class Emitter {
  constructor(scene, tex, count, opts = {}) {
    this.count = count;
    this.gravity = opts.gravity ?? -2;
    this.drag = opts.drag ?? 0;
    this.spawner = opts.spawner;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    for (let i = 0; i < count; i++) { this.spawner(this, i, true); this.life[i] = Math.random() * this.maxLife[i]; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({
      map: tex, size: opts.size ?? 0.5, transparent: true, opacity: opts.opacity ?? 0.9,
      depthWrite: false, blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      color: opts.color ?? 0xffffff, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.active = true;
  }
  update(dt) {
    if (!this.active) return;
    for (let i = 0; i < this.count; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.spawner(this, i, false); continue; }
      const j = i * 3;
      this.vel[j + 1] += this.gravity * dt;
      if (this.drag) {
        const d = 1 - this.drag * dt;
        this.vel[j] *= d; this.vel[j + 1] *= d; this.vel[j + 2] *= d;
      }
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
  setCount(n) {
    n = Math.min(this.count, Math.max(8, n | 0));
    this.points.geometry.setDrawRange(0, n);
  }
}

// =================================================================
export class World {
  constructor(scene, T, quality) {
    this.scene = scene;
    this.T = T;
    this.rects = [];    // {x1,z1,x2,z2}
    this.circles = [];  // {x,z,r}
    this.pickups = [];  // {kind,mesh,pos,taken,respawn,id}
    this.flames = [];   // {sprite, base}
    this.flags = [];    // {mesh, base}
    this.windowMats = [];
    this.smokeStacks = [];
    this.windmillBlades = null;
    this.nightF = 0;
    this.dayT = 0.32;   // poranek
    this.time = 0;
    this.birds = [];
    this.clouds = [];
    this.emitters = [];
    this.lights = {};
    this.qualityName = quality;
    this.particleF = 1;
    this._matCache = new Map();
    this._geoCache = new Map();
    this.uTime = { value: 0 }; // wspólny czas dla shaderów (wiatr)
    this.weather = { mode: 'clear', t: 0, next: 90 + Math.random() * 120, flash: 0 };

    this.buildLights();
    this.buildSky();
    this.buildTerrain();
    this.buildWater();
    this.buildWallsAndGate();
    this.buildCastle();
    this.buildMarket();
    this.buildTavern();
    this.buildHouses();
    this.buildFarmAndMill();
    this.buildMountains();
    this.buildForest();
    this.buildCave();
    this.buildRuins();
    this.buildArena();
    this.buildPaths();
    this.buildVegetation();
    this.buildParticles();
    this.buildPickups();
    this.applyQuality(quality);
  }

  rect(cx, cz, w, d) { this.rects.push({ x1: cx - w / 2, z1: cz - d / 2, x2: cx + w / 2, z2: cz + d / 2 }); }
  circ(x, z, r) { this.circles.push({ x, z, r }); }

  // Cache'owane materiały i geometrie — mniej pamięci GPU, szybsze ładowanie
  M(color, opts = {}) {
    const key = 'm' + color + '|' + (opts.metalness ?? 0.02) + '|' + (opts.roughness ?? 0.9) + '|' +
      (opts.emissive || 0) + '|' + (opts.emissiveIntensity || 0) + '|' + (opts.transparent ? 1 : 0) + '|' + (opts.opacity ?? 1);
    let m = this._matCache.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.02, ...opts });
      this._matCache.set(key, m);
    }
    return m;
  }
  TM(map, rx, ry, opts = {}) {
    const key = 't' + map.uuid + '|' + rx + '|' + ry + '|' + (opts.metalness ?? 0.02) + '|' + (opts.roughness ?? 0.9);
    let m = this._matCache.get(key);
    if (!m) {
      const t = map.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
      m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, metalness: 0.02, ...opts });
      this._matCache.set(key, m);
    }
    return m;
  }
  _boxGeo(w, h, d) {
    const key = `b${w},${h},${d}`;
    let g = this._geoCache.get(key);
    if (!g) { g = new THREE.BoxGeometry(w, h, d); this._geoCache.set(key, g); }
    return g;
  }
  _cylGeo(rt, rb, h, seg) {
    const key = `c${rt},${rb},${h},${seg}`;
    let g = this._geoCache.get(key);
    if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg); this._geoCache.set(key, g); }
    return g;
  }
  box(w, h, d, material, x = 0, y = 0, z = 0, shadow = true) {
    const m = new THREE.Mesh(this._boxGeo(w, h, d), material);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true;
    return m;
  }
  cyl(rt, rb, h, material, x = 0, y = 0, z = 0, seg = 12) {
    const m = new THREE.Mesh(this._cylGeo(rt, rb, h, seg), material);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  // Wstrzykuje kołysanie na wietrze do materiału instancjonowanego
  windify(material, amp, key) {
    const uTime = this.uTime;
    material.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 iwpos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float swayPh = uTime * 2.1 + iwpos.x * 0.35 + iwpos.z * 0.45;
          float swayK = smoothstep(-0.5, 1.2, position.y) * ${amp.toFixed(3)};
          transformed.x += (sin(swayPh) + sin(swayPh * 2.3) * 0.35) * swayK;
          transformed.z += cos(swayPh * 0.8) * swayK * 0.6;
        #endif`
      );
    };
    material.customProgramCacheKey = () => 'wind_' + key;
    return material;
  }

  glowSprite(tex, color, scale, opacity = 0.9) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color, transparent: true, opacity, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    s.scale.setScalar(scale);
    return s;
  }

  // ---------- ŚWIATŁA I NIEBO ----------
  buildLights() {
    this.sun = new THREE.DirectionalLight(0xffffff, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -95; this.sun.shadow.camera.right = 95;
    this.sun.shadow.camera.top = 95; this.sun.shadow.camera.bottom = -95;
    this.sun.shadow.camera.near = 10; this.sun.shadow.camera.far = 500;
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbdd7ff, 0x4a5a3a, 0.9);
    this.scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0xffffff, 0.12);
    this.scene.add(this.amb);
  }

  point(color, intensity, dist, x, y, z) {
    const l = new THREE.PointLight(color, intensity, dist, 1.8);
    l.position.set(x, y, z);
    this.scene.add(l);
    return l;
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(900, 24, 16);
    this.skyU = {
      top: { value: new THREE.Color(0x3a6fb5) },
      mid: { value: new THREE.Color(0x9dc3e8) },
      bot: { value: new THREE.Color(0xdfe9f2) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunCol: { value: new THREE.Color(0xfff2cc) },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform vec3 top,mid,bot,sunDir,sunCol;
        void main(){
          float h = clamp(vP.y, -0.1, 1.0);
          vec3 c = h > 0.45 ? mix(mid, top, (h-0.45)/0.55) : mix(bot, mid, max(h,0.0)/0.45);
          float s = pow(max(dot(normalize(vP), normalize(sunDir)), 0.0), 220.0);
          float halo = pow(max(dot(normalize(vP), normalize(sunDir)), 0.0), 8.0);
          c += sunCol * (s*1.2 + halo*0.18);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(geo, m);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog(0xc8d8e8, 60, 620);

    // Gwiazdy
    const n = 500, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.45 + 0.08;
      p[i * 3] = Math.cos(a) * Math.cos(e) * 850;
      p[i * 3 + 1] = Math.sin(e) * 850;
      p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 850;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(g, this.starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // Księżyc i słońce (sprite'y)
    this.sunSpr = this.glowSprite(this.T.soft, 0xfff3c0, 120, 0.95);
    this.moonSpr = this.glowSprite(this.T.soft, 0xd8e6ff, 60, 0.0);
    this.scene.add(this.sunSpr, this.moonSpr);

    // Chmury
    const cloudTex = this.T.soft;
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0xffffff, transparent: true, opacity: rand(0.35, 0.6), depthWrite: false, fog: false }));
      c.position.set(rand(-500, 500), rand(120, 200), rand(-500, 500));
      c.scale.set(rand(120, 260), rand(30, 60), 1);
      this.scene.add(c);
      this.clouds.push({ s: c, v: rand(1, 3) });
    }
    // Ptaki
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.T.soft, color: 0x1a1a22, transparent: true, opacity: 0.8, depthWrite: false }));
      b.scale.set(2.2, 0.9, 1);
      this.scene.add(b);
      this.birds.push({ s: b, r: rand(40, 120), h: rand(35, 70), sp: rand(0.1, 0.3) * (Math.random() < 0.5 ? 1 : -1), ph: rand(0, 9), cx: rand(-60, 60), cz: rand(-60, 60) });
    }
  }

  // ---------- TEREN ----------
  buildTerrain() {
    const seg = 190;
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cGrass1 = new THREE.Color(0x5d7a35), cGrass2 = new THREE.Color(0x4a6530);
    const cDirt = new THREE.Color(0x6b5232), cRock = new THREE.Color(0x6e6e78);
    const cSnow = new THREE.Color(0xe8eef4), cSand = new THREE.Color(0xb09a68);
    const cCobble = new THREE.Color(0x7a7a84), cForest = new THREE.Color(0x2e5230);
    const cCave = new THREE.Color(0x565660), cMagic = new THREE.Color(0x2a6b6b);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = groundHeight(x, z);
      pos.setY(i, h);
      const n = fbm(x * 0.05, z * 0.05);
      tmp.copy(cGrass1).lerp(cGrass2, n);
      const sq = sqDist(x, z);
      // Rynek — bruk
      const dPlaza = dist(x, z, 0, 5);
      if (dPlaza < 30) tmp.lerp(cCobble, smoothstep(30, 22, dPlaza) * 0.9);
      // Uliczki w królestwie
      if (sq < KINGDOM_HALF) {
        const street = Math.min(Math.abs(x) < 5 ? 1 : 0, 1);
        if (Math.abs(x) < 5 || Math.abs(z - 5) < 5) tmp.lerp(cDirt, 0.55);
        if (z < -34 && z > -66 && Math.abs(x) < 28) tmp.lerp(cCobble, 0.5); // dziedziniec zamku
      }
      // Drogi
      const dr = distRoad(x, z);
      if (dr < 6 && sq > MOAT_OUT) tmp.lerp(cDirt, smoothstep(6, 3, dr) * 0.85);
      // Fosa — piach/muł
      if (sq > MOAT_IN - 3 && sq < MOAT_OUT + 3) tmp.lerp(cSand, 0.7);
      // Las
      const dF = dist(x, z, LOC.forest.x, LOC.forest.z);
      if (dF < 100) {
        tmp.lerp(cForest, smoothstep(100, 50, dF) * 0.8);
        tmp.lerp(cMagic, smoothstep(60, 20, dF) * 0.35);
      }
      // Skały i śnieg (wysokość)
      if (h > 10) tmp.lerp(cRock, smoothstep(10, 26, h));
      if (h > 34) tmp.lerp(cSnow, smoothstep(34, 48, h));
      // Jaskinia
      const dC = dist(x, z, LOC.caveCenter.x, LOC.caveCenter.z);
      if (dC < 30) tmp.lerp(cCave, smoothstep(30, 22, dC) * 0.9);
      // Farma — pole
      if (Math.abs(x - LOC.farm.x) < 26 && Math.abs(z - LOC.farm.z - 24) < 14) tmp.lerp(cDirt, 0.8);
      // Brzegi stawu
      const dP = dist(x, z, LOC.forestPond.x, LOC.forestPond.z);
      if (dP < 24) tmp.lerp(cSand, smoothstep(24, 16, dP) * 0.6);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const grassTex = this.T.grass.clone(); grassTex.needsUpdate = true; grassTex.repeat.set(130, 130);
    const m = new THREE.MeshStandardMaterial({ map: grassTex, vertexColors: true, roughness: 1 });
    this.terrain = new THREE.Mesh(geo, m);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  buildWater() {
    const wtex = this.T.water.clone(); wtex.needsUpdate = true; wtex.repeat.set(40, 40);
    this.waterMat = new THREE.MeshStandardMaterial({
      map: wtex, color: 0x9fd4e8, transparent: true, opacity: 0.82,
      roughness: 0.15, metalness: 0.55,
    });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE), this.waterMat);
    w.rotation.x = -Math.PI / 2;
    w.position.y = WATER_Y;
    w.receiveShadow = true;
    this.scene.add(w);
    // Druga warstwa — sunące błyski tafli
    const spTex = this.T.water.clone(); spTex.needsUpdate = true; spTex.repeat.set(23, 23);
    this.sparkMat = new THREE.MeshBasicMaterial({
      map: spTex, color: 0xcfeaff, transparent: true, opacity: 0.18,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE), this.sparkMat);
    sp.rotation.x = -Math.PI / 2;
    sp.position.y = WATER_Y + 0.07;
    this.scene.add(sp);
    // Trzciny wokół stawu
    const reedM = this.M(0x4a6b2a);
    const cattM = this.M(0x5a3a1e);
    this.reeds = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + Math.random() * 0.2;
      const r = 17 + Math.random() * 5;
      const rx = LOC.forestPond.x + Math.cos(a) * r, rz = LOC.forestPond.z + Math.sin(a) * r;
      const ry = Math.max(groundHeight(rx, rz), WATER_Y - 0.2);
      const hgt = 1.2 + Math.random() * 0.9;
      const reed = this.cyl(0.03, 0.045, hgt, reedM, rx, ry + hgt / 2, rz, 5);
      this.scene.add(reed);
      if (Math.random() < 0.6) {
        this.scene.add(this.cyl(0.07, 0.07, 0.35, cattM, rx, ry + hgt - 0.2, rz, 6));
      }
      this.reeds.push({ m: reed, ph: Math.random() * 9 });
    }
    // Magiczna poświata stawu
    const glow = new THREE.Mesh(new THREE.CircleGeometry(15, 24),
      new THREE.MeshBasicMaterial({ color: 0x44ddff, transparent: true, opacity: 0.25, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(LOC.forestPond.x, WATER_Y + 0.15, LOC.forestPond.z);
    this.scene.add(glow);
    this.pondGlow = glow;
  }

  // ---------- MURY, BRAMA, FORT, MOST ----------
  buildWallsAndGate() {
    const wallM = this.TM(this.T.stoneWall, 30, 2);
    const trimM = this.TM(this.T.stoneWall, 8, 1);
    const K = KINGDOM_HALF, H = 9, T = 3;
    const mkWall = (cx, cz, w, d) => {
      const m = this.box(w, H, d, wallM, cx, H / 2, cz);
      this.scene.add(m);
      // blanki
      const n = Math.floor(Math.max(w, d) / 2.2);
      for (let i = 0; i <= n; i++) {
        const t = n === 0 ? 0 : i / n - 0.5;
        const bx = w > d ? cx + t * w : cx, bz = w > d ? cz : cz + t * d;
        this.scene.add(this.box(1.1, 0.9, 1.1, trimM, bx, H + 0.45, bz));
      }
      // daszek chodnika
      this.scene.add(this.box(w > d ? w : T + 1.2, 0.5, w > d ? T + 1.2 : d, trimM, cx, H - 0.2, cz));
    };
    // Mury z przerwą na bramę (południe)
    mkWall(0, -K, K * 2 + T, T);
    mkWall(-K, 0, T, K * 2 + T);
    mkWall(K, 0, T, K * 2 + T);
    mkWall(-(K / 2 + 2.5), K, K - 5, T);
    mkWall(K / 2 + 2.5, K, K - 5, T);
    this.rect(0, -K, K * 2 + 4, T + 1);
    this.rect(-K, 0, T + 1, K * 2 + 4);
    this.rect(K, 0, T + 1, K * 2 + 4);
    this.rect(-(K / 2 + 2.5), K, K - 5, T + 1);
    this.rect(K / 2 + 2.5, K, K - 5, T + 1);
    // Wieże narożne
    for (const [tx, tz] of [[-K, -K], [K, -K], [-K, K], [K, K]]) {
      const tw = this.cyl(4.2, 4.8, 15, this.TM(this.T.stoneWall, 6, 3), tx, 7.5, tz, 10);
      this.scene.add(tw);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 5, 10), this.TM(this.T.roof, 4, 2));
      roof.position.set(tx, 17.5, tz); roof.castShadow = true;
      this.scene.add(roof);
      this.scene.add(this.box(1.6, 1, 8.6, trimM, tx, 15.4, tz)); // blanki krzyż
      this.circ(tx, tz, 5.4);
    }
    // FORT przy bramie: dwie wieże + mur z łukiem
    for (const sx of [-1, 1]) {
      const tx = sx * 8.5;
      this.scene.add(this.cyl(3.4, 3.9, 17, this.TM(this.T.stoneWall, 5, 3), tx, 8.5, K, 10));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 4.5, 10), this.TM(this.T.roof, 3, 2));
      roof.position.set(tx, 19.2, K); roof.castShadow = true;
      this.scene.add(roof);
      this.circ(tx, K, 4.2);
      // pochodnie na wieżach
      this.addTorch(tx, 12, K + 3.6);
    }
    // Łuk nad bramą
    this.scene.add(this.box(22, 3.5, 4.5, wallM, 0, 10.5, K));
    this.scene.add(this.box(22, 1.2, 5, trimM, 0, 12.8, K));
    for (let i = 0; i < 9; i++) this.scene.add(this.box(1.1, 0.9, 1.1, trimM, -9 + i * 2.25, 13.8, K));
    // Krata (otwarta do połowy)
    const bars = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 4),
      new THREE.MeshStandardMaterial({ map: this.T.ironBars, transparent: true, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.7 }));
    bars.position.set(0, 6.4, K);
    this.scene.add(bars);
    // Sztandar nad bramą
    this.addFlag(0, 9, K + 2.4, 3, 2, this.T.banner);
    this.addTorch(-5.5, 4, K + 2.4);
    this.addTorch(5.5, 4, K + 2.4);
    // MOST przez fosę
    const woodM = this.TM(this.T.wood, 3, 10);
    const bridge = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const z = 79 + i * 2;
      const y = 0.35 + Math.sin((i / 15) * Math.PI) * 0.55;
      const plank = this.box(8.6, 0.25, 1.9, woodM, 0, y, z);
      bridge.add(plank);
    }
    for (const sx of [-1, 1]) {
      for (let i = 0; i <= 8; i++) {
        const z = 79 + i * 4;
        const y = 0.35 + Math.sin(((i * 4) / 32) * Math.PI) * 0.55;
        bridge.add(this.box(0.3, 1.3, 0.3, this.TM(this.T.woodDark, 1, 1), sx * 4.1, y + 0.6, z));
      }
      const rail = this.box(0.25, 0.25, 34, this.TM(this.T.woodDark, 1, 4), sx * 4.1, 2.1, 95);
      bridge.add(rail);
    }
    // pale w wodzie
    for (const sx of [-1, 1]) for (const z of [86, 95, 104]) {
      bridge.add(this.cyl(0.35, 0.4, 4, this.TM(this.T.woodDark, 1, 1), sx * 3.6, -1, z, 8));
    }
    this.scene.add(bridge);
    this.addTorch(-4.4, 2.6, 79.5, true);
    this.addTorch(4.4, 2.6, 79.5, true);
    this.addTorch(-4.4, 2.2, 110.5, true);
    this.addTorch(4.4, 2.2, 110.5, true);
  }

  addTorch(x, y, z, post = false, flameColor = 0xffffff, haloColor = 0xffaa44) {
    const g = new THREE.Group();
    if (post) {
      const p = this.cyl(0.09, 0.11, y, this.TM(this.T.woodDark, 1, 1), 0, -y / 2 + 0.1, 0, 8);
      g.add(p);
    } else {
      const h = this.cyl(0.07, 0.09, 0.9, this.TM(this.T.woodDark, 1, 1), 0, -0.35, 0, 8);
      h.rotation.x = 0.25;
      g.add(h);
    }
    const cup = this.cyl(0.16, 0.1, 0.25, this.M(0x2a2a2e, { metalness: 0.5 }), 0, 0.1, 0, 8);
    g.add(cup);
    const flame = this.glowSprite(this.T.flame, flameColor, 1.1, 0.95);
    flame.position.y = 0.55;
    g.add(flame);
    const halo = this.glowSprite(this.T.softWarm, haloColor, 3.2, 0.35);
    halo.position.y = 0.6;
    g.add(halo);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.flames.push({ sprite: flame, halo, base: 1.1, ph: Math.random() * 9 });
    return g;
  }

  addFlag(x, y, z, w, h, texture) {
    const geo = new THREE.PlaneGeometry(w, h, 8, 4);
    geo.translate(w / 2, 0, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.9 }));
    m.position.set(x, y, z);
    m.castShadow = true;
    this.scene.add(m);
    const pole = this.cyl(0.08, 0.08, h + 1.4, this.TM(this.T.woodDark, 1, 1), x, y + 0.4, z, 8);
    this.scene.add(pole);
    this.flags.push({ mesh: m, base: geo.attributes.position.array.slice(), w });
    return m;
  }

  windowMat() {
    if (!this.winMat) {
      this.winMat = new THREE.MeshStandardMaterial({ color: 0x3a3a2a, emissive: 0xffb84d, emissiveIntensity: 0.15, roughness: 0.4 });
      this.windowMats.push(this.winMat);
    }
    return this.winMat;
  }

  // ---------- ZAMEK ----------
  buildCastle() {
    const stone = this.TM(this.T.stoneWall, 10, 3);
    const marble = this.TM(this.T.marble, 6, 6);
    // Dziedziniec
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(62, 34), this.TM(this.T.cobble, 14, 8));
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(-6, 0.06, -50);
    yard.receiveShadow = true;
    this.scene.add(yard);
    // Sala główna: x[-12,12], z[-64,-40], ściany wys. 7
    const H = 7, T = 1.2;
    const mkWall = (cx, cz, w, d, h = H) => this.scene.add(this.box(w, h, d, stone, cx, h / 2 + 0.35, cz));
    mkWall(0, -64, 25.2, T);                    // północna
    mkWall(-12, -52, T, 25.2);                  // zachodnia
    mkWall(12, -52, T, 25.2);                   // wschodnia
    mkWall(-7.25, -40, 10.5, T); mkWall(7.25, -40, 10.5, T); // południowa z drzwiami
    this.rect(0, -64, 26, T + 0.6); this.rect(-12, -52, T + 0.6, 26); this.rect(12, -52, T + 0.6, 26);
    this.rect(-7.25, -40, 10.5, T + 0.6); this.rect(7.25, -40, 10.5, T + 0.6);
    // Podłoga + dywan
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), marble);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.42, -52);
    floor.receiveShadow = true;
    this.scene.add(floor);
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(4, 20), this.TM(this.T.clothRed, 1, 5));
    carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.45, -50);
    carpet.receiveShadow = true;
    this.scene.add(carpet);
    // Dach: otwarty? Sala musi mieć dach ale światło... dajemy wysoki dach z otworami okiennymi
    const roofM = this.TM(this.T.roof, 8, 6);
    const roofL = this.box(15, 0.5, 27, roofM, -6.4, 9.6, -52); roofL.rotation.z = 0.5;
    const roofR = this.box(15, 0.5, 27, roofM, 6.4, 9.6, -52); roofR.rotation.z = -0.5;
    this.scene.add(roofL, roofR);
    this.scene.add(this.box(25.5, 1.2, 25.5, stone, 0, 7.6, -52)); // gzyms
    // Kolumny
    for (const sx of [-1, 1]) for (const zz of [-58, -52, -46]) {
      this.scene.add(this.cyl(0.55, 0.65, 6.6, marble, sx * 8.5, 3.7, zz, 10));
      this.scene.add(this.box(1.5, 0.4, 1.5, marble, sx * 8.5, 6.9, zz));
      this.circ(sx * 8.5, zz, 0.9);
    }
    // TRON
    const gold = this.M(0xd8a83c, { metalness: 0.8, roughness: 0.35 });
    const throne = new THREE.Group();
    throne.add(this.box(3.6, 0.5, 2.6, marble, 0, 0.25, 0));
    throne.add(this.box(2.2, 0.5, 1.4, gold, 0, 0.75, 0));
    throne.add(this.box(2.2, 2.6, 0.4, gold, 0, 2, -0.7));
    throne.add(this.box(0.3, 1.2, 1.2, gold, -1.1, 1.3, 0));
    throne.add(this.box(0.3, 1.2, 1.2, gold, 1.1, 1.3, 0));
    const cushion = this.box(1.8, 0.25, 1.1, this.M(0x8f1f1f, { roughness: 1 }), 0, 1.05, 0.05);
    throne.add(cushion);
    throne.position.set(0, 0.42, -60.5);
    this.scene.add(throne);
    this.circ(0, -60.5, 2.2);
    // Żyrandol + światło
    const chand = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 8, 20), gold);
    ring.rotation.x = Math.PI / 2; chand.add(ring);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      chand.add(this.box(0.12, 0.5, 0.12, this.M(0xf0e8d0), Math.cos(a) * 1.4, 0.3, Math.sin(a) * 1.4));
      const f = this.glowSprite(this.T.flame, 0xffffff, 0.55, 0.9);
      f.position.set(Math.cos(a) * 1.4, 0.7, Math.sin(a) * 1.4);
      chand.add(f);
      this.flames.push({ sprite: f, base: 0.55, ph: Math.random() * 9 });
    }
    chand.add(this.cyl(0.05, 0.05, 2.5, gold, 0, 1.5, 0, 6));
    chand.position.set(0, 5.2, -52);
    this.scene.add(chand);
    this.lights.castle = this.point(0xffc873, 30, 30, 0, 5, -52);
    // Sztandary wewnątrz
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 4), new THREE.MeshStandardMaterial({ map: this.T.banner, side: THREE.DoubleSide }));
      b.position.set(sx * 11.2, 4.5, -52);
      b.rotation.y = -sx * Math.PI / 2;
      this.scene.add(b);
    }
    // Okna (świecące w nocy)
    for (const sx of [-1, 1]) for (const zz of [-58, -52, -46]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2), this.windowMat());
      w.position.set(sx * 12.65, 4.5, zz);
      w.rotation.y = sx * Math.PI / 2;
      this.scene.add(w);
    }
    // Drzwi wejściowe (otwarte skrzydła)
    const doorM = this.TM(this.T.woodDark, 1, 2);
    for (const sx of [-1, 1]) {
      const d = this.box(0.25, 5, 2.2, doorM, sx * 2.6, 2.9, -39.4);
      d.rotation.y = sx * 1.15;
      this.scene.add(d);
    }
    // Wieże zamkowe
    for (const [tx, tz] of [[-14, -64], [14, -64], [-14, -40], [14, -40]]) {
      this.scene.add(this.cyl(2.6, 3, 14, stone, tx, 7, tz, 10));
      const r = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4, 10), this.TM(this.T.roof, 3, 2));
      r.position.set(tx, 16, tz); r.castShadow = true;
      this.scene.add(r);
      this.circ(tx, tz, 3.2);
    }
    this.addFlag(0, 12.5, -64, 3.4, 2.2, this.T.banner);
    this.addTorch(-3.2, 4.4, -39.2);
    this.addTorch(3.2, 4.4, -39.2);

    // KOMNATA RYCERZA: x[-25,-13], z[-60,-46]
    const W2 = 12, D2 = 14;
    const cx2 = -19, cz2 = -53;
    const mkW2 = (cx, cz, w, d) => this.scene.add(this.box(w, 5.5, d, stone, cx, 3.1, cz));
    mkW2(cx2, -60, W2 + 1.2, T);
    mkW2(-25, cz2, T, D2 + 1.2);
    mkW2(-13, cz2, T, D2 + 1.2);
    mkW2(-22.75, -46, 4.5, T); mkW2(-15.25, -46, 4.5, T); // drzwi
    this.rect(cx2, -60, W2 + 2, T + 0.6); this.rect(-25, cz2, T + 0.6, D2 + 2);
    this.rect(-13, cz2, T + 0.6, D2 + 2);
    this.rect(-22.75, -46, 4.5, T + 0.6); this.rect(-15.25, -46, 4.5, T + 0.6);
    const fl2 = new THREE.Mesh(new THREE.PlaneGeometry(W2, D2), this.TM(this.T.wood, 4, 5));
    fl2.rotation.x = -Math.PI / 2; fl2.position.set(cx2, 0.42, cz2);
    fl2.receiveShadow = true;
    this.scene.add(fl2);
    const rr1 = this.box(8, 0.4, 16, this.TM(this.T.roof, 4, 5), cx2 - 3, 7.4, cz2); rr1.rotation.z = 0.55;
    const rr2 = this.box(8, 0.4, 16, this.TM(this.T.roof, 4, 5), cx2 + 3, 7.4, cz2); rr2.rotation.z = -0.55;
    this.scene.add(rr1, rr2);
    // Łóżko
    const bed = new THREE.Group();
    bed.add(this.box(2.4, 0.4, 3.4, doorM, 0, 0.35, 0));
    for (const [px, pz] of [[-1, -1.5], [1, -1.5], [-1, 1.5], [1, 1.5]])
      bed.add(this.box(0.25, 1.1, 0.25, doorM, px, 0.55, pz));
    bed.add(this.box(2.2, 0.35, 3.1, this.M(0xe8e0d0), 0, 0.7, 0));
    bed.add(this.box(2.25, 0.3, 1.8, this.M(0x2a4a8f), 0, 0.85, 0.6));
    bed.add(this.box(1.6, 0.25, 0.7, this.M(0xf4f0e4), 0, 0.9, -1.1));
    bed.add(this.box(2.4, 1.6, 0.2, doorM, 0, 1.2, -1.7));
    bed.position.set(-22, 0.42, -56);
    this.scene.add(bed);
    this.rect(-22, -56, 2.8, 3.8);
    // Skrzynia
    this.bedChest = this.addChest(-14.8, 0.42, -58.5, 0.4);
    // Stół + świeca + krzesło
    this.scene.add(this.cyl(0.9, 0.9, 0.15, doorM, -16, 1.2, -50, 12));
    this.scene.add(this.cyl(0.12, 0.2, 1, doorM, -16, 0.7, -50, 8));
    this.scene.add(this.box(0.5, 0.9, 0.5, doorM, -16, 0.85, -48.2));
    const candle = this.glowSprite(this.T.flame, 0xffffff, 0.5, 0.9);
    candle.position.set(-16, 1.7, -50);
    this.scene.add(candle);
    this.flames.push({ sprite: candle, base: 0.5, ph: 1 });
    // Stojak na broń
    this.scene.add(this.box(1.6, 0.15, 0.4, doorM, -24, 1.6, -48.5));
    for (let i = 0; i < 3; i++) {
      const sw = this.box(0.08, 1.4, 0.08, this.M(0xb8bec8, { metalness: 0.8, roughness: 0.3 }), -24.5 + i * 0.5, 2.2, -48.5);
      sw.rotation.z = 0.15;
      this.scene.add(sw);
    }
    // Ogród zamkowy + ławki
    for (const [fx, fz] of [[-4, -34], [8, -34]]) {
      const fb = this.box(4, 0.6, 2, stone, fx, 0.3, fz);
      this.scene.add(fb);
      this.circ(fx, fz, 2.2);
    }
    this.addTorch(-20.5, 3.6, -45.2);
    this.addTorch(-17.5, 3.6, -45.2);
  }

  addChest(x, y, z, rotY = 0) {
    const g = new THREE.Group();
    const wood = this.TM(this.T.woodDark, 2, 1);
    g.add(this.box(1.4, 0.7, 0.9, wood, 0, 0.35, 0));
    const lid = this.cyl(0.45, 0.45, 1.4, wood, 0, 0.7, 0, 10);
    lid.rotation.z = Math.PI / 2;
    lid.scale.set(1, 1, 0.64);
    g.add(lid);
    g.add(this.box(0.2, 0.75, 0.95, this.M(0xd8a83c, { metalness: 0.7, roughness: 0.4 }), 0, 0.35, 0));
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    this.scene.add(g);
    this.circ(x, z, 1);
    return g;
  }

  // ---------- RYNEK ----------
  buildMarket() {
    // FONTANNA
    const stone = this.TM(this.T.marble, 4, 1);
    const f = new THREE.Group();
    f.add(this.cyl(3.4, 3.6, 1, stone, 0, 0.5, 0, 16));
    f.add(this.cyl(3.1, 3.1, 0.3, this.TM(this.T.marble, 3, 1), 0, 1.05, 0, 16));
    f.add(this.cyl(0.4, 0.55, 2.6, stone, 0, 1.6, 0, 10));
    f.add(this.cyl(1.5, 1.1, 0.4, stone, 0, 2.8, 0, 12));
    f.add(this.cyl(0.2, 0.25, 1, stone, 0, 3.4, 0, 8));
    const statue = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), this.M(0xd8a83c, { metalness: 0.8, roughness: 0.3 }));
    statue.position.y = 4.2; statue.castShadow = true;
    f.add(statue);
    this.fountainTop = statue;
    const wtex = this.T.water.clone(); wtex.needsUpdate = true; wtex.repeat.set(2, 2);
    const wdisc = new THREE.Mesh(new THREE.CircleGeometry(3, 20),
      new THREE.MeshStandardMaterial({ map: wtex, color: 0xbfe8ff, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.4 }));
    wdisc.rotation.x = -Math.PI / 2; wdisc.position.y = 1.0;
    f.add(wdisc);
    this.fountainWater = wdisc;
    f.position.set(LOC.fountain.x, 0, LOC.fountain.z);
    this.scene.add(f);
    this.circ(LOC.fountain.x, LOC.fountain.z, 3.9);
    this.lights.fountain = this.point(0x66bbff, 8, 16, LOC.fountain.x, 3, LOC.fountain.z);

    // STRAGANY
    const stalls = [
      { x: -14, z: 2, rot: Math.PI / 2.3, stripe: this.T.stallStripe, goods: 'fruit' },
      { x: 14, z: 2, rot: -Math.PI / 2.3, stripe: this.T.stallStripe2, goods: 'pots' },
      { x: -8, z: 18, rot: Math.PI, stripe: this.T.stallStripe2, goods: 'fabric' },
      { x: 9, z: -8, rot: 0.2, stripe: this.T.stallStripe, goods: 'bread' },
    ];
    for (const st of stalls) this.buildStall(st);
    // Latarnie rynku
    for (const [lx, lz] of [[-20, 12], [20, 12], [-20, -6], [20, -4], [5, 26], [5, -14]]) {
      this.addTorch(lx, 3, lz, true);
    }
    // KUŹNIA
    this.buildForge();
    // STAJNIA
    this.buildStable();
    // WIEŻA CZARODZIEJA
    this.buildWizardTower();
    // Tablica ogłoszeń
    const board = new THREE.Group();
    board.add(this.box(0.25, 2.6, 0.25, this.TM(this.T.woodDark, 1, 1), -1.4, 1.3, 0));
    board.add(this.box(0.25, 2.6, 0.25, this.TM(this.T.woodDark, 1, 1), 1.4, 1.3, 0));
    board.add(this.box(3.4, 2, 0.2, this.TM(this.T.wood, 2, 1), 0, 1.7, 0));
    board.add(this.box(3.8, 0.25, 0.6, this.TM(this.T.woodDark, 2, 1), 0, 2.8, 0));
    for (let i = 0; i < 4; i++)
      board.add(this.box(0.6, 0.8, 0.05, this.M(0xe8dfc4), -1.1 + i * 0.75, 1.6 + (i % 2) * 0.15, 0.13));
    board.position.set(-6, 0, 24);
    board.rotation.y = 0.4;
    this.scene.add(board);
    this.circ(-6, 24, 1.6);
  }

  buildStall({ x, z, rot, stripe, goods }) {
    const g = new THREE.Group();
    const wood = this.TM(this.T.wood, 1, 1);
    for (const [px, pz] of [[-1.6, -1], [1.6, -1], [-1.6, 1], [1.6, 1]])
      g.add(this.box(0.18, 2.6, 0.18, wood, px, 1.3, pz));
    const canopy = this.box(4.2, 0.12, 3, new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.9, side: THREE.DoubleSide }), 0, 2.7, 0);
    canopy.rotation.x = 0.12;
    g.add(canopy);
    g.add(this.box(3.4, 0.15, 1.4, wood, 0, 1.05, 0.3));
    g.add(this.box(3.4, 1, 0.15, wood, 0, 0.5, 0.95));
    // towary
    if (goods === 'fruit') {
      for (let i = 0; i < 3; i++) {
        g.add(this.box(0.9, 0.3, 0.7, wood, -1.1 + i * 1.1, 1.25, 0.2));
        for (let k = 0; k < 5; k++) {
          const apple = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8),
            this.M(i === 1 ? 0xe8a83c : 0xc02020, { roughness: 0.5 }));
          apple.position.set(-1.3 + i * 1.1 + (k % 3) * 0.22, 1.5, 0.1 + ((k / 3) | 0) * 0.2);
          apple.castShadow = true;
          g.add(apple);
        }
      }
    } else if (goods === 'pots') {
      for (let i = 0; i < 4; i++) {
        g.add(this.cyl(0.14, 0.2, 0.45, this.M(0x2a6b8f, { roughness: 0.4 }), -1.2 + i * 0.8, 1.35, 0.2, 10));
        g.add(this.cyl(0.16, 0.16, 0.4, this.M(0x8f5a2a, { roughness: 0.6 }), -1.2 + i * 0.8, 1.3, -0.3, 10));
      }
    } else if (goods === 'fabric') {
      const cols = [0x8f1f1f, 0x1f3f8f, 0x1f6b3a];
      for (let i = 0; i < 3; i++) {
        const roll = this.cyl(0.16, 0.16, 1.2, this.M(cols[i]), -1 + i, 1.3, 0.2, 10);
        roll.rotation.z = Math.PI / 2;
        g.add(roll);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), this.M(0xb07a3a));
        loaf.scale.set(1.4, 0.7, 1);
        loaf.position.set(-1.3 + i * 0.65, 1.3, 0.2);
        loaf.castShadow = true;
        g.add(loaf);
      }
    }
    // skrzynie obok
    g.add(this.box(0.9, 0.9, 0.9, wood, 2.3, 0.45, 0.5));
    g.add(this.box(0.7, 0.7, 0.7, wood, 2.2, 1.2, 0.4));
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.scene.add(g);
    this.circ(x, z, 2.6);
  }

  buildForge() {
    const cx = 28, cz = 14;
    const stone = this.TM(this.T.stoneWall, 6, 2);
    const g = new THREE.Group();
    // budynek otwarty od zachodu
    g.add(this.box(10, 5, 1, stone, 0, 2.5, -5));
    g.add(this.box(1, 5, 11, stone, -5, 2.5, 0));
    g.add(this.box(1, 5, 11, stone, 5, 2.5, 0));
    g.add(this.box(11, 1, 11, stone, 0, 5.2, 0));
    const r1 = this.box(7, 0.4, 12, this.TM(this.T.roof, 4, 4), -2.6, 6.6, 0); r1.rotation.z = 0.5;
    const r2 = this.box(7, 0.4, 12, this.TM(this.T.roof, 4, 4), 2.6, 6.6, 0); r2.rotation.z = -0.5;
    g.add(r1, r2);
    // komin
    g.add(this.box(1.4, 4, 1.4, stone, 3, 7.5, -3));
    this.smokeStacks.push({ x: cx + 3, y: 9.6, z: cz - 3 });
    // palenisko
    g.add(this.box(3, 1.2, 2, this.M(0x3a3a42), 2, 0.6, -3.5));
    const coals = this.box(2.6, 0.3, 1.6, new THREE.MeshStandardMaterial({ color: 0xff5a1a, emissive: 0xdd3300, emissiveIntensity: 2 }), 2, 1.3, -3.5);
    g.add(coals);
    const fire = this.glowSprite(this.T.flame, 0xffffff, 2.2, 0.95);
    fire.position.set(2, 2, -3.5);
    g.add(fire);
    this.flames.push({ sprite: fire, base: 2.2, ph: 2 });
    // kowadło
    g.add(this.box(1, 0.5, 0.6, this.M(0x2c2c33, { metalness: 0.6 }), -1.5, 0.9, -2));
    g.add(this.box(0.5, 0.7, 0.5, this.TM(this.T.woodDark, 1, 1), -1.5, 0.35, -2));
    // stojak z bronią
    g.add(this.box(2.4, 0.15, 0.5, this.TM(this.T.woodDark, 1, 1), -3, 1.7, -4.3));
    for (let i = 0; i < 4; i++) {
      const sw = this.box(0.09, 1.5, 0.09, this.M(0xb8bec8, { metalness: 0.8, roughness: 0.3 }), -3.9 + i * 0.6, 2.4, -4.3);
      sw.rotation.x = -0.12;
      g.add(sw);
    }
    // beczka z wodą + kamień szlifierski
    g.add(this.cyl(0.6, 0.55, 1, this.TM(this.T.wood, 2, 1), 3.5, 0.5, 1, 12));
    const grind = this.cyl(0.7, 0.7, 0.25, this.M(0x77777f), -3.5, 0.8, 2, 16);
    grind.rotation.z = Math.PI / 2;
    g.add(grind);
    g.add(this.box(0.3, 0.8, 0.3, this.TM(this.T.woodDark, 1, 1), -3.5, 0.4, 1.6));
    g.add(this.box(0.3, 0.8, 0.3, this.TM(this.T.woodDark, 1, 1), -3.5, 0.4, 2.4));
    // szyld: miecz
    g.add(this.box(0.25, 3.4, 0.25, this.TM(this.T.woodDark, 1, 1), -6.5, 1.7, 3));
    const sign = this.box(0.15, 1.6, 0.5, this.M(0xb8bec8, { metalness: 0.8, roughness: 0.3 }), -6.5, 3.2, 3);
    g.add(sign);
    g.position.set(cx, 0, cz);
    this.scene.add(g);
    this.lights.forge = this.point(0xff7a2a, 26, 22, cx + 2, 2.5, cz - 3.5);
    this.rect(cx, cz - 3.5, 11, 5);
    this.rect(cx - 5, cz, 1.6, 11);
    this.rect(cx + 5, cz, 1.6, 11);
    this.circ(cx - 1.5, cz - 2, 1);
    this.forgeFire = { x: cx + 2, y: 1.8, z: cz - 3.5 };
  }

  buildStable() {
    const cx = -32, cz = 14;
    const wood = this.TM(this.T.wood, 4, 2);
    const g = new THREE.Group();
    // stodoła
    g.add(this.box(10, 3.5, 8, wood, 0, 1.75, 0));
    g.add(this.box(10.6, 0.4, 8.6, this.TM(this.T.thatch, 4, 3), 0, 3.7, 0));
    const r1 = this.box(6.4, 0.35, 9, this.TM(this.T.thatch, 4, 3), -2.6, 5, 0); r1.rotation.z = 0.55;
    const r2 = this.box(6.4, 0.35, 9, this.TM(this.T.thatch, 4, 3), 2.6, 5, 0); r2.rotation.z = -0.55;
    g.add(r1, r2);
    // otwarte wejście (ciemny prostokąt)
    g.add(this.box(3, 2.6, 0.3, this.M(0x140e06), 0, 1.3, 4.05));
    g.position.set(cx, 0, cz);
    this.scene.add(g);
    this.rect(cx, cz, 10.5, 8.5);
    // wybieg: płot
    const fenceM = this.TM(this.T.woodDark, 3, 1);
    const fx1 = -54, fx2 = -38, fz1 = 4, fz2 = 24;
    const rail = (x1, z1, x2, z2) => {
      const len = dist(x1, z1, x2, z2);
      const n = Math.ceil(len / 2.5);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        this.scene.add(this.box(0.22, 1.1, 0.22, fenceM, x1 + (x2 - x1) * t, 0.55, z1 + (z2 - z1) * t));
      }
      const m = this.box(len, 0.14, 0.14, fenceM, (x1 + x2) / 2, 0.95, (z1 + z2) / 2);
      m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      this.scene.add(m);
    };
    rail(fx1, fz1, fx2, fz1); rail(fx1, fz2, fx2, fz2); rail(fx1, fz1, fx1, fz2);
    rail(fx2, fz1, fx2, fz1 + 6); rail(fx2, fz2 - 6, fx2, fz2); // przerwa (wejście)
    this.rect((fx1 + fx2) / 2, fz1, fx2 - fx1, 0.6);
    this.rect((fx1 + fx2) / 2, fz2, fx2 - fx1, 0.6);
    this.rect(fx1, (fz1 + fz2) / 2, 0.6, fz2 - fz1);
    // siano + koryto
    for (const [hx, hz] of [[-50, 7], [-51, 9], [-50.5, 8.2]]) {
      const bale = this.cyl(0.7, 0.7, 1.1, this.TM(this.T.hay, 2, 1), hx, 0.7, hz, 12);
      bale.rotation.z = Math.PI / 2;
      this.scene.add(bale);
    }
    this.circ(-50.5, 8, 1.6);
    this.scene.add(this.box(2.4, 0.5, 0.8, fenceM, -42, 0.5, 20));
    this.circ(-42, 20, 1.4);
    this.addTorch(-27, 3.2, 9, true);
    this.paddock = { x1: fx1 + 1, x2: fx2 - 1, z1: fz1 + 1, z2: fz2 - 1 };
  }

  buildWizardTower() {
    const cx = 28, cz = -20;
    const stone = this.TM(this.T.stoneWall, 8, 5);
    const g = new THREE.Group();
    g.add(this.cyl(4.6, 5.2, 16, stone, 0, 8, 0, 14));
    g.add(this.cyl(5.4, 5.4, 1, stone, 0, 16.2, 0, 14));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 7, 14), this.TM(this.T.roof, 5, 3));
    roof.position.y = 20; roof.castShadow = true;
    g.add(roof);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x66d0ff, emissive: 0x2299dd, emissiveIntensity: 2 }));
    orb.position.y = 24;
    g.add(orb);
    this.wizardOrb = orb;
    // drzwi + schodki
    g.add(this.box(2.2, 3.2, 0.4, this.TM(this.T.woodDark, 1, 2), 0, 1.6, 4.9));
    g.add(this.box(3, 0.3, 1.6, stone, 0, 0.15, 5.6));
    // okna
    for (let i = 0; i < 3; i++) {
      const a = 0.5 + i * 1.1;
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.6), this.windowMat());
      w.position.set(Math.sin(a) * 4.85, 6 + i * 3.4, Math.cos(a) * 4.85);
      w.rotation.y = a;
      g.add(w);
    }
    // balkon
    g.add(this.box(3, 0.3, 1.4, stone, 0, 12.6, 4.6));
    g.add(this.box(3, 0.9, 0.15, stone, 0, 13.2, 5.2));
    g.position.set(cx, 0, cz);
    this.scene.add(g);
    this.circ(cx, cz, 5.6);
    this.lights.wizard = this.point(0x66ccff, 14, 20, cx, 22, cz);
    // ogródek z grzybami
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2), r = rand(7, 11);
      this.addMushroom(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r, rand(0.5, 1));
    }
    this.addTorch(cx - 3, 2.6, cz + 6.5, true);
    this.addTorch(cx + 3, 2.6, cz + 6.5, true);
  }

  addMushroom(x, y, z, s = 1, magic = true) {
    const g = new THREE.Group();
    g.add(this.cyl(0.12 * s, 0.18 * s, 0.7 * s, this.M(0xe0d4b8), 0, 0.35 * s, 0, 8));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      magic
        ? new THREE.MeshStandardMaterial({ color: 0x33bbff, emissive: 0x1888cc, emissiveIntensity: 1.2, roughness: 0.4 })
        : this.M(0xc03030));
    cap.position.y = 0.65 * s; cap.castShadow = true;
    g.add(cap);
    if (!magic) for (let i = 0; i < 4; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 6, 6), this.M(0xf0f0e8));
      const a = rand(0, 6.28);
      dot.position.set(Math.cos(a) * 0.28 * s, 0.65 * s + rand(0.05, 0.25) * s, Math.sin(a) * 0.28 * s);
      g.add(dot);
    }
    g.position.set(x, y, z);
    this.scene.add(g);
    return g;
  }

  // ---------- KARCZMA ----------
  buildTavern() {
    const cx = -24, cz = -14;
    const plaster = this.TM(this.T.plaster, 4, 2);
    const beam = this.TM(this.T.woodDark, 3, 1);
    const g = new THREE.Group();
    // ściany (front otwarty)
    g.add(this.box(16, 4.5, 1, plaster, 0, 2.25, -6));
    g.add(this.box(1, 4.5, 13, plaster, -8, 2.25, 0));
    g.add(this.box(1, 4.5, 13, plaster, 8, 2.25, 0));
    g.add(this.box(4, 4.5, 1, plaster, -6, 2.25, 6));
    g.add(this.box(4, 4.5, 1, plaster, 6, 2.25, 6));
    g.add(this.box(9, 1.2, 1, plaster, 0, 3.9, 6)); // nadproże
    // belki
    for (let i = 0; i < 5; i++) {
      g.add(this.box(0.3, 4.5, 0.3, beam, -7 + i * 3.5, 2.25, -5.4));
      g.add(this.box(0.3, 4.5, 0.3, beam, -7 + i * 3.5, 2.25, 5.4));
    }
    // dach
    const r1 = this.box(10.5, 0.4, 15, this.TM(this.T.thatch, 5, 4), -4.2, 6.2, 0); r1.rotation.z = 0.5;
    const r2 = this.box(10.5, 0.4, 15, this.TM(this.T.thatch, 5, 4), 4.2, 6.2, 0); r2.rotation.z = -0.5;
    g.add(r1, r2);
    // podłoga
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), this.TM(this.T.wood, 6, 5));
    fl.rotation.x = -Math.PI / 2; fl.position.y = 0.28; fl.receiveShadow = true;
    g.add(fl);
    // kominek
    g.add(this.box(3, 4, 1.4, this.TM(this.T.stoneWall, 2, 2), -5.5, 2, -4.8));
    g.add(this.box(2, 1.6, 0.4, this.M(0x140e06), -5.5, 0.9, -4.2));
    const fire = this.glowSprite(this.T.flame, 0xffffff, 1.6, 0.95);
    fire.position.set(-5.5, 1.1, -4.1);
    g.add(fire);
    this.flames.push({ sprite: fire, base: 1.6, ph: 3 });
    g.add(this.box(1.2, 3.5, 1.2, this.TM(this.T.stoneWall, 1, 2), -5.5, 7.5, -4.8));
    // lada + beczki
    g.add(this.box(5, 1.1, 1.2, beam, 4.5, 0.85, -4.5));
    for (let i = 0; i < 3; i++) g.add(this.cyl(0.55, 0.55, 1.3, this.TM(this.T.wood, 2, 1), 3 + i * 1.5, 1.9, -4.9, 12));
    // stoły + ławy
    for (const [tx, tz] of [[-2, 0], [2.5, 2], [-1, 3.5]]) {
      g.add(this.cyl(1.1, 1.1, 0.15, this.TM(this.T.wood, 2, 1), tx, 1, tz, 12));
      g.add(this.cyl(0.15, 0.25, 0.9, beam, tx, 0.5, tz, 8));
      g.add(this.box(2.4, 0.35, 0.5, beam, tx, 0.55, tz + 1.4));
      g.add(this.box(2.4, 0.35, 0.5, beam, tx, 0.55, tz - 1.4));
      // kufle
      for (let k = 0; k < 3; k++)
        g.add(this.cyl(0.09, 0.08, 0.25, this.M(0xb08a4a), tx + rand(-0.6, 0.6), 1.2, tz + rand(-0.6, 0.6), 8));
      // świeca
      const cd = this.glowSprite(this.T.flame, 0xffffff, 0.45, 0.9);
      cd.position.set(tx + 0.5, 1.35, tz - 0.3);
      g.add(cd);
      this.flames.push({ sprite: cd, base: 0.45, ph: rand(0, 9) });
    }
    // okna
    for (const wx of [-4, 0, 4]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), this.windowMat());
      w.position.set(wx, 2.4, -6.55); w.rotation.y = Math.PI;
      g.add(w);
    }
    // szyld karczmy
    g.add(this.box(0.3, 4.2, 0.3, beam, -9.5, 2.1, 5));
    g.add(this.box(2.6, 0.25, 0.25, beam, -8.2, 3.9, 5));
    const signTex = this.textPlaque('ZŁOTY KUFEL');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1), new THREE.MeshStandardMaterial({ map: signTex, side: THREE.DoubleSide }));
    sign.position.set(-8.2, 3.1, 5);
    g.add(sign);
    this.tavernSign = sign;
    g.position.set(cx, 0, cz);
    this.scene.add(g);
    this.lights.tavern = this.point(0xff9a4d, 26, 24, cx - 5, 2.5, cz - 4);
    this.rect(cx, cz - 6, 17, 1.6);
    this.rect(cx - 8, cz, 1.6, 13);
    this.rect(cx + 8, cz, 1.6, 13);
    this.rect(cx - 6, cz + 6, 4.5, 1.6);
    this.rect(cx + 6, cz + 6, 4.5, 1.6);
    this.rect(cx - 5.5, cz - 4.5, 3.4, 2.4);
    this.rect(cx + 4.5, cz - 4.5, 5.4, 1.8);
    for (const [tx, tz] of [[-2, 0], [2.5, 2], [-1, 3.5]]) this.circ(cx + tx, cz + tz, 1.3);
    this.smokeStacks.push({ x: cx - 5.5, y: 9.4, z: cz - 4.8 });
  }

  textPlaque(text) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#3a2812'; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = '#d8a83c'; x.lineWidth = 8; x.strokeRect(6, 6, 500, 116);
    x.fillStyle = '#ffe9b0'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = 52;
    x.font = `bold ${fs}px Georgia`;
    while (x.measureText(text).width > 460 && fs > 20) { fs -= 4; x.font = `bold ${fs}px Georgia`; }
    x.fillText(text, 256, 66);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ---------- DOMY ----------
  buildHouse(x, z, rot, opts = {}) {
    const w = opts.w || rand(7, 9), d = opts.d || rand(8, 11), h = opts.h || 3.6;
    const g = new THREE.Group();
    const plaster = this.TM(this.T.plaster, 3, 2);
    const beam = this.TM(this.T.woodDark, 2, 1);
    g.add(this.box(w, h, d, plaster, 0, h / 2, 0));
    for (let i = 0; i <= 3; i++) {
      g.add(this.box(0.28, h, 0.28, beam, -w / 2 + (i * w) / 3, h / 2, d / 2 + 0.05));
      g.add(this.box(0.28, h, 0.28, beam, -w / 2 + (i * w) / 3, h / 2, -d / 2 - 0.05));
    }
    g.add(this.box(w + 0.2, 0.3, d + 0.2, beam, 0, h - 0.2, 0));
    const roofM = this.TM(opts.thatch ? this.T.thatch : this.T.roof, 4, 4);
    const r1 = this.box(w * 0.72, 0.3, d + 1, roofM, -w * 0.26, h + w * 0.2, 0); r1.rotation.z = 0.62;
    const r2 = this.box(w * 0.72, 0.3, d + 1, roofM, w * 0.26, h + w * 0.2, 0); r2.rotation.z = -0.62;
    g.add(r1, r2);
    // drzwi + okna
    g.add(this.box(1.4, 2.4, 0.25, this.TM(this.T.woodDark, 1, 2), 0, 1.2, d / 2 + 0.08));
    for (const sx of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.windowMat());
      win.position.set(sx * (w / 4 + 0.6), 2, d / 2 + 0.06);
      g.add(win);
      const win2 = win.clone(); win2.position.z = -d / 2 - 0.06; win2.rotation.y = Math.PI;
      g.add(win2);
    }
    if (opts.chimney !== false) {
      g.add(this.box(0.9, 2.4, 0.9, this.TM(this.T.stoneWall, 1, 1), w * 0.28, h + w * 0.28, -d * 0.2));
    }
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.scene.add(g);
    this.circ(x, z, Math.max(w, d) * 0.62);
    // skrzynie / beczki / wóz
    if (Math.random() < 0.7) {
      const bx = x + Math.cos(rot) * (w / 2 + 1.5), bz = z - Math.sin(rot) * (w / 2 + 1.5);
      this.scene.add(this.box(0.9, 0.9, 0.9, this.TM(this.T.wood, 1, 1), bx, 0.45, bz));
      this.scene.add(this.cyl(0.5, 0.5, 1.1, this.TM(this.T.wood, 2, 1), bx + 1.1, 0.55, bz, 10));
    }
    return g;
  }

  buildHouses() {
    const H = [
      [-48, 34, 0.3], [-48, -2, -0.25], [48, 34, -0.3], [48, -2, 0.25],
      [-16, 50, 0.05], [16, 50, -0.05], [-54, -44, 0.5], [54, -46, -0.5],
      [-40, 62, 0.1], [40, 62, -0.1],
    ];
    for (const [x, z, r] of H) this.buildHouse(x, z, r, { thatch: Math.random() < 0.4 });
    // latarnie uliczne
    for (const [lx, lz] of [[-8, 40], [8, 40], [-30, -30], [30, -34], [-40, 20], [40, 22], [-8, -28], [8, -28]]) {
      this.addTorch(lx, 3.2, lz, true);
    }
    // studnia
    const well = new THREE.Group();
    well.add(this.cyl(1.3, 1.4, 1.1, this.TM(this.T.stoneWall, 3, 1), 0, 0.55, 0, 12));
    well.add(this.box(0.2, 2.2, 0.2, this.TM(this.T.woodDark, 1, 1), -1.1, 1.6, 0));
    well.add(this.box(0.2, 2.2, 0.2, this.TM(this.T.woodDark, 1, 1), 1.1, 1.6, 0));
    const wr = this.box(3.2, 0.2, 2, this.TM(this.T.wood, 2, 1), 0, 2.8, 0); wr.rotation.z = 0; well.add(wr);
    const wr2 = this.box(3.2, 0.2, 1.1, this.TM(this.T.roof, 2, 1), 0, 3.15, -0.45); wr2.rotation.x = 0.5; well.add(wr2);
    const wr3 = this.box(3.2, 0.2, 1.1, this.TM(this.T.roof, 2, 1), 0, 3.15, 0.45); wr3.rotation.x = -0.5; well.add(wr3);
    well.position.set(-30, 0, -34);
    this.scene.add(well);
    this.circ(-30, -34, 1.8);
  }

  // ---------- FARMA I WIATRAK ----------
  buildFarmAndMill() {
    const { x: fx, z: fz } = LOC.farm;
    const gy = groundHeight(fx, fz);
    const red = this.TM(this.T.wood, 4, 2).clone();
    red.color = new THREE.Color(0xa8442a);
    const barn = new THREE.Group();
    barn.add(this.box(12, 5, 9, red, 0, 2.5, 0));
    barn.add(this.box(12.4, 0.4, 9.4, this.TM(this.T.woodDark, 4, 3), 0, 5.1, 0));
    const r1 = this.box(7.6, 0.35, 10, this.TM(this.T.thatch, 4, 3), -3, 6.6, 0); r1.rotation.z = 0.55;
    const r2 = this.box(7.6, 0.35, 10, this.TM(this.T.thatch, 4, 3), 3, 6.6, 0); r2.rotation.z = -0.55;
    barn.add(r1, r2);
    barn.add(this.box(3.4, 3.6, 0.3, this.M(0x140e06), 0, 1.8, 4.55));
    barn.add(this.box(4, 0.5, 0.4, this.M(0xf0ead8), 0, 4.4, 4.55));
    barn.position.set(fx - 14, gy, fz - 8);
    this.scene.add(barn);
    this.rect(fx - 14, fz - 8, 12.5, 9.5);
    // pole uprawne
    for (let i = 0; i < 8; i++) {
      const row = this.box(1.2, 0.25, 22, this.M(0x3a2812), fx + 4 + i * 2.4, gy + 0.1, fz + 22);
      this.scene.add(row);
      for (let k = 0; k < 9; k++) {
        const crop = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 6), this.M(0x4a8f3c));
        crop.position.set(fx + 4 + i * 2.4, gy + 0.55, fz + 13 + k * 2.2);
        crop.castShadow = true;
        this.scene.add(crop);
      }
    }
    // płot pastwiska + siano
    const fenceM = this.TM(this.T.woodDark, 3, 1);
    const px1 = fx - 30, px2 = fx + 2, pz1 = fz + 2, pz2 = fz + 20;
    const rail = (x1, z1, x2, z2) => {
      const len = dist(x1, z1, x2, z2), n = Math.ceil(len / 3);
      for (let i = 0; i <= n; i++) {
        const t = i / n, px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t;
        this.scene.add(this.box(0.22, 1.1, 0.22, fenceM, px, groundHeight(px, pz) + 0.55, pz));
      }
    };
    rail(px1, pz1, px2, pz1); rail(px1, pz2, px2, pz2); rail(px1, pz1, px1, pz2);
    this.farmPasture = { x1: px1, x2: px2, z1: pz1, z2: pz2 };
    this.scene.add(this.cyl(1.2, 1.2, 1.6, this.TM(this.T.hay, 3, 1), fx + 20, gy + 0.8, fz + 6, 12));
    // drogowskaz na rozstaju
    this.addSignpost(4, 150, ['KRÓLESTWO ↑', 'LAS →', '← JASKINIA']);
    this.addSignpost(38, 152, ['↑ GÓRY']);
    this.addSignpost(-160, 152, ['↑ JASKINIA']);
    this.addSignpost(182, 152, ['↑ LAS']);

    // WIATRAK
    const { x: mx, z: mz } = LOC.windmill;
    const my = groundHeight(mx, mz);
    const mill = new THREE.Group();
    mill.add(this.cyl(3, 4, 12, this.TM(this.T.plaster, 4, 3), 0, 6, 0, 10));
    const mroof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 3, 10), this.TM(this.T.roof, 4, 2));
    mroof.position.y = 13.5; mroof.castShadow = true;
    mill.add(mroof);
    mill.add(this.box(1.6, 2.6, 0.3, this.TM(this.T.woodDark, 1, 2), 0, 1.3, 3.8));
    const blades = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const b = this.box(1.4, 9, 0.12, this.TM(this.T.clothRed ? this.T.wood : this.T.wood, 1, 3), 0, 5.5, 0);
      const frame = new THREE.Group();
      frame.add(b);
      frame.rotation.z = (i / 4) * Math.PI * 2;
      blades.add(frame);
    }
    blades.position.set(0, 11.5, 3.6);
    mill.add(blades);
    this.windmillBlades = blades;
    mill.position.set(mx, my, mz);
    this.scene.add(mill);
    this.circ(mx, mz, 4.5);
  }

  addSignpost(x, z, lines) {
    const y = groundHeight(x, z);
    const g = new THREE.Group();
    g.add(this.box(0.25, 2.8, 0.25, this.TM(this.T.woodDark, 1, 1), 0, 1.4, 0));
    lines.forEach((ln, i) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55),
        new THREE.MeshStandardMaterial({ map: this.textPlaque(ln), side: THREE.DoubleSide }));
      p.position.set(0.4, 2.4 - i * 0.65, 0);
      p.rotation.y = (i % 2 === 0 ? 0.25 : -0.3);
      g.add(p);
    });
    g.position.set(x, y, z);
    this.scene.add(g);
    this.circ(x, z, 0.7);
  }

  // ---------- GÓRY + OBÓZ GOBLINÓW ----------
  buildMountains() {
    const rockM = this.TM(this.T.rock, 6, 6);
    const snowM = this.M(0xe8eef4, { roughness: 0.6 });
    const peaks = [
      [-120, -280, 70, 60], [-40, -295, 80, 72], [50, -285, 75, 66],
      [130, -275, 65, 55], [-190, -260, 60, 50], [200, -250, 62, 52], [-60, -240, 40, 30], [110, -235, 42, 32],
    ];
    for (const [px, pz, r, h] of peaks) {
      const base = groundHeight(px, pz);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rockM);
      cone.position.set(px, base + h / 2 - 6, pz);
      cone.castShadow = true; cone.receiveShadow = true;
      cone.rotation.y = rand(0, 3);
      this.scene.add(cone);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.42, 7), snowM);
      cap.position.set(px, base + h - 6 - h * 0.21 + 1, pz);
      cap.rotation.y = cone.rotation.y;
      cap.castShadow = true;
      this.scene.add(cap);
      this.circ(px, pz, r * 0.75);
    }
    // Obóz goblinów
    const { x: gx, z: gz } = LOC.goblinCamp;
    const gy = groundHeight(gx, gz);
    const leather = this.M(0x6b4e2e);
    for (const [ox, oz] of [[-10, -6], [9, -8], [0, 10], [-12, 6], [12, 5]]) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(3, 4.5, 8), leather);
      tent.position.set(gx + ox, gy + 2.2, gz + oz);
      tent.castShadow = true; tent.receiveShadow = true;
      this.scene.add(tent);
      this.circ(gx + ox, gz + oz, 3);
    }
    // totemy
    for (const [ox, oz] of [[-6, 0], [6, 0]]) {
      this.scene.add(this.box(0.5, 4.5, 0.5, this.TM(this.T.woodDark, 1, 2), gx + ox, gy + 2.2, gz + oz));
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), this.M(0xe0d8c0));
      skull.position.set(gx + ox, gy + 4.8, gz + oz);
      skull.castShadow = true;
      this.scene.add(skull);
      this.circ(gx + ox, gz + oz, 0.7);
    }
    // ognisko obozowe
    this.buildCampfire(gx, gy, gz, true);
    // kości i skrzynia z łupem
    for (let i = 0; i < 6; i++) {
      const bone = this.box(0.5, 0.12, 0.12, this.M(0xe0d8c0), gx + rand(-8, 8), gy + 0.08, gz + rand(-8, 8));
      bone.rotation.y = rand(0, 3);
      this.scene.add(bone);
    }
    this.addChest(gx + 4, gy, gz - 12, 0.3);
    this.goblinChestPos = { x: gx + 4, z: gz - 12 };
    // palisada (częściowa)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      if (a > 0.4 && a < 1.1) continue; // wejście od południa
      const px = gx + Math.cos(a) * 20, pz = gz + Math.sin(a) * 20;
      const py = groundHeight(px, pz);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 3.4, 6), this.TM(this.T.woodDark, 1, 1));
      spike.position.set(px, py + 1.4, pz);
      spike.castShadow = true;
      this.scene.add(spike);
      this.circ(px, pz, 0.5);
    }
  }

  buildCampfire(x, y, z, big = false) {
    const g = new THREE.Group();
    const s = big ? 1.4 : 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 * s), this.M(0x77777f));
      st.position.set(Math.cos(a) * 1.1 * s, 0.15, Math.sin(a) * 1.1 * s);
      st.castShadow = true;
      g.add(st);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + 0.4;
      const log = this.cyl(0.12 * s, 0.12 * s, 1.6 * s, this.TM(this.T.woodDark, 1, 1), 0, 0.25, 0, 7);
      log.rotation.z = Math.PI / 2; log.rotation.y = a;
      g.add(log);
    }
    const fire = this.glowSprite(this.T.flame, 0xffffff, 2 * s, 0.95);
    fire.position.y = 0.9 * s;
    g.add(fire);
    this.flames.push({ sprite: fire, base: 2 * s, ph: rand(0, 9) });
    g.position.set(x, y, z);
    this.scene.add(g);
    const l = this.point(0xff8a3d, 24, 26, x, y + 2, z);
    if (big) this.lights.camp = l;
    return { x, y: y + 1, z };
  }

  // ---------- MAGICZNY LAS ----------
  buildForest() {
    // Kamienny krąg
    const { x: sx, z: sz } = LOC.stoneCircle;
    const sy = groundHeight(sx, sz);
    const runeM = new THREE.MeshStandardMaterial({ color: 0x55ddff, emissive: 0x2299dd, emissiveIntensity: 1.4 });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const px = sx + Math.cos(a) * 8, pz = sz + Math.sin(a) * 8;
      const py = groundHeight(px, pz);
      const st = this.box(1.4, rand(2.5, 3.8), 0.9, this.TM(this.T.rock, 1, 1), px, py + 1.4, pz);
      st.rotation.y = -a + Math.PI / 2;
      this.scene.add(st);
      this.circ(px, pz, 1);
      if (i % 2 === 0) {
        const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.2), runeM);
        rune.position.set(px - Math.cos(a) * 0.5, py + 1.5, pz - Math.sin(a) * 0.5);
        rune.rotation.y = -a - Math.PI / 2;
        this.scene.add(rune);
      }
    }
    const altar = this.box(2, 1, 1.4, this.TM(this.T.rock, 1, 1), sx, sy + 0.5, sz);
    this.scene.add(altar);
    this.circ(sx, sz, 1.4);
    // Lilie na stawie
    for (let i = 0; i < 10; i++) {
      const a = rand(0, 6.28), r = rand(3, 12);
      const lx = LOC.forestPond.x + Math.cos(a) * r, lz = LOC.forestPond.z + Math.sin(a) * r;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(rand(0.4, 0.8), 10), this.M(0x2f7b3a));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(lx, WATER_Y + 0.12, lz);
      this.scene.add(pad);
    }
    // Grzyby
    for (let i = 0; i < 26; i++) {
      const a = rand(0, 6.28), r = rand(10, 85);
      const mx = LOC.forest.x + Math.cos(a) * r, mz = LOC.forest.z + Math.sin(a) * r * 0.8;
      this.addMushroom(mx, groundHeight(mx, mz), mz, rand(0.5, 1.6), Math.random() < 0.7);
    }
    // Ruiny — zwalone kolumny
    for (let i = 0; i < 4; i++) {
      const rx = LOC.forest.x + rand(-50, 50), rz = LOC.forest.z + rand(-40, 40);
      const col = this.cyl(0.6, 0.7, rand(2, 4), this.TM(this.T.marble, 2, 2), rx, groundHeight(rx, rz) + 0.5, rz, 8);
      col.rotation.z = Math.PI / 2;
      col.rotation.y = rand(0, 3);
      this.scene.add(col);
    }
  }

  // ---------- JASKINIA ----------
  buildCave() {
    const { x: cx, z: cz } = LOC.caveCenter;
    const fy = 1.5;
    const rockM = this.TM(this.T.rock, 5, 5);
    // Podłoga pieczary
    const fl = new THREE.Mesh(new THREE.CircleGeometry(27, 28), this.TM(this.T.rock, 8, 8));
    fl.rotation.x = -Math.PI / 2;
    fl.position.set(cx, fy + 0.06, cz);
    fl.receiveShadow = true;
    this.scene.add(fl);
    // Pierścień skał (z wejściem od wschodu)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      if (Math.abs(a) < 0.35 || Math.abs(a - Math.PI * 2) < 0.35) continue; // wejście
      const px = cx + Math.cos(a) * 26, pz = cz + Math.sin(a) * 26;
      const w = rand(9, 13), h = rand(10, 15);
      const rock = this.box(w, h, 5, rockM, px, fy + h / 2 - 1, pz);
      rock.rotation.y = -a + Math.PI / 2 + rand(-0.15, 0.15);
      this.scene.add(rock);
      this.circ(px, pz, 5);
    }
    // Dach (płyty skalne — dają cień)
    for (let i = 0; i < 5; i++) {
      const slab = this.box(rand(16, 24), 2.5, rand(8, 12), rockM, cx + rand(-10, 10), 12.5 + rand(0, 1.5), cz + rand(-12, 12));
      slab.rotation.y = rand(0, 3);
      this.scene.add(slab);
    }
    // Stalaktyty
    for (let i = 0; i < 14; i++) {
      const a = rand(0, 6.28), r = rand(4, 20);
      const st = new THREE.Mesh(new THREE.ConeGeometry(rand(0.4, 0.9), rand(2, 4.5), 7), rockM);
      st.position.set(cx + Math.cos(a) * r, 11.5, cz + Math.sin(a) * r);
      st.rotation.x = Math.PI;
      this.scene.add(st);
    }
    // Wejście: portal skalny
    const ex = LOC.caveEntrance.x, ez = LOC.caveEntrance.z;
    const ey = groundHeight(ex, ez);
    for (const s of [-1, 1]) {
      const pil = this.box(4, 9, 4, rockM, ex + 1, ey + 3.5, ez + s * 5);
      this.scene.add(pil);
      this.circ(ex + 1, ez + s * 5, 2.6);
    }
    this.scene.add(this.box(5, 3, 14, rockM, ex + 1, ey + 9.5, ez));
    this.addTorch(ex - 1, ey + 3, ez - 5.2);
    this.addTorch(ex - 1, ey + 3, ez + 5.2);
    // Kryształy
    const crysM = new THREE.MeshStandardMaterial({ color: 0x66d9ff, emissive: 0x1f88dd, emissiveIntensity: 1.5, roughness: 0.15, metalness: 0.1 });
    const crysM2 = new THREE.MeshStandardMaterial({ color: 0xc07aff, emissive: 0x7733cc, emissiveIntensity: 1.4, roughness: 0.15 });
    this.crystals = [];
    for (let i = 0; i < 12; i++) {
      const a = rand(0, 6.28), r = rand(6, 21);
      const px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r;
      const n = 2 + (Math.random() * 3 | 0);
      for (let k = 0; k < n; k++) {
        const h = rand(0.8, 2.6);
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(rand(0.25, 0.5)), k % 3 === 0 ? crysM2 : crysM);
        c.position.set(px + rand(-1, 1), fy + h / 2, pz + rand(-1, 1));
        c.scale.y = h;
        c.rotation.y = rand(0, 3);
        this.scene.add(c);
        this.crystals.push(c);
      }
      this.circ(px, pz, 1.2);
    }
    this.lights.cave = this.point(0x55bbff, 30, 40, cx, fy + 5, cz);
    this.lights.cave2 = this.point(0xaa66ff, 16, 22, cx - 12, fy + 3, cz + 8);
    // Kości
    for (let i = 0; i < 8; i++) {
      const bone = this.box(0.6, 0.12, 0.12, this.M(0xd8d0b8), cx + rand(-15, 15), fy + 0.08, cz + rand(-15, 15));
      bone.rotation.y = rand(0, 3);
      this.scene.add(bone);
    }
    // Piedestał na kryształ (głębia jaskini)
    this.scene.add(this.cyl(1.2, 1.5, 1, this.TM(this.T.marble, 2, 1), cx - 16, fy + 0.5, cz, 8));
    this.caveChest = this.addChest(cx - 16, fy, cz + 3.2, Math.PI / 2);
    this.cavePedestal = { x: cx - 16, z: cz };
  }

  // ---------- ZAPOMNIANE RUINY ----------
  buildRuins() {
    const { x: rx, z: rz } = LOC.ruins;
    const ry = 0.6;
    const marble = this.TM(this.T.marble, 2, 2);
    const rockM = this.TM(this.T.rock, 2, 2);
    const slab = new THREE.Mesh(new THREE.CircleGeometry(22, 24), this.TM(this.T.cobble, 8, 8));
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(rx, ry + 0.04, rz);
    slab.receiveShadow = true;
    this.scene.add(slab);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = rx + Math.cos(a) * 15, pz = rz + Math.sin(a) * 15;
      if (i % 3 === 2) {
        const col = this.cyl(0.7, 0.8, 5, marble, px, ry + 0.7, pz, 9);
        col.rotation.z = Math.PI / 2; col.rotation.y = a;
        this.scene.add(col);
      } else {
        const hgt = 4 + Math.random() * 2.5;
        this.scene.add(this.box(2, 0.6, 2, rockM, px, ry + 0.3, pz));
        this.scene.add(this.cyl(0.7, 0.8, hgt, marble, px, ry + 0.6 + hgt / 2, pz, 9));
        if (hgt > 5.5) this.scene.add(this.box(2, 0.5, 2, marble, px, ry + 0.6 + hgt + 0.2, pz));
      }
      this.circ(px, pz, 1.4);
    }
    this.scene.add(this.cyl(1.6, 2, 1, rockM, rx, ry + 0.5, rz, 8));
    const darkM = new THREE.MeshStandardMaterial({ color: 0x2a0a3a, emissive: 0x7717aa, emissiveIntensity: 1.6, roughness: 0.2 });
    const dark = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), darkM);
    dark.position.set(rx, ry + 2.2, rz);
    dark.castShadow = true;
    this.scene.add(dark);
    this.ruinCrystal = dark;
    const dg = this.glowSprite(this.T.soft, 0xaa44ff, 5, 0.3);
    dg.position.set(rx, ry + 2.2, rz);
    this.scene.add(dg);
    this.circ(rx, rz, 2.4);
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.28, r = 4 + Math.random() * 16;
      const px = rx + Math.cos(a) * r, pz = rz + Math.sin(a) * r;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.9, 0), rockM);
      rock.position.set(px, ry + 0.3, pz);
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rock.castShadow = true; rock.receiveShadow = true;
      this.scene.add(rock);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x551188, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(rx, ry + 0.08, rz);
    this.scene.add(ring);
    this.ruinRing = ring;
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * 6.28, r = 24 + Math.random() * 14;
      const px = rx + Math.cos(a) * r, pz = rz + Math.sin(a) * r;
      const py = groundHeight(px, pz);
      const trunk = this.cyl(0.25, 0.4, 5, this.TM(this.T.bark, 1, 2), px, py + 2.5, pz, 7);
      trunk.rotation.z = (Math.random() - 0.5) * 0.3;
      this.scene.add(trunk);
      for (let b = 0; b < 3; b++) {
        const br = this.cyl(0.06, 0.1, 2.2, this.TM(this.T.bark, 1, 1), px, py + 4 + b * 0.4, pz, 5);
        br.rotation.z = 0.9 + b * 0.5; br.rotation.y = b * 2;
        this.scene.add(br);
      }
      this.circ(px, pz, 0.8);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      this.addTorch(rx + Math.cos(a) * 10, ry + 2.2, rz + Math.sin(a) * 10, true, 0x88ffaa, 0x44dd77);
    }
    this.lights.ruins = this.point(0x9955ff, 18, 26, rx, ry + 4, rz);
  }

  // ---------- SZCZYT ZGUBY (arena Mrocznego Rycerza) ----------
  buildArena() {
    const { x: ax, z: az } = LOC.arena;
    const ay = groundHeight(ax, az);
    this.arenaY = ay;
    const rockM = this.TM(this.T.rock, 4, 4);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(20, 26), this.TM(this.T.cobble, 7, 7));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(ax, ay + 0.05, az);
    disc.receiveShadow = true;
    this.scene.add(disc);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      if (Math.abs(a - Math.PI / 2) < 0.3) continue;
      const px = ax + Math.cos(a) * 19, pz = az + Math.sin(a) * 19;
      const fang = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5 + Math.random() * 3, 6), rockM);
      fang.position.set(px, groundHeight(px, pz) + 2.5, pz);
      fang.castShadow = true; fang.receiveShadow = true;
      this.scene.add(fang);
      this.circ(px, pz, 1.8);
    }
    const portalM = new THREE.MeshStandardMaterial({ color: 0x1a0515, emissive: 0xcc1133, emissiveIntensity: 1.8, roughness: 0.2 });
    const portal = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), portalM);
    portal.scale.y = 2.2;
    portal.position.set(ax, ay + 3.5, az - 12);
    portal.castShadow = true;
    this.scene.add(portal);
    this.portalCrystal = portal;
    this.scene.add(this.cyl(2, 2.5, 1, rockM, ax, ay + 0.5, az - 12, 8));
    const pg = this.glowSprite(this.T.soft, 0xff2244, 9, 0.4);
    pg.position.set(ax, ay + 3.5, az - 12);
    this.scene.add(pg);
    this.circ(ax, az - 12, 2.8);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.5, 4.5, 32),
      new THREE.MeshBasicMaterial({ color: 0xcc1133, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ax, ay + 0.1, az - 12);
    this.scene.add(ring);
    for (const [ox, oz] of [[-8, 6], [8, 6], [-8, -6], [8, -6]]) {
      this.addTorch(ax + ox, ay + 2.4, az + oz, true, 0xff6666, 0xff3322);
    }
    for (const [ox, oz] of [[-12, 0], [12, 0]]) {
      this.scene.add(this.cyl(0.12, 0.12, 7, this.TM(this.T.woodDark, 1, 2), ax + ox, ay + 3.5, az + oz, 8));
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4),
        new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9, side: THREE.DoubleSide }));
      ban.position.set(ax + ox + 1.1, ay + 5, az + oz);
      this.scene.add(ban);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), this.M(0xe0d8c0));
      skull.position.set(ax + ox, ay + 7.3, az + oz);
      skull.castShadow = true;
      this.scene.add(skull);
    }
    this.lights.arena = this.point(0xff3344, 24, 34, ax, ay + 5, az - 8);
  }

  // ---------- ŚCIEŻKI I DROGOWSKAZY ----------
  // Taśma drogi wzdłuż punktów, dopasowana do terenu
  buildPath(points, width, tex) {
    const pts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i], [x2, z2] = points[i + 1];
      const d = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.round(d / 2.5));
      for (let k = 0; k < n; k++) pts.push([x1 + (x2 - x1) * k / n, z1 + (z2 - z1) * k / n]);
      PATH_SEGS.push([x1, z1, x2, z2]);
    }
    pts.push(points[points.length - 1]);
    const pos = [], uv = [], idx = [];
    let dist = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x, z] = pts[i];
      const [px, pz] = pts[Math.max(0, i - 1)], [nx, nz] = pts[Math.min(pts.length - 1, i + 1)];
      let dx = nx - px, dz = nz - pz;
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const ox = -dz * width / 2, oz = dx * width / 2;
      if (i > 0) dist += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
      pos.push(x + ox, this.walkHeight(x + ox, z + oz) + 0.07, z + oz);
      pos.push(x - ox, this.walkHeight(x - ox, z - oz) + 0.07, z - oz);
      uv.push(0, dist * 0.25, 1, dist * 0.25);
      if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const t = tex.clone(); t.needsUpdate = true;
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      map: t, roughness: 1, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    m.receiveShadow = true;
    this.scene.add(m);
  }

  buildPaths() {
    PATH_SEGS = [];
    const dirt = this.T.dirt, cob = this.T.cobble;
    // --- brukowane ulice w mieście ---
    this.buildPath([[0, -38], [0, -4]], 4, cob);
    this.buildPath([[0, 14], [0, 86]], 4, cob);
    this.buildPath([[0, 0], [-12, -3], [-21, -7]], 3, cob);      // karczma
    this.buildPath([[6, 5], [14, 9], [21, 12]], 3, cob);        // kuźnia
    this.buildPath([[-4, 6], [-15, 9], [-25, 11]], 3, cob);      // stajnia
    this.buildPath([[5, -2], [15, -8], [23, -13]], 3, cob);      // wieża
    // plac wokół fontanny
    const plazaTex = cob.clone(); plazaTex.needsUpdate = true; plazaTex.repeat.set(6, 6);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(7.6, 28),
      new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.06, 5);
    plaza.receiveShadow = true;
    this.scene.add(plaza);
    // --- drogi bite ---
    this.buildPath([[0, 86], [0, 108], [0, 160]], 3, dirt);
    this.buildPath([[0, 160], [-168, 160], [-168, 64]], 3, dirt);
    this.buildPath([[0, 160], [190, 160], [190, 48]], 3, dirt);
    this.buildPath([[0, 160], [-40, 166]], 3, dirt);
    this.buildPath([[-40, 166], [58, 188]], 3, dirt);
    this.buildPath([[58, 188], [100, 192], [140, 196], [140, 238]], 3, dirt);
    this.buildPath([[190, 140], [150, 80], [140, 0], [120, -70], [95, -140], [60, -185], [42, -203]], 3, dirt);
    this.buildPath([[40, -205], [30, -226], [20, -244]], 2.2, dirt);
    // --- drogowskazy: [x, z, [[tekst, dx, dz], ...]] ---
    const signs = [
      [4, 92, [['ZAMEK', 0, -1], ['ROZSTAJE', 0, 1]]],
      [5, 164, [['ZAMEK', 0, -1], ['FARMA · JASKINIA', -1, 0], ['MŁYN · LAS', 1, 0]]],
      [-160, 160, [['MROCZNA JASKINIA', 0, -1], ['ROZSTAJE', 1, 0]]],
      [182, 160, [['MAGICZNY LAS', 0, -1], ['ROZSTAJE', -1, 0]]],
      [183, 132, [['GÓRY MGLISTE', -0.55, -0.83], ['MAGICZNY LAS', 0.08, -1]]],
      [184, 62, [['SERCE LASU', 0, -1], ['ROZSTAJE', 0, 1]]],
      [-36, 164, [['MŁYN · RUINY', 1, 0], ['KRÓLESTWO', 0.7, -0.7]]],
      [54, 186, [['ZAPOMNIANE RUINY', 1, 0.1], ['FARMA', -1, 0]]],
      [134, 200, [['RUINY', 0.15, 1], ['MŁYN', -1, 0]]],
      [-168, 70, [['MROCZNA JASKINIA', 0, -1]]],
      [52, -198, [['SZCZYT ZGUBY', -0.5, -1]]],
      [95, -136, [['OBÓZ GOBLINÓW', -0.4, -1], ['LAS', 0.4, 1]]],
    ];
    for (const [sx, sz, boards] of signs) this.buildSignpost(sx, sz, boards);
  }

  buildSignpost(x, z, boards) {
    const y = this.walkHeight(x, z);
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.4, 8), this.M(0x5a4020));
    post.position.y = 1.7; post.castShadow = true;
    g.add(post);
    boards.forEach(([text, dx, dz], i) => {
      const b = new THREE.Group();
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.44, 0.1), this.M(0x6a4e2a));
      plank.castShadow = true;
      b.add(plank);
      const tp = new THREE.PlaneGeometry(2.4, 0.4);
      const tm = new THREE.MeshStandardMaterial({ map: this.textPlaque(text), roughness: 0.9 });
      const f = new THREE.Mesh(tp, tm); f.position.z = 0.06; b.add(f);
      const bk = new THREE.Mesh(tp, tm); bk.position.z = -0.06; bk.rotation.y = Math.PI; b.add(bk);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 6), this.M(0x6a4e2a));
      head.rotation.z = -Math.PI / 2; head.position.x = 1.45; b.add(head);
      b.position.y = 2.75 - i * 0.58;
      b.rotation.y = Math.atan2(-dz, dx);
      g.add(b);
    });
    g.position.set(x, y, z);
    this.scene.add(g);
    this.circ(x, z, 0.6);
  }

  // ---------- ROŚLINNOŚĆ (instancje) ----------
  scatterOK(x, z, forTree = false) {
    const sq = sqDist(x, z);
    if (sq < MOAT_OUT + 6) return false;
    if (Math.abs(x) > WORLD_HALF - 8 || Math.abs(z) > WORLD_HALF - 8) return false;
    if (distRoad(x, z) < (forTree ? 7 : 4)) return false;
    if (PATH_SEGS.length && distPath(x, z) < (forTree ? 5 : 3)) return false;
    if (dist(x, z, LOC.forestPond.x, LOC.forestPond.z) < 20) return false;
    if (dist(x, z, LOC.caveCenter.x, LOC.caveCenter.z) < 34) return false;
    if (dist(x, z, LOC.goblinCamp.x, LOC.goblinCamp.z) < 26) return false;
    if (dist(x, z, LOC.ruins.x, LOC.ruins.z) < 26) return false;
    if (dist(x, z, LOC.arena.x, LOC.arena.z) < 26) return false;
    if (dist(x, z, LOC.farm.x, LOC.farm.z) < 36) return false;
    if (dist(x, z, LOC.windmill.x, LOC.windmill.z) < 14) return false;
    if (dist(x, z, LOC.stoneCircle.x, LOC.stoneCircle.z) < 12) return false;
    const h = groundHeight(x, z);
    if (h < WATER_Y + 0.5) return false;
    return true;
  }

  buildVegetation() {
    const dummy = new THREE.Object3D();
    const trunkG = new THREE.CylinderGeometry(0.35, 0.5, 4, 7);
    const oakG = new THREE.IcosahedronGeometry(2.6, 1);
    const pineG = new THREE.ConeGeometry(2.4, 6.5, 8);
    const magicG = new THREE.IcosahedronGeometry(2.4, 1);
    const trunkM = new THREE.MeshStandardMaterial({ map: this.T.bark, roughness: 1 });
    const oakM = this.windify(new THREE.MeshStandardMaterial({ map: this.T.leafOak, roughness: 1, alphaTest: 0.4, side: THREE.DoubleSide }), 0.22, 'oak');
    const pineM = this.windify(new THREE.MeshStandardMaterial({ map: this.T.leafPine, roughness: 1, alphaTest: 0.4, side: THREE.DoubleSide }), 0.14, 'pine');
    const magicM = this.windify(new THREE.MeshStandardMaterial({ map: this.T.leafMagic, roughness: 0.7, emissive: 0x1a5566, emissiveIntensity: 0.7, alphaTest: 0.4, side: THREE.DoubleSide }), 0.26, 'magic');

    const trunks = [], oaks = [], pines = [], magics = [];
    let guard = 0;
    const tryAdd = (arr, x, z, type) => {
      if (!this.scatterOK(x, z, true)) return false;
      const h = groundHeight(x, z);
      const s = type === 'pine' ? rand(0.9, 1.7) : rand(0.8, 1.5);
      trunks.push({ x, y: h, z, s });
      arr.push({ x, y: h, z, s, ph: rand(0, 9) });
      if (distRoad(x, z) < 14) this.circ(x, z, 0.8);
      return true;
    };
    // Las magiczny — gęsty
    guard = 0;
    let placed = 0;
    while (placed < 120 && guard++ < 3000) {
      const a = rand(0, 6.28), r = 12 + Math.pow(Math.random(), 0.7) * 85;
      const x = LOC.forest.x + Math.cos(a) * r, z = LOC.forest.z + Math.sin(a) * r * 0.85;
      if (tryAdd(Math.random() < 0.45 ? magics : oaks, x, z)) placed++;
    }
    // Sosny w górach
    placed = 0; guard = 0;
    while (placed < 150 && guard++ < 4000) {
      const x = rand(-280, 280), z = rand(-310, -120);
      if (groundHeight(x, z) < 6) continue;
      if (tryAdd(pines, x, z, 'pine')) placed++;
    }
    // Rozproszone drzewa
    placed = 0; guard = 0;
    while (placed < 130 && guard++ < 5000) {
      const x = rand(-290, 290), z = rand(-120, 300);
      if (dist(x, z, LOC.forest.x, LOC.forest.z) < 105) continue;
      const n = fbm(x * 0.02, z * 0.02);
      if (n < 0.55) continue;
      if (tryAdd(Math.random() < 0.3 ? pines : oaks, x, z)) placed++;
    }
    // Obramowanie mapy
    for (let i = 0; i < 160; i++) {
      const side = i % 4;
      const t = rand(-300, 300);
      const x = side === 0 ? -305 : side === 1 ? 305 : t;
      const z = side === 2 ? -305 : side === 3 ? 305 : t;
      const h = groundHeight(clamp(x, -300, 300), clamp(z, -300, 300));
      trunks.push({ x, y: h, z, s: rand(1, 1.8) });
      pines.push({ x, y: h, z, s: rand(1, 1.8), ph: 0 });
    }
    const mkInst = (geo, m, list, yOff, shadow = true) => {
      const im = new THREE.InstancedMesh(geo, m, Math.max(1, list.length));
      list.forEach((p, i) => {
        dummy.position.set(p.x, p.y + yOff * p.s, p.z);
        dummy.scale.setScalar(p.s);
        dummy.rotation.y = (p.ph || 0) + i;
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.castShadow = shadow; im.receiveShadow = true;
      im.frustumCulled = false;
      im.instanceMatrix.needsUpdate = true;
      this.scene.add(im);
      return im;
    };
    this.treeMeshes = [
      mkInst(trunkG, trunkM, trunks, 2),
      mkInst(oakG, oakM, oaks, 5.4),
      mkInst(pineG, pineM, pines, 6),
      mkInst(magicG, magicM, magics, 5.2),
    ];
    this.treeCounts = [trunks.length, oaks.length, pines.length, magics.length];
    // Druga warstwa koron dębów (pełniejszy kształt)
    const oak2 = oaks.map((p) => ({ ...p, y: p.y + 1.6 * p.s, s: p.s * 0.7 }));
    this.treeMeshes.push(mkInst(oakG, oakM, oak2, 5.4));
    this.treeCounts.push(oak2.length);

    // Trawa (instancje)
    const grassG = new THREE.ConeGeometry(0.16, 0.7, 4);
    grassG.translate(0, 0.35, 0);
    const grassM = this.windify(new THREE.MeshStandardMaterial({ color: 0x66883c, roughness: 1 }), 0.16, 'grass');
    const GN = 14000;
    const grass = new THREE.InstancedMesh(grassG, grassM, GN);
    const col = new THREE.Color();
    let gi = 0; guard = 0;
    while (gi < GN && guard++ < GN * 4) {
      const x = rand(-300, 300), z = rand(-300, 300);
      if (!this.scatterOK(x, z)) continue;
      const h = groundHeight(x, z);
      if (h > 30) continue;
      dummy.position.set(x, h - 0.05, z);
      dummy.scale.set(rand(0.7, 1.6), rand(0.7, 1.8), rand(0.7, 1.6));
      dummy.rotation.y = rand(0, 3);
      dummy.updateMatrix();
      grass.setMatrixAt(gi, dummy.matrix);
      grass.setColorAt(gi, col.setHSL(0.24 + Math.random() * 0.05, 0.5, 0.3 + Math.random() * 0.15));
      gi++;
    }
    grass.count = gi;
    grass.frustumCulled = false;
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    grass.receiveShadow = true;
    this.scene.add(grass);
    this.grassMesh = grass;
    this.grassTotal = gi;

    // Kwiaty
    const flG = new THREE.IcosahedronGeometry(0.12, 0);
    const flM = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const FN = 700;
    const fl = new THREE.InstancedMesh(flG, flM, FN);
    let fi = 0; guard = 0;
    const fcols = [0xff6b9d, 0xffe27a, 0xffffff, 0xc07aff, 0xff8a5e];
    while (fi < FN && guard++ < FN * 6) {
      const x = rand(-280, 280), z = rand(-140, 290);
      if (!this.scatterOK(x, z)) continue;
      const h = groundHeight(x, z);
      if (h > 12 || h < 0) continue;
      dummy.position.set(x, h + 0.35, z);
      dummy.scale.setScalar(rand(0.7, 1.4));
      dummy.rotation.y = 0;
      dummy.updateMatrix();
      fl.setMatrixAt(fi, dummy.matrix);
      fl.setColorAt(fi, col.set(fcols[(Math.random() * fcols.length) | 0]));
      fi++;
    }
    fl.count = fi;
    fl.frustumCulled = false;
    fl.instanceMatrix.needsUpdate = true;
    if (fl.instanceColor) fl.instanceColor.needsUpdate = true;
    this.scene.add(fl);

    // Głazy
    const rockG = new THREE.DodecahedronGeometry(1, 0);
    const rockM = new THREE.MeshStandardMaterial({ map: this.T.rock, roughness: 1 });
    const RN = 220;
    const rocks = new THREE.InstancedMesh(rockG, rockM, RN);
    let ri = 0; guard = 0;
    while (ri < RN && guard++ < RN * 8) {
      const x = rand(-300, 300), z = rand(-310, 300);
      if (!this.scatterOK(x, z, true)) continue;
      const h = groundHeight(x, z);
      const s = h > 15 ? rand(1, 4) : rand(0.4, 1.4);
      dummy.position.set(x, h + s * 0.3, z);
      dummy.scale.set(s * rand(0.7, 1.3), s * rand(0.5, 1), s * rand(0.7, 1.3));
      dummy.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      dummy.updateMatrix();
      rocks.setMatrixAt(ri, dummy.matrix);
      ri++;
      if (s > 1.5) this.circ(x, z, s);
    }
    rocks.count = ri;
    rocks.frustumCulled = false;
    rocks.instanceMatrix.needsUpdate = true;
    rocks.castShadow = true; rocks.receiveShadow = true;
    this.scene.add(rocks);
  }

  // ---------- CZĄSTECZKI ----------
  buildParticles() {
    const P = (n) => Math.max(10, (n * this.particleF) | 0);
    // Fontanna
    this.emitters.push(new Emitter(this.scene, this.T.soft, P(160), {
      size: 0.35, color: 0xbfe8ff, opacity: 0.8, gravity: -9,
      spawner: (e, i) => {
        const j = i * 3;
        e.pos[j] = LOC.fountain.x + rand(-0.3, 0.3);
        e.pos[j + 1] = 4.4;
        e.pos[j + 2] = LOC.fountain.z + rand(-0.3, 0.3);
        const a = rand(0, 6.28), r = rand(0.5, 2.2);
        e.vel[j] = Math.cos(a) * r; e.vel[j + 1] = rand(1, 2.5); e.vel[j + 2] = Math.sin(a) * r;
        e.maxLife[i] = e.life[i] = rand(0.9, 1.5);
      },
    }));
    // Iskry kuźni
    this.emitters.push(new Emitter(this.scene, this.T.softWarm, P(70), {
      size: 0.3, color: 0xffaa33, opacity: 0.95, gravity: 2.5, additive: true,
      spawner: (e, i) => {
        const j = i * 3, f = this.forgeFire;
        e.pos[j] = f.x + rand(-1, 1); e.pos[j + 1] = f.y; e.pos[j + 2] = f.z + rand(-0.6, 0.6);
        e.vel[j] = rand(-0.5, 0.5); e.vel[j + 1] = rand(1.5, 3.5); e.vel[j + 2] = rand(-0.5, 0.5);
        e.maxLife[i] = e.life[i] = rand(0.5, 1.2);
      },
    }));
    // Ognisko goblinów
    const camp = { x: LOC.goblinCamp.x, y: groundHeight(LOC.goblinCamp.x, LOC.goblinCamp.z) + 1, z: LOC.goblinCamp.z };
    this.emitters.push(new Emitter(this.scene, this.T.softWarm, P(90), {
      size: 0.4, color: 0xff9944, opacity: 0.9, gravity: 2, additive: true,
      spawner: (e, i) => {
        const j = i * 3;
        e.pos[j] = camp.x + rand(-0.8, 0.8); e.pos[j + 1] = camp.y; e.pos[j + 2] = camp.z + rand(-0.8, 0.8);
        e.vel[j] = rand(-0.6, 0.6); e.vel[j + 1] = rand(1.5, 4); e.vel[j + 2] = rand(-0.6, 0.6);
        e.maxLife[i] = e.life[i] = rand(0.6, 1.4);
      },
    }));
    // Dym z kominów
    for (const s of this.smokeStacks) {
      this.emitters.push(new Emitter(this.scene, this.T.soft, P(40), {
        size: 2.2, color: 0x9aa0aa, opacity: 0.3, gravity: 1.2, drag: 0.4,
        spawner: (e, i) => {
          const j = i * 3;
          e.pos[j] = s.x + rand(-0.3, 0.3); e.pos[j + 1] = s.y; e.pos[j + 2] = s.z + rand(-0.3, 0.3);
          e.vel[j] = rand(0.4, 1); e.vel[j + 1] = rand(1, 2); e.vel[j + 2] = rand(-0.3, 0.3);
          e.maxLife[i] = e.life[i] = rand(2, 4);
        },
      }));
    }
    // Świetliki w lesie
    this.fireflies = new Emitter(this.scene, this.T.soft, P(130), {
      size: 0.32, color: 0xaaffee, opacity: 0.9, gravity: 0, additive: true,
      spawner: (e, i) => {
        const j = i * 3;
        const a = rand(0, 6.28), r = rand(5, 85);
        e.pos[j] = LOC.forest.x + Math.cos(a) * r;
        e.pos[j + 1] = groundHeight(e.pos[j], LOC.forest.z + Math.sin(a) * r * 0.85) + rand(0.5, 3);
        e.pos[j + 2] = LOC.forest.z + Math.sin(a) * r * 0.85;
        e.vel[j] = rand(-0.5, 0.5); e.vel[j + 1] = rand(-0.2, 0.2); e.vel[j + 2] = rand(-0.5, 0.5);
        e.maxLife[i] = e.life[i] = rand(3, 7);
      },
    });
    this.emitters.push(this.fireflies);
    // Magiczny pył w jaskini
    this.emitters.push(new Emitter(this.scene, this.T.soft, P(80), {
      size: 0.25, color: 0x88ccff, opacity: 0.8, gravity: 0.3, additive: true,
      spawner: (e, i) => {
        const j = i * 3;
        const a = rand(0, 6.28), r = rand(2, 20);
        e.pos[j] = LOC.caveCenter.x + Math.cos(a) * r;
        e.pos[j + 1] = 1.8 + rand(0, 6);
        e.pos[j + 2] = LOC.caveCenter.z + Math.sin(a) * r;
        e.vel[j] = rand(-0.3, 0.3); e.vel[j + 1] = rand(0.1, 0.5); e.vel[j + 2] = rand(-0.3, 0.3);
        e.maxLife[i] = e.life[i] = rand(2, 5);
      },
    }));
    // Liście / płatki na wietrze (królestwo)
    this.emitters.push(new Emitter(this.scene, this.T.soft, P(60), {
      size: 0.22, color: 0xd8e8a0, opacity: 0.7, gravity: -0.7, drag: 0.6,
      spawner: (e, i) => {
        const j = i * 3;
        e.pos[j] = rand(-70, 70); e.pos[j + 1] = rand(2, 12); e.pos[j + 2] = rand(-70, 70);
        e.vel[j] = rand(1, 3); e.vel[j + 1] = rand(-0.5, 0.2); e.vel[j + 2] = rand(-1, 1);
        e.maxLife[i] = e.life[i] = rand(3, 6);
      },
    }));
    // DESZCZ — podąża za graczem
    this.rainCenter = { x: 0, y: 0, z: 0 };
    this.rain = new Emitter(this.scene, this.T.soft, 500, {
      size: 0.16, color: 0xaaccee, opacity: 0.55, gravity: 0,
      spawner: (e, i) => {
        const j = i * 3;
        const c = this.rainCenter;
        e.pos[j] = c.x + rand(-28, 28);
        e.pos[j + 1] = c.y + rand(0, 24);
        e.pos[j + 2] = c.z + rand(-28, 28);
        e.vel[j] = 2.5; e.vel[j + 1] = rand(-26, -20); e.vel[j + 2] = 1;
        e.maxLife[i] = e.life[i] = rand(0.7, 1.1);
      },
    });
    this.rain.points.visible = false;
    this.emitters.push(this.rain);
    // Mroczne iskry portalu
    this.emitters.push(new Emitter(this.scene, this.T.soft, P(50), {
      size: 0.3, color: 0xff3355, opacity: 0.85, gravity: 1.5, additive: true,
      spawner: (e, i) => {
        const j = i * 3;
        e.pos[j] = LOC.arena.x + rand(-2, 2);
        e.pos[j + 1] = (this.arenaY || 40) + rand(0, 6);
        e.pos[j + 2] = LOC.arena.z - 12 + rand(-2, 2);
        e.vel[j] = rand(-0.5, 0.5); e.vel[j + 1] = rand(1, 3); e.vel[j + 2] = rand(-0.5, 0.5);
        e.maxLife[i] = e.life[i] = rand(1, 2.5);
      },
    }));
  }

  // ---------- ZBIERACZE ----------
  buildPickups() {
    // Księżycowe zioła w lesie
    for (let i = 0; i < 16; i++) {
      const a = rand(0, 6.28), r = rand(12, 80);
      const x = LOC.forest.x + Math.cos(a) * r, z = LOC.forest.z + Math.sin(a) * r * 0.85;
      this.addPickup('herb_moon', x, groundHeight(x, z), z);
    }
    // Słoneczne zioła na łąkach
    for (let i = 0; i < 10; i++) {
      const x = rand(-200, 200), z = rand(120, 280);
      if (!this.scatterOK(x, z)) continue;
      this.addPickup('herb_sun', x, groundHeight(x, z), z);
    }
    // Odłamki kryształu w jaskini
    for (let i = 0; i < 10; i++) {
      const a = rand(0, 6.28), r = rand(5, 20);
      this.addPickup('crystal_shard', LOC.caveCenter.x + Math.cos(a) * r, 1.5, LOC.caveCenter.z + Math.sin(a) * r);
    }
  }

  addPickup(kind, x, y, z) {
    let mesh;
    if (kind === 'herb_moon') {
      mesh = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 5),
          new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x189955, emissiveIntensity: 1.1 }));
        const a = (i / 5) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.12, 0.3, Math.sin(a) * 0.12);
        leaf.rotation.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4);
        mesh.add(leaf);
      }
      const glow = this.glowSprite(this.T.soft, 0x66ffaa, 1.6, 0.4);
      glow.position.y = 0.4;
      mesh.add(glow);
    } else if (kind === 'herb_sun') {
      mesh = new THREE.Group();
      mesh.add(this.cyl(0.04, 0.05, 0.6, this.M(0x3a6b2a), 0, 0.3, 0, 6));
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xaa7700, emissiveIntensity: 0.7 }));
      fl.position.y = 0.65;
      mesh.add(fl);
    } else {
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.35),
        new THREE.MeshStandardMaterial({ color: 0x77ddff, emissive: 0x2299dd, emissiveIntensity: 1.3, roughness: 0.2 }));
      mesh.position.y = 0.5;
      const wrap = new THREE.Group();
      wrap.add(mesh);
      const glow = this.glowSprite(this.T.soft, 0x66ccff, 1.8, 0.35);
      glow.position.y = 0.5;
      wrap.add(glow);
      mesh = wrap;
    }
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    const p = { kind, mesh, x, y, z, taken: false, respawn: 0, ph: rand(0, 9) };
    this.pickups.push(p);
    return p;
  }

  // ---------- LOGIKA RUCHU / STREFY ----------
  walkHeight(x, z) {
    // Most
    if (Math.abs(x) < BRIDGE_HALF && z > 77 && z < 111)
      return 0.5 + Math.sin(((z - 79) / 32) * Math.PI) * 0.55;
    // Wnętrza
    if (x > -12.6 && x < 12.6 && z > -64.6 && z < -39.4) return 0.42;
    if (x > -25.6 && x < -12.4 && z > -60.6 && z < -45.4) return 0.42;
    if (x > -32.5 && x < -15.5 && z > -20.5 && z < -7.5) return 0.28;
    if (dist(x, z, LOC.caveCenter.x, LOC.caveCenter.z) < 27) return 1.5;
    return groundHeight(x, z);
  }

  inDeepWater(x, z) {
    const sq = sqDist(x, z);
    if (sq > MOAT_IN && sq < MOAT_OUT) {
      const onBridge = Math.abs(x) < BRIDGE_HALF + 0.4 && z > 70 && z < 115;
      return !onBridge;
    }
    if (dist(x, z, LOC.forestPond.x, LOC.forestPond.z) < 14.5) return true;
    return false;
  }

  tryMove(p, dx, dz, radius = 0.6, curY = 0) {
    // p: {x, z} — mutowane; zwraca {blocked}
    let blocked = false;
    const attempt = (nx, nz) => {
      if (Math.abs(nx) > WORLD_HALF || Math.abs(nz) > WORLD_HALF) return false;
      if (this.inDeepWater(nx, nz)) return false;
      for (const r of this.rects) {
        if (nx + radius > r.x1 && nx - radius < r.x2 && nz + radius > r.z1 && nz - radius < r.z2) return false;
      }
      for (const c of this.circles) {
        const d2 = (nx - c.x) * (nx - c.x) + (nz - c.z) * (nz - c.z);
        if (d2 < (c.r + radius) * (c.r + radius)) return false;
      }
      // zbyt strome podejście
      const nh = this.walkHeight(nx, nz);
      if (nh - curY > 1.5) return false;
      if (curY - nh > 6) return false; // nie skacz w przepaść
      return true;
    };
    if (attempt(p.x + dx, p.z)) p.x += dx; else blocked = true;
    if (attempt(p.x, p.z + dz)) p.z += dz; else blocked = true;
    return { blocked };
  }

  zoneAt(x, z) {
    if (dist(x, z, LOC.caveCenter.x, LOC.caveCenter.z) < 34) return 'cave';
    if (dist(x, z, LOC.arena.x, LOC.arena.z) < 32) return 'arena';
    if (dist(x, z, LOC.ruins.x, LOC.ruins.z) < 32) return 'ruins';
    if (z < -125) return 'mountains';
    if (dist(x, z, LOC.forest.x, LOC.forest.z) < 100) return 'forest';
    if (sqDist(x, z) < MOAT_IN) {
      if (x > -28 && x < 18 && z > -68 && z < -34) return 'castle';
      if (dist(x, z, 0, 5) < 30) return 'market';
      if (x > -34 && x < -14 && z > -22 && z < -6) return 'tavern';
      return 'kingdom';
    }
    if (dist(x, z, LOC.farm.x, LOC.farm.z) < 36) return 'farm';
    return 'wild';
  }

  // ---------- JAKOŚĆ ----------
  setShadow(extent, size) {
    const c = this.sun.shadow.camera;
    c.left = -extent; c.right = extent; c.top = extent; c.bottom = -extent;
    c.updateProjectionMatrix();
    this.sun.shadow.mapSize.set(size, size);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
  }

  // Tryb low: wyłącza cienie drobiazgów (poza postaciami) — duży zysk FPS
  applyShadowDetail(full) {
    if (this._shadowFull === full) return;
    this._shadowFull = full;
    const walk = (obj, underActor) => {
      const ua = underActor || !!obj.userData.actor;
      if (obj.isMesh && !obj.isInstancedMesh && !ua) {
        if (obj.userData.origShadow === undefined) obj.userData.origShadow = obj.castShadow;
        if (full) obj.castShadow = obj.userData.origShadow;
        else {
          const geo = obj.geometry;
          if (!geo.boundingSphere) geo.computeBoundingSphere();
          const r = geo.boundingSphere.radius * Math.max(obj.scale.x, obj.scale.y, obj.scale.z);
          obj.castShadow = obj.userData.origShadow && r >= 1.1;
        }
      }
      for (const ch of obj.children) walk(ch, ua);
    };
    walk(this.scene, false);
  }

  applyQuality(name) {
    this.qualityName = name;
    const q = {
      low: { grass: 1500, trees: 0.5, particles: 0.35, clouds: 3, shadow: 1024, extent: 60, rain: 150 },
      medium: { grass: 7000, trees: 0.8, particles: 0.7, clouds: 7, shadow: 2048, extent: 95, rain: 350 },
      high: { grass: 11000, trees: 1, particles: 1, clouds: 10, shadow: 2048, extent: 110, rain: 500 },
      ultra: { grass: 14000, trees: 1, particles: 1.3, clouds: 14, shadow: 4096, extent: 130, rain: 500 },
    }[name] || {};
    this.particleF = q.particles;
    if (this.grassMesh) this.grassMesh.count = Math.min(this.grassTotal, q.grass);
    if (this.treeMeshes) this.treeMeshes.forEach((m, i) => { m.count = Math.max(10, (this.treeCounts[i] * q.trees) | 0); });
    this._grassBase = Math.min(this.grassTotal || 0, q.grass);
    this._treeBase = (this.treeCounts || []).map((c) => Math.max(10, (c * q.trees) | 0));
    if (this._vegScale) this.setVegScale(this._vegScale);
    if (this.sun) this.setShadow(q.extent, q.shadow);
    this.clouds.forEach((c, i) => { c.s.visible = i < q.clouds; });
    if (this.lights.wizard) this.lights.wizard.visible = name !== 'low';
    if (this.lights.fountain) this.lights.fountain.visible = name !== 'low';
    if (this.lights.cave2) this.lights.cave2.visible = name === 'high' || name === 'ultra';
    if (this.lights.ruins) this.lights.ruins.visible = name !== 'low';
    this.applyShadowDetail(name !== 'low');
    // emitery: przeskaluj drawRange proporcjonalnie
    for (const e of this.emitters) {
      if (e === this.rain) e.setCount(q.rain);
      else e.setCount(e.count * Math.min(1, q.particles));
    }
  }

  // Gubernator FPS: płynne skalowanie gęstości roślinności (0.3..1)
  setVegScale(f) {
    this._vegScale = f;
    if (this.grassMesh && this._grassBase) this.grassMesh.count = Math.max(300, (this._grassBase * f) | 0);
    if (this.treeMeshes && this._treeBase) this.treeMeshes.forEach((m, i) => { m.count = Math.max(10, (this._treeBase[i] * f) | 0); });
  }

  // ---------- AKTUALIZACJA ----------
  update(dt, t, playerPos) {
    this.time = t;
    this.uTime.value = t;
    this.dayT = (this.dayT + dt / DAY_LENGTH) % 1;
    // --- POGODA ---
    const W = this.weather;
    W.t += dt;
    if (W.t > W.next) {
      W.t = 0;
      if (W.mode === 'clear') {
        W.mode = 'rain'; W.next = 25 + Math.random() * 40;
        this.onWeatherChange && this.onWeatherChange('rain');
      } else {
        W.mode = 'clear'; W.next = 80 + Math.random() * 140;
        this.onWeatherChange && this.onWeatherChange('clear');
      }
    }
    const raining = W.mode === 'rain';
    W.flash = Math.max(0, W.flash - dt * 1.4);
    if (raining && Math.random() < dt * 0.12 && W.flash <= 0) {
      W.flash = 1;
      this.onThunder && this.onThunder();
    }
    const ang = this.dayT * Math.PI * 2 - Math.PI / 2; // 0 = wschód
    const sunH = Math.sin(ang); // wysokość słońca
    const dayF = smoothstep(-0.08, 0.25, sunH);
    const duskF = clamp(1 - Math.abs(sunH) * 4, 0, 1);
    this.nightF = 1 - dayF;
    this.isNight = this.nightF > 0.6;

    // Słońce / księżyc
    const sd = new THREE.Vector3(Math.cos(ang), Math.max(0.06, sunH), 0.35).normalize();
    if (playerPos) {
      this.sun.position.set(playerPos.x + sd.x * 220, sd.y * 220 + 20, playerPos.z + sd.z * 220);
      this.sun.target.position.set(playerPos.x, 0, playerPos.z);
      this.sky.position.set(playerPos.x, 0, playerPos.z);
      this.stars.position.set(playerPos.x, 0, playerPos.z);
    }
    const sunCol = new THREE.Color().setHSL(0.1, 0.5, 0.5 + dayF * 0.5);
    if (duskF > 0.3 && dayF < 0.7) sunCol.setHSL(0.05, 0.85, 0.55);
    this.sun.color.copy(sunCol);
    this.sun.intensity = (0.12 + dayF * 2.6) * (raining ? 0.45 : 1);
    this.hemi.intensity = (0.18 + dayF * 0.75) * (raining ? 0.8 : 1) + W.flash * 2.2;
    this.hemi.color.setHSL(0.6, 0.4, 0.25 + dayF * 0.55);
    this.amb.intensity = 0.1 + dayF * 0.06;

    // Niebo
    const top = new THREE.Color(), mid = new THREE.Color(), bot = new THREE.Color();
    if (dayF > 0.5) {
      top.set(0x2f66b0); mid.set(0x9dc3e8); bot.set(0xdfe9f2);
    } else if (duskF > 0.25) {
      top.set(0x2a3a6b); mid.set(0xd06a3a); bot.set(0xffc37a);
    } else {
      top.set(0x050914); mid.set(0x0d1830); bot.set(0x1a2a44);
    }
    this.skyU.top.value.lerp(top, 0.05);
    this.skyU.mid.value.lerp(mid, 0.05);
    this.skyU.bot.value.lerp(bot, 0.05);
    this.skyU.sunDir.value.copy(sd);
    this.starMat.opacity += (((this.isNight && !raining) ? 0.9 : 0) - this.starMat.opacity) * 0.03;
    this.scene.fog.color.copy(mid).lerp(bot, 0.4);
    if (this.isNight) this.scene.fog.color.set(0x0d1626);
    if (raining) this.scene.fog.color.lerp(new THREE.Color(0x5a6a7a), 0.5);
    if (this._baseFogFar === undefined) this._baseFogFar = this.scene.fog.far;
    const wantFar = this._baseFogFar * (raining ? 0.55 : 1);
    this.scene.fog.far += (wantFar - this.scene.fog.far) * Math.min(1, dt * 0.8);
    // deszcz podąża za graczem, znika we wnętrzach
    if (this.rain && playerPos) {
      this.rainCenter.x = playerPos.x; this.rainCenter.y = playerPos.y; this.rainCenter.z = playerPos.z;
      const zn = this.zoneAt(playerPos.x, playerPos.z);
      const interior = zn === 'castle' || zn === 'tavern' || zn === 'cave';
      this.rain.points.visible = raining && !interior;
      this.rain.active = raining && !interior;
    }
    // Sprite'y słońca/księżyca
    if (playerPos) {
      this.sunSpr.position.set(playerPos.x + sd.x * 800, Math.max(30, sd.y * 800), playerPos.z + sd.z * 800);
      this.sunSpr.material.opacity = dayF;
      this.moonSpr.position.set(playerPos.x - sd.x * 800, Math.max(60, -sd.y * 800), playerPos.z - sd.z * 800);
      this.moonSpr.material.opacity = this.nightF * 0.9;
    }

    // Okna w nocy
    const winI = 0.15 + this.nightF * 1.6;
    for (const m of this.windowMats) m.emissiveIntensity = winI;

    // Woda
    if (this.waterMat.map) {
      this.waterMat.map.offset.x = (t * 0.008) % 1;
      this.waterMat.map.offset.y = (t * 0.013) % 1;
    }
    if (this.sparkMat) {
      this.sparkMat.map.offset.x = (0.5 - t * 0.011) % 1;
      this.sparkMat.map.offset.y = (t * 0.017) % 1;
      this.sparkMat.opacity = 0.1 + dayF * 0.12;
    }
    if (this.fountainWater) this.fountainWater.rotation.z = t * 0.4;
    if (this.fountainTop) { this.fountainTop.rotation.y = t * 0.8; this.fountainTop.position.y = 4.2 + Math.sin(t * 2) * 0.08; }
    if (this.pondGlow) this.pondGlow.material.opacity = 0.18 + Math.sin(t * 1.5) * 0.08 + this.nightF * 0.15;

    // Płomienie
    for (const f of this.flames) {
      const s = f.base * (1 + Math.sin(t * 13 + f.ph) * 0.12 + Math.sin(t * 31 + f.ph * 2) * 0.06);
      f.sprite.scale.set(s * 0.8, s * 1.2, 1);
      if (f.halo) f.halo.material.opacity = 0.3 + this.nightF * 0.25 + Math.sin(t * 9 + f.ph) * 0.05;
    }
    // Flagi
    for (const f of this.flags) {
      const p = f.mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const bx = f.base[i * 3];
        const k = bx / f.w;
        p.setZ(i, Math.sin(t * 5 + bx * 3) * 0.14 * k + Math.sin(t * 9 + bx * 6) * 0.05 * k);
      }
      p.needsUpdate = true;
    }
    // Trzciny
    if (this.reeds) {
      for (const r of this.reeds) r.m.rotation.x = Math.sin(t * 1.8 + r.ph) * 0.06;
    }
    // Kryształy ruin i portalu
    if (this.ruinCrystal) {
      this.ruinCrystal.rotation.y = t * 0.7;
      this.ruinCrystal.position.y = 0.6 + 2.2 + Math.sin(t * 1.6) * 0.15;
    }
    if (this.portalCrystal) {
      this.portalCrystal.rotation.y = -t * 0.5;
      this.portalCrystal.position.y = (this.arenaY || 40) + 3.5 + Math.sin(t * 1.2) * 0.2;
    }
    if (this.ruinRing) this.ruinRing.rotation.z = t * 0.1;
    // Wiatrak
    if (this.windmillBlades) this.windmillBlades.rotation.z = t * 0.5;
    // Kula czarodzieja
    if (this.wizardOrb) {
      this.wizardOrb.position.y = 24 + Math.sin(t * 1.4) * 0.25;
      this.wizardOrb.rotation.y = t;
    }
    // Kryształy — pulsowanie
    if (this.crystals) {
      for (let i = 0; i < this.crystals.length; i++) {
        this.crystals[i].rotation.y = t * 0.4 + i;
      }
    }
    // Szyld karczmy — kołysanie
    if (this.tavernSign) this.tavernSign.rotation.x = Math.sin(t * 1.2) * 0.08;

    // Chmury
    for (const c of this.clouds) {
      c.s.position.x += c.v * dt * (raining ? 2.2 : 1);
      if (c.s.position.x > 550) c.s.position.x = -550;
      c.s.material.opacity = 0.15 + dayF * 0.4;
      const cc = raining ? 0.45 : 1;
      c.s.material.color.setScalar(cc);
    }
    // Ptaki (tylko w dzień)
    for (const b of this.birds) {
      b.ph += b.sp * dt;
      const px = (playerPos ? playerPos.x * 0.3 : 0) + b.cx + Math.cos(b.ph) * b.r;
      const pz = (playerPos ? playerPos.z * 0.3 : 0) + b.cz + Math.sin(b.ph) * b.r;
      b.s.position.set(px, b.h + Math.sin(t * 2 + b.ph * 5) * 3, pz);
      b.s.material.opacity = dayF * 0.8;
      b.s.scale.x = 2.2 + Math.sin(t * 10 + b.ph * 8) * 0.9; // machanie
    }

    // Emitery
    for (const e of this.emitters) e.update(dt);
    if (this.fireflies) this.fireflies.mat.opacity = 0.35 + this.nightF * 0.6;

    // Pickupy — animacja i respawn
    for (const p of this.pickups) {
      if (p.taken) {
        p.respawn -= dt;
        if (p.respawn <= 0) { p.taken = false; p.mesh.visible = true; }
        continue;
      }
      p.mesh.rotation.y = t * 1.2 + p.ph;
      p.mesh.position.y = p.y + Math.sin(t * 2 + p.ph) * 0.08 + (p.kind === 'crystal_shard' ? 0 : 0);
    }
  }
}
