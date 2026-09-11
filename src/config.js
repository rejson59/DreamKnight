// Centralna konfiguracja gry Dream Knight
export const SAVE_KEY = 'dreamknight_save_v2';

export const WORLD_SIZE = 640;          // rozmiar terenu (x,z w przedziale ±320)
export const WORLD_HALF = WORLD_SIZE / 2 - 12;
export const KINGDOM_HALF = 80;         // połowa murów królestwa (kwadrat)
export const MOAT_IN = 87;              // wewnętrzna krawędź fosy
export const MOAT_OUT = 107;            // zewnętrzna krawędź fosy
export const WATER_Y = -1.05;           // poziom wody w fosie
export const BRIDGE_HALF = 4.6;         // połowa szerokości mostu (przerwa w fosie)

export const DAY_LENGTH = 480;          // długość pełnej doby w sekundach (8 min)

// Pozycje kluczowe
export const LOC = {
  spawn: { x: 0, z: -30 },
  castleDoor: { x: 0, z: -40 },
  throne: { x: 0, z: -59 },
  knightBed: { x: -22, z: -56 },
  gate: { x: 0, z: 80 },
  bridge: { x: 0, z: 97 },
  fountain: { x: 0, z: 5 },
  forest: { x: 190, z: 40 },
  forestPond: { x: 208, z: 96 },
  stoneCircle: { x: 158, z: -6 },
  goblinCamp: { x: 40, z: -205 },
  caveEntrance: { x: -168, z: 62 },
  caveCenter: { x: -196, z: 62 },
  farm: { x: -44, z: 176 },
  windmill: { x: 62, z: 196 },
  crossroads: { x: 0, z: 150 },
};

export const QUALITY_PRESETS = {
  low: {
    pixelRatio: 1, shadow: 1024, shadows: true, grass: 1500, trees: 0.55,
    antialias: false, clouds: 4, particles: 0.4, viewDistance: 420, waterAnim: true,
  },
  medium: {
    pixelRatio: Math.min(devicePixelRatio || 1, 1.5), shadow: 2048, shadows: true,
    grass: 4500, trees: 0.8, antialias: true, clouds: 7, particles: 0.7,
    viewDistance: 560, waterAnim: true,
  },
  high: {
    pixelRatio: Math.min(devicePixelRatio || 1, 2), shadow: 2048, shadows: true,
    grass: 9000, trees: 1.0, antialias: true, clouds: 10, particles: 1.0,
    viewDistance: 700, waterAnim: true,
  },
  ultra: {
    pixelRatio: Math.min(devicePixelRatio || 1, 2), shadow: 4096, shadows: true,
    grass: 14000, trees: 1.0, antialias: true, clouds: 14, particles: 1.3,
    viewDistance: 850, waterAnim: true,
  },
};

// Automatyczny dobór jakości na podstawie urządzenia
export function detectQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const smallScreen = Math.min(screen.width, screen.height) < 700;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || smallScreen;
  if (isMobile) {
    if (cores <= 4 || mem <= 3) return 'low';
    return 'medium';
  }
  if (cores >= 8 && mem >= 8) return 'high';
  return 'medium';
}

export const ZONE_NAMES = {
  kingdom: 'Królestwo',
  castle: 'Zamek Królewski',
  market: 'Rynek',
  tavern: 'Karczma „Złoty Kufel”',
  farm: 'Farma',
  forest: 'Magiczny Las',
  mountains: 'Góry Mgliste',
  cave: 'Mroczna Jaskinia',
  wild: 'Dzicz',
};
