// Dream Knight — wędkowanie: minigra reakcji nad wodą (fosa, staw w lesie, bagna).
// Stan: idle -> zarzucenie -> oczekiwanie (losowo) -> branie (okno ~1.1 s na E) -> łów.
// Atak (LPM) lub Esc przerywa wędkowanie. Otrzymanie obrażeń też je przerywa.

import * as THREE from 'three';
import { WATER_Y } from './config.js';

const CATCH_TABLE = [
  { id: 'fish_small', p: 0.44, name: 'Płotka' },
  { id: 'fish_big', p: 0.28, name: 'Sandacz' },
  { id: 'fish_gold', p: 0.06, name: 'ZŁOTA RYBKA' },
  { id: 'old_boot', p: 0.22, name: 'Stary but' },
];

export class Fishing {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.phase = null;   // 'wait' | 'bite'
    this.t = 0;
    this.window = 0;
    this.spot = null;    // {x,y,z} punkt, w którym spławik pływa
    // spławik
    this.bobber = new THREE.Group();
    const red = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: 0xd83a2a }));
    red.position.y = 0.07;
    const white = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0xf0ede4 }));
    white.position.y = -0.04;
    this.bobber.add(red, white);
    this.bobber.visible = false;
    game.scene.add(this.bobber);
  }

  get hudEl() { return document.getElementById('fishing-hud'); }

  // Czy przed graczem (2,8 m) jest głęboka woda? — wtedy można zarzucić wędkę.
  spotAhead() {
    const p = this.game.player.group.position;
    const dirX = Math.sin(this.game.player.group.rotation.y);
    const dirZ = Math.cos(this.game.player.group.rotation.y);
    const sx = p.x + dirX * 2.8, sz = p.z + dirZ * 2.8;
    if (!this.game.world.inDeepWater(sx, sz)) return null;
    return { x: sx, y: WATER_Y + 0.1, z: sz };
  }

  canFishHere() {
    if (!this.game.player.inv.has('fishing_rod')) return false;
    return !!this.spotAhead();
  }

  start() {
    if (this.active) return;
    const spot = this.spotAhead();
    if (!spot) return;
    this.active = true;
    this.phase = 'wait';
    this.t = 2 + Math.random() * 5;   // czas do brania
    this.spot = spot;
    this.bobber.position.set(spot.x, spot.y, spot.z);
    this.bobber.visible = true;
    this.game.audio.play('cast');
    this.showHud('Cierpliwie czekasz na branie… (atak / Esc — przerwij)');
  }

  cancel(reason = 'Schowałeś wędkę.') {
    if (!this.active) return;
    this.active = false;
    this.phase = null;
    this.bobber.visible = false;
    this.hideHud();
    if (reason) this.game.ui.toast(reason);
  }

  showHud(text, urgent = false) {
    const el = this.hudEl;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    el.classList.toggle('urgent', urgent);
  }
  hideHud() { this.hudEl?.classList.add('hidden'); }

  // wywoływane z pętli gry, gdy wędkowanie jest aktywne
  update(dt) {
    const g = this.game;
    if (!this.active) return;
    // przerwanie: atak (LPM / przycisk miecza)
    if (g.input.consumeAttack()) { this.cancel(); return; }
    if (g.player.dead) { this.cancel(null); return; }

    this.t -= dt;
    // delikatne unoszenie się spławika
    this.bobber.position.y = WATER_Y + 0.1 + Math.sin(g.t * 2.2) * 0.04;

    if (this.phase === 'wait') {
      if (Math.random() < dt * 0.7) g.fx.ring(this.spot.x, WATER_Y + 0.1, this.spot.z, 0x88ccdd, 1.2);
      if (this.t <= 0) {
        this.phase = 'bite';
        this.window = 1.15;
        g.audio.play('bite');
        this.showHud('RYBA BIERZE! — naciśnij E!', true);
        g.fx.burst(this.spot.x, WATER_Y + 0.1, this.spot.z, 0x99e0ff, 8, 2, 0.5);
      }
    } else if (this.phase === 'bite') {
      this.bobber.position.y = WATER_Y - 0.12 + Math.sin(g.t * 26) * 0.1; // szarpanie
      if (g.input.consumeInteract()) { this.caught(); return; }
      this.window -= dt;
      if (this.window <= 0) {
        g.audio.play('splash');
        g.fx.ring(this.spot.x, WATER_Y + 0.1, this.spot.z, 0x99ccff, 2.2);
        this.game.ui.toast('Ryba uciekła z haczyka… spróbuj ponownie!', 'bad');
        this.cancel(null);
      }
    }
  }

  caught() {
    const g = this.game;
    const roll = Math.random();
    let acc = 0, result = CATCH_TABLE[0];
    for (const c of CATCH_TABLE) {
      acc += c.p;
      if (roll <= acc) { result = c; break; }
    }
    this.active = false;
    this.phase = null;
    this.bobber.visible = false;
    this.hideHud();
    g.audio.play('splash');
    g.fx.burst(this.spot.x, WATER_Y + 0.15, this.spot.z, 0xaaddff, 14, 3, 0.6);
    g.fx.ring(this.spot.x, WATER_Y + 0.1, this.spot.z, 0xaaddff, 3);
    g.player.inv.add(result.id, 1);
    g.player.addXp(result.id === 'fish_gold' ? 60 : 8, g);
    if (result.id === 'old_boot') {
      g.ui.toast('Złowiono… starego buta. No cóż, bagna mają swój klimat.', '');
    } else if (result.id === 'fish_gold') {
      g.ui.toast('ZŁOTA RYBKA! Kupcy słono za nią zapłacą (250 zł)!', 'gold');
      g.fx.ring(this.spot.x, WATER_Y + 0.1, this.spot.z, 0xffd75e, 4);
    } else {
      g.ui.toast(`Złowiono: ${result.name}!`, 'gold');
    }
    g.quests.onSpecial('fish_caught');
    g.achv?.onFish(result.id);
    g.save();
  }
}
