import { describe, expect, it } from 'vitest';
import { Bauwerk } from './Bauwerk';
import { Platzbedarf } from './Platzbedarf';
import { Vec3 } from './Vec3';
import { Zelt } from './Zelt';
import { DOPPELKEGEL as KEGEL, HANGER as SATTEL, JURTE6 } from './Zelt.testdaten';
import { ZeltGeometrie } from './ZeltGeometrie';

const bei = (p: Vec3 | undefined, x: number, z: number): void => {
  expect(p?.equals(new Vec3(x, 0, z), 1e-9), `${p?.toArray().join(', ')} ≠ ${x}, 0, ${z}`).toBe(true);
};
const abstandZurKante = (p: Vec3, halbL: number, halbB: number): number => Math.max(Math.abs(p.x) - halbL, Math.abs(p.z) - halbB);

describe('ZeltGeometrie: umriss und flaeche (Spec E4, D3)', () => {
  it('rund: regelmäßiges 12-Eck mit Umkreis Ø 6,07, Fläche rund 27,6 m²', () => {
    const z = new Zelt('z', Vec3.NULL, JURTE6);
    const u = ZeltGeometrie.umriss(z);
    expect(u).toHaveLength(12);
    for (const p of u) expect(Math.hypot(p.x, p.z)).toBeCloseTo(3.035, 9);
    bei(u[0], 3.035, 0);
    expect(ZeltGeometrie.flaeche(z)).toBeCloseTo(6 * 3.035 ** 2 * Math.sin(Math.PI / 6), 9);
  });

  it('rund gedreht und verschoben: Ecken folgen, Fläche gleich', () => {
    const z = new Zelt('z', new Vec3(10, 0, -4), JURTE6, Math.PI / 12);
    const u = ZeltGeometrie.umriss(z);
    bei(u[0], 10 + 3.035 * Math.cos(Math.PI / 12), -4 + 3.035 * Math.sin(Math.PI / 12));
    expect(ZeltGeometrie.flaeche(z)).toBeCloseTo(ZeltGeometrie.flaeche(new Zelt('z', Vec3.NULL, JURTE6)), 9);
  });

  it('doppelkegel: Oval aus zwei Halbkreisen (Ø Breite), Länge entlang x', () => {
    const k = new Zelt('k', Vec3.NULL, KEGEL);
    const u = ZeltGeometrie.umriss(k);
    expect(u).toHaveLength(18);
    expect(u[8]?.z).toBeCloseTo(u[9]?.z ?? 0, 9); // gerade Seiten waagrecht
    expect(u[17]?.z).toBeCloseTo(u[0]?.z ?? 0, 9);
    expect(Math.max(...u.map((p) => p.z))).toBeCloseTo(2, 9);
    expect(ZeltGeometrie.kegelHalbachse(k)).toBeCloseTo(0.775, 9);
    expect(ZeltGeometrie.flaeche(k)).toBeGreaterThan(Math.PI * 4 + 1.55 * 4 - 0.8);
    expect(ZeltGeometrie.flaeche(k)).toBeLessThan(Math.PI * 4 + 1.55 * 4);
  });

  it('sattel: Rechteck, Länge entlang x, Breite entlang z', () => {
    const s = new Zelt('s', Vec3.NULL, SATTEL);
    expect(ZeltGeometrie.flaeche(s)).toBeCloseTo(27, 9);
    const u = ZeltGeometrie.umriss(s);
    expect(Math.max(...u.map((p) => p.x))).toBeCloseTo(3, 9);
    expect(Math.max(...u.map((p) => p.z))).toBeCloseTo(2.25, 9);
  });

  it('sattel gedreht um 90 Grad: Länge entlang z', () => {
    const s = new Zelt('s', Vec3.NULL, SATTEL, Math.PI / 2);
    const u = ZeltGeometrie.umriss(s);
    expect(Math.max(...u.map((p) => p.z))).toBeCloseTo(3, 9);
    expect(Math.max(...u.map((p) => p.x))).toBeCloseTo(2.25, 9);
    expect(ZeltGeometrie.flaeche(s)).toBeCloseTo(27, 9);
  });
});

describe('ZeltGeometrie: haringe und abspannseile', () => {
  it('rund: Anzahl, Radius Ø/2 + Abstand, erster beim halben Winkelschritt', () => {
    const h = ZeltGeometrie.haringe(new Zelt('z', Vec3.NULL, JURTE6));
    expect(h).toHaveLength(12);
    for (const p of h) expect(Math.hypot(p.x, p.z)).toBeCloseTo(5.035, 9);
    bei(h[0], 5.035 * Math.cos(Math.PI / 12), 5.035 * Math.sin(Math.PI / 12));
  });

  it('rund gedreht: der Start dreht mit', () => {
    const h = ZeltGeometrie.haringe(new Zelt('z', new Vec3(1, 0, 1), JURTE6, 0.3));
    bei(h[0], 1 + 5.035 * Math.cos(0.3 + Math.PI / 12), 1 + 5.035 * Math.sin(0.3 + Math.PI / 12));
  });

  it('rechteckig: Anzahl, Abstand zur Kante = haringAbstand, Start an einer Ecke, gleiche Schritte', () => {
    const h = ZeltGeometrie.haringe(new Zelt('s', Vec3.NULL, SATTEL));
    expect(h).toHaveLength(8);
    for (const p of h) expect(abstandZurKante(p, 3, 2.25)).toBeCloseTo(1, 9);
    bei(h[0], 4, 3.25);
    // Umfang 2 * (8 + 6,5) = 29, Schritt 3,625 (Seite entlang z hat 6,5, also liegt h[1] auf der kurzen Seite)
    expect(Math.hypot(h[1].x - h[0].x, h[1].z - h[0].z)).toBeCloseTo(3.625, 9);
  });

  it('doppelkegel mit 20 Abspannungen: alle im Abstand haringAbstand vom Oval', () => {
    const h = ZeltGeometrie.haringe(new Zelt('k', Vec3.NULL, KEGEL));
    expect(h).toHaveLength(20);
    for (const p of h) {
      const qx = Math.max(-0.775, Math.min(0.775, p.x));
      expect(Math.hypot(p.x - qx, p.z)).toBeCloseTo(3, 9);
    }
  });

  it('rechteckig gedreht um 90 Grad: Abstand zur gedrehten Kante bleibt', () => {
    const h = ZeltGeometrie.haringe(new Zelt('s', Vec3.NULL, SATTEL, Math.PI / 2));
    for (const p of h) expect(abstandZurKante(new Vec3(p.z, 0, -p.x), 3, 2.25)).toBeCloseTo(1, 9);
  });

  it('ohne Abspannungen keine Haringe', () => {
    expect(ZeltGeometrie.haringe(new Zelt('z', Vec3.NULL, { ...JURTE6, abspannungen: 0 }))).toEqual([]);
    expect(ZeltGeometrie.haringe(new Zelt('z', Vec3.NULL, { ...SATTEL, abspannungen: 0 }))).toEqual([]);
  });

  it('abspannseile liefert die Eingabewerte', () => {
    expect(ZeltGeometrie.abspannseile(new Zelt('z', Vec3.NULL, JURTE6))).toEqual({ laenge: 3, anzahl: 12 });
  });

  it('der Platzbedarf eines Bauwerks mit einem Zelt umfasst Umriss und Haringe', () => {
    const p = Platzbedarf.aus(Bauwerk.leer().mit(new Zelt('z', Vec3.NULL, JURTE6)));
    const rand = 5.035 * Math.cos(Math.PI / 12);
    expect(p?.laenge).toBeCloseTo(2 * rand, 9);
  });
});
