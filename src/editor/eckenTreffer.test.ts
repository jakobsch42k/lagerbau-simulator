import { describe, expect, it } from 'vitest';
import { naheKante, naherGriff } from './eckenTreffer';

const px = (x: number, y: number) => ({ x, y });

describe('Griff- und Kantentreffer am Bildschirm', () => {
  const ecken = [px(0, 0), px(100, 0), px(100, 100), px(0, 100)];

  it('naherGriff: der nächste Griff im Radius, sonst null', () => {
    expect(naherGriff(px(98, 3), ecken, 10)).toBe(1);
    expect(naherGriff(px(50, 50), ecken, 10)).toBeNull();
    expect(naherGriff(px(5, 5), [px(8, 5), px(2, 5)], 10)).toBe(1); // bei zwei Treffern gewinnt der nähere
  });

  it('naheKante: Index der Kante (Start-Ecke); die Schlusskante gibt es nur bei geschlossenen Zügen', () => {
    expect(naheKante(px(50, 3), ecken, true, 10)).toBe(0);
    expect(naheKante(px(97, 50), ecken, true, 10)).toBe(1);
    expect(naheKante(px(3, 50), ecken, true, 10)).toBe(3);
    expect(naheKante(px(3, 50), ecken, false, 10)).toBeNull();
    expect(naheKante(px(50, 50), ecken, true, 10)).toBeNull();
  });

  it('naheKante: ein Punkt neben dem Ende einer Kante zählt nicht (Strecke, keine Gerade)', () => {
    expect(naheKante(px(150, 0), [px(0, 0), px(100, 0)], false, 10)).toBeNull();
  });

  it('naheKante: bei mehreren Kanten gewinnt die nähere', () => {
    expect(naheKante(px(50, 4), [px(0, 0), px(100, 0), px(100, 10)], false, 10)).toBe(0);
  });
});
