// Interfejs użytkownika: HUD, dialogi, sklep, ekwipunek, dziennik, minimapa.
import { ITEMS, SHOPS } from './items.js';
import { QUESTS } from './quests.js';
import { ZONE_NAMES, WORLD_SIZE } from './config.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.shopId = null;
    this.dialogOpen = false;
    this.mapStatic = null;
    this.lastHp = -1; this.lastStam = -1; this.lastXp = -1; this.lastGold = -1;
  }

  init() {
    // przyciski HUD
    $('btn-inventory').onclick = () => { this.game.audio.play('click'); this.toggleInventory(); };
    $('btn-quests').onclick = () => { this.game.audio.play('click'); this.toggleQuests(); };
    $('btn-menu').onclick = () => { this.game.audio.play('click'); this.game.pause(); };
    $('btn-inventory-close').onclick = () => this.toggleInventory(false);
    $('btn-quests-close').onclick = () => this.toggleQuests(false);
    $('btn-shop-close').onclick = () => this.closeShop();
    $('btn-resume').onclick = () => this.game.resume();
    $('btn-save').onclick = () => { this.game.save(true); this.game.audio.play('coin'); };
    $('btn-mute').onclick = () => {
      const a = this.game.audio;
      a.setMuted(!a.muted);
      $('btn-mute').textContent = a.muted ? '🔇 Dźwięk: wyciszony' : '🔊 Dźwięk: włączony';
    };
    $('btn-pause-help').onclick = () => { $('help-screen').classList.remove('hidden'); };
    $('btn-quit').onclick = () => this.game.quitToMenu();
    $('btn-respawn').onclick = () => this.game.respawn();
    $('btn-finale-close').onclick = () => { $('finale-screen').classList.add('hidden'); this.game.resume(); };
    $('btn-potion').onclick = () => this.game.player.drinkPotion(this.game);
    $('btn-spell').onclick = () => this.game.player.castFireball(this.game);
    $('btn-torch').onclick = () => this.game.player.toggleTorch(this.game);
    $('btn-horse').onclick = () => this.game.player.mount(this.game);
    $('quality2').onchange = (e) => this.game.setQuality(e.target.value);
    if (this.game.audio.muted) $('btn-mute').textContent = '🔇 Dźwięk: wyciszony';
  }

  // ---------- EKRANY ----------
  showLoading(pct, text) {
    $('loading-screen').classList.remove('hidden');
    $('loading-fill').style.width = `${pct}%`;
    if (text) $('loading-text').textContent = text;
  }
  hideLoading() { $('loading-screen').classList.add('hidden'); }
  showMenu(hasSave) {
    $('main-menu').classList.remove('hidden');
    $('hud').classList.add('hidden');
    $('btn-continue').classList.toggle('hidden', !hasSave);
  }
  hideMenu() { $('main-menu').classList.add('hidden'); $('hud').classList.remove('hidden'); }

  // ---------- HUD ----------
  updateHUD() {
    const p = this.game.player;
    const hpPct = (p.hp / p.maxHpTotal) * 100;
    if (hpPct !== this.lastHp) {
      $('hp-fill').style.width = `${hpPct}%`;
      $('hp-text').textContent = `${Math.ceil(p.hp)}/${p.maxHpTotal}`;
      this.lastHp = hpPct;
    }
    const stPct = (p.stam / p.maxStam) * 100;
    if (Math.abs(stPct - this.lastStam) > 0.5) { $('stam-fill').style.width = `${stPct}%`; this.lastStam = stPct; }
    const xpPct = (p.xp / p.xpNext) * 100;
    if (Math.abs(xpPct - this.lastXp) > 0.5) { $('xp-fill').style.width = `${xpPct}%`; this.lastXp = xpPct; }
    if (p.gold !== this.lastGold) { $('gold').textContent = `💰 ${p.gold}`; this.lastGold = p.gold; }
    $('level-badge').textContent = `Poziom ${p.level} • ⚔️${p.atk} 🛡️${p.def}`;
    // zegar
    const dayT = this.game.world.dayT;
    const hrs = Math.floor(((dayT + 0.25) % 1) * 24);
    const icon = this.game.world.isNight ? '🌙' : hrs < 10 || hrs > 17 ? '🌅' : '☀️';
    $('clock').textContent = `${icon} ${hrs}:00`;
    // cel zadania
    this.updateTracker();
    // broń dystansowa — celownik
    $('crosshair').classList.toggle('hidden', !p.rangedWeapon);
    // szybkie sloty
    $('btn-potion').classList.toggle('off', p.inv.count('potion_s') + p.inv.count('potion_b') === 0);
    $('btn-spell').classList.toggle('off', !p.inv.spells.includes('fireball'));
    $('btn-torch').classList.toggle('off', !p.inv.hasTorch && !p.inv.has('torch'));
    $('btn-horse').classList.toggle('off', !p.inv.hasHorse);
    // strefa
    $('zone-label').textContent = ZONE_NAMES[this.game.zone] || '';
    this.drawMinimap();
  }

  updateTracker() {
    const qm = this.game.quests;
    const id = qm.tracked;
    if (!id || qm.state[id].status === 'done') { $('quest-tracker').classList.add('hidden'); return; }
    $('quest-tracker').classList.remove('hidden');
    $('tracker-title').textContent = `📜 ${QUESTS[id].name}`;
    $('tracker-text').textContent = qm.progressText(id);
  }

  prompt(text, key = 'E') {
    if (!text) { $('interact-prompt').classList.add('hidden'); return; }
    $('interact-prompt').classList.remove('hidden');
    $('interact-key').textContent = this.game.input.touchMode ? '💬' : key;
    $('interact-text').textContent = text;
  }

  hint(text, ms = 4000) {
    const el = $('context-hint');
    if (!text) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.textContent = text;
    clearTimeout(this._hintT);
    if (ms) this._hintT = setTimeout(() => el.classList.add('hidden'), ms);
  }

  hitMarker() {
    const el = $('combo-hint');
    el.textContent = '💥';
    el.classList.remove('hidden');
    clearTimeout(this._hitT);
    this._hitT = setTimeout(() => el.classList.add('hidden'), 180);
  }

  damageFlash() {
    const v = $('damage-vignette');
    v.style.opacity = 1;
    setTimeout(() => { v.style.opacity = 0; }, 220);
  }

  toast(msg, cls = '') {
    const box = $('toast-container');
    const d = document.createElement('div');
    d.className = `toast ${cls}`;
    d.textContent = msg;
    box.appendChild(d);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => d.classList.add('fade'), 2600);
    setTimeout(() => d.remove(), 3200);
  }

  showBoss(name, frac) {
    $('boss-bar').classList.remove('hidden');
    $('boss-name').textContent = `💀 ${name}`;
    $('boss-fill').style.width = `${Math.max(0, frac * 100)}%`;
  }
  hideBoss() { $('boss-bar').classList.add('hidden'); }

  showDeath() { $('death-screen').classList.remove('hidden'); }
  hideDeath() { $('death-screen').classList.add('hidden'); }

  // ---------- DIALOGI ----------
  showDialogue(name, text, options) {
    this.dialogOpen = true;
    this.game.input.uiOpen = true;
    this.game.input.unlock();
    $('dialogue').classList.remove('hidden');
    $('dialog-name').textContent = name;
    // efekt pisania
    const el = $('dialog-text');
    el.textContent = '';
    let i = 0;
    clearInterval(this._typeT);
    this._typeT = setInterval(() => {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(this._typeT);
    }, 12);
    const box = $('dialog-options');
    box.innerHTML = '';
    for (const o of options) {
      const b = document.createElement('button');
      b.textContent = o.label;
      if (o.cls) b.className = o.cls;
      b.onclick = () => { this.game.audio.play('click'); o.fn(); };
      box.appendChild(b);
    }
  }

  closeDialogue() {
    clearInterval(this._typeT);
    this.dialogOpen = false;
    this.game.input.uiOpen = false;
    $('dialogue').classList.add('hidden');
  }

  // ---------- SKLEP ----------
  openShop(shopId) {
    this.shopId = shopId;
    this.closeDialogue();
    this.game.input.uiOpen = true;
    this.game.input.unlock();
    $('shop').classList.remove('hidden');
    this.renderShop();
  }
  closeShop() {
    this.shopId = null;
    $('shop').classList.add('hidden');
    this.game.input.uiOpen = false;
  }
  refreshShopGold() { if (this.shopId) this.renderShop(); }

  renderShop() {
    const shop = SHOPS[this.shopId];
    const p = this.game.player;
    $('shop-title').textContent = shop.name;
    $('shop-desc').textContent = shop.desc;
    $('shop-gold').textContent = `💰 Twoje złoto: ${p.gold}`;
    const list = $('shop-list');
    list.innerHTML = '';
    for (const id of shop.items) {
      const it = ITEMS[id];
      const owned = it.unique && p.inv.count(id) > 0;
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `<div class="icon">${it.icon}</div>
        <div class="info"><div class="name">${it.name}</div><div class="desc">${it.desc}</div></div>
        <div class="price">${owned ? '✓' : it.price + '💰'}</div>`;
      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.textContent = owned ? 'Masz' : 'Kup';
      btn.disabled = owned || p.gold < it.price;
      btn.onclick = () => {
        if (p.gold < it.price) return;
        p.gold -= it.price;
        p.inv.add(id);
        if (it.spell) {
          p.inv.learnSpell(it.spell);
          this.toast(`✨ Nauczono: ${it.spell === 'fireball' ? 'Kula Ognia (F)' : 'Leczenie'}!`, 'quest');
        }
        this.game.audio.play('coin');
        this.toast(`🛒 Kupiono: ${it.name}`);
        this.game.save();
        this.renderShop();
      };
      row.appendChild(btn);
      list.appendChild(row);
    }
    // skup: skóry i mięso u kupców
    if (this.shopId.startsWith('merchant')) {
      for (const [sid, label] of [['wolf_pelt', 'skóry wilka'], ['venison', 'dzikie mięso'], ['herb_sun', 'słoneczne ziele']]) {
        const n = p.inv.count(sid);
        if (!n) continue;
        const row = document.createElement('div');
        row.className = 'shop-item';
        row.innerHTML = `<div class="icon">${ITEMS[sid].icon}</div>
          <div class="info"><div class="name">Sprzedaj: ${label} (${n}x)</div>
          <div class="desc">Skup po ${ITEMS[sid].price}💰 za sztukę</div></div>
          <div class="price">+${n * ITEMS[sid].price}💰</div>`;
        const btn = document.createElement('button');
        btn.className = 'btn gold';
        btn.textContent = 'Sprzedaj';
        btn.onclick = () => {
          p.inv.remove(sid, n);
          p.addGold(n * ITEMS[sid].price);
          this.game.audio.play('coin');
          this.renderShop();
        };
        row.appendChild(btn);
        list.appendChild(row);
      }
    }
  }

  // ---------- EKWIPUNEK ----------
  toggleInventory(force) {
    const el = $('inventory');
    const show = force !== undefined ? force : el.classList.contains('hidden');
    el.classList.toggle('hidden', !show);
    this.game.input.uiOpen = show || this.dialogOpen || !($('quests-panel').classList.contains('hidden')) || !($('shop').classList.contains('hidden'));
    if (show) { this.game.input.unlock(); this.renderInventory(); }
  }

  renderInventory() {
    const p = this.game.player;
    const b = p.inv.bonus();
    $('inv-stats').innerHTML =
      `❤️ <b>${Math.ceil(p.hp)}/${p.maxHpTotal}</b> &nbsp; ⚔️ <b>${p.atk}</b> &nbsp; 🛡️ <b>${p.def}</b> &nbsp; 💰 <b>${p.gold}</b> &nbsp; ⭐ <b>Pz ${p.level}</b>` +
      (p.inv.spells.length ? `<br/>✨ Zaklęcia: <b>${p.inv.spells.map((s) => s === 'fireball' ? 'Kula Ognia (F)' : 'Leczenie').join(', ')}</b>` : '');
    // sloty
    const slots = $('equip-slots');
    slots.innerHTML = '';
    for (const [slot, label] of [['weapon', '⚔️ Broń'], ['armor', '🛡️ Zbroja'], ['amulet', '📿 Amulet']]) {
      const id = p.inv.equipped(slot);
      const d = document.createElement('div');
      d.className = 'equip-slot' + (id ? ' filled' : '');
      d.innerHTML = `<div class="slot-name">${label}</div>${id ? ITEMS[id].icon + ' ' + ITEMS[id].name : '<i>puste</i>'}`;
      if (id) d.onclick = () => { p.inv.unequip(slot); this.game.audio.play('click'); p.updateWeaponMesh(); this.renderInventory(); };
      slots.appendChild(d);
    }
    // siatka
    const grid = $('inv-grid');
    grid.innerHTML = '';
    const ids = Object.keys(p.inv.items);
    if (!ids.length) grid.innerHTML = '<p style="color:var(--muted)">Pusto…</p>';
    for (const id of ids) {
      const it = ITEMS[id];
      if (!it) continue;
      const n = p.inv.count(id);
      const d = document.createElement('div');
      d.className = 'inv-item';
      d.title = it.desc;
      d.innerHTML = `<div class="icon">${it.icon}</div><div class="name">${it.name}</div>${n > 1 ? `<div class="count">${n}</div>` : ''}`;
      d.onclick = () => this.useItem(id);
      grid.appendChild(d);
    }
  }

  useItem(id) {
    const p = this.game.player;
    const it = ITEMS[id];
    if (!it) return;
    if (it.type === 'weapon' || it.type === 'armor' || it.type === 'amulet') {
      if (p.inv.equipped(it.type) === id) p.inv.unequip(it.type);
      else p.inv.equip(id);
      p.updateWeaponMesh();
      this.game.audio.play('click');
      this.toast(`${it.icon} ${p.inv.equipped(it.type) === id ? 'Założono' : 'Zdjęto'}: ${it.name}`);
    } else if (it.type === 'consumable') {
      if (p.hp >= p.maxHpTotal) { this.toast('Masz pełne zdrowie.', 'bad'); return; }
      p.inv.remove(id);
      p.heal(it.heal);
      this.game.audio.play(it.use === 'eat' ? 'eat' : 'potion');
      this.toast(`${it.icon} +${it.heal} HP`, 'gold');
    } else if (it.type === 'spell') {
      if (!p.inv.spells.includes(it.spell)) {
        p.inv.learnSpell(it.spell);
        this.toast(`✨ Nauczono zaklęcia!`, 'quest');
        this.game.audio.play('quest');
      }
    } else if (id === 'torch') {
      p.toggleTorch(this.game);
    } else if (id === 'meal' || id === 'bread') {
      p.inv.remove(id); p.heal(it.heal);
      this.game.audio.play('eat');
    } else {
      this.toast(it.desc);
      return;
    }
    this.game.save();
    this.renderInventory();
  }

  // ---------- DZIENNIK ----------
  toggleQuests(force) {
    const el = $('quests-panel');
    const show = force !== undefined ? force : el.classList.contains('hidden');
    el.classList.toggle('hidden', !show);
    this.game.input.uiOpen = show || this.dialogOpen || !($('inventory').classList.contains('hidden')) || !($('shop').classList.contains('hidden'));
    if (show) { this.game.input.unlock(); this.renderQuests(); }
  }

  renderQuests() {
    const qm = this.game.quests;
    const list = $('quests-list');
    list.innerHTML = '';
    for (const [id, q] of Object.entries(QUESTS)) {
      const s = qm.state[id];
      if (s.status === 'locked') continue;
      const d = document.createElement('div');
      d.className = `quest-card ${q.type}${s.status === 'done' ? ' done' : ''}`;
      const rw = [];
      if (q.reward.gold) rw.push(`${q.reward.gold}💰`);
      if (q.reward.xp) rw.push(`${q.reward.xp} PD`);
      for (const it of q.reward.items || []) rw.push(ITEMS[it]?.name || it);
      d.innerHTML = `<div class="qname">${q.type === 'main' ? '👑' : '🌿'} ${q.name}</div>
        <div class="qdesc">${q.desc}</div>
        <div class="qobj">➤ ${qm.progressText(id)}</div>
        <div class="qreward">Nagroda: ${rw.join(' • ')}</div>`;
      d.onclick = () => {
        if (s.status !== 'done') {
          qm.tracked = id;
          this.toast(`📍 Śledzone: ${q.name}`);
          this.game.audio.play('click');
          this.renderQuests();
        }
      };
      if (qm.tracked === id && s.status !== 'done') d.style.borderColor = 'var(--gold)';
      list.appendChild(d);
    }
  }

  refreshQuestMarkers() {
    const qm = this.game?.quests;
    if (!qm || !this.game.npcs) return;
    for (const n of this.game.npcs.npcs) {
      this.game.npcs.setMarker(n.id, qm.markerFor(n.id));
    }
  }

  // ---------- MINIMAPA ----------
  buildStaticMap() {
    const c = document.createElement('canvas');
    c.width = c.height = 188;
    const x = c.getContext('2d');
    const W = WORLD_SIZE;
    const px = (wx) => ((wx + W / 2) / W) * 188;
    // tło
    x.fillStyle = '#223a1e'; x.fillRect(0, 0, 188, 188);
    // góry
    x.fillStyle = '#6a6a75';
    x.fillRect(0, 0, 188, px(-125) - 0);
    // las
    x.fillStyle = '#1d4a3a';
    x.beginPath(); x.ellipse(px(190), px(40), 34, 30, 0, 0, 7); x.fill();
    // staw
    x.fillStyle = '#2a7a9a';
    x.beginPath(); x.arc(px(208), px(96), 6, 0, 7); x.fill();
    // fosa
    x.strokeStyle = '#2a7a9a'; x.lineWidth = 7;
    x.strokeRect(px(-97), px(-97), px(97) - px(-97), px(97) - px(-97));
    // mury
    x.strokeStyle = '#8a8a95'; x.lineWidth = 3;
    x.strokeRect(px(-80), px(-80), px(80) - px(-80), px(80) - px(-80));
    // rynek
    x.fillStyle = '#9a9aa5';
    x.beginPath(); x.arc(px(0), px(5), 8, 0, 7); x.fill();
    // zamek
    x.fillStyle = '#c9a83c';
    x.fillRect(px(-14), px(-66), px(16) - px(-14), px(-38) - px(-66));
    // drogi
    x.strokeStyle = '#7a6242'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(px(0), px(107)); x.lineTo(px(0), px(310)); x.stroke();
    x.beginPath(); x.moveTo(px(-230), px(160)); x.lineTo(px(230), px(160)); x.stroke();
    x.beginPath(); x.moveTo(px(40), px(160)); x.lineTo(px(40), px(-220)); x.stroke();
    x.beginPath(); x.moveTo(px(-168), px(160)); x.lineTo(px(-168), px(60)); x.stroke();
    x.beginPath(); x.moveTo(px(190), px(160)); x.lineTo(px(190), px(45)); x.stroke();
    // jaskinia
    x.fillStyle = '#3a3a44';
    x.beginPath(); x.arc(px(-196), px(62), 7, 0, 7); x.fill();
    // obóz goblinów
    x.fillStyle = '#7a3a1e';
    x.beginPath(); x.arc(px(40), px(-205), 5, 0, 7); x.fill();
    this.mapStatic = c;
  }

  drawMinimap() {
    const cv = $('minimap');
    if (!cv || !this.game.player) return;
    if (!this.mapStatic) this.buildStaticMap();
    const x = cv.getContext('2d');
    const S = 188, W = WORLD_SIZE;
    const px = (wx) => ((wx + W / 2) / W) * S;
    x.clearRect(0, 0, S, S);
    x.save();
    x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 1, 0, 7); x.clip();
    x.drawImage(this.mapStatic, 0, 0);
    const dot = (wx, wz, color, r = 3) => {
      x.fillStyle = color;
      x.beginPath(); x.arc(px(wx), px(wz), r, 0, 7); x.fill();
    };
    const p = this.game.player;
    const hasMap = p.inv.hasMap;
    // NPC-e
    for (const n of this.game.npcs.npcs) {
      const m = this.game.quests.markerFor(n.id);
      dot(n.rig.group.position.x, n.rig.group.position.z, m === '?' ? '#8fd18f' : m === '!' ? '#ffd75e' : '#c9bfa8', m ? 4 : 2.5);
    }
    // wrogowie w pobliżu
    for (const e of this.game.creatures.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.rig.group.position.x - p.group.position.x, e.rig.group.position.z - p.group.position.z);
      if (d < 60 || hasMap) dot(e.rig.group.position.x, e.rig.group.position.z, e.boss ? '#ff2222' : '#ff6b5e', e.boss ? 5 : 3);
    }
    // koń
    const h = this.game.creatures.playerHorse;
    if (h) dot(h.rig.group.position.x, h.rig.group.position.z, '#a06a2a', 3);
    // zaginiona owca
    const ls = this.game.creatures.lostSheep;
    if (ls && !ls.dead && this.game.quests.state.s2_sheep.status === 'active')
      dot(ls.rig.group.position.x, ls.rig.group.position.z, '#ffffff', 4);
    // cel zadania — pulsujący znacznik
    const t = performance.now() / 400;
    const pulse = 3 + Math.sin(t) * 1.5;
    const qid = this.game.quests.tracked;
    if (qid && hasMap !== false) {
      const target = this.questTarget(qid);
      if (target) {
        x.strokeStyle = '#ffd75e'; x.lineWidth = 2;
        x.beginPath(); x.arc(px(target.x), px(target.z), pulse + 3, 0, 7); x.stroke();
        dot(target.x, target.z, '#ffd75e', 3);
      }
    }
    // gracz — strzałka
    const pxx = px(p.group.position.x), pzz = px(p.group.position.z);
    x.save();
    x.translate(pxx, pzz);
    x.rotate(Math.atan2(Math.sin(p.group.rotation.y), -Math.cos(p.group.rotation.y)));
    x.fillStyle = '#ffe9b0';
    x.strokeStyle = '#000'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 5); x.lineTo(0, 2.5); x.lineTo(-5, 5); x.closePath();
    x.fill(); x.stroke();
    x.restore();
    x.restore();
  }

  questTarget(qid) {
    // przybliżony cel śledzonego zadania
    const st = this.game.quests.state[qid]?.status;
    if (!st || st === 'done') return null;
    const spots = {
      q1_audience: { x: 0, z: -52 },
      q2_herbs: st === 'turnin' ? { x: 28, z: -12 } : { x: 190, z: 40 },
      q3_wolves: st === 'turnin' ? { x: -8, z: 16 } : { x: 190, z: 40 },
      q4_goblins: st === 'turnin' ? { x: 0, z: -52 } : { x: 40, z: -205 },
      q5_crystal: st === 'turnin' ? { x: 0, z: -52 } : { x: -196, z: 62 },
      q6_finale: { x: 0, z: -52 },
      s1_meat: st === 'turnin' ? { x: -24, z: -14 } : { x: 0, z: 200 },
      s2_sheep: st === 'turnin' ? { x: -44, z: 170 } : { x: 31, z: 186 },
      s3_steel: st === 'turnin' ? { x: 28, z: 14 } : { x: -196, z: 62 },
    };
    return spots[qid] || null;
  }
}
