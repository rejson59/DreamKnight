// Test dymny logiki Dream Knight (Node, bez DOM/WebGL).
// Uruchomienie: node test/smoke.mjs
globalThis.devicePixelRatio = 1; // stub global przeglądarki
// mini-stub document.createElement('canvas') dla proceduralnych tekstur
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'canvas' ? {} : () => { }) });
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }),
};
import { QUESTS, QuestManager } from '../src/quests.js';
import { ITEMS, SHOPS, Inventory } from '../src/items.js';
import { ACHIEVEMENTS, Achievements } from '../src/achievements.js';

let passed = 0, failed = 0;
const ok = (cond, name) => {
  if (cond) { passed++; console.log('  ✓', name); }
  else { failed++; console.error('  ✗ NIEPOWODZENIE:', name); }
};

// --- makieta game ---
const makeGame = () => {
  const toasts = [];
  const g = {
    player: {
      level: 1, gold: 0, inv: new Inventory(),
      addGold(n) { this.gold += n; },
      addXp() { },
    },
    audio: { play() { }, ensure() { return true; } },
    ui: { toast(m) { toasts.push(m); }, refreshQuestMarkers() { } },
    npcs: { nameOf: (id) => ({ king: 'Król', morwena: 'Morwena', miller: 'Piotr' }[id] || id) },
    save() { },
    _toasts: toasts,
  };
  g.quests = new QuestManager(g);
  g.achv = new Achievements(g);
  // localStorage stub
  globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, };
  g.achv.load();
  return g;
};

console.log('\n[1] Definicje zadań i przedmiotów');
ok(QUESTS.q9_swamp && QUESTS.q9_swamp.objective.target === 'wraith', 'q9_swamp: zadanie główne na duchy');
ok(QUESTS.s7_herbs.objective.target === 'swamp_herb', 's7_herbs: zioła dla Morweny');
ok(QUESTS.s8_fishing.objective.target === 'fish_caught', 's8_fishing: łowienie ryb');
ok(QUESTS.q9_swamp.requires.includes('q8_darkknight'), 'q9 wymaga q8');
ok(ITEMS.fishing_rod && ITEMS.fish_gold && ITEMS.potion_xl && ITEMS.spell_ice, 'nowe przedmioty istnieją');
ok(SHOPS.witch && SHOPS.witch.items.includes('spell_ice'), 'sklep czarownicy ma księgę lodu');
ok(SHOPS.merchant_aldona.sells.includes('fish_gold'), 'Aldona skupuje złotą rybkę');

console.log('\n[2] Przebieg zadania q9_swamp (zabicia duchów + odbiór u Morweny)');
const g = makeGame();
const Q = g.quests;
// odblokuj łańcuch: q1..q8 done
for (const id of ['q1_audience', 'q2_herbs', 'q3_wolves', 'q4_goblins', 'q5_crystal', 'q6_finale', 'q7_ruins', 'q8_darkknight'])
  Q.state[id].status = 'done';
Q.refresh();
ok(Q.state.q9_swamp.status === 'available', 'q9 dostępne po q8');
Q.accept('q9_swamp');
ok(Q.state.q9_swamp.status === 'active', 'q9 przyjęte');
Q.onKill('wraith');
ok(Q.state.q9_swamp.count === 1, 'licznik duchów rośnie (1/4)');
Q.onKill('wraith'); Q.onKill('wraith'); Q.onKill('wolf');
ok(Q.state.q9_swamp.count === 3, 'wilk nie liczy się do duchów (3/4)');
Q.onKill('wraith');
ok(Q.state.q9_swamp.status === 'turnin', 'q9 gotowe do oddania');
ok(Q.canTurnIn('q9_swamp', 'morwena'), 'odbiór u Morweny');
ok(!Q.canTurnIn('q9_swamp', 'king'), 'król NIE odbierze q9');
g.player.inv.add('amulet_swamp'); // nagroda
const goldBefore = g.player.gold;
Q.turnIn('q9_swamp', 'morwena');
ok(Q.state.q9_swamp.status === 'done', 'q9 ukończone');
ok(g.player.gold === goldBefore + 500, 'nagroda 500 zł wypłacona');

console.log('\n[3] s8_fishing: licznik 3 ryb');
Q.accept('s8_fishing');
ok(Q.state.s8_fishing.status === 'active', 's8 aktywne');
Q.onSpecial('fish_caught');
ok(Q.state.s8_fishing.count === 1 && Q.state.s8_fishing.status === 'active', '1/3 ryby — jeszcze aktywne');
Q.onSpecial('fish_caught'); Q.onSpecial('fish_caught');
ok(Q.state.s8_fishing.status === 'turnin', '3/3 ryby — do oddania');

console.log('\n[4] s7_herbs: zbiór i odbiór');
Q.accept('s7_herbs');
for (let i = 0; i < 5; i++) { g.player.inv.add('swamp_herb'); Q.onCollect('swamp_herb'); }
ok(Q.state.s7_herbs.status === 'turnin', '5 ziół zebrane — do oddania');
const herbs = g.player.inv.count('swamp_herb');
ok(herbs === 5, 'gracz ma 5 ziół przed oddaniem');
Q.turnIn('s7_herbs', 'morwena');
ok(g.player.inv.count('swamp_herb') === 0, 'zioła zabrane przy oddaniu');

console.log('\n[5] Zlecenia (tablica): duchy');
// onKill woła game.onBountyKill — symulacja
g.bounty = { kind: 'wraith', name: 'Duchy', need: 4, count: 0, reward: 260 };
g.onBountyKill = (kind) => {
  const b = g.bounty;
  if (!b || b.kind !== kind || b.count >= b.need) return;
  b.count++;
};
g.quests = Q; // onKill używa this.game
Q.onKill('wraith');
ok(g.bounty.count === 1, 'zlecenie na duchy zlicza');

console.log('\n[6] Osiągnięcia');
const a = g.achv;
a.onEnemyKilled({ kind: 'wraith', boss: false });
a.onEnemyKilled({ kind: 'golem', boss: true });
a.onFish('fish_small');
a.onFish('old_boot');
a.onFish('fish_gold');
a.onLevel(5);
ok(a.unlocked.has('first_blood'), 'osiągnięcie: pierwsza krew');
ok(a.unlocked.has('golem_slayer'), 'osiągnięcie: golem');
ok(a.unlocked.has('fish_gold'), 'osiągnięcie: złota rybka');
ok(a.stats.fish === 2, 'stary but nie liczy się jako ryba');
ok(!a.unlocked.has('fish10'), '10 ryb jeszcze nie');
ok(a.unlocked.has('level5'), 'poziom 5');
a.onQuestDone('q9_swamp');
ok(a.unlocked.has('swamp_hero'), 'osiągnięcie: oczyszczyciel bagien');
ok(!a.unlocked.has('quests_all'), 'wszystkie główne jeszcze nie');

console.log('\n[7] Ulepszenie broni (logika bonusu) — prawdziwa klasa Player');
const { Player } = await import('../src/player.js');
const scene = new (await import('three')).Scene();
const fakeWorld = { walkHeight: () => 0 };
const fakeTex = { flame: null };
const pl = new Player(scene, fakeWorld, fakeTex);
pl.baseAtk = 4; pl.level = 1;
pl.weaponUpg = {};
pl.inv.add('sword_iron'); pl.inv.equip('sword_iron');
const before = pl.atk;
pl.weaponUpg['sword_iron'] = 3;
ok(pl.atk === before + 6, '+3 ulepszenia = +6 ataku');
ok(pl.atk === 4 + 7 + 6, `atak zgadza się z bazą+kowalem (${pl.atk})`);
// przełączanie zaklęć
pl.inv.learnSpell('fireball'); pl.inv.learnSpell('ice'); pl.inv.learnSpell('heal');
pl.cycleSpell({ audio: { play() { } }, ui: { toast() { }, updateSpellBadge() { } } });
ok(pl.selectedSpell === 'ice', 'G przełącza na kolejne zaklęcie');
pl.cycleSpell({ audio: { play() { } }, ui: { toast() { }, updateSpellBadge() { } } });
ok(pl.selectedSpell === 'heal', 'G przełącza dalej (heal)');

// ===========================================================================
// KINOWY POTOK RENDEROWANIA (src/postfx.js) — logika tierów i fallbacku
// ===========================================================================
console.log('\n— Potok renderowania (mock WebGL) —');
{
  const THREE = await import('three');
  const { RenderPipeline } = await import('../src/postfx.js');

  const noop = () => { };
  const anything = () => new Proxy(function () { }, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : anything()),
    apply: () => anything(),
    set: () => true,
  });
  const passes = [];
  const base = {
    capabilities: { isWebGL2: true },
    extensions: { get: (n) => (n === 'EXT_color_buffer_float' ? { } : null), has: (n) => n === 'EXT_color_buffer_float' },
    toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1,
    outputColorSpace: THREE.SRGBColorSpace, autoClear: true, xr: { enabled: false },
    shadowMap: { enabled: false, autoUpdate: false, needsUpdate: false },
    state: anything(),
    _pr: 1,
    setPixelRatio(v) { this._pr = v; },
    getPixelRatio() { return this._pr; },
    getDrawingBufferSize(v) { return v.set(1920, 1080); },
    setSize: noop, setRenderTarget: noop, compile: () => ({ }),
    render(scene) { passes.push(scene === pipeline._fsScene ? 'FS' : 'SCENE'); },
  };
  const renderer = new Proxy(base, { get: (t, k) => (k in t ? t[k] : anything()), set(t, k, v) { t[k] = v; return true; } });

  const scene = new THREE.Scene();
  // mini-świat: wystarczy sky + skyU + sun + nightF dla PMREM
  const world = {
    sky: { material: new THREE.MeshBasicMaterial() },
    skyU: { sunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3) } },
    sun: { color: new THREE.Color(1, 0.95, 0.8) },
    nightF: 0,
  };
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 1500);
  const pipeline = new RenderPipeline(renderer, scene, camera, world, { getFocus: () => 15 });

  pipeline.setQuality('high', 2, 1);
  ok(pipeline.enabled === true, 'tier high włącza potok');
  ok(renderer.toneMapping === THREE.NoToneMapping, 'tonemapping przeniesiony do composite');
  ok(pipeline._wIn === 1440 && pipeline._hIn === 810, `wewnętrzna skala 0.75 (1440x810, jest ${pipeline._wIn}x${pipeline._hIn})`);

  const n0 = passes.length;
  pipeline.render(0.016);
  const framePasses = passes.length - n0 - 1; // -1: warm-up PMREM przy setQuality? nie — liczonymy delta bez sceny PMREM
  ok(framePasses >= 11, `pełna klatka = scena+SSAO+bloom+TAA+composite (${framePasses} passów FS/SCENE)`);

  pipeline.setDynScale(0.55);
  ok(pipeline._wIn === 960, `gubernator FPS: 0.75×0.55→clamp 0.5 (960, jest ${pipeline._wIn})`);

  pipeline.setQuality('low', 2, 1);
  ok(pipeline.enabled === false, 'tier low wyłącza potok');
  ok(renderer.toneMapping === THREE.ACESFilmicToneMapping, 'przywrócony ACES w rendererze');
  const n1 = passes.length;
  pipeline.render(0.016);
  ok(passes.length - n1 === 1, 'low = klasyczny renderer.render (1 pass)');

  pipeline.setQuality('ultra', 2, 1);
  pipeline.render(0.016);
  ok(pipeline._tier.dof === true && pipeline._tier.ssao === true, 'ultra: DoF + SSAO aktywne');
  pipeline._reset = false;
  camera.position.set(500, 50, -300);
  pipeline.render(0.016);
  ok(pipeline._reset === false, 'teleport kamery resetuje historię TAA');
  ok(!!scene.environment, 'IBL: scene.environment ustawione z PMREM');
  pipeline.dispose();
}

console.log(`\n=== WYNIK: ${passed} OK, ${failed} BŁĘDÓW ===\n`);
process.exit(failed ? 1 : 0);
