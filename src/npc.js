import * as THREE from 'three';

export class NPC {
  constructor(data) {
    this.data = data;
    this.name = data.name;
    this.role = data.role;
    this.shop = data.id;
    this.group = new THREE.Group();
    this.build(data);
    this.group.position.set(data.pos[0], data.pos[1] || 0, data.pos[2]);
    this.baseY = data.pos[1] || 0;
    this.idleT = Math.random() * 10;
  }

  build(d) {
    const cloth = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd8a97e, roughness: 0.7 });
    const hair = new THREE.MeshStandardMaterial({ color: d.hair || 0x3b2f22, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 });

    this.body = new THREE.Group();
    this.group.add(this.body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.4), cloth);
    torso.position.y = 1.12;
    this.body.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
    head.position.y = 1.78;
    this.body.add(head);
    const hairM = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.46), hair);
    hairM.position.y = 1.96;
    this.body.add(hairM);
    // oczy
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.02), eyeMat);
      eye.position.set(0.11 * s, 1.8, 0.215);
      this.body.add(eye);
    }

    this.armL = this.limb(cloth);
    this.armR = this.limb(cloth);
    this.armL.position.set(-0.43, 1.42, 0);
    this.armR.position.set(0.43, 1.42, 0);
    this.body.add(this.armL, this.armR);

    this.legL = this.limb(dark);
    this.legR = this.limb(dark);
    this.legL.position.set(-0.18, 0.72, 0);
    this.legR.position.set(0.18, 0.72, 0);
    this.body.add(this.legL, this.legR);

    this.body.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  limb(mat) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.18), mat);
    box.position.y = -0.25;
    g.add(box);
    return g;
  }

  update(dt, playerPos) {
    this.idleT += dt;
    // obrót w stronę gracza, gdy ten jest blisko
    const dx = playerPos.x - this.group.position.x;
    const dz = playerPos.z - this.group.position.z;
    if (dx * dx + dz * dz < 36) {
      this.group.rotation.y = Math.atan2(dx, dz);
    } else {
      this.group.rotation.y += (0 - this.group.rotation.y) * 0.02;
    }
    this.armL.rotation.x = Math.sin(this.idleT * 1.6) * 0.06;
    this.armR.rotation.x = Math.sin(this.idleT * 1.6 + 1) * 0.06;
  }
}
