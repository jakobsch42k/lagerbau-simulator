import { describe, expect, it } from 'vitest';
import { Baum } from './Baum';
import { STANDARD_BAUM } from './params';
import { Vec3 } from './Vec3';

const baum = new Baum('b', new Vec3(1, 0, 1), { durchmesser: 0.4, hoehe: 10 });

describe('Baum', () => {
  it('steht immer auf dem Boden', () => {
    expect(new Baum('x', new Vec3(1, 3, 1), STANDARD_BAUM).position.y).toBe(0);
  });

  it('misst den Abstand zur Stammoberfläche, über der Krone ist er unendlich', () => {
    expect(baum.abstandZumStamm(new Vec3(1.2, 1.5, 1))).toBeCloseTo(0, 9);
    expect(baum.abstandZumStamm(new Vec3(2, 1.5, 1))).toBeCloseTo(0.8, 9);
    expect(baum.abstandZumStamm(new Vec3(1, 1.5, 1))).toBeCloseTo(0.2, 9);
    expect(baum.abstandZumStamm(new Vec3(1.2, 11, 1))).toBe(Infinity);
  });

  it('lehnt unsinnige Maße ab', () => {
    expect(() => new Baum('x', Vec3.NULL, { durchmesser: 0, hoehe: 8 })).toThrow('Stammdurchmesser muss größer als 0 sein');
    expect(() => new Baum('x', Vec3.NULL, { durchmesser: 0.3, hoehe: -1 })).toThrow('Baumhöhe muss größer als 0 sein');
    expect(() => new Baum('x', Vec3.NULL, { durchmesser: 0.3, hoehe: Number.NaN })).toThrow(RangeError);
    expect(() => new Baum('x', new Vec3(Infinity, 0, 0), STANDARD_BAUM)).toThrow(RangeError);
  });

  it('ändert Maße, ohne sich selbst zu verändern', () => {
    const neu = baum.mitParams({ durchmesser: 0.5, hoehe: 12 });
    expect(neu).not.toBe(baum);
    expect(baum.params.durchmesser).toBe(0.4);
    expect(neu.params.hoehe).toBe(12);
    expect(neu.position.equals(baum.position)).toBe(true);
  });
});
