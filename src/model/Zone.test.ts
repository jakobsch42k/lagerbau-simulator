import { describe, expect, it } from 'vitest';
import type { ZoneParams } from './params';
import { Vec3 } from './Vec3';
import { Zone } from './Zone';

const p = (x: number, z: number): Vec3 => new Vec3(x, 0, z);
const PARAMS: ZoneParams = { name: 'Küche', farbe: '#4dabf7', deckkraft: 40 };
const QUADRAT = [p(0, 0), p(10, 0), p(10, 10), p(0, 10)];

describe('Zone', () => {
  it('Fläche und Eckenzahl', () => {
    const z = new Zone('z1', QUADRAT, PARAMS);
    expect(z.flaeche()).toBeCloseTo(100);
    expect(z.punkte).toHaveLength(4);
    expect(z.art).toBe('zone');
  });

  it('prüft alle Parameter mit deutschen Meldungen', () => {
    expect(() => new Zone('z', [p(0, 0), p(1, 0)], PARAMS)).toThrow('Eine Zone braucht mindestens 3 Ecken.');
    expect(() => new Zone('z', [p(0, 0), p(4, 4), p(4, 0), p(0, 4)], PARAMS)).toThrow('Die Zone darf sich nicht selbst schneiden.');
    expect(() => new Zone('z', QUADRAT, { ...PARAMS, name: '' })).toThrow('Name muss 1 bis 40 Zeichen lang sein');
    expect(() => new Zone('z', QUADRAT, { ...PARAMS, name: 'x'.repeat(41) })).toThrow('Name muss 1 bis 40 Zeichen lang sein');
    expect(() => new Zone('z', QUADRAT, { ...PARAMS, farbe: 'rot' })).toThrow('Farbe muss ein Hexwert');
    expect(() => new Zone('z', QUADRAT, { ...PARAMS, deckkraft: -1 })).toThrow('Deckkraft muss zwischen 0 und 100 % liegen');
    expect(() => new Zone('z', QUADRAT, { ...PARAMS, deckkraft: 101 })).toThrow('Deckkraft muss zwischen 0 und 100 % liegen');
    expect(() => new Zone('z', QUADRAT, { ...PARAMS, deckkraft: Number.NaN })).toThrow('Deckkraft muss zwischen 0 und 100 % liegen');
    expect(() => new Zone('z', [p(0, 0), p(Number.NaN, 0), p(1, 1)], PARAMS)).toThrow('Die Punkte müssen endlich sein');
  });

  it('Deckkraft 0 und 100 sind erlaubt', () => {
    expect(new Zone('z', QUADRAT, { ...PARAMS, deckkraft: 0 }).params.deckkraft).toBe(0);
    expect(new Zone('z', QUADRAT, { ...PARAMS, deckkraft: 100 }).params.deckkraft).toBe(100);
  });

  it('liegt am Boden: y wird 0', () => {
    const z = new Zone('z', [new Vec3(0, 2, 0), new Vec3(4, 3, 0), new Vec3(0, 1, 4)], PARAMS);
    expect(z.punkte.every((q) => q.y === 0)).toBe(true);
  });

  it('verschobenUm bewegt alle Ecken waagrecht, das Original bleibt', () => {
    const z = new Zone('z', QUADRAT, PARAMS);
    const v = z.verschobenUm(new Vec3(1, 5, 2));
    expect(v.punkte.map((q) => q.toArray())).toEqual([
      [1, 0, 2],
      [11, 0, 2],
      [11, 0, 12],
      [1, 0, 12],
    ]);
    expect(z.punkte[0]?.toArray()).toEqual([0, 0, 0]);
    expect(v.flaeche()).toBeCloseTo(100);
  });

  it('gedreht dreht um den eigenen Drehpunkt (Mitte), Fläche bleibt', () => {
    const z = new Zone('z', QUADRAT, PARAMS);
    expect(z.drehpunkt().toArray()).toEqual([5, 0, 5]);
    const d = z.gedreht(Math.PI / 2);
    expect(d.drehpunkt().x).toBeCloseTo(5);
    expect(d.drehpunkt().z).toBeCloseTo(5);
    expect(d.punkte[0]?.x).toBeCloseTo(10);
    expect(d.punkte[0]?.z).toBeCloseTo(0);
    expect(d.flaeche()).toBeCloseTo(100);
  });

  it('gedreht um einen anderen Punkt', () => {
    const d = new Zone('z', QUADRAT, PARAMS).gedreht(Math.PI, p(0, 0));
    expect(d.punkte[1]?.x).toBeCloseTo(-10);
  });

  it('mitParams, mitId, mitEcken behalten den Rest und prüfen neu', () => {
    const z = new Zone('z', QUADRAT, PARAMS);
    expect(z.mitParams({ ...PARAMS, name: 'Wiese' }).params.name).toBe('Wiese');
    expect(z.mitId('neu').id).toBe('neu');
    expect(z.mitId('neu').ids()).toEqual(['neu']);
    expect(z.mitEcken([p(0, 0), p(2, 0), p(0, 2)]).flaeche()).toBeCloseTo(2);
    expect(() => z.mitEcken([p(0, 0), p(2, 0)])).toThrow('Eine Zone braucht mindestens 3 Ecken.');
  });

  it('platzPunkte sind die Ecken', () => {
    expect(new Zone('z', QUADRAT, PARAMS).platzPunkte()).toHaveLength(4);
  });
});
