// Przedmioty, ekwipunek, sklepy.
export const ITEMS = {
  // --- BRONIE ---
  sword_rusty:   { name: 'Zardzewiały miecz', icon: '🗡️', type: 'weapon', price: 10,  desc: 'Stary miecz. Atak +3.', stats: { atk: 3 } },
  sword_iron:    { name: 'Żelazny miecz', icon: '⚔️', type: 'weapon', price: 120, desc: 'Solidna robota kowala. Atak +7.', stats: { atk: 7 } },
  sword_steel:   { name: 'Stalowy miecz', icon: '⚔️', type: 'weapon', price: 320, desc: 'Ostry jak brzytwa. Atak +12.', stats: { atk: 12 } },
  sword_knight:  { name: 'Ostrze Rycerza', icon: '🏵️', type: 'weapon', price: 700, desc: 'Legendarna klinga. Atak +20.', stats: { atk: 20 } },
  crossbow:      { name: 'Kusza myśliwska', icon: '🏹', type: 'weapon', price: 380, desc: 'Strzela bełtami na odległość. Atak +10.', stats: { atk: 10 }, ranged: true },
  staff_apprentice: { name: 'Kostur ucznia', icon: '🪄', type: 'weapon', price: 260, desc: 'Wzmacnia magię. Atak +5, zaklęcia +50%.', stats: { atk: 5, spellPower: 0.5 } },
  club_goblin:   { name: 'Goblińska pałka', icon: '🦴', type: 'weapon', price: 35,  desc: 'Prymitywna, ale skuteczna. Atak +5.', stats: { atk: 5 } },
  // --- ZB BROJE ---
  armor_cloth:   { name: 'Lniana tunika', icon: '🥋', type: 'armor', price: 15,  desc: 'Lepsze niż nic. Obrona +1.', stats: { def: 1 } },
  armor_leather: { name: 'Skórzana zbroja', icon: '🦺', type: 'armor', price: 140, desc: 'Lekka i wytrzymała. Obrona +4.', stats: { def: 4 } },
  armor_chain:   { name: 'Kolczuga', icon: '⛓️', type: 'armor', price: 360, desc: 'Kolcza ochrona. Obrona +8, +20 zdrowia.', stats: { def: 8, hp: 20 } },
  armor_plate:   { name: 'Płytowa zbroja', icon: '🛡️', type: 'armor', price: 750, desc: 'Królewska zbroja. Obrona +14, +50 zdrowia.', stats: { def: 14, hp: 50 } },
  // --- AMULETY ---
  amulet_fire:   { name: 'Amulet Ognia', icon: '🔥', type: 'amulet', price: 220, desc: 'Dar czarodzieja. Atak +5.', stats: { atk: 5 } },
  amulet_forest: { name: 'Amulet Lasu', icon: '🍀', type: 'amulet', price: 200, desc: 'Regeneruje 1 HP / 2 s.', stats: { regen: 0.5 } },
  amulet_stone:  { name: 'Kamienny amulet', icon: '🪨', type: 'amulet', price: 200, desc: 'Obrona +5.', stats: { def: 5 } },
  amulet_wind:   { name: 'Amulet Wiatru', icon: '🌪️', type: 'amulet', price: 260, desc: 'Szybkość ruchu +20%.', stats: { speed: 0.2 } },
  // --- NARZĘDZIA / PRZYDATNE ---
  torch:      { name: 'Pochodnia', icon: '🕯️', type: 'tool', price: 25, desc: 'Niezbędna w jaskini. Klawisz T, aby zapalić.', unique: true },
  map:        { name: 'Mapa królestwa', icon: '🗺️', type: 'tool', price: 60, desc: 'Odkrywa wszystkie oznaczenia na minimapie.', unique: true },
  rope:       { name: 'Lina', icon: '🪢', type: 'material', price: 12, desc: 'Mocna konopna lina. Może się przydać.' },
  lockpick:   { name: 'Wytrych', icon: '🗝️', type: 'material', price: 40, desc: 'Otwiera zamki… dyskretnie.' },
  // --- JEDZENIE / MIKSTURY ---
  meal:       { name: 'Prowiant', icon: '🍖', type: 'consumable', price: 15, desc: 'Sycący posiłek. +40 HP.', heal: 40, use: 'eat' },
  bread:      { name: 'Chleb', icon: '🍞', type: 'consumable', price: 6, desc: 'Świeży bochenek. +15 HP.', heal: 15, use: 'eat' },
  potion_s:   { name: 'Mała mikstura', icon: '🧪', type: 'consumable', price: 30, desc: 'Leczy 50 HP.', heal: 50, use: 'potion' },
  potion_b:   { name: 'Duża mikstura', icon: '⚗️', type: 'consumable', price: 80, desc: 'Leczy 120 HP.', heal: 120, use: 'potion' },
  venison:    { name: 'Dzikie mięso', icon: '🥩', type: 'material', price: 10, desc: 'Z upolowanych jeleni. Karczmarz je odkupi.' },
  wolf_pelt:  { name: 'Skóra wilka', icon: '🐺', type: 'material', price: 18, desc: 'Cenna u kupców.' },
  goblin_ear: { name: 'Ucho goblina', icon: '👂', type: 'material', price: 8, desc: 'Dowód zwycięstwa. Król je skupuje.' },
  // --- MAGIA ---
  herb_moon:   { name: 'Księżycowe ziele', icon: '🌿', type: 'material', price: 20, desc: 'Magiczne ziele z lasu. Czarodziej go potrzebuje.' },
  herb_sun:    { name: 'Słonecznikowe ziele', icon: '🌻', type: 'material', price: 14, desc: 'Składnik mikstur.' },
  spell_fire:  { name: 'Księga: Kula Ognia', icon: '📕', type: 'spell', price: 300, desc: 'Uczy zaklęcia. Klawisz F miota ogniem.', spell: 'fireball', unique: true },
  spell_heal:  { name: 'Księga: Leczenie', icon: '📗', type: 'spell', price: 350, desc: 'Uczy zaklęcia leczenia ran.', spell: 'heal', unique: true },
  crystal_shard: { name: 'Odłamek kryształu', icon: '💎', type: 'material', price: 45, desc: 'Magiczny odłamek z jaskini.' },
  royal_crystal: { name: 'Kryształ Królewski', icon: '👑', type: 'quest', price: 0, desc: 'Relikwia korony. Zanieś ją królowi!', unique: true },
};

export const SHOPS = {
  merchant_aldona: {
    name: 'Stragan Aldony', desc: '„Mapy, pochodnie, liny — wszystko dla podróżnika!”',
    items: ['map', 'torch', 'rope', 'lockpick', 'bread', 'herb_sun'],
  },
  merchant_boran: {
    name: 'Stragan Borana', desc: '„Mikstury i prowiant na drogę!”',
    items: ['potion_s', 'potion_b', 'meal', 'bread', 'torch'],
  },
  forge: {
    name: 'Kuźnia Grimma', desc: '„Broń i zbroje kute w ogniu. Najlepsze w królestwie!”',
    items: ['sword_iron', 'sword_steel', 'sword_knight', 'crossbow', 'armor_leather', 'armor_chain', 'armor_plate'],
  },
  wizard: {
    name: 'Wieża Czarodzieja', desc: '„Mikstury, amulety i zaklęcia dla godnych.”',
    items: ['potion_b', 'amulet_fire', 'amulet_forest', 'amulet_stone', 'amulet_wind', 'staff_apprentice', 'spell_fire', 'spell_heal'],
  },
  tavern: {
    name: 'Karczma „Złoty Kufel”', desc: '„Zjedz, odpocznij, zregeneruj siły!”',
    items: ['meal', 'bread', 'potion_s'],
  },
  stable: {
    name: 'Stajnia', desc: '„Wierzchowiec dla rycerza? Tylko najlepsze konie!”',
    items: [], // koń kupowany specjalną opcją dialogową
    horsePrice: 250,
  },
};

export class Inventory {
  constructor() {
    this.items = {};       // id -> liczba
    this.equipment = { weapon: null, armor: null, amulet: null };
    this.spells = [];      // odblokowane zaklęcia
    this.hasHorse = false;
    this.hasMap = false;
    this.hasTorch = false;
  }

  add(id, n = 1) {
    const def = ITEMS[id];
    if (!def) return;
    if (def.unique && this.count(id) > 0) return;
    this.items[id] = (this.items[id] || 0) + n;
    if (id === 'map') this.hasMap = true;
    if (id === 'torch') this.hasTorch = true;
  }

  remove(id, n = 1) {
    if (!this.items[id]) return false;
    this.items[id] -= n;
    if (this.items[id] <= 0) {
      delete this.items[id];
      for (const slot of Object.keys(this.equipment)) {
        if (this.equipment[slot] === id) this.equipment[slot] = null;
      }
    }
    return true;
  }

  count(id) { return this.items[id] || 0; }
  has(id, n = 1) { return this.count(id) >= n; }

  equip(id) {
    const def = ITEMS[id];
    if (!def || !this.has(id)) return false;
    const slot = def.type;
    if (!['weapon', 'armor', 'amulet'].includes(slot)) return false;
    this.equipment[slot] = id;
    return true;
  }

  unequip(slot) { this.equipment[slot] = null; }
  equipped(slot) { return this.equipment[slot]; }

  learnSpell(spell) { if (!this.spells.includes(spell)) this.spells.push(spell); }

  bonus() {
    const b = { atk: 0, def: 0, hp: 0, regen: 0, speed: 0, spellPower: 0 };
    for (const slot of Object.keys(this.equipment)) {
      const id = this.equipment[slot];
      if (!id) continue;
      const st = ITEMS[id].stats || {};
      for (const k of Object.keys(b)) b[k] += st[k] || 0;
    }
    return b;
  }

  serialize() {
    return { items: this.items, equipment: this.equipment, spells: this.spells, hasHorse: this.hasHorse, hasMap: this.hasMap, hasTorch: this.hasTorch };
  }
  deserialize(d) {
    if (!d) return;
    this.items = d.items || {};
    this.equipment = d.equipment || { weapon: null, armor: null, amulet: null };
    this.spells = d.spells || [];
    this.hasHorse = !!d.hasHorse; this.hasMap = !!d.hasMap; this.hasTorch = !!d.hasTorch;
  }
}
