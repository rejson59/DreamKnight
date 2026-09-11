// Zwierzęta (przyjazne) i wrogowie (AI, walka) + koń gracza.
import * as THREE from 'three';
import { createQuadruped, createGoblin, createGolem } from './rig.js';
import { LOC } from './config.js';
import { groundHeight } from './world.js';

const _tmpQ = new THREE.Quaternion();
function hpBar() {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.75, depthWrite: false }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.09),
    new THREE.MeshBasicMaterial({ color: 0xd83a2a, depthWrite: false }));
  fg.position.z = 0.01;
  g.add(bg, fg);
  g.userData.fg = fg;
  return g;
}

export class CreatureManager {
  constructor(scene, world, textures) {
    this.scene = scene;
    this.world = world;
    this.T = textures;
    this.enemies = [];
    this.animals = [];
    this.horses = [];
    this.playerHorse = null;
    this.lostSheep = null;
    this.boss = null;
    this.spawnAll();
  }

  y(x, z) { return this.world.walkHeight(x, z); }

  addAnimal(type, x, z, opts = {}) {
    const rig = createQuadruped(type, opts);
    rig.group.position.set(x, this.y(x, z), z);
    rig.group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(rig.group);
    const a = {
      type, rig, kind: type,
      home: { x, z }, range: opts.range ?? 25,
      target: null, waitT: Math.random() * 4,
      speed: opts.speed ?? (type === 'rabbit' ? 4 : type === 'deer' ? 3 : 1.5),
      hp: 20, dead: false, deadT: 0,
      loot: type === 'deer' ? 'venison' : null,
      xp: type === 'deer' ? 8 : 2,
      bell: !!opts.bell,
      hostile: false,
    };
    if (opts.bell) {
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xe8b64c, metalness: 0.8, roughness: 0.3 }));
      bell.position.set(0, 0.35, 0.35);
      rig.group.add(bell);
    }
    this.animals.push(a);
    return a;
  }

  addEnemy(kind, x, z, opts = {}) {
    let rig, cfg;
    if (kind === 'goblin') {
      rig = createGoblin();
      cfg = { hp: 45, dmg: 8, speed: 3.4, aggro: 13, xp: 22, loot: [['goblin_ear', 1], ['gold', 12]] };
    } else if (kind === 'wolf') {
      rig = createQuadruped('wolf');
      cfg = { hp: 35, dmg: 7, speed: 5.2, aggro: 16, xp: 18, loot: [['wolf_pelt', 1], ['gold', 8]] };
    } else if (kind === 'golem') {
      rig = createGolem();
      cfg = { hp: 420, dmg: 22, speed: 2.4, aggro: 30, xp: 200, loot: [['crystal_shard', 3], ['gold', 150]], boss: true };
    } else if (kind === 'boar') {
      rig = createQuadruped('boar');
      cfg = { hp: 50, dmg: 9, speed: 4, aggro: 8, xp: 20, loot: [['venison', 2], ['gold', 6]] };
    }
    rig.group.position.set(x, this.y(x, z), z);
    this.scene.add(rig.group);
    const bar = hpBar();
    bar.position.y = kind === 'golem' ? 4.4 : kind === 'wolf' || kind === 'boar' ? 1.7 : 1.9;
    bar.visible = false;
    rig.group.add(bar);
    const e = {
      kind, rig, bar,
      hp: cfg.hp * (opts.hpMul || 1), maxHp: cfg.hp * (opts.hpMul || 1),
      dmg: cfg.dmg, speed: cfg.speed, aggro: cfg.aggro, xp: cfg.xp, loot: cfg.loot,
      home: { x, z }, leash: opts.leash ?? 40,
      state: 'idle', target: null, waitT: Math.random() * 3,
      atkT: 0, atkCd: 0, hitT: 0, dead: false, deadT: 0,
      respawnT: 0, respawns: !cfg.boss && opts.respawns !== false,
      boss: !!cfg.boss, growlT: 0,
    };
    this.enemies.push(e);
    if (e.boss) this.boss = e;
    return e;
  }

  spawnAll() {
    // Jelenie — łąki i skraj lasu
    for (let i = 0; i < 7; i++) {
      const inForest = i < 3;
      const x = inForest ? LOC.forest.x - 70 + Math.random() * 40 : -140 + Math.random() * 280;
      const z = inForest ? LOC.forest.z - 40 + Math.random() * 80 : 130 + Math.random() * 150;
      this.addAnimal('deer', x, z, { range: 30 });
    }
    // Owce — farma i wybieg
    for (let i = 0; i < 5; i++) this.addAnimal('sheep', LOC.farm.x - 25 + Math.random() * 25, LOC.farm.z + 4 + Math.random() * 14, { range: 12, speed: 1.2 });
    // Zaginiona owca (quest) — łąka na wschód od farmy
    this.lostSheep = this.addAnimal('sheep', LOC.farm.x + 75, LOC.farm.z + 10, { range: 8, speed: 1, bell: true });
    this.lostSheep.isLost = true;
    // Króliki
    for (let i = 0; i < 9; i++) {
      const x = -180 + Math.random() * 360, z = 120 + Math.random() * 160;
      this.addAnimal('rabbit', x, z, { range: 15 });
    }
    // Dziki — dzicz
    for (const [x, z] of [[-100, 200], [120, 220], [-160, 120], [90, -60]]) this.addEnemy('boar', x, z);
    // Wilki — magiczny las
    const wolfSpots = [[150, 10], [170, 60], [210, 20], [190, -20], [230, 70], [160, -45], [225, -10]];
    for (const [x, z] of wolfSpots) this.addEnemy('wolf', x, z);
    // Gobliny — góry i obóz
    const gobSpots = [[40, -190], [30, -210], [52, -205], [25, -180], [55, -185], [70, -150], [10, -160], [90, -190]];
    for (const [x, z] of gobSpots) this.addEnemy('goblin', x, z);
    // Golem — jaskinia
    this.addEnemy('golem', LOC.caveCenter.x - 6, LOC.caveCenter.z, { leash: 30, respawns: false });
    // Konie w stajni (ozdobne)
    if (this.world.paddock) {
      const p = this.world.paddock;
      this.addStableHorse((p.x1 + p.x2) / 2 - 3, (p.z1 + p.z2) / 2, 0x5a3a22);
      this.addStableHorse((p.x1 + p.x2) / 2 + 2, (p.z1 + p.z2) / 2 + 3, 0x2e2e36);
    }
  }

  addStableHorse(x, z, color) {
    const rig = createQuadruped('horse', { color });
    rig.group.position.set(x, this.y(x, z), z);
    rig.group.rotation.y = Math.random() * 6;
    this.scene.add(rig.group);
    this.horses.push({ rig, stable: true, grazeT: Math.random() * 3 });
  }

  spawnPlayerHorse() {
    if (this.playerHorse || !this.world.paddock) return;
    const p = this.world.paddock;
    const rig = createQuadruped('horse', { color: 0x7a5230 });
    rig.group.position.set(p.x2 - 2, 0, (p.z1 + p.z2) / 2);
    this.scene.add(rig.group);
    this.playerHorse = { rig, following: false };
  }

  ensurePlayerHorse(hasHorse) {
    if (hasHorse && !this.playerHorse) this.spawnPlayerHorse();
  }

  callHorse() {
    if (!this.playerHorse || !this.game) return;
    const p = this.game.player;
    const h = this.playerHorse.rig.group.position;
    h.set(p.group.position.x + 2, this.y(p.group.position.x + 2, p.group.position.z + 2), p.group.position.z + 2);
    this.game.audio.play('horse');
    this.game.ui.toast('🐎 Koń przybiegł do Ciebie!');
  }

  // ---- OBRAŻENIA ----
  damageEnemy(e, dmg, dirX, dirZ, game) {
    if (e.dead) return;
    e.hp -= dmg;
    e.hitT = 0.25;
    e.bar.visible = true;
    e.bar.userData.fg.scale.x = Math.max(0.001, e.hp / e.maxHp);
    e.bar.userData.fg.position.x = -(1 - e.hp / e.maxHp) * 0.53;
    // odrzut
    const p = { x: e.rig.group.position.x, z: e.rig.group.position.z };
    this.world.tryMove(p, dirX * 0.7, dirZ * 0.7, 0.5, e.rig.group.position.y);
    e.rig.group.position.x = p.x; e.rig.group.position.z = p.z;
    if (e.hp <= 0) this.kill(e, game);
    else if (e.state === 'idle' || e.state === 'wander') e.state = 'chase';
  }

  kill(e, game) {
    e.dead = true; e.deadT = 0;
    e.rig.setDead();
    e.bar.visible = false;
    game.audio.play('enemyDie');
    const p = game.player;
    p.addXp(e.xp);
    // łup
    for (const [id, n] of e.loot) {
      if (id === 'gold') p.addGold(n + ((Math.random() * n) | 0));
      else {
        p.inv.add(id, n);
        game.ui.toast(`🎁 Zdobyto: ${n}x ${this.itemName(id)}`);
        game.quests.onCollect(id);
      }
    }
    game.ui.toast(`⚔️ Pokonano: ${this.enemyName(e.kind)}! +${e.xp} PD`);
    game.quests.onKill(e.kind);
    if (e.boss) {
      game.ui.hideBoss();
      game.ui.toast('👑 Golem pokonany! Otwórz skrzynię w głębi jaskini!', 'quest');
      game.audio.play('win');
    }
  }

  damageAnimal(a, dmg, game) {
    if (a.dead) return;
    a.hp -= dmg;
    if (a.hp <= 0) {
      a.dead = true; a.deadT = 0;
      a.rig.setDead();
      game.audio.play('enemyDie');
      game.player.addXp(a.xp);
      if (a.loot) {
        game.player.inv.add(a.loot, a.type === 'deer' ? 2 : 1);
        game.ui.toast(`🎁 Zdobyto: ${this.itemName(a.loot)}`);
        game.quests.onCollect(a.loot);
      }
    } else {
      // ucieczka
      const px = game.player.group.position;
      const dx = a.rig.group.position.x - px.x, dz = a.rig.group.position.z - px.z;
      const d = Math.hypot(dx, dz) || 1;
      a.target = { x: a.rig.group.position.x + (dx / d) * 20, z: a.rig.group.position.z + (dz / d) * 20, flee: true };
    }
  }

  enemyName(kind) {
    return { goblin: 'Goblin', wolf: 'Wilk', golem: 'Kamienny Golem', boar: 'Dzik' }[kind] || kind;
  }
  itemName(id) {
    const names = { venison: 'dzikie mięso', wolf_pelt: 'skóra wilka', goblin_ear: 'ucho goblina', royal_crystal: 'Kryształ Królewski' };
    return names[id] || id;
  }

  meleeHit(x, z, dirX, dirZ, range, dmg, game) {
    // trafienie wrogów i zwierząt w łuku przed graczem
    let hitAny = false;
    const tryHit = (pos, obj, isEnemy) => {
      if (obj.dead) return;
      const dx = pos.x - x, dz = pos.z - z;
      const d = Math.hypot(dx, dz);
      if (d > range) return;
      const dot = (dx * dirX + dz * dirZ) / (d || 1);
      if (d > 1.2 && dot < 0.35) return;
      if (isEnemy) this.damageEnemy(obj, dmg * (0.9 + Math.random() * 0.2), dirX, dirZ, game);
      else this.damageAnimal(obj, dmg, game);
      hitAny = true;
    };
    for (const e of this.enemies) tryHit(e.rig.group.position, e, true);
    for (const a of this.animals) {
      if (a.isLost) continue; // zaginionej owcy nie można skrzywdzić
      tryHit(a.rig.group.position, a, false);
    }
    return hitAny;
  }

  projectileHit(x, y, z, dmg, game) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const p = e.rig.group.position;
      const r = e.boss ? 2.2 : 1.1;
      if (Math.hypot(p.x - x, p.z - z) < r && y < p.y + (e.boss ? 4 : 2.2)) {
        this.damageEnemy(e, dmg, (x - game.player.group.position.x), (z - game.player.group.position.z), game);
        return true;
      }
    }
    return false;
  }

  // ---- AI ----
  update(dt, t, player, game) {
    const px = player.group.position.x, pz = player.group.position.z;
    const playerDead = player.dead;

    // Wrogowie
    for (const e of this.enemies) {
      const g = e.rig.group;
      if (e.dead) {
        e.deadT += dt;
        if (e.deadT > 2) g.position.y -= dt * 0.5; // zapadanie
        if (e.respawns) {
          e.respawnT += dt;
          if (e.respawnT > 90) {
            e.dead = false; e.respawnT = 0; e.hp = e.maxHp;
            g.rotation.set(0, Math.random() * 6, 0);
            g.position.set(e.home.x, this.y(e.home.x, e.home.z), e.home.z);
            e.state = 'idle';
          }
        } else if (e.deadT > 6) g.visible = false;
        continue;
      }
      if (e.hitT > 0) e.hitT -= dt;
      const dx = px - g.position.x, dz = pz - g.position.z;
      const d = Math.hypot(dx, dz);
      const homeD = Math.hypot(g.position.x - e.home.x, g.position.z - e.home.z);
      if (e.atkCd > 0) e.atkCd -= dt;

      // pasek HP zawsze do kamery
      if (e.bar.visible) e.bar.quaternion.copy(game.camera.quaternion), g.getWorldQuaternion(new THREE.Quaternion());

      let moving = false;
      if (!playerDead && d < e.aggro && homeD < e.leash + 10) {
        if (e.state !== 'chase') {
          e.state = 'chase';
          if (e.kind === 'wolf') game.audio.play('wolf');
          if (e.kind === 'goblin') game.audio.play('goblin');
        }
      } else if (homeD > e.leash) {
        e.state = 'return';
        e.bar.visible = false;
      } else if (e.state === 'chase' && (d > e.aggro * 1.6 || playerDead)) {
        e.state = 'return';
        e.bar.visible = false;
      }

      if (e.state === 'chase' && !playerDead) {
        const want = Math.atan2(dx, dz);
        g.rotation.y = want;
        const reach = e.boss ? 3.4 : 1.7;
        if (d > reach) {
          const sp = e.speed * dt;
          const p = { x: g.position.x, z: g.position.z };
          this.world.tryMove(p, (dx / d) * sp, (dz / d) * sp, 0.5, g.position.y);
          g.position.x = p.x; g.position.z = p.z;
          g.position.y = this.y(p.x, p.z);
          moving = true;
        } else if (e.atkCd <= 0) {
          e.atkT = 0.001; // start animacji ataku
          e.atkCd = e.boss ? 2.2 : 1.4;
          // obrażenia po chwili (wymach)
          setTimeout(() => {
            if (e.dead || player.dead) return;
            const dd = Math.hypot(player.group.position.x - g.position.x, player.group.position.z - g.position.z);
            if (dd < reach + 0.9) player.takeDamage(e.dmg, g.position, game);
          }, e.boss ? 450 : 280);
          game.audio.play('swing');
        }
        if (e.boss) game.ui.showBoss('Kamienny Golem', e.hp / e.maxHp);
      } else if (e.state === 'return') {
        const hx = e.home.x - g.position.x, hz = e.home.z - g.position.z;
        const hd = Math.hypot(hx, hz);
        if (hd < 1.5) { e.state = 'idle'; e.hp = e.maxHp; e.bar.visible = false; }
        else {
          g.rotation.y = Math.atan2(hx, hz);
          const sp = e.speed * 0.8 * dt;
          const p = { x: g.position.x, z: g.position.z };
          this.world.tryMove(p, (hx / hd) * sp, (hz / hd) * sp, 0.5, g.position.y);
          g.position.x = p.x; g.position.z = p.z;
          g.position.y = this.y(p.x, p.z);
          moving = true;
        }
        if (e.boss) game.ui.hideBoss();
      } else {
        // włóczęga wokół domu
        if (!e.target) {
          if (e.waitT > 0) { e.waitT -= dt; }
          else {
            const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 7;
            e.target = { x: e.home.x + Math.cos(a) * r, z: e.home.z + Math.sin(a) * r };
          }
        } else {
          const tx = e.target.x - g.position.x, tz = e.target.z - g.position.z;
          const td = Math.hypot(tx, tz);
          if (td < 0.7) { e.target = null; e.waitT = 2 + Math.random() * 4; }
          else {
            g.rotation.y = Math.atan2(tx, tz);
            const sp = e.speed * 0.3 * dt;
            const p = { x: g.position.x, z: g.position.z };
            this.world.tryMove(p, (tx / td) * sp, (tz / td) * sp, 0.5, g.position.y);
            g.position.x = p.x; g.position.z = p.z;
            g.position.y = this.y(p.x, p.z);
            moving = true;
          }
        }
      }
      // animacja
      if (e.atkT > 0) {
        e.atkT += dt / (e.boss ? 0.9 : 0.5);
        if (e.atkT >= 1) e.atkT = 0;
        else e.rig.setAttack(e.atkT);
      } else if (moving) {
        e.rig.walkPhase += dt * (e.kind === 'wolf' || e.kind === 'boar' ? 9 : 7);
        e.rig.setWalk(e.rig.walkPhase, e.state === 'chase' ? 1 : 0.5);
      } else e.rig.setIdle(t);
      // błysk trafienia
      const s = e.hitT > 0 ? 1.08 : 1;
      g.scale.set(s, s, s);
    }

    // Zwierzęta
    for (const a of this.animals) {
      const g = a.rig.group;
      if (a.dead) {
        a.deadT += dt;
        if (a.deadT > 2) g.position.y -= dt * 0.4;
        if (a.deadT > 90 && !a.isLost) {
          a.dead = false; a.hp = 20;
          g.rotation.set(0, Math.random() * 6, 0);
          g.position.set(a.home.x, this.y(a.home.x, a.home.z), a.home.z);
        } else if (a.deadT > 5) g.visible = a.isLost ? true : false;
        if (!a.dead && !a.isLost) g.visible = true;
        continue;
      }
      // gracz blisko — płochliwe uciekają
      const dx = g.position.x - px, dz = g.position.z - pz;
      const d = Math.hypot(dx, dz);
      if (!a.isLost && (a.type === 'deer' || a.type === 'rabbit') && d < (a.type === 'rabbit' ? 5 : 7)) {
        a.target = { x: g.position.x + (dx / (d || 1)) * 25, z: g.position.z + (dz / (d || 1)) * 25, flee: true };
      }
      let moving = false;
      if (!a.target) {
        if (a.waitT > 0) a.waitT -= dt;
        else {
          const an = Math.random() * Math.PI * 2, r = Math.random() * a.range;
          a.target = { x: a.home.x + Math.cos(an) * r, z: a.home.z + Math.sin(an) * r };
        }
        a.rig.setIdle(t);
      } else {
        const tx = a.target.x - g.position.x, tz = a.target.z - g.position.z;
        const td = Math.hypot(tx, tz);
        if (td < 1) { a.target = null; a.waitT = 2 + Math.random() * 5; }
        else {
          g.rotation.y = Math.atan2(tx, tz);
          const sp = a.speed * (a.target.flee ? 1.6 : 0.5) * dt;
          const p = { x: g.position.x, z: g.position.z };
          const before = { ...p };
          this.world.tryMove(p, (tx / td) * sp, (tz / td) * sp, 0.5, g.position.y);
          if (p.x === before.x && p.z === before.z) { a.target = null; a.waitT = 1; }
          g.position.x = p.x; g.position.z = p.z;
          g.position.y = this.y(p.x, p.z);
          moving = true;
        }
      }
      if (moving) {
        a.rig.walkPhase += dt * (a.type === 'rabbit' ? 12 : 7);
        a.rig.setWalk(a.rig.walkPhase, a.target?.flee ? 1 : 0.5);
      }
    }

    // Konie w stajni — leniwe
    for (const h of this.horses) {
      h.grazeT -= dt;
      if (h.grazeT < 0) {
        h.grazeT = 3 + Math.random() * 5;
        h.rig.group.rotation.y += (Math.random() - 0.5) * 1.5;
      }
      h.rig.setIdle(t);
    }
    // Koń gracza
    if (this.playerHorse && !player.mounted) {
      const h = this.playerHorse.rig;
      // podąża za graczem, gdy daleko i gracz gwizdnął? stoi — lekka animacja
      h.setIdle(t);
      // grawitacja do ziemi
      h.group.position.y = this.y(h.group.position.x, h.group.position.z);
    }
  }
}
