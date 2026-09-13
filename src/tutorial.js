// Dream Knight — samouczek dla nowych graczy.
// Pokazuje się automatycznie przy pierwszej wizycie na stronie
// (flaga w localStorage), można go też otworzyć z menu i pauzy.
import { icon } from './icons.js';

const KEY = 'dreamknight_tutorial_v2';

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
        ? 'Przycisk zwoju — dziennik zadań. Śledzone zadanie widać u góry ekranu, a wykrzykniki nad głowach oznaczają dostępne misje. Przycisk mapy (albo dwuklik na minimapie) otwiera wielką mapę — stuknij ją, aby ustawić cel podróży!'
        : 'J — dziennik zadań. Śledzone zadanie widać u góry ekranu, a wykrzykniki nad głowami oznaczają dostępne misje. M otwiera wielką mapę królestwa — kliknij ją, aby ustawić cel podróży (niebieski znacznik na minimapie).',
    },
    {
      icon: 'backpack', title: 'Ekwipunek i podróż',
      text: touch
        ? 'Przycisk plecaka — ekwipunek: broń, zbroja i amulet. W jaskini zapal pochodnię (świeczka), a konia (podkowa) kupisz w stajni — przycisk H gwizdka przywoła go do Ciebie. Gra zapisuje się sama.'
        : 'I — ekwipunek: broń, zbroja i amulet. Kowal Grimm ulepszy Twoją broń za odłamki kryształu! W jaskini zapal pochodnię (T), a konia kupisz w stajni — H dosiada i zsiada z wierzchowca. Gra zapisuje się automatycznie.',
    },
    {
      icon: 'fish', title: 'Wędkowanie i magia',
      text: touch
        ? 'Kup wędkę u Aldony, stań nad wodą i wciśnij przycisk dymku — gdy ryba bierze, wciśnij go ponownie! Złapane ryby sprzedasz kupcom. Czarownica Morwena z bagien nauczy Cię Kuli Lodu — przełączaj zaklęcia, rzucając kolejne.'
        : 'Kup wędkę u Aldony, stań nad wodą i naciśnij E — gdy żyłka szarpnie, naciśnij E ponownie! Ryby sprzedasz kupcom, a za Złotą Rybkę dostaniesz krocie. Czarownica Morwena z Mrocznych Bagien sprzeda Ci księgę Kuli Lodu (G zmienia zaklęcie, F rzuca).',
    },
    {
      icon: 'skull', title: 'Zlecenia, bossowie i chwała',
      text: 'Na rynku wisi tablica zleceń łowczego — powtarzalne łowy na wilki, dziki, gobliny, szkielety i duchy to szybki zarobek. Po pokonaniu Mrocznego Rycerza czekają Mroczne Bagna z duchami i czarownicą. Zbieraj też osiągnięcia (trofeum)! Powodzenia, rycerzu!',
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
