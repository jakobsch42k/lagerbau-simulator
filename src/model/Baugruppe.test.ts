import { describe, expect, it } from 'vitest';
import { ABock } from './ABock';
import { Dreibein } from './Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from './params';
import { Vec3 } from './Vec3';

const grad = (rad: number): number => (rad * 180) / Math.PI;

describe('Dreibein', () => {
  const d = new Dreibein('d', new Vec3(1, 0, 2), 0, STANDARD_DREIBEIN);

  it('berechnet die Höhe aus Stangenlänge, Überstand und Fußkreis', () => {
    expect(d.hoehe()).toBeCloseTo(Math.sqrt(2.2 ** 2 - 0.7 ** 2), 9);
    expect(d.spitze().equals(new Vec3(1, d.hoehe(), 2))).toBe(true);
  });

  it('erzeugt drei Beine voller Länge mit Füßen auf dem Fußkreis, die durch die Spitze laufen', () => {
    const beine = d.stangen();
    expect(beine.map((b) => b.id)).toEqual(['d-bein-0', 'd-bein-1', 'd-bein-2']);
    for (const b of beine) {
      expect(b.laenge).toBeCloseTo(2.4, 9);
      expect(b.start.y).toBe(0);
      expect(Math.hypot(b.start.x - 1, b.start.z - 2)).toBeCloseTo(0.7, 9);
      expect(b.naechsterPunkt(d.spitze()).distanceTo(d.spitze())).toBeCloseTo(0, 9);
      expect(b.gruppeId).toBe('d');
      expect(b.rolle).toBe('bein');
    }
  });

  it('liefert den Beinwinkel zur Senkrechten', () => {
    expect(d.beinwinkelGrad()).toBeCloseTo(grad(Math.asin(0.7 / 2.2)), 9);
  });

  it('lehnt unpassende oder nicht-positive Parameter ab', () => {
    expect(() => d.mitParams({ ...STANDARD_DREIBEIN, fusskreisradius: 2.2 })).toThrow(RangeError);
    expect(() => d.mitParams({ ...STANDARD_DREIBEIN, durchmesser: 0 })).toThrow(RangeError);
    expect(() => d.mitParams({ ...STANDARD_DREIBEIN, stangenlaenge: -1 })).toThrow(RangeError);
  });

  it('dreht, verschiebt und ändert Parameter ohne sich selbst zu ändern', () => {
    const g = d.gedreht(Math.PI / 2).verschoben(Vec3.NULL).mitParams({ ...STANDARD_DREIBEIN, fusskreisradius: 0.8 });
    expect(g.drehung).toBeCloseTo(Math.PI / 2);
    expect(g.position.equals(Vec3.NULL)).toBe(true);
    expect(g.params.fusskreisradius).toBe(0.8);
    expect(g.id).toBe('d');
    expect(d.drehung).toBe(0);
    expect(d.params.fusskreisradius).toBe(0.7);
  });
});

describe('ABock', () => {
  const a = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
  const h = Math.sqrt(2.2 ** 2 - 0.8 ** 2);

  it('berechnet die Höhe aus Stangenlänge und Fußabstand', () => {
    expect(a.hoehe()).toBeCloseTo(h, 9);
    expect(a.spitze().y).toBeCloseTo(h, 9);
  });

  it('setzt die Füße im Fußabstand entlang der Achse', () => {
    const [f0, f1] = a.fuesse();
    expect(f0.distanceTo(f1)).toBeCloseTo(1.6, 9);
    expect(f0.z).toBeCloseTo(-0.8, 9);
    expect(f1.z).toBeCloseTo(0.8, 9);
    expect(f0.x).toBeCloseTo(0, 9);
  });

  it('erzeugt zwei Beine und einen waagrechten Riegel auf Riegelhöhe', () => {
    const [b0, b1, riegel] = a.stangen();
    expect(b0.laenge).toBeCloseTo(2.4, 9);
    expect(b1.laenge).toBeCloseTo(2.4, 9);
    expect(riegel.id).toBe('a-riegel');
    expect(riegel.rolle).toBe('riegel');
    expect(riegel.start.y).toBeCloseTo(0.4, 9);
    expect(riegel.ende.y).toBeCloseTo(0.4, 9);
    expect(riegel.laenge).toBeCloseTo(1.6 * (1 - 0.4 / h) + 0.4, 9);
  });

  it('hat eine waagrechte Ebenennormale senkrecht zur Fußachse', () => {
    const n = a.ebenenNormale();
    const [f0, f1] = a.fuesse();
    expect(n.dot(f1.sub(f0))).toBeCloseTo(0, 9);
    expect(n.y).toBe(0);
    expect(n.length()).toBeCloseTo(1, 9);
  });

  it('liefert den Beinwinkel zur Senkrechten', () => {
    expect(a.beinwinkelGrad()).toBeCloseTo(grad(Math.asin(0.8 / 2.2)), 9);
  });

  it('lehnt Riegel über der Spitze, zu großen Fußabstand und Null-Werte ab', () => {
    expect(() => a.mitParams({ ...STANDARD_ABOCK, riegelhoehe: 3 })).toThrow(RangeError);
    expect(() => a.mitParams({ ...STANDARD_ABOCK, fussabstand: 5 })).toThrow(RangeError);
    expect(() => a.mitParams({ ...STANDARD_ABOCK, riegelhoehe: 0 })).toThrow(RangeError);
  });

  it('dreht und verschiebt ohne sich selbst zu ändern', () => {
    const g = a.gedreht(-Math.PI / 2).verschoben(new Vec3(3, 0, 0));
    expect(g.drehung).toBeCloseTo(0);
    expect(g.position.x).toBe(3);
    expect(a.drehung).toBeCloseTo(Math.PI / 2);
  });
});
