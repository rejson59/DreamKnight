import * as THREE from 'three';
import { metalTexture } from './textures.js';

export class Player {
  constructor(game) {
    this.game = game;
    const tex = metalTexture(42);
    const metal = new THREE.MeshStandardMaterial({ map: tex, color: 0xbcc4cc, metalness: 0.85, roughness: 0.35 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x3b4048, metalness: 0.7, roughness: 0.45 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xc9cfd6, metalness: 0.9, roughness: 0.25 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd8a97e, roughness: 0.7 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x6b1f27, roughness: 0.8 });
    const cloth2 = new THREE.MeshStandardMaterial({ color: 0x3b2a6b, roughness: 0.8 });
    const boot = new THREE.MeshStandardMaterial({ color: 0x2c2018, roughness: 0.9 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe0b54a, metalness: 0.9, roughness: 0.3 });

    this.group = new THREE.Group();
    this.group.position.set(0, 0, -64);

    // Nogi
    this.legL = this.makeLimb(boot, metal);
    this.legR = this.makeLimb(boot, metal);
    this.legL.position.set(-0.22, 1.15, 0);
    this.legR.position.set(0.22, 1.15, 0);
    this.group.add(this.legL, this.legR);

    // Tułów
    this.torso = new THREE.Group();
    this.torso.position.y = 1.75;
    this.group.add(this.torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.6), metal);
    chest.position.y = 0.12;
    this.torso.add(chest);
    const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.12, 0.63), gold);
    chestTrim.position.y = 0.5;
    this.torso.add(chestTrim);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.12, 0.62), darkMetal);
    belt.position.y = -0.3;
    this.torso.add(belt);
    const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.08), cloth);
    tabard.position.set(0, 0, 0.34);
    this.torso.add(tabard);

    // Głowa + hełm
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.85;
    this.torso.add(this.headGroup);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
    this.headGroup.add(head);
    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.32, 12), steel);
    helmet.position.y = 0.18;
    this.headGroup.add(helmet);
    const noseGuard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), steel);
    noseGuard.position.set(0, 0.08, 0.25);
    this.headGroup.add(noseGuard);
    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), cloth);
    plume.position.set(0, 0.42, 0);
    this.headGroup.add(plume);

    // Ręce
    this.armL = this.makeLimb(skin, cloth2);
    this.armR = this.makeLimb(skin, cloth2);
    this.armL.position.set(-0.62, 2.32, 0);
    this.armR.position.set(0.62, 2.32, 0);
    this.group.add(this.armL, this.armR);

    this.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    // Miecz
    this.sword = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.04), steel);
    blade.position.y = 0.75;
    this.sword.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.1), gold);
    guard.position.y = 0.18;
    this.sword.add(guard);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8), darkMetal);
    grip.position.y = 0.05;
    this.sword.add(grip);
    this.sword.position.set(0.62, 1.95, 0.1);
    this.sword.rotation.z = -0.2;
    this.group.add(this.sword);
    this.sword.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    // Pochodnia (dodawana przy zakupie)
    this.torch = null;

    // Koń (gracz może się na niego wsiąść)
    this.mount = null;
  }

  makeLimb(material, material2) {
    const g = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.24), material2);
    upper.position.y = -0.25;
    g.add(upper);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.22), material);
    lower.position.y = -0.75;
    g.add(lower);
    return g;
  }

  addTorch() {
    if (this.torch) return;
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3c26, roughness: 0.9 });
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xff9944, emissive: 0xff5500, emissiveIntensity: 3 });
    this.torch = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 8), wood);
    this.torch.add(stick);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 8), flameMat);
    flame.position.y = 0.6;
    this.torch.add(flame);
    this.torch.position.set(-0.75, 2.1, 0.15);
    this.light = new THREE.PointLight(0xff9a3c, 3, 12, 2);
    this.light.position.y = 0.6;
    this.torch.add(this.light);
    this.group.add(this.torch);
  }

  removeTorch() {
    if (!this.torch) return;
    this.group.remove(this.torch);
    this.torch = null;
    this.light = null;
  }

  update(dt, moving, speed, attackTime, attackDuration) {
    const t = performance.now() / 1000;
    const stride = moving ? Math.sin(t * 10 * (speed / 4)) * 0.55 : 0;
    this.legL.rotation.x = stride;
    this.legR.rotation.x = -stride;
    this.armL.rotation.x = -stride * 0.7;
    this.armR.rotation.x = stride * 0.7;
    if (!moving) {
      this.legL.rotation.x *= 0.8;
      this.legR.rotation.x *= 0.8;
      this.armL.rotation.x = Math.sin(t * 2) * 0.04;
      this.armR.rotation.x = Math.sin(t * 2 + 1) * 0.04;
    }
    if (attackTime > 0) {
      const p = 1 - attackTime / attackDuration; // 0->1
      const swing = Math.sin(p * Math.PI);
      this.armR.rotation.x = -2.2 * swing;
      this.sword.rotation.x = -1.4 * swing;
      this.sword.rotation.z = -0.2 - 0.8 * swing;
    } else {
      this.sword.rotation.x += (0 - this.sword.rotation.x) * 0.2;
      this.sword.rotation.z += (-0.2 - this.sword.rotation.z) * 0.2;
    }
    if (this.light) {
      this.light.intensity = 2.6 + Math.sin(t * 14) * 0.6;
    }
  }
}
