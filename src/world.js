import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import {
  grassTexture, dirtTexture, stoneWallTexture, woodTexture, roofTexture,
  waterTexture, rockTexture, cobbleTexture, metalTexture, treeBarkTexture,
} from './textures.js';

const UP = new THREE.Vector3(0, 1, 0);

export class World {
  constructor(game) {
    this.game = game;
    this.obstacles = [];       // {x,z,r}
    this.landmarks = [];       // minimap
    this.enemySpawns = [];
    this.collectibles = [];
    this.animated = [];
    this.waterMats = [];
    this.flames = [];
    this.birds = [];
  }

  build() {
    const G = this.game.scene;
    this.materials();
    this.lights();
    this.sky();
    this.ground();
    this.kingdom();
    this.castle();
    this.market();
    this.houses();
    this.tavern();
    this.mountains();
    this.forest();
    this.cave();
    this.collectiblesSetup();
    this.decor();
    this.enemiesSetup();
  }

  materials() {
    this.mat = {
      grass: new THREE.MeshStandardMaterial({ map: grassTexture(11), roughness: 1 }),
      dirt: new THREE.MeshStandardMaterial({ map: dirtTexture(12), roughness: 1 }),
      stone: new THREE.MeshStandardMaterial({ map: stoneWallTexture(13), roughness: 0.9 }),
      cobble: new THREE.MeshStandardMaterial({ map: cobbleTexture(14), roughness: 0.85 }),
      wood: new THREE.MeshStandardMaterial({ map: woodTexture(15), roughness: 0.85 }),
      woodV: new THREE.MeshStandardMaterial({ map: woodTexture(16, true), roughness: 0.85 }),
      roof: new THREE.MeshStandardMaterial({ map: roofTexture(17), roughness: 0.8 }),
      rock: new THREE.MeshStandardMaterial({ map: rockTexture(18), roughness: 1 }),
      water: new THREE.MeshStandardMaterial({ map: waterTexture(19), roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85 }),
      metal: new THREE.MeshStandardMaterial({ map: metalTexture(20), color: 0xb9c1c9, metalness: 0.85, roughness: 0.35 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xe0b54a, metalness: 0.9, roughness: 0.3 }),
      bark: new THREE.MeshStandardMaterial({ map: treeBarkTexture(21), roughness: 1 }),
      leaves: new THREE.MeshStandardMaterial({ color: 0x2e6b2e, roughness: 0.9 }),
      leavesBright: new THREE.MeshStandardMaterial({ color: 0x4d8f3a, roughness: 0.9 }),
      snow: new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.6 }),
      tent: new THREE.MeshStandardMaterial({ color: 0xa8503a, roughness: 0.8 }),
      tent2: new THREE.MeshStandardMaterial({ color: 0x3a6b6b, roughness: 0.8 }),
      fire: new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff4d00, emissiveIntensity: 2.5 }),
      crystal: new THREE.MeshStandardMaterial({ color: 0x58c6ff, emissive: 0x1a6dff, emissiveIntensity: 1.6 }),
    };
  }

  lights() {
    const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3e3326, 0.75);
    this.game.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe4b0, 2.2);
    sun.position.set(60, 90, 40);
    sun.castShadow = true;
    const q = this.game.quality;
    const size = q === 'low' ? 1024 : q === 'medium' ? 2048 : 4096;
    sun.shadow.mapSize.set(size, size);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 300;
    const ext = q === 'low' ? 90 : 120;
    sun.shadow.camera.left = -ext; sun.shadow.camera.right = ext;
    sun.shadow.camera.top = ext; sun.shadow.camera.bottom = -ext;
    sun.shadow.bias = -0.0005;
    this.game.scene.add(sun);
    this.game.scene.add(sun.target);
    this.sun = sun;
    this.game.scene.add(new THREE.AmbientLight(0xffffff, q === 'low' ? 0.28 : 0.15));
  }

  sky() {
    const sky = new Sky();
    sky.scale.setScalar(10000);
    this.game.scene.add(sky);
    const u = sky.material.uniforms;
    u.turbidity.value = 6;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;
    const elevation = 24, azimuth = 145;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    u.sunPosition.value.setFromSphericalCoords(1, phi, theta);
    const dist = this.game.quality === 'low' ? 400 : 900;
    this.game.scene.fog = new THREE.Fog(0xbccbdb, dist * 0.4, dist);
  }

  addMesh(geo, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (opts.rot) m.rotation.set(opts.rot[0], opts.rot[1], opts.rot[2]);
    if (opts.scale) m.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    this.game.scene.add(m);
    if (opts.obstacle) this.obstacles.push({ x, z, r: opts.obstacle });
    return m;
  }

  ground() {
    const size = 1400;
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), this.mat.grass);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.game.scene.add(this.ground);

    // ścieżka przez królestwo i bramę
    this.addMesh(new THREE.PlaneGeometry(10, 240), this.mat.cobble, 0, 0.03, 40, { rot: [-Math.PI / 2, 0, 0], cast: false });
    this.addMesh(new THREE.PlaneGeometry(14, 150), this.mat.cobble, 0, 0.03, -72, { rot: [-Math.PI / 2, 0, 0], cast: false });
    this.addMesh(new THREE.PlaneGeometry(26, 26), this.mat.cobble, 0, 0.03, 0, { rot: [-Math.PI / 2, 0, 0], cast: false });
    this.addMesh(new THREE.PlaneGeometry(10, 30), this.mat.cobble, 0, 0.03, 88, { rot: [-Math.PI / 2, 0, 0], cast: false });
  }

  // ---------------- Królestwo ----------------
  kingdom() {
    const R = 72;
    const wallH = 9;
    const gateAngle = Math.PI / 2; // +z (południe)
    const segCount = 60;
    const gateHalf = 0.28; // radiany otwarcia
    for (let i = 0; i < segCount; i++) {
      const a0 = (i / segCount) * Math.PI * 2;
      const a1 = ((i + 1) / segCount) * Math.PI * 2;
      const mid = (a0 + a1) / 2;
      const nearGate = Math.abs(Math.atan2(Math.sin(mid - gateAngle), Math.cos(mid - gateAngle))) < gateHalf;
      if (nearGate) continue;
      const x = Math.cos(mid) * R, z = Math.sin(mid) * R;
      const len = (2 * Math.PI * R / segCount) * 1.12;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, wallH, 4), this.mat.stone);
      wall.position.set(x, wallH / 2, z);
      wall.rotation.y = -mid;
      wall.castShadow = true; wall.receiveShadow = true;
      this.game.scene.add(wall);
      // blanki
      for (let b = 0; b < 3; b++) {
        const bx = Math.cos(mid) * R + Math.cos(mid + Math.PI / 2) * (b - 1) * 3;
        const bz = Math.sin(mid) * R + Math.sin(mid + Math.PI / 2) * (b - 1) * 3;
        const bmesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 4.4), this.mat.stone);
        bmesh.position.set(bx, wallH + 0.7, bz);
        bmesh.rotation.y = -mid;
        bmesh.castShadow = true;
        this.game.scene.add(bmesh);
      }
    }
    // rzeka wokół murów
    this.makeRiver(R + 11, 12);
    // fort/brama
    this.makeGate();
    this.landmarks.push({ name: 'Królestwo', x: 0, z: 0, color: '#e9c46a' });
    this.landmarks.push({ name: 'Brama', x: 0, z: 78, color: '#ff8a5c' });
  }

  makeRiver(R, width) {
    const shape = new THREE.Shape();
    const inner = R - width / 2, outer = R + width / 2;
    shape.moveTo(inner, 0);
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      shape.lineTo(Math.cos(t) * outer, Math.sin(t) * outer);
    }
    for (let a = 64; a >= 0; a--) {
      const t = (a / 64) * Math.PI * 2;
      shape.lineTo(Math.cos(t) * inner, Math.sin(t) * inner);
    }
    const geo = new THREE.ShapeGeometry(shape, 64);
    const mesh = new THREE.Mesh(geo, this.mat.water);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02;
    mesh.receiveShadow = true;
    this.game.scene.add(mesh);
    this.waterMats.push(this.mat.water);
    // most w bramie
    this.addMesh(new THREE.BoxGeometry(9, 0.5, width + 10), this.mat.cobble, 0, 0.2, R + 2, {});
  }

  makeGate() {
    const x = 0, z = 75;
    for (const s of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 13, 12), this.mat.stone);
      tower.position.set(8 * s, 6.5, z);
      tower.castShadow = true; tower.receiveShadow = true;
      this.game.scene.add(tower);
      const top = new THREE.Mesh(new THREE.ConeGeometry(4, 3.2, 12), this.mat.wood);
      top.position.set(8 * s, 14.5, z);
      top.castShadow = true;
      this.game.scene.add(top);
      this.obstacles.push({ x: 8 * s, z, r: 3.7 });
      // flaga
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 6), this.mat.wood);
      pole.position.set(8 * s, 15.5, z);
      this.game.scene.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color: 0x9b2333, side: THREE.DoubleSide }));
      flag.position.set(8 * s + 0.9, 17, z);
      flag.rotation.y = Math.PI / 2;
      this.game.scene.add(flag);
      this.flames.push(flag);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 4), this.mat.stone);
    lintel.position.set(0, 10, z);
    lintel.castShadow = true;
    this.game.scene.add(lintel);
    // brama żelazna (otwarta)
    const doorMat = this.mat.metal;
    for (const s of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(5.5, 7, 0.5), doorMat);
      door.position.set(6 * s, 3.5, z);
      this.game.scene.add(door);
    }
  }

  // ---------------- Zamek ----------------
  castle() {
    const cx = 0, cz = -58;
    // główna hala
    const hall = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 14), this.mat.stone);
    hall.position.set(cx, 4, cz);
    hall.castShadow = true; hall.receiveShadow = true;
    this.game.scene.add(hall);
    // brak pełnej kolizji hali — rycerz może wchodzić do sali tronowej
    // dach
    const roofGeo = new THREE.ConeGeometry(12, 6, 4);
    const roof = new THREE.Mesh(roofGeo, this.mat.roof);
    roof.position.set(cx, 10, cz);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.4, 1, 1.1);
    roof.castShadow = true;
    this.game.scene.add(roof);
    // wieża
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, 13, 12), this.mat.stone);
    tower.position.set(cx + 9, 6.5, cz - 4);
    tower.castShadow = true; tower.receiveShadow = true;
    this.game.scene.add(tower);
    const towerTop = new THREE.Mesh(new THREE.ConeGeometry(5, 4, 12), this.mat.wood);
    towerTop.position.set(cx + 9, 15, cz - 4);
    towerTop.castShadow = true;
    this.game.scene.add(towerTop);
    this.obstacles.push({ x: cx + 9, z: cz - 4, r: 4.6 });
    // pokój rycerza
    const room = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 7), this.mat.stone);
    room.position.set(cx + 14, 2.5, cz + 3);
    room.castShadow = true; room.receiveShadow = true;
    this.game.scene.add(room);
    const roomRoof = new THREE.Mesh(new THREE.ConeGeometry(5, 3, 4), this.mat.roof);
    roomRoof.position.set(cx + 14, 6, cz + 3);
    roomRoof.rotation.y = Math.PI / 4;
    roomRoof.scale.set(1.2, 1, 1.2);
    roomRoof.castShadow = true;
    this.game.scene.add(roomRoof);
    this.obstacles.push({ x: cx + 14, z: cz + 3, r: 4.2 });
    // wejście
    this.addDoor(cx, cz + 7.05, 0, 4.5, 3.5, 0x1a0f0a);
    this.addWindow(cx - 5, 6, cz + 7.06);
    this.addWindow(cx + 5, 6, cz + 7.06);
    // tron
    const throne = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 1.2), this.mat.gold);
    throne.position.set(cx, 2, cz - 5);
    throne.castShadow = true;
    this.game.scene.add(throne);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 2), this.mat.wood);
    seat.position.set(cx, 0.8, cz - 4.2);
    this.game.scene.add(seat);
    // sznury/flagi
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), this.mat.wood);
      pole.position.set(13 * s, 8, cz + 6.8);
      this.game.scene.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.4), new THREE.MeshStandardMaterial({ color: 0x9b2333, side: THREE.DoubleSide }));
      flag.position.set(13 * s + 1, 9.2, cz + 6.8);
      this.game.scene.add(flag);
      this.flames.push(flag);
    }
    this.landmarks.push({ name: 'Zamek', x: cx, z: cz, color: '#9b2333' });
  }

  addDoor(x, z, rot, w, h, color = 0x2a1a10) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2), new THREE.MeshStandardMaterial({ color }));
    door.position.set(x, h / 2, z);
    door.rotation.y = rot;
    this.game.scene.add(door);
  }

  addWindow(x, y, z, rot = 0) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.15), new THREE.MeshStandardMaterial({ color: 0x21355a, emissive: 0x0a1628, emissiveIntensity: 0.6 }));
    win.position.set(x, y, z);
    win.rotation.y = rot;
    this.game.scene.add(win);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.75, 0.08), this.mat.wood);
    frame.position.set(x, y, z + 0.05);
    frame.rotation.y = rot;
    this.game.scene.add(frame);
  }

  // ---------------- Rynek ----------------
  market() {
    // fontanna
    const f = this.game.scene;
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 0.7, 24), this.mat.cobble);
    pool.position.set(0, 0.35, 0);
    pool.castShadow = true; pool.receiveShadow = true;
    f.add(pool);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.2, 24), this.mat.water);
    water.position.set(0, 0.72, 0);
    f.add(water);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 2.3, 12), this.mat.stone);
    pillar.position.set(0, 1.4, 0);
    pillar.castShadow = true;
    f.add(pillar);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.9, 0.5, 16), this.mat.cobble);
    basin.position.set(0, 2.7, 0);
    f.add(basin);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), this.mat.gold);
    top.position.set(0, 3.2, 0);
    f.add(top);
    this.obstacles.push({ x: 0, z: 0, r: 3.5 });

    // stragany wokół rynku
    this.makeStall(12, 0, -Math.PI / 2, this.mat.tent);
    this.makeStall(-12, 8, Math.PI / 2, this.mat.tent2);
    this.makeStall(-8, -10, 0, this.mat.tent);
    this.makeStall(16, -12, 0, this.mat.tent2);

    // kuźnia
    this.makeBlacksmith(28, -8);
    // stajnia
    this.makeStable(34, 16);
    // dom czarodzieja
    this.makeWizardHouse(28, 26);
    // karczma
    this.makeTavern(-30, 16);

    this.landmarks.push({ name: 'Rynek', x: 0, z: 0, color: '#7cc0ff' });
  }

  makeStall(x, z, rot, awningMat) {
    const g = new THREE.Group();
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 1.5), this.mat.wood);
    table.position.y = 0.4;
    g.add(table);
    // towar na stole
    for (let i = 0; i < 3; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), this.mat.woodV);
      crate.position.set(-0.9 + i * 0.9, 1.05, 0);
      g.add(crate);
    }
    // parasol/daszek
    const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), this.mat.wood);
    pole1.position.set(-1.4, 1.3, 0.6);
    const pole2 = pole1.clone();
    pole2.position.set(1.4, 1.3, 0.6);
    g.add(pole1, pole2);
    const tent = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2), awningMat);
    tent.position.y = 2.5;
    g.add(tent);
    const tentDown = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 0.1), awningMat);
    tentDown.position.set(0, 2.2, 0.95);
    tentDown.rotation.x = 0.35;
    g.add(tentDown);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.game.scene.add(g);
    this.obstacles.push({ x, z, r: 1.8 });
  }

  makeBlacksmith(x, z) {
    this.makeHouse(x, z, 0, 7, 6, 4.2, 0x6f6a61, this.mat.roof, this.mat.tent);
    // palenisko
    const forge = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.7, 10), this.mat.rock);
    forge.position.set(x + 1.5, 0.35, z + 2.4);
    this.game.scene.add(forge);
    const coals = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.15, 10), this.mat.fire);
    coals.position.set(x + 1.5, 0.72, z + 2.4);
    this.game.scene.add(coals);
    const glow = new THREE.PointLight(0xff7a1a, 4, 8, 2);
    glow.position.set(x + 1.5, 1.6, z + 2.4);
    this.game.scene.add(glow);
    this.flames.push(coals);
  }

  makeStable(x, z) {
    // budynek otwarty
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 6), this.mat.wood);
    base.position.y = 0.15;
    g.add(base);
    const roofH = new THREE.Mesh(new THREE.ConeGeometry(6, 2.5, 4), this.mat.roof);
    roofH.position.y = 3.2;
    roofH.rotation.y = Math.PI / 4;
    roofH.scale.set(1.3, 1, 1);
    g.add(roofH);
    // słupy
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3, 6), this.mat.wood);
      pole.position.set(sx * 3.4, 1.5, sz * 2);
      g.add(pole);
    }
    // konie
    this.addStationaryHorse(g, -1.5, 0.2, 1.2, 0x6b3b1f);
    this.addStationaryHorse(g, 1.5, 0.2, 1.2, 0x2b2b2b);
    g.position.set(x, 0, z);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.game.scene.add(g);
    this.obstacles.push({ x, z, r: 3.2 });
    this.landmarks.push({ name: 'Stajnia', x, z, color: '#8a5a32' });
  }

  addStationaryHorse(parent, x, y, z, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const h = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.5), mat);
    body.position.y = 0.9;
    h.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.5), mat);
    head.position.set(0, 1.15, 0.85);
    head.rotation.x = 0.4;
    h.add(head);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.3), mat);
    neck.position.set(0, 1.3, 0.7);
    neck.rotation.x = 0.5;
    h.add(neck);
    for (const sx of [-1, 1]) for (const sz of [-0.5, 0.5]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), mat);
      leg.position.set(0.22 * sx, 0.45, sz);
      h.add(leg);
    }
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x2a1a10 }));
    mane.position.set(0, 1.55, 0.6);
    mane.rotation.x = 0.4;
    h.add(mane);
    h.position.set(x, y, z);
    parent.add(h);
  }

  makeWizardHouse(x, z) {
    // wieża czarodzieja
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 9, 12), this.mat.stone);
    tower.position.set(x, 4.5, z);
    tower.castShadow = true; tower.receiveShadow = true;
    this.game.scene.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 4, 12), this.mat.tent2);
    roof.position.set(x, 11, z);
    roof.castShadow = true;
    this.game.scene.add(roof);
    this.addWindow(x - 2.3, 5, z + 1.2);
    this.addWindow(x + 2.3, 7, z - 1.2);
    this.obstacles.push({ x, z, r: 2.8 });
    this.landmarks.push({ name: 'Czarodziej', x, z, color: '#a17bff' });
  }

  makeTavern(x, z) {
    this.makeHouse(x, z, Math.PI / 2, 10, 8, 5, 0x7a4a2e, this.mat.roof, this.mat.tent);
    // szyld
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 0.2), this.mat.woodV);
    sign.position.set(x, 3.2, z);
    sign.rotation.y = Math.PI / 2;
    this.game.scene.add(sign);
    const sText = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.22), this.mat.gold);
    sText.position.set(x, 3.2, z);
    sText.rotation.y = Math.PI / 2;
    this.game.scene.add(sText);
    this.landmarks.push({ name: 'Karczma', x, z, color: '#ff9a5c' });
    this.obstacles.push({ x, z, r: 4.2 });
  }

  makeHouse(x, z, rot, w, d, h, wallColor, roofMat, awning) {
    const g = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h / 2;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry((w + d) * 0.45, h * 0.55, 4), roofMat);
    roof.position.y = h + h * 0.26;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.15, 1, 1.15);
    g.add(roof);
    // drzwi i okna na południe (zależy od obrotu)
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x2a1a10 }));
    door.position.set(0, 1.1, d / 2 + 0.05);
    g.add(door);
    this.game.scene.add(g);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // okna na elewacji
    for (const sx of [-w * 0.3, w * 0.3]) {
      this.addWindowScreen(g, sx, h * 0.6, d / 2 + 0.06);
    }
    this.obstacles.push({ x, z, r: Math.max(w, d) * 0.42 });
  }

  addWindowScreen(g, x, y, z) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.16), new THREE.MeshStandardMaterial({ color: 0x21355a, emissive: 0x0a1628, emissiveIntensity: 0.6 }));
    win.position.set(x, y, z);
    g.add(win);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.1), this.mat.wood);
    frame.position.set(x, y, z + 0.03);
    g.add(frame);
  }

  houses() {
    const spots = [
      [-18, -24, 0.4, 6, 5], [-6, -26, -0.2, 7, 5], [8, -24, 0.8, 6, 5], [20, -22, 0.3, 8, 6],
      [-40, -30, 0, 7, 6], [40, -30, 0.5, 7, 6], [-44, -14, 0, 6, 5],
      [-40, 26, 0.2, 7, 6], [20, 32, -0.4, 6, 5], [-20, 34, 0.6, 6, 5],
      [10, 36, 0, 7, 6], [-34, 36, 0, 6, 5], [42, 30, 0, 6, 5],
      [44, -12, -0.3, 6, 5],
    ];
    const palette = [0x9a8565, 0x8a7a54, 0x6f8a6a, 0xa5765b, 0x7a6f8a];
    spots.forEach((s, i) => {
      this.makeHouse(s[0], s[1], s[2], s[3], s[3] * 0.75 + 1, 4 + (i % 3), palette[i % palette.length], this.mat.roof, this.mat.tent);
    });
  }

  // ---------------- Góry ----------------
  mountains() {
    const rocks = [];
    const rand = this.seeded(1);
    const centers = [
      [-180, -180, 40], [-120, -220, 55], [-30, -240, 48], [80, -220, 42], [150, -170, 36],
      [-220, -120, 35], [-240, -40, 42], [-220, 60, 30],
    ];
    for (const [cx, cz, baseR] of centers) {
      const h = baseR * (1.6 + rand() * 0.9);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(baseR, h, 9), this.mat.rock);
      cone.position.set(cx, h / 2 - 2, cz);
      cone.castShadow = true; cone.receiveShadow = true;
      this.game.scene.add(cone);
      if (h > 45) {
        const snow = new THREE.Mesh(new THREE.ConeGeometry(baseR * 0.4, h * 0.3, 9), this.mat.snow);
        snow.position.set(cx, h - 2 - h * 0.14, cz);
        snow.castShadow = true;
        this.game.scene.add(snow);
      }
      this.obstacles.push({ x: cx, z: cz, r: baseR * 0.82 });
      // skalne bloki u stóp
      for (let i = 0; i < 6; i++) {
        const a = rand() * Math.PI * 2;
        const rr = baseR * (0.5 + rand() * 0.5);
        const bx = cx + Math.cos(a) * rr, bz = cz + Math.sin(a) * rr;
        const box = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + rand() * 3, 0), this.mat.rock);
        box.position.set(bx, 1.5 + rand() * 1.5, bz);
        box.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        box.castShadow = true; box.receiveShadow = true;
        this.game.scene.add(box);
        this.obstacles.push({ x: bx, z: bz, r: 2.4 });
        rocks.push(box);
      }
    }
    this.landmarks.push({ name: 'Góry', x: -80, z: -200, color: '#9aa3ad' });
  }

  // ---------------- Magiczny las ----------------
  forest() {
    const rand = this.seeded(2);
    const count = 120;
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 6, 8);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, this.mat.bark, count);
    const leafGeo = new THREE.ConeGeometry(2.4, 4.5, 8);
    const denseGeo = new THREE.IcosahedronGeometry(2.2, 0);
    const leafMesh = new THREE.InstancedMesh(leafGeo, this.mat.leaves, count);
    const glowMesh = new THREE.InstancedMesh(denseGeo, new THREE.MeshStandardMaterial({ color: 0x42a86b, emissive: 0x1a5e3a, emissiveIntensity: 0.7 }), count);
    trunkMesh.castShadow = leafMesh.castShadow = glowMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let i = 0; i < count; i++) {
      const x = 110 + rand() * 120;
      const z = -60 + rand() * 160;
      const s = 0.7 + rand() * 0.9;
      const y = 3 * s;
      dummy.position.set(x, y, z);
      dummy.scale.set(s, s, s);
      dummy.rotation.y = rand() * Math.PI * 2;
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(idx, dummy.matrix);
      dummy.position.y += 3.4 * s;
      dummy.updateMatrix();
      leafMesh.setMatrixAt(idx, dummy.matrix);
      if (i % 3 === 0) glowMesh.setMatrixAt(idx, dummy.matrix);
      else { dummy.scale.setScalar(0.0001); dummy.updateMatrix(); glowMesh.setMatrixAt(idx, dummy.matrix); }
      this.obstacles.push({ x, z, r: 0.9 * s });
      idx++;
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    leafMesh.instanceMatrix.needsUpdate = true;
    glowMesh.instanceMatrix.needsUpdate = true;
    this.game.scene.add(trunkMesh, leafMesh, glowMesh);
    this.landmarks.push({ name: 'Magiczny las', x: 170, z: 30, color: '#6bd77a' });
  }

  // ---------------- Jaskinia ----------------
  cave() {
    const cx = -110, cz = -120;
    const rand3 = this.seeded(3);
    // porośnięta skałami grota z otwartym wejściem od południa (+z)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 24), this.mat.rock);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.2, cz);
    this.game.scene.add(floor);
    // obręcz głazów z pozostawionym wejściem
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.55) continue;
      const rr = 8.5 + rand3() * 2;
      const bx = cx + Math.cos(a) * rr, bz = cz + Math.sin(a) * rr;
      const h = 4 + rand3() * 5;
      const box = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4 + rand3() * 3.4, 0), this.mat.rock);
      box.position.set(bx, h * 0.5, bz);
      box.scale.set(1, h / 3, 1);
      box.castShadow = true; box.receiveShadow = true;
      this.game.scene.add(box);
      this.obstacles.push({ x: bx, z: bz, r: 3 });
    }
    // świecące kryształy wewnątrz
    this.caveCrystalPositions = [];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const px = cx + Math.cos(a) * 6, pz = cz + Math.sin(a) * 6;
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2, 5), this.mat.crystal);
      crystal.position.set(px, 1.3, pz);
      this.game.scene.add(crystal);
      if (i < 2) {
        const l = new THREE.PointLight(0x58c6ff, 2, 8, 2);
        l.position.set(px, 2, pz);
        this.game.scene.add(l);
      }
      this.caveCrystalPositions.push([px, pz]);
    }
    this.landmarks.push({ name: 'Jaskinia', x: cx, z: cz, color: '#58c6ff' });
  }

  // ---------------- Dekoracje ----------------
  collectiblesSetup() {
    const rand = this.seeded(5);
    // zioła w lesie
    for (let i = 0; i < 16; i++) {
      const x = 115 + rand() * 100;
      const z = -50 + rand() * 130;
      this.collectibles.push({ id: `herb-${i}`, type: 'herb', x, z, taken: false, mesh: this.makeHerb(x, z) });
    }
    // kryształ w jaskini
    for (let i = 0; i < 4; i++) {
      const [fx, fz] = this.caveCrystalPositions[i];
      this.collectibles.push({ id: `crystal-${i}`, type: 'crystal', x: fx, z: fz, taken: false, mesh: this.makeCrystalPickup(fx, fz) });
    }
    // kwiaty na łąkach
    for (let i = 0; i < 10; i++) {
      const x = -60 + rand() * 120;
      const z = 40 + rand() * 100;
      this.collectibles.push({ id: `flower-${i}`, type: 'flower', x, z, taken: false, mesh: this.makeFlower(x, z) });
    }
  }

  makeHerb(x, z) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6), this.mat.leavesBright);
    stem.position.y = 0.35;
    g.add(stem);
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 5), this.mat.leavesBright);
      leaf.position.set(Math.cos(i * 1.57) * 0.15, 0.45, Math.sin(i * 1.57) * 0.15);
      leaf.rotation.z = Math.cos(i * 1.57) * 0.7;
      g.add(leaf);
    }
    this.game.scene.add(g);
    g.position.set(x, 0, z);
    return g;
  }

  makeCrystalPickup(x, z) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 5), this.mat.crystal);
    c.position.y = 0.7;
    g.add(c);
    this.game.scene.add(g);
    g.position.set(x, 0, z);
    return g;
  }

  makeFlower(x, z) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 5), this.mat.leavesBright);
    stem.position.y = 0.2;
    g.add(stem);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf0d060, emissive: 0x6a4a00, emissiveIntensity: 0.5 }));
    head.position.y = 0.5;
    g.add(head);
    this.game.scene.add(g);
    g.position.set(x, 0, z);
    return g;
  }

  decor() {
    // płynące ptaki
    const birdMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const rnd20 = this.seeded(20), rnd21 = this.seeded(21), rnd22 = this.seeded(22);
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 6), birdMat);
      body.rotation.x = Math.PI / 2;
      b.add(body);
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), birdMat);
        wing.position.set(s * 0.6, 0, 0);
        wing.rotation.z = s * 0.3;
        b.add(wing);
      }
      b.userData.angle = i * 0.785;
      b.userData.radius = 40 + rnd20() * 80;
      b.userData.speed = 0.05 + rnd21() * 0.06;
      b.userData.baseY = 40 + rnd22() * 30;
      this.game.scene.add(b);
      this.birds.push(b);
    }
    // kilka latarni przy drodze
    for (let i = 1; i < 11; i++) {
      const x = i % 2 === 0 ? 6 : -6;
      const z = 10 + i * 12;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3, 6), this.mat.wood);
      pole.position.set(x, 1.5, z);
      this.game.scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa44, emissiveIntensity: 1.5 }));
      lamp.position.set(x, 3.3, z);
      this.game.scene.add(lamp);
    }
  }

  enemiesSetup() {
    const spawns = [];
    // gobliny w górach i przy jaskini
    const gob = [
      [-125, -135], [-95, -140], [-130, -105], [-80, -125], [-145, -120],
      [40, -180], [65, -175], [110, -160], [130, -140], [75, -140],
    ];
    gob.forEach(([x, z]) => spawns.push({ kind: 'goblin', x, z }));
    // wilki w lesie
    const wolfs = [[130, 10], [150, 40], [170, 60], [190, 10], [155, -10], [210, 40]];
    wolfs.forEach(([x, z]) => spawns.push({ kind: 'wolf', x, z }));
    // zwierzęta na łąkach
    const animals = [[-70, 90], [-40, 110], [30, 120], [60, 100], [-120, 70], [100, 120]];
    animals.forEach(([x, z], i) => spawns.push({ kind: i % 2 === 0 ? 'deer' : 'sheep', x, z }));
    this.enemySpawns = spawns;
  }

  update(dt, t) {
    for (const w of this.waterMats) {
      w.map.offset.x = (t * 0.02) % 1;
      w.map.offset.y = (t * 0.012) % 1;
    }
    for (const f of this.flames) {
      f.rotation.y = Math.sin(t * 1.4 + f.position.x) * 0.35;
    }
    for (const b of this.birds) {
      b.userData.angle += b.userData.speed * dt;
      b.position.set(Math.cos(b.userData.angle) * b.userData.radius, b.userData.baseY + Math.sin(t * 0.8 + b.userData.angle) * 3, Math.sin(b.userData.angle) * b.userData.radius);
      b.rotation.y = -b.userData.angle;
      b.children[1].rotation.z = 0.3 + Math.sin(t * 9 + b.userData.angle) * 0.3;
    }
  }

  seeded(seed) {
    let s = seed * 7919;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }
}
