// Zadania główne i poboczne.
export const QUESTS = {
  q1_audience: {
    name: 'Audiencja u króla', type: 'main', giver: 'king',
    desc: 'Król Aldric wzywa Cię do sali tronowej. Udaj się do zamku na północy królestwa i porozmawiaj z władcą.',
    objective: { kind: 'talk', target: 'king', label: 'Porozmawiaj z królem Aldrikiem' },
    reward: { gold: 60, xp: 40, items: [] },
    requires: [],
  },
  q2_herbs: {
    name: 'Zioła dla czarodzieja', type: 'main', giver: 'wizard',
    desc: 'Mędrzec Eldrin potrzebuje 5 księżycowych ziół z Magicznego Lasu (na wschodzie). Uważaj na wilki! W nagrodę otrzymasz Amulet Ognia.',
    objective: { kind: 'collect', target: 'herb_moon', count: 5, turnIn: 'wizard', label: 'Zbierz księżycowe zioła' },
    reward: { gold: 80, xp: 80, items: ['amulet_fire'] },
    requires: ['q1_audience'],
  },
  q3_wolves: {
    name: 'Wilki w lesie', type: 'main', giver: 'villager_marta',
    desc: 'Marta, mieszkanka królestwa, błaga o pomoc: wilki z Magicznego Lasu atakują podróżnych. Pokonaj 4 wilki i wróć do Marty.',
    objective: { kind: 'kill', target: 'wolf', count: 4, turnIn: 'villager_marta', label: 'Pokonaj wilki' },
    reward: { gold: 120, xp: 100, items: ['potion_b'] },
    requires: ['q1_audience'],
  },
  q4_goblins: {
    name: 'Goblińska plaga', type: 'main', giver: 'king',
    desc: 'Gobliny z Gór Mglistych (na północy) napadają na karawany. Król rozkazuje: pokonaj 6 goblinów w górach i zamelduj się na zamku.',
    objective: { kind: 'kill', target: 'goblin', count: 6, turnIn: 'king', label: 'Pokonaj gobliny w górach' },
    reward: { gold: 180, xp: 150, items: ['sword_steel'] },
    requires: ['q2_herbs', 'q3_wolves'],
  },
  q5_crystal: {
    name: 'Kryształ Królewski', type: 'main', giver: 'king',
    desc: 'W Mrocznej Jaskini (na zachodzie) czai się Kamienny Golem strzegący Kryształu Królewskiego. Weź pochodnię, pokonaj golema i przynieś relikwię.',
    objective: { kind: 'boss', target: 'golem', count: 1, turnIn: 'king', label: 'Zdobądź Kryształ Królewski', needItem: 'royal_crystal' },
    reward: { gold: 300, xp: 250, items: ['armor_chain'] },
    requires: ['q4_goblins'],
  },
  q6_finale: {
    name: 'Bohater królestwa', type: 'main', giver: 'king',
    desc: 'Królestwo jest bezpieczne! Staw się przed królem po nagrodę i tytuł.',
    objective: { kind: 'talk', target: 'king', label: 'Odbierz nagrodę od króla' },
    reward: { gold: 200, xp: 200, items: ['amulet_wind'] },
    requires: ['q5_crystal'],
  },
  q7_ruins: {
    name: 'Cienie w ruinach', type: 'main', giver: 'king',
    desc: 'W Zapomnianych Ruinach na południowym wschodzie powstały szkielety. Król rozkazuje: zniszcz 5 szkieletów i zamelduj się na zamku.',
    objective: { kind: 'kill', target: 'skeleton', count: 5, turnIn: 'king', label: 'Zniszcz szkielety w ruinach' },
    reward: { gold: 220, xp: 200, items: ['amulet_stone'] },
    requires: ['q6_finale'],
  },
  q8_darkknight: {
    name: 'Mroczny Rycerz', type: 'main', giver: 'king',
    desc: 'Na Szczycie Zguby (najwyższy szczyt Gór Mglistych) stanął Mroczny Rycerz, władca szkieletów. Pokonaj go w uczciwej walce i przynieś królowi wieść o zwycięstwie. To Twoja ostateczna próba!',
    objective: { kind: 'special', target: 'darkknight_dead', count: 1, turnIn: 'king', label: 'Pokonaj Mrocznego Rycerza' },
    reward: { gold: 400, xp: 350, items: ['sword_knight'] },
    requires: ['q7_ruins'],
  },
  q9_swamp: {
    name: 'Duchy z bagien', type: 'main', giver: 'king',
    desc: 'Po upadku Mrocznego Rycerza jego moc uciekła na Mroczne Bagna (na południowym zachodzie) i przybrała postać Duchów Bagien. Pokonaj 4 duchy, a potem zapytaj czarownicę Morwenę o rytuał oczyszczenia.',
    objective: { kind: 'kill', target: 'wraith', count: 4, turnIn: 'morwena', label: 'Rozprosz Duchy Bagien' },
    reward: { gold: 500, xp: 420, items: ['amulet_swamp'] },
    requires: ['q8_darkknight'],
  },
  // ---- POBOCZNE ----
  s1_meat: {
    name: 'Dziczyzna dla karczmy', type: 'side', giver: 'innkeeper',
    desc: 'Karczmarz Berta potrzebuje 3 porcji dzikiego mięsa. Upoluj jelenie na łąkach i przynieś mięso do karczmy.',
    objective: { kind: 'collect', target: 'venison', count: 3, turnIn: 'innkeeper', label: 'Zdobądź dzikie mięso' },
    reward: { gold: 90, xp: 60, items: ['meal', 'meal'] },
    requires: [],
  },
  s2_sheep: {
    name: 'Zaginiona owca', type: 'side', giver: 'farmer',
    desc: 'Farma na południu zgubiła owcę — uciekła na łąkę na wschód od farmy. Znajdź ją i przyprowadź (podejdź i pogłaskaj).',
    objective: { kind: 'special', target: 'lost_sheep', count: 1, turnIn: 'farmer', label: 'Znajdź zaginioną owcę' },
    reward: { gold: 70, xp: 50, items: ['potion_s', 'potion_s'] },
    requires: [],
  },
  s3_steel: {
    name: 'Stalowe zamówienie', type: 'side', giver: 'blacksmith',
    desc: 'Kowal Grimm potrzebuje 4 odłamków kryształu z jaskini, by wykuć wyjątkowe ostrze. Przynieś mu je.',
    objective: { kind: 'collect', target: 'crystal_shard', count: 4, turnIn: 'blacksmith', label: 'Zbierz odłamki kryształu' },
    reward: { gold: 150, xp: 90, items: ['sword_iron'] },
    requires: ['q1_audience'],
  },
  s4_herbs: {
    name: 'Zapas ziół', type: 'side', giver: 'wizard',
    desc: 'Eldrin szykuje eliksiry na zimę i potrzebuje 6 słonecznych ziół z łąk na południu. Przynieś mu je do wieży.',
    objective: { kind: 'collect', target: 'herb_sun', count: 6, turnIn: 'wizard', label: 'Zbierz słoneczne zioła' },
    reward: { gold: 100, xp: 70, items: ['potion_b', 'potion_b'] },
    requires: ['q2_herbs'],
  },
  s5_boars: {
    name: 'Dziki szkodniki', type: 'side', giver: 'farmer',
    desc: 'Dziki rozkopują pole Jona! Przepędź je na zawsze — upoluj 3 dziki w dziczy i wróć na farmę.',
    objective: { kind: 'kill', target: 'boar', count: 3, turnIn: 'farmer', label: 'Upoluj dziki' },
    reward: { gold: 110, xp: 80, items: ['meal', 'meal'] },
    requires: [],
  },
  s6_letter: {
    name: 'List do Aldony', type: 'side', giver: 'miller',
    desc: 'Młynarz Piotr napisał list do kupczyni Aldony na rynku. Zanieś go jej — to pilne i… osobiste.',
    objective: { kind: 'talk', target: 'merchant_aldona', label: 'Doręcz list Aldonie' },
    reward: { gold: 60, xp: 40, items: ['bread', 'bread'] },
    requires: ['q1_audience'],
  },
  s7_herbs: {
    name: 'Zioła czarownicy', type: 'side', giver: 'morwena',
    desc: 'Morwena szykuje wielki wywar i potrzebuje 5 bagiennych ziół. Rosną na bagnie wokół rozlewiska — uważaj na duchy!',
    objective: { kind: 'collect', target: 'swamp_herb', count: 5, turnIn: 'morwena', label: 'Zbierz bagienne ziele' },
    reward: { gold: 160, xp: 120, items: ['potion_xl', 'potion_xl'] },
    requires: [],
  },
  s8_fishing: {
    name: 'Spokojne wędkowanie', type: 'side', giver: 'miller',
    desc: 'Młynarz Piotr marzy o świeżej rybie na obiad. Kup wędkę u Aldony, stań nad wodą (fosa, staw w lesie albo bagno) i złów 3 ryby. Naciśnij E, gdy ryba bierze!',
    objective: { kind: 'special', target: 'fish_caught', count: 3, turnIn: 'miller', label: 'Złów ryby' },
    reward: { gold: 150, xp: 100, items: ['meal', 'meal', 'bread'] },
    requires: [],
  },
};

export class QuestManager {
  constructor(game) {
    this.game = game;
    this.state = {}; // id -> { status, count }
    for (const id of Object.keys(QUESTS)) this.state[id] = { status: 'locked', count: 0 };
    this.tracked = null;
    this.refresh();
  }

  refresh() {
    for (const [id, q] of Object.entries(QUESTS)) {
      const s = this.state[id];
      if (s.status === 'done') continue;
      const ready = q.requires.every((r) => this.state[r]?.status === 'done');
      if (ready && s.status === 'locked') {
        s.status = 'available';
        if (q.type === 'main' && !this.tracked) this.tracked = id;
      }
    }
    if (!this.tracked || this.state[this.tracked].status === 'done') {
      const next = Object.keys(QUESTS).find((id) =>
        this.state[id].status === 'active' || this.state[id].status === 'turnin');
      this.tracked = next || Object.keys(QUESTS).find((id) => this.state[id].status === 'available') || null;
    }
    this.game?.ui?.refreshQuestMarkers?.();
  }

  accept(id) {
    const s = this.state[id];
    if (!s || s.status !== 'available') return false;
    s.status = 'active'; s.count = 0;
    // przelicz postęp dla zbieractwa (gracz mógł mieć przedmioty wcześniej)
    const obj = QUESTS[id].objective;
    if (obj.kind === 'collect') {
      s.count = Math.min(obj.count, this.game.player.inv.count(obj.target));
      if (s.count >= obj.count) s.status = 'turnin';
    }
    if (obj.needItem && this.game.player.inv.has(obj.needItem)) {
      s.count = obj.count || 1;
      s.status = 'turnin';
    }
    this.tracked = id;
    this.game.audio.play('quest');
    this.game.ui.toast(`Nowe zadanie: ${QUESTS[id].name}`, 'quest');
    this.game.ui.refreshQuestMarkers();
    return true;
  }

  progressText(id) {
    const q = QUESTS[id], s = this.state[id];
    const o = q.objective;
    if (s.status === 'done') return 'Ukończone ✓';
    if (s.status === 'available') return 'Dostępne u: ' + this.game.npcs.nameOf(q.giver);
    if (s.status === 'turnin') return 'Wróć do: ' + this.game.npcs.nameOf(o.turnIn || o.target);
    if (o.kind === 'kill' || o.kind === 'collect' || o.kind === 'boss' || o.kind === 'special')
      return `${o.label}: ${s.count}/${o.count}`;
    return o.label;
  }

  onTalk(npcId) {
    let changed = false;
    for (const [id, q] of Object.entries(QUESTS)) {
      const s = this.state[id];
      if (s.status === 'active' && q.objective.kind === 'talk' && q.objective.target === npcId) {
        this.complete(id); changed = true;
      }
    }
    if (changed) this.refresh();
  }

  onCollect(itemId) {
    for (const [id, q] of Object.entries(QUESTS)) {
      const s = this.state[id];
      const o = q.objective;
      if (s.status === 'active' && o.kind === 'collect' && o.target === itemId) {
        s.count = Math.min(o.count, this.game.player.inv.count(itemId));
        if (s.count >= o.count) {
          s.status = 'turnin';
          this.game.audio.play('questDone');
          this.game.ui.toast(`Zadanie „${q.name}” — wróć do ${this.game.npcs.nameOf(o.turnIn)}!`, 'quest');
        }
        this.game.ui.refreshQuestMarkers();
      }
    }
  }

  onKill(kind) {
    if (this.game.onBountyKill) this.game.onBountyKill(kind);
    for (const [id, q] of Object.entries(QUESTS)) {
      const s = this.state[id];
      const o = q.objective;
      if (s.status === 'active' && o.kind === 'kill' && o.target === kind) {
        s.count = Math.min(o.count, s.count + 1);
        this.game.ui.toast(`${q.name}: ${s.count}/${o.count}`);
        if (s.count >= o.count) {
          s.status = 'turnin';
          this.game.audio.play('questDone');
          this.game.ui.toast(`Zadanie „${q.name}” — wróć do ${this.game.npcs.nameOf(o.turnIn)}!`, 'quest');
        }
        this.game.ui.refreshQuestMarkers();
      }
      // boss daje przedmiot — sprawdzenie przy odbiorze
      if (s.status === 'active' && o.kind === 'boss' && kind === o.target) {
        this.game.ui.refreshQuestMarkers();
      }
    }
  }

  onSpecial(flag) {
    for (const [id, q] of Object.entries(QUESTS)) {
      const s = this.state[id];
      const o = q.objective;
      if (s.status === 'active' && o.kind === 'special' && o.target === flag) {
        const need = o.count || 1;
        s.count = Math.min(need, s.count + 1);
        if (s.count >= need) {
          s.status = 'turnin';
          this.game.audio.play('questDone');
          this.game.ui.toast(`Zadanie „${q.name}” — wróć do ${this.game.npcs.nameOf(o.turnIn)}!`, 'quest');
        } else {
          this.game.ui.toast(`${q.name}: ${s.count}/${need}`);
        }
        this.game.ui.refreshQuestMarkers();
      }
    }
  }

  canTurnIn(id, npcId) {
    const q = QUESTS[id], s = this.state[id];
    if (!q || s.status !== 'turnin') return false;
    const o = q.objective;
    if ((o.turnIn || o.target) !== npcId) return false;
    if (o.needItem && !this.game.player.inv.has(o.needItem)) return false;
    return true;
  }

  turnIn(id) {
    const q = QUESTS[id], s = this.state[id];
    if (!q || s.status !== 'turnin') return false;
    const o = q.objective;
    const p = this.game.player;
    // zabierz przedmioty
    if (o.kind === 'collect') p.inv.remove(o.target, o.count);
    if (o.needItem) p.inv.remove(o.needItem, 1);
    // nagrody
    if (q.reward.gold) p.addGold(q.reward.gold);
    if (q.reward.xp) p.addXp(q.reward.xp);
    for (const it of q.reward.items || []) p.inv.add(it);
    s.status = 'done';
    this.game.audio.play('win');
    this.game.ui.toast(`Ukończono: ${q.name}! +${q.reward.gold} zł`, 'quest');
    this.refresh();
    this.game.achv?.onQuestDone(id);
    if (id === 'q6_finale') this.game.onFinale();
    if (id === 'q8_darkknight') this.game.onFinale(true);
    this.game.save();
    return true;
  }

  complete(id) { // zadania typu talk / natychmiastowe
    const q = QUESTS[id];
    const p = this.game.player;
    if (q.reward.gold) p.addGold(q.reward.gold);
    if (q.reward.xp) p.addXp(q.reward.xp);
    for (const it of q.reward.items || []) p.inv.add(it);
    this.state[id].status = 'done';
    this.game.audio.play('win');
    this.game.ui.toast(`Ukończono: ${q.name}! +${q.reward.gold} zł`, 'quest');
    this.game.achv?.onQuestDone(id);
    this.game.save();
  }

  // Markery nad NPC: '!' dostępne, '?' do oddania, '…' aktywne u zleceniodawcy
  markerFor(npcId) {
    let mark = null;
    for (const [id, q] of Object.entries(QUESTS)) {
      const s = this.state[id];
      const o = q.objective;
      if (s.status === 'available' && q.giver === npcId) mark = '!';
      if (s.status === 'turnin' && (o.turnIn || o.target) === npcId) return '?';
      if (s.status === 'active' && q.giver === npcId && o.kind !== 'talk') mark = mark || '…';
      if (s.status === 'active' && o.kind === 'talk' && o.target === npcId) return '?';
    }
    return mark;
  }

  serialize() { return { state: this.state, tracked: this.tracked }; }
  deserialize(d) {
    if (!d) return;
    for (const [id, s] of Object.entries(d.state || {})) {
      if (this.state[id]) this.state[id] = s;
    }
    this.tracked = d.tracked || null;
    this.refresh();
  }
}
