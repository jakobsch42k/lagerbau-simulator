import { describe, expect, it } from 'vitest';
import { Fuss } from './Fuss';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

describe('Stange', () => {
  const s = new Stange('s', new Vec3(0, 0, 0), new Vec3(0, 2, 0), 0.08);

  it('kennt Länge, Richtung und Standardwerte', () => {
    expect(s.laenge).toBe(2);
    expect(s.richtung.toArray()).toEqual([0, 1, 0]);
    expect(s.rolle).toBe('frei');
    expect(s.gruppeId).toBeNull();
    expect(s.endpunkte()).toEqual([s.start, s.ende]);
  });

  it('projiziert Punkte auf die Achse und klemmt an den Enden', () => {
    expect(s.naechsterPunkt(new Vec3(1, 1, 0)).toArray()).toEqual([0, 1, 0]);
    expect(s.naechsterPunkt(new Vec3(0, 5, 0)).toArray()).toEqual([0, 2, 0]);
  });

  it('lehnt zu kurze Stangen und nicht-positive Durchmesser ab', () => {
    expect(() => new Stange('k', Vec3.NULL, new Vec3(0, 0.1, 0), 0.08)).toThrow(RangeError);
    expect(() => new Stange('d', Vec3.NULL, new Vec3(0, 1, 0), 0)).toThrow(RangeError);
    expect(() => new Stange('n', Vec3.NULL, new Vec3(0, 1, 0), Number.NaN)).toThrow(RangeError);
  });

  it('baut eine Stange zwischen zwei Punkten mit Überstand an beiden Enden', () => {
    const z = Stange.zwischen('z', new Vec3(0, 1, 0), new Vec3(2, 1, 0), 0.08);
    expect(z.start.equals(new Vec3(-0.2, 1, 0))).toBe(true);
    expect(z.ende.equals(new Vec3(2.2, 1, 0))).toBe(true);
  });

  it('lässt den Überstand an einem Bodenende weg', () => {
    const z = Stange.zwischen('z', new Vec3(0, 0, 0), new Vec3(0, 2, 0), 0.08, 0, 0.2);
    expect(z.start.equals(Vec3.NULL)).toBe(true);
    expect(z.ende.equals(new Vec3(0, 2.2, 0))).toBe(true);
  });

  it('lehnt zu nahe Punkte ab', () => {
    expect(() => Stange.zwischen('z', Vec3.NULL, new Vec3(0.1, 0, 0), 0.08)).toThrow(RangeError);
  });

  it('ändert den Durchmesser ohne sich selbst zu ändern', () => {
    expect(s.mitDurchmesser(0.1).durchmesser).toBe(0.1);
    expect(s.durchmesser).toBe(0.08);
  });
});

describe('Fuss', () => {
  it('erkennt Stangenenden am Boden', () => {
    expect(Fuss.von(new Stange('a', Vec3.NULL, new Vec3(0, 2, 0), 0.08))).toHaveLength(1);
    expect(Fuss.von(new Stange('b', Vec3.NULL, new Vec3(2, 0, 0), 0.08))).toHaveLength(2);
    expect(Fuss.von(new Stange('c', new Vec3(0, 1, 0), new Vec3(0, 2, 0), 0.08))).toHaveLength(0);
  });

  it('merkt sich die Stange und die Position', () => {
    const [f] = Fuss.von(new Stange('a', new Vec3(1, 0.04, 0), new Vec3(1, 2, 0), 0.08));
    expect(f?.stangeId).toBe('a');
    expect(f?.position.equals(new Vec3(1, 0.04, 0))).toBe(true);
  });
});
