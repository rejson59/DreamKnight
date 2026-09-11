// Główny silnik gry: pętla, interakcje, pociski, zapis, jakość.
import * as THREE from 'three';
import { World } from './world.js';
import { NPCManager, getDialogue } from './npcs.js';
import { CreatureManager } from './creatures.js';
import { Player } from './player.js';
import { QuestManager } from './quests.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { AudioSys } from './audio.js';
import { CutsceneManager } from './cutscene.js';
import { FXSystem } from './fx.js';
import { makeTextures } from './textures.js';
import { SAVE_KEY, QUALITY_PRESETS, detectQuality, LOC } from './config.js';
import { ITEMS } from './items.js';

// Powtarzalne zlecenia z tablicy ogłoszeń na rynku
const BOUNTIES = [
  { kind: 'wolf', name: 'Wilki', where: 'Magiczny Las', need: 5, reward: 120 },
  { kind: 'boar', name: 'Dziki', where: 'południowe łąki', need: 4, reward: 100 },
  { kind: 'goblin', name: 'Gobliny', where: 'Góry Mgliste', need: 6, reward: 180 },
  { kind: 'skeleton', name: 'Szkielety', where: 'Zapomniane Ruiny', need: 5, reward: 220, req: 'q7_ruins' },
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'menu'; // menu | playing | paused | dead
    this.quality = 'medium';
    this.autoQuality = true;
    this.projectiles = [];
    this.t = 0;
    this.zone = 'kingdom';
    this.fpsAcc = 0; this.fpsN = 0; this.fpsT = 0;
    this.hintCd = 0;
    this.chestLooted = { bed: false, goblin: false, cave: false };
    this.cutsceneActive = false;
    this.trauma = 0;
    this._cutFlags = {};
    this.bounty = null;
  }

  async init(onProgress) {
    const set = (p, t) => onProgress && onProgress(p, t);
    set(5, 'Tworzenie tekstur…');
    await this.tick();
    this.textures = makeTextures();

    set(12, 'Przygotowanie renderera…');
    await this.tick();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 1500);
    this.camera.position.set(0, 8, 20);

    set(25, 'Budowanie królestwa…');
    await this.tick();
    this.world = new World(this.scene, this.textures, this.quality);

    set(60, 'Osadzanie mieszkańców…');
    await this.tick();
    this.npcs = new NPCManager(this.scene, this.world, this.textures);

    set(72, 'Budzenie stworzeń…');
    await this.tick();
    this.creatures = new CreatureManager(this.scene, this.world, this.textures);
    this.creatures.game = this;

    set(82, 'Kucie rycerza…');
    await this.tick();
    this.player = new Player(this.scene, this.world, this.textures);

    this.audio = new AudioSys();
    this.audio.isNightFn = () => this.world.isNight;
    this.fx = new FXSystem(this.scene, this.quality);
    this.cutscene = new CutsceneManager(this);
    this.ui = new UI(this);
    this.quests = new QuestManager(this);
    this.input = new Input();
    this.input.attach(this.canvas, {
      joyZone: document.getElementById('joy-zone'),
      joyBase: document.getElementById('joy-base'),
      joyStick: document.getElementById('joy-stick'),
      lookZone: document.getElementById('look-zone'),
      btnAttack: document.getElementById('btn-attack'),
      btnInteract: document.getElementById('btn-interact'),
    });
    this.input.onPause = () => this.togglePause();
    this.input.onInventory = () => this.ui.toggleInventory();
    this.input.onQuests = () => this.ui.toggleQuests();
    this.input.onPotion = () => this.player.drinkPotion(this);
    this.input.onSpell = () => this.player.castFireball(this);
    this.input.onTorch = () => this.player.toggleTorch(this);
    this.input.onHorse = () => this.player.mount(this);
    this.input.onZoom = (d) => {
      this.player.camDist = Math.max(4, Math.min(14, this.player.camDist + d));
    };
    this.ui.init();
    this.ui.refreshQuestMarkers();

    addEventListener('resize', () => this.resize());
    this.resize();
    this.applyQuality(this.quality);
    set(100, 'Gotowe!');
    await this.tick();
  }

  tick() { return new Promise((r) => setTimeout(r, 10)); }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // ---------- JAKOŚĆ ----------
  setQuality(name) {
    this.quality = name;
    this.autoQuality = false;
    this.applyQuality(name);
    const q2 = document.getElementById('quality2');
    if (q2) q2.value = name;
  }

  applyQuality(name) {
    const q = QUALITY_PRESETS[name] || QUALITY_PRESETS.medium;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pixelRatio));
    this.world.applyQuality(name);
    if (this.fx) this.fx.setQuality(name);
    this.scene.fog.far = q.viewDistance + 200;
    this.camera.far = q.viewDistance + 700;
    this.camera.updateProjectionMatrix();
  }

  autoPerf(dt) {
    if (!this.autoQuality) return;
    this.fpsAcc += dt; this.fpsN++; this.fpsT += dt;
    if (this.fpsT > 6) {
      const fps = this.fpsN / this.fpsAcc;
      const order = ['low', 'medium', 'high', 'ultra'];
      const i = order.indexOf(this.quality);
      if (fps < 32 && i > 0) {
        this.quality = order[i - 1];
        this.applyQuality(this.quality);
        this.ui.toast(`Dostosowano jakość do: ${this.quality} (płynność)`);
      } else if (fps > 55 && i < order.indexOf(this._autoMax || 'high')) {
        this.quality = order[i + 1];
        this.applyQuality(this.quality);
      }
      this.fpsAcc = 0; this.fpsN = 0; this.fpsT = 0;
    }
  }

  // ---------- START / PAUZA / KONIEC ----------
  newGame() {
    this.audio.ensure();
    this.audio.play('quest');
    this.player.reset(true);
    this.quests = new QuestManager(this);
    this.chestLooted = { bed: false, goblin: false, cave: false };
    this.bounty = null;
    this.world.dayT = 0.32;
    this.ui.refreshQuestMarkers();
    this.startPlaying();
    this.ui.toast('Witaj, rycerzu! Udaj się do króla na audiencję.', 'quest');
    this.ui.hint('WASD — ruch • mysz — kamera • E — rozmowa • I — ekwipunek', 8000);
    this.save();
    setTimeout(() => { if (this.state === 'playing' && !this.cutsceneActive) this.cutscene.play('intro'); }, 800);
  }

  continueGame() {
    this.audio.ensure();
    this.load();
    this.startPlaying();
    this.ui.toast('Witaj ponownie, rycerzu!', 'quest');
  }

  startPlaying() {
    this.state = 'playing';
    this.ui.hideMenu();
    this.ui.hideDeath();
    this.input.enabled = true;
    this.input.uiOpen = false;
    document.getElementById('touch-controls').classList.toggle('hidden', !this.input.touchMode);
    document.getElementById('quick-slots').classList.toggle('hidden', !this.input.touchMode);
    this.clock = this.clock || new THREE.Clock();
    this.clock.getDelta();
    this.loop();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.enabled = false;
    this.input.unlock();
    document.getElementById('pause-menu').classList.remove('hidden');
    document.getElementById('pause-info').textContent =
      `Poziom ${this.player.level} • ${this.player.gold} zł • ${this.zoneName()}`;
    document.getElementById('quality2').value = this.quality;
  }

  resume() {
    if (this.state !== 'paused' && this.state !== 'playing') return;
    document.getElementById('pause-menu').classList.add('hidden');
    this.ui.toggleInventory(false);
    this.ui.toggleQuests(false);
    this.ui.closeShop();
    this.ui.closeDialogue();
    this.state = 'playing';
    this.input.enabled = true;
    this.input.uiOpen = false;
    this.audio.play('click');
  }

  togglePause() {
    if (this.cutsceneActive) { this.cutscene.skip(); return; }
    if (this.state === 'playing') {
      if (this.ui.dialogOpen || !document.getElementById('inventory').classList.contains('hidden') ||
        !document.getElementById('quests-panel').classList.contains('hidden') ||
        !document.getElementById('shop').classList.contains('hidden')) {
        this.ui.toggleInventory(false);
        this.ui.toggleQuests(false);
        this.ui.closeShop();
        this.ui.closeDialogue();
      } else this.pause();
    } else if (this.state === 'paused') this.resume();
  }

  quitToMenu() {
    this.save();
    this.state = 'menu';
    this.input.enabled = false;
    this.input.unlock();
    document.getElementById('pause-menu').classList.add('hidden');
    this.ui.showMenu(true);
  }

  onDeath() {
    this.state = 'dead';
    this.audio.play('death');
    this.input.unlock();
    setTimeout(() => this.ui.showDeath(), 1200);
  }

  respawn() {
    this.ui.hideDeath();
    this.player.respawn(this);
    this.state = 'playing';
    this.input.enabled = true;
    // odstrasz wrogów wokół zamku
    for (const e of this.creatures.enemies) {
      if (e.state === 'chase') { e.state = 'return'; e.bar.visible = false; }
    }
    this.ui.hideBoss();
    this.save();
  }

  onFinale(epic = false) {
    document.getElementById('finale-text').textContent = epic
      ? `MROCZNY RYCERZ POKONANY! Król Aldric mianował Cię LEGENDĄ KRÓLESTWA! ` +
        `Ciemność pierzchła, a Twoje imię będą śpiewać bardowie przez pokolenia. ` +
        `Zebrane złoto: ${this.player.gold} zł • Poziom: ${this.player.level}. Przygoda trwa dalej — eksploruj świat!`
      : `Król Aldric mianował Cię BOHATEREM KORONY! Królestwo jest bezpieczne dzięki Twojemu męstwu. ` +
        `Zebrane złoto: ${this.player.gold} zł • Poziom: ${this.player.level}. Przygoda trwa dalej — eksploruj świat!`;
    document.getElementById('finale-screen').classList.remove('hidden');
    this.audio.play('win');
    this.input.unlock();
  }

  shake(amount = 0.3) { this.trauma = Math.min(1, (this.trauma || 0) + amount); }

  zoneName() {
    const names = { kingdom: 'Królestwo', castle: 'Zamek Królewski', market: 'Rynek', tavern: 'Karczma „Złoty Kufel”', farm: 'Farma', forest: 'Magiczny Las', mountains: 'Góry Mgliste', cave: 'Mroczna Jaskinia', wild: 'Dzicz', ruins: 'Zapomniane Ruiny', arena: 'Szczyt Zguby' };
    return names[this.zone] || '';
  }

  // ---------- POCISKI ----------
  spawnProjectile(kind, dmg) {
    const p = this.player;
    const dir = new THREE.Vector3(Math.sin(p.group.rotation.y), 0.03, Math.cos(p.group.rotation.y));
    // celowanie kamerą dla kuszy
    if (kind === 'bolt') {
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      dir.copy(camDir);
      if (dir.y < -0.5) dir.y = -0.5;
      dir.normalize();
    }
    let mesh;
    if (kind === 'fireball') {
      mesh = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.textures.flame, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      mesh.scale.set(1, 1.3, 1);
    } else {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6),
        new THREE.MeshStandardMaterial({ color: 0x8a6a3a }));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    }
    mesh.position.set(p.group.position.x + dir.x, p.group.position.y + 1.5, p.group.position.z + dir.z);
    this.scene.add(mesh);
    this.projectiles.push({
      kind, mesh, dmg,
      vel: dir.multiplyScalar(kind === 'fireball' ? 22 : 34),
      life: 2.2,
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.mesh.position.addScaledVector(pr.vel, dt);
      if (pr.kind === 'fireball') {
        const s = 1 + Math.sin(this.t * 20) * 0.15;
        pr.mesh.scale.set(s, s * 1.3, 1);
      }
      const mp = pr.mesh.position;
      let dead = pr.life <= 0;
      // trafienie wroga
      if (!dead && this.creatures.projectileHit(mp.x, mp.y, mp.z, pr.dmg, this)) {
        this.audio.play(pr.kind === 'fireball' ? 'explode' : 'hit');
        this.ui.hitMarker();
        dead = true;
      }
      // ziemia / przeszkoda
      if (!dead && mp.y <= this.world.walkHeight(mp.x, mp.z) + 0.1) {
        if (pr.kind === 'fireball') this.audio.play('explode');
        dead = true;
      }
      if (dead) {
        this.scene.remove(pr.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ---------- INTERAKCJE ----------
  findInteract() {
    const p = this.player.group.position;
    // 1. NPC
    const near = this.npcs.nearest(p.x, p.z);
    if (near) return { type: 'npc', npc: near.npc, label: `Porozmawiaj: ${near.npc.def.name}` };
    // 2. Koń gracza
    const h = this.creatures.playerHorse;
    if (h && !this.player.mounted) {
      const d = Math.hypot(h.rig.group.position.x - p.x, h.rig.group.position.z - p.z);
      if (d < 3.2) return { type: 'horse', label: 'Dosiądź konia' };
    }
    // 3. Zaginiona owca
    const ls = this.creatures.lostSheep;
    if (ls && !ls.dead && this.quests.state.s2_sheep.status === 'active') {
      const d = Math.hypot(ls.rig.group.position.x - p.x, ls.rig.group.position.z - p.z);
      if (d < 3.2) return { type: 'sheep', label: 'Pogłaszcz owcę' };
    }
    // 4. Pickupy
    for (const pk of this.world.pickups) {
      if (pk.taken) continue;
      if (Math.hypot(pk.x - p.x, pk.z - p.z) < 2.6) {
        const names = { herb_moon: 'Zbierz księżycowe ziele', herb_sun: 'Zbierz słoneczne ziele', crystal_shard: 'Weź odłamek kryształu' };
        return { type: 'pickup', pickup: pk, label: names[pk.kind] };
      }
    }
    // 5. Łóżko
    if (Math.hypot(LOC.knightBed.x - p.x, LOC.knightBed.z - p.z) < 2.8)
      return { type: 'bed', label: 'Śpij do rana (pełne HP)' };
    // 5b. Tablica zleceń na rynku
    if (Math.hypot(-6 - p.x, 24 - p.z) < 3.4)
      return { type: 'board', label: 'Tablica zleceń' };
    // 6. Skrzynie
    const chests = [
      { key: 'bed', x: -14.8, z: -58.5, label: 'Otwórz skrzynię' },
      { key: 'goblin', ...this.world.goblinChestPos, label: 'Otwórz skrzynię goblinów' },
      { key: 'cave', x: LOC.caveCenter.x - 16, z: LOC.caveCenter.z + 3.2, label: 'Otwórz starożytną skrzynię' },
    ];
    for (const c of chests) {
      if (!c.x && c.x !== 0) continue;
      if (Math.hypot(c.x - p.x, c.z - p.z) < 3 && !this.chestLooted[c.key])
        return { type: 'chest', chest: c.key, label: c.label };
    }
    return null;
  }

  doInteract(it) {
    const p = this.player;
    switch (it.type) {
      case 'npc': {
        this.npcs.facePlayer(it.npc, p.group.position);
        this.quests.onTalk(it.npc.id);
        const dlg = getDialogue(it.npc.id, this);
        this.audio.play('click');
        this.ui.showDialogue(`${it.npc.def.name} — ${it.npc.def.title}`, dlg.text, dlg.options);
        break;
      }
      case 'board': this.showBountyBoard(); break;
      case 'horse': p.mount(this); break;
      case 'sheep': {
        this.quests.onSpecial('lost_sheep');
        this.audio.play('questDone');
        this.ui.toast('Białka beczy radośnie i wraca na farmę!', 'quest');
        // owca teleportuje się na farmę
        const ls = this.creatures.lostSheep;
        ls.home = { x: LOC.farm.x - 10, z: LOC.farm.z + 10 };
        ls.rig.group.position.set(ls.home.x, this.world.walkHeight(ls.home.x, ls.home.z), ls.home.z);
        ls.target = null;
        break;
      }
      case 'pickup': {
        const pk = it.pickup;
        pk.taken = true;
        pk.respawn = 150;
        pk.mesh.visible = false;
        p.inv.add(pk.kind);
        this.audio.play('pickup');
        const names = { herb_moon: 'Księżycowe ziele', herb_sun: 'Słoneczne ziele', crystal_shard: 'Odłamek kryształu' };
        this.ui.toast(`+ ${names[pk.kind]}`);
        this.quests.onCollect(pk.kind);
        break;
      }
      case 'bed': {
        p.heal(p.maxHpTotal);
        p.stam = p.maxStam;
        this.world.dayT = 0.3; // ranek
        this.audio.play('snore');
        this.ui.toast('Przespano noc. Pełne siły!', 'gold');
        this.save();
        break;
      }
      case 'chest': {
        this.chestLooted[it.chest] = true;
        this.audio.play('quest');
        if (it.chest === 'bed') {
          p.addGold(30); p.inv.add('potion_s');
          this.ui.toast('Skrzynia: 30 zł + mikstura!', 'gold');
        } else if (it.chest === 'goblin') {
          p.addGold(120); p.inv.add('potion_b');
          this.ui.toast('Łup goblinów: 120 zł + duża mikstura!', 'gold');
        } else {
          const bossDead = !this.creatures.boss || this.creatures.boss.dead;
          if (!bossDead) {
            this.chestLooted[it.chest] = false;
            this.ui.toast('Skrzynia jest zapieczętowana magią Golema! Pokonaj go najpierw.', 'bad');
            this.audio.play('error');
          } else {
            p.inv.add('royal_crystal');
            p.addGold(100);
            this.ui.toast('Zdobyto KRYSZTAŁ KRÓLEWSKI! Zanieś go królowi!', 'quest');
            this.quests.state.q5_crystal.count = 1;
            if (this.quests.state.q5_crystal.status === 'active') {
              this.quests.state.q5_crystal.status = 'turnin';
              this.ui.refreshQuestMarkers();
            }
          }
        }
        this.save();
        break;
      }
    }
  }

  // ---------- ZLECENIA (tablica ogłoszeń) ----------
  onBountyKill(kind) {
    const b = this.bounty;
    if (!b || b.kind !== kind || b.count >= b.need) return;
    b.count++;
    if (b.count >= b.need) {
      this.audio.play('questDone');
      this.ui.toast(`Zlecenie wykonane: ${b.name}! Wróć do tablicy po nagrodę.`, 'quest');
    } else {
      this.ui.toast(`Zlecenie: ${b.name} — ${b.count}/${b.need}`);
    }
  }

  showBountyBoard() {
    const b = this.bounty;
    const opts = [];
    const bye = { label: 'Odejdź', fn: () => this.ui.closeDialogue() };
    if (b && b.count >= b.need) {
      opts.push({
        label: `Odbierz nagrodę: ${b.reward} zł`, cls: 'gold-opt',
        fn: () => {
          this.player.addGold(b.reward);
          this.audio.play('coin');
          this.ui.toast(`Nagroda za zlecenie: +${b.reward} zł`, 'gold');
          this.bounty = null;
          this.save();
          this.ui.closeDialogue();
        },
      });
      opts.push(bye);
      this.ui.showDialogue('Tablica zleceń', `Zlecenie „${b.name}” wykonane! Stempel łowczego przybity — nagroda czeka.`, opts);
      return;
    }
    if (b) {
      opts.push({
        label: 'Zrezygnuj ze zlecenia',
        fn: () => { this.bounty = null; this.save(); this.ui.closeDialogue(); },
      });
      opts.push(bye);
      this.ui.showDialogue('Tablica zleceń', `Aktualne zlecenie: „${b.name}” — ${b.count}/${b.need}. Wróć, gdy skończysz.`, opts);
      return;
    }
    for (const bo of BOUNTIES) {
      if (bo.req && this.quests.state[bo.req]?.status === 'locked') continue;
      opts.push({
        label: `${bo.name} (${bo.need}x, ${bo.reward} zł) — ${bo.where}`,
        fn: () => {
          this.bounty = { kind: bo.kind, name: bo.name, need: bo.need, count: 0, reward: bo.reward };
          this.audio.play('quest');
          this.ui.toast(`Nowe zlecenie: ${bo.name} (${bo.need}x)`, 'quest');
          this.save();
          this.ui.closeDialogue();
        },
      });
    }
    opts.push(bye);
    this.audio.play('click');
    this.ui.showDialogue('Tablica zleceń', 'Na tablicy wiszą ogłoszenia łowczego. Wybierz zlecenie — nagroda w złocie czeka na śmiałka:', opts);
  }

  // ---------- ZAPIS ----------
  save(manual = false) {
    if (!this.player) return;
    try {
      const data = {
        player: this.player.serialize(),
        quests: this.quests.serialize(),
        chests: this.chestLooted,
        dayT: this.world.dayT,
        bossDead: this.creatures.boss?.dead || false,
        bounty: this.bounty,
        v: 2,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      if (manual) this.ui.toast('Zapisano grę!', 'gold');
    } catch { /* brak miejsca */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      this.player.reset(false);
      this.player.deserialize(d.player);
      this.player.updateWeaponMesh();
      this.quests.deserialize(d.quests);
      this.chestLooted = d.chests || this.chestLooted;
      this.bounty = d.bounty || null;
      this.world.dayT = d.dayT ?? 0.32;
      this.creatures.ensurePlayerHorse(this.player.inv.hasHorse);
      if (d.bossDead && this.creatures.boss) {
        const b = this.creatures.boss;
        b.dead = true; b.rig.setDead();
        b.rig.group.visible = false;
      }
      this.ui.refreshQuestMarkers();
      return true;
    } catch { return false; }
  }

  static hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  // ---------- PĘTLA ----------
  loop() {
    if (this._looping) return;
    this._looping = true;
    const frame = () => {
      requestAnimationFrame(frame);
      if (this.state !== 'playing') return;
      const dt = Math.min(0.05, this.clock.getDelta());
      this.t += dt;
      this.autoPerf(dt);

      const p = this.player;
      // aktualizacja świata
      this.world.update(dt, this.t, p.group.position);
      // strefa + podpowiedzi
      const z = this.world.zoneAt(p.group.position.x, p.group.position.z);
      if (z !== this.zone) {
        this.zone = z;
        this.ui.zoneBanner(this.zoneName());
        if (z === 'ruins' && !this._cutFlags.ruins) { this._cutFlags.ruins = true; this.cutscene.play('ruins'); }
        if (z === 'arena' && !this._cutFlags.boss) {
          this._cutFlags.boss = true;
          const bdk = this.creatures.darkKnight;
          const anchor = bdk && !bdk.dead ? bdk.rig.group.position : new THREE.Vector3(LOC.arena.x, this.world.arenaY || 40, LOC.arena.z);
          this.cutscene.play('boss', { anchor });
        }
        if (z === 'cave' && !p.torchOn)
          this.ui.hint('Ciemno! Naciśnij T, aby zapalić pochodnię (kupisz ją na rynku).', 6000);
        if (z === 'forest') this.ui.hint('Magiczny Las — tu rosną księżycowe zioła i grasują wilki.', 5000);
        if (z === 'mountains') this.ui.hint('Góry Mgliste — terytorium goblinów. Miej się na baczności!', 5000);
      }
      // gracz
      p.update(dt, { input: this.input, camera: this.camera, game: this, t: this.t });
      // NPC-e i stworzenia
      this.npcs.update(dt, this.t, p.group.position);
      this.creatures.update(dt, this.t, p, this);
      // efekty, cutscenki i wygaszanie wstrząsu kamery
      this.fx.update(dt);
      this.cutscene.update(dt);
      this.trauma = Math.max(0, this.trauma - dt * 1.4);
      // finałowa cutscenka po śmierci Mrocznego Rycerza
      const dk = this.creatures.darkKnight;
      if (dk && dk.dead && !this._cutFlags.finale && !this.cutsceneActive) {
        this._cutFlags.finale = true;
        const dp = dk.rig.group.position;
        this.fx.flash(dp.x, dp.y + 1, dp.z, 0xffeeaa, 9);
        this.fx.ring(dp.x, dp.y + 0.3, dp.z, 0xffcc55, 12);
        this.cutscene.play('finale', { anchor: dp });
      }
      // pociski (zamrożone w czasie cutscenki)
      if (!this.cutsceneActive) this.updateProjectiles(dt);
      // interakcje
      if (!this.ui.dialogOpen && !this.input.uiOpen && !this.cutsceneActive) {
        const it = this.findInteract();
        this._interact = it;
        this.ui.prompt(it ? it.label : null);
        if (it && this.input.consumeInteract()) this.doInteract(it);
        else this.input.consumeInteract();
      } else {
        this.ui.prompt(null);
        this.input.consumeInteract();
      }
      // autosave
      this._saveT = (this._saveT || 0) + dt;
      if (this._saveT > 30) { this._saveT = 0; this.save(); }
      // HUD
      this.ui.updateHUD();
      this.renderer.render(this.scene, this.camera);
    };
    frame();
  }
}
