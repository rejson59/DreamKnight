export const ITEMS = {
  copper_sword: { name: 'Miedziany miecz', icon: '🗡️', desc: 'Podstawowa broń rycerza. Zadaje 12 obrażeń.', price: 0, type: 'weapon', dmg: 12 },
  iron_sword: { name: 'Żelazny miecz', icon: '⚔️', desc: 'Kuty królewski miecz. Zadaje 24 obrażenia.', price: 120, type: 'weapon', dmg: 24 },
  steel_sword: { name: 'Stalowy miecz', icon: '⚔️', desc: 'Wybijany w kuźni, niezwykle ostry. 40 obrażeń.', price: 320, type: 'weapon', dmg: 40 },
  crossbow: { name: 'Kusza', icon: '🏹', desc: 'Zadaje 30 obrażeń z daleka.', price: 260, type: 'weapon', dmg: 30, ranged: true },
  chain_armor: { name: 'Kolczuga', icon: '🛡️', desc: 'Zmniejsza otrzymywane obrażenia.', price: 300, type: 'armor', armor: 12 },
  leather_armor: { name: 'Skórzany pancerz', icon: '🛡️', desc: 'Lekki pancerz z 4 pkt. ochrony.', price: 80, type: 'armor', armor: 4 },
  amulet: { name: 'Amulet mądrego', icon: '📿', desc: '+40 maksymalnego zdrowia.', price: 250, type: 'amulet', hp: 40 },
  map: { name: 'Mapa królestwa', icon: '🗺️', desc: 'Odblokowuje pełną mapę i znaczniki zadań.', price: 30, type: 'map' },
  torch: { name: 'Pochodnia', icon: '🔥', desc: 'Oświetla drogę w jaskini i magii.', price: 15, type: 'torch' },
  potion: { name: 'Mikstura zdrowia', icon: '🧪', desc: 'Przywraca 50 zdrowia.', price: 25, type: 'potion', hp: 50 },
  stamina_potion: { name: 'Mikstura energii', icon: '💧', desc: 'Przywraca pełną energię.', price: 18, type: 'potion', stam: 100 },
  magic_potion: { name: 'Mikstura czarów', icon: '✨', desc: 'Zwiększa obrażenia na 20 sekund.', price: 45, type: 'potion', buff: true },
  herb: { name: 'Ziele z magicznego lasu', icon: '🌿', desc: 'Cenną roślina dla czarodzieja.', price: 0, type: 'quest' },
  horse: { name: 'Wiśniowy rumak', icon: '🐎', desc: 'Kup w stajni — szybka podróż poza murami.', price: 200, type: 'mount' },
  spell: { name: 'Zaklęcie ognia', icon: '🔮', desc: 'Rzuca ognistą kulę na wroga.', price: 180, type: 'spell' },
  flower: { name: 'Złoty kwiat', icon: '🌸', desc: 'Rzadki kwiat z łąk.', price: 0, type: 'misc' },
  goblin_ear: { name: 'Trofeum goblina', icon: '👂', desc: 'Dowód patrolu wykonanego w górach.', price: 0, type: 'quest' },
  crystal: { name: 'Kryształ jaskini', icon: '💎', desc: 'Świecący kamień z jaskini.', price: 0, type: 'misc' },
};

export const NPC_DATA = {
  king: {
    id: 'king', name: 'Król Aldric', role: 'Władca Królestwa',
    pos: [-2, 0, -72], color: 0x9b2333, hair: 0xd6c9b3,
    greeting: 'Witaj, mój rycerzu! Królestwo czeka na twoje czyny.',
    dialogues: [
      { id: 'greet', label: 'Rozmowa', text: 'Słyszałem o goblinach w górach i dziwnych stworach w magicznym lesie. Zadbaj o bezpieczeństwo mojego ludu.' },
      { id: 'quest_king', label: '📜 Misja', text: 'Wykonaj zadania królestwa: porozmawiaj z czarodziejem, kup pochodnię, patroluj gobliny i wróć z meldunkiem.' },
      { id: 'thanks', label: 'Meldunek', text: 'Twoje czyny sławią królestwo. Na znak uznania daję ci 100 złota.' }
    ]
  },
  merchant: {
    id: 'merchant', name: 'Kupiec Tamas', role: 'Handlarz',
    pos: [12, 0, 0], color: 0x4a7ba6, hair: 0x3b2f22,
    greeting: 'Zapraszam, rycerzu! Najlepszy towar na rynku.',
    dialogues: [
      { id: 'greet', label: 'Rozmowa', text: 'Mapy, pochodnie, drobne materiały — wszystko dla dzielnych podróżników.' },
      { id: 'shop', label: '🛒 Kup', text: 'Oto moje towary.' }
    ]
  },
  blacksmith: {
    id: 'blacksmith', name: 'Kowal Bran', role: 'Kowal',
    pos: [28, 0, -8], color: 0x54524f, hair: 0xc0553a,
    greeting: 'Kowalstwo to sztuka! Potrzebujesz ostrza albo pancerza?',
    dialogues: [
      { id: 'greet', label: 'Rozmowa', text: 'Najlepsze klingi w królestwie. Kup miecz, a gobliny będą drżeć.' },
      { id: 'shop', label: '⚒️ Kuźnia', text: 'Wybierz broń lub pancerz.' }
    ]
  },
  stable: {
    id: 'stable', name: 'Stajenny Odo', role: 'Stajennik',
    pos: [34, 0, 16], color: 0x6b7a3a, hair: 0x7a4a2e,
    greeting: 'Tylko dobry koń pozwoli ci przetrwać na pustkowiu.',
    dialogues: [
      { id: 'greet', label: 'Rozmowa', text: 'Kup rumaka, a szybko pokonasz góry i las.' },
      { id: 'shop', label: '🐎 Stajnia', text: 'Wybierz wierzchowca.' }
    ]
  },
  wizard: {
    id: 'wizard', name: 'Czarodziej Maldor', role: 'Mędrzec i przyjaciel rycerza',
    pos: [28, 0, 24], color: 0x3e2a66, hair: 0xe6e6e6,
    greeting: 'Witaj, przyjacielu! Magia jest potężna, ale wymaga ziół.',
    dialogues: [
      { id: 'quest_herb', label: '📜 Misja: Zioła', text: 'Przynieś mi 3 zioła z magicznego lasu, a dam ci darmową miksturę.' },
      { id: 'greet', label: 'Rozmowa', text: 'Las na wschodzie jest pełen magii, ale i niebezpieczeństw. Uważaj na wilki.' },
      { id: 'shop', label: '🔮 Magiczne towary', text: 'Mikstury, amulety, zaklęcia.' }
    ]
  },
  innkeeper: {
    id: 'innkeeper', name: 'Karczmarz Roland', role: 'Właściciel karczmy',
    pos: [-30, 0, 16], color: 0x7a4a2e, hair: 0x2e1b10,
    greeting: 'Witaj w "Pod Złotym Hełmem"! Tylko u mnie odpoczniesz jak rycerz.',
    dialogues: [
      { id: 'greet', label: 'Rozmowa', text: 'Kup prowiant i odpocznij. Dobra miódka przywraca siły.' },
      { id: 'heal', label: '🏨 Odpoczynek (25 zł)', text: 'Przygotuję izbę i świeży posiłek.' },
      { id: 'shop', label: '🍖 Prowiant', text: 'Co podać?' }
    ]
  },
  villager_a: { id: 'villager_a', name: 'Mieszczanka Lidia', role: 'Mieszkanka', pos: [-14, 0, -20], color: 0x9a5f7a, hair: 0xc89b3a, greeting: 'Dzień dobry, rycerzu!', dialogues: [
    { id: 'greet', label: 'Rozmowa', text: 'Nocą słychać wycie z lasu... Dobrze, że królestwo ma ciebie.' }
  ] },
  villager_b: { id: 'villager_b', name: 'Rolnik Jakob', role: 'Mieszkaniec', pos: [14, 0, -24], color: 0x6b7a3a, hair: 0x4e3520, greeting: 'Pomóż nam, jeśli możesz!', dialogues: [
    { id: 'greet', label: 'Rozmowa', text: 'Wilki podchodzą pod pola. W lesie rosną magiczne zioła, ale lepiej tam nie chodzić samotnie.' }
  ] },
  villager_c: { id: 'villager_c', name: 'Kupka Tadeusz', role: 'Mieszkaniec', pos: [-20, 0, 26], color: 0x3a6b57, hair: 0x6b6b6b, greeting: 'Niech bogowie strzegą twego miecza.', dialogues: [
    { id: 'greet', label: 'Rozmowa', text: 'Na północ za murami stoją góry, na wschód magiczny las, a u ich stóp ciemna jaskinia.' }
  ] },
};

export const QUESTS = {
  audience: {
    id: 'audience', title: 'Audiencja u króla', desc: 'Udaj się do sali tronowej w zamku i zamelduj się królowi.',
    objectives: [{ id: 'talk_king', label: 'Porozmawiaj z królem', type: 'talk', target: 'king', count: 1 }],
    reward: 50
  },
  herb: {
    id: 'herb', title: 'Zioła dla Maldora', desc: 'Zbierz 3 magiczne zioła w magicznym lesie i przynieś je czarodziejowi.',
    objectives: [{ id: 'herb', label: 'Zbierz magiczne zioła (0/3)', type: 'item', item: 'herb', target: 3 }],
    reward: 90
  },
  torch: {
    id: 'torch', title: 'Pochodnia przed mrokiem', desc: 'Kup pochodnię u kupca na rynku.',
    objectives: [{ id: 'torch', label: 'Kup pochodnię', type: 'item', item: 'torch', target: 1 }],
    reward: 40
  },
  patrol: {
    id: 'patrol', title: 'Patrol goblinów', desc: 'Pokonaj 6 goblinów w górach i jaskini.',
    objectives: [{ id: 'goblins', label: 'Pokonaj gobliny (0/6)', type: 'kill', target: 'goblin', count: 6 }],
    reward: 150
  },
  wolf: {
    id: 'wolf', title: 'Wilki z lasu', desc: 'Pokonaj 4 wilki w magicznym lesie.',
    objectives: [{ id: 'wolves', label: 'Pokonaj wilki (0/4)', type: 'kill', target: 'wolf', count: 4 }],
    reward: 120
  },
  return_king: {
    id: 'return_king', title: 'Meldunek u króla', desc: 'Wróć do zamku i zamelduj królowi o pokonaniu goblinów i wilków.',
    objectives: [{ id: 'talk_king2', label: 'Zamelduj królowi', type: 'talk', target: 'king', count: 1 }],
    reward: 200,
    requires: ['herb', 'torch', 'patrol', 'wolf']
  }
};

export const SHOP_ITEMS = {
  merchant: ['map', 'torch', 'flower'],
  blacksmith: ['iron_sword', 'steel_sword', 'crossbow', 'chain_armor', 'leather_armor'],
  stable: ['horse'],
  wizard: ['potion', 'stamina_potion', 'magic_potion', 'amulet', 'spell'],
  innkeeper: ['potion', 'stamina_potion'],
};

export const START_ITEMS = ['copper_sword'];
