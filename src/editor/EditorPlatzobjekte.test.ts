import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { standardArten } from '../arten/standardArten';
import { VorlagenWahl } from '../arten/platz/vorlagen';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Beschriftung } from '../model/Beschriftung';
import { STANDARD_BESCHRIFTUNG } from '../model/params';
import { Platzbedarf } from '../model/Platzbedarf';
import { Platzobjekt } from '../model/Platzobjekt';
import { Vec3 } from '../model/Vec3';
import { sichtbarePunkte } from './Ansicht';
import { Editor } from './Editor';
import { idsImRechteck } from './Rahmenwahl';
import type { Treffer } from './SnapService';
import { SzenenInhalt } from './SzenenInhalt';

const boden = (x: number, z: number): Treffer => ({ art: 'boden', punkt: new Vec3(x, 0, z) });
const zaehler = (): ((p: string) => string) => {
  let n = 0;
  return (p) => `${p}-${++n}`;
};
const feuer = (id: string, position: Vec3): Platzobjekt =>
  new Platzobjekt(id, position, { vorlage: 'feuerstelle', name: 'Feuerstelle', form: 'kreis', breite: 1.5, laenge: 1.5, hoehe: 0.3, farbe: '#e8590c' });

describe('Platz-Objekte im Editor (Spec E3, D2, D3)', () => {
  it('setzt mit dem Werkzeug „Platz-Objekt“ Objekte der gewählten Vorlage; die Vorlage bleibt aktiv', () => {
    const wahl = new VorlagenWahl();
    const arten = standardArten(wahl);
    const e = new Editor(Bauwerk.leer(), { arten, neueId: zaehler() });
    wahl.setze('holzlager');
    e.waehleWerkzeug('platzobjekt');
    e.klick(boden(10, 5));
    e.klick(boden(20, 5));
    const objekte = e.bauwerk.objekte as readonly Platzobjekt[];
    expect(objekte.map((o) => [o.id, o.params.vorlage, o.position.x])).toEqual([
      ['platzobjekt-1', 'holzlager', 10],
      ['platzobjekt-2', 'holzlager', 20],
    ]);
    expect(e.zustand().werkzeug).toBe('platzobjekt');
    wahl.setze('fahnenmast');
    e.klick(boden(30, 5));
    expect((e.bauwerk.objekte[2] as Platzobjekt).params.hoehe).toBe(8);
  });

  it('setzt mit dem Werkzeug „Beschriftung“ einen Text mit 1 m Schrifthöhe', () => {
    const e = new Editor(Bauwerk.leer(), { neueId: zaehler() });
    e.waehleWerkzeug('beschriftung');
    e.klick(boden(3, 3));
    expect((e.bauwerk.objekte[0] as Beschriftung).params).toEqual(STANDARD_BESCHRIFTUNG);
  });

  it('der Platzbedarf ignoriert Platz-Objekte und Beschriftungen, wenn die Arten es sagen', () => {
    const arten = standardArten();
    const b = kochstelle().mit(feuer('f', new Vec3(60, 0, 60))).mit(new Beschriftung('t', new Vec3(-60, 0, -60), STANDARD_BESCHRIFTUNG));
    const p = Platzbedarf.aus(b, arten.zaehltZumPlatzbedarf);
    expect(p?.laenge).toBeCloseTo(3.2, 9);
    expect(p?.breite).toBeCloseTo(1.6, 9);
    expect(Platzbedarf.aus(b)?.laenge).toBeGreaterThan(100);
  });

  it('der Platzrahmen der Szene (Ableitungen) ignoriert sie ebenfalls', () => {
    const inhalt = new SzenenInhalt();
    inhalt.zeige(kochstelle().mit(feuer('f', new Vec3(60, 0, 60))), new Set(), null);
    const rahmen = inhalt.wurzel.getObjectByName('ableitungen')?.children.find((k) => k instanceof THREE.LineLoop) as THREE.LineLoop;
    const xs = [...rahmen.geometry.getAttribute('position').array].filter((_, i) => i % 3 === 0);
    expect(Math.max(...xs)).toBeLessThan(10);
  });

  it('„Alles zeigen“, Rahmenwahl und Drehpunkt zählen sie mit', () => {
    const b = Bauwerk.leer().mit(feuer('f', new Vec3(60, 0, 0))).mit(new Beschriftung('t', new Vec3(-60, 0, 0), STANDARD_BESCHRIFTUNG));
    const xs = sichtbarePunkte(b).map((p) => p.x);
    expect([Math.min(...xs) <= -60, Math.max(...xs) >= 60.75]).toEqual([true, true]);
    expect(idsImRechteck(b, { minX: 59, maxX: 61, minZ: -1, maxZ: 1 })).toEqual(['f']);
    const e = new Editor(b, { neueId: zaehler() });
    e.setzeAuswahl(['f', 't']);
    e.dreheAuswahl(Math.PI);
    // Drehpunkt = Schwerpunkt aller Platzpunkte: 4 Kreispunkte bei x = 60, 1 Punkt bei x = -60 → 36.
    expect((e.bauwerk.objekt('f') as Platzobjekt).position.x).toBeCloseTo(12, 9);
    expect((e.bauwerk.objekt('t') as Beschriftung).position.x).toBeCloseTo(132, 9);
  });

  it('verschieben und duplizieren wie andere Objekte, jeweils ein Undo-Schritt', () => {
    const e = new Editor(Bauwerk.leer().mit(feuer('f', Vec3.NULL)), { neueId: zaehler() });
    e.waehle('f');
    expect(e.verschiebeAuswahl(new Vec3(2, 5, 0))).toBe(true);
    expect((e.bauwerk.objekt('f') as Platzobjekt).position.toArray()).toEqual([2, 0, 0]);
    e.dupliziere();
    expect(e.bauwerk.objekte).toHaveLength(2);
    e.rueckgaengig();
    expect(e.bauwerk.objekte).toHaveLength(1);
  });

  it('sind in „Auswahl“ immer klickbar, in anderen Werkzeugen nicht', () => {
    const inhalt = new SzenenInhalt();
    const e = new Editor(Bauwerk.leer());
    inhalt.zeige(Bauwerk.leer().mit(feuer('f', Vec3.NULL)).mit(new Beschriftung('t', new Vec3(5, 0, 5), STANDARD_BESCHRIFTUNG)), new Set(), null);
    expect(inhalt.ziele(e.klickZiele).length).toBeGreaterThan(0);
    e.waehleWerkzeug('dreibein');
    expect(inhalt.ziele(e.klickZiele)).toEqual([]);
  });
});
