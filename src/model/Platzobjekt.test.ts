import { describe, expect, it } from 'vitest';
import { Platzobjekt } from './Platzobjekt';
import type { PlatzobjektParams } from './params';
import { Vec3 } from './Vec3';

const RECHTECK: PlatzobjektParams = { vorlage: 'holzlager', name: 'Holzlager', form: 'rechteck', breite: 3, laenge: 2, hoehe: 1, farbe: '#8b5a2b' };
const KREIS: PlatzobjektParams = { vorlage: 'feuerstelle', name: 'Feuerstelle', form: 'kreis', breite: 1.5, laenge: 1.5, hoehe: 0.3, farbe: '#e8590c' };
const istBei = (p: Vec3 | undefined, x: number, y: number, z: number): void => {
  expect(p?.equals(new Vec3(x, y, z), 1e-9), `${p?.toArray().join(', ')} ≠ ${x}, ${y}, ${z}`).toBe(true);
};

describe('Platzobjekt: Parameterprüfung', () => {
  const mit = (aenderung: Partial<PlatzobjektParams>, p: PlatzobjektParams = RECHTECK): Platzobjekt =>
    new Platzobjekt('p', Vec3.NULL, { ...p, ...aenderung });

  it.each([
    ['Vorlage leer', { vorlage: '' }, 'Vorlage fehlt'],
    ['Name leer', { name: '' }, 'Name muss 1 bis 40 Zeichen lang sein'],
    ['Name nur Leerzeichen', { name: '   ' }, 'Name muss 1 bis 40 Zeichen lang sein'],
    ['Name zu lang', { name: 'x'.repeat(41) }, 'Name muss 1 bis 40 Zeichen lang sein'],
    ['Breite 0', { breite: 0 }, 'Breite muss größer als 0 sein'],
    ['Breite NaN', { breite: Number.NaN }, 'Breite muss größer als 0 sein'],
    ['Länge 0', { laenge: 0 }, 'Länge muss größer als 0 sein'],
    ['Höhe negativ', { hoehe: -0.1 }, 'Höhe darf nicht negativ sein'],
    ['Höhe NaN', { hoehe: Number.NaN }, 'Höhe darf nicht negativ sein'],
    ['Farbe kein Hexwert', { farbe: 'rot' }, 'Farbe muss ein Hexwert wie #e8590c sein'],
    ['Farbe zu kurz', { farbe: '#fff' }, 'Farbe muss ein Hexwert wie #e8590c sein'],
  ])('lehnt ab: %s', (_n, aenderung, text) => {
    expect(() => mit(aenderung)).toThrow(new RangeError(text));
  });

  it('nennt beim Kreis den Durchmesser und prüft die Länge nicht', () => {
    expect(() => mit({ breite: 0 }, KREIS)).toThrow('Durchmesser muss größer als 0 sein');
    expect(mit({ laenge: 0 }, KREIS).params.laenge).toBe(0);
  });

  it('lehnt unbekannte Formen, Position und Drehung ab', () => {
    expect(() => mit({ form: 'dreieck' as 'kreis' })).toThrow('Form muss Kreis oder Rechteck sein');
    expect(() => new Platzobjekt('p', new Vec3(Number.NaN, 0, 0), RECHTECK)).toThrow('Die Position muss endlich sein');
    expect(() => new Platzobjekt('p', Vec3.NULL, RECHTECK, Number.NaN)).toThrow('Drehung muss eine endliche Zahl sein');
  });

  it('erlaubt Höhe 0 und Name mit 40 Zeichen', () => {
    expect(mit({ hoehe: 0 }).params.hoehe).toBe(0);
    expect(mit({ name: 'x'.repeat(40) }).params.name).toHaveLength(40);
  });
});

describe('Platzobjekt: Lage', () => {
  const p = new Platzobjekt('p', new Vec3(2, 0, 0), RECHTECK);

  it('kennt Art, ids und Drehpunkt', () => {
    expect(p.art).toBe('platzobjekt');
    expect(p.ids()).toEqual(['p']);
    istBei(p.drehpunkt(), 2, 0, 0);
  });

  it('bleibt beim Verschieben am Boden', () => {
    const v = p.verschobenUm(new Vec3(1, 3, -1));
    expect(v).toBeInstanceOf(Platzobjekt);
    istBei(v.position, 3, 0, -1);
    expect(v.params).toBe(p.params);
  });

  it('dreht um die eigene Position (Winkel wächst) oder um einen fremden Drehpunkt', () => {
    const g = p.gedreht(Math.PI / 2);
    istBei(g.position, 2, 0, 0);
    expect(g.drehungRad).toBeCloseTo(Math.PI / 2);
    const f = p.gedreht(Math.PI / 2, Vec3.NULL);
    istBei(f.position, 0, 0, 2);
    expect(f.drehungRad).toBeCloseTo(Math.PI / 2);
  });

  it('mitId und mitParams behalten Lage und Drehung', () => {
    const q = p.gedreht(0.5).mitId('q');
    expect(q.id).toBe('q');
    expect(q.drehungRad).toBeCloseTo(0.5);
    expect(q.mitParams(KREIS).params).toBe(KREIS);
    expect(q.mitParams(KREIS).drehungRad).toBeCloseTo(0.5);
  });

  it('hat als Platzpunkte die Ecken des Rechtecks bzw. vier Punkte am Kreis, mit der Drehung', () => {
    const ecken = p.platzPunkte();
    expect(ecken).toHaveLength(4);
    istBei(ecken[0], 3.5, 0, 1);
    istBei(ecken[2], 0.5, 0, -1);
    const kreis = new Platzobjekt('k', Vec3.NULL, KREIS, Math.PI / 2).platzPunkte();
    expect(kreis).toHaveLength(4);
    istBei(kreis[0], 0, 0, 0.75);
  });
});
