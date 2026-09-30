import { describe, expect, it } from 'vitest';
import { BundFinder, clustereNachNaehe, mittelpunkt } from './Bund';
import { Dreibein } from './Dreibein';
import { STANDARD_DREIBEIN } from './params';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

const stange = (id: string, a: [number, number, number], b: [number, number, number]): Stange =>
  new Stange(id, Vec3.fromArray(a), Vec3.fromArray(b), 0.08);

describe('BundFinder', () => {
  const finder = new BundFinder();

  it('setzt einen Bund, wo sich zwei Stangen kreuzen', () => {
    const buende = finder.finde([stange('a', [-1, 1, 0], [1, 1, 0]), stange('b', [0, 0, 0], [0, 2, 0])]);
    expect(buende).toHaveLength(1);
    expect(buende[0]?.stangenIds).toEqual(['a', 'b']);
    expect(buende[0]?.position.equals(new Vec3(0, 1, 0))).toBe(true);
    expect(buende[0]?.enthaelt('a')).toBe(true);
    expect(buende[0]?.enthaelt('x')).toBe(false);
  });

  it('setzt keinen Bund zwischen Stangen, die sich nicht berühren', () => {
    expect(finder.finde([stange('a', [0, 0, 0], [0, 2, 0]), stange('b', [1, 0, 0], [1, 2, 0])])).toHaveLength(0);
  });

  it('respektiert die Toleranz', () => {
    const a = stange('a', [-1, 1, 0], [1, 1, 0]);
    expect(finder.finde([a, stange('b', [0, 0, 0.04], [0, 2, 0.04])])).toHaveLength(1);
    expect(finder.finde([a, stange('b', [0, 0, 0.06], [0, 2, 0.06])])).toHaveLength(0);
  });

  it('fasst die drei Beine eines Dreibeins an der Spitze zu einem Bund zusammen', () => {
    const d = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
    const buende = finder.finde(d.stangen());
    expect(buende).toHaveLength(1);
    expect(buende[0]?.stangenIds).toEqual(['d-bein-0', 'd-bein-1', 'd-bein-2']);
    expect(buende[0]?.position.distanceTo(d.spitze())).toBeLessThan(1e-9);
  });

  it('trennt weit auseinanderliegende Kreuzungen', () => {
    const buende = finder.finde([
      stange('a', [-1, 1, 0], [5, 1, 0]),
      stange('b', [0, 0, 0], [0, 2, 0]),
      stange('c', [4, 0, 0], [4, 2, 0]),
    ]);
    expect(buende).toHaveLength(2);
  });
});

describe('mittelpunkt', () => {
  it('mittelt Punkte', () => {
    expect(mittelpunkt([new Vec3(0, 0, 0), new Vec3(2, 4, 6)]).toArray()).toEqual([1, 2, 3]);
  });
});

describe('clustereNachNaehe', () => {
  it('fasst nahe Elemente in Eingabereihenfolge zusammen', () => {
    const punkte = [new Vec3(0, 0, 0), new Vec3(5, 0, 0), new Vec3(0.1, 0, 0), new Vec3(5.05, 0, 0)];
    const cluster = clustereNachNaehe(punkte, (p) => p, 0.15);
    expect(cluster).toHaveLength(2);
    expect(cluster[0]).toHaveLength(2);
    expect(cluster[1]).toHaveLength(2);
  });
});
