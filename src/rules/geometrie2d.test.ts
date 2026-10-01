import { describe, expect, it } from 'vitest';
import { konvexeHuelle, minimaleBreite, type P2 } from './geometrie2d';

describe('konvexeHuelle', () => {
  it('lässt innere Punkte weg', () => {
    const huelle = konvexeHuelle([[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]]);
    expect(huelle).toHaveLength(4);
    expect(huelle).not.toContainEqual([0.5, 0.5]);
  });

  it('liefert bei weniger als drei Punkten die Punkte selbst', () => {
    expect(konvexeHuelle([[1, 2]])).toEqual([[1, 2]]);
  });
});

describe('minimaleBreite', () => {
  it('ist beim Einheitsquadrat 1', () => {
    expect(minimaleBreite([[0, 0], [1, 0], [1, 1], [0, 1]])).toBeCloseTo(1, 12);
  });

  it('ist beim gleichseitigen Dreieck 1,5 × Umkreisradius', () => {
    const r = 0.7;
    const ecken: P2[] = [0, 1, 2].map((i) => [r * Math.cos((i * 2 * Math.PI) / 3), r * Math.sin((i * 2 * Math.PI) / 3)] as const);
    expect(minimaleBreite(ecken)).toBeCloseTo(1.5 * r, 12);
  });

  it('ist 0 für Punkte auf einer Linie oder zwei Punkte', () => {
    expect(minimaleBreite([[0, 0], [1, 1], [2, 2]])).toBe(0);
    expect(minimaleBreite([[0, 0], [0, 1.6]])).toBe(0);
  });
});
