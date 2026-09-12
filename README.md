# 🛡️ Dream Knight — Dream Knight RPG

**Dream Knight** to ultra realistyczna gra RPG fantasy z otwartym światem 3D,
działająca w przeglądarce na **PC, tabletach i telefonach**. Grasz jako mężny rycerz,
wykonujesz misje króla Aldrica, pomagasz mieszkańcom i eksplorujesz góry,
magiczny las oraz mroczną jaskinię.

Zero zewnętrznych assetów — cała grafika (tekstury, postacie, świat) jest generowana
proceduralnie w Three.js, a dźwięki syntezowane w WebAudio.

## ▶️ Uruchomienie

```bash
npm install
npm run dev
```

Otwórz adres z terminala (np. `http://localhost:5173`). Podgląd na żywo działa też w Arena.

```bash
npm run build    # wersja produkcyjna
npm run preview  # podgląd buildu
```

## 🌐 GitHub Pages

Strona jest wdrożona na GitHub Pages pod adresem
<https://rejson59.github.io/DreamKnight/> (źródło: gałąź `main`, katalog `/`).

Repozytorium jest w pełni samowystarczalne: zawiera lokalną kopię three.js
(`vendor/`), a wszystkie ścieżki są relatywne, więc gra działa zarówno pod
podkatalogiem `/DreamKnight/`, jak i w każdej innej lokalizacji — bez CDN
i bez `npm install`.

```bash
npm install     # opcjonalnie — do `npm run build` (zbudowany bundle)
npm run dev     # działa też bez npm install (import mapa z ./vendor/)
```

## 🎮 Sterowanie

**PC:** WASD + mysz (kliknij ekran, by złapać kursor), LPM — atak, E — interakcja,
Shift — bieg, Spacja — skok, I/J — ekwipunek/dziennik, F — kula ognia,
R — mikstura, T — pochodnia, H — koń, Esc — pauza.

**Mobile:** joystick (lewy dół), przeciąganie po prawej (kamera), przyciski ⚔️/💬
oraz 🎒 📜 ☰ i szybkie sloty (mikstura, ogień, pochodnia, koń).

## 🗺️ Świat

- **Królestwo** — mury, fosa z mostem, fort przy bramie, rynek z fontanną, domki
- **Zamek** — sala tronowa z królem + komnata rycerza (łóżko, skrzynia, sen do rana)
- **Rynek** — stragany kupców, kuźnia, stajnia, wieża czarodzieja
- **Karczma „Złoty Kufel”** — prowiant, mikstury, odpoczynek
- **Góry Mgliste** — obóz goblinów, śnieg, sosny
- **Magiczny Las** — świecące drzewa, zioła, wilki, jelenie, kamienny krąg, staw
- **Mroczna Jaskinia** — kryształy i boss: Kamienny Golem
- Farma, wiatrak, cykl dnia i nocy, dynamiczne cienie i pogoda świetlików

## ⚔️ Funkcje

- Otwarty świat 3D: instancjonowana roślinność, cząsteczki, animowane flagi,
  woda, dym, ogień, chmury, ptaki, gwiazdy
- Dialogi i handel (6 sklepów), kuźnia, stajnia (kupno konia!), czarodziej
- 6 zadań głównych + 3 poboczne, dziennik, śledzenie celu, minimapa
- Ekwipunek: miecze, kusza, kostur, zbroje, amulety, mikstury, zaklęcia (kula ognia!)
- Poziomy i doświadczenie, bossowie, łupy, skrzynie skarbów
- Przyjazne (jelenie, owce, króliki, konie) i wrogie (wilki, gobliny, dziki, golem) stworzenia
- Automatyczna jakość grafiki (niska → ultra) + auto-dostosowanie do FPS
- Autozapis i kontynuacja przygody (localStorage)
- Dźwięk proceduralny: efekty, wiatr, ptaki, świerszcze w nocy

---
*Dream Knight v2.0 — zbudowano w Arena.ai Agent Mode (Three.js + Vite)*
