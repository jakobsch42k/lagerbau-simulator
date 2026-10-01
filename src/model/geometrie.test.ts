import { describe, expect, it } from 'vitest';
import { clamp, naechstePunkte } from './geometrie';
import { Vec3 } from './Vec3';

describe('clamp', () => {
  it('begrenzt auf das Intervall', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(3, 0, 1)).toBe(1);
  });
});

describe('naechstePunkte', () => {
  it('findet den Schnittpunkt sich kreuzender Strecken', () => {
    const r = naechstePunkte(new Vec3(-1, 0, 0), new Vec3(1, 0, 0), new Vec3(0, -1, 0), new Vec3(0, 1, 0));
    expect(r.abstand).toBeCloseTo(0, 12);
    expect(r.a.equals(Vec3.NULL)).toBe(true);
  });

  it('misst windschiefe Strecken', () => {
    const r = naechstePunkte(new Vec3(-1, 0, 0), new Vec3(1, 0, 0), new Vec3(0, 1, -1), new Vec3(0, 1, 1));
    expect(r.abstand).toBeCloseTo(1, 12);
    expect(r.a.equals(new Vec3(0, 0, 0))).toBe(true);
    expect(r.b.equals(new Vec3(0, 1, 0))).toBe(true);
  });

  it('misst parallele Strecken', () => {
    const r = naechstePunkte(new Vec3(0, 0, 0), new Vec3(2, 0, 0), new Vec3(0, 0.1, 0), new Vec3(2, 0.1, 0));
    expect(r.abstand).toBeCloseTo(0.1, 12);
  });

  it('klemmt auf die Streckenenden', () => {
    const r = naechstePunkte(new Vec3(0, 0, 0), new Vec3(1, 0, 0), new Vec3(2, 1, 0), new Vec3(3, 1, 0));
    expect(r.a.equals(new Vec3(1, 0, 0))).toBe(true);
    expect(r.b.equals(new Vec3(2, 1, 0))).toBe(true);
    expect(r.abstand).toBeCloseTo(Math.SQRT2, 12);
  });

  it('klemmt t nach oben, wenn die zweite Strecke vor der ersten endet', () => {
    const r = naechstePunkte(new Vec3(0, 0, 0), new Vec3(1, 0, 0), new Vec3(-3, 1, 0), new Vec3(-2, 1, 0));
    expect(r.a.equals(new Vec3(0, 0, 0))).toBe(true);
    expect(r.b.equals(new Vec3(-2, 1, 0))).toBe(true);
  });
});
