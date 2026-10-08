import { describe, expect, it } from 'vitest';
import {
  istPlatzRegelName,
  istPlatzWertSchluessel,
  PLATZ_WERT_SCHLUESSEL,
  PLATZREGEL_NAMEN,
  PlatzregelEinstellungen,
} from './PlatzregelEinstellungen';

describe('PlatzregelEinstellungen', () => {
  it('standard: alles an, Werte aus constants.ts', () => {
    const e = PlatzregelEinstellungen.standard();
    expect(e.istStandard).toBe(true);
    expect(PLATZREGEL_NAMEN.every((n) => !e.istAus(n))).toBe(true);
    expect(e.wert('P1_MIN_ABSTAND_FEUER_ZELT_M')).toBe(5);
    expect(e.wert('P2_MIN_ABSTAND_FEUER_HOLZ_M')).toBe(5);
    expect(e.wert('P3_MIN_ABSTAND_ZELT_ZELT_M')).toBe(3);
    expect(e.wert('P4_MIN_ABSTAND_LATRINE_WASSER_M')).toBe(30);
    expect(e.wert('P5_MIN_ABSTAND_LATRINE_KUECHE_M')).toBe(20);
    expect(e.wert('P6_KRONENRADIUS_FAKTOR')).toBe(0.3);
    expect(PLATZ_WERT_SCHLUESSEL).toHaveLength(6);
  });

  it('mitAus schaltet eine Regel aus und wieder an', () => {
    const e = PlatzregelEinstellungen.standard().mitAus('P3', true);
    expect(e.istAus('P3')).toBe(true);
    expect(e.istStandard).toBe(false);
    expect(e.mitAus('P3', true)).toBe(e);
    expect(e.mitAus('P3', false).istStandard).toBe(true);
  });

  it('mitWert ändert den Wert; der Standardwert wird nicht gespeichert', () => {
    const e = PlatzregelEinstellungen.standard().mitWert('P1_MIN_ABSTAND_FEUER_ZELT_M', 4);
    expect(e.wert('P1_MIN_ABSTAND_FEUER_ZELT_M')).toBe(4);
    expect(e.mitWert('P1_MIN_ABSTAND_FEUER_ZELT_M', 4)).toBe(e);
    const zurueck = e.mitWert('P1_MIN_ABSTAND_FEUER_ZELT_M', 5);
    expect(zurueck.istStandard).toBe(true);
    expect(Object.keys(zurueck.werte)).toHaveLength(0);
  });

  it('von baut in einem Schritt', () => {
    const e = PlatzregelEinstellungen.von(['P2', 'P5'], { P4_MIN_ABSTAND_LATRINE_WASSER_M: 50 });
    expect(e.istAus('P2')).toBe(true);
    expect(e.istAus('P5')).toBe(true);
    expect(e.wert('P4_MIN_ABSTAND_LATRINE_WASSER_M')).toBe(50);
  });

  it.each([0, -1, NaN, Infinity])('Abstand %s wird abgelehnt', (w) => {
    expect(() => PlatzregelEinstellungen.standard().mitWert('P1_MIN_ABSTAND_FEUER_ZELT_M', w)).toThrow(new RangeError('Wert muss größer als 0 sein'));
  });

  it('Abstand über 500 m wird abgelehnt, 500 m gehen', () => {
    expect(() => PlatzregelEinstellungen.standard().mitWert('P4_MIN_ABSTAND_LATRINE_WASSER_M', 500.1)).toThrow(
      new RangeError('Abstand darf höchstens 500 m betragen'),
    );
    expect(PlatzregelEinstellungen.standard().mitWert('P4_MIN_ABSTAND_LATRINE_WASSER_M', 500).wert('P4_MIN_ABSTAND_LATRINE_WASSER_M')).toBe(500);
  });

  it.each([0, -0.1, 1.01, NaN])('Kronenfaktor %s wird abgelehnt', (w) => {
    expect(() => PlatzregelEinstellungen.standard().mitWert('P6_KRONENRADIUS_FAKTOR', w)).toThrow(new RangeError('Faktor muss zwischen 0 und 1 liegen'));
  });

  it('Kronenfaktor 1 geht', () => {
    expect(PlatzregelEinstellungen.standard().mitWert('P6_KRONENRADIUS_FAKTOR', 1).wert('P6_KRONENRADIUS_FAKTOR')).toBe(1);
  });

  it('von prüft auch beim Laden', () => {
    expect(() => PlatzregelEinstellungen.von([], { P3_MIN_ABSTAND_ZELT_ZELT_M: -2 })).toThrow(RangeError);
  });

  it('Typwächter', () => {
    expect(istPlatzRegelName('P6')).toBe(true);
    expect(istPlatzRegelName('R1')).toBe(false);
    expect(istPlatzRegelName(3)).toBe(false);
    expect(istPlatzWertSchluessel('P3_MIN_ABSTAND_ZELT_ZELT_M')).toBe(true);
    expect(istPlatzWertSchluessel('R3_MIN_HOEHE')).toBe(false);
  });
});
