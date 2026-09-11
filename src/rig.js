// Proceduralne modele postaci (humanoidy i czworonogi) z animacjami.
// Geometrie i materiały są współdzielone (cache) dla wydajności.
import * as THREE from 'three';

const geoCache = new Map();
const matCache = new Map();

function mat(color, opts = {}) {
  const key = color + '|' + (opts.metalness || 0) + '|' + (opts.roughness ?? 0.85) + '|' +
    (opts.emissive || 0) + '|' + (opts.emissiveIntensity || 0) + '|' + (opts.transparent ? 1 : 0) +
    '|' + (opts.opacity ?? 1) + '|' + (opts.side || 0) + '|' + (opts.flatShading ? 1 : 0);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
    matCache.set(key, m);
  }
  return m;
}
function boxGeo(w, h, d) {
  const key = `b${w},${h},${d}`;
  let g = geoCache.get(key);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geoCache.set(key, g); }
  return g;
}
function cylGeo(rt, rb, h, seg = 10) {
  const key = `c${rt},${rb},${h},${seg}`;
  let g = geoCache.get(key);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg); geoCache.set(key, g); }
  return g;
}
function sphGeo(r, w = 12, h = 10) {
  const key = `s${r},${w},${h}`;
  let g = geoCache.get(key);
  if (!g) { g = new THREE.SphereGeometry(r, w, h); geoCache.set(key, g); }
  return g;
}
function coneGeo(r, h, seg = 8) {
  const key = `k${r},${h},${seg}`;
  let g = geoCache.get(key);
  if (!g) { g = new THREE.ConeGeometry(r, h, seg); geoCache.set(key, g); }
  return g;
}
function box(w, h, d, m) {
  const ms = new THREE.Mesh(boxGeo(w, h, d), m);
  ms.castShadow = true; ms.receiveShadow = true;
  return ms;
}
function cyl(rt, rb, h, m, seg = 10) {
  const ms = new THREE.Mesh(cylGeo(rt, rb, h, seg), m);
  ms.castShadow = true; ms.receiveShadow = true;
  return ms;
}
function sph(r, m, w = 12, h = 10) {
  const ms = new THREE.Mesh(sphGeo(r, w, h), m);
  ms.castShadow = true; ms.receiveShadow = true;
  return ms;
}
function coneM(r, h, m, seg = 8) {
  const ms = new THREE.Mesh(coneGeo(r, h, seg), m);
  ms.castShadow = true; ms.receiveShadow = true;
  return ms;
}
function pivot(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

// o = { skin, shirt, pants, boots, helmet, hood, crown, wizardHat, beard, armor,
//        cape, female, hair, scale, sword, greatsword, hammer, staff, spear, shield,
//        robe, cap, glowingEyes, dark }
export function createHumanoid(o = {}) {
  const s = o.scale || 1;
  const g = new THREE.Group();
  g.userData.actor = true;
  const skin = mat(o.skin ?? 0xd9a066);
  const shirt = mat(o.shirt ?? 0x4a5a7a);
  const pants = mat(o.pants ?? 0x3a3040);
  const boots = mat(o.boots ?? 0x2c1e12);
  const gloveM = o.dark ? mat(0x1a1a20) : boots;

  // Nogi
  const legL = pivot(-0.13, 0.86, 0), legR = pivot(0.13, 0.86, 0);
  for (const leg of [legL, legR]) {
    const thigh = box(0.2, 0.42, 0.22, pants); thigh.position.y = -0.21; leg.add(thigh);
    const knee = box(0.21, 0.1, 0.23, o.armor ? mat(0x8a8f98, { metalness: 0.7, roughness: 0.4 }) : pants);
    knee.position.y = -0.45; leg.add(knee);
    const shin = box(0.18, 0.2, 0.2, pants); shin.position.y = -0.56; leg.add(shin);
    const boot = box(0.21, 0.22, 0.32, boots); boot.position.set(0, -0.75, 0.04); leg.add(boot);
    g.add(leg);
  }
  // Tułów
  const hips = pivot(0, 0.86, 0); g.add(hips);
  const chestM = o.armor ? mat(o.dark ? 0x2a2a33 : 0x9aa0aa, { metalness: 0.75, roughness: 0.35 }) : shirt;
  const torso = box(0.52, 0.62, 0.3, chestM);
  torso.position.y = 0.33; hips.add(torso);
  if (o.armor) {
    // zdobienia zbroi
    const trim = box(0.54, 0.08, 0.32, mat(o.dark ? 0x7a1010 : 0xd8a83c, { metalness: 0.6, roughness: 0.4 }));
    trim.position.y = 0.52; hips.add(trim);
    for (const sx of [-1, 1]) {
      const pad = sph(0.13, chestM); pad.position.set(sx * 0.3, 0.6, 0); hips.add(pad);
    }
  }
  // Pas + sprzączka
  const belt = box(0.54, 0.09, 0.32, boots); belt.position.y = 0.06; hips.add(belt);
  const buckle = box(0.12, 0.07, 0.03, mat(0xd8a83c, { metalness: 0.7, roughness: 0.35 }));
  buckle.position.set(0, 0.06, 0.17); hips.add(buckle);
  // Spódnica / szata
  if (o.female && !o.robe) {
    const skirt = cyl(0.3, 0.44, 0.55, mat(o.skirt ?? 0x6b3a4a)); skirt.position.y = -0.2; hips.add(skirt);
  }
  if (o.robe) {
    const robe = cyl(0.34, 0.48, 0.95, mat(o.robe)); robe.position.y = 0.18; hips.add(robe);
    const collar = cyl(0.24, 0.3, 0.18, mat(o.robe)); collar.position.y = 0.68; hips.add(collar);
  }
  // Peleryna (z segmentami do falowania)
  let cape = null;
  if (o.cape) {
    cape = new THREE.Mesh(boxGeo(0.55, 0.95, 0.03),
      new THREE.MeshStandardMaterial({ color: o.cape, roughness: 0.9 }));
    cape.position.set(0, 0.12, -0.2); cape.rotation.x = 0.12;
    cape.castShadow = true;
    hips.add(cape);
    const clasp = sph(0.05, mat(0xd8a83c, { metalness: 0.7, roughness: 0.3 }), 8, 6);
    clasp.position.set(0, 0.58, 0.16); hips.add(clasp);
  }
  // Ramiona
  const armL = pivot(-0.34, 0.58, 0), armR = pivot(0.34, 0.58, 0);
  hips.add(armL, armR);
  for (const arm of [armL, armR]) {
    const a = box(0.15, 0.34, 0.17, o.armor ? chestM : shirt);
    a.position.y = -0.16; arm.add(a);
    const cuff = box(0.16, 0.08, 0.18, gloveM); cuff.position.y = -0.36; arm.add(cuff);
    const fore = box(0.13, 0.14, 0.15, o.armor ? chestM : skin); fore.position.y = -0.44; arm.add(fore);
    const hand = sph(0.085, o.armor || o.dark ? gloveM : skin, 8, 8); hand.position.y = -0.55; arm.add(hand);
  }
  // Broń w prawej dłoni
  let weaponMesh = null;
  const handR = pivot(0, -0.55, 0); armR.add(handR);
  const bladeM = mat(o.dark ? 0x3a0a0a : 0xd5dae2, { metalness: 0.9, roughness: 0.2, emissive: o.dark ? 0x550000 : 0, emissiveIntensity: o.dark ? 1 : 0 });
  if (o.sword || o.greatsword) {
    const big = !!o.greatsword;
    weaponMesh = new THREE.Group();
    const blade = box(big ? 0.11 : 0.07, big ? 1.25 : 0.85, 0.03, bladeM);
    blade.position.y = big ? 0.72 : 0.5; weaponMesh.add(blade);
    const fuller = box(0.02, big ? 1.1 : 0.7, 0.035, mat(0x8a8f98, { metalness: 0.9, roughness: 0.3 }));
    fuller.position.y = big ? 0.68 : 0.48; weaponMesh.add(fuller);
    const guard = box(big ? 0.34 : 0.22, 0.05, 0.07, mat(0x8a6a1f, { metalness: 0.6, roughness: 0.4 }));
    guard.position.y = 0.06; weaponMesh.add(guard);
    const grip = cyl(0.028, 0.028, big ? 0.24 : 0.14, boots); grip.position.y = -0.04; weaponMesh.add(grip);
    const pommel = sph(0.045, mat(0x8a6a1f, { metalness: 0.6, roughness: 0.4 }), 8, 6);
    pommel.position.y = big ? -0.17 : -0.12; weaponMesh.add(pommel);
    weaponMesh.rotation.x = -Math.PI / 2 + 0.4;
    handR.add(weaponMesh);
  }
  if (o.hammer) {
    weaponMesh = new THREE.Group();
    const handle = cyl(0.03, 0.035, 0.7, mat(0x5a4020)); weaponMesh.add(handle);
    const head = box(0.34, 0.18, 0.18, mat(0x55555e, { metalness: 0.7, roughness: 0.4 }));
    head.position.y = 0.4; weaponMesh.add(head);
    weaponMesh.rotation.x = -Math.PI / 2 + 0.5;
    handR.add(weaponMesh);
  }
  if (o.staff) {
    weaponMesh = new THREE.Group();
    const pole = cyl(0.03, 0.035, 1.7, mat(0x5a4020)); weaponMesh.add(pole);
    // rzeźbione sęki
    for (let i = 0; i < 3; i++) {
      const knot = sph(0.045, mat(0x4a3018), 6, 6); knot.position.y = -0.4 + i * 0.4; weaponMesh.add(knot);
    }
    const orbM = new THREE.MeshStandardMaterial({ color: 0x66d0ff, emissive: 0x2299dd, emissiveIntensity: 1.6, roughness: 0.2 });
    const orb = new THREE.Mesh(sphGeo(0.09), orbM); orb.position.y = 0.95; weaponMesh.add(orb);
    const claw1 = coneM(0.02, 0.14, mat(0x8a6a1f, { metalness: 0.6 })); claw1.position.set(0.08, 0.88, 0); claw1.rotation.z = -0.5; weaponMesh.add(claw1);
    const claw2 = coneM(0.02, 0.14, mat(0x8a6a1f, { metalness: 0.6 })); claw2.position.set(-0.08, 0.88, 0); claw2.rotation.z = 0.5; weaponMesh.add(claw2);
    weaponMesh.position.y = -0.2;
    handR.add(weaponMesh);
  }
  if (o.spear) {
    weaponMesh = new THREE.Group();
    const pole = cyl(0.025, 0.028, 2.1, mat(0x6b4e2e)); weaponMesh.add(pole);
    const wrap = cyl(0.032, 0.032, 0.2, mat(0x7a2a1a)); wrap.position.y = -0.3; weaponMesh.add(wrap);
    const tip = new THREE.Mesh(coneGeo(0.06, 0.26), mat(0xd5dae2, { metalness: 0.9, roughness: 0.25 }));
    tip.position.y = 1.16; tip.castShadow = true; weaponMesh.add(tip);
    weaponMesh.position.y = -0.2;
    handR.add(weaponMesh);
  }
  // Pochwa na miecz (lewe biodro)
  if (o.sword) {
    const scab = box(0.1, 0.8, 0.06, mat(0x3a2412));
    scab.position.set(-0.32, -0.25, 0.05); scab.rotation.z = 0.25;
    hips.add(scab);
    const scabTip = box(0.11, 0.08, 0.07, mat(0x8a6a1f, { metalness: 0.6 }));
    scabTip.position.set(-0.42, -0.6, 0.05); scabTip.rotation.z = 0.25;
    hips.add(scabTip);
  }
  // Tarcza
  if (o.shield) {
    const sh = cyl(0.27, 0.27, 0.05, mat(o.dark ? 0x1a1a20 : 0x7a2a1a, { metalness: 0.3, roughness: 0.5 }), 16);
    sh.rotation.z = Math.PI / 2; sh.position.set(0, -0.35, 0.1);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 6, 18), mat(0x8a6a1f, { metalness: 0.6 }));
    rim.rotation.y = Math.PI / 2; rim.position.set(0, -0.35, 0.1);
    const boss = sph(0.07, mat(0xd5dae2, { metalness: 0.85, roughness: 0.3 }), 8, 6);
    boss.position.set(0, -0.35, 0.2);
    armL.add(sh, rim, boss);
  }
  // Głowa
  const neck = pivot(0, 0.68, 0); hips.add(neck);
  const head = sph(0.21, skin, 16, 14); head.position.y = 0.22; neck.add(head);
  // Nos + uszy
  const nose = coneM(0.035, 0.09, skin, 6);
  nose.position.set(0, 0.2, 0.21); nose.rotation.x = Math.PI / 2 + 0.2; neck.add(nose);
  for (const sx of [-1, 1]) {
    const ear = sph(0.045, skin, 6, 6); ear.position.set(sx * 0.2, 0.22, 0); neck.add(ear);
  }
  // Oczy: białko + tęczówka + źrenica (zapamiętane do mrugania)
  const whiteM = mat(0xf2ede2, { roughness: 0.25 });
  const pupilM = o.glowingEyes ? mat(0xff2222, { emissive: 0xcc0000, emissiveIntensity: 2 }) : mat(0x201510, { roughness: 0.2 });
  const irisM = o.glowingEyes ? pupilM : mat(o.eyeColor ?? 0x4a2c14, { roughness: 0.3 });
  const eyeMeshes = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(sphGeo(o.glowingEyes ? 0.045 : 0.042, 8, 8), whiteM);
    w.position.set(sx * 0.082, 0.26, 0.175); neck.add(w); eyeMeshes.push(w);
    const iris = new THREE.Mesh(sphGeo(0.03, 8, 8), irisM);
    iris.position.set(sx * 0.082, 0.26, 0.19); neck.add(iris); eyeMeshes.push(iris);
    const p = new THREE.Mesh(sphGeo(o.glowingEyes ? 0.024 : 0.02, 6, 6), pupilM);
    p.position.set(sx * 0.082, 0.26, 0.21); neck.add(p); eyeMeshes.push(p);
    // brew
    const brow = box(0.07, 0.018, 0.02, mat(o.hair ?? 0x3a2a1a));
    brow.position.set(sx * 0.082, 0.325, 0.185); brow.rotation.z = -sx * 0.12; neck.add(brow);
  }
  // Usta
  const mouth = box(0.07, 0.012, 0.01, mat(0x8a4a3a));
  mouth.position.set(0, 0.13, 0.195); neck.add(mouth);
  // Włosy / nakrycia głowy
  if (o.hair) {
    const h = sph(0.215, mat(o.hair), 14, 10); h.position.set(0, 0.27, -0.02); h.scale.set(1, 0.75, 1); neck.add(h);
    // grzywka
    const fringe = sph(0.21, mat(o.hair), 12, 6); fringe.position.set(0, 0.33, 0.06); fringe.scale.set(1, 0.4, 0.8); neck.add(fringe);
    if (o.female) {
      const bun = sph(0.08, mat(o.hair)); bun.position.set(0, 0.32, -0.2); neck.add(bun);
      for (const sx of [-1, 1]) {
        const lock = cyl(0.045, 0.03, 0.35, mat(o.hair), 8); lock.position.set(sx * 0.17, 0.05, -0.1); neck.add(lock);
      }
    }
  }
  if (o.helmet) {
    const helmM = mat(o.dark ? 0x2a2a33 : 0xb8bec8, { metalness: 0.8, roughness: 0.3 });
    const helm = sph(0.235, helmM, 16, 12);
    helm.position.y = 0.26; helm.scale.set(1, 0.85, 1); neck.add(helm);
    // nosal
    const nasal = box(0.05, 0.14, 0.03, helmM); nasal.position.set(0, 0.19, 0.21); neck.add(nasal);
    // policzki
    for (const sx of [-1, 1]) {
      const cheek = box(0.03, 0.12, 0.12, helmM); cheek.position.set(sx * 0.2, 0.14, 0.08); neck.add(cheek);
    }
    if (!o.dark) {
      const plume = box(0.06, 0.1, 0.32, mat(0xc02020)); plume.position.set(0, 0.46, -0.04); neck.add(plume);
      const plumeBase = box(0.08, 0.05, 0.34, mat(0x8a6a1f, { metalness: 0.6 })); plumeBase.position.set(0, 0.42, -0.04); neck.add(plumeBase);
    } else {
      // rogi mrocznego rycerza
      for (const sx of [-1, 1]) {
        const horn = coneM(0.045, 0.3, helmM, 6);
        horn.position.set(sx * 0.16, 0.5, -0.02); horn.rotation.z = -sx * 0.5; neck.add(horn);
      }
    }
  }
  if (o.hood) {
    const hood = new THREE.Mesh(coneGeo(0.27, 0.46, 10), mat(o.hood, { side: THREE.DoubleSide }));
    hood.position.y = 0.38; hood.castShadow = true; neck.add(hood);
  }
  if (o.crown) {
    const crM = mat(0xe8b64c, { metalness: 0.85, roughness: 0.3 });
    const cr = cyl(0.2, 0.22, 0.12, crM, 10); cr.position.y = 0.44; neck.add(cr);
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(coneGeo(0.032, 0.1, 6), crM);
      const a = (i / 6) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.19, 0.54, Math.sin(a) * 0.19);
      neck.add(spike);
    }
    const gem = sph(0.035, mat(0xc02020, { emissive: 0x550000, emissiveIntensity: 0.8 }), 8, 6);
    gem.position.set(0, 0.44, 0.21); neck.add(gem);
  }
  if (o.wizardHat) {
    const hatM = mat(0x2a3a6b);
    const brim = cyl(0.3, 0.32, 0.05, hatM, 12); brim.position.y = 0.4; neck.add(brim);
    const band = cyl(0.21, 0.23, 0.07, mat(0xd8a83c, { metalness: 0.6 }), 12); band.position.y = 0.44; neck.add(band);
    const cone = new THREE.Mesh(coneGeo(0.2, 0.52, 12), hatM);
    cone.position.y = 0.66; cone.rotation.z = 0.12; cone.castShadow = true; neck.add(cone);
    const star = sph(0.04, mat(0xffe27a, { emissive: 0xcc9900, emissiveIntensity: 1.2 }), 8, 6);
    star.position.set(0.06, 0.9, 0); neck.add(star);
  }
  if (o.beard) {
    const b = new THREE.Mesh(coneGeo(0.15, 0.42, 8), mat(o.beard));
    b.position.set(0, 0.0, 0.12); b.rotation.x = 0.25; b.castShadow = true; neck.add(b);
    const must = box(0.14, 0.03, 0.03, mat(o.beard)); must.position.set(0, 0.1, 0.19); neck.add(must);
  }
  if (o.cap) {
    const capM = cyl(0.2, 0.23, 0.1, mat(o.cap), 10); capM.position.y = 0.42; neck.add(capM);
    const peak = box(0.2, 0.03, 0.14, mat(o.cap)); peak.position.set(0, 0.39, 0.22); neck.add(peak);
  }

  g.scale.setScalar(s);

  const rig = {
    group: g, hips, neck, armL, armR, legL, legR, cape, weaponMesh, handR,
    walkPhase: Math.random() * 10,
    blinkOff: Math.random() * 10,
    alive(t) { // mruganie + oddech — wołane co klatkę
      const bl = (t + this.blinkOff) % 4.1;
      const shut = bl < 0.13 ? 0.1 : 1;
      for (const e of eyeMeshes) e.scale.y = shut;
      const b = 1 + Math.sin(t * 1.7 + this.blinkOff) * 0.02;
      torso.scale.set(b, 1, b);
    },
    reset() {
      legL.rotation.set(0, 0, 0); legR.rotation.set(0, 0, 0);
      armL.rotation.set(0, 0, 0); armR.rotation.set(0, 0, 0);
      hips.rotation.set(0, 0, 0); hips.position.set(0, 0.86, 0);
      neck.rotation.set(0, 0, 0);
    },
    setWalk(phase, amp = 1) {
      const s1 = Math.sin(phase) * 0.62 * amp, s2 = Math.sin(phase + Math.PI) * 0.62 * amp;
      legL.rotation.x = s1; legR.rotation.x = s2;
      legL.rotation.z = 0.02; legR.rotation.z = -0.02;
      armL.rotation.x = s2 * 0.65; armR.rotation.x = s1 * 0.65;
      armL.rotation.z = 0.08; armR.rotation.z = -0.08;
      hips.position.y = 0.86 + Math.abs(Math.cos(phase)) * 0.045 * amp;
      hips.position.x = Math.sin(phase) * 0.02 * amp;
      hips.rotation.y = Math.sin(phase) * 0.06 * amp;
      hips.rotation.x = 0.06 * amp; // lekkie pochylenie
      neck.rotation.x = -0.05;
      if (cape) { cape.rotation.x = 0.12 + amp * 0.45 + Math.sin(phase * 2) * 0.05; cape.position.z = -0.2 - amp * 0.04; }
    },
    setRun(phase) {
      const s1 = Math.sin(phase) * 0.95, s2 = Math.sin(phase + Math.PI) * 0.95;
      legL.rotation.x = s1; legR.rotation.x = s2;
      armL.rotation.x = s2 * 0.9; armR.rotation.x = s1 * 0.9;
      armL.rotation.z = 0.15; armR.rotation.z = -0.15;
      hips.position.y = 0.88 + Math.abs(Math.cos(phase)) * 0.08;
      hips.rotation.x = 0.22; // mocne pochylenie
      hips.rotation.y = Math.sin(phase) * 0.09;
      neck.rotation.x = -0.18;
      if (cape) { cape.rotation.x = 1.0 + Math.sin(phase * 2) * 0.12; cape.position.z = -0.28; }
    },
    setIdle(t) {
      legL.rotation.x *= 0.85; legR.rotation.x *= 0.85;
      armL.rotation.x = Math.sin(t * 1.4) * 0.05 - 0.05;
      armR.rotation.x = Math.sin(t * 1.4 + 1) * 0.05 - 0.05;
      armL.rotation.z = 0.06; armR.rotation.z = -0.06;
      hips.position.y = 0.86 + Math.sin(t * 1.8) * 0.015;
      hips.position.x = Math.sin(t * 0.5) * 0.02; // przenoszenie ciężaru
      hips.rotation.x = 0; hips.rotation.y = Math.sin(t * 0.3) * 0.03;
      neck.rotation.y = Math.sin(t * 0.4) * 0.28;
      neck.rotation.x = Math.sin(t * 0.9) * 0.04;
      if (cape) { cape.rotation.x = 0.12 + Math.sin(t * 2) * 0.04; cape.position.z = -0.2; }
    },
    // k: 0..1, variant: 0 z góry, 1 poziome, 2 pchnięcie
    setAttack(k, variant = 0) {
      const raise = k < 0.38 ? k / 0.38 : 1 - (k - 0.38) / 0.62;
      const e = raise * raise * (3 - 2 * raise); // smoothstep
      if (variant === 0) {
        armR.rotation.x = -2.5 * e - 0.2;
        armR.rotation.z = -0.2;
        hips.rotation.y = -0.4 * e; hips.rotation.x = 0.25 * e;
      } else if (variant === 1) {
        armR.rotation.x = -1.2 * e;
        armR.rotation.z = -1.5 * e - 0.1;
        hips.rotation.y = -0.7 * e; hips.rotation.x = 0.15 * e;
        armL.rotation.z = 0.8 * e;
      } else {
        armR.rotation.x = -1.5 * e - 0.1;
        hips.rotation.y = -0.25 * e; hips.rotation.x = 0.35 * e;
        hips.position.y = 0.86 - 0.12 * e; // wypad
      }
      legL.rotation.x = 0.3; legR.rotation.x = -0.25;
    },
    setJump() {
      legL.rotation.x = -0.7; legR.rotation.x = 0.35;
      armL.rotation.z = 0.7; armR.rotation.z = -0.7;
      armL.rotation.x = -0.4; armR.rotation.x = -0.4;
      hips.rotation.x = 0.1;
    },
    setLand() {
      legL.rotation.x = 0.5; legR.rotation.x = 0.45;
      hips.position.y = 0.68;
      hips.rotation.x = 0.3;
      armL.rotation.x = 0.4; armR.rotation.x = 0.4;
    },
    setFlinch() {
      hips.rotation.x = -0.3; hips.position.y = 0.8;
      neck.rotation.x = -0.25;
      armL.rotation.x = 0.5; armR.rotation.x = 0.5;
    },
    setCast(k) {
      const e = Math.sin(k * Math.PI);
      armR.rotation.x = -2.7 * e;
      armR.rotation.z = -0.3 * e;
      armL.rotation.x = -0.6 * e; armL.rotation.z = 0.9 * e;
      hips.rotation.x = -0.12 * e;
      hips.position.y = 0.86 - 0.04 * e;
      neck.rotation.x = -0.3 * e;
    },
    setBowAim() {
      armL.rotation.x = -1.5; armL.rotation.z = 0.15;
      armR.rotation.x = -1.1; armR.rotation.z = -0.7;
      hips.rotation.y = -0.35;
      neck.rotation.y = 0.3;
    },
    setBlock() {
      armL.rotation.x = -0.9; armL.rotation.z = 0.9;
      armR.rotation.x = 0.3;
      legL.rotation.x = 0.35; legR.rotation.x = -0.3;
      hips.position.y = 0.78; hips.rotation.x = 0.15;
    },
    setWork(t) { // kowal: uderzenia młotem
      const c = Math.max(0, Math.sin(t * 5));
      armR.rotation.x = -2.2 * c * c - 0.2;
      hips.rotation.x = 0.3 + 0.1 * c;
      armL.rotation.x = -0.5;
      legL.rotation.x = 0.15; legR.rotation.x = -0.15;
    },
    setCheer(t) { // triumf
      armL.rotation.z = 2.7; armR.rotation.z = -2.7;
      armL.rotation.x = Math.sin(t * 8) * 0.15; armR.rotation.x = -Math.sin(t * 8) * 0.15;
      hips.position.y = 0.86 + Math.abs(Math.sin(t * 4)) * 0.12;
    },
    setSit() {
      legL.rotation.x = -1.5; legR.rotation.x = -1.5;
      armL.rotation.x = -0.5; armR.rotation.x = -0.5;
      hips.position.y = 0.55;
    },
    setDead() {
      g.rotation.x = -Math.PI / 2;
      g.position.y = 0.25;
    },
    setWave(t) {
      armR.rotation.z = 2.6 + Math.sin(t * 6) * 0.3;
      armR.rotation.x = 0;
    },
  };
  return rig;
}

// ---- CZWORONOGI ----
export function createQuadruped(type = 'deer', o = {}) {
  const g = new THREE.Group();
  g.userData.actor = true;
  const conf = {
    deer:   { body: 0x8a5a2e, belly: 0xd8c0a0, legH: 0.75, bodyL: 1.1, headR: 0.22, scale: 1 },
    horse:  { body: 0x5a3a22, belly: 0x4a3020, legH: 0.9, bodyL: 1.5, headR: 0.26, scale: 1.15 },
    sheep:  { body: 0xe8e0d0, belly: 0xd8d0c0, legH: 0.4, bodyL: 0.8, headR: 0.16, scale: 0.9 },
    wolf:   { body: 0x3a3a42, belly: 0x2a2a32, legH: 0.6, bodyL: 1.05, headR: 0.21, scale: 1.02 },
    rabbit: { body: 0xb0a090, belly: 0xd8d0c0, legH: 0.22, bodyL: 0.42, headR: 0.13, scale: 0.9 },
    boar:   { body: 0x4a3626, belly: 0x3a2a1e, legH: 0.45, bodyL: 0.9, headR: 0.2, scale: 1 },
  }[type] || {};
  const s = (o.scale || 1) * (conf.scale || 1);
  const bodyM = mat(o.color ?? conf.body);
  const darkM = mat(conf.belly);

  const bodyY = conf.legH + 0.32;
  const body = new THREE.Mesh(sphGeo(0.42, 14, 12), bodyM);
  body.scale.set(1, 0.85, conf.bodyL / 0.84);
  body.position.y = bodyY;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const bodyG = new THREE.Group(); // do pochylania w galopie
  bodyG.position.y = bodyY; g.add(bodyG);

  const legs = [];
  const legX = 0.24, legZF = conf.bodyL * 0.32, legZB = -conf.bodyL * 0.32;
  for (const [lx, lz] of [[-legX, legZF], [legX, legZF], [-legX, legZB], [legX, legZB]]) {
    const p = pivot(lx, bodyY - 0.15, lz);
    const upper = cyl(0.07, 0.055, conf.legH * 0.6, type === 'sheep' ? bodyM : darkM);
    upper.position.y = -conf.legH * 0.3; p.add(upper);
    const lower = cyl(0.05, 0.045, conf.legH * 0.45, darkM);
    lower.position.y = -conf.legH * 0.78; p.add(lower);
    const hoof = cyl(0.06, 0.065, 0.09, mat(0x241a10), 8);
    hoof.position.y = -conf.legH - 0.02; p.add(hoof);
    g.add(p); legs.push(p);
  }
  // Szyja + głowa
  const neckP = pivot(0, bodyY + 0.2, conf.bodyL * 0.42);
  const neckM = cyl(0.12, 0.15, 0.5, bodyM);
  neckM.position.y = 0.2; neckM.rotation.x = 0.5; neckP.add(neckM);
  const head = new THREE.Mesh(sphGeo(conf.headR, 12, 10), bodyM);
  head.position.set(0, 0.45, 0.14); head.castShadow = true; neckP.add(head);
  const snout = new THREE.Mesh(sphGeo(conf.headR * 0.55, 8, 8), darkM);
  snout.position.set(0, 0.4, 0.14 + conf.headR * 0.8); snout.castShadow = true; neckP.add(snout);
  const noseTip = new THREE.Mesh(sphGeo(conf.headR * 0.22, 6, 6), mat(0x141414, { roughness: 0.3 }));
  noseTip.position.set(0, 0.42, 0.14 + conf.headR * 1.25); neckP.add(noseTip);
  // Oczy z refleksem
  const eyeM = mat(type === 'wolf' ? 0xdd2222 : 0x151515, { emissive: type === 'wolf' ? 0x550000 : 0x000000, emissiveIntensity: 1, roughness: 0.15 });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(sphGeo(conf.headR * 0.17, 8, 8), eyeM);
    e.position.set(sx * conf.headR * 0.62, 0.52, 0.14 + conf.headR * 0.55);
    neckP.add(e);
    if (type !== 'wolf') {
      const glint = new THREE.Mesh(sphGeo(conf.headR * 0.05, 6, 6), mat(0xffffff, { roughness: 0.1 }));
      glint.position.set(sx * conf.headR * 0.62 + 0.02, 0.55, 0.14 + conf.headR * 0.68);
      neckP.add(glint);
    }
  }
  if (type === 'deer') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(coneGeo(0.06, 0.2, 6), bodyM);
      ear.position.set(sx * 0.15, 0.62, 0.05); ear.rotation.z = -sx * 0.4; ear.castShadow = true; neckP.add(ear);
      const ant = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const t = cyl(0.015, 0.02, 0.3 - i * 0.06, mat(0xd8ccb0));
        t.position.set(0, i * 0.1, i * 0.03); t.rotation.x = -0.3 - i * 0.25; ant.add(t);
      }
      ant.position.set(sx * 0.1, 0.6, 0.1);
      neckP.add(ant);
    }
    // białe plamki
    for (let i = 0; i < 6; i++) {
      const spot = new THREE.Mesh(sphGeo(0.05, 6, 6), mat(0xe8dcc0));
      spot.position.set((Math.random() - 0.5) * 0.5, bodyY + 0.25 + Math.random() * 0.1, (Math.random() - 0.5) * 0.8);
      g.add(spot);
    }
  }
  if (type === 'horse') {
    const mane = box(0.08, 0.5, 0.16, mat(0x2a1a10));
    mane.position.set(0, 0.3, -0.24); mane.rotation.x = 0.4; neckP.add(mane);
    const forelock = box(0.12, 0.18, 0.1, mat(0x2a1a10));
    forelock.position.set(0, 0.62, 0.16); neckP.add(forelock);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(coneGeo(0.05, 0.16, 6), bodyM);
      ear.position.set(sx * 0.1, 0.68, 0.1); neckP.add(ear);
    }
    if (o.saddle !== false) {
      const sad = box(0.5, 0.12, 0.55, mat(0x7a2a1a));
      sad.position.set(0, bodyY + 0.32, -0.05); g.add(sad);
      const blanket = box(0.56, 0.06, 0.62, mat(0x2a4a8f));
      blanket.position.set(0, bodyY + 0.27, -0.05); g.add(blanket);
      // strzemiona
      for (const sx of [-1, 1]) {
        const strap = box(0.04, 0.4, 0.04, mat(0x3a2412));
        strap.position.set(sx * 0.3, bodyY + 0.05, -0.05); g.add(strap);
        const stir = box(0.12, 0.04, 0.12, mat(0x8a8f98, { metalness: 0.7 }));
        stir.position.set(sx * 0.3, bodyY - 0.16, -0.05); g.add(stir);
      }
    }
    // uzda
    const bridle = new THREE.Mesh(new THREE.TorusGeometry(conf.headR * 0.85, 0.02, 6, 12), mat(0x3a2412));
    bridle.position.set(0, 0.44, 0.16); bridle.rotation.x = 0.3; neckP.add(bridle);
  }
  if (type === 'sheep') {
    const wool = new THREE.Mesh(sphGeo(0.46, 10, 8), mat(0xe8e0d0, { roughness: 1 }));
    wool.scale.set(1, 0.9, conf.bodyL / 0.84); wool.position.y = bodyY + 0.12; wool.castShadow = true; g.add(wool);
    // kłaczki
    for (let i = 0; i < 8; i++) {
      const puff = new THREE.Mesh(sphGeo(0.13, 6, 6), mat(0xf2ece0, { roughness: 1 }));
      const a = Math.random() * 6.28;
      puff.position.set(Math.cos(a) * 0.35, bodyY + 0.3 + Math.random() * 0.15, Math.sin(a) * 0.4);
      g.add(puff);
    }
    const face = new THREE.Mesh(sphGeo(0.13, 8, 8), mat(0x3a2a20));
    face.position.set(0, 0.42, 0.14 + conf.headR * 0.7); neckP.add(face);
  }
  if (type === 'rabbit') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(coneGeo(0.035, 0.24, 6), bodyM);
      ear.position.set(sx * 0.06, 0.62, 0.08); ear.rotation.z = -sx * 0.15; neckP.add(ear);
      const inner = new THREE.Mesh(coneGeo(0.018, 0.16, 6), mat(0xe8a0a0));
      inner.position.set(sx * 0.06, 0.6, 0.11); inner.rotation.z = -sx * 0.15; neckP.add(inner);
    }
    const tail = new THREE.Mesh(sphGeo(0.07, 8, 8), mat(0xf0ebe0)); tail.position.set(0, bodyY + 0.25, -conf.bodyL * 0.5); g.add(tail);
  }
  if (type === 'wolf') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(coneGeo(0.05, 0.15, 6), bodyM);
      ear.position.set(sx * 0.12, 0.62, 0.08); neckP.add(ear);
    }
    // sierść na karku
    const ruff = new THREE.Mesh(coneGeo(0.16, 0.4, 7), darkM);
    ruff.position.set(0, 0.15, -0.15); ruff.rotation.x = -0.6; neckP.add(ruff);
  }
  if (type === 'boar') {
    for (const sx of [-1, 1]) {
      const tusk = new THREE.Mesh(coneGeo(0.03, 0.13, 6), mat(0xf0e8d8));
      tusk.position.set(sx * 0.1, 0.32, 0.3); tusk.rotation.x = -0.5; neckP.add(tusk);
    }
    const ridge = box(0.1, 0.15, 0.7, darkM); ridge.position.set(0, bodyY + 0.35, -0.1); g.add(ridge);
  }
  // Ogon
  const tailP = pivot(0, bodyY + 0.2, -conf.bodyL * 0.48);
  const tail = cyl(0.04, 0.02, 0.45, type === 'horse' ? mat(0x2a1a10) : darkM);
  tail.position.y = -0.2; tailP.add(tail);
  if (type === 'deer') { const t2 = new THREE.Mesh(sphGeo(0.06, 6, 6), mat(0xf0e8d8)); t2.position.y = -0.4; tailP.add(t2); }
  if (type === 'wolf') { const t2 = cyl(0.05, 0.03, 0.3, darkM); t2.position.y = -0.5; t2.rotation.x = 0.3; tailP.add(t2); }
  g.add(tailP);
  g.add(neckP);
  g.scale.setScalar(s);

  return {
    group: g, legs, neck: neckP, tail: tailP, type, bodyG, body,
    walkPhase: Math.random() * 10,
    setWalk(phase, amp = 1) {
      legs[0].rotation.x = Math.sin(phase) * 0.7 * amp;
      legs[3].rotation.x = Math.sin(phase) * 0.7 * amp;
      legs[1].rotation.x = Math.sin(phase + Math.PI) * 0.7 * amp;
      legs[2].rotation.x = Math.sin(phase + Math.PI) * 0.7 * amp;
      body.position.y = bodyY + Math.abs(Math.sin(phase)) * 0.06 * amp;
      bodyG.rotation.x = 0;
      tailP.rotation.x = 0.3 + Math.sin(phase * 0.5) * 0.2;
      neckP.rotation.x = Math.sin(phase * 0.5) * 0.06 * amp;
    },
    setGallop(phase) { // cwał: pary nóg + pochylenie tułowia
      const f = Math.sin(phase), b = Math.sin(phase + Math.PI * 0.8);
      legs[0].rotation.x = f * 0.9; legs[1].rotation.x = Math.sin(phase + 0.4) * 0.9;
      legs[2].rotation.x = b * 1.0; legs[3].rotation.x = Math.sin(phase + Math.PI * 0.8 + 0.4) * 1.0;
      body.position.y = bodyY + Math.sin(phase) * 0.12;
      bodyG.rotation.x = Math.sin(phase - 0.6) * 0.1;
      neckP.rotation.x = -0.25 + Math.sin(phase + 0.8) * 0.18; // wyciągnięta szyja
      tailP.rotation.x = 1.0; // ogon w tył
    },
    setBound(phase) { // susy królika / jelenia
      const h = Math.abs(Math.sin(phase));
      const all = Math.sin(phase);
      legs[0].rotation.x = all * 0.8; legs[1].rotation.x = all * 0.8;
      legs[2].rotation.x = -all * 1.0; legs[3].rotation.x = -all * 1.0;
      body.position.y = bodyY + h * 0.22;
      bodyG.rotation.x = Math.cos(phase) * 0.18;
      neckP.rotation.x = -0.15;
    },
    setIdle(t) {
      for (const l of legs) l.rotation.x *= 0.85;
      body.position.y = bodyY + Math.sin(t * 1.5) * 0.015;
      bodyG.rotation.x *= 0.9;
      tailP.rotation.x = 0.3;
      tailP.rotation.z = Math.sin(t * 2.2) * 0.35;
      neckP.rotation.y = Math.sin(t * 0.5) * 0.3;
      if ((type === 'sheep' || type === 'deer' || type === 'horse') && Math.sin(t * 0.23 + bodyY) > 0.9) neckP.rotation.x = 0.95; // skubanie
      else neckP.rotation.x *= 0.9;
    },
    setAlert() { // jeleń czujny
      neckP.rotation.x = -0.35;
      for (const l of legs) l.rotation.x = 0;
      tailP.rotation.x = 0.8;
    },
    setGraze(t) {
      neckP.rotation.x = 0.95 + Math.sin(t * 3) * 0.08;
      tailP.rotation.z = Math.sin(t * 3) * 0.4;
    },
    setAttack(k) {
      neckP.rotation.x = -0.5 * Math.sin(k * Math.PI);
      legs[0].rotation.x = -0.8 * Math.sin(k * Math.PI);
      legs[1].rotation.x = -0.8 * Math.sin(k * Math.PI);
    },
    setDead() {
      g.rotation.z = Math.PI / 2;
      g.position.y = 0.3;
    },
  };
}

// ---- GOBLIN ----
export function createGoblin() {
  const g = new THREE.Group();
  g.userData.actor = true;
  const skin = mat(0x4a8f3c);
  const dark = mat(0x3a2a1a);
  const legL = pivot(-0.12, 0.55, 0), legR = pivot(0.12, 0.55, 0);
  for (const leg of [legL, legR]) {
    const l = box(0.16, 0.42, 0.18, skin); l.position.y = -0.21; leg.add(l);
    const f = box(0.17, 0.12, 0.26, dark); f.position.set(0, -0.48, 0.03); leg.add(f);
    g.add(leg);
  }
  const hips = pivot(0, 0.55, 0); g.add(hips);
  const torso = box(0.44, 0.5, 0.28, dark); torso.position.y = 0.28; hips.add(torso);
  const strap = box(0.46, 0.08, 0.3, mat(0x222222)); strap.position.y = 0.35; strap.rotation.z = 0.3; hips.add(strap);
  const armL = pivot(-0.28, 0.45, 0), armR = pivot(0.28, 0.45, 0);
  hips.add(armL, armR);
  for (const arm of [armL, armR]) {
    const a = box(0.13, 0.4, 0.15, skin); a.position.y = -0.2; arm.add(a);
    const hand = new THREE.Mesh(sphGeo(0.08, 8, 8), skin); hand.position.y = -0.44; hand.castShadow = true; arm.add(hand);
  }
  const club = cyl(0.05, 0.075, 0.7, mat(0x5a4020));
  club.position.set(0, -0.5, 0.1); club.rotation.x = 1.2; armR.add(club);
  const spike1 = new THREE.Mesh(coneGeo(0.02, 0.1, 5), mat(0x888888));
  spike1.position.set(0, -0.72, 0.32); spike1.rotation.x = 1.2; armR.add(spike1);
  const neck = pivot(0, 0.55, 0); hips.add(neck);
  const head = new THREE.Mesh(sphGeo(0.24, 12, 10), skin); head.position.y = 0.24; head.castShadow = true; neck.add(head);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(coneGeo(0.07, 0.35, 6), skin);
    ear.position.set(sx * 0.3, 0.3, 0); ear.rotation.z = -sx * 1.4; ear.castShadow = true; neck.add(ear);
    const eye = new THREE.Mesh(sphGeo(0.045, 8, 8), mat(0xffdd22, { emissive: 0x886600, emissiveIntensity: 0.8 }));
    eye.position.set(sx * 0.09, 0.28, 0.2); neck.add(eye);
    const lid = box(0.09, 0.02, 0.02, mat(0x2a5a22)); lid.position.set(sx * 0.09, 0.33, 0.2); neck.add(lid);
  }
  const nose = new THREE.Mesh(coneGeo(0.05, 0.14, 6), mat(0x3a702e));
  nose.position.set(0, 0.2, 0.24); nose.rotation.x = Math.PI / 2; neck.add(nose);
  // zęby
  for (const sx of [-1, 1]) {
    const fang = new THREE.Mesh(coneGeo(0.02, 0.07, 5), mat(0xf0ead8));
    fang.position.set(sx * 0.06, 0.1, 0.2); fang.rotation.x = Math.PI; neck.add(fang);
  }
  return {
    group: g, hips, neck, armL, armR, legL, legR, walkPhase: Math.random() * 10,
    setWalk(p, a = 1) {
      legL.rotation.x = Math.sin(p) * 0.8 * a; legR.rotation.x = Math.sin(p + Math.PI) * 0.8 * a;
      armL.rotation.x = Math.sin(p + Math.PI) * 0.6 * a; armR.rotation.x = Math.sin(p) * 0.6 * a;
      hips.position.y = 0.55 + Math.abs(Math.cos(p)) * 0.06 * a;
      hips.rotation.z = Math.sin(p) * 0.08 * a;
      hips.rotation.x = 0.1 * a;
    },
    setIdle(t) {
      legL.rotation.x *= 0.85; legR.rotation.x *= 0.85;
      armL.rotation.x = Math.sin(t * 1.6) * 0.08; armR.rotation.x = Math.sin(t * 1.6 + 1) * 0.08;
      hips.position.y = 0.55 + Math.sin(t * 2) * 0.02;
      neck.rotation.y = Math.sin(t * 0.7) * 0.4;
    },
    setAttack(k) {
      const r = Math.sin(k * Math.PI);
      armR.rotation.x = -2.6 * r;
      armL.rotation.z = 0.7 * r;
      hips.rotation.y = -0.4 * r; hips.rotation.x = 0.2 * r;
    },
    setTaunt(t) { // prowokacja: podskoki
      hips.position.y = 0.55 + Math.abs(Math.sin(t * 7)) * 0.15;
      armL.rotation.z = 1.4; armR.rotation.z = -1.4;
      neck.rotation.z = Math.sin(t * 7) * 0.15;
    },
    setDead() { g.rotation.x = -Math.PI / 2; g.position.y = 0.3; },
  };
}

// ---- SZKIELET ----
export function createSkeleton() {
  const g = new THREE.Group();
  g.userData.actor = true;
  const bone = mat(0xd8d2c0, { roughness: 0.7 });
  const dark = mat(0x8a8474, { roughness: 0.8 });
  const legL = pivot(-0.12, 0.8, 0), legR = pivot(0.12, 0.8, 0);
  for (const leg of [legL, legR]) {
    const femur = cyl(0.05, 0.045, 0.4, bone, 7); femur.position.y = -0.2; leg.add(femur);
    const knee = new THREE.Mesh(sphGeo(0.06, 6, 6), dark); knee.position.y = -0.42; leg.add(knee);
    const shin = cyl(0.04, 0.035, 0.36, bone, 7); shin.position.y = -0.6; leg.add(shin);
    g.add(leg);
  }
  const hips = pivot(0, 0.8, 0); g.add(hips);
  const pelvis = box(0.34, 0.14, 0.2, dark); pelvis.position.y = 0.05; hips.add(pelvis);
  const spine = cyl(0.045, 0.045, 0.5, bone, 7); spine.position.y = 0.36; hips.add(spine);
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.17 - i * 0.015, 0.022, 6, 12, Math.PI * 1.5), bone);
    rib.position.y = 0.22 + i * 0.1; rib.rotation.z = Math.PI * 0.75; hips.add(rib);
  }
  const skull = pivot(0, 0, 0); // ramiona
  const armL = pivot(-0.24, 0.55, 0), armR = pivot(0.24, 0.55, 0);
  hips.add(armL, armR);
  for (const arm of [armL, armR]) {
    const a = cyl(0.04, 0.035, 0.5, bone, 7); a.position.y = -0.25; arm.add(a);
    const claw = new THREE.Mesh(coneGeo(0.03, 0.12, 5), dark);
    claw.position.y = -0.55; claw.rotation.x = Math.PI; arm.add(claw);
  }
  // zardzewiały miecz
  const sword = new THREE.Group();
  const blade = box(0.06, 0.8, 0.02, mat(0x7a6a55, { metalness: 0.5, roughness: 0.6 }));
  blade.position.y = 0.48; sword.add(blade);
  const guard = box(0.18, 0.04, 0.05, dark); guard.position.y = 0.06; sword.add(guard);
  sword.rotation.x = -Math.PI / 2 + 0.4;
  sword.position.y = -0.5;
  armR.add(sword);
  const neck = pivot(0, 0.62, 0); hips.add(neck);
  const head = new THREE.Mesh(sphGeo(0.19, 12, 10), bone); head.position.y = 0.2; head.castShadow = true; neck.add(head);
  const jaw = box(0.2, 0.08, 0.16, dark); jaw.position.set(0, 0.04, 0.03); neck.add(jaw);
  for (const sx of [-1, 1]) {
    const socket = new THREE.Mesh(sphGeo(0.05, 8, 8), mat(0x0a0a0a));
    socket.position.set(sx * 0.075, 0.22, 0.15); neck.add(socket);
    const glow = new THREE.Mesh(sphGeo(0.022, 6, 6), mat(0x66ddff, { emissive: 0x2299dd, emissiveIntensity: 2.2 }));
    glow.position.set(sx * 0.075, 0.22, 0.185); neck.add(glow);
  }
  return {
    group: g, hips, neck, armL, armR, legL, legR, walkPhase: Math.random() * 10,
    setWalk(p, a = 1) {
      legL.rotation.x = Math.sin(p) * 0.7 * a; legR.rotation.x = Math.sin(p + Math.PI) * 0.7 * a;
      armL.rotation.x = Math.sin(p + Math.PI) * 0.5 * a; armR.rotation.x = Math.sin(p) * 0.5 * a;
      hips.position.y = 0.8 + Math.abs(Math.cos(p)) * 0.05 * a;
      hips.rotation.z = Math.sin(p) * 0.06 * a;
      neck.rotation.z = Math.sin(p * 0.5) * 0.08; // chwiejąca czaszka
    },
    setIdle(t) {
      legL.rotation.x *= 0.85; legR.rotation.x *= 0.85;
      armL.rotation.x = Math.sin(t * 1.2) * 0.06; armR.rotation.x = Math.sin(t * 1.2 + 1) * 0.06;
      hips.position.y = 0.8 + Math.sin(t * 1.6) * 0.02;
      neck.rotation.y = Math.sin(t * 0.5) * 0.5;
    },
    setAttack(k) {
      const r = Math.sin(k * Math.PI);
      armR.rotation.x = -2.4 * r;
      hips.rotation.y = -0.35 * r;
    },
    setDead() {
      g.rotation.x = -Math.PI / 2; g.position.y = 0.2;
      // rozsypanie: lekkie rozciągnięcie
      g.scale.set(1.15, 0.7, 1.15);
    },
  };
}

// ---- KAMIENNY GOLEM (boss) ----
export function createGolem() {
  const g = new THREE.Group();
  g.userData.actor = true;
  const rockM = mat(0x5a5a66, { roughness: 0.95, flatShading: true });
  const darkM = mat(0x3d3d45, { roughness: 0.95, flatShading: true });
  const crysM = new THREE.MeshStandardMaterial({ color: 0x55ccff, emissive: 0x1a88cc, emissiveIntensity: 1.4, roughness: 0.2 });
  const legL = pivot(-0.4, 1.7, 0), legR = pivot(0.4, 1.7, 0);
  for (const leg of [legL, legR]) {
    const l = box(0.55, 1.1, 0.6, rockM); l.position.y = -0.55; leg.add(l);
    const knee = box(0.6, 0.25, 0.65, darkM); knee.position.y = -1.15; leg.add(knee);
    const shin = box(0.5, 0.4, 0.55, rockM); shin.position.y = -1.4; leg.add(shin);
    const f = box(0.7, 0.3, 1.0, darkM); f.position.set(0, -1.62, 0.1); leg.add(f);
    g.add(leg);
  }
  const hips = pivot(0, 1.7, 0); g.add(hips);
  const torso = box(1.5, 1.0, 1.0, rockM); torso.position.y = 0.6; hips.add(torso);
  const chest = box(1.7, 0.5, 1.1, darkM); chest.position.y = 1.25; hips.add(chest);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), crysM);
  core.position.set(0, 0.7, 0.52); hips.add(core);
  // kryształy na barkach
  for (const sx of [-1, 1]) {
    const sh = box(0.6, 0.5, 0.8, darkM); sh.position.set(sx * 1.0, 1.35, 0); hips.add(sh);
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), crysM);
    c.position.set(sx * 1.0, 1.7, 0); hips.add(c);
  }
  const armL = pivot(-1.15, 1.2, 0), armR = pivot(1.15, 1.2, 0);
  hips.add(armL, armR);
  for (const arm of [armL, armR]) {
    const a = box(0.45, 0.9, 0.5, rockM); a.position.y = -0.45; arm.add(a);
    const elbow = box(0.5, 0.22, 0.55, darkM); elbow.position.y = -0.95; arm.add(elbow);
    const fore = box(0.42, 0.4, 0.47, rockM); fore.position.y = -1.2; arm.add(fore);
    const fist = box(0.62, 0.55, 0.62, darkM); fist.position.y = -1.6; arm.add(fist);
    // palce pięści
    for (let f = 0; f < 3; f++) {
      const fin = box(0.16, 0.2, 0.5, darkM); fin.position.set(-0.2 + f * 0.2, -1.9, 0.05); arm.add(fin);
    }
  }
  const neck = pivot(0, 1.55, 0); hips.add(neck);
  const head = box(0.6, 0.5, 0.6, darkM); head.position.y = 0.3; neck.add(head);
  const brow = box(0.62, 0.12, 0.5, rockM); brow.position.y = 0.48; neck.add(brow);
  for (const sx of [-1, 1]) {
    const eye = box(0.12, 0.1, 0.05, crysM); eye.position.set(sx * 0.15, 0.34, 0.31); neck.add(eye);
  }
  // kolce na plecach + mchu
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(coneGeo(0.12, 0.4 + Math.random() * 0.3, 5), rockM);
    spike.position.set((Math.random() - 0.5) * 1.2, 1.5 + Math.random() * 0.3, -0.45 - Math.random() * 0.2);
    spike.rotation.x = -0.4; spike.castShadow = true; hips.add(spike);
  }
  const moss = box(1.2, 0.1, 0.8, mat(0x4a6b35, { roughness: 1 })); moss.position.set(0.2, 1.52, 0.1); hips.add(moss);
  return {
    group: g, hips, neck, armL, armR, legL, legR, walkPhase: 0,
    setWalk(p, a = 1) {
      legL.rotation.x = Math.sin(p) * 0.45 * a; legR.rotation.x = Math.sin(p + Math.PI) * 0.45 * a;
      armL.rotation.x = Math.sin(p + Math.PI) * 0.35 * a; armR.rotation.x = Math.sin(p) * 0.35 * a;
      hips.position.y = 1.7 + Math.abs(Math.cos(p)) * 0.09 * a;
      hips.rotation.z = Math.sin(p) * 0.05 * a;
      hips.rotation.x = 0.06;
    },
    setIdle(t) {
      armL.rotation.x = Math.sin(t) * 0.06; armR.rotation.x = Math.sin(t + 1) * 0.06;
      hips.position.y = 1.7 + Math.sin(t * 0.9) * 0.03;
      neck.rotation.y = Math.sin(t * 0.3) * 0.3;
      core.rotation.y = t * 1.5;
    },
    setAttack(k) { // cios pięścią
      const r = Math.sin(k * Math.PI);
      armR.rotation.x = -2.4 * r;
      armL.rotation.x = 0.4 * r;
      hips.rotation.y = -0.3 * r; hips.rotation.x = 0.25 * r;
    },
    setSlam(k) { // TRZASK: obie ręce w górę, potem w dół
      if (k < 0.45) {
        const e = k / 0.45;
        armL.rotation.x = -2.6 * e; armR.rotation.x = -2.6 * e;
        hips.rotation.x = -0.2 * e;
        hips.position.y = 1.7 + 0.1 * e;
      } else {
        const e = (k - 0.45) / 0.55;
        const d = 1 - e;
        armL.rotation.x = -2.6 * d + 0.5 * e; armR.rotation.x = -2.6 * d + 0.5 * e;
        hips.rotation.x = -0.2 * d + 0.45 * e;
        hips.position.y = 1.7 + 0.1 * d - 0.25 * e;
      }
    },
    setDead() {
      g.rotation.x = -Math.PI / 2; g.position.y = 0.8;
    },
  };
}
