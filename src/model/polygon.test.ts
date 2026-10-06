import { describe, expect, it } from 'vitest';
import { bboxMitte, flaeche, pfadLaenge, schneidetSichSelbst } from './polygon';
import { Vec3 } from './Vec3';

const p = (x: number, z: number): Vec3 => new Vec3(x, 0, z);

describe('flaeche (Shoelace)', () => {
  it('Rechteck 20 x 10 = 200, unabhängig von der Umlaufrichtung', () => {
    const r = [p(0, 0), p(20, 0), p(20, 10), p(0, 10)];
    expect(flaeche(r)).toBeCloseTo(200);
    expect(flaeche([...r].reverse())).toBeCloseTo(200);
  });
  it('Dreieck und konkaves L', () => {
    expect(flaeche([p(0, 0), p(4, 0), p(0, 3)])).toBeCloseTo(6);
    expect(flaeche([p(0, 0), p(4, 0), p(4, 2), p(2, 2), p(2, 4), p(0, 4)])).toBeCloseTo(12);
  });
  it('weniger als 3 Punkte: 0', () => {
    expect(flaeche([p(0, 0), p(1, 1)])).toBe(0);
  });
});

describe('schneidetSichSelbst', () => {
  it('einfache Vielecke schneiden sich nicht', () => {
    expect(schneidetSichSelbst([p(0, 0), p(4, 0), p(0, 3)])).toBe(false);
    expect(schneidetSichSelbst([p(0, 0), p(4, 0), p(4, 2), p(2, 2), p(2, 4), p(0, 4)])).toBe(false);
  });
  it('Schleife (Schmetterling) schneidet sich', () => {
    expect(schneidetSichSelbst([p(0, 0), p(4, 4), p(4, 0), p(0, 4)])).toBe(true);
  });
  it('eine Ecke, die eine nicht benachbarte Kante berührt, zählt als Schnitt', () => {
    expect(schneidetSichSelbst([p(0, 0), p(4, 0), p(4, 4), p(2, 0), p(0, 4)])).toBe(true);
  });
  it('zwei Ecken auf demselben Punkt (Sanduhr berührt sich) zählt als Schnitt', () => {
    expect(schneidetSichSelbst([p(0, 0), p(2, 2), p(4, 0), p(4, 4), p(2, 2), p(0, 4)])).toBe(true);
  });
  it('überlappende Kanten (alle Punkte auf einer Geraden) schneiden sich', () => {
    expect(schneidetSichSelbst([p(0, 0), p(2, 0), p(4, 0)])).toBe(true);
  });
  it('Spitze, die auf der Kante zurückläuft, schneidet sich', () => {
    expect(schneidetSichSelbst([p(0, 0), p(4, 0), p(2, 0), p(2, 3)])).toBe(true);
  });
  it('gerade durchlaufende Ecke (drei Punkte auf einer Kante) ist erlaubt', () => {
    expect(schneidetSichSelbst([p(0, 0), p(2, 0), p(4, 0), p(4, 3), p(0, 3)])).toBe(false);
  });
  it('doppelte Ecke hintereinander zählt als Schnitt', () => {
    expect(schneidetSichSelbst([p(0, 0), p(4, 0), p(4, 0), p(4, 3)])).toBe(true);
  });
});

describe('pfadLaenge und bboxMitte', () => {
  it('Länge eines offenen Linienzugs', () => {
    expect(pfadLaenge([p(0, 0), p(3, 0), p(3, 4)])).toBeCloseTo(7);
  });
  it('Mitte des umschließenden Rechtecks', () => {
    expect(bboxMitte([p(0, 0), p(4, 2), p(2, 6)]).toArray()).toEqual([2, 0, 3]);
  });
});
