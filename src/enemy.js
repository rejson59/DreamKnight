import * as THREE from 'three';

const STATS = {
  goblin: { hp: 65, dmg: 9, speed: 3.4, aggro: 11, attackCd: 1.4, reward: 12, hostile: true },
  wolf: { hp: 45, dmg: 11, speed: 4.4, aggro: 13, attackCd: 1.2, reward: 16, hostile: true },
  deer: { hp: 35, dmg: 0, speed: 2.6, aggro: 6, attackCd: 0, reward: 8, hostile: false },
  sheep: { hp: 30, dmg: 0, speed: 1.8, aggro: 4, attackCd: 0, reward: 6, hostile: false },
};

export class Enemy {
  constructor(game, kind, x, z, name) {
    this.game = game;
    this.kind = kind;
    this.name = name || (kind === 'goblin' ? 'Goblin' : kind === 'wolf' ? 'Wilk' : kind === 'deer' ? 'Jeleń' : 'Owca');
    this.stats = STATS[kind];
    this.hp = this.stats.hp;
    this.maxHp = this.stats.hp;
    this.group = new THREE.Group();
    this.facing = 0;
    this.state = 'idle'; // idle | chase | attack | dead
    this.attackTimer = 0;
    this.hitFlash = 0;
    this.wanderTarget = null;
    this.wanderTimer = 0;
    this.dead = false;
    this.removeMe = false;
    this.homeX = x; this.homeZ = z;
    this.build(kind);
    this.group.position.set(x, 0, z);
    this.group.rotation.y = Math.random() * Math.PI * 2;
  }

  build(kind) {
    if (kind === 'goblin') this.buildHumanoid(0x6f8f3a, 0x3f5220);
    else if (kind === 'wolf') this.buildQuad(0x9b9b9b, 0x777777, true);
    else if (kind === 'deer') this.buildQuad(0xa8784a, 0xd9c9a8, false);
    else this.buildQuad(0xf2f2f2, 0xd8d0c0, false);
    this.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // Pasek zdrowia
    this.hpGroup = new THREE.Group();
    this.hpBg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.16), new THREE.MeshBasicMaterial({ color: 0x220000, depthTest: false }));
    this.hpFill = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.1), new THREE.MeshBasicMaterial({ color: 0xff5544, depthTest: false }));
    this.hpFill.position.z = 0.001;
    this.hpGroup.add(this.hpBg, this.hpFill);
    this.hpGroup.position.y = kind === 'goblin' ? 2.35 : 1.55;
    this.hpGroup.visible = false;
    this.group.add(this.hpGroup);
  }

  buildHumanoid(color, skin) {
    this.bodyParts = [];
    const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 });
    const d = new THREE.MeshStandardMaterial({ color: 0x2a2a20 });

    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.32), cloth);
    this.torso.position.y = 0.95;
    this.group.add(this.torso);
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skinM);
    this.head.position.y = 1.45;
    this.group.add(this.head);
    // uszy
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), skinM);
      ear.position.set(0.22 * s, 1.55, 0);
      ear.rotation.z = s * -1.2;
      this.group.add(ear);
    }
    // oczy
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffcc33 }));
      eye.position.set(0.1 * s, 1.48, 0.2);
      this.group.add(eye);
    }
    this.armL = this.limb(cloth); this.armR = this.limb(cloth);
    this.armL.position.set(-0.34, 1.1, 0); this.armR.position.set(0.34, 1.1, 0);
    this.group.add(this.armL, this.armR);
    this.legL = this.limb(d); this.legR = this.limb(d);
    this.legL.position.set(-0.15, 0.6, 0); this.legR.position.set(0.15, 0.6, 0);
    this.group.add(this.legL, this.legR);
    // maczuga
    const club = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.7, 8), d);
    club.position.set(0.45, 0.8, 0.1);
    club.rotation.z = -0.3;
    this.group.add(club);
    this.bodyParts = [this.armL, this.armR, this.legL, this.legR];
  }

  buildQuad(bodyColor, bellyColor, isWolf) {
    const bodyM = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
    const bellyM = new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.9 });
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.2), bodyM);
    this.torso.position.y = 0.75;
    this.group.add(this.torso);
    this.head = new THREE.Mesh(isWolf ? new THREE.ConeGeometry(0.25, 0.6, 8) : new THREE.SphereGeometry(0.28, 8, 6), bodyM);
    this.head.position.set(0, 0.9, 0.75);
    this.head.rotation.x = isWolf ? Math.PI / 2 : 0;
    this.group.add(this.head);
    // nogi
    this.legs = [];
    const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
    for (const sx of [-1, 1]) for (const sz of [-0.45, 0.45]) {
      const leg = new THREE.Mesh(legGeo, bodyM);
      leg.position.set(0.22 * sx, 0.35, sz);
      this.group.add(leg);
      this.legs.push(leg);
    }
    if (isWolf) {
      const earM = new THREE.MeshStandardMaterial({ color: 0x777777 });
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), earM);
        ear.position.set(0.14 * s, 1.25, 0.62);
        this.group.add(ear);
      }
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.9, 8), bodyM);
      tail.position.set(0, 0.9, -0.7);
      tail.rotation.x = Math.PI / 2.4;
      this.group.add(tail);
      const eyeM = new THREE.MeshBasicMaterial({ color: 0xff2211 });
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeM);
        eye.position.set(0.12 * s, 0.95 + 0.18 * (0.9 / 0.6), 0.72);
        this.group.add(eye);
      }
    } else if (kind === 'deer') {
      const antler = new THREE.MeshStandardMaterial({ color: 0x8a5a32 });
      for (const s of [-1, 1]) {
        const a = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.5, 6), antler);
        a.position.set(0.12 * s, 1.35, 0.78);
        a.rotation.z = s * -0.5;
        this.group.add(a);
      }
    }
  }

  limb(mat) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.16), mat);
    box.position.y = -0.25;
    g.add(box);
    return g;
  }

  update(dt, playerPos) {
    if (this.dead) return;
    const toPlayer = new THREE.Vector3(playerPos.x - this.group.position.x, 0, playerPos.z - this.group.position.z);
    const dist = toPlayer.length();
    let move = 0;
    const sp = this.stats.speed;

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.group.children.forEach((c) => { if (c.isMesh) c.material.emissive && (c.material.emissive.setHex(0xcc2200), c.material.emissiveIntensity = 0.9); });
    } else {
      this.group.children.forEach((c) => { if (c.isMesh && c.material.emissive) { c.material.emissive.setHex(0x000000); } });
    }

    if (this.stats.hostile) {
      if (dist < this.stats.aggro && dist > 1.4) {
        this.state = 'chase';
        this.facing = Math.atan2(toPlayer.x, toPlayer.z);
        this.group.position.addToScaledVector(toPlayer.normalize(), sp * dt);
        move = 1;
      } else if (dist <= 1.4) {
        this.state = 'attack';
        this.facing = Math.atan2(toPlayer.x, toPlayer.z);
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          this.attackTimer = this.stats.attackCd;
          this.game.enemyAttack(this);
        }
      } else {
        this.state = 'idle';
        this.wander(dt, sp);
      }
    } else {
      if (dist < this.stats.aggro) {
        // płosz się
        this.facing = Math.atan2(toPlayer.x, toPlayer.z);
        this.group.position.addToScaledVector(toPlayer.normalize(), -sp * dt);
        move = 1;
      } else {
        this.wander(dt, sp);
      }
    }
    this.group.rotation.y = this.facing;
    if (this.limb) {
      const t = performance.now() / 1000;
      const stride = move ? Math.sin(t * 9) * 0.5 : 0;
      if (this.armL) { this.armL.rotation.x = stride; this.armR.rotation.x = -stride; }
      if (this.legL) { this.legL.rotation.x = -stride; this.legR.rotation.x = stride; }
      if (this.legs) {
        this.legs[0].rotation.x = stride;
        this.legs[1].rotation.x = -stride;
        this.legs[2].rotation.x = -stride;
        this.legs[3].rotation.x = stride;
      }
    }
    this.hpGroup.visible = this.hp < this.maxHp;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpFill.scale.x = ratio;
    this.hpFill.position.x = -0.53 * (1 - ratio);
    if (this.game.camera) {
      this.hpGroup.lookAt(this.game.camera.position);
    }
  }

  wander(dt, sp) {
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0 || !this.wanderTarget) {
      this.wanderTimer = 2 + Math.random() * 3;
      const a = Math.random() * Math.PI * 2;
      this.wanderTarget = new THREE.Vector3(this.homeX + Math.cos(a) * 6, 0, this.homeZ + Math.sin(a) * 6);
    }
    const to = this.wanderTarget.clone().sub(this.group.position);
    to.y = 0;
    if (to.length() > 0.5) {
      this.facing = Math.atan2(to.x, to.z);
      this.group.position.addScaledVector(to.normalize(), sp * 0.4 * dt);
    }
  }

  takeDamage(dmg) {
    if (this.dead) return;
    this.hp -= dmg;
    this.hitFlash = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.state = 'dead';
      this.playDeath();
    }
  }

  playDeath() {
    this.group.traverse((o) => { if (o.isMesh && o.material) o.material.transparent = true; });
    this.group.rotation.x = -Math.PI / 2;
    this.group.position.y = 0.15;
    this.hpGroup.visible = false;
    setTimeout(() => { this.removeMe = true; }, 1400);
  }
}
