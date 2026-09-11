// Zwierzęta (przyjazne) i wrogowie (AI, walka) + koń gracza.
import * as THREE from 'three';
import { createQuadruped, createGoblin, createGolem, createSkeleton, createHumanoid } from './rig.js';
import { LOC } from './config.js';

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
    this.darkKnight = null;
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
      cfg = { hp: 35, dmg: 7, speed: 5.4, aggro: 16, xp: 18, loot: [['wolf_pelt', 1], ['gold', 8]] };
    } else if (kind === 'golem') {
      rig = createGolem();
      cfg = { hp: 420, dmg: 22, speed: 2.4, aggro: 30, xp: 200, loot: [['crystal_shard', 3], ['gold', 150]], boss: true, bossName: 'Kamienny Golem' };
    } else if (kind === 'boar') {
      rig = createQuadruped('boar');
      cfg = { hp: 50, dmg: 9, speed: 4, aggro: 8, xp: 20, loot: [['venison', 2], ['gold', 6]] };
    } else if (kind === 'skeleton') {
      rig = createSkeleton();
      cfg = { hp: 42, dmg: 9, speed: 3.8, aggro: 14, xp: 24, loot: [['gold', 14], ['herb_sun', 1]] };
    } else if (kind === 'darkknight') {
      rig = createHumanoid({
        skin: 0x3a3a44, shirt: 0x1a1a20, pants: 0x14141a, dark: true,
        helmet: true, armor: true, cape: 0x550000, greatsword: true, shield: true,
        glowingEyes: true, scale: 1.32,
      });
      cfg = { hp: 650, dmg: 26, speed: 3.4, aggro: 34, xp: 350, loot: [['gold', 300], ['potion_b', 2]], boss: true, bossName: 'Mroczny Rycerz' };
    }
    rig.group.position.set(x, this.y(x, z), z);
    this.scene.add(rig.group);
    const bar = hpBar();
    bar.position.y = kind === 'golem' ? 4.4 : kind === 'darkknight' ? 3.2 : kind === 'wolf' || kind === 'boar' ? 1.7 : 1.9;
    if (kind === 'darkknight') bar.scale.setScalar(1.4);
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
      boss: !!cfg.boss, bossName: cfg.bossName || null,
      specialCd: 4, summonCd: 10, chargeDir: null, chargeT: 0, minions: 0,
    };
    this.enemies.push(e);
    if (kind === 'golem') this.boss = e;
    if (kind === 'darkknight') this.darkKnight = e;
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
    for (const [x, z] of [[-100, 200], [120, 220], [-160, 120], [90, -60], [-60, 240]]) this.addEnemy('boar', x, z);
    // Wilki — magiczny las
    const wolfSpots = [[150, 10], [170, 60], [210, 20], [190, -20], [230, 70], [160, -45], [225, -10]];
    for (const [x, z] of wolfSpots) this.addEnemy('wolf', x, z);
    // Gobliny — góry i obóz
    const gobSpots = [[40, -190], [30, -210], [52, -205], [25, -180], [55, -185], [70, -150], [10, -160], [90, -190]];
    for (const [x, z] of gobSpots) this.addEnemy('goblin', x, z);
    // Szkielety — ruiny i kamienny krąg
    const skelSpots = [
      [LOC.ruins.x - 8, LOC.ruins.z + 4], [LOC.ruins.x + 9, LOC.ruins.z - 5],
      [LOC.ruins.x + 2, LOC.ruins.z + 11], [LOC.ruins.x - 11, LOC.ruins.z - 8],
      [158, -6], [166, 4],
    ];
    for (const [x, z] of skelSpots) this.addEnemy('skeleton', x, z, { leash: 30 });
    // Golem — jaskinia
    this.addEnemy('golem', LOC.caveCenter.x - 6, LOC.caveCenter.z, { leash: 30, respawns: false });
    // Mroczny Rycerz — arena
    this.addEnemy('darkknight', LOC.arena.x, LOC.arena.z - 6, { leash: 26, respawns: false });
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
    this.game.ui.toast('Koń przybiegł do Ciebie!');
  }

  // ---- OBRAŻENIA ----
  damageEnemy(e, dmg, dirX, dirZ, game) {
    if (e.dead) return;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    e.hitT = 0.25;
    e.bar.visible = true;
    e.bar.userData.fg.scale.x = Math.max(0.001, e.hp / e.maxHp);
    e.bar.userData.fg.position.x = -(1 - e.hp / e.maxHp) * 0.53;
    // odrzut (bossowie odporni)
    if (!e.boss) {
      const p = { x: e.rig.group.position.x, z: e.rig.group.position.z };
      this.world.tryMove(p, dirX * 0.7, dirZ * 0.7, 0.5, e.rig.group.position.y);
      e.rig.group.position.x = p.x; e.rig.group.position.z = p.z;
    }
    // efekty
    const ep = e.rig.group.position;
    game.fx.dmg(ep.x, ep.y + (e.boss ? 3.4 : 1.8), ep.z, dmg, '#ffd75e');
    game.fx.burst(ep.x, ep.y + 1.2, ep.z, 0xffcc55, 8, 4, 0.4);
    if (e.hp <= 0) this.kill(e, game);
    else if (e.state === 'idle' || e.state === 'wander') e.state = 'chase';
  }

  kill(e, game) {
    e.dead = true; e.deadT = 0;
    e.rig.setDead();
    e.bar.visible = false;
    game.audio.play('enemyDie');
    const ep = e.rig.group.position;
    game.fx.burst(ep.x, ep.y + 1, ep.z, 0xff5544, e.boss ? 40 : 16, 6, 0.7);
    if (e.boss) {
      game.fx.ring(ep.x, ep.y + 0.3, ep.z, 0xffaa33, 8);
      game.shake(0.7);
    }
    const p = game.player;
    p.addXp(e.xp, game);
    for (const [id, n] of e.loot) {
      if (id === 'gold') p.addGold(n + ((Math.random() * n) | 0));
      else {
        p.inv.add(id, n);
        game.ui.toast(`Zdobyto: ${n}x ${this.itemName(id)}`);
        game.quests.onCollect(id);
      }
    }
    game.ui.toast(`Pokonano: ${this.enemyName(e.kind)}! +${e.xp} PD`);
    game.quests.onKill(e.kind);
    if (e.kind === 'golem') {
      game.ui.hideBoss();
      game.ui.toast('Golem pokonany! Otwórz skrzynię w głębi jaskini!', 'quest');
      game.audio.play('win');
    }
    if (e.kind === 'darkknight') {
      game.ui.hideBoss();
      game.ui.toast('Mroczny Rycerz pokonany! Królestwo jest wolne!', 'quest');
      game.audio.play('win');
      game.quests.onSpecial('darkknight_dead');
    }
  }

  damageAnimal(a, dmg, game) {
    if (a.dead) return;
    a.hp -= dmg;
    const ap = a.rig.group.position;
    if (a.hp <= 0) {
      a.dead = true; a.deadT = 0;
      a.rig.setDead();
      game.audio.play('enemyDie');
      game.fx.burst(ap.x, ap.y + 0.8, ap.z, 0xff5544, 12, 5, 0.6);
      game.player.addXp(a.xp, game);
      if (a.loot) {
        game.player.inv.add(a.loot, a.type === 'deer' ? 2 : 1);
        game.ui.toast(`Zdobyto: ${this.itemName(a.loot)}`);
        game.quests.onCollect(a.loot);
      }
    } else {
      game.fx.dmg(ap.x, ap.y + 1.2, ap.z, Math.round(dmg), '#ffffff');
      const px = game.player.group.position;
      const dx = a.rig.group.position.x - px.x, dz = a.rig.group.position.z - px.z;
      const d = Math.hypot(dx, dz) || 1;
      a.target = { x: a.rig.group.position.x + (dx / d) * 20, z: a.rig.group.position.z + (dz / d) * 20, flee: true };
    }
  }

  enemyName(kind) {
    return { goblin: 'Goblin', wolf: 'Wilk', golem: 'Kamienny Golem', boar: 'Dzik', skeleton: 'Szkielet', darkknight: 'Mroczny Rycerz' }[kind] || kind;
  }
  itemName(id) {
    const names = { venison: 'dzikie mięso', wolf_pelt: 'skóra wilka', goblin_ear: 'ucho goblina', royal_crystal: 'Kryształ Królewski', crystal_shard: 'odłamek kryształu', herb_moon: 'księżycowe ziele', herb_sun: 'słoneczne ziele' };
    return names[id] || id;
  }

  meleeHit(x, z, dirX, dirZ, range, dmg, game) {
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
      if (a.isLost) continue;
      tryHit(a.rig.group.position, a, false);
    }
    return hitAny;
  }

  projectileHit(x, y, z, dmg, game) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const p = e.rig.group.position;
      const r = e.boss ? 2.4 : 1.1;
      if (Math.hypot(p.x - x, p.z - z) < r && y < p.y + (e.boss ? 4.5 : 2.2)) {
        this.damageEnemy(e, dmg, (x - game.player.group.position.x), (z - game.player.group.position.z), game);
        return true;
      }
    }
    return false;
  }

  // ---- Mroczny Rycerz: przyzwanie szkieletów ----
  summonSkeletons(e, game) {
    const aliveMinions = this.enemies.filter((m) => m.minion && !m.dead).length;
    if (aliveMinions >= 3) return;
    game.audio.play('summon');
    const g = e.rig.group.position;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2;
      const sx = g.x + Math.cos(a) * 4, sz = g.z + Math.sin(a) * 4;
      const m = this.addEnemy('skeleton', sx, sz, { leash: 30 });
      m.minion = true;
      m.state = 'chase';
      game.fx.burst(sx, this.y(sx, sz) + 1, sz, 0xaa44ff, 20, 5, 0.8);
      game.fx.ring(sx, this.y(sx, sz) + 0.2, sz, 0xaa44ff, 3);
    }
    game.ui.toast('Mroczny Rycerz wzywa szkielety!', 'bad');
  }

  // ---- AI ----
  moveToward(e, tx, tz, sp, dt) {
    const g = e.rig.group;
    const dx = tx - g.position.x, dz = tz - g.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    g.rotation.y = Math.atan2(dx, dz);
    const p = { x: g.position.x, z: g.position.z };
    this.world.tryMove(p, (dx / d) * sp * dt, (dz / d) * sp * dt, 0.5, g.position.y);
    g.position.x = p.x; g.position.z = p.z;
    g.position.y = this.y(p.x, p.z);
    return d;
  }

  update(dt, t, player, game) {
    const px = player.group.position.x, pz = player.group.position.z;
    const playerDead = player.dead;
    const passive = game.cutsceneActive; // podczas przerywników wrogowie nie atakują

    // Separacja wrogów (nie nachodzą na siebie)
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const a = es[i];
      if (a.dead || a.boss) continue;
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j];
        if (b.dead || b.boss) continue;
        const dx = b.rig.group.position.x - a.rig.group.position.x;
        const dz = b.rig.group.position.z - a.rig.group.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.4 && d > 0.01) {
          const push = (1.4 - d) * 0.5 * dt * 4;
          const nx = dx / d, nz = dz / d;
          const pa = { x: a.rig.group.position.x, z: a.rig.group.position.z };
          this.world.tryMove(pa, -nx * push, -nz * push, 0.4, a.rig.group.position.y);
          a.rig.group.position.x = pa.x; a.rig.group.position.z = pa.z;
          const pb = { x: b.rig.group.position.x, z: b.rig.group.position.z };
          this.world.tryMove(pb, nx * push, nz * push, 0.4, b.rig.group.position.y);
          b.rig.group.position.x = pb.x; b.rig.group.position.z = pb.z;
        }
      }
    }

    for (const e of this.enemies) {
      const g = e.rig.group;
      if (e.dead) {
        e.deadT += dt;
        if (e.deadT > 2) g.position.y -= dt * 0.5;
        if (e.respawns) {
          e.respawnT += dt;
          if (e.respawnT > 90) {
            e.dead = false; e.respawnT = 0; e.hp = e.maxHp;
            g.rotation.set(0, Math.random() * 6, 0);
            g.scale.set(1, 1, 1);
            g.visible = true;
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
      if (e.specialCd > 0) e.specialCd -= dt;
      if (e.summonCd > 0) e.summonCd -= dt;

      if (e.bar.visible) {
        g.getWorldQuaternion(_tmpQ);
        e.bar.quaternion.copy(_tmpQ.invert().multiply(game.camera.quaternion));
      }

      let moving = false, running = false;
      if (!playerDead && !passive && d < e.aggro && homeD < e.leash + 10) {
        if (e.state !== 'chase' && e.state !== 'chargeTel' && e.state !== 'charge' && e.state !== 'summon') {
          e.state = 'chase';
          if (e.kind === 'wolf') game.audio.play('wolf');
          if (e.kind === 'goblin') game.audio.play('goblin');
          if (e.kind === 'skeleton') game.audio.play('skeleton');
          if (e.boss) { game.audio.play('roar'); game.shake(0.4); }
        }
      } else if (homeD > e.leash) {
        e.state = 'return';
        e.bar.visible = false;
      } else if ((e.state === 'chase') && (d > e.aggro * 1.6 || playerDead || passive)) {
        e.state = 'return';
        e.bar.visible = false;
      }

      // ===== MROCZNY RYCERZ: szarża i przyzwanie =====
      if (e.kind === 'darkknight' && !e.dead) {
        if (e.state === 'chargeTel') {
          g.rotation.y = Math.atan2(dx, dz);
          e.chargeT -= dt;
          e.rig.setBlock();
          if (Math.random() < dt * 20) game.fx.burst(g.position.x, g.position.y + 1, g.position.z, 0xff2222, 2, 3, 0.4);
          if (e.chargeT <= 0) {
            e.state = 'charge'; e.chargeT = 0.75;
            e.chargeDir = { x: dx / (d || 1), z: dz / (d || 1) };
            e.chargeHit = false;
            game.audio.play('charge');
          }
        } else if (e.state === 'charge') {
          e.chargeT -= dt;
          const sp = 15 * dt;
          const p = { x: g.position.x, z: g.position.z };
          this.world.tryMove(p, e.chargeDir.x * sp, e.chargeDir.z * sp, 0.6, g.position.y);
          g.position.x = p.x; g.position.z = p.z;
          g.position.y = this.y(p.x, p.z);
          g.rotation.y = Math.atan2(e.chargeDir.x, e.chargeDir.z);
          e.rig.setRun(e.rig.walkPhase += dt * 14);
          running = true;
          game.fx.burst(g.position.x, g.position.y + 0.5, g.position.z, 0xff4400, 3, 2, 0.5);
          const pd = Math.hypot(player.group.position.x - g.position.x, player.group.position.z - g.position.z);
          if (!e.chargeHit && pd < 2.2 && !playerDead) {
            e.chargeHit = true;
            player.takeDamage(e.dmg + 8, g.position, game);
            player.applyKnock(e.chargeDir.x * 6, e.chargeDir.z * 6);
            game.shake(0.6);
          }
          if (e.chargeT <= 0) { e.state = 'chase'; e.specialCd = 6 + Math.random() * 4; }
        } else if (e.state === 'summon') {
          e.chargeT -= dt;
          e.rig.setCast(1 - e.chargeT / 1.2);
          if (Math.random() < dt * 25) game.fx.burst(g.position.x, g.position.y + 2, g.position.z, 0xaa44ff, 2, 2, 0.6);
          if (e.chargeT <= 0) {
            this.summonSkeletons(e, game);
            e.state = 'chase'; e.summonCd = 18 + Math.random() * 8;
          }
        } else if (e.state === 'chase' && !playerDead && !passive) {
          // decyzje: szarża z daleka, przyzwanie co jakiś czas
          if (e.summonCd <= 0 && d < 20) {
            e.state = 'summon'; e.chargeT = 1.2;
            game.audio.play('summon');
          } else if (e.specialCd <= 0 && d > 6 && d < 22) {
            e.state = 'chargeTel'; e.chargeT = 1.0;
            game.audio.play('roar');
            game.fx.ring(g.position.x, g.position.y + 0.2, g.position.z, 0xff2222, 5);
          }
        }
      }

      if (e.state === 'chase' && !playerDead && !passive) {
        const want = Math.atan2(dx, dz);
        g.rotation.y = want;
        const reach = e.boss ? (e.kind === 'darkknight' ? 2.6 : 3.4) : 1.7;
        // Golem: TRZASK obszarowy
        if (e.kind === 'golem' && e.specialCd <= 0 && d < 7) {
          e.atkT = 0.001; e.atkMode = 'slam'; e.atkCd = 2.5; e.specialCd = 7;
          game.audio.play('roar');
        } else if (d > reach) {
          this.moveToward(e, px, pz, e.speed, dt);
          moving = true; running = true;
        } else if (e.atkCd <= 0 && !e.atkT) {
          e.atkT = 0.001; e.atkMode = 'hit';
          if (e.kind === 'darkknight') e.atkVariant = (Math.random() * 3) | 0;
          e.atkCd = e.boss ? 1.8 : 1.4;
          game.audio.play('swing');
          const dmgDealt = e.kind === 'darkknight' ? e.dmg + 4 : e.dmg;
          setTimeout(() => {
            if (e.dead || player.dead) return;
            const dd = Math.hypot(player.group.position.x - g.position.x, player.group.position.z - g.position.z);
            if (dd < reach + 0.9) player.takeDamage(dmgDealt, g.position, game);
          }, e.boss ? 400 : 280);
        }
        if (e.boss) game.ui.showBoss(e.bossName, e.hp / e.maxHp);
      } else if (e.state === 'return') {
        const hd = this.moveToward(e, e.home.x, e.home.z, e.speed * 0.8, dt);
        if (hd < 1.5) { e.state = 'idle'; e.hp = e.maxHp; e.bar.visible = false; }
        else moving = true;
        if (e.boss) game.ui.hideBoss();
      } else if (e.state === 'idle' || e.state === 'wander') {
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
        if (e.boss && e.state !== 'chase') game.ui.hideBoss();
      }

      // Animacja
      if (e.state === 'chargeTel' || e.state === 'summon') {
        // animacja ustawiona wyżej
      } else if (e.atkT > 0) {
        const dur = e.atkMode === 'slam' ? 1.1 : e.boss ? 0.8 : 0.5;
        e.atkT += dt / dur;
        if (e.atkT >= 1) {
          // impakt TRZASKU
          if (e.atkMode === 'slam' && !e.slamDone) {
            e.slamDone = false;
            const ep = g.position;
            game.audio.play('slam');
            game.shake(0.8);
            game.fx.ring(ep.x, ep.y + 0.25, ep.z, 0xffaa44, 7);
            game.fx.burst(ep.x, ep.y + 0.4, ep.z, 0x998877, 30, 8, 0.8);
            const pd = Math.hypot(player.group.position.x - ep.x, player.group.position.z - ep.z);
            if (pd < 5.5 && !playerDead) {
              player.takeDamage(30, ep, game);
              const nx = (player.group.position.x - ep.x) / (pd || 1);
              const nz = (player.group.position.z - ep.z) / (pd || 1);
              player.applyKnock(nx * 7, nz * 7);
            }
          }
          e.atkT = 0; e.atkMode = null;
        } else if (e.atkMode === 'slam') {
          e.rig.setSlam(Math.min(1, e.atkT));
          // narastający sygnał: pierścień ostrzegawczy
          if (e.atkT < 0.45 && Math.random() < dt * 10)
            game.fx.ring(g.position.x, g.position.y + 0.2, g.position.z, 0xff3300, 5.5);
        } else if (e.kind === 'darkknight') e.rig.setAttack(Math.min(1, e.atkT), e.atkVariant || 0);
        else e.rig.setAttack(Math.min(1, e.atkT));
      } else if (moving) {
        const gallop = running && (e.kind === 'wolf' || e.kind === 'boar');
        e.rig.walkPhase += dt * (running ? (gallop ? 10 : e.kind === 'skeleton' ? 8 : 7) : 4);
        if (gallop) e.rig.setGallop(e.rig.walkPhase);
        else if (running && e.rig.setRun && (e.kind === 'darkknight' || e.kind === 'skeleton')) e.rig.setRun(e.rig.walkPhase);
        else e.rig.setWalk(e.rig.walkPhase, e.state === 'chase' ? 1 : 0.5);
      } else if (e.kind === 'goblin' && e.state === 'chase' && Math.random() < dt * 0.3) {
        e.rig.setTaunt(t);
      } else e.rig.setIdle(t);
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
          g.visible = true;
          g.position.set(a.home.x, this.y(a.home.x, a.home.z), a.home.z);
        } else if (a.deadT > 5) g.visible = false;
        continue;
      }
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
        // jeleń czujny, gdy gracz w pobliżu
        if (a.type === 'deer' && d < 12) a.rig.setAlert();
        else if ((a.type === 'sheep' || a.type === 'horse') && Math.random() < 0.5) a.rig.setGraze(t);
        else a.rig.setIdle(t);
      } else {
        const tx = a.target.x - g.position.x, tz = a.target.z - g.position.z;
        const td = Math.hypot(tx, tz);
        if (td < 1) { a.target = null; a.waitT = 2 + Math.random() * 5; }
        else {
          g.rotation.y = Math.atan2(tx, tz);
          const sp = a.speed * (a.target.flee ? 1.7 : 0.5) * dt;
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
        const fleeing = a.target?.flee;
        a.rig.walkPhase += dt * (fleeing ? 11 : 6);
        if (fleeing && (a.type === 'rabbit' || a.type === 'deer')) a.rig.setBound(a.rig.walkPhase);
        else if (fleeing) a.rig.setGallop(a.rig.walkPhase);
        else a.rig.setWalk(a.rig.walkPhase, 0.5);
      }
    }

    // Konie w stajni
    for (const h of this.horses) {
      h.grazeT -= dt;
      if (h.grazeT < 0) {
        h.grazeT = 3 + Math.random() * 5;
        h.rig.group.rotation.y += (Math.random() - 0.5) * 1.5;
      }
      if (Math.random() < 0.5) h.rig.setGraze(t);
      else h.rig.setIdle(t);
    }
    if (this.playerHorse && !player.mounted) {
      const h = this.playerHorse.rig;
      h.setIdle(t);
      h.group.position.y = this.y(h.group.position.x, h.group.position.z);
    }
  }
}
