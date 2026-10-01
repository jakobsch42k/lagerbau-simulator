import { describe, expect, it } from 'vitest';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';

describe('Seil', () => {
  it('misst Länge, Winkel zum Boden und tiefsten Punkt', () => {
    const s = new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
    expect(s.laenge).toBeCloseTo(2 * Math.SQRT2, 9);
    expect(s.winkelZumBodenGrad).toBeCloseTo(45, 9);
    expect(s.tiefsteHoehe).toBe(0);
    expect(s.endpunkte()).toEqual([s.start, s.ende]);
  });

  it('hat waagrecht 0° und senkrecht 90°', () => {
    expect(new Seil('w', new Vec3(0, 1, 0), new Vec3(3, 1, 0)).winkelZumBodenGrad).toBeCloseTo(0, 9);
    expect(new Seil('v', Vec3.NULL, new Vec3(0, 2, 0)).winkelZumBodenGrad).toBeCloseTo(90, 9);
  });

  it('lehnt zu kurze und nicht endliche Seile ab', () => {
    expect(() => new Seil('k', Vec3.NULL, new Vec3(0.2, 0, 0))).toThrow('Ein Seil muss mindestens 0.3 m lang sein');
    expect(() => new Seil('n', Vec3.NULL, new Vec3(Number.NaN, 0, 0))).toThrow(RangeError);
    expect(() => new Seil('i', Vec3.NULL, new Vec3(Infinity, 0, 0))).toThrow(RangeError);
  });
});
