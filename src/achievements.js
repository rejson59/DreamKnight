// Dream Knight — osiągnięcia i statystyki.
// Osiągnięcia zapisują się OSOBNIE od zapisu gry (localStorage), więc
// przetrwają nową grę — jak na prawdziwego RPG przystało.

import { icon } from './icons.js';

const ACH_KEY = 'dreamknight_achievements_v1';

// def: id, name, desc, icon, check(stats, game) -> bool
export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'Pierwsza krew', icon: 'sword', desc: 'Pokonaj pierwszego wroga.', check: (s) => s.kills >= 1 },
  { id: 'slayer10', name: 'Pogromca', icon: 'sword', desc: 'Pokonaj 10 wrogów.', check: (s) => s.kills >= 10 },
  { id: 'slayer50', name: 'Rzeźnik z korony', icon: 'skull', desc: 'Pokonaj 50 wrogów.', check: (s) => s.kills >= 50 },
  { id: 'wraith_bane', name: 'Pogromca duchów', icon: 'ghost', desc: 'Rozprosz 10 Duchów Bagien.', check: (s) => (s.killsBy.wraith || 0) >= 10 },
  { id: 'level5', name: 'Twardy zuch', icon: 'star', desc: 'Osiągnij 5. poziom.', check: (s) => s.level >= 5 },
  { id: 'level10', name: 'Legendarny rycerz', icon: 'crown', desc: 'Osiągnij 10. poziom.', check: (s) => s.level >= 10 },
  { id: 'quests5', name: 'Ramie do zadań', icon: 'scroll', desc: 'Ukończ 5 zadań.', check: (s) => s.questsDone >= 5 },
  { id: 'quests_all', name: 'Bohater królestwa', icon: 'crown', desc: 'Ukończ wszystkie zadania główne.', check: (s) => s.mainDone >= 9 },
  { id: 'golem_slayer', name: 'Kamienny ciężar z serca', icon: 'shield', desc: 'Pokonaj Kamiennego Golema.', check: (s) => s.bossKills.golem },
  { id: 'dk_slayer', name: 'Światło po mroku', icon: 'star', desc: 'Pokonaj Mrocznego Rycerza.', check: (s) => s.bossKills.darkknight },
  { id: 'rich', name: 'Pełna sakwa', icon: 'coin', desc: 'Zgromadź 1000 złota.', check: (s, g) => g.player.gold >= 1000 },
  { id: 'fish1', name: 'Spokojna dusza', icon: 'fish', desc: 'Złów pierwszą rybę.', check: (s) => s.fish >= 1 },
  { id: 'fish10', name: 'Mistrz wędki', icon: 'rod', desc: 'Złów 10 ryb.', check: (s) => s.fish >= 10 },
  { id: 'fish_gold', name: 'Złoty połów', icon: 'fish', desc: 'Złów Złotą Rybkę.', check: (s) => s.goldenFish >= 1 },
  { id: 'chest3', name: 'Łowca skarbów', icon: 'key', desc: 'Otwórz 3 skrzynie.', check: (s) => s.chests >= 3 },
  { id: 'rider', name: 'W siodle!', icon: 'horse', desc: 'Kup konia.', check: (s, g) => !!g.player.inv.hasHorse },
  { id: 'maxsmith', name: 'Kowalska doskonałość', icon: 'mace', desc: 'Ulepsz broń do +3.', check: (s) => s.maxUpgrade >= 3 },
  { id: 'swamp_hero', name: 'Oczyszczyciel bagien', icon: 'herb', desc: 'Ukończ zadanie „Duchy z bagien”.', check: (s) => !!s.quests.q9_swamp },
];

export class Achievements {
  constructor(game) {
    this.game = game;
    this.unlocked = new Set();
    // statystyki zapisu (od zera przy nowej grze)
    this.stats = this.freshStats();
    this.load();
  }

  freshStats() {
    return {
      kills: 0, killsBy: {}, questsDone: 0, mainDone: 0, level: 1,
      bossKills: {}, fish: 0, goldenFish: 0, chests: 0, maxUpgrade: 0,
      quests: {}, // id -> 1 (ukończone w tej grze)
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(ACH_KEY);
      if (raw) this.unlocked = new Set(JSON.parse(raw));
    } catch { /* prywatny tryb */ }
  }

  save() {
    try { localStorage.setItem(ACH_KEY, JSON.stringify([...this.unlocked])); } catch { }
  }

  reset() { // nowa gra: statystyki od zera, osiągnięcia zostają
    this.stats = this.freshStats();
  }

  // ---- hooki ----
  onEnemyKilled(e) {
    this.stats.kills++;
    this.stats.killsBy[e.kind] = (this.stats.killsBy[e.kind] || 0) + 1;
    if (e.boss) this.stats.bossKills[e.kind] = 1;
    this.check();
  }
  onLevel(level) { this.stats.level = level; this.check(); }
  onQuestDone(id) {
    this.stats.questsDone++;
    this.stats.quests[id] = 1;
    if (id.startsWith('q')) this.stats.mainDone++;
    this.check();
  }
  onFish(itemId) {
    this.stats.fish++;
    if (itemId === 'fish_gold') this.stats.goldenFish++;
    // but się nie liczy — to nie ryba!
    if (itemId === 'old_boot') this.stats.fish--;
    this.check();
  }
  onChest() { this.stats.chests++; this.check(); }
  onWeaponUpgrade(level) {
    this.stats.maxUpgrade = Math.max(this.stats.maxUpgrade, level);
    this.check();
  }

  check() {
    const g = this.game;
    if (!g?.player) return;
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id)) continue;
      let ok = false;
      try { ok = !!a.check(this.stats, g); } catch { ok = false; }
      if (ok) this.unlock(a);
    }
  }

  unlock(a) {
    this.unlocked.add(a.id);
    this.save();
    const g = this.game;
    g.audio?.play('achieve');
    g.ui?.toast(`🏆 Osiągnięcie: ${a.name}!`, 'gold');
  }

  // ---- panel ----
  render() {
    const g = this.game;
    const el = document.getElementById('ach-list');
    if (!el) return;
    const s = this.stats;
    el.innerHTML = `
      <div class="ach-stats">
        Pokonani wrogowie: <b>${s.kills}</b> • Zadania: <b>${s.questsDone}</b> • Poziom: <b>${s.level}</b> •
        Ryby: <b>${s.fish}</b> • Skrzynie: <b>${s.chests}</b> • Złoto: <b>${g.player.gold}</b>
      </div>
      <div class="ach-grid">` +
      ACHIEVEMENTS.map((a) => {
        const has = this.unlocked.has(a.id);
        return `<div class="ach-card ${has ? 'unlocked' : 'locked'}">
          <div class="ach-ic">${icon(a.icon, 30)}</div>
          <div class="ach-info"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>
          <div class="ach-mark">${has ? '✓' : '🔒'}</div>
        </div>`;
      }).join('') + '</div>';
    document.getElementById('ach-count').textContent =
      `${this.unlocked.size}/${ACHIEVEMENTS.length} odblokowanych`;
  }

  toggle(force) {
    const el = document.getElementById('achievements');
    if (!el) return;
    const show = force !== undefined ? force : el.classList.contains('hidden');
    el.classList.toggle('hidden', !show);
    if (show) {
      this.game.audio?.play('click');
      this.game.input.uiOpen = true;
      this.game.input.unlock?.();
      this.render();
    }
  }
}
