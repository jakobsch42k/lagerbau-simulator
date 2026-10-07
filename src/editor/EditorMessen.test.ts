import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Baum } from '../model/Baum';
import { STANDARD_BAUM } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { R4_MAX_BEINWINKEL_GRAD } from '../rules/constants';
import { BauwerkSerializer } from '../share/BauwerkSerializer';
import { Editor } from './Editor';
import type { Treffer } from './SnapService';

const serialisierer = new BauwerkSerializer();
const boden = (x: number, z: number): Treffer => ({ art: 'boden', punkt: new Vec3(x, 0, z) });
const spitzeTreffer = (p: Vec3): Treffer => ({ art: 'objekt', objektArt: 'dreibein', id: 'dreibein-s0', punkt: p });
const abockSpitze = kochstelle().gruppe('abock')!.spitze();
const dreibeinSpitze = kochstelle().gruppe('dreibein')!.spitze();

describe('Werkzeug Messen (Spec E1, D5)', () => {
  it('misst zwischen zwei Spitzen: Länge und waagrechter Abstand', () => {
    const e = new Editor(kochstelle());
    e.waehleWerkzeug('messen');
    e.klick(spitzeTreffer(abockSpitze));
    expect(e.zustand().messung?.bis).toBeNull();
    expect(e.zustand().stangenStart?.equals(abockSpitze, 1e-9)).toBe(true);
    e.klick(spitzeTreffer(dreibeinSpitze));
    const m = e.zustand().messung!;
    expect(m.laenge).toBeCloseTo(abockSpitze.distanceTo(dreibeinSpitze), 9);
    expect(m.waagrecht).toBeCloseTo(Math.hypot(dreibeinSpitze.x - abockSpitze.x, dreibeinSpitze.z - abockSpitze.z), 9);
    expect(m.text).toMatch(/^\d+\.\d\d m \(waagrecht \d+\.\d\d m\)$/);
    expect(e.zustand().stangenStart).toBeNull();
  });

  it('ändert das Bauwerk nicht und legt keinen Undo-Schritt an', () => {
    const b = kochstelle();
    const e = new Editor(b);
    e.waehleWerkzeug('messen');
    e.klick(boden(0, 0));
    e.klick(boden(3, 4));
    expect(e.bauwerk).toBe(b);
    expect(e.zustand().kannRueckgaengig).toBe(false);
    expect(e.zustand().messung?.laenge).toBe(5);
  });

  it('fängt am Boden aufs Raster', () => {
    const e = new Editor(kochstelle());
    e.waehleWerkzeug('messen');
    e.klick(boden(10.04, 10));
    e.klick(boden(13.04, 14));
    expect(e.zustand().messung?.laenge).toBeCloseTo(5, 9);
  });

  it('bleibt sichtbar, bis neu gemessen wird; der nächste Klick beginnt neu', () => {
    const e = new Editor(kochstelle());
    e.waehleWerkzeug('messen');
    e.klick(boden(0, 0));
    e.klick(boden(3, 4));
    e.klick(boden(10, 10));
    expect(e.zustand().messung?.von.equals(new Vec3(10, 0, 10), 1e-9)).toBe(true);
    expect(e.zustand().messung?.bis).toBeNull();
  });

  it('Esc löscht die Messung', () => {
    const e = new Editor(kochstelle());
    e.waehleWerkzeug('messen');
    e.klick(boden(0, 0));
    e.klick(boden(3, 4));
    e.taste('Escape', false);
    expect(e.zustand().messung).toBeNull();
  });

  it('der Wechsel des Werkzeugs löscht die Messung', () => {
    const e = new Editor(kochstelle());
    e.waehleWerkzeug('messen');
    e.klick(boden(0, 0));
    e.klick(boden(3, 4));
    e.waehleWerkzeug('auswahl');
    expect(e.zustand().messung).toBeNull();
  });

  it('Ziehen beginnt im Messen-Werkzeug nicht', () => {
    const e = new Editor(kochstelle());
    e.waehleWerkzeug('messen');
    expect(e.beginneZiehen({ art: 'objekt', objektArt: 'stange', id: 'first', punkt: Vec3.NULL }, Vec3.NULL)).toBe(false);
  });
});

describe('Rahmen-Auswahl im Editor', () => {
  const baum = new Baum('baum', new Vec3(10, 0, 10), STANDARD_BAUM);
  const rechteck = { minX: -3, maxX: 3.5, minZ: -3, maxZ: 3 };

  it('wählt die Objekte im Rechteck', () => {
    const e = new Editor(kochstelle().mit(baum));
    e.waehleImRahmen(rechteck);
    expect([...e.zustand().ausgewaehlt]).toEqual(['abock', 'dreibein', 'first']);
  });

  it('wählt nur im Auswahl-Werkzeug', () => {
    const e = new Editor(kochstelle());
    e.waehleWerkzeug('messen');
    e.waehleImRahmen(rechteck);
    expect(e.zustand().ausgewaehlt.size).toBe(0);
  });

  it('die Auswahl lässt sich danach mit den Pfeiltasten verschieben (ein Undo-Schritt je Taste)', () => {
    const e = new Editor(kochstelle());
    e.waehleImRahmen(rechteck);
    e.setzeBlickrichtung(new Vec3(0, 0, -1));
    e.taste('ArrowUp', false, true);
    expect(e.bauwerk.gruppe('abock')!.position.z).toBeCloseTo(-1, 9);
    e.rueckgaengig();
    expect(e.bauwerk.gruppe('abock')!.position.z).toBeCloseTo(0, 9);
  });
});

describe('Daten (Spec E1, D6) und Regelwert gleich dem Standard', () => {
  it('Messen, Zwischenablage und Rahmen verändern das gespeicherte Bauwerk nicht', () => {
    const b = kochstelle();
    const vorher = JSON.stringify(serialisierer.zuJson(b));
    const e = new Editor(b);
    e.waehleImRahmen({ minX: -3, maxX: 4, minZ: -3, maxZ: 3 });
    e.kopiereAuswahl();
    e.waehleWerkzeug('messen');
    e.klick(boden(0, 0));
    e.klick(boden(3, 4));
    expect(JSON.stringify(serialisierer.zuJson(e.bauwerk))).toBe(vorher);
  });

  it('der Standardwert im Regeln-Feld erzeugt weder ein regeln-Feld noch einen Undo-Schritt', () => {
    const e = new Editor(kochstelle());
    const ok = e.aendereMit((b) => b.mitRegelEinstellungen(b.regelEinstellungen.mitWert('R4_MAX_BEINWINKEL_GRAD', R4_MAX_BEINWINKEL_GRAD)));
    expect(ok).toBe(true);
    expect(e.zustand().kannRueckgaengig).toBe(false);
    expect(serialisierer.zuJson(e.bauwerk)).not.toHaveProperty('regeln');
  });

  it('ein abweichender Wert ist ein Undo-Schritt, zurück auf den Standard streicht das regeln-Feld wieder', () => {
    const e = new Editor(kochstelle());
    e.aendereMit((b) => b.mitRegelEinstellungen(b.regelEinstellungen.mitWert('R4_MAX_BEINWINKEL_GRAD', 40)));
    e.aendereMit((b) => b.mitRegelEinstellungen(b.regelEinstellungen.mitWert('R4_MAX_BEINWINKEL_GRAD', R4_MAX_BEINWINKEL_GRAD)));
    expect(serialisierer.zuJson(e.bauwerk)).not.toHaveProperty('regeln');
  });
});
