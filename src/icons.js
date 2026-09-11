// Dream Knight — oryginalny zestaw ikon SVG (styl grawerowanych linii).
// Użycie: icon('sword') -> gotowy znacznik <svg>. Kolor dziedziczony (currentColor).

const P = {
  sword: '<path d="M12 1.5l1.7 3.8v8.2l2.3 2v2.2h-2.8v4.8h-2.4v-4.8H8v-2.2l2.3-2V5.3z" fill="currentColor" stroke="none"/>',
  bow: '<path d="M7 3.5c7 3 11 9 12.5 17M7 3.5v17M7 12h10.5M14.5 9l4 3-4 3"/>',
  staff: '<path d="M5.5 21.5L15 6"/><circle cx="17" cy="4.8" r="2.8" fill="currentColor" stroke="none"/>',
  mace: '<circle cx="12" cy="6.5" r="4.2"/><path d="M12 10.7v10M9 17.5h6"/>',
  shield: '<path d="M12 2l7.5 2.8v6.1c0 4.8-3.2 9-7.5 10.6-4.3-1.6-7.5-5.8-7.5-10.6V4.8z"/><path d="M12 6.5v9"/>',
  amulet: '<path d="M4.5 3.5c2 3.8 4.3 5.7 7.5 5.7s5.5-1.9 7.5-5.7"/><circle cx="12" cy="15" r="5.5"/><path d="M12 12.2l2 2.8-2 2.8-2-2.8z" fill="currentColor" stroke="none"/>',
  torch: '<path d="M12 1c1.8 2.6 4.2 4.2 4.2 7a4.2 4.2 0 01-8.4 0c0-1.4.6-2.5 1.4-3.5.2 1 .8 1.9 1.7 2.4C10.6 4.9 11.3 3 12 1z" fill="currentColor" stroke="none"/><path d="M10 13.5h4L12.8 22h-1.6z" fill="currentColor" stroke="none"/>',
  map: '<path d="M9 4l6 2 6-2v15l-6 2-6-2-6 2V6z"/><path d="M9 4v15M15 6v15"/>',
  rope: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  key: '<circle cx="8" cy="8" r="4.2"/><path d="M11.2 11.2L20 20M15.5 15.5l2.8.7-.7 2.8"/>',
  food: '<circle cx="9.5" cy="9.5" r="5.5"/><path d="M13.5 13.5L19 19"/><circle cx="19.5" cy="19.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="21.5" cy="17.5" r="1.1" fill="currentColor" stroke="none"/>',
  bread: '<ellipse cx="12" cy="13" rx="8.5" ry="5.5"/><path d="M7.5 11.5l1.8 1.8M11.5 10.5l1.8 1.8M15.5 11.5l1.8 1.8"/>',
  potion: '<path d="M10 2.5h4M10.5 2.5v4.5L6 14.5a5 5 0 009 3.5A5 5 0 0018 14L13.5 7V2.5"/><path d="M9 15.5h6" />',
  herb: '<path d="M12 21.5V9M12 13c-4 0-6-2.7-6-7 4 0 6 3 6 7zm0-2c4 0 6-2.7 6-7-4 0-6 3-6 7z"/>',
  flower: '<circle cx="12" cy="8.5" r="2.2" fill="currentColor" stroke="none"/><circle cx="12" cy="3.6" r="1.7"/><circle cx="12" cy="13.4" r="1.7"/><circle cx="7.1" cy="8.5" r="1.7"/><circle cx="16.9" cy="8.5" r="1.7"/><path d="M12 15.5v6M12 18.5l-3-2"/>',
  hide: '<path d="M5 3.5h14V16l-3.5 4.5L12 17.5 8.5 20.5 5 16z"/><path d="M5 8h14"/>',
  meat: '<rect x="5" y="7" width="14" height="11" rx="5"/><path d="M9.5 10.5v4M14.5 10.5v4"/>',
  ear: '<ellipse cx="12" cy="12" rx="6" ry="8.5"/><path d="M12 6c-2.2 3-2.2 9 0 12"/>',
  book: '<path d="M5 3.5h10.5a3.5 3.5 0 013.5 3.5v13.5H8.5A3.5 3.5 0 015 17z"/><path d="M5 3.5V17M9 9h7M9 12.5h7"/>',
  crystal: '<path d="M7 3.5h10l4.5 6L12 20.5 2.5 9.5z"/><path d="M2.5 9.5h19M9 3.5l3 6 3-6M12 9.5v11"/>',
  crown: '<path d="M3.5 18.5h17M4 18L2.8 9.5l5 3.2 4.2-6.2 4.2 6.2 5-3.2L20 18z" fill="currentColor" stroke="none"/>',
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><path d="M12 8.5l2.3 3.5-2.3 3.5-2.3-3.5z" fill="currentColor" stroke="none"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 0010.5 10.5z"/>',
  skull: '<path d="M12 2.5a7.5 7.5 0 00-7.5 7.5c0 2.8 1.4 4.7 3.7 5.7v3.8h7.6v-3.8c2.3-1 3.7-2.9 3.7-5.7A7.5 7.5 0 0012 2.5z"/><circle cx="9.2" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="14.8" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><path d="M12 12.5v2.5"/>',
  backpack: '<rect x="6" y="8" width="12" height="12" rx="2.5"/><path d="M9 8V6.5a3 3 0 016 0V8M9 14h6v6H9z"/>',
  scroll: '<rect x="8" y="5" width="8" height="14" rx="1"/><rect x="5" y="3" width="3" height="18" rx="1.5"/><rect x="16" y="3" width="3" height="18" rx="1.5"/><path d="M10.5 9h3M10.5 12h3"/>',
  flame: '<path d="M12 1.5c2.6 3.6 6.5 6.2 6.5 11.3a6.5 6.5 0 01-13 0c0-2.2 1-4 2.2-5.6.3 1.6 1.1 2.7 2.2 3.3C9.6 7.5 10.7 4.3 12 1.5z" fill="currentColor" stroke="none"/>',
  horse: '<path d="M6 20.5v-6.5a6 6 0 0112 0v6.5"/><path d="M6 20.5h3.5M14.5 20.5H18"/><circle cx="6" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="8.6" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="8.6" r="1" fill="currentColor" stroke="none"/>',
  bubble: '<rect x="3.5" y="4" width="17" height="11" rx="3"/><path d="M9 15l-2.5 5.5L12 15"/>',
  heart: '<path d="M12 20.5C6.5 15.5 3 12.3 3 8.6A4.6 4.6 0 0112 6a4.6 4.6 0 019 2.6c0 3.7-3.5 6.9-9 11.9z" fill="currentColor" stroke="none"/>',
  star: '<path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7-6-3.3-6 3.3 1.3-6.7-5-4.6 6.8-.8z" fill="currentColor" stroke="none"/>',
  pin: '<path d="M12 21.5s-7-6.6-7-12a7 7 0 0114 0c0 5.4-7 12-7 12z"/><circle cx="12" cy="9.5" r="2.5"/>',
  sound: '<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" fill="currentColor" stroke="none"/><path d="M16 9a4.5 4.5 0 010 6M18.5 6.5a8 8 0 010 11"/>',
  mute: '<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" fill="currentColor" stroke="none"/><path d="M16 9.5l5.5 5.5M21.5 9.5L16 15"/>',
  wind: '<path d="M3 8.5h11a3 3 0 10-3-3M3 12.5h15a3 3 0 11-3 3M3 16.5h8"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
  hourglass: '<path d="M6 3.5h12M6 20.5h12M8 3.5v4l4 4 4-4v-4M8 20.5v-4l4-4 4 4v4"/>',
};

/** Zwraca gotowy SVG jako string. size — rozmiar w px. */
export function icon(name, size = 22) {
  const body = P[name] || '';
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** Wypełnia wszystkie elementy [data-icon] odpowiednimi ikonami. */
export function hydrateIcons(root = document) {
  for (const el of root.querySelectorAll('[data-icon]')) {
    const size = parseInt(el.dataset.size || '22', 10);
    el.innerHTML = icon(el.dataset.icon, size);
  }
}
