import { describe, expect, it } from 'vitest';
import { R4_MAX_BEINWINKEL_GRAD, R7_MIN_HOEHE } from './constants';
import { REGEL_NAMEN, RegelEinstellungen, type WertSchluessel } from './RegelEinstellungen';

const standard = RegelEinstellungen.standard();

describe('RegelEinstellungen (Spec v3, D8)', () => {
  it('hat standardmäßig alle Regeln an und keine Werte gesetzt', () => {
    expect(standard.istStandard).toBe(true);
    expect(REGEL_NAMEN.filter((n) => standard.istAus(n))).toEqual([]);
    expect(standard.werte).toEqual({});
    expect(RegelEinstellungen.standard()).toBe(standard);
  });

  it('schaltet Regeln ab und wieder an, ohne sich selbst zu ändern', () => {
    const ohneR4 = standard.mitAus('R4', true);
    expect(ohneR4.istAus('R4')).toBe(true);
    expect(ohneR4.istStandard).toBe(false);
    expect(standard.istAus('R4')).toBe(false);
    expect(ohneR4.mitAus('R4', true)).toBe(ohneR4);
    expect(ohneR4.mitAus('R4', false).istStandard).toBe(true);
  });

  it('setzt Werte und liest sonst den Standard aus constants.ts', () => {
    const e = standard.mitWert('R4_MAX_BEINWINKEL_GRAD', 40);
    expect(e.wert('R4_MAX_BEINWINKEL_GRAD')).toBe(40);
    expect(e.werte).toEqual({ R4_MAX_BEINWINKEL_GRAD: 40 });
    expect(standard.wert('R4_MAX_BEINWINKEL_GRAD')).toBe(R4_MAX_BEINWINKEL_GRAD);
    expect(e.wert('R7_MIN_HOEHE')).toBe(R7_MIN_HOEHE);
  });

  it.each<[string, WertSchluessel, number, string]>([
    ['Höhe 0', 'R3_MIN_HOEHE', 0, 'Wert muss größer als 0 sein'],
    ['negative Höhe', 'R7_MIN_HOEHE', -1, 'Wert muss größer als 0 sein'],
    ['keine Zahl', 'R2_PLANAR_TOLERANZ_RELATIV', Number.NaN, 'Wert muss größer als 0 sein'],
    ['unendlich', 'R3_MAX_HOEHE_ZU_BREITE', Number.POSITIVE_INFINITY, 'Wert muss größer als 0 sein'],
    ['Winkel 0', 'R1_MIN_WINKEL_ZUR_EBENE_GRAD', 0, 'Winkel muss zwischen 0 und 90° liegen'],
    ['Winkel über 90°', 'R4_MAX_BEINWINKEL_GRAD', 95, 'Winkel muss zwischen 0 und 90° liegen'],
    ['R4 Untergrenze über der Obergrenze', 'R4_MIN_BEINWINKEL_GRAD', 40, 'Untergrenze muss kleiner als die Obergrenze sein'],
    ['R6 Untergrenze gleich der Obergrenze', 'R6_MIN_WINKEL_GRAD', 60, 'Untergrenze muss kleiner als die Obergrenze sein'],
  ])('lehnt ab: %s', (_name, schluessel, wert, meldung) => {
    expect(() => standard.mitWert(schluessel, wert)).toThrow(RangeError);
    expect(() => standard.mitWert(schluessel, wert)).toThrow(meldung);
  });

  it('prüft beim Bau in einem Schritt erst alle Werte, dann die Paare', () => {
    const e = RegelEinstellungen.von(['R2'], { R4_MIN_BEINWINKEL_GRAD: 40, R4_MAX_BEINWINKEL_GRAD: 45 });
    expect([e.wert('R4_MIN_BEINWINKEL_GRAD'), e.wert('R4_MAX_BEINWINKEL_GRAD'), e.istAus('R2')]).toEqual([40, 45, true]);
    expect(() => RegelEinstellungen.von([], { R6_MIN_WINKEL_GRAD: 50, R6_MAX_WINKEL_GRAD: 45 })).toThrow('Untergrenze muss kleiner als die Obergrenze sein');
  });
});
