import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Linie } from '../model/Linie';
import { STANDARD_LINIE, STANDARD_ZONE } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { Zone } from '../model/Zone';
import { Editor } from './Editor';
import type { Treffer } from './SnapService';
import { erzeugeWerkzeug } from './Werkzeuge';
import { ZeichenTool } from './ZeichenTool';

const boden = (x: number, z: number): Treffer => ({ art: 'boden', punkt: new Vec3(x, 0, z) });
const zaehler = (): ((p: string) => string) => {
  let n = 0;
  return (p) => `${p}-${++n}`;
};
const neuerEditor = (b: Bauwerk = Bauwerk.leer()): Editor => new Editor(b, { neueId: zaehler() });
const quadrat = (e: Editor): void => {
  e.klick(boden(0, 0));
  e.klick(boden(10, 0));
  e.klick(boden(10, 10));
  e.klick(boden(0, 10));
};

describe('Mehrpunkt-Werkzeuge „Zone zeichnen“ und „Linie zeichnen“ (Spec E3, D1)', () => {
  it('gibt es als ZeichenTool mit dem Namen der Art; ohne Klickziele und ohne Zeichnung', () => {
    for (const name of ['zone', 'linie'] as const) {
      const w = erzeugeWerkzeug(name);
      expect(w).toBeInstanceOf(ZeichenTool);
      expect([w.name, w.klickZiele, w.angefangen, w.zeichnung]).toEqual([name, [], null, null]);
    }
  });

  it('jeder Klick setzt einen Punkt (aufs Raster) und zeigt die Zeichnung; nichts wird erzeugt, bevor man abschließt', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('zone');
    expect(e.zustand().zeichnung).toBeNull();
    e.klick(boden(0.04, 0.02));
    e.klick(boden(10.03, 0));
    const z = e.zustand().zeichnung;
    expect(z?.geschlossen).toBe(true);
    expect(z?.punkte.map((p) => p.toArray())).toEqual([
      [0, 0, 0],
      [10, 0, 0],
    ]);
    expect(e.bauwerk.istLeer).toBe(true);
  });

  it('Enter schließt eine Zone ab: Objekt entsteht, ist ausgewählt, das Werkzeug bleibt, die Zeichnung ist leer', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('zone');
    quadrat(e);
    expect(e.taste('Enter', false)).toBe(true);
    const z = e.bauwerk.objekte[0] as Zone;
    expect([z.art, z.id, z.params, z.flaeche()]).toEqual(['zone', 'zone-1', STANDARD_ZONE, 100]);
    expect(e.zustand().auswahl).toBe('zone-1');
    expect(e.zustand().werkzeug).toBe('zone');
    expect(e.zustand().zeichnung).toBeNull();
    expect(e.zustand().meldung).toBeNull();
  });

  it('Doppelklick schließt ab; die zwei Klicks, die ein Doppelklick mitliefert, setzen keinen doppelten Punkt', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('zone');
    e.klick(boden(0, 0));
    e.klick(boden(10, 0));
    e.klick(boden(10, 10));
    e.klick(boden(10, 10));
    e.doppelklick(boden(10, 10));
    const z = e.bauwerk.objekte[0] as Zone;
    expect(z.punkte.map((p) => p.toArray())).toEqual([
      [0, 0, 0],
      [10, 0, 0],
      [10, 0, 10],
    ]);
    expect(e.zustand().meldung).toBeNull();
  });

  it('Esc bricht ab: keine Zeichnung, kein Objekt, Werkzeug bleibt', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('zone');
    quadrat(e);
    expect(e.taste('Escape', false)).toBe(true);
    expect(e.zustand().zeichnung).toBeNull();
    expect(e.bauwerk.istLeer).toBe(true);
    expect(e.zustand().werkzeug).toBe('zone');
  });

  it('ein Werkzeugwechsel verwirft die Zeichnung', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('zone');
    e.klick(boden(0, 0));
    e.waehleWerkzeug('linie');
    expect(e.zustand().zeichnung).toBeNull();
    e.waehleWerkzeug('zone');
    expect(e.zustand().zeichnung).toBeNull();
  });

  it('zu wenige Punkte: Enter und Doppelklick zeigen die Meldung des Modells und die Zeichnung bleibt', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('zone');
    e.klick(boden(0, 0));
    e.klick(boden(5, 0));
    e.taste('Enter', false);
    expect(e.zustand().meldung).toBe('Eine Zone braucht mindestens 3 Ecken.');
    expect(e.zustand().zeichnung?.punkte).toHaveLength(2);
    e.zeigeMeldung(null);
    e.doppelklick(boden(5, 0));
    expect(e.zustand().meldung).toBe('Eine Zone braucht mindestens 3 Ecken.');
    expect(e.bauwerk.istLeer).toBe(true);
    e.klick(boden(5, 5));
    e.taste('Enter', false);
    expect(e.bauwerk.objekte).toHaveLength(1);
  });

  it('eine sich schneidende Zone wird abgelehnt, die Zeichnung bleibt und lässt sich weiter bearbeiten', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('zone');
    e.klick(boden(0, 0));
    e.klick(boden(4, 4));
    e.klick(boden(4, 0));
    e.klick(boden(0, 4));
    e.taste('Enter', false);
    expect(e.zustand().meldung).toBe('Die Zone darf sich nicht selbst schneiden.');
    expect(e.zustand().zeichnung?.punkte).toHaveLength(4);
    expect(e.bauwerk.istLeer).toBe(true);
  });

  it('ein Klick auf den ersten Punkt schließt das Vieleck nur optisch: Der doppelte Endpunkt fällt beim Abschluss weg', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('zone');
    e.klick(boden(0, 0));
    e.klick(boden(10, 0));
    e.klick(boden(10, 10));
    e.klick(boden(0, 0));
    e.taste('Enter', false);
    expect((e.bauwerk.objekte[0] as Zone).punkte).toHaveLength(3);
  });

  it('Linie: 2 Punkte genügen, offene Zeichnung, Startwerte Weg 1 m; ein Punkt reicht nicht', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('linie');
    e.klick(boden(0, 0));
    expect(e.zustand().zeichnung?.geschlossen).toBe(false);
    e.taste('Enter', false);
    expect(e.zustand().meldung).toBe('Eine Linie braucht mindestens 2 Punkte.');
    e.klick(boden(30, 0));
    e.doppelklick(boden(30, 0));
    const l = e.bauwerk.objekte[0] as Linie;
    expect([l.params, l.laenge()]).toEqual([STANDARD_LINIE, 30]);
  });

  it('Enter ohne Zeichnung ist nicht behandelt (kein Punkt, keine Meldung)', () => {
    const e = neuerEditor();
    expect(e.taste('Enter', false)).toBe(false);
    e.waehleWerkzeug('zone');
    expect(e.taste('Enter', false)).toBe(false);
    expect(e.zustand().meldung).toBeNull();
  });

  it('Punkte rasten auf Ecken vorhandener Zonen und Linien ein', () => {
    const vorhanden = new Zone('z0', [new Vec3(5.05, 0, 5.05), new Vec3(8, 0, 5), new Vec3(8, 0, 8)], STANDARD_ZONE);
    const e = neuerEditor(Bauwerk.leer().mit(vorhanden));
    e.waehleWerkzeug('linie');
    e.klick(boden(5.15, 5.2));
    e.klick(boden(20, 20));
    e.taste('Enter', false);
    const l = e.bauwerk.objekte[1] as Linie;
    expect(l.punkte[0]?.toArray()).toEqual([5.05, 0, 5.05]);
  });

  it('Treffer auf ein Bauteil liefert einen Punkt am Boden (y = 0)', () => {
    const e = neuerEditor(kochstelle());
    e.waehleWerkzeug('linie');
    e.klick({ art: 'objekt', objektArt: 'dreibein', id: 'x', punkt: new Vec3(2, 1.5, 2) });
    e.klick(boden(9, 9));
    e.taste('Enter', false);
    const l = e.bauwerk.objekte.at(-1) as Linie;
    expect(l.punkte.every((p) => p.y === 0)).toBe(true);
  });
});

describe('Klickziele von Zonen und Linien (Spec E3, D3)', () => {
  it('in der Auswahl klickbar, in allen anderen Werkzeugen nicht', () => {
    const e = neuerEditor();
    expect(e.klickZiele).toContain('zone');
    expect(e.klickZiele).toContain('linie');
    for (const name of ['dreibein', 'abock', 'stange', 'baum', 'plane', 'platzobjekt', 'beschriftung', 'zone', 'linie'] as const) {
      e.waehleWerkzeug(name);
      expect(e.klickZiele, name).toEqual([]);
    }
    e.waehleWerkzeug('seil');
    expect(e.klickZiele).toEqual(['plane']);
  });

  it('Zonen und Linien lassen sich in der Auswahl verschieben und drehen; sie zählen nicht zum Platzbedarf', () => {
    const z = new Zone('z', [new Vec3(0, 0, 0), new Vec3(10, 0, 0), new Vec3(10, 0, 10)], STANDARD_ZONE);
    const l = new Linie('l', [new Vec3(0, 0, 0), new Vec3(10, 0, 0)], STANDARD_LINIE);
    const e = neuerEditor(Bauwerk.leer().mit(z).mit(l));
    e.klick({ art: 'objekt', objektArt: 'zone', id: 'z', punkt: new Vec3(8, 0, 2) });
    expect(e.zustand().auswahl).toBe('z');
    expect(e.verschiebeAuswahl(new Vec3(1, 0, 2))).toBe(true);
    expect((e.bauwerk.objekt('z') as Zone).punkte[0]?.toArray()).toEqual([1, 0, 2]);
    e.dreheAuswahl(Math.PI / 2);
    expect((e.bauwerk.objekt('z') as Zone).flaeche()).toBeCloseTo(50);
    e.klick({ art: 'objekt', objektArt: 'linie', id: 'l', punkt: new Vec3(5, 0, 0) });
    e.dupliziere();
    expect(e.bauwerk.objekte).toHaveLength(3);
    e.loescheAuswahl();
    e.rueckgaengig();
    expect(e.bauwerk.objekte).toHaveLength(3);
  });

  it('Änderungen im Panel (Name, Typ) sind je ein Undo-Schritt', () => {
    const l = new Linie('l', [new Vec3(0, 0, 0), new Vec3(10, 0, 0)], STANDARD_LINIE);
    const e = neuerEditor(Bauwerk.leer().mit(l));
    expect(e.aendereMit((b) => b.ersetze((b.objekt('l') as Linie).mitParams({ ...STANDARD_LINIE, typ: 'zaun' })))).toBe(true);
    e.rueckgaengig();
    expect((e.bauwerk.objekt('l') as Linie).params.typ).toBe('weg');
  });
});
