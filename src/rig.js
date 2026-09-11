// Proceduralne modele postaci (humanoidy i czworonogi) z animacjami.
import * as THREE from 'three';

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
}
function box(w, h, d, m) {
  const ms = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  ms.castShadow = true; ms.receiveShadow = true;
  return ms;
}
function cyl(rt, rb, h, m, seg = 10) {
  const ms = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  ms.castShadow = true; ms.receiveShadow = true;
  return ms;
}
function sph(r, m, w = 12, h = 10) {
  const ms = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m);
  ms.castShadow = true; ms.receiveShadow = true;
  return ms;
}
function pivot(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

// o = { skin, shirt, pants, boots, helmet, hood, crown, wizardHat, beard, armor,
//        cape, female, hair, scale, sword, staff, spear, shield, robe }
export function createHumanoid(o = {}) {
  const s = o.scale || 1;
  const g = new THREE.Group();
  const skin = mat(o.skin ?? 0xd9a066);
  const shirt = mat(o.shirt ?? 0x4a5a7a);
  const pants = mat(o.pants ?? 0x3a3040);
  const boots = mat(o.boots ?? 0x2c1e12);

  // Nogi (pivots w biodrach)
  const legL = pivot(-0.13, 0.86, 0), legR = pivot(0.13, 0.86, 0);
  for (const [leg] of [[legL], [legR]]) {
    const thigh = box(0.2, 0.45, 0.22, pants); thigh.position.y = -0.22; leg.add(thigh);
    const boot = box(0.21, 0.28, 0.3, boots); boot.position.set(0, -0.62, 0.03); leg.add(boot);
    g.add(leg);
  }
  // Tułów
  const hips = pivot(0, 0.86, 0); g.add(hips);
  const torso = box(0.52, 0.62, 0.3, o.armor ? mat(0x9aa0aa, { metalness: 0.75, roughness: 0.35 }) : shirt);
  torso.position.y = 0.33; hips.add(torso);
  if (o.armor) {
    const belt = box(0.54, 0.1, 0.32, boots); belt.position.y = 0.05; hips.add(belt);
    for (const sx of [-1, 1]) {
      const pad = sph(0.13, mat(0x9aa0aa, { metalness: 0.75, roughness: 0.35 })); pad.position.set(sx * 0.3, 0.6, 0); hips.add(pad);
    }
  }
  if (o.robe) {
    const robe = cyl(0.34, 0.46, 0.9, mat(o.robe)); robe.position.y = 0.2; hips.add(robe);
  }
  // Peleryna
  let cape = null;
  if (o.cape) {
    cape = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.95, 4, 6),
      new THREE.MeshStandardMaterial({ color: o.cape, roughness: 0.9, side: THREE.DoubleSide }));
    cape.position.set(0, 0.15, -0.19); cape.rotation.x = 0.12;
    cape.castShadow = true;
    hips.add(cape);
  }
  // Ramiona
  const armL = pivot(-0.34, 0.58, 0), armR = pivot(0.34, 0.58, 0);
  hips.add(armL, armR);
  for (const arm of [armL, armR]) {
    const a = box(0.15, 0.5, 0.17, o.armor ? mat(0x9aa0aa, { metalness: 0.7, roughness: 0.4 }) : shirt);
    a.position.y = -0.24; arm.add(a);
    const hand = sph(0.09, skin); hand.position.y = -0.52; arm.add(hand);
  }
  // Broń w prawej dłoni
  let weaponMesh = null;
  const handR = pivot(0, -0.52, 0); armR.add(handR);
  if (o.sword) {
    weaponMesh = new THREE.Group();
    const blade = box(0.07, 0.85, 0.02, mat(0xd5dae2, { metalness: 0.9, roughness: 0.2 }));
    blade.position.y = 0.5; weaponMesh.add(blade);
    const guard = box(0.22, 0.05, 0.06, mat(0x8a6a1f, { metalness: 0.6, roughness: 0.4 }));
    guard.position.y = 0.06; weaponMesh.add(guard);
    const grip = cyl(0.025, 0.025, 0.14, boots); grip.position.y = -0.03; weaponMesh.add(grip);
    weaponMesh.rotation.x = -Math.PI / 2 + 0.4;
    handR.add(weaponMesh);
  }
  if (o.staff) {
    weaponMesh = new THREE.Group();
    const pole = cyl(0.03, 0.03, 1.6, mat(0x5a4020)); weaponMesh.add(pole);
    const orb = sph(0.09, new THREE.MeshStandardMaterial({ color: 0x66d0ff, emissive: 0x2299dd, emissiveIntensity: 1.6 }));
    orb.position.y = 0.88; weaponMesh.add(orb);
    weaponMesh.position.y = -0.2;
    handR.add(weaponMesh);
  }
  if (o.spear) {
    weaponMesh = new THREE.Group();
    const pole = cyl(0.025, 0.025, 2.0, mat(0x6b4e2e)); weaponMesh.add(pole);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), mat(0xd5dae2, { metalness: 0.9, roughness: 0.25 }));
    tip.position.y = 1.1; tip.castShadow = true; weaponMesh.add(tip);
    weaponMesh.position.y = -0.2;
    handR.add(weaponMesh);
  }
  // Tarcza na lewym przedramieniu
  if (o.shield) {
    const sh = cyl(0.26, 0.26, 0.05, mat(0x7a2a1a, { metalness: 0.3, roughness: 0.5 }), 14);
    sh.rotation.z = Math.PI / 2; sh.position.set(0, -0.35, 0.1);
    const boss = sph(0.07, mat(0xd5dae2, { metalness: 0.85, roughness: 0.3 }));
    boss.position.set(0, -0.35, 0.2);
    armL.add(sh, boss);
  }
  // Głowa
  const neck = pivot(0, 0.68, 0); hips.add(neck);
  const head = sph(0.21, skin, 14, 12); head.position.y = 0.22; neck.add(head);
  // Oczy
  const eyeM = mat(0x1a1a1a, { roughness: 0.3 });
  for (const sx of [-1, 1]) {
    const e = sph(0.028, eyeM, 6, 6); e.position.set(sx * 0.08, 0.25, 0.18); e.castShadow = false; neck.add(e);
  }
  // Włosy / nakrycia głowy
  if (o.hair) {
    const h = sph(0.215, mat(o.hair), 12, 8, ); h.position.set(0, 0.27, -0.02); h.scale.set(1, 0.75, 1); neck.add(h);
    if (o.female) {
      const bun = sph(0.08, mat(o.hair)); bun.position.set(0, 0.32, -0.2); neck.add(bun);
    }
  }
  if (o.helmet) {
    const helm = sph(0.235, mat(0xb8bec8, { metalness: 0.8, roughness: 0.3 }), 14, 10);
    helm.position.y = 0.26; helm.scale.set(1, 0.85, 1); neck.add(helm);
    const plume = box(0.06, 0.12, 0.3, mat(0xc02020)); plume.position.set(0, 0.46, -0.04); neck.add(plume);
    const guardM = box(0.3, 0.1, 0.05, mat(0xb8bec8, { metalness: 0.8, roughness: 0.3 }));
    guardM.position.set(0, 0.16, 0.18); neck.add(guardM);
  }
  if (o.hood) {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.42, 10, 1, true), mat(o.hood, { side: THREE.DoubleSide }));
    hood.position.y = 0.36; hood.castShadow = true; neck.add(hood);
  }
  if (o.crown) {
    const cr = cyl(0.2, 0.22, 0.12, mat(0xe8b64c, { metalness: 0.85, roughness: 0.3 }), 10);
    cr.position.y = 0.44; neck.add(cr);
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 6), cr.material);
      const a = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.18, 0.53, Math.sin(a) * 0.18);
      neck.add(spike);
    }
  }
  if (o.wizardHat) {
    const brim = cyl(0.3, 0.32, 0.05, mat(0x2a3a6b), 12); brim.position.y = 0.4; neck.add(brim);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 12), mat(0x2a3a6b));
    cone.position.y = 0.65; cone.rotation.z = 0.12; cone.castShadow = true; neck.add(cone);
    const star = sph(0.04, new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xcc9900, emissiveIntensity: 1.2 }));
    star.position.set(0.06, 0.88, 0); neck.add(star);
  }
  if (o.beard) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 8), mat(o.beard));
    b.position.set(0, 0.02, 0.12); b.rotation.x = 0.25; b.castShadow = true; neck.add(b);
  }
  if (o.cap) {
    const capM = cyl(0.2, 0.23, 0.1, mat(o.cap), 10); capM.position.y = 0.42; neck.add(capM);
  }

  g.scale.setScalar(s);

  const rig = {
    group: g, hips, neck, armL, armR, legL, legR, cape, weaponMesh, handR,
    walkPhase: Math.random() * 10,
    baseY: 0,
    setWalk(phase, amp = 1, ) {
      const s1 = Math.sin(phase) * 0.65 * amp, s2 = Math.sin(phase + Math.PI) * 0.65 * amp;
      legL.rotation.x = s1; legR.rotation.x = s2;
      armL.rotation.x = s2 * 0.7; armR.rotation.x = s1 * 0.7;
      hips.position.y = 0.86 + Math.abs(Math.cos(phase)) * 0.05 * amp;
      hips.rotation.y = Math.sin(phase) * 0.05 * amp;
      if (cape) cape.rotation.x = 0.12 + amp * 0.5 + Math.sin(phase * 2) * 0.06;
    },
    setIdle(t) {
      legL.rotation.x *= 0.85; legR.rotation.x *= 0.85;
      armL.rotation.x = Math.sin(t * 1.4) * 0.05 - 0.05;
      armR.rotation.x = Math.sin(t * 1.4 + 1) * 0.05 - 0.05;
      hips.position.y = 0.86 + Math.sin(t * 1.8) * 0.015;
      neck.rotation.y = Math.sin(t * 0.4) * 0.25;
      if (cape) cape.rotation.x = 0.12 + Math.sin(t * 2) * 0.04;
    },
    // k: 0..1 postęp zamachu
    setAttack(k) {
      const raise = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6;
      armR.rotation.x = -2.4 * raise - 0.3;
      hips.rotation.y = -0.35 * raise;
      legL.rotation.x = 0.25; legR.rotation.x = -0.2;
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
  const body = sph(0.42, bodyM, 14, 12);
  body.scale.set(1, 0.85, conf.bodyL / 0.84);
  body.position.y = bodyY;
  g.add(body);

  const legs = [];
  const legX = 0.24, legZF = conf.bodyL * 0.32, legZB = -conf.bodyL * 0.32;
  for (const [lx, lz] of [[-legX, legZF], [legX, legZF], [-legX, legZB], [legX, legZB]]) {
    const p = pivot(lx, bodyY - 0.15, lz);
    const upper = cyl(0.07, 0.055, conf.legH, type === 'sheep' ? bodyM : darkM);
    upper.position.y = -conf.legH / 2; p.add(upper);
    g.add(p); legs.push(p);
  }
  // Szyja + głowa
  const neckP = pivot(0, bodyY + 0.2, conf.bodyL * 0.42);
  const neckM = cyl(0.12, 0.15, 0.5, bodyM);
  neckM.position.y = 0.2; neckM.rotation.x = 0.5; neckP.add(neckM);
  const head = sph(conf.headR, bodyM, 12, 10);
  head.position.set(0, 0.45, 0.14); neckP.add(head);
  const snout = sph(conf.headR * 0.55, darkM, 8, 8);
  snout.position.set(0, 0.4, 0.14 + conf.headR * 0.8); neckP.add(snout);
  // Oczy
  const eyeM = mat(type === 'wolf' ? 0xdd2222 : 0x151515, { emissive: type === 'wolf' ? 0x550000 : 0x000000, emissiveIntensity: 1 });
  for (const sx of [-1, 1]) {
    const e = sph(conf.headR * 0.16, eyeM, 6, 6);
    e.position.set(sx * conf.headR * 0.62, 0.52, 0.14 + conf.headR * 0.55);
    e.castShadow = false; neckP.add(e);
  }
  // Uszy / poroże / detale
  if (type === 'deer') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), bodyM);
      ear.position.set(sx * 0.15, 0.62, 0.05); ear.rotation.z = -sx * 0.4; ear.castShadow = true; neckP.add(ear);
      const ant = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const t = cyl(0.015, 0.02, 0.3 - i * 0.06, mat(0xd8ccb0));
        t.position.set(0, i * 0.1, i * 0.03); t.rotation.x = -0.3 - i * 0.25; ant.add(t);
      }
      ant.position.set(sx * 0.1, 0.6, 0.1);
      neckP.add(ant);
    }
  }
  if (type === 'horse') {
    const mane = box(0.08, 0.5, 0.14, mat(0x2a1a10));
    mane.position.set(0, 0.3, -0.22); mane.rotation.x = 0.4; neckP.add(mane);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), bodyM);
      ear.position.set(sx * 0.1, 0.66, 0.1); neckP.add(ear);
    }
    if (o.saddle !== false) {
      const sad = box(0.5, 0.12, 0.55, mat(0x7a2a1a));
      sad.position.set(0, bodyY + 0.32, -0.05); g.add(sad);
    }
  }
  if (type === 'sheep') {
    const wool = sph(0.46, mat(0xe8e0d0, { roughness: 1 }), 10, 8);
    wool.scale.set(1, 0.9, conf.bodyL / 0.84); wool.position.y = bodyY + 0.12; g.add(wool);
    const face = sph(0.13, mat(0x3a2a20), 8, 8);
    face.position.set(0, 0.42, 0.14 + conf.headR * 0.7); neckP.add(face);
  }
  if (type === 'rabbit') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 6), bodyM);
      ear.position.set(sx * 0.06, 0.6, 0.08); ear.rotation.z = -sx * 0.15; neckP.add(ear);
    }
    const tail = sph(0.07, mat(0xf0ebe0)); tail.position.set(0, bodyY + 0.25, -conf.bodyL * 0.5); g.add(tail);
  }
  if (type === 'wolf') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), bodyM);
      ear.position.set(sx * 0.12, 0.62, 0.08); neckP.add(ear);
    }
  }
  if (type === 'boar') {
    for (const sx of [-1, 1]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), mat(0xf0e8d8));
      tusk.position.set(sx * 0.1, 0.32, 0.3); tusk.rotation.x = -0.5; neckP.add(tusk);
    }
  }
  // Ogon
  const tailP = pivot(0, bodyY + 0.2, -conf.bodyL * 0.48);
  const tail = cyl(0.04, 0.02, 0.45, type === 'horse' ? mat(0x2a1a10) : darkM);
  tail.position.y = -0.2; tailP.add(tail);
  if (type === 'deer') { const t2 = sph(0.06, mat(0xf0e8d8)); t2.position.y = -0.4; tailP.add(t2); }
  g.add(tailP);
  g.add(neckP);
  g.scale.setScalar(s);

  return {
    group: g, legs, neck: neckP, tail: tailP, type,
    walkPhase: Math.random() * 10,
    setWalk(phase, amp = 1) {
      legs[0].rotation.x = Math.sin(phase) * 0.7 * amp;
      legs[3].rotation.x = Math.sin(phase) * 0.7 * amp;
      legs[1].rotation.x = Math.sin(phase + Math.PI) * 0.7 * amp;
      legs[2].rotation.x = Math.sin(phase + Math.PI) * 0.7 * amp;
      body.position.y = bodyY + Math.abs(Math.sin(phase)) * 0.06 * amp;
      tailP.rotation.x = 0.3 + Math.sin(phase * 0.5) * 0.2;
      neckP.rotation.x = Math.sin(phase * 0.5) * 0.06 * amp;
    },
    setIdle(t) {
      for (const l of legs) l.rotation.x *= 0.85;
      body.position.y = bodyY + Math.sin(t * 1.5) * 0.015;
      tailP.rotation.z = Math.sin(t * 2.2) * 0.35;
      neckP.rotation.y = Math.sin(t * 0.5) * 0.3;
      if (type === 'sheep' && Math.sin(t * 0.23) > 0.93) neckP.rotation.x = 0.9; // skubanie trawy
      else neckP.rotation.x *= 0.9;
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
  const skin = mat(0x4a8f3c);
  const dark = mat(0x3a2a1a);
  const legL = pivot(-0.12, 0.55, 0), legR = pivot(0.12, 0.55, 0);
  for (const leg of [legL, legR]) {
    const l = box(0.16, 0.5, 0.18, skin); l.position.y = -0.25; leg.add(l);
    g.add(leg);
  }
  const hips = pivot(0, 0.55, 0); g.add(hips);
  const torso = box(0.44, 0.5, 0.28, dark); torso.position.y = 0.28; hips.add(torso);
  const armL = pivot(-0.28, 0.45, 0), armR = pivot(0.28, 0.45, 0);
  hips.add(armL, armR);
  for (const arm of [armL, armR]) {
    const a = box(0.13, 0.48, 0.15, skin); a.position.y = -0.22; arm.add(a);
  }
  const club = cyl(0.05, 0.07, 0.7, mat(0x5a4020));
  club.position.set(0, -0.5, 0.1); club.rotation.x = 1.2; armR.add(club);
  const neck = pivot(0, 0.55, 0); hips.add(neck);
  const head = sph(0.24, skin, 12, 10); head.position.y = 0.24; neck.add(head);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 6), skin);
    ear.position.set(sx * 0.3, 0.3, 0); ear.rotation.z = -sx * 1.4; ear.castShadow = true; neck.add(ear);
    const eye = sph(0.045, mat(0xffdd22, { emissive: 0x886600, emissiveIntensity: 0.8 }), 6, 6);
    eye.position.set(sx * 0.09, 0.28, 0.2); eye.castShadow = false; neck.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), mat(0x3a702e));
  nose.position.set(0, 0.2, 0.24); nose.rotation.x = Math.PI / 2; neck.add(nose);
  return {
    group: g, hips, neck, armL, armR, legL, legR, walkPhase: Math.random() * 10,
    setWalk(p, a = 1) {
      legL.rotation.x = Math.sin(p) * 0.8 * a; legR.rotation.x = Math.sin(p + Math.PI) * 0.8 * a;
      armL.rotation.x = Math.sin(p + Math.PI) * 0.6 * a; armR.rotation.x = Math.sin(p) * 0.6 * a;
      hips.position.y = 0.55 + Math.abs(Math.cos(p)) * 0.06 * a;
      hips.rotation.z = Math.sin(p) * 0.08 * a;
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
      hips.rotation.y = -0.4 * r;
    },
    setDead() { g.rotation.x = -Math.PI / 2; g.position.y = 0.3; },
  };
}

// ---- KAMIENNY GOLEM (boss) ----
export function createGolem() {
  const g = new THREE.Group();
  const rockM = mat(0x5a5a66, { roughness: 0.95 });
  const darkM = mat(0x3d3d45, { roughness: 0.95 });
  const crysM = new THREE.MeshStandardMaterial({ color: 0x55ccff, emissive: 0x1a88cc, emissiveIntensity: 1.4, roughness: 0.2 });
  const legL = pivot(-0.4, 1.7, 0), legR = pivot(0.4, 1.7, 0);
  for (const leg of [legL, legR]) {
    const l = box(0.55, 1.6, 0.6, rockM); l.position.y = -0.8; leg.add(l);
    const f = box(0.7, 0.3, 1.0, darkM); f.position.set(0, -1.55, 0.1); leg.add(f);
    g.add(leg);
  }
  const hips = pivot(0, 1.7, 0); g.add(hips);
  const torso = box(1.5, 1.4, 1.0, rockM); torso.position.y = 0.8; hips.add(torso);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), crysM);
  core.position.set(0, 0.9, 0.52); hips.add(core);
  for (const sx of [-1, 1]) {
    const sh = box(0.6, 0.5, 0.8, darkM); sh.position.set(sx * 1.0, 1.35, 0); hips.add(sh);
  }
  const armL = pivot(-1.15, 1.2, 0), armR = pivot(1.15, 1.2, 0);
  hips.add(armL, armR);
  for (const arm of [armL, armR]) {
    const a = box(0.45, 1.3, 0.5, rockM); a.position.y = -0.6; arm.add(a);
    const fist = box(0.6, 0.55, 0.6, darkM); fist.position.y = -1.45; arm.add(fist);
  }
  const neck = pivot(0, 1.55, 0); hips.add(neck);
  const head = box(0.6, 0.5, 0.6, darkM); head.position.y = 0.3; neck.add(head);
  for (const sx of [-1, 1]) {
    const eye = box(0.12, 0.1, 0.05, crysM); eye.position.set(sx * 0.15, 0.34, 0.31); neck.add(eye);
  }
  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4 + Math.random() * 0.3, 5), rockM);
    spike.position.set((Math.random() - 0.5) * 1.2, 1.5 + Math.random() * 0.3, -0.45 - Math.random() * 0.2);
    spike.rotation.x = -0.4; spike.castShadow = true; hips.add(spike);
  }
  return {
    group: g, hips, neck, armL, armR, legL, legR, walkPhase: 0,
    setWalk(p, a = 1) {
      legL.rotation.x = Math.sin(p) * 0.45 * a; legR.rotation.x = Math.sin(p + Math.PI) * 0.45 * a;
      armL.rotation.x = Math.sin(p + Math.PI) * 0.35 * a; armR.rotation.x = Math.sin(p) * 0.35 * a;
      hips.position.y = 1.7 + Math.abs(Math.cos(p)) * 0.08 * a;
      hips.rotation.z = Math.sin(p) * 0.05 * a;
    },
    setIdle(t) {
      armL.rotation.x = Math.sin(t) * 0.06; armR.rotation.x = Math.sin(t + 1) * 0.06;
      hips.position.y = 1.7 + Math.sin(t * 0.9) * 0.03;
      neck.rotation.y = Math.sin(t * 0.3) * 0.3;
    },
    setAttack(k) {
      const r = Math.sin(k * Math.PI);
      armL.rotation.x = -2.2 * r; armR.rotation.x = -2.2 * r;
      hips.rotation.x = 0.2 * r;
    },
    setDead() {
      g.rotation.x = -Math.PI / 2; g.position.y = 0.8;
    },
  };
}
