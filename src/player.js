// Gracz: rycerz — ruch, kamera TPP, walka, wierzchowiec, statystyki.
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

    // Latarka / pochodnia gracza
    this.torchLight = new THREE.PointLight(0xff9a3d, 0, 22, 1.8);
    this.scene.add(this.torchLight);
    this.torchFlame = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.flame, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.torchFlame.scale.set(0.7, 0.9, 1);
    this.torchFlame.visible = false;
    this.scene.add(this.torchFlame);
    // Pochodnia w ręce (model)
    this.torchMesh = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 7),
      new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 1 }));
    this.torchMesh.add(stick);
    this.torchMesh.visible = false;
    this.rig.handR.add(this.torchMesh);
    this.torchMesh.position.set(0, 0.1, 0.15);

    this.inv = new Inventory();
    this.reset(true);

    // Kamera
    this.camYaw = Math.PI; this.camPitch = 0.32; this.camDist = 7.5;
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
    this.moving = false; this.sprinting = false;
    this.walkPhase = 0;
    this.group.position.set(LOC.spawn.x, this.world.walkHeight(LOC.spawn.x, LOC.spawn.z), LOC.spawn.z);
    this.group.rotation.y = Math.PI;
    this.camYaw = 0; this.camPitch = 0.32;
    if (fresh) {
      this.inv = new Inventory();
      this.inv.add('sword_rusty'); this.inv.equip('sword_rusty');
      this.inv.add('armor_cloth'); this.inv.equip('armor_cloth');
      this.inv.add('bread', 2);
      this.inv.add('potion_s', 1);
    }
    this.updateTorchVisual();
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
        game.ui.toast(`⭐ Poziom ${this.level}! Zdrowie i atak wzrosły.`, 'quest');
      }
    }
  }
  heal(n) { this.hp = Math.min(this.maxHpTotal, this.hp + n); }

  takeDamage(amount, fromPos, game) {
    if (this.dead || (this.hurtT > 0.4)) return;
    const dmg = Math.max(1, Math.round(amount - this.def * 0.7));
    this.hp -= dmg;
    this.hurtT = 0.6;
    if (game) {
      game.audio.play('hurt');
      game.ui.damageFlash();
      game.ui.toast(`💔 -${dmg} HP`, 'bad');
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
    game.audio.play('click');
    game.ui.toast(this.torchOn ? '🕯️ Zapalono pochodnię' : 'Pochodnia zgaszona');
  }

  updateTorchVisual() {
    this.torchLight.intensity = this.torchOn ? 26 : 0;
    this.torchFlame.visible = this.torchOn;
    this.torchMesh.visible = this.torchOn;
    if (this.rig.weaponMesh) this.rig.weaponMesh.visible = !this.torchOn;
  }

  updateWeaponMesh() {
    // pokaż/ukryj miecz zależnie od wyposażenia
    const w = this.inv.equipped('weapon');
    const def = w ? ITEMS[w] : null;
    if (this.rig.weaponMesh) this.rig.weaponMesh.visible = !this.torchOn && !(def && def.ranged);
  }

  get rangedWeapon() {
    const w = this.inv.equipped('weapon');
    return w && ITEMS[w]?.ranged ? w : null;
  }

  // --- GŁÓWNA AKTUALIZACJA ---
  update(dt, ctx) {
    const { input, camera, game } = ctx;
    const dead = this.dead;
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.atkCd > 0) this.atkCd -= dt;

    // Kamera — obrót
    const look = input.consumeLook();
    if (!dead) {
      this.camYaw -= look.dx * 0.0026;
      this.camPitch = Math.max(-0.15, Math.min(1.25, this.camPitch + look.dy * 0.0022));
    }

    // Ruch
    const mv = input.moveVec();
    const wantSprint = input.sprinting() && mv.mag > 0.1 && this.stam > 1;
    this.sprinting = wantSprint && !dead;
    let speed = (this.mounted ? 10.5 : 5.2) * this.speedMul;
    if (this.sprinting) speed *= 1.55;
    if (this.atkT > 0) speed *= 0.35;
    const shallow = this.inShallow();
    if (shallow) speed *= 0.6;

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
      } else if (Math.random() < dt * 3.2) game.audio.play('step');
      if (this.mounted && Math.random() < dt * 4) game.audio.play('horse');
    } else {
      this.stam = Math.min(this.maxStam, this.stam + dt * 16);
    }
    if (!this.sprinting) this.stam = Math.min(this.maxStam, this.stam + dt * 10);

    // Skok / grawitacja
    const gy = this.world.walkHeight(this.group.position.x, this.group.position.z);
    if (!dead && input.jumping() && this.grounded && !this.mounted) {
      this.velY = 5.2;
      this.grounded = false;
      game.audio.play('step');
    }
    if (!this.grounded || this.group.position.y > gy + 0.02) {
      this.velY -= 16 * dt;
      this.group.position.y += this.velY * dt;
      if (this.group.position.y <= gy) {
        this.group.position.y = gy;
        this.velY = 0; this.grounded = true;
      }
    } else {
      this.group.position.y += (gy - this.group.position.y) * Math.min(1, dt * 14);
    }

    // Atak
    if (!dead && input.consumeAttack()) this.tryAttack(ctx);
    if (this.atkT > 0) {
      this.atkT += dt / 0.45;
      if (this.atkT >= 1) this.atkT = 0;
    }

    // Regeneracja z amuletu
    const regen = this.inv.bonus().regen;
    if (regen > 0 && this.hp < this.maxHpTotal) this.hp = Math.min(this.maxHpTotal, this.hp + regen * dt);

    // Koń — pozycja pod graczem
    if (this.mounted && game.creatures.playerHorse) {
      const h = game.creatures.playerHorse.rig;
      h.group.position.set(this.group.position.x, gy, this.group.position.z);
      h.group.rotation.y = this.group.rotation.y;
      if (this.moving) {
        h.walkPhase += dt * (this.sprinting ? 11 : 8);
        h.setWalk(h.walkPhase, this.sprinting ? 1.1 : 0.8);
      } else h.setIdle(ctx.t);
      this.group.position.y = gy + 1.28;
    }

    // Animacja postaci
    if (dead) {
      this.rig.setDead();
    } else if (this.mounted) {
      this.rig.setSit();
      if (this.atkT > 0) this.rig.setAttack(Math.min(1, this.atkT));
    } else if (this.atkT > 0) {
      this.rig.setAttack(Math.min(1, this.atkT));
      this.rig.legL.rotation.x = 0.25; this.rig.legR.rotation.x = -0.2;
    } else if (this.moving) {
      this.walkPhase += dt * (this.sprinting ? 11 : 7.5);
      this.rig.setWalk(this.walkPhase, this.sprinting ? 1.15 : 0.85);
    } else {
      this.rig.setIdle(ctx.t);
    }
    // Błysk obrażeń
    if (this.hurtT > 0.35) this.group.rotation.z = Math.sin(ctx.t * 40) * 0.03;
    else this.group.rotation.z = 0;

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

    // --- KAMERA TPP ---
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
    // kamera nad ziemią
    const camGround = this.world.walkHeight(cp.x, cp.z) + 0.5;
    if (cp.y < camGround) cp.y = camGround;
    // wygładzenie
    if (!this.camInit) { this.camPos.copy(cp); this.camInit = true; }
    else this.camPos.lerp(cp, Math.min(1, dt * 10));
    camera.position.copy(this.camPos);
    camera.lookAt(target);
  }

  inShallow() {
    const { x, z } = this.group.position;
    const d = Math.hypot(x - 208, z - 96);
    return d < 21 && d >= 14.5;
  }

  tryAttack(ctx) {
    if (this.atkCd > 0 || this.atkT > 0) return;
    const { game } = ctx;
    if (this.stam < 8 && !this.mounted) {
      game.ui.toast('Za mało energii!', 'bad');
      return;
    }
    this.stam = Math.max(0, this.stam - 7);
    this.atkT = 0.001;
    this.atkCd = this.mounted ? 0.5 : 0.42;
    game.audio.play('swing');

    const dirX = Math.sin(this.group.rotation.y), dirZ = Math.cos(this.group.rotation.y);
    const px = this.group.position.x, pz = this.group.position.z;

    if (this.rangedWeapon) {
      // strzał z kuszy
      setTimeout(() => {
        if (this.dead) return;
        game.audio.play('bow');
        game.spawnProjectile('bolt', this.atk + 4);
      }, 120);
      return;
    }
    // cios wręcz — trafienie w połowie animacji
    setTimeout(() => {
      if (this.dead) return;
      const dmg = this.atk + Math.random() * 3;
      const range = this.mounted ? 3.4 : 2.6;
      // kierunek ciosu = kierunek postaci
      const dx = Math.sin(this.group.rotation.y), dz = Math.cos(this.group.rotation.y);
      const hit = game.creatures.meleeHit(px, pz, dx, dz, range, dmg, game);
      if (hit) {
        game.audio.play('hit');
        game.ui.hitMarker();
      }
    }, 160);
  }

  castFireball(game) {
    if (!this.inv.spells.includes('fireball')) {
      game.ui.toast('Nie znasz zaklęcia Kuli Ognia! Kup księgę u czarodzieja.', 'bad');
      game.audio.play('error');
      return;
    }
    if (this.stam < 25) { game.ui.toast('Za mało energii na zaklęcie!', 'bad'); return; }
    this.stam -= 25;
    this.atkT = 0.001;
    game.audio.play('fireball');
    const power = 1 + this.inv.bonus().spellPower;
    setTimeout(() => game.spawnProjectile('fireball', (this.atk + 14) * power), 150);
  }

  castHeal(game) {
    if (!this.inv.spells.includes('heal')) return false;
    if (this.stam < 30) { game.ui.toast('Za mało energii na zaklęcie!', 'bad'); return false; }
    if (this.hp >= this.maxHpTotal) { game.ui.toast('Masz pełne zdrowie.'); return false; }
    this.stam -= 30;
    this.heal(60 + this.level * 8);
    game.audio.play('heal');
    game.ui.toast('✨ Uleczono rany!', 'gold');
    return true;
  }

  drinkPotion(game) {
    if (this.inv.count('potion_b') > 0) {
      this.inv.remove('potion_b');
      this.heal(120);
      game.audio.play('potion');
      game.ui.toast('⚗️ +120 HP', 'gold');
      return true;
    }
    if (this.inv.count('potion_s') > 0) {
      this.inv.remove('potion_s');
      this.heal(50);
      game.audio.play('potion');
      game.ui.toast('🧪 +50 HP', 'gold');
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
      game.ui.toast('🐎 Zsiadłeś z konia');
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
      game.ui.toast('🐎 Jedziesz konno! (H — zsiądź)');
    }
  }

  respawn(game) {
    this.dead = false;
    this.hp = this.maxHpTotal;
    this.stam = this.maxStam;
    this.group.rotation.set(0, Math.PI, 0);
    // komnata rycerza
    this.group.position.set(-19, 0.42, -49);
    this.camYaw = 0;
    game.ui.toast('🛡️ Obudziłeś się w swojej komnacie.', 'quest');
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
