// Dream Knight — samouczek dla nowych graczy.
// Pokazuje się automatycznie przy pierwszej wizycie na stronie
// (flaga w localStorage), można go też otworzyć z menu i pauzy.
import { icon } from './icons.js';

const KEY = 'dreamknight_tutorial_v1';

export function shouldShowTutorial() {
  try { return !localStorage.getItem(KEY); } catch { return true; }
}

function markTutorialSeen() {
  try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
}

function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
}

function buildSlides(touch) {
  return [
    {
      icon: 'crown', title: 'Witaj w Dream Knight!',
      text: 'Jesteś młodym rycerzem, a królestwo potrzebuje bohatera. Zacznij od audiencji u króla w zamku, wykonuj misje i pewnego dnia stań do walki z Mrocznym Rycerzem.',
    },
    {
      icon: 'horse', title: 'Ruch i kamera',
      text: touch
        ? 'Lewy joystick — ruch (pchnij go do końca, aby biec). Przeciąganie palcem po prawej stronie ekranu — kamera. Bieg zużywa energię (żółty pasek).'
        : 'WASD lub strzałki — ruch, mysz — kamera (kliknij ekran, aby złapać kursor), Shift — bieg, Spacja — skok. Bieg zużywa energię (żółty pasek).',
    },
    {
      icon: 'sword', title: 'Walka',
      text: touch
        ? 'Przycisk miecza — atak. Trzy szybkie ciosy z rzędu dają potężny kombos! Przycisk płomienia — kula ognia, fiolka — mikstura lecznicza.'
        : 'Lewy przycisk myszy — atak. Trzy szybkie ciosy z rzędu dają potężny kombos! F — kula ognia, R — mikstura lecznicza.',
    },
    {
      icon: 'bubble', title: 'Rozmowy i interakcje',
      text: touch
        ? 'Przycisk dymku — rozmowa z mieszkańcami, zbieranie ziół, otwieranie skrzyń, czytanie tablicy zleceń i spanie w łóżku. Podpowiedź zawsze podpowie, co możesz zrobić.'
        : 'E — rozmowa z mieszkańcami, zbieranie ziół, otwieranie skrzyń, czytanie tablicy zleceń i spanie w łóżku. Podpowiedź na ekranie zawsze podpowie, co możesz zrobić.',
    },
    {
      icon: 'scroll', title: 'Zadania i mapa',
      text: touch
        ? 'Przycisk zwoju — dziennik zadań. Śledzone zadanie widać u góry ekranu, a wykrzykniki nad głowami oznaczają dostępne misje. W terenie trzymaj się dróg i drogowskazów, a złoty znacznik na minimapie wskaże cel.'
        : 'J — dziennik zadań. Śledzone zadanie widać u góry ekranu, a wykrzykniki nad głowami oznaczają dostępne misje. W terenie trzymaj się dróg i drogowskazów, a złoty znacznik na minimapie wskaże cel.',
    },
    {
      icon: 'backpack', title: 'Ekwipunek i podróż',
      text: touch
        ? 'Przycisk plecaka — ekwipunek: broń, zbroja i amulet. W jaskini zapal pochodnię (świeczka), a konia (podkowa) kupisz w stajni — przycisk H gwizdka przywoła go do Ciebie. Gra zapisuje się sama.'
        : 'I — ekwipunek: broń, zbroja i amulet. W jaskini zapal pochodnię (T), a konia kupisz w stajni — H dosiada i zsada z wierzchowca. Gra zapisuje się automatycznie.',
    },
    {
      icon: 'skull', title: 'Zlecenia i bossowie',
      text: 'Na rynku wisi tablica zleceń łowczego — powtarzalne łowy na wilki, dziki, gobliny i szkielety to szybki zarobek. A gdy będziesz gotowy… w górach czekają bossowie. Powodzenia, rycerzu!',
    },
  ];
}

const $ = (id) => document.getElementById(id);

export class Tutorial {
  constructor(game) {
    this.game = game;
    this.index = 0;
    this.list = [];
    this.onDone = null;
    this._prevUi = false;
  }

  /** onDone — wywołanie po zamknięciu (np. pokazanie menu przy starcie). */
  show(onDone = null) {
    this.onDone = onDone;
    this.list = buildSlides(isTouchDevice());
    this.index = 0;
    this._prevUi = this.game.input.uiOpen;
    this.game.input.uiOpen = true;
    $('tutorial-screen').classList.remove('hidden');
    $('tut-prev').onclick = () => { this.game.audio.play('click'); this.prev(); };
    $('tut-next').onclick = () => { this.game.audio.play('click'); this.next(); };
    $('tut-skip').onclick = () => { this.game.audio.play('click'); this.finish(); };
    this.render();
  }

  render() {
    const s = this.list[this.index];
    const last = this.index === this.list.length - 1;
    $('tut-icon').innerHTML = icon(s.icon, 46);
    $('tut-title').textContent = s.title;
    $('tut-text').textContent = s.text;
    const dots = $('tut-dots');
    dots.innerHTML = '';
    this.list.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'tut-dot' + (i === this.index ? ' active' : '');
      dots.appendChild(d);
    });
    $('tut-prev').style.visibility = this.index === 0 ? 'hidden' : 'visible';
    $('tut-next').textContent = last ? 'Zagraj!' : 'Dalej';
    $('tut-skip').style.display = last ? 'none' : '';
  }

  prev() {
    if (this.index > 0) { this.index--; this.render(); }
  }

  next() {
    if (this.index < this.list.length - 1) { this.index++; this.render(); }
    else this.finish();
  }

  finish() {
    markTutorialSeen();
    $('tutorial-screen').classList.add('hidden');
    this.game.input.uiOpen = this._prevUi;
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  }
}
