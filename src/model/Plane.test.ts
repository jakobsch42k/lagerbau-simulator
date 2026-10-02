import { describe, expect, it } from 'vitest';
import { type PlanenForm, type PlanenParams, STANDARD_PLANE } from './params';
import { Plane } from './Plane';
import { Vec3 } from './Vec3';

const params = (p: Partial<PlanenParams> = {}): PlanenParams => ({ ...STANDARD_PLANE, ...p });
const plane = (start: Vec3, ende: Vec3, p: Partial<PlanenParams> = {}): Plane => new Plane('pl', start, ende, params(p));
const istBei = (p: Vec3 | undefined, x: number, y: number, z: number): void => {
  expect(p?.equals(new Vec3(x, y, z), 1e-9), `${p?.toArray().join(', ')} ≠ ${x}, ${y}, ${z}`).toBe(true);
};
const enthaelt = (punkte: readonly Vec3[], x: number, y: number, z: number): boolean =>
  punkte.some((q) => q.equals(new Vec3(x, y, z), 1e-9));
const C30 = Math.cos(Math.PI / 6);

describe('Plane', () => {
  it('liegt bei 0° flach: Oberkante an der Linie, die Breite zur Seite +1 (bei einer Linie in +x nach −z)', () => {
    const p = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: 0 });
    expect(p.flaechen).toHaveLength(1);
    const [a, b, c, d] = p.flaechen[0]!;
    istBei(a, 0, 2, 0);
    istBei(b, 4, 2, 0);
    istBei(c, 4, 2, -3);
    istBei(d, 0, 2, -3);
  });

  it('hängt bei 30° die Unterkante um Breite × sin 30° tiefer', () => {
    const [, , c, d] = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0)).flaechen[0]!;
    istBei(c, 4, 0.5, -3 * C30);
    istBei(d, 0, 0.5, -3 * C30);
  });

  it('hängt bei 90° als Wand senkrecht unter der Linie', () => {
    const [, , c, d] = plane(new Vec3(0, 3, 0), new Vec3(4, 3, 0), { neigungGrad: 90 }).flaechen[0]!;
    istBei(c, 4, 0, 0);
    istBei(d, 0, 0, 0);
  });

  it('wechselt mit Seite −1 auf die andere Seite der Linie', () => {
    const [, , c] = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: 0, seite: -1 }).flaechen[0]!;
    istBei(c, 4, 2, 3);
  });

  it('legt die Länge mittig auf die Linie und lässt sie überstehen', () => {
    const [a, b] = plane(new Vec3(0, 2, 0), new Vec3(3, 2, 0)).flaechen[0]!;
    istBei(a, -0.5, 2, 0);
    istBei(b, 3.5, 2, 0);
  });

  it('hat eben immer 8 Ösen: 4 Ecken und 4 Kantenmitten', () => {
    const { oesen } = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: 0 });
    expect(oesen).toHaveLength(8);
    for (const [x, y, z] of [[0, 2, 0], [4, 2, 0], [4, 2, -3], [0, 2, -3], [2, 2, 0], [4, 2, -1.5], [2, 2, -3], [0, 2, -1.5]] as const) {
      expect(enthaelt(oesen, x, y, z), `Öse ${x}, ${y}, ${z}`).toBe(true);
    }
  });

  it('hängt als Satteldach je die halbe Breite zu beiden Seiten; zwei Ösen liegen auf den Firstenden', () => {
    const p = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'satteldach' });
    expect(p.flaechen).toHaveLength(2);
    expect(p.oesen).toHaveLength(8);
    const z = 1.5 * C30;
    for (const [x, y, zz] of [[0, 2, 0], [4, 2, 0], [0, 1.25, -z], [4, 1.25, -z], [0, 1.25, z], [4, 1.25, z], [2, 1.25, -z], [2, 1.25, z]] as const) {
      expect(enthaelt(p.oesen, x, y, zz), `Öse ${x}, ${y}, ${zz}`).toBe(true);
    }
  });

  it('ignoriert beim Satteldach die Seite', () => {
    const plus = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'satteldach', seite: 1 });
    const minus = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'satteldach', seite: -1 });
    for (const o of plus.oesen) expect(enthaelt(minus.oesen, o.x, o.y, o.z)).toBe(true);
  });

  it('bleibt auf einer schrägen Linie ein echtes Rechteck', () => {
    const [a, b, c, d] = plane(new Vec3(0, 1, 0), new Vec3(4, 3, 0), { breite: 2 }).flaechen[0]!;
    expect(b.distanceTo(a)).toBeCloseTo(4, 9);
    expect(d.distanceTo(a)).toBeCloseTo(2, 9);
    expect(b.sub(a).dot(d.sub(a))).toBeCloseTo(0, 9);
    expect(c.sub(b).equals(d.sub(a), 1e-9)).toBe(true);
  });

  it('erlaubt eine Bodenplane genau auf dem Boden und Ösen knapp darunter bis FUSS_TOLERANZ', () => {
    expect(plane(new Vec3(0, 0, 0), new Vec3(4, 0, 0), { neigungGrad: 0 }).oesen.every((o) => Math.abs(o.y) < 1e-9)).toBe(true);
    expect(() => plane(new Vec3(0, 2.96, 0), new Vec3(4, 2.96, 0), { neigungGrad: 90 })).not.toThrow();
    expect(() => plane(new Vec3(0, 2.94, 0), new Vec3(4, 2.94, 0), { neigungGrad: 90 })).toThrow('Plane reicht in den Boden');
  });

  it.each<[string, Vec3, Vec3, Partial<PlanenParams>, string]>([
    ['Breite 0', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { breite: 0 }, 'Planenbreite muss größer als 0 sein'],
    ['Länge negativ', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { laenge: -1 }, 'Planenlänge muss größer als 0 sein'],
    ['Neigung über 90°', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: 91 }, 'Neigung muss zwischen 0 und 90° liegen'],
    ['Neigung keine Zahl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: Number.NaN }, 'Neigung muss zwischen 0 und 90° liegen'],
    ['unbekannte Form', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'schief' as unknown as PlanenForm }, 'Unbekannte Planenform'],
    ['Seite 0', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { seite: 0 as unknown as 1 }, 'Seite muss +1 oder -1 sein'],
    ['Linie zu kurz', new Vec3(0, 1, 0), new Vec3(0.2, 1, 0), {}, 'Aufhängelinie zu kurz.'],
    ['Linie unendlich', new Vec3(0, 1, 0), new Vec3(Number.POSITIVE_INFINITY, 1, 0), {}, 'Aufhängelinie zu kurz.'],
    ['Linie fast senkrecht', new Vec3(0, 0.5, 0), new Vec3(0.1, 3, 0), {}, 'Aufhängelinie zu steil.'],
    ['Plane im Boden', new Vec3(0, 1, 0), new Vec3(4, 1, 0), {}, 'Plane reicht in den Boden: Neigung, Breite oder Länge verringern.'],
    ['Überstand im Boden', new Vec3(0, 0, 0), new Vec3(2, 1, 0), { neigungGrad: 0 }, 'Plane reicht in den Boden: Neigung, Breite oder Länge verringern.'],
  ])('lehnt ab: %s', (_name, start, ende, p, meldung) => {
    expect(() => plane(start, ende, p)).toThrow(RangeError);
    expect(() => plane(start, ende, p)).toThrow(meldung);
  });

  it('prüft bei mitParams alles neu und behält Id und Linie', () => {
    const p = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0));
    const flach = p.mitParams(params({ neigungGrad: 0 }));
    expect(flach).not.toBe(p);
    expect(flach.id).toBe('pl');
    expect(flach.start).toBe(p.start);
    expect(p.params.neigungGrad).toBe(30);
    expect(() => p.mitParams(params({ breite: 10 }))).toThrow('Plane reicht in den Boden');
  });

  it('findet die nächste Öse und ihren Abstand, und kennt die Linienlänge', () => {
    const p = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'satteldach' });
    istBei(p.naechsteOese(new Vec3(1.9, 1.3, -1.2)), 2, 1.25, -1.5 * C30);
    expect(p.abstandZurOese(new Vec3(4, 2.03, 0))).toBeCloseTo(0.03, 9);
    expect(p.linienLaenge).toBeCloseTo(4, 9);
  });
});
