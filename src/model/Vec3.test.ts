import { describe, expect, it } from 'vitest';
import { Vec3 } from './Vec3';

describe('Vec3', () => {
  it('addiert, subtrahiert und skaliert ohne sich selbst zu ändern', () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(4, 5, 6);
    expect(a.add(b).toArray()).toEqual([5, 7, 9]);
    expect(b.sub(a).toArray()).toEqual([3, 3, 3]);
    expect(a.scale(2).toArray()).toEqual([2, 4, 6]);
    expect(a.toArray()).toEqual([1, 2, 3]);
  });

  it('berechnet Skalar- und Kreuzprodukt', () => {
    const x = new Vec3(1, 0, 0);
    const y = new Vec3(0, 1, 0);
    expect(x.dot(y)).toBe(0);
    expect(x.cross(y).toArray()).toEqual([0, 0, 1]);
  });

  it('normiert und misst Abstände', () => {
    expect(new Vec3(3, 4, 0).length()).toBe(5);
    expect(new Vec3(0, 0, 2).normalize().toArray()).toEqual([0, 0, 1]);
    expect(new Vec3(1, 1, 1).distanceTo(new Vec3(1, 1, 3))).toBe(2);
  });

  it('wirft beim Normieren des Nullvektors', () => {
    expect(() => Vec3.NULL.normalize()).toThrow(RangeError);
  });

  it('vergleicht mit Toleranz und baut aus Arrays', () => {
    expect(new Vec3(1, 2, 3).equals(new Vec3(1, 2, 3 + 1e-12))).toBe(true);
    expect(Vec3.fromArray([7, 8, 9]).toArray()).toEqual([7, 8, 9]);
    expect(Vec3.fromArray([1]).toArray()).toEqual([1, 0, 0]);
    expect(Vec3.fromArray([]).toArray()).toEqual([0, 0, 0]);
    expect(Vec3.OBEN.toArray()).toEqual([0, 1, 0]);
  });

  it('dreht um die senkrechte Achse durch einen Punkt, ohne die Höhe zu ändern', () => {
    expect(new Vec3(1, 2, 0).gedrehtUmY(Math.PI / 2).equals(new Vec3(0, 2, 1), 1e-12)).toBe(true);
    expect(new Vec3(3, 1, 0).gedrehtUmY(Math.PI, new Vec3(2, 5, 0)).equals(new Vec3(1, 1, 0), 1e-12)).toBe(true);
  });
});
