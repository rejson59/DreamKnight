// NPC-e: definicje, modele, dialogi, sklepy, zachowanie.
import * as THREE from 'three';
import { createHumanoid } from './rig.js';
import { SHOPS } from './items.js';
import { QUESTS } from './quests.js';
import { groundHeight, clamp } from './world.js';

export const NPC_DEFS = [
  {
    id: 'king', name: 'Król Aldric', title: 'Władca Królestwa',
    x: 0, z: -58.2, rotY: 0,
    rig: { skin: 0xd9a066, shirt: 0x8f1f1f, pants: 0x2a2a3a, crown: true, robe: 0x7a1010, beard: 0xcccccc },
    static: true,
  },
  {
    id: 'wizard', name: 'Eldrin Mędrzec', title: 'Czarodziej, przyjaciel rycerza',
    x: 28, z: -12.5, rotY: Math.PI,
    rig: { skin: 0xc99060, shirt: 0x2a3a6b, pants: 0x2a3a6b, wizardHat: true, beard: 0xe8e8e8, staff: true, robe: 0x2a3a6b },
    static: true,
  },
  {
    id: 'blacksmith', name: 'Grimm', title: 'Kowal',
    x: 26, z: 15.5, rotY: Math.PI,
    rig: { skin: 0xb07850, shirt: 0x4a4a4a, pants: 0x3a2a1a, hair: 0x1a1a1a, cap: 0x555555 },
    static: true,
  },
  {
    id: 'stablemaster', name: 'Hilda', title: 'Stajenna',
    x: -29, z: 19, rotY: Math.PI / 2,
    rig: { skin: 0xd9a066, shirt: 0x3a6b3a, pants: 0x4a3a28, female: true, hair: 0x8a4a1a },
    static: true,
  },
  {
    id: 'innkeeper', name: 'Berta', title: 'Karczmarka',
    x: -19.5, z: -18.5, rotY: Math.PI,
    rig: { skin: 0xe0aa72, shirt: 0x8f5a2a, pants: 0x5a3a2a, female: true, hair: 0x4a2a10 },
    static: true,
  },
  {
    id: 'merchant_aldona', name: 'Aldona', title: 'Kupczyni',
    x: -14, z: 4.5, rotY: Math.PI,
    rig: { skin: 0xd9a066, shirt: 0x6b2a6b, pants: 0x3a3040, female: true, hair: 0x2a1a0a, hood: 0x6b2a6b },
    static: true,
  },
  {
    id: 'merchant_boran', name: 'Boran', title: 'Kupiec',
    x: 14, z: 4.5, rotY: Math.PI,
    rig: { skin: 0xc99060, shirt: 0x2a6b6b, pants: 0x3a3a3a, hair: 0x555555, cap: 0x2a6b6b },
    static: true,
  },
  {
    id: 'guard_south', name: 'Strażnik Odo', title: 'Straż przy bramie',
    x: -6.5, z: 74, rotY: Math.PI,
    rig: { skin: 0xd9a066, shirt: 0x5a6a8a, pants: 0x3a3a4a, helmet: true, spear: true, shield: true, armor: true },
    static: true,
  },
  {
    id: 'guard_castle', name: 'Strażnik Cedrik', title: 'Straż zamkowa',
    x: 4.5, z: -38, rotY: 0.3,
    rig: { skin: 0xc99060, shirt: 0x5a6a8a, pants: 0x3a3a4a, helmet: true, spear: true, armor: true },
    static: true,
  },
  {
    id: 'villager_marta', name: 'Marta', title: 'Mieszkanka',
    x: -8, z: 16, rotY: 0,
    rig: { skin: 0xe0aa72, shirt: 0x4a7a9a, pants: 0x5a4a3a, female: true, hair: 0xd8b060 },
    wander: { cx: -8, cz: 16, r: 12 },
  },
  {
    id: 'villager_tom', name: 'Tom', title: 'Mieszkaniec',
    x: 10, z: 30, rotY: 0,
    rig: { skin: 0xd9a066, shirt: 0x6b5a2a, pants: 0x3a3a4a, hair: 0x3a2a1a },
    wander: { cx: 10, cz: 30, r: 14 },
  },
  {
    id: 'villager_ella', name: 'Ella', title: 'Mieszkanka',
    x: -38, z: -28, rotY: 0,
    rig: { skin: 0xd9a066, shirt: 0x9a4a6a, pants: 0x4a3a4a, female: true, hair: 0x6b3a10 },
    wander: { cx: -38, cz: -28, r: 12 },
  },
  {
    id: 'farmer', name: 'Farmer Jon', title: 'Gospodarz farmy',
    x: -44, z: 168, rotY: Math.PI,
    rig: { skin: 0xb07850, shirt: 0x5a7a3a, pants: 0x4a3a28, hair: 0x2a2a2a, cap: 0xc9b060 },
    wander: { cx: -44, cz: 170, r: 10 },
  },
  {
    id: 'miller', name: 'Młynarz Piotr', title: 'Młynarz',
    x: 62, z: 188, rotY: 0,
    rig: { skin: 0xd9a066, shirt: 0xb0a890, pants: 0x4a4a55, hair: 0x888888 },
    static: true,
  },
];

export class NPCManager {
  constructor(scene, world, textures) {
    this.scene = scene;
    this.world = world;
    this.T = textures;
    this.npcs = [];
    for (const def of NPC_DEFS) this.spawn(def);
  }

  spawn(def) {
    const rig = createHumanoid(def.rig);
    const y = this.world.walkHeight(def.x, def.z);
    rig.group.position.set(def.x, y, def.z);
    rig.group.rotation.y = def.rotY;
    this.scene.add(rig.group);
    // marker zadań nad głową
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.T.markQuest, transparent: true, depthWrite: false }));
    marker.position.y = 2.5;
    marker.scale.setScalar(0.9);
    marker.visible = false;
    rig.group.add(marker);
    this.npcs.push({
      def, rig, marker, id: def.id,
      target: null, waitT: Math.random() * 3, waveT: 0,
      baseRotY: def.rotY,
    });
  }

  getById(id) { return this.npcs.find((n) => n.id === id); }
  nameOf(id) {
    const n = this.getById(id);
    return n ? n.def.name : '???';
  }

  setMarker(id, type) {
    const n = this.getById(id);
    if (!n) return;
    if (!type) { n.marker.visible = false; return; }
    n.marker.visible = true;
    n.marker.material.map = type === '!' ? this.T.markQuest : type === '?' ? this.T.markTurn : this.T.markTalk;
    n.marker.material.needsUpdate = true;
  }

  update(dt, t, playerPos) {
    for (const n of this.npcs) {
      const rig = n.rig;
      const dx = playerPos.x - rig.group.position.x;
      const dz = playerPos.z - rig.group.position.z;
      const d = Math.hypot(dx, dz);
      // obrót twarzą do gracza, gdy blisko
      if (d < 6) {
        const want = Math.atan2(dx, dz);
        let cur = rig.group.rotation.y;
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        rig.group.rotation.y = cur + diff * Math.min(1, dt * 6);
        if (d < 3 && n.waveT <= 0 && Math.random() < dt * 0.25) n.waveT = 1.6;
      } else if (n.def.static) {
        rig.group.rotation.y += (n.baseRotY - rig.group.rotation.y) * Math.min(1, dt * 2);
      }
      if (n.waveT > 0) {
        n.waveT -= dt;
        rig.setWave(t);
      } else if (n.def.wander && d > 2.5) {
        // włóczęga
        const w = n.def.wander;
        if (!n.target) {
          if (n.waitT > 0) { n.waitT -= dt; rig.setIdle(t); continue; }
          const a = Math.random() * Math.PI * 2, r = Math.random() * w.r;
          n.target = { x: w.cx + Math.cos(a) * r, z: w.cz + Math.sin(a) * r };
        }
        const tx = n.target.x - rig.group.position.x, tz = n.target.z - rig.group.position.z;
        const td = Math.hypot(tx, tz);
        if (td < 0.6) { n.target = null; n.waitT = 2 + Math.random() * 4; rig.setIdle(t); continue; }
        const want = Math.atan2(tx, tz);
        rig.group.rotation.y = want;
        const sp = 1.6 * dt;
        const p = { x: rig.group.position.x, z: rig.group.position.z };
        const curY = rig.group.position.y;
        this.world.tryMove(p, (tx / td) * sp, (tz / td) * sp, 0.5, curY);
        rig.group.position.x = p.x; rig.group.position.z = p.z;
        rig.group.position.y = this.world.walkHeight(p.x, p.z);
        rig.walkPhase += dt * 7;
        rig.setWalk(rig.walkPhase, 0.7);
      } else {
        rig.setIdle(t + n.def.x);
      }
      if (n.marker.visible) {
        n.marker.position.y = 2.5 + Math.sin(t * 3) * 0.12;
      }
    }
  }

  nearest(x, z, maxD = 3.6) {
    let best = null, bd = maxD;
    for (const n of this.npcs) {
      const d = Math.hypot(n.rig.group.position.x - x, n.rig.group.position.z - z);
      if (d < bd) { bd = d; best = n; }
    }
    return best ? { npc: best, dist: bd } : null;
  }

  facePlayer(npc, playerPos) {
    const dx = playerPos.x - npc.rig.group.position.x;
    const dz = playerPos.z - npc.rig.group.position.z;
    npc.rig.group.rotation.y = Math.atan2(dx, dz);
  }
}

// =================================================================
// DIALOGI — drzewka zależne od stanu zadań.
// Zwraca { text, options: [{label, cls?, fn}] }. Gra obsługuje akcje.
export function getDialogue(npcId, game) {
  const Q = game.quests;
  const st = (id) => Q.state[id]?.status;
  const D = (text, options) => ({ text, options });
  const bye = { label: 'Żegnaj.', fn: () => game.ui.closeDialogue() };
  const questOpt = (qid, acceptText) => ({
    label: `📜 ${QUESTS[qid].name} — przyjmij zadanie`, cls: 'gold-opt',
    fn: () => {
      Q.accept(qid);
      game.ui.showDialogue(game.npcs.getById(npcId).def.name, acceptText, [byeOpt()]);
    },
  });
  const byeOpt = () => ({ ...bye });
  const turnInOpt = (qid, thanksText) => ({
    label: `🏆 ${QUESTS[qid].name} — odbierz nagrodę`, cls: 'gold-opt',
    fn: () => {
      Q.turnIn(qid);
      game.ui.showDialogue(game.npcs.getById(npcId).def.name, thanksText, [byeOpt()]);
    },
  });
  const tradeOpt = (shopId) => ({
    label: `🛒 Handel (${SHOPS[shopId].name})`,
    fn: () => game.ui.openShop(shopId),
  });

  switch (npcId) {
    case 'king': {
      const opts = [];
      if (st('q1_audience') === 'available' || st('q1_audience') === 'active') {
        return D('Ach, mój wierny rycerzu! Gobliny, wilki i mroczne siły zagrażają królestwu. Potrzebuję Twojego miecza. Najpierw odwiedź mędrca Eldrina w wieży na rynku — on wskaże Ci drogę. A teraz — ruszaj i okryj się chwałą!', [
          { label: '⚔️ „Tak jest, mój królu!” (rozpocznij misje)', cls: 'gold-opt', fn: () => { Q.accept('q1_audience'); Q.onTalk('king'); game.ui.closeDialogue(); } },
        ]);
      }
      if (Q.canTurnIn('q4_goblins', 'king'))
        opts.push(turnInOpt('q4_goblins', 'Znakomicie! Góry znów są bezpieczne. Karawany mogą ruszać. Weź to stalowe ostrze — zasłużyłeś. Ale to nie koniec… w Mrocznej Jaskini na zachodzie czai się coś gorszego.'));
      if (Q.canTurnIn('q5_crystal', 'king'))
        opts.push(turnInOpt('q5_crystal', 'KRYSZTAŁ KRÓLEWSKI! Wrócił do korony! Jesteś największym bohaterem królestwa, rycerzu!'));
      if (st('q4_goblins') === 'available')
        opts.push(questOpt('q4_goblins', 'Gobliny z Gór Mglistych napadają na karawany. Pokonaj 6 goblinów i wróć z meldunkiem. Niech bogowie Cię prowadzą!'));
      if (st('q5_crystal') === 'available')
        opts.push(questOpt('q5_crystal', 'W Mrocznej Jaskini na zachodzie gnieździ się Kamienny Golem. Strzeże naszego Kryształu Królewskiego. Weź pochodnię — w środku jest ciemno jak w grobie. Powodzenia, bohaterze!'));
      if (st('q6_finale') === 'available')
        opts.push(questOpt('q6_finale', 'Chodź, chodź! Całe królestwo świętuje Twoje zwycięstwo!'));
      if (st('q6_finale') === 'active') {
        return D('Rycerzu! Dzięki Tobie królestwo znów zaznało pokoju. Przyjmij tytuł BOHATERA KORONY oraz tę nagrodę. Twoje imię wyryjemy w złocie!', [
          { label: '👑 „Służę koronie!” (zakończ)', cls: 'gold-opt', fn: () => { Q.complete('q6_finale'); game.ui.closeDialogue(); } },
        ]);
      }
      opts.push({
        label: '💰 Sprzedaj uszy goblinów (8💰/szt.)',
        fn: () => {
          const n = game.player.inv.count('goblin_ear');
          if (!n) { game.ui.toast('Nie masz uszu goblinów.', 'bad'); game.audio.play('error'); return; }
          game.player.inv.remove('goblin_ear', n);
          game.player.addGold(n * 8);
          game.audio.play('coin');
          game.ui.toast(`Sprzedano ${n}x ucho goblina za ${n * 8}💰`, 'gold');
          game.ui.refreshShopGold?.();
        },
      });
      opts.push(byeOpt());
      return D('Witaj w mojej sali tronowej, rycerzu. Królestwo liczy na Ciebie. Masz do mnie jakąś sprawę?', opts);
    }
    case 'wizard': {
      const opts = [];
      if (st('q2_herbs') === 'available')
        opts.push(questOpt('q2_herbs', 'Do moich eliksirów potrzebuję 5 księżycowych ziół z Magicznego Lasu. Świecą na zielono — poznasz je z daleka. Uważaj na wilki… i wracaj cało, przyjacielu.'));
      if (Q.canTurnIn('q2_herbs', 'wizard'))
        opts.push(turnInOpt('q2_herbs', 'Wspaniale! Te zioła są idealne. Proszę — Amulet Ognia, wykuty w mojej wieży. Niech Cię chroni. Marta z rynku też prosiła o pomoc… wilki ośmieliły się za bardzo.'));
      opts.push(tradeOpt('wizard'));
      opts.push({
        label: '✨ Bezpłatna mikstura za zioła (2x słoneczne ziele)',
        fn: () => {
          if (game.player.inv.count('herb_sun') >= 2) {
            game.player.inv.remove('herb_sun', 2);
            game.player.inv.add('potion_s');
            game.audio.play('potion');
            game.ui.toast('Otrzymano: Mała mikstura 🧪');
          } else { game.ui.toast('Potrzebujesz 2x słonecznego ziela (żółte kwiaty na łąkach).', 'bad'); game.audio.play('error'); }
        },
      });
      opts.push(byeOpt());
      const first = st('q1_audience') === 'done' && st('q2_herbs') === 'available';
      return D(first
        ? 'Witaj, rycerzu. Król mówił, że przyjdziesz. Mam do Ciebie prośbę — i nagrodę dla wytrwałych…'
        : 'Witaj w mojej wieży. Mikstury, amulety, zaklęcia… a dla przyjaciela zawsze coś ekstra. Czym mogę służyć?', opts);
    }
    case 'blacksmith': {
      const opts = [];
      if (st('s3_steel') === 'available')
        opts.push(questOpt('s3_steel', 'Chcę wykuć ostrze z kryształowej stali! Przynieś mi 4 odłamki kryształu z jaskini, a sowicie Cię wynagrodzę.'));
      if (Q.canTurnIn('s3_steel', 'blacksmith'))
        opts.push(turnInOpt('s3_steel', 'Piękne odłamki! Z tego powstanie legenda. Trzymaj żelazny miecz — świeżo wykuty, jeszcze ciepły!'));
      opts.push(tradeOpt('forge'));
      opts.push(byeOpt());
      return D('Grimm do usług! Miecze, kusze, zbroje — wszystko kute w ogniu i gniewie. Co podać?', opts);
    }
    case 'stablemaster': {
      const opts = [];
      const hasHorse = game.player.inv.hasHorse;
      if (!hasHorse) {
        opts.push({
          label: `🐎 Kup konia (250💰) — szybsze podróże! [Masz: ${game.player.gold}💰]`, cls: 'gold-opt',
          fn: () => {
            if (game.player.gold >= 250) {
              game.player.gold -= 250;
              game.player.inv.hasHorse = true;
              game.creatures.spawnPlayerHorse();
              game.audio.play('horse');
              game.ui.closeDialogue();
              game.ui.toast('🐎 Kupiłeś wierzchowca! Podejdź do niego i naciśnij H, aby dosiąść.', 'quest');
              game.save();
            } else { game.ui.toast('Za mało złota! Koń kosztuje 250💰.', 'bad'); game.audio.play('error'); }
          },
        });
      } else {
        opts.push({
          label: '🐎 Gwiżdż na konia (przywoła go do Ciebie)',
          fn: () => { game.creatures.callHorse(); game.ui.closeDialogue(); },
        });
      }
      opts.push(byeOpt());
      return D(hasHorse
        ? 'Twój koń czeka na wybiegu. Dbaj o niego, a doniesie Cię wszędzie! Pamiętaj: H — dosiadanie.'
        : 'Witaj w mojej stajni! Za 250 sztuk złota sprzedam Ci najszybszego wierzchowca w królestwie. Poza murami bardzo się przyda!', opts);
    }
    case 'innkeeper': {
      const opts = [];
      if (st('s1_meat') === 'available')
        opts.push(questOpt('s1_meat', 'Goście zjadają wszystko, a spiżarnia świeci pustkami! Upoluj jelenie na łąkach i przynieś mi 3 porcje dzikiego mięsa. Zapłacę złotem i nakarmię jak króla!'));
      if (Q.canTurnIn('s1_meat', 'innkeeper'))
        opts.push(turnInOpt('s1_meat', 'Mmm, świeża dziczyzna! Jesteś aniołem, rycerzu. Trzymaj zapłatę i prowiant na drogę!'));
      opts.push(tradeOpt('tavern'));
      opts.push({
        label: `🛏️ Odpocznij i zregeneruj siły (10💰, pełne HP)`,
        fn: () => {
          if (game.player.hp >= game.player.maxHp) { game.ui.toast('Masz pełne zdrowie, nie musisz odpoczywać.'); return; }
          if (game.player.gold >= 10) {
            game.player.gold -= 10;
            game.player.heal(game.player.maxHp);
            game.audio.play('heal');
            game.ui.toast('😴 Odpocząłeś w karczmie. Pełne zdrowie!', 'gold');
          } else { game.ui.toast('Potrzebujesz 10💰.', 'bad'); game.audio.play('error'); }
        },
      });
      opts.push(byeOpt());
      return D('Witaj w „Złotym Kuflu”! Głodny? Ranny? Zmęczony? U Berty znajdziesz wszystko — za drobną opłatą…', opts);
    }
    case 'merchant_aldona':
      return D('Mapy, pochodnie, liny i wytrychy! Wszystko, czego dusza podróżnika zapragnie. Bez mapy ani rusz w dzicz, mówię Ci!', [tradeOpt('merchant_aldona'), byeOpt()]);
    case 'merchant_boran':
      return D('Mikstury prosto od czarodzieja i prowiant od Berty! Ceny uczciwe, towar pierwsza klasa!', [tradeOpt('merchant_boran'), byeOpt()]);
    case 'guard_south':
      return D('Stój! …A, to Ty, rycerzu. Przechodź. I uważaj za murami — ostatnio gobliny ośmieliły się podejść pod samą fosę.', [byeOpt()]);
    case 'guard_castle':
      return D('Sala tronowa jest otwarta dla rycerza koronnego. Król czeka. Wyprostuj się i wejdź z honorem!', [byeOpt()]);
    case 'villager_marta': {
      const opts = [];
      if (st('q3_wolves') === 'available')
        opts.push(questOpt('q3_wolves', 'Dziękuję! Wilki czają się w Magicznym Lesie na wschodzie. Pokonaj 4 bestie, a będę Ci wdzięczna do grobowej deski!'));
      if (Q.canTurnIn('q3_wolves', 'villager_marta'))
        opts.push(turnInOpt('q3_wolves', 'Jesteś naszym wybawcą! Proszę, weź te złote monety i miksturę od czarodzieja. Niech Cię bogowie błogosławią!'));
      opts.push(byeOpt());
      return D(st('q3_wolves') === 'active'
        ? 'Wilki wciąż grasują w lesie… Błagam, uważaj na siebie!'
        : 'Dzień dobry, rycerzu! Piękny dziś dzień na rynku… choć strach wychodzić za mury przez te wilki.', opts);
    }
    case 'villager_tom':
      return D('Słyszałem, że w jaskini na zachodzie straszy! Podobno kamienie tam… chodzą. Ja bym tam nie lazł bez pochodni!', [byeOpt()]);
    case 'villager_ella':
      return D('Mój brat widział jelenie przy farmie na południu. Piękne stworzenia… ale karczmarka płaci za dziczyznę, więc kto wie.', [byeOpt()]);
    case 'farmer': {
      const opts = [];
      if (st('s2_sheep') === 'available')
        opts.push(questOpt('s2_sheep', 'Moja najlepsza owca, Białka, uciekła na łąkę na wschód od farmy! Znajdź ją i pogłaszcz, żeby wróciła. Poznasz ją po dzwoneczku!'));
      if (Q.canTurnIn('s2_sheep', 'farmer'))
        opts.push(turnInOpt('s2_sheep', 'Białka wróciła! Dziękuję Ci z całego serca. Trzymaj zapłatę, bohaterze wsi!'));
      opts.push(byeOpt());
      return D('Witaj na farmie! Ciężkie czasy… najpierw susza, potem wilki, a teraz jeszcze owca mi zwiała.', opts);
    }
    case 'miller':
      return D('Młyn miele, wiatr wieje… Życie płynie. Gdybyś szedł do lasu, uważaj na wilki — ostatnio wyły całą noc.', [byeOpt()]);
    default:
      return D('Witaj, podróżniku.', [byeOpt()]);
  }
}
