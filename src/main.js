import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { NPC } from './npc.js';
import { Enemy } from './enemy.js';
import { QUESTS, NPC_DATA, ITEMS, SHOP_ITEMS, START_ITEMS } from './data.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor(canvas, quality) {
    this.canvas = canvas;
    this.quality = quality;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1200);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' });
    const dpr = quality === 'low' ? 0.6 : quality === 'medium' ? 0.9 : quality === 'high' ? 1.2 : Math.min(devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.running = false;
    this.paused = false;
    this.state = 'play';

    this.keys = {};
    this.mouse = { x: 0, y: 0, lock: false };
    this.moveVec = new THREE.Vector2(0, 0);
    this.touchMove = { x: 0, y: 0, active: false };
    this.lookTouch = { active: false, x: 0, y: 0 };
    this.cameraYaw = Math.PI; // patrzymy na południe od zamku? gracz startuje na połud od zamku patrząc w stronę rynku(+z)
    this.cameraPitch = 0.24;

    this.health = 100;
    this.maxHealth = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.gold = 60;
    this.inventory = { copper_sword: 1 };
    this.equipped = { weapon: 'copper_sword', armor: null, amulet: null, mount: false, map: false };
    this.buffTimer = 0;
    this.attackTimer = 0;
    this.attackDuration = 0.45;
    this.attackAnim = 0;
    this.invincible = 0;
    this.dead = false;

    this.enemies = [];
    this.npcs = [];
    this.collectibles = [];
    this.nearObject = null;
    this.questProgress = {};   // quest -> objectives counts
    this.questCompleted = {};
    this.activeQuests = {};
    for (const id of ['audience', 'herb', 'torch', 'patrol', 'wolf']) this.activeQuests[id] = true;

    this.world = new World(this);
    this.world.build();
    this.player = new Player(this);
    this.scene.add(this.player.group);
    this.player.group.position.set(0, 0, -42);

    this.spawnNPCs();
    this.spawnEnemies();
    this.collectibles = this.world.collectibles.map((c) => ({ ...c }));

    this.uiSetup();
    this.bindInput();
    this.resize();

    this.camTarget = new THREE.Vector3(this.player.group.position.x, 2, this.player.group.position.z);
  }

  // ================= INICJALIZACJA =================
  spawnNPCs() {
    for (const key of Object.keys(NPC_DATA)) {
      const npc = new NPC(NPC_DATA[key]);
      this.scene.add(npc.group);
      this.npcs.push(npc);
    }
  }

  spawnEnemies() {
    for (const s of this.world.enemySpawns) {
      const e = new Enemy(this, s.kind, s.x, s.z);
      this.scene.add(e.group);
      this.enemies.push(e);
    }
  }

  uiSetup() {
    this.els = {};
    for (const id of ['hp-fill', 'stam-fill', 'gold', 'quest-tracker', 'minimap', 'crosshair', 'interact-prompt', 'interact-text',
      'dialogue', 'dialog-name', 'dialog-text', 'dialog-options', 'shop', 'shop-title', 'shop-gold', 'shop-list',
      'inventory', 'inv-stats', 'inv-grid', 'quests-panel', 'quests-list', 'death-screen', 'toast-container', 'touch-controls']) {
      this.els[id] = $(id);
    }
    $('btn-inventory').onclick = () => this.toggleOverlay('inventory');
    $('btn-quests').onclick = () => this.toggleOverlay('quests-panel');
    $('btn-menu').onclick = () => this.togglePause();
    $('btn-inventory-close').onclick = () => this.closeOverlay('inventory');
    $('btn-quests-close').onclick = () => this.closeOverlay('quests-panel');
    $('btn-shop-close').onclick = () => { this.closeShop(); if (this.currentNpc) this.openDialogue(this.currentNpc); };
    $('btn-respawn').onclick = () => this.respawn();
    $('btn-interact').onpointerdown = () => this.interact();
    $('btn-attack').onpointerdown = () => this.tryAttack();
    this.els['crosshair'].classList.add('hidden');
    this.touchSupported = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (this.touchSupported) {
      this.els['touch-controls'].classList.remove('hidden');
    } else {
      this.els['crosshair'].classList.remove('hidden');
    }
  }

  bindInput() {
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyI') this.toggleOverlay('inventory');
      if (e.code === 'KeyJ') this.toggleOverlay('quests-panel');
      if (e.code === 'Escape') { if (this.dialogueOpen()) this.closeDialogue(); else if (this.isOverlayOpen()) this.closeAllOverlays(); else this.togglePause(); }
      if (e.code === 'KeyE') this.interact();
    });
    addEventListener('keyup', (e) => this.keys[e.code] = false);
    this.mouseDrag = false;
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas) {
        this.cameraYaw -= e.movementX * 0.0024;
        this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch - e.movementY * 0.0022, -0.12, 0.75);
      } else if (this.mouseDrag) {
        this.cameraYaw -= e.movementX * 0.004;
        this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch - e.movementY * 0.0038, -0.12, 0.75);
      }
    });
    addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.state === 'play' && !this.isOverlayOpen() && !this.dialogueOpen() && !this.touchSupported) {
        this.mouseDrag = true;
        if (document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock();
        this.tryAttack();
      }
    });
    addEventListener('mouseup', () => { this.mouseDrag = false; });
    addEventListener('click', (e) => {
      if (e.target === this.canvas && this.state === 'play' && !this.touchSupported && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
      }
    });
    addEventListener('pointerlockchange', () => {
      this.mouse.lock = document.pointerLockElement === this.canvas;
    });

    // Dotyk
    const lookZone = $('look-zone');
    lookZone.addEventListener('pointerdown', (e) => { this.lookTouch = { active: true, x: e.clientX, y: e.clientY }; });
    lookZone.addEventListener('pointermove', (e) => {
      if (!this.lookTouch.active) return;
      this.cameraYaw -= (e.clientX - this.lookTouch.x) * 0.005;
      this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch - (e.clientY - this.lookTouch.y) * 0.004, -0.12, 0.75);
      this.lookTouch.x = e.clientX; this.lookTouch.y = e.clientY;
    });
    lookZone.addEventListener('pointerup', () => this.lookTouch.active = false);
    lookZone.addEventListener('pointercancel', () => this.lookTouch.active = false);

    const joy = $('joy-stick');
    joy.parentElement.addEventListener('pointerdown', (e) => { this.touchMove.active = true; this.touchMoveStart(e); });
    joy.parentElement.addEventListener('pointermove', (e) => { if (this.touchMove.active) this.touchMoveStart(e); });
    joy.parentElement.addEventListener('pointerup', () => { this.touchMove.active = false; this.touchMove.x = this.touchMove.y = 0; joy.style.transform = ''; });
    joy.parentElement.addEventListener('pointercancel', () => { this.touchMove.active = false; this.touchMove.x = this.touchMove.y = 0; joy.style.transform = ''; });
  }

  touchMoveStart(e) {
    const rect = $('joy-base').getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2), dy = (e.clientY - cy) / (rect.height / 2);
    const len = Math.hypot(dx, dy);
    const max = len > 1 ? 1 / len : 1;
    this.touchMove.x = dx * max; this.touchMove.y = dy * max;
    $('joy-stick').style.transform = `translate(${this.touchMove.x * 40}px, ${this.touchMove.y * 40}px)`;
  }

  resize() {
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }

  // ================= PĘTLA =================
  start() {
    this.running = true;
    this.lastT = performance.now();
    this.updateMinimap();
    this.renderQuestTracker();
    const loop = () => {
      requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastT) / 1000);
      this.lastT = now;
      if (this.running && !this.paused && this.state === 'play') this.update(dt, now / 1000);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  update(dt, t) {
    this.world.update(dt, t);
    this.updateMovement(dt);
    this.updateEnemies(dt);
    this.updateCollectibles();
    this.updateInteract();
    this.updateCamera(dt);
    this.updateHud();
    this.updateBuffs(dt);
    this.enemyBodies();
    this.adaptiveQuality(dt);
  }

  updateMovement(dt) {
    const p = this.player.group;
    let vx = 0, vz = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) vz += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) vz -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) vx += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) vx -= 1;
    if (this.touchMove.active) { vx += this.touchMove.x; vz += -this.touchMove.y; }

    const len = Math.hypot(vx, vz);
    let moving = len > 0.01;
    if (moving) { vx /= Math.max(1, len); vz /= Math.max(1, len); }
    const speedBase = this.equipped.mount ? 8 : 5.5;
    const running = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) && moving;
    let speed = running ? speedBase * 1.5 : speedBase;
    if (this.buffTimer > 0) speed *= 1.25;
    if (this.stamina <= 0) speed *= 0.75;
    if (moving) {
      this.stamina = Math.max(0, this.stamina - (running ? 18 : 6) * dt);
      const sin = Math.sin(this.cameraYaw), cos = Math.cos(this.cameraYaw);
      // forward kamery = (-sin, -cos); right = (-cos, sin)
      const wx = -sin * vz - cos * vx;
      const wz = -cos * vz + sin * vx;
      p.position.x += wx * speed * dt;
      p.position.z += wz * speed * dt;
      p.rotation.y = Math.atan2(wx, wz);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 12 * dt);
    }

    this.collide();

    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.player.update(dt, moving, speed, this.attackAnim, this.attackDuration);
  }

  collide() {
    const p = this.player.group.position;
    // mury: pierścień z otworem na bramie (południe +z)
    const dx = p.x, dz = p.z;
    const dist = Math.hypot(dx, dz);
    const inGate = Math.abs(dx) < 10 && dz > 0;
    if (dist > 68 && dist < 77 && !inGate) {
      const f = 68 / dist;
      p.x *= f; p.z *= f;
    }
    // rzeka: pierścień z przejściem przez most
    const inBridge = Math.abs(dx) < 9 && dz > 0;
    if (dist > 81 && dist < 96 && !inBridge) {
      const f = 81 / dist;
      p.x *= f; p.z *= f;
    }
    // przeszkody
    for (const o of this.world.obstacles) {
      const ox = p.x - o.x, oz = p.z - o.z;
      const d = Math.hypot(ox, oz);
      if (d < o.r + 0.8 && d > 0.0001) {
        const f = (o.r + 0.8) / d;
        p.x = o.x + ox * f;
        p.z = o.z + oz * f;
      }
    }
    // granica świata
    p.x = THREE.MathUtils.clamp(p.x, -320, 320);
    p.z = THREE.MathUtils.clamp(p.z, -320, 320);
  }

  updateEnemies(dt) {
    const pp = this.player.group.position;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, pp);
      if (e.removeMe) {
        this.scene.remove(e.group);
        this.enemies.splice(i, 1);
        continue;
      }
      if (!e.dead && e.stats.hostile && e.state === 'chase') {
        // prosta kolizja z graczem
        const d = new THREE.Vector3(pp.x - e.group.position.x, 0, pp.z - e.group.position.z);
        if (d.length() < 1.1 && d.length() > 0.001) {
          const f = 1.1 / d.length();
          pp.x = e.group.position.x + d.x * f;
          pp.z = e.group.position.z + d.z * f;
        }
      }
    }
  }

  enemyBodies() {
    // usuwaj zniszczone
  }

  updateCollectibles() {
    const pp = this.player.group.position;
    for (const c of this.collectibles) {
      if (c.taken) continue;
      const d = Math.hypot(c.x - pp.x, c.z - pp.z);
      if (d < 1.5) {
        c.taken = true;
        if (c.mesh) this.scene.remove(c.mesh);
        if (c.type === 'herb') {
          this.addItem('herb', 1);
          this.toast('🌿 Zebrano magiczne zioło', 'success');
        } else if (c.type === 'crystal') {
          this.addItem('crystal', 1);
          this.toast('💎 Zebrano kryształ jaskini', 'success');
          this.gold += 25;
        } else if (c.type === 'flower') {
          this.addItem('flower', 1);
          this.toast('🌸 Zebrano złoty kwiat', 'success');
        }
      }
    }
  }

  updateInteract() {
    const pp = this.player.group.position;
    let best = null, bestD = 5.8;
    for (const n of this.npcs) {
      const d = Math.hypot(n.group.position.x - pp.x, n.group.position.z - pp.z);
      if (d < bestD) { best = { type: 'npc', data: n }; bestD = d; }
    }
    this.nearObject = best;
    if (best && this.state === 'play' && !this.dialogueOpen()) {
      $('interact-prompt').classList.remove('hidden');
      $('interact-text').textContent = `E • Rozmowa z ${best.data.name}`;
    } else {
      $('interact-prompt').classList.add('hidden');
    }
  }

  updateCamera(dt) {
    const p = this.player.group.position;
    const dist = 7.5 + (this.equipped.mount ? 2 : 0);
    const target = new THREE.Vector3(p.x, 2 + (this.equipped.mount ? 1 : 0), p.z);
    this.camTarget.lerp(target, Math.min(1, dt * 8));
    const cx = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch);
    const cy = Math.sin(this.cameraPitch);
    const cz = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch);
    this.camera.position.set(this.camTarget.x + cx * dist, this.camTarget.y + cy * dist + 1.5, this.camTarget.z + cz * dist);
    this.camera.lookAt(this.camTarget);
  }

  updateHud() {
    $('hp-fill').style.width = `${(this.health / this.maxHealth) * 100}%`;
    $('stam-fill').style.width = `${(this.stamina / this.maxStamina) * 100}%`;
    $('gold').textContent = `💰 ${this.gold}`;
  }

  updateBuffs(dt) {
    if (this.buffTimer > 0) {
      this.buffTimer -= dt;
      if (this.buffTimer <= 0) this.toast('Urok czarów wygasł');
    }
    if (this.invincible > 0) this.invincible -= dt;
  }

  adaptiveQuality(dt) {
    if (this.quality === 'low' || this.quality === 'ultra') return;
    this.fps = this.fps ? this.fps * 0.9 + (1 / dt) * 0.1 : 1 / dt;
    if (this.fps < 32 && this.adaptiveTimes === undefined) {
      this.adaptiveTimes = 1;
      const ratio = Math.max(0.5, this.renderer.getPixelRatio() - 0.1);
      this.renderer.setPixelRatio(ratio);
      this.toast('Obniżono rozdzielczość dla płynności');
    }
  }

  // ================= WALKA =================
  tryAttack() {
    if (this.state !== 'play' || this.dead) return;
    this.attackAnim = this.attackDuration;
    const dmg = this.currentDamage();
    const wep = ITEMS[this.equipped.weapon];
    if (wep && wep.ranged) {
      this.rangedAttack(dmg);
    } else {
      const pp = this.player.group.position;
      const forward = new THREE.Vector3(Math.sin(this.player.group.rotation.y), 0, Math.cos(this.player.group.rotation.y));
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = new THREE.Vector3(e.group.position.x - pp.x, 0, e.group.position.z - pp.z);
        const dist = d.length();
        if (dist < 3) {
          d.normalize();
          if (d.dot(forward) > 0.3) {
            this.hitEnemy(e, dmg);
          }
        }
      }
    }
  }

  rangedAttack(dmg) {
    const pp = this.player.group.position;
    const forward = new THREE.Vector3(Math.sin(this.player.group.rotation.y), 0, Math.cos(this.player.group.rotation.y));
    let target = null, bestD = 42;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = new THREE.Vector3(e.group.position.x - pp.x, 0, e.group.position.z - pp.z);
      const dist = d.length();
      if (dist < bestD && d.normalize().dot(forward) > 0.15) { target = e; bestD = dist; }
    }
    if (target) this.hitEnemy(target, dmg);
  }

  hitEnemy(e, dmg) {
    e.takeDamage(dmg);
    // efekt
    this.toast(`⚔️ ${e.name}: -${Math.round(dmg)}`);
    if (e.dead) {
      this.gold += e.stats.reward;
      this.toast(`Pokonano ${e.name}! +${e.stats.reward} złota`, 'success');
      this.onKill(e.kind);
    }
  }

  currentDamage() {
    const wep = ITEMS[this.equipped.weapon];
    let d = wep ? wep.dmg : 8;
    if (this.buffTimer > 0) d *= 1.3;
    return d + Math.random() * 4;
  }

  enemyAttack(e) {
    if (this.dead || this.invincible > 0) return;
    let dmg = e.stats.dmg;
    const armor = this.equipped.armor ? ITEMS[this.equipped.armor].armor : 0;
    dmg = Math.max(1, dmg - armor * 0.5);
    this.health -= dmg;
    this.invincible = 0.6;
    this.toast(`${e.name} atakuje! -${Math.round(dmg)}`, 'error');
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  die() {
    this.dead = true;
    this.state = 'dead';
    $('death-screen').classList.remove('hidden');
  }

  respawn() {
    this.dead = false;
    this.state = 'play';
    this.health = this.maxHealth;
    this.player.group.position.set(0, 0, -42);
    $('death-screen').classList.add('hidden');
    this.toast('Odrodziłeś się w zamku', 'success');
  }

  // ================= NAPOTKANE =================
  interact() {
    if (this.state !== 'play' || this.dialogueOpen()) return;
    if (this.nearObject && this.nearObject.type === 'npc') {
      this.openDialogue(this.nearObject.data);
    }
  }

  openDialogue(npc, exitTo = null) {
    this.currentNpc = npc;
    this.state = 'dialogue';
    $('dialogue').classList.remove('hidden');
    $('dialog-name').textContent = `${npc.name} — ${npc.role}`;
    $('dialog-text').textContent = this.dialogueText(npc);
    if (npc.data.id === 'king' && !this.questCompleted.audience) {
      this.questCompleted.audience = true;
      this.addGold(QUESTS.audience.reward);
      this.toast(`Audiencja u króla! +${QUESTS.audience.reward} złota`, 'success');
      $('dialog-text').textContent = 'Witaj, mój rycerzu! Królestwo czeka na twoje czyny.';
      this.updateQuestUI();
    }
    const opts = $('dialog-options');
    opts.innerHTML = '';
    const addOpt = (label, cb) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = () => {
        cb();
      };
      opts.appendChild(b);
    };

    const dlist = npc.data.dialogues || [];
    for (const d of dlist) {
      if (d.id === 'quest_king') {
        if (this.questCompleted.return_king) continue;
        if (this.questCompleted.return_king !== true && this.canReturnToKing()) addOpt('🏰 Zamelduj królowi', () => this.finishReturn());
        else addOpt(d.label, () => { $('dialog-text').textContent = d.text; });
        continue;
      }
      if (d.id === 'quest_herb') {
        if (this.questCompleted.herb) { addOpt('✅ Misja zakończona', () => { $('dialog-text').textContent = 'Dziękuję, przyjacielu! Za twoje zioła masz darmową miksturę.'; }); continue; }
        if (this.inventory.herb >= 3) {
          addOpt('📜 Oddaj zioła (3)', () => this.turnInHerbs());
        }
      }
      if (d.id === 'heal') {
        addOpt(d.label, () => this.healAtInn());
        continue;
      }
      if (d.id === 'shop') {
        addOpt(d.label, () => this.openShop(npc));
        continue;
      }
      addOpt(d.label, () => { $('dialog-text').textContent = d.text; });
    }
    if (npc.id !== 'king') {
      // domyślne zakończenie
    }
    const close = document.createElement('button');
    close.textContent = 'Zakończ';
    close.onclick = () => this.closeDialogue();
    opts.appendChild(close);
  }

  dialogueText(npc) {
    if (npc.id === 'king') {
      if (this.questCompleted.return_king) return 'Królestwo jest Ci wdzięczne, rycerzu. Odpocznij zasłużenie.';
      if (this.canReturnToKing()) return 'Słyszałem o twoich czynach! Zamelduj, a dam ci nagrodę.';
      return `Witaj, mój rycerzu! Królestwo czeka na twoje czyny.${this.activeQuests.audience ? ' Przedstaw się — jesteś u króla.' : ''}`;
    }
    if (npc.id === 'wizard') return 'Witaj, przyjacielu! Przynieś mi zioła z magicznego lasu, a otrzymasz coś w darze.';
    return npc.data.greeting;
  }

  canReturnToKing() {
    for (const q of ['herb', 'torch', 'patrol', 'wolf']) if (!this.questCompleted[q]) return false;
    return true;
  }

  finishReturn() {
    if (!this.questCompleted.return_king) {
      this.questCompleted.return_king = true;
      this.addGold(QUESTS.return_king.reward);
      this.toast(`🏰 Meldunek królowi przyjęty! +${QUESTS.return_king.reward} złota`, 'success');
    }
    this.closeDialogue();
    this.updateQuestUI();
  }

  turnInHerbs() {
    this.inventory.herb -= 3;
    this.addItem('potion', 1);
    if (!this.questCompleted.herb) this.completeQuest('herb');
    this.toast('🌿 Czarodziej dziękuje i daje miksturę!', 'success');
    this.closeDialogue();
    this.updateQuestUI();
  }

  healAtInn() {
    if (this.gold < 25) { this.toast('Za mało złota na odpoczynek', 'error'); return; }
    this.gold -= 25;
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.toast('🏨 Odpocząłeś w karczmie. Pełne siły!', 'success');
    this.updateHud();
  }

  closeDialogue() {
    $('dialogue').classList.add('hidden');
    this.currentNpc = null;
    this.state = 'play';
  }

  dialogueOpen() { return !$('dialogue').classList.contains('hidden'); }

  // ================= SKLEP =================
  openShop(npc) {
    this.closeDialogue();
    this.state = 'shop';
    $('shop').classList.remove('hidden');
    $('shop-title').textContent = `${npc.role} — Sklep`;
    $('shop-gold').textContent = `💰 ${this.gold}`;
    const list = $('shop-list');
    list.innerHTML = '';
    const ids = SHOP_ITEMS[npc.id] || [];
    for (const id of ids) {
      const item = ITEMS[id];
      const row = document.createElement('div');
      row.className = 'shop-item';
      const owned = this.inventory[id] || 0;
      let disabled = false;
      if (id === 'horse' && this.equipped.mount) disabled = true;
      if (id === 'map' && this.equipped.map) disabled = true;
      row.innerHTML = `<div class="icon">${item.icon}</div><div class="info"><div class="name">${item.name}</div><div class="desc">${item.desc}</div></div><div class="price">${item.price}💰</div>`;
      const btn = document.createElement('button');
      btn.textContent = disabled ? 'Kupione' : 'Kup';
      btn.disabled = disabled || this.gold < item.price || (id === 'horse' && this.equipped.mount);
      btn.onclick = () => this.buy(id, npc);
      row.appendChild(btn);
      list.appendChild(row);
    }
  }

  buy(id, npc) {
    const item = ITEMS[id];
    if (this.gold < item.price) { this.toast('Za mało złota!', 'error'); return; }
    this.gold -= item.price;
    this.addItem(id, 1);
    if (id === 'map') this.equipped.map = true;
    if (id === 'horse') this.equipped.mount = true;
    this.toast(`Kupiono: ${item.name}`, 'success');
    this.updateHud();
    this.openShop(npc);
  }

  closeShop() {
    $('shop').classList.add('hidden');
    this.state = 'play';
  }

  // ================= EKWIPUNEK =================
  addItem(id, count = 1) {
    this.inventory[id] = (this.inventory[id] || 0) + count;
    this.questOnItem(id, count);
    this.updateInventory();
    this.updateQuestUI();
  }

  quantity(id) { return this.inventory[id] || 0; }

  updateInventory() {
    if (!$('inventory').classList.contains('hidden')) this.renderInventory();
    this.updateHud();
  }

  renderInventory() {
    $('inv-stats').innerHTML = `
      <span>🧡 <b>${Math.round(this.health)}/${Math.round(this.maxHealth)}</b></span>
      <span>⚡ <b>${Math.round(this.stamina)}/${Math.round(this.maxStamina)}</b></span>
      <span>🗡️ <b>${ITEMS[this.equipped.weapon]?.name || '—'}</b></span>
      <span>🛡️ <b>${this.equipped.armor ? ITEMS[this.equipped.armor].name : '—'}</b></span>
      <span>📿 <b>${this.equipped.amulet ? ITEMS[this.equipped.amulet].name : '—'}</b></span>
    `;
    const grid = $('inv-grid');
    grid.innerHTML = '';
    const ids = Object.keys(this.inventory);
    for (const id of ids) {
      const item = ITEMS[id];
      if (!item) continue;
      const div = document.createElement('div');
      div.className = 'inv-item';
      div.innerHTML = `<div class="icon">${item.icon}</div><div class="name">${item.name}</div>${item.desc}<div class="count">ilość: ${this.inventory[id]}</div>`;
      const btn = document.createElement('button');
      if (item.type === 'potion') {
        btn.textContent = 'Użyj';
        btn.onclick = () => this.usePotion(id);
      } else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'amulet') {
        btn.textContent = this.equipped.weapon === id || this.equipped.armor === id || this.equipped.amulet === id ? 'Wyposażony' : 'Załóż';
        btn.disabled = this.equipped.weapon === id || this.equipped.armor === id || this.equipped.amulet === id;
        btn.onclick = () => this.equip(id);
      } else if (item.type === 'torch') {
        btn.textContent = this.player.torch ? 'Pochodnia: włączona' : 'Zapal';
        btn.onclick = () => this.toggleTorch();
      } else if (item.type === 'spell') {
        btn.textContent = 'Rzuć zaklęcie';
        btn.onclick = () => this.castSpell();
      } else {
        btn.textContent = 'Informacja';
        btn.onclick = () => this.toast(item.desc);
      }
      div.appendChild(btn);
      grid.appendChild(div);
    }
  }

  equip(id) {
    const item = ITEMS[id];
    if (item.type === 'weapon') this.equipped.weapon = id;
    if (item.type === 'armor') this.equipped.armor = id;
    if (item.type === 'amulet') {
      this.equipped.amulet = id;
      this.maxHealth = 100 + item.hp;
    }
    this.toast(`Wyposażono: ${item.name}`, 'success');
    this.renderInventory();
    this.updateHud();
  }

  usePotion(id) {
    const item = ITEMS[id];
    if ((this.inventory[id] || 0) <= 0) return;
    this.inventory[id]--;
    if (item.hp) this.health = Math.min(this.maxHealth, this.health + item.hp);
    if (item.stam) this.stamina = Math.min(this.maxStamina, this.stamina + item.stam);
    if (item.buff) this.buffTimer = 20;
    this.toast(`Użyto: ${item.name}`, 'success');
    if (this.inventory[id] <= 0) delete this.inventory[id];
    this.renderInventory();
    this.updateHud();
  }

  toggleTorch() {
    if (!this.player.torch) { this.player.addTorch(); this.toast('Pochodnia oświetla drogę', 'success'); }
    else { this.player.removeTorch(); this.toast('Schowano pochodnię'); }
    this.renderInventory();
  }

  castSpell() {
    if ((this.inventory.spell || 0) <= 0) { this.deleteQty('spell'); this.toast('Nie masz zaklęcia'); return; }
    this.deleteQty('spell');
    this.buffTimer = 20;
    const pp = this.player.group.position;
    const forward = new THREE.Vector3(Math.sin(this.player.group.rotation.y), 0, Math.cos(this.player.group.rotation.y));
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = new THREE.Vector3(e.group.position.x - pp.x, 0, e.group.position.z - pp.z);
      if (d.length() < 25 && d.normalize().dot(forward) > 0.2) this.hitEnemy(e, 45);
    }
    this.toast('🔮 Ognista kula! +obrażenia 20s', 'success');
    this.renderInventory();
  }

  deleteQty(id) { if (this.inventory[id] > 1) this.inventory[id]--; else delete this.inventory[id]; }

  // ================= ZADANIA =================
  questOnItem(id, count) {
    if (id === 'herb') this.tickMission('herb', id, count);
    if (id === 'torch') this.tickMission('torch', id, count);
  }

  onKill(kind) {
    if (kind === 'goblin') this.tickMission('patrol', 'goblin', 1);
    if (kind === 'wolf') this.tickMission('wolf', 'wolf', 1);
  }

  tickMission(questId, key, count) {
    const q = QUESTS[questId];
    if (!q || this.questCompleted[questId]) return;
    const pr = this.questProgress[questId] ?? {};
    if (!pr[key]) pr[key] = 0;
    pr[key] += count;
    this.questProgress[questId] = pr;
    const done = this.objectivesDone(questId);
    if (done && questId !== 'herb') this.completeQuest(questId);
    else this.toast(`Postęp: ${q.title}`);
    this.updateQuestUI();
  }

  objectivesDone(questId) {
    const q = QUESTS[questId];
    if (!q) return false;
    const pr = this.questProgress[questId] ?? {};
    for (const o of q.objectives) {
      let cur = 0;
      if (o.type === 'item') cur = Math.min(this.quantity(o.item), o.target || 1);
      else if (o.type === 'kill' || o.type === 'talk') cur = pr[o.target] || 0;
      if (cur < o.count) return false;
    }
    return true;
  }

  completeQuest(questId) {
    this.questCompleted[questId] = true;
    this.addGold(QUESTS[questId].reward);
    this.toast(`Misja ukończona: ${QUESTS[questId].title}! +${QUESTS[questId].reward} złota`, 'success');
    if (questId === 'audience') {
      // misja audiencji kończy się porozmawianiem z królem
    }
    this.updateQuestUI();
    this.checkReturnActive();
  }

  checkReturnActive() {
    if (['herb', 'torch', 'patrol', 'wolf'].every((q) => this.questCompleted[q]) && !this.questCompleted.return_king) {
      this.toast('🏰 Nowa misja: Zamelduj się u króla!', 'success');
    }
  }

  addGold(n) { this.gold += n; this.updateHud(); }

  // po rozmowie z królem
  onTalk(npcId) {
    if (npcId === 'king') {
      if (!this.questCompleted.audience) {
        this.questCompleted.audience = true;
        this.addGold(QUESTS.audience.reward);
        this.toast(`Audiencja u króla! +${QUESTS.audience.reward} złota`, 'success');
      }
    }
    this.updateQuestUI();
  }

  updateQuestUI() {
    this.renderQuestTracker();
    if (!$('quests-panel').classList.contains('hidden')) this.renderQuestList();
  }

  renderQuestTracker() {
    const box = $('quest-tracker');
    box.innerHTML = '';
    const active = Object.keys(QUESTS).filter((q) => this.activeQuests[q] && !this.questCompleted[q]);
    for (const qid of active) {
      const q = QUESTS[qid];
      const div = document.createElement('div');
      div.innerHTML = `<div class="q-title">📜 ${q.title}</div>`;
      for (const o of q.objectives) {
        let cur = '';
        if (o.type === 'item') cur = String(Math.min(this.quantity(o.item) || 0, o.target || 1));
        else if (o.type === 'talk') cur = '—';
        else cur = String(this.questProgress[qid]?.[o.target] || 0);
        const done = this.objectivesDone(qid);
        div.innerHTML += `<div class="q-obj ${done ? 'done' : ''}">${o.label.replace(/\(.*\)/, `(${cur}/${o.count})`)}</div>`;
        if (done) break;
      }
      box.appendChild(div);
    }
  }

  renderQuestList() {
    const box = $('quests-list');
    box.innerHTML = '';
    for (const qid of Object.keys(QUESTS)) {
      const q = QUESTS[qid];
      if (!this.activeQuests[qid] && !this.questCompleted[qid]) continue;
      const div = document.createElement('div');
      div.className = `quest-item ${this.questCompleted[qid] ? 'completed' : ''}`;
      div.innerHTML = `<h3>${q.title} ${this.questCompleted[qid] ? '✅' : ''}</h3><p>${q.desc}</p>`;
      for (const o of q.objectives) {
        let cur = '';
        if (o.type === 'item') cur = String(Math.min(this.quantity(o.item) || 0, o.target || 1));
        else if (o.type === 'talk') cur = this.questCompleted[qid] ? '1' : '0';
        else cur = String(this.questProgress[qid]?.[o.target] || 0);
        const done = this.questCompleted[qid] || this.objectivesDone(qid);
        div.innerHTML += `<p class="q-objective ${done ? 'done' : ''}">${o.label.replace(/\(.*\)/, `(${cur}/${o.count})`)}</p>`;
      }
      div.innerHTML += `<p class="q-reward">Nagroda: ${q.reward} złota</p>`;
      box.appendChild(div);
    }
  }

  // ================= UI / OVERLAY =================
  toggleOverlay(id) {
    if (id === 'inventory') this.renderInventory();
    if (id === 'quests-panel') this.renderQuestList();
    const e = $(id);
    if (e.classList.contains('hidden')) {
      e.classList.remove('hidden');
      this.state = 'menu';
    } else {
      e.classList.add('hidden');
      if (!this.isOverlayOpen()) this.state = 'play';
    }
  }

  closeOverlay(id) {
    $(id).classList.add('hidden');
    if (!this.isOverlayOpen()) this.state = 'play';
  }

  closeAllOverlays() {
    for (const id of ['inventory', 'quests-panel', 'shop']) $(id).classList.add('hidden');
    this.state = 'play';
  }

  isOverlayOpen() {
    return ['inventory', 'quests-panel', 'shop'].some((id) => !$(id).classList.contains('hidden'));
  }

  togglePause() {
    if (this.paused) {
      this.paused = false;
      this.state = 'play';
      $('main-menu').classList.add('hidden');
      $('hud').classList.remove('hidden');
    } else {
      this.paused = true;
      this.state = 'menu';
      $('main-menu').classList.remove('hidden');
    }
  }

  toast(msg, type = '') {
    const d = document.createElement('div');
    d.className = `toast ${type}`;
    d.textContent = msg;
    $('toast-container').appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }

  // ================= MINIMAPA =================
  updateMinimap() {
    const cv = $('minimap');
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const worldSize = 320;
    const scale = W / (worldSize * 2);
    function toMap(x, z) { return [W / 2 + x * scale, H / 2 + z * scale]; }
    ctx.clearRect(0, 0, W, H);
    // tło
    ctx.fillStyle = '#1b2a22';
    ctx.fillRect(0, 0, W, H);
    // symbole
    for (const l of this.world.landmarks) {
      const [x, y] = toMap(l.x, l.z);
      ctx.fillStyle = l.color;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    // NPC
    for (const n of this.npcs) {
      const [x, y] = toMap(n.group.position.x, n.group.position.z);
      ctx.fillStyle = '#ffd28a';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // wrogowie
    for (const e of this.enemies) {
      if (e.dead) continue;
      const [x, y] = toMap(e.group.position.x, e.group.position.z);
      ctx.fillStyle = e.stats.hostile ? '#ff5544' : '#d2d2a0';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    // zioła / kryształy
    for (const c of this.collectibles) {
      if (c.taken) continue;
      const [x, y] = toMap(c.x, c.z);
      ctx.fillStyle = c.type === 'crystal' ? '#58c6ff' : '#77ff88';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
    // gracz
    const p = this.player.group.position;
    const [px, py] = toMap(p.x, p.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.player.group.rotation.y);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  runQuestTalk(npc) {
    // wywoływane z dialogu
    this.onTalk(npc.data.id);
    if (npc.data.id === 'king') {
      if (!this.questCompleted.audience) { /* handled */ }
    }
  }
}

// ================= START =================
function boot() {
  let quality;
  try { quality = localStorage.getItem('dreamknight-quality') || 'medium'; } catch { quality = 'medium'; }
  const select = $('quality');
  select.value = quality;
  $('btn-start').addEventListener('click', () => {
    quality = select.value;
    try { localStorage.setItem('dreamknight-quality', quality); } catch {}
    $('main-menu').classList.add('hidden');
    $('loading-screen').classList.remove('hidden');
    $('loading-fill').style.width = '25%';
    setTimeout(() => {
      $('loading-fill').style.width = '70%';
      setTimeout(() => {
        $('loading-fill').style.width = '100%';
        setTimeout(() => {
          const game = new Game($('game-canvas'), quality);
          window.__dk = game;
          $('loading-screen').classList.add('hidden');
          $('hud').classList.remove('hidden');
          game.start();
          game.updateMinimap();
          setInterval(() => game.updateMinimap(), 250);
          game.toast('Witaj w królestwie, rycerzu! Porozmawiaj z królem.', 'success');
        }, 350);
      }, 450);
    }, 300);
  });

  $('btn-help').addEventListener('click', () => $('help-screen').classList.remove('hidden'));
  $('btn-help-close').addEventListener('click', () => $('help-screen').classList.add('hidden'));
}

// Rozpocznij, gdy DOM gotowy
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
