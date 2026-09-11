// Gracz: rycerz — ruch, kamera TPP, walka (kombosy), wierzchowiec, statystyki.
import * as THREE from 'three';
import { createHumanoid } from './rig.js';
import { Inventory, ITEMS } from './items.js';
import { LOC } from './config.js';

export class Player {
  constructor(scene, world, textures) {
    this.scene = scene;
    this.world = world;
    this.T = textures;
    this.rig = createHumanoid({
      skin: 0xd9a066, shirt: 0x3a4a6b, pants: 0x2c2c38,
      helmet: true, armor: true, cape: 0x8f1f1f, sword: true, shield: true,
    });
    this.group = this.rig.group;
    scene.add(this.group);

    // Kusza na plecach (widoczna, gdy wyposażona)
    this.crossbowMesh = new THREE.Group();
    const woodM = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.9 });
    const steelM = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 0.8, roughness: 0.35 });
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), woodM);
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.06), steelM);
    bow.position.z = 0.3;
    this.crossbowMesh.add(stock, bow);
    this.crossbowMesh.position.set(0, 0.45, -0.28);
    this.crossbowMesh.rotation.x = 0.35;
    this.crossbowMesh.visible = false;
    this.rig.hips.add(this.crossbowMesh);
    // Kostur w ręce (gdy wyposażony)
    this.staffMesh = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.5, 7), woodM);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x66d0ff, emissive: 0x2299dd, emissiveIntensity: 1.6 }));
    orb.position.y = 0.82;
    this.staffMesh.add(pole, orb);
    this.staffMesh.visible = false;
    this.rig.handR.add(this.staffMesh);

    // Pochodnia
    this.torchLight = new THREE.PointLight(0xff9a3d, 0, 22, 1.8);
    this.scene.add(this.torchLight);
    this.torchFlame = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.flame, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.torchFlame.scale.set(0.7, 0.9, 1);
    this.torchFlame.visible = false;
    this.scene.add(this.torchFlame);
    this.torchMesh = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 7),
      new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 1 }));
    this.torchMesh.add(stick);
    this.torchMesh.visible = false;
    this.rig.handR.add(this.torchMesh);
    this.torchMesh.position.set(0, 0.1, 0.15);

    this.inv = new Inventory();
    this.reset(true);

    this.camYaw = 0; this.camPitch = 0.32; this.camDist = 7.5;
    this.camPos = new THREE.Vector3();
  }

  reset(fresh = false) {
    this.level = 1; this.xp = 0; this.xpNext = 100;
    this.maxHp = 100; this.hp = 100;
    this.maxStam = 100; this.stam = 100;
    this.gold = 40;
    this.baseAtk = 4; this.baseDef = 0;
    this.dead = false;
    this.mounted = false;
    this.torchOn = false;
    this.velY = 0; this.grounded = true;
    this.atkT = 0; this.atkCd = 0; this.hurtT = 0;
    this.combo = 0; this.comboWindow = 0; this.castT = 0;
    this.landT = 0;
    this.moving = false; this.sprinting = false;
    this.walkPhase = 0;
    this.knockX = 0; this.knockZ = 0;
    this.group.position.set(LOC.spawn.x, this.world.walkHeight(LOC.spawn.x, LOC.spawn.z), LOC.spawn.z);
    this.group.rotation.set(0, Math.PI, 0);
    this.group.scale.set(1, 1, 1);
    this.camYaw = 0; this.camPitch = 0.32;
    if (fresh) {
      this.inv = new Inventory();
      this.inv.add('sword_rusty'); this.inv.equip('sword_rusty');
      this.inv.add('armor_cloth'); this.inv.equip('armor_cloth');
      this.inv.add('bread', 2);
      this.inv.add('potion_s', 1);
    }
    this.updateTorchVisual();
    this.updateWeaponMesh();
  }

  get atk() { return this.baseAtk + (this.level - 1) * 2 + this.inv.bonus().atk; }
  get def() { return this.baseDef + Math.floor((this.level - 1) * 0.7) + this.inv.bonus().def; }
  get speedMul() { return 1 + this.inv.bonus().speed; }
  get maxHpTotal() { return this.maxHp + (this.level - 1) * 12 + this.inv.bonus().hp; }

  addGold(n) { this.gold += n; }
  addXp(n, game) {
    this.xp += n;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = Math.floor(this.xpNext * 1.45);
      this.hp = this.maxHpTotal;
      this.stam = this.maxStam;
      if (game) {
        game.audio.play('levelup');
        game.ui.toast(`Poziom ${this.level}! Zdrowie i atak wzrosły.`, 'quest');
        game.fx.ring(this.group.position.x, this.group.position.y + 0.2, this.group.position.z, 0xffe27a, 4);
        game.fx.burst(this.group.position.x, this.group.position.y + 1, this.group.position.z, 0xffe27a, 24, 5, 0.9);
      }
    }
  }
  heal(n) { this.hp = Math.min(this.maxHpTotal, this.hp + n); }

  applyKnock(dx, dz) { this.knockX += dx; this.knockZ += dz; }

  takeDamage(amount, fromPos, game) {
    if (this.dead || this.hurtT > 0.4) return;
    const dmg = Math.max(1, Math.round(amount - this.def * 0.7));
    this.hp -= dmg;
    this.hurtT = 0.6;
    if (game) {
      game.audio.play('hurt');
      game.ui.damageFlash();
      game.fx.dmg(this.group.position.x, this.group.position.y + 2.1, this.group.position.z, dmg, '#ff6b5e');
      if (fromPos) { // lekki odrzut od ciosu
        const dx = this.group.position.x - fromPos.x, dz = this.group.position.z - fromPos.z;
        const d = Math.hypot(dx, dz) || 1;
        this.applyKnock((dx / d) * 3, (dz / d) * 3);
      }
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      if (game) game.onDeath();
    }
  }

  toggleTorch(game) {
    if (!this.inv.hasTorch && !this.inv.has('torch')) {
      game.ui.toast('Nie masz pochodni! Kup ją na rynku.', 'bad');
      game.audio.play('error');
      return;
    }
    this.torchOn = !this.torchOn;
    this.updateTorchVisual();
    this.updateWeaponMesh();
    game.audio.play('click');
    game.ui.toast(this.torchOn ? 'Zapalono pochodnię' : 'Pochodnia zgaszona');
  }

  updateTorchVisual() {
    this.torchLight.intensity = this.torchOn ? 26 : 0;
    this.torchFlame.visible = this.torchOn;
    this.torchMesh.visible = this.torchOn;
  }

  updateWeaponMesh() {
    const w = this.inv.equipped('weapon');
    const def = w ? ITEMS[w] : null;
    const isRanged = !!(def && def.ranged);
    const isStaff = w === 'staff_apprentice';
    if (this.rig.weaponMesh) this.rig.weaponMesh.visible = !this.torchOn && !isRanged && !isStaff;
    this.crossbowMesh.visible = isRanged;
    this.staffMesh.visible = isStaff && !this.torchOn;
  }

  get rangedWeapon() {
    const w = this.inv.equipped('weapon');
    return w && ITEMS[w]?.ranged ? w : null;
  }

  // --- GŁÓWNA AKTUALIZACJA ---
  update(dt, ctx) {
    const { input, camera, game } = ctx;
    const dead = this.dead;
    this.rig.alive?.(ctx.t);
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.atkCd > 0) this.atkCd -= dt;
    if (this.comboWindow > 0) { this.comboWindow -= dt; if (this.comboWindow <= 0) this.combo = 0; }
    if (this.landT > 0) this.landT -= dt;
    if (this.castT > 0) this.castT -= dt / 0.6;

    const look = input.consumeLook();
    if (!dead) {
      this.camYaw -= look.dx * 0.0026;
      this.camPitch = Math.max(-0.15, Math.min(1.25, this.camPitch + look.dy * 0.0022));
    }

    // Odrzut (knockback)
    if (Math.abs(this.knockX) > 0.05 || Math.abs(this.knockZ) > 0.05) {
      const p = { x: this.group.position.x, z: this.group.position.z };
      this.world.tryMove(p, this.knockX * dt, this.knockZ * dt, 0.55, this.group.position.y);
      this.group.position.x = p.x; this.group.position.z = p.z;
      this.knockX *= 1 - Math.min(1, dt * 6);
      this.knockZ *= 1 - Math.min(1, dt * 6);
    }

    // Ruch
    const mv = input.moveVec();
    const wantSprint = input.sprinting() && mv.mag > 0.1 && this.stam > 1;
    this.sprinting = wantSprint && !dead;
    let speed = (this.mounted ? 10.5 : 5.2) * this.speedMul;
    if (this.sprinting) speed *= 1.55;
    if (this.atkT > 0 || this.castT > 0) speed *= 0.35;
    if (this.inShallow()) speed *= 0.6;

    const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
    const rx = -fz, rz = fx;
    let mx = fx * mv.z + rx * mv.x;
    let mz = fz * mv.z + rz * mv.x;
    const ml = Math.hypot(mx, mz);
    this.moving = ml > 0.05 && !dead;
    if (this.moving) {
      mx = (mx / (ml || 1)) * Math.min(1, mv.mag);
      mz = (mz / (ml || 1)) * Math.min(1, mv.mag);
      const want = Math.atan2(mx, mz);
      let cur = this.group.rotation.y;
      let diff = want - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y = cur + diff * Math.min(1, dt * 12);
      const p = { x: this.group.position.x, z: this.group.position.z };
      this.world.tryMove(p, mx * speed * dt, mz * speed * dt, 0.55, this.group.position.y);
      this.group.position.x = p.x;
      this.group.position.z = p.z;
      if (this.sprinting) {
        this.stam = Math.max(0, this.stam - dt * 14);
        if (Math.random() < dt * 6) game.audio.play('step');
        // kurz spod butów / kopyt
        if (Math.random() < dt * 8) {
          game.fx.burst(p.x, this.group.position.y + 0.15, p.z, 0x9a8a6a, 1, 1.2, 0.5);
        }
      } else if (Math.random() < dt * 3.2) game.audio.play('step');
      if (this.mounted && Math.random() < dt * 4) game.audio.play('horse');
    } else {
      this.stam = Math.min(this.maxStam, this.stam + dt * 16);
    }
    if (!this.sprinting) this.stam = Math.min(this.maxStam, this.stam + dt * 10);

    // Skok / grawitacja
    const gy = this.world.walkHeight(this.group.position.x, this.group.position.z);
    if (!dead && input.jumping() && this.grounded && !this.mounted) {
      this.velY = 5.4;
      this.grounded = false;
      game.audio.play('step');
    }
    if (!this.grounded || this.group.position.y > gy + 0.02) {
      this.velY -= 16 * dt;
      this.group.position.y += this.velY * dt;
      if (this.group.position.y <= gy) {
        this.group.position.y = gy;
        if (this.velY < -7) { // twarde lądowanie
          this.landT = 0.25;
          game.fx.burst(this.group.position.x, gy + 0.1, this.group.position.z, 0x9a8a6a, 6, 2.5, 0.4);
          game.audio.play('step');
        }
        this.velY = 0; this.grounded = true;
      }
    } else {
      this.group.position.y += (gy - this.group.position.y) * Math.min(1, dt * 14);
    }

    // Atak
    if (!dead && input.consumeAttack()) this.tryAttack(ctx);
    if (this.atkT > 0) {
      this.atkT += dt / 0.42;
      if (this.atkT >= 1) { this.atkT = 0; this.comboWindow = 0.9; }
    }

    const regen = this.inv.bonus().regen;
    if (regen > 0 && this.hp < this.maxHpTotal) this.hp = Math.min(this.maxHpTotal, this.hp + regen * dt);

    // Koń
    if (this.mounted && game.creatures.playerHorse) {
      const h = game.creatures.playerHorse.rig;
      h.group.position.set(this.group.position.x, gy, this.group.position.z);
      h.group.rotation.y = this.group.rotation.y;
      if (this.moving) {
        h.walkPhase += dt * (this.sprinting ? 10 : 7);
        if (this.sprinting) h.setGallop(h.walkPhase);
        else h.setWalk(h.walkPhase, 0.9);
      } else h.setIdle(ctx.t);
      this.group.position.y = gy + 1.28;
    }

    // Animacja postaci
    if (dead) {
      this.rig.setDead();
    } else if (this.mounted) {
      this.rig.setSit();
      if (this.atkT > 0) this.rig.setAttack(Math.min(1, this.atkT), this.combo % 3);
    } else if (this.castT > 0) {
      this.rig.setCast(Math.min(1, Math.max(0, this.castT)));
    } else if (this.atkT > 0) {
      this.rig.setAttack(Math.min(1, this.atkT), this.combo % 3);
    } else if (!this.grounded) {
      this.rig.setJump();
    } else if (this.landT > 0) {
      this.rig.setLand();
    } else if (this.hurtT > 0.4) {
      this.rig.setFlinch();
    } else if (this.moving) {
      if (this.sprinting) {
        this.walkPhase += dt * 11;
        this.rig.setRun(this.walkPhase);
      } else {
        this.walkPhase += dt * 7.5;
        this.rig.setWalk(this.walkPhase, 0.85);
      }
    } else if (this.rangedWeapon && input.isDown('MouseLeft')) {
      this.rig.setBowAim();
    } else {
      this.rig.setIdle(ctx.t);
    }

    // Pochodnia
    if (this.torchOn) {
      const tp = this.group.position;
      this.torchLight.position.set(tp.x, tp.y + 2, tp.z);
      this.torchFlame.position.set(tp.x + Math.sin(this.group.rotation.y) * -0.5, tp.y + 1.3, tp.z + Math.cos(this.group.rotation.y) * -0.5);
      const fl = 1 + Math.sin(ctx.t * 13) * 0.12;
      this.torchFlame.scale.set(0.7 * fl, 0.95 * fl, 1);
      this.torchLight.intensity = (this.world.isNight ? 30 : 18) * fl;
    } else {
      this.torchLight.intensity = 0;
    }

    // --- KAMERA TPP (+ trzęsienie) ---
    const target = new THREE.Vector3(
      this.group.position.x,
      this.group.position.y + (this.mounted ? 2.6 : 1.7),
      this.group.position.z
    );
    const dist = this.camDist * (this.mounted ? 1.25 : 1);
    const cp = new THREE.Vector3(
      target.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist,
      target.y + Math.sin(this.camPitch) * dist,
      target.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist
    );
    const camGround = this.world.walkHeight(cp.x, cp.z) + 0.5;
    if (cp.y < camGround) cp.y = camGround;
    if (!this.camInit) { this.camPos.copy(cp); this.camInit = true; }
    else this.camPos.lerp(cp, Math.min(1, dt * 10));
    camera.position.copy(this.camPos);
    // shake
    const sh = game.trauma || 0;
    if (sh > 0.01) {
      camera.position.x += (Math.random() - 0.5) * sh * 0.7;
      camera.position.y += (Math.random() - 0.5) * sh * 0.5;
      target.x += (Math.random() - 0.5) * sh * 0.4;
      target.y += (Math.random() - 0.5) * sh * 0.4;
    }
    camera.lookAt(target);
  }

  inShallow() {
    const { x, z } = this.group.position;
    const d = Math.hypot(x - 208, z - 96);
    return d < 21 && d >= 14.5;
  }

  tryAttack(ctx) {
    if (this.atkCd > 0 || this.atkT > 0 || this.castT > 0) return;
    const { game } = ctx;
    if (this.stam < 8 && !this.mounted) {
      game.ui.toast('Za mało energii!', 'bad');
      return;
    }
    this.stam = Math.max(0, this.stam - 7);
    this.atkT = 0.001;
    this.atkCd = this.mounted ? 0.5 : 0.4;
    // łańcuch kombosa
    this.combo = this.comboWindow > 0 ? (this.combo + 1) % 3 : 0;
    this.comboWindow = 0;
    if (this.combo === 2) game.ui.comboHit('Potrójny cios!');
    game.audio.play('swing');

    // błysk cięcia
    const dirX = Math.sin(this.group.rotation.y), dirZ = Math.cos(this.group.rotation.y);
    game.fx.slash(this.group.position.x + dirX * 1.4, this.group.position.y + 1.3, this.group.position.z + dirZ * 1.4, this.group.rotation.y);

    if (this.rangedWeapon) {
      setTimeout(() => {
        if (this.dead) return;
        game.audio.play('bow');
        game.spawnProjectile('bolt', this.atk + 4);
      }, 120);
      return;
    }
    const comboMult = [1, 1.1, 1.5][this.combo];
    setTimeout(() => {
      if (this.dead) return;
      const dmg = (this.atk + Math.random() * 3) * comboMult;
      const range = this.mounted ? 3.4 : 2.7;
      const dx = Math.sin(this.group.rotation.y), dz = Math.cos(this.group.rotation.y);
      const hit = game.creatures.meleeHit(this.group.position.x, this.group.position.z, dx, dz, range, dmg, game);
      if (hit) {
        game.audio.play('hit');
        game.ui.hitMarker();
        if (this.combo === 2) game.shake(0.25);
      }
    }, 150);
  }

  castFireball(game) {
    if (!this.inv.spells.includes('fireball')) {
      game.ui.toast('Nie znasz zaklęcia Kuli Ognia! Kup księgę u czarodzieja.', 'bad');
      game.audio.play('error');
      return;
    }
    if (this.stam < 25) { game.ui.toast('Za mało energii na zaklęcie!', 'bad'); return; }
    if (this.castT > 0 || this.atkT > 0) return;
    this.stam -= 25;
    this.castT = 1;
    game.audio.play('fireball');
    game.fx.burst(this.group.position.x, this.group.position.y + 1.6, this.group.position.z, 0xff7733, 10, 3, 0.5);
    const power = 1 + this.inv.bonus().spellPower;
    setTimeout(() => { if (!this.dead) game.spawnProjectile('fireball', (this.atk + 14) * power); }, 280);
  }

  castHeal(game) {
    if (!this.inv.spells.includes('heal')) return false;
    if (this.stam < 30) { game.ui.toast('Za mało energii na zaklęcie!', 'bad'); return false; }
    if (this.hp >= this.maxHpTotal) { game.ui.toast('Masz pełne zdrowie.'); return false; }
    this.stam -= 30;
    this.heal(60 + this.level * 8);
    game.audio.play('heal');
    game.fx.ring(this.group.position.x, this.group.position.y + 0.2, this.group.position.z, 0x66ff99, 3);
    game.ui.toast('Uleczono rany!', 'gold');
    return true;
  }

  drinkPotion(game) {
    if (this.inv.count('potion_b') > 0) {
      this.inv.remove('potion_b');
      this.heal(120);
      game.audio.play('potion');
      game.fx.burst(this.group.position.x, this.group.position.y + 1.2, this.group.position.z, 0x66ff99, 10, 2, 0.6);
      game.ui.toast('+120 HP', 'gold');
      return true;
    }
    if (this.inv.count('potion_s') > 0) {
      this.inv.remove('potion_s');
      this.heal(50);
      game.audio.play('potion');
      game.fx.burst(this.group.position.x, this.group.position.y + 1.2, this.group.position.z, 0x66ff99, 8, 2, 0.6);
      game.ui.toast('+50 HP', 'gold');
      return true;
    }
    game.ui.toast('Brak mikstur! Kup je na rynku.', 'bad');
    game.audio.play('error');
    return false;
  }

  mount(game) {
    if (!this.inv.hasHorse) {
      game.ui.toast('Nie masz konia! Kup go w stajni.', 'bad');
      game.audio.play('error');
      return;
    }
    const h = game.creatures.playerHorse;
    if (!h) return;
    if (this.mounted) {
      this.mounted = false;
      const hp = h.rig.group.position;
      hp.set(this.group.position.x + 1.5, this.world.walkHeight(this.group.position.x + 1.5, this.group.position.z), this.group.position.z);
      game.audio.play('horse');
      game.ui.toast('Zsiadłeś z konia');
    } else {
      const d = Math.hypot(h.rig.group.position.x - this.group.position.x, h.rig.group.position.z - this.group.position.z);
      if (d > 4) {
        game.ui.toast('Podejdź bliżej konia (lub gwiżdż w stajni).', 'bad');
        game.audio.play('error');
        return;
      }
      const zone = this.world.zoneAt(this.group.position.x, this.group.position.z);
      if (zone === 'cave' || zone === 'castle') {
        game.ui.toast('Tu nie wjedziesz konno!', 'bad');
        return;
      }
      this.mounted = true;
      game.audio.play('horse');
      game.fx.burst(this.group.position.x, this.group.position.y + 0.3, this.group.position.z, 0x9a8a6a, 8, 2, 0.5);
      game.ui.toast('Jedziesz konno! (H — zsiądź)');
    }
  }

  respawn(game) {
    this.dead = false;
    this.hp = this.maxHpTotal;
    this.stam = this.maxStam;
    this.knockX = 0; this.knockZ = 0;
    this.group.rotation.set(0, Math.PI, 0);
    this.group.scale.set(1, 1, 1);
    this.group.position.set(-19, 0.42, -49);
    this.camYaw = 0;
    game.ui.toast('Obudziłeś się w swojej komnacie.', 'quest');
  }

  serialize() {
    return {
      level: this.level, xp: this.xp, xpNext: this.xpNext,
      hp: this.hp, maxHp: this.maxHp, gold: this.gold,
      pos: [this.group.position.x, this.group.position.z],
      inv: this.inv.serialize(),
    };
  }
  deserialize(d) {
    if (!d) return;
    this.level = d.level || 1; this.xp = d.xp || 0; this.xpNext = d.xpNext || 100;
    this.hp = d.hp ?? 100; this.maxHp = d.maxHp || 100; this.gold = d.gold || 0;
    if (d.pos) {
      this.group.position.set(d.pos[0], this.world.walkHeight(d.pos[0], d.pos[1]), d.pos[1]);
    }
    this.inv.deserialize(d.inv);
    this.hp = Math.min(this.hp, this.maxHpTotal);
  }
}
