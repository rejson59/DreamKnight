// Dream Knight — system przerywników filmowych (cutscenki)
// Letterbox + napisy + animowana kamera. Przerywnik blokuje sterowanie
// (game.cutsceneActive) i usypia wrogów. Każdą cutscenkę można pominąć.

import * as THREE from 'three';

// Definicje ujęć: pozycja kamery i punkt patrzenia względem kotwicy (anchor),
// czas trwania, mówiący i tekst.
const SCENES = {
  // Wejście do Zapomnianych Ruin (pierwsze odkrycie)
  ruins: [
    { dur: 3.2, cam: [10, 7, 12], look: [0, 2, 0], who: '', text: 'Zapomniane Ruiny… Tutaj spoczywają ci, którzy służyli Mrocznemu Rycerzowi.' },
    { dur: 3.2, cam: [-9, 4, 8], look: [0, 1, 0], who: 'Głos z ciemności', text: 'Żywy… ŻYWY WKRACZA MIĘDZY UMARŁYCH! Powstańcie, sługi moje!' },
    { dur: 2.6, cam: [0, 9, -11], look: [0, 1, 0], who: '', text: 'Kości zgrzytają. Coś budzi się w mroku. (Znajdź i zniszcz 5 szkieletów!)' },
  ],
  // Prezentacja bossa — Szczyt Zguby
  boss: [
    { dur: 3.0, cam: [14, 6, 0], look: [0, 2, 0], who: '', text: 'Szczyt Zguby. Tron z czarnego żelaza… pusty. Ale zło wisi w powietrzu.' },
    { dur: 3.4, cam: [-6, 3, 13], look: [0, 2, 0], who: 'Mroczny Rycerz', text: 'Kolejny rycerzyk po sławę? Twoje kości zasilą moją armię, jak kości innych głupców!' },
    { dur: 3.0, cam: [0, 10, -14], look: [0, 1, 0], who: '', text: 'Mroczny Rycerz zstępuje z tronu. Nie ma odwrotu — WALCZ!' },
  ],
  // Finał po pokonaniu bossa
  finale: [
    { dur: 3.2, cam: [8, 5, 9], look: [0, 1, 0], who: '', text: 'Mroczny Rycerz rozpada się w proch. Ciemność nad królestwem pierzcha…' },
    { dur: 3.6, cam: [-7, 8, 6], look: [0, 6, 0], who: '', text: 'Słońce wschodzi nad Dream Knight. Ludzie wychodzą z domów i wiwatują!' },
    { dur: 3.4, cam: [0, 4, 12], look: [0, 1.5, 0], who: 'Król', text: 'Rycerzu! Twe imię będzie śpiewane przez pokolenia. Królestwo jest wolne!' },
  ],
  // Intro po starcie nowej gry
  intro: [
    { dur: 3.4, cam: [26, 14, 30], look: [0, 4, 0], who: '', text: 'Królestwo Dream Knight… kraina pól, lasów i wysokich gór.' },
    { dur: 3.4, cam: [-24, 10, 18], look: [0, 3, 0], who: '', text: 'Lecz cień Mrocznego Rycerza rośnie na wschodzie. Szkielety powstają z grobów…' },
    { dur: 3.2, cam: [0, 6, -22], look: [0, 2, 0], who: '', text: 'Młody rycerz przybywa pod bramy miasta. Legenda właśnie się zaczyna. (Idź do króla!)' },
  ],
};

export class CutsceneManager {
  constructor(game) {
    this.game = game;
    this.active = null;      // { id, shots, i, t, anchor, onDone }
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._look = new THREE.Vector3();
  }

  get isActive() { return !!this.active; }

  has(id) { return !!SCENES[id]; }

  play(id, { anchor = null, onDone = null } = {}) {
    const shots = SCENES[id];
    if (!shots || this.active) return false;
    const g = this.game;
    // Kotwica: podana pozycja albo pozycja gracza
    const a = anchor ? anchor.clone() : g.player.group.position.clone();
    this.active = { id, shots, i: -1, t: 0, anchor: a, onDone, camFrom: new THREE.Vector3(), lookFrom: new THREE.Vector3() };
    g.cutsceneActive = true;
    this._prevUi = g.input.uiOpen;
    g.input.uiOpen = true;
    g.ui?.letterbox(true);
    g.audio?.play('cutscene');
    this._nextShot();
    return true;
  }

  _nextShot() {
    const c = this.active;
    c.i++;
    if (c.i >= c.shots.length) { this.stop(true); return; }
    c.t = 0;
    const cam = this.game.camera;
    c.camFrom.copy(cam.position);
    c.lookFrom.copy(this._look.lengthSq() ? this._look : c.anchor);
    const s = c.shots[c.i];
    this.game.ui?.subtitle(s.text, s.who || '');
    if (this.game.audio) {
      if (c.id === 'boss' && c.i === 1) this.game.audio.play('roar');
      if (c.id === 'finale' && c.i === 0) this.game.audio.play('thunder');
    }
  }

  skip() {
    if (!this.active) return;
    this.game.ui?.toast('Pominięto…');
    this.stop(false);
  }

  stop(finished) {
    const c = this.active;
    this.active = null;
    const g = this.game;
    g.cutsceneActive = false;
    g.input.uiOpen = this._prevUi || false;
    g.ui?.letterbox(false);
    g.ui?.subtitle('', '');
    // Przywróć kamerę za gracza
    g.player?.snapCamera?.();
    if (finished && c?.onDone) { try { c.onDone(); } catch { /* ignore */ } }
    else if (c?.onDone && !finished) { try { c.onDone(); } catch { /* ignore */ } }
  }

  update(dt) {
    const c = this.active;
    if (!c) return;
    const g = this.game;
    c.t += dt;
    const s = c.shots[c.i];
    if (!s) { this.stop(true); return; }
    if (c.t >= s.dur) { this._nextShot(); return; }
    // Płynna interpolacja kamery (ease in-out)
    let k = Math.min(1, c.t / s.dur);
    k = k * k * (3 - 2 * k);
    this._v1.set(s.cam[0], s.cam[1], s.cam[2]).add(c.anchor);
    this._v2.set(s.look[0], s.look[1], s.look[2]).add(c.anchor);
    // Pierwsze ujęcie startuje od bieżącej pozycji kamery
    const cam = g.camera;
    if (c.i === 0 && c.t < 0.001 + dt * 2) c.camFrom.copy(cam.position);
    cam.position.lerpVectors(c.camFrom, this._v1, k);
    this._look.lerpVectors(c.lookFrom, this._v2, k);
    cam.lookAt(this._look);
  }
}
