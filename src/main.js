// Dream Knight — punkt wejścia.
import { Game } from './game.js';
import { detectQuality } from './config.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game-canvas');
const game = new Game(canvas);
window.__game = game; // do debugowania

async function boot() {
  game.ui_showLoading = true;
  const progress = (p, t) => {
    $('loading-screen').classList.remove('hidden');
    $('loading-fill').style.width = `${p}%`;
    $('loading-text').textContent = t;
  };
  try {
    await game.init(progress);
  } catch (err) {
    console.error(err);
    $('loading-text').textContent = 'Błąd ładowania: ' + err.message;
    return;
  }
  $('loading-screen').classList.add('hidden');
  // wybór jakości
  const sel = $('quality');
  const auto = detectQuality();
  game.quality = auto;
  game.autoQuality = true;
  game._autoMax = auto === 'low' ? 'medium' : auto === 'medium' ? 'high' : 'ultra';
  game.applyQuality(auto);
  sel.value = 'auto';
  sel.onchange = () => {
    if (sel.value === 'auto') {
      game.autoQuality = true;
      game.applyQuality(auto);
    } else {
      game.setQuality(sel.value);
    }
  };
  $('btn-new').onclick = () => {
    if (sel.value !== 'auto') game.setQuality(sel.value);
    else { game.autoQuality = true; game.applyQuality(auto); }
    game.newGame();
  };
  $('btn-continue').onclick = () => {
    if (sel.value !== 'auto') game.setQuality(sel.value);
    game.continueGame();
  };
  $('btn-help').onclick = () => $('help-screen').classList.remove('hidden');
  $('btn-help-close').onclick = () => $('help-screen').classList.add('hidden');
  game.ui.showMenu(Game.hasSave());
}

boot();
