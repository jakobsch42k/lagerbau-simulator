import { describe, expect, it } from 'vitest';
import { ART_NAMEN } from './LagerObjekt';
import type { ZeltParams } from './params';
import { Vec3 } from './Vec3';
import { Zelt } from './Zelt';
import { JURTE6, SATTEL_KLEIN as SATTEL } from './Zelt.testdaten';

const fehler = (aenderung: Partial<ZeltParams>): string => {
  try {
    new Zelt('z', Vec3.NULL, { ...JURTE6, ...aenderung });
  } catch (e) {
    expect(e).toBeInstanceOf(RangeError);
    return (e as Error).message;
  }
  return '';
};

describe('Zelt: Prüfung (Spec E4, D1)', () => {
  it('ist eine eigene Art', () => {
    expect(ART_NAMEN).toContain('zelt');
    expect(new Zelt('z', Vec3.NULL, JURTE6).art).toBe('zelt');
  });

  it('wirft die deutschen Meldungen der Spec', () => {
    expect(fehler({ name: '' })).toBe('Name muss 1 bis 40 Zeichen lang sein.');
    expect(fehler({ name: 'x'.repeat(41) })).toBe('Name muss 1 bis 40 Zeichen lang sein.');
    expect(fehler({ durchmesser: 0 })).toBe('Durchmesser muss größer als 0 sein.');
    expect(fehler({ durchmesser: 50.1 })).toBe('Maß darf höchstens 50 m betragen.');
    expect(fehler({ ecken: 5 })).toBe('Ecken: ganze Zahl von 6 bis 24.');
    expect(fehler({ ecken: 25 })).toBe('Ecken: ganze Zahl von 6 bis 24.');
    expect(fehler({ ecken: 7.5 })).toBe('Ecken: ganze Zahl von 6 bis 24.');
    expect(fehler({ wandhoehe: 0 })).toBe('Wandhöhe muss größer als 0 sein.');
    expect(fehler({ firsthoehe: 0 })).toBe('Firsthöhe muss größer als 0 sein.');
    expect(fehler({ firsthoehe: 51 })).toBe('Maß darf höchstens 50 m betragen.');
    expect(fehler({ firsthoehe: 1.6 })).toBe('Firsthöhe muss mindestens so hoch wie die Wandhöhe sein.');
    expect(fehler({ abspannungen: -1 })).toBe('Abspannungen: ganze Zahl von 0 bis 100.');
    expect(fehler({ abspannungen: 101 })).toBe('Abspannungen: ganze Zahl von 0 bis 100.');
    expect(fehler({ abspannungen: 2.5 })).toBe('Abspannungen: ganze Zahl von 0 bis 100.');
    expect(fehler({ seillaenge: 0 })).toBe('Seillänge muss größer als 0 sein.');
    expect(fehler({ haringAbstand: -0.1 })).toBe('Haring-Abstand darf nicht negativ sein.');
    expect(fehler({ haringAbstand: 20.5 })).toBe('Maß darf höchstens 50 m betragen.');
    expect(fehler({ farbe: 'rot' })).toBe('Ungültige Farbe.');
  });

  it('nimmt die Grenzwerte an', () => {
    expect(fehler({ durchmesser: 50, ecken: 24, abspannungen: 100, haringAbstand: 0 })).toBe('');
    expect(fehler({ ecken: 6, abspannungen: 0, firsthoehe: 1.65 })).toBe('');
    expect(fehler({ haringAbstand: 20 })).toBe('');
  });

  it('prüft Länge und Breite nur bei Doppelkegel und Sattel, Durchmesser und Ecken nur bei rund', () => {
    expect(fehler({ aufbau: 'sattel', laenge: 0 })).toBe('Länge muss größer als 0 sein.');
    expect(fehler({ aufbau: 'doppelkegel', breite: 0 })).toBe('Breite muss größer als 0 sein.');
    expect(fehler({ aufbau: 'sattel', breite: 51 })).toBe('Maß darf höchstens 50 m betragen.');
    expect(fehler({ aufbau: 'sattel', durchmesser: 0, ecken: 3 })).toBe('');
    expect(fehler({ aufbau: 'rund', laenge: 0, breite: 0 })).toBe('');
  });

  it('lehnt unbekannte Form, fehlende Vorlage, falsche Wände und unendliche Lage ab', () => {
    expect(fehler({ aufbau: 'kugel' as never })).toBe('Ungültige Form.');
    expect(fehler({ vorlage: '' })).toBe('Vorlage fehlt.');
    expect(fehler({ waende: [true, true] as never })).toBe('Wände: drei Werte, je an oder aus.');
    expect(() => new Zelt('z', new Vec3(Infinity, 0, 0), JURTE6)).toThrow(RangeError);
    expect(() => new Zelt('z', Vec3.NULL, JURTE6, Number.NaN)).toThrow(RangeError);
  });
});

describe('Zelt: Lage', () => {
  const z = new Zelt('z', new Vec3(2, 0, 1), SATTEL, 0.5);

  it('ids, mitId, mitParams, drehpunkt', () => {
    expect(z.ids()).toEqual(['z']);
    expect(z.mitId('q').id).toBe('q');
    expect(z.mitId('q').drehungRad).toBe(0.5);
    expect(z.mitParams({ ...SATTEL, name: 'Neu' }).params.name).toBe('Neu');
    expect(z.drehpunkt().equals(z.position)).toBe(true);
  });

  it('verschobenUm bleibt am Boden', () => {
    const v = z.verschobenUm(new Vec3(1, 5, 1));
    expect(v.position.toArray()).toEqual([3, 0, 2]);
    expect(v.drehungRad).toBe(0.5);
  });

  it('gedreht ohne Drehpunkt dreht nur die Drehung', () => {
    const g = z.gedreht(0.25);
    expect(g.drehungRad).toBeCloseTo(0.75, 12);
    expect(g.position.equals(z.position)).toBe(true);
  });

  it('gedreht um einen Punkt bewegt die Position mit', () => {
    const g = new Zelt('z', new Vec3(2, 0, 0), SATTEL).gedreht(Math.PI / 2, Vec3.NULL);
    expect(g.position.equals(new Vec3(0, 0, 2), 1e-9)).toBe(true);
    expect(g.drehungRad).toBeCloseTo(Math.PI / 2, 12);
  });

  it('platzPunkte = Umriss plus Haringe', () => {
    expect(z.platzPunkte()).toHaveLength(4 + 4);
    const keine = new Zelt('z', Vec3.NULL, { ...SATTEL, abspannungen: 0 });
    expect(keine.platzPunkte()).toHaveLength(4);
  });
});
