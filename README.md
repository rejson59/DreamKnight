# 🛡️ Dream Knight — Dream Knight RPG

**Dream Knight** to ultra realistyczna gra RPG fantasy z otwartym światem 3D,
działająca w przeglądarce na **PC, tabletach i telefonach**. Grasz jako mężny rycerz,
wykonujesz misje króla Aldrica, pomagasz mieszkańcom i eksplorujesz góry,
magiczny las, mroczną jaskinię oraz Mroczne Bagna.

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
node test/smoke.mjs  # test dymny logiki zadań / osiągnięć / wędkowania
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
Shift — bieg, Spacja — skok, I/J — ekwipunek/dziennik, F — zaklęcie, G — zmiana
zaklęcia, R — mikstura, T — pochodnia, H — koń, M — wielka mapa, Esc — pauza.

**Mobile:** joystick (lewy dół), przeciąganie po prawej (kamera), przyciski ⚔️/💬
oraz 🎒 📜 🗺️ 🏆 ☰ i szybkie sloty (mikstura, zaklęcie, pochodnia, koń).
Dwuklik/przytrzymanie przycisku zaklęcia zmienia czar.

## 🗺️ Świat

- **Królestwo** — mury, fosa z mostem, fort przy bramie, rynek z fontanną, domki
- **Zamek** — sala tronowa z królem + komnata rycerza (łóżko, skrzynia, sen do rana)
- **Rynek** — stragany kupców, kuźnia (ulepszanie broni!), stajnia, wieża czarodzieja
- **Karczma „Złoty Kufel”** — prowiant, mikstury, odpoczynek
- **Góry Mgliste** — obóz goblinów, śnieg, sosny, Szczyt Zguby
- **Magiczny Las** — świecące drzewa, zioła, wilki, jelenie, kamienny krąg, staw
- **Mroczna Jaskinia** — kryształy i boss: Kamienny Golem
- **Mroczne Bagna** *(nowość v3)* — bagienne rozlewisko, duchy-iskry, żaby,
  martwe drzewa, świecące grzyby i chatka czarownicy **Morweny** na palach
- Farma, wiatrak, cykl dnia i nocy, dynamiczne cienie i pogoda świetlików

## ⚔️ Funkcje

- Otwarty świat 3D: instancjonowana roślinność, cząsteczki, animowane flagi,
  woda, dym, ogień, chmury, ptaki, gwiazdy
- Dialogi i handel (7 sklepów), kuźnia z **ulepszaniem broni** (odłamki kryształu!),
  stajnia (kupno konia!), czarodziej i czarownica
- **9 zadań głównych** + 5 pobocznych, dziennik, śledzenie celu, minimapa
- **Wielka mapa królestwa (M)** z etykietami i ustawianiem celu podróży
- **Wędkowanie** — zarzuć wędkę nad fosą, stawem lub bagnem, złów ryby
  (a może Złotą Rybkę?) i sprzedaj je kupcom
- Zaklęcia: Kula Ognia, **Kula Lodu (spowalnia wrogów)** i Leczenie — przełączaj
  klawiszem G
- Ekwipunek: miecze, kusza, kostur, zbroje, amulety, mikstury, zaklęcia
- **Osiągnięcia i statystyki** (18 odznak) — zapisują się osobno, przeżywają nową grę
- Poziomy i doświadczenie, bossowie, łupy, skrzynie skarbów
- Przyjazne (jelenie, owce, króliki, żaby, konie) i wrogie (wilki, gobliny, dziki,
  golem, szkielety, **Duchy Bagien**) stworzenia
- Automatyczna jakość grafiki (niska → ultra) + auto-dostosowanie do FPS
- Autozapis i kontynuacja przygody (localStorage)
- Dźwięk proceduralny: efekty, wiatr, ptaki, świerszcze w nocy, rechot żab na bagnach

## 🧪 Testy

```bash
node test/smoke.mjs
```

Test dymny (bez przeglądarki) sprawdza przepływ zadań (w tym nowy łańcuch bagien),
system osiągnięć, ulepszenia broni, przełączanie zaklęć oraz logikę wędkowania.

---
*Dream Knight v3.0 „Mroczne Bagna” — zbudowano w Arena.ai Agent Mode (Three.js + Vite)*
---
