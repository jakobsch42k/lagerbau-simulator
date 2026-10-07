import { describe, expect, it } from 'vitest';
import { Vec3 } from '../model/Vec3';
import { Messung } from './Messung';

describe('Messung', () => {
  it('zeigt Länge und waagrechten Abstand wie in der Spec', () => {
    const m = new Messung(new Vec3(0, 0, 0), new Vec3(3, 0.5, 4));
    expect(m.laenge).toBeCloseTo(Math.hypot(5, 0.5));
    expect(m.waagrecht).toBe(5);
    expect(m.text).toBe('5.02 m (waagrecht 5.00 m)');
  });

  it('hat nach dem ersten Klick noch keine Länge', () => {
    const m = new Messung(Vec3.NULL, null);
    expect([m.laenge, m.waagrecht, m.text]).toEqual([null, null, '']);
  });
});
