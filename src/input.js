// Ujednolicone sterowanie: klawiatura + mysz (pointer lock) + dotyk.
export class Input {
  constructor() {
    this.keys = new Set();
    this.lookDX = 0; this.lookDY = 0;
    this.attackQ = 0; this.interactQ = 0;
    this.joyX = 0; this.joyY = 0; this.joyOn = false;
    // touchMode = pokazuj sterowanie dotykowe. Start: tylko urządzenia z BAZOWYM
    // wskaźnikiem dotykowym (laptopy z ekranem dotykowym startują w trybie myszy),
    // potem dynamiczne przełączenie przy pierwszym dotknięciu ekranu.
    this.touchMode = !!window.matchMedia?.('(pointer: coarse)').matches;
    this.lastTouchT = -1e9; // znacznik ostatniego dotyku (filtruje syntetyczne kliknięcia myszy)
    this.onTouchMode = null;
    this.locked = false;
    this.enabled = false; // false w menu/dialogach
    this.uiOpen = false;  // otwarty panel (inwentarz/sklep) blokuje ruch
    this.canvas = null;
    this.onPause = null; this.onInventory = null; this.onQuests = null;
    this.onPotion = null; this.onSpell = null; this.onTorch = null; this.onHorse = null;
    this.onCycleSpell = null; this.onMap = null;
    this.onAnyKey = null;
  }

  attach(canvas, els) {
    this.canvas = canvas;
    this.els = els;

    // Pierwszy prawdziwy dotyk ekranu włącza UI dotykowe (laptopy z touchbarem też)
    window.addEventListener('touchstart', () => {
      this.lastTouchT = performance.now();
      if (!this.touchMode) { this.touchMode = true; this.onTouchMode?.(); }
    }, { passive: true, capture: true });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (this.onAnyKey) this.onAnyKey();
      if (!this.enabled) return;
      if (e.code === 'Escape') { this.onPause && this.onPause(); return; }
      if (this.uiOpen) {
        if (e.code === 'KeyI' || e.code === 'KeyJ') { this.onPause && this.onPause(); }
        if (e.code === 'KeyM' && this.onMap) { this.onMap(); }
        return;
      }
      switch (e.code) {
        case 'KeyE': this.interactQ++; break;
        case 'KeyI': this.onInventory && this.onInventory(); break;
        case 'KeyJ': this.onQuests && this.onQuests(); break;
        case 'KeyF': this.onSpell && this.onSpell(); break;
        case 'KeyG': this.onCycleSpell && this.onCycleSpell(); break;
        case 'KeyM': this.onMap && this.onMap(); break;
        case 'KeyR': this.onPotion && this.onPotion(); break;
        case 'KeyT': this.onTorch && this.onTorch(); break;
        case 'KeyH': this.onHorse && this.onHorse(); break;
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    // Mysz — pointer lock + atak
    canvas.addEventListener('click', () => {
      if (!this.enabled || this.uiOpen || performance.now() - this.lastTouchT < 1200) return;
      if (!this.locked) canvas.requestPointerLock?.();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled || this.uiOpen) return;
      if (this.locked) {
        this.lookDX += e.movementX; this.lookDY += e.movementY;
      } else if (this.dragging) {
        this.lookDX += e.clientX - this.dragX; this.lookDY += e.clientY - this.dragY;
        this.dragX = e.clientX; this.dragY = e.clientY;
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.uiOpen || performance.now() - this.lastTouchT < 1200) return;
      if (e.button === 0) {
        if (this.locked) this.attackQ++;
        else canvas.requestPointerLock?.();
      }
      if (e.button === 2) { this.dragging = true; this.dragX = e.clientX; this.dragY = e.clientY; }
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('contextmenu', (e) => { if (this.enabled) e.preventDefault(); });
    canvas.addEventListener('wheel', (e) => {
      if (this.onZoom) this.onZoom(Math.sign(e.deltaY));
    }, { passive: true });

    // ---- DOTYK ----
    const joyZone = els.joyZone, joyBase = els.joyBase, joyStick = els.joyStick;
    let joyId = null, joyCX = 0, joyCY = 0;
    const setStick = (dx, dy) => {
      joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    joyZone.addEventListener('touchstart', (e) => {
      if (!this.enabled || this.uiOpen) return;
      const t = e.changedTouches[0];
      joyId = t.identifier; joyCX = t.clientX; joyCY = t.clientY;
      joyBase.style.display = 'block';
      joyBase.style.left = (t.clientX - 60) + 'px';
      joyBase.style.top = (t.clientY - 60) + 'px';
      joyBase.style.bottom = 'auto';
      setStick(0, 0);
      this.joyOn = true;
      e.preventDefault();
    }, { passive: false });
    const joyMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          let dx = t.clientX - joyCX, dy = t.clientY - joyCY;
          const len = Math.hypot(dx, dy), max = 52;
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          setStick(dx, dy);
          this.joyX = dx / max; this.joyY = dy / max;
        }
      }
      e.preventDefault();
    };
    const joyEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          joyId = null; this.joyX = 0; this.joyY = 0; this.joyOn = false;
          joyBase.style.display = 'none';
        }
      }
    };
    joyZone.addEventListener('touchmove', joyMove, { passive: false });
    joyZone.addEventListener('touchend', joyEnd);
    joyZone.addEventListener('touchcancel', joyEnd);

    // Kamera — prawa strona
    const look = els.lookZone;
    let lookId = null, lx = 0, ly = 0;
    look.addEventListener('touchstart', (e) => {
      if (!this.enabled || this.uiOpen) return;
      const t = e.changedTouches[0];
      lookId = t.identifier; lx = t.clientX; ly = t.clientY;
      e.preventDefault();
    }, { passive: false });
    look.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === lookId) {
          this.lookDX += (t.clientX - lx) * 2.4;
          this.lookDY += (t.clientY - ly) * 2.4;
          lx = t.clientX; ly = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const lookEnd = (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
    };
    look.addEventListener('touchend', lookEnd);
    look.addEventListener('touchcancel', lookEnd);

    els.btnAttack?.addEventListener('touchstart', (e) => { if (this.enabled && !this.uiOpen) this.attackQ++; e.preventDefault(); }, { passive: false });
    els.btnInteract?.addEventListener('touchstart', (e) => { if (this.enabled && !this.uiOpen) this.interactQ++; e.preventDefault(); }, { passive: false });
    // ...i myszą (gdy UI dotykowe jest widoczne na urządzeniu z myszą)
    els.btnAttack?.addEventListener('click', () => { if (this.enabled && !this.uiOpen) this.attackQ++; });
    els.btnInteract?.addEventListener('click', () => { if (this.enabled && !this.uiOpen) this.interactQ++; });
  }

  isDown(code) { return this.keys.has(code); }

  // Wektor ruchu w przestrzeni kamery: x prawo, z przód
  moveVec() {
    let x = 0, z = 0;
    if (!this.uiOpen) {
      if (this.isDown('KeyW') || this.isDown('ArrowUp')) z += 1;
      if (this.isDown('KeyS') || this.isDown('ArrowDown')) z -= 1;
      if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
      if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
      if (this.joyOn) { x += this.joyX; z -= this.joyY; }
    }
    const l = Math.hypot(x, z);
    if (l > 1) { x /= l; z /= l; }
    return { x, z, mag: Math.min(1, l) };
  }

  sprinting() {
    if (this.uiOpen) return false;
    if (this.isDown('ShiftLeft') || this.isDown('ShiftRight')) return true;
    if (this.joyOn && Math.hypot(this.joyX, this.joyY) > 0.92) return true;
    return false;
  }

  jumping() { return !this.uiOpen && (this.isDown('Space')); }

  consumeLook() { const dx = this.lookDX, dy = this.lookDY; this.lookDX = 0; this.lookDY = 0; return { dx, dy }; }
  consumeAttack() { const a = this.attackQ > 0; this.attackQ = 0; return a; }
  consumeInteract() { const a = this.interactQ > 0; this.interactQ = 0; return a; }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
}
