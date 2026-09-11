// Dream Knight — system efektów: liczby obrażeń, cząsteczki, fale uderzeniowe
// Lekkie pule obiektów z limitem zależnym od jakości (słabe telefony).
// API pozycyjne: fx.dmg(x,y,z,tekst,kolor), fx.burst(x,y,z,kolor,ile,szybkość,życie),
// fx.ring(x,y,z,kolor,promień), fx.slash(x,y,z,kąt), fx.flash(x,y,z,kolor,rozmiar).

import * as THREE from 'three';

export class FXSystem {
  constructor(scene, quality = 'medium') {
    this.scene = scene;
    this.particles = [];  // { pts, vel, life, maxLife, grav, count }
    this.texts = [];      // { sprite, life, maxLife }
    this.rings = [];      // { mesh, life, maxLife, r1 }
    this.flashes = [];    // { mesh, life, maxLife }
    this._textPool = [];
    this.setQuality(quality);
  }

  setQuality(q) {
    this.quality = q;
    this.maxParticles = q === 'low' ? 120 : q === 'medium' ? 400 : 900;
    this.maxTexts = q === 'low' ? 4 : 10;
  }

  _count() {
    let n = 0;
    for (const p of this.particles) n += p.count;
    return n;
  }

  // Wybuch cząsteczek: burst(x, y, z, kolor, ile, szybkość, życie)
  burst(x, y, z, color = 0xffcc44, count = 12, speed = 4, life = 0.7) {
    const room = this.maxParticles - this._count();
    if (room <= 0) return;
    count = Math.min(count, room);
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    const c2 = new THREE.Color(color).offsetHSL(0, 0, 0.15);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const r = speed * (0.4 + Math.random() * 0.8);
      vel[i * 3] = Math.cos(a) * r;
      vel[i * 3 + 1] = 2 * (0.5 + Math.random()) + Math.random() * speed * 0.4;
      vel[i * 3 + 2] = Math.sin(a) * r;
      const cc = Math.random() < 0.6 ? c : c2;
      colors[i * 3] = cc.r; colors[i * 3 + 1] = cc.g; colors[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.particles.push({ pts, vel, life, maxLife: life, grav: 9, count });
  }

  // Pływająca liczba obrażeń: dmg(x, y, z, tekst, kolorCss)
  dmg(x, y, z, text, color = '#ffd34d') {
    if (this.texts.length >= this.maxTexts) return;
    const t = String(text);
    const big = t.length > 3 || t.includes('!');
    const sprite = this._getTextSprite(t, color, big);
    sprite.position.set(x + (Math.random() - 0.5) * 0.8, y + 1.2 + Math.random() * 0.4, z);
    this.scene.add(sprite);
    this.texts.push({ sprite, life: 0.9, maxLife: 0.9 });
  }

  _getTextSprite(text, color, big) {
    let s = this._textPool.pop();
    const size = big ? 64 : 44;
    const cv = s?.userData.cv || document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 256, 96);
    ctx.font = `bold ${size}px Trebuchet MS, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(text, 128, 48);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 48);
    if (s) {
      s.material.map.needsUpdate = true;
      s.material.opacity = 1;
      s.scale.set(big ? 2.4 : 1.6, big ? 0.9 : 0.6, 1);
      return s;
    }
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    s = new THREE.Sprite(mat);
    s.userData.cv = cv;
    s.scale.set(big ? 2.4 : 1.6, big ? 0.9 : 0.6, 1);
    return s;
  }

  // Rozszerzający się pierścień: ring(x, y, z, kolor, promieńKońcowy)
  ring(x, y, z, color = 0xffffff, r1 = 4) {
    const geo = new THREE.RingGeometry(0.85, 1, 40);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.12, z);
    mesh.scale.setScalar(0.4);
    this.scene.add(mesh);
    this.rings.push({ mesh, life: 0.5, maxLife: 0.5, r1 });
  }

  // Błysk cięcia mieczem: slash(x, y, z, kątKierunku)
  slash(x, y, z, dirAngle, color = 0xaaddff) {
    const geo = new THREE.TorusGeometry(1.1, 0.09, 8, 20, Math.PI * 0.9);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(Math.PI / 2.3, 0, -dirAngle - Math.PI * 0.4);
    this.scene.add(mesh);
    this.flashes.push({ mesh, life: 0.18, maxLife: 0.18 });
  }

  // Szybki błysk światła: flash(x, y, z, kolor, rozmiar)
  flash(x, y, z, color = 0xffffff, size = 3) {
    const mat = new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y + 1, z);
    s.scale.setScalar(size);
    this.scene.add(s);
    this.flashes.push({ mesh: s, life: 0.25, maxLife: 0.25 });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.pts);
        p.pts.geometry.dispose(); p.pts.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      const arr = p.pts.geometry.attributes.position.array;
      const dvy = p.grav * dt;
      for (let j = 0; j < p.count; j++) {
        p.vel[j * 3 + 1] -= dvy;
        arr[j * 3] += p.vel[j * 3] * dt;
        arr[j * 3 + 1] += p.vel[j * 3 + 1] * dt;
        arr[j * 3 + 2] += p.vel[j * 3 + 2] * dt;
        if (arr[j * 3 + 1] < 0.05) { arr[j * 3 + 1] = 0.05; p.vel[j * 3 + 1] *= -0.3; }
      }
      p.pts.geometry.attributes.position.needsUpdate = true;
      p.pts.material.opacity = Math.min(1, (p.life / p.maxLife) * 2);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.sprite);
        if (this._textPool.length < 12) this._textPool.push(t.sprite);
        this.texts.splice(i, 1);
        continue;
      }
      t.sprite.position.y += dt * 1.6;
      t.sprite.material.opacity = Math.min(1, (t.life / t.maxLife) * 2.5);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose(); r.mesh.material.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      const k = 1 - r.life / r.maxLife;
      r.mesh.scale.setScalar(0.4 + (r.r1 - 0.4) * k);
      r.mesh.material.opacity = 0.9 * (1 - k);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        if (f.mesh.geometry) f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        this.flashes.splice(i, 1);
        continue;
      }
      f.mesh.material.opacity = f.life / f.maxLife;
    }
  }
}
