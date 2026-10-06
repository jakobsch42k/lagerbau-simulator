import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ABock } from './ABock';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { Plane } from './Plane';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_PLANE } from './params';
import { Platzbedarf } from './Platzbedarf';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';
import type { LagerObjekt } from './LagerObjekt';
import { Stange } from './Stange';

describe('Platzbedarf', () => {
  it('umschließt alle Füße, längere Seite zuerst', () => {
    const p = Platzbedarf.aus(kochstelle());
    expect(p?.laenge).toBeCloseTo(3.2, 9);
    expect(p?.breite).toBeCloseTo(1.6, 9);
  });

  it('zählt Haringe mit und Bäume nicht', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const b = Bauwerk.leer()
      .mitGruppe(abock)
      .mitSeil(new Seil('l', abock.spitze(), new Vec3(-1.5, 0, 0)))
      .mitSeil(new Seil('r', abock.spitze(), new Vec3(1.5, 0, 0)))
      .mitBaum(new Baum('baum', new Vec3(20, 0, 20), STANDARD_BAUM));
    const p = Platzbedarf.aus(b);
    expect(p?.laenge).toBeCloseTo(3, 9);
    expect(p?.breite).toBeCloseTo(1.6, 9);
  });

  it('nutzt für zwei Seile an einem gemeinsamen Haring dessen Mittelpunkt', () => {
    const b = Bauwerk.leer()
      .mitSeil(new Seil('a', new Vec3(0, 2, 0), new Vec3(2, 0, 0)))
      .mitSeil(new Seil('b', new Vec3(0, 2, 1), new Vec3(2.1, 0, 0.1)));
    expect(b.haringe()).toHaveLength(1);
    const p = Platzbedarf.aus(b);
    expect(p?.minX).toBeCloseTo(2.05, 9);
    expect(p?.maxX).toBeCloseTo(2.05, 9);
    expect(p?.minZ).toBeCloseTo(0.05, 9);
    expect(p?.maxZ).toBeCloseTo(0.05, 9);
  });

  it('gibt es ohne Füße und Haringe nicht', () => {
    expect(Platzbedarf.aus(Bauwerk.leer())).toBeNull();
    expect(Platzbedarf.aus(Bauwerk.leer().mitBaum(new Baum('b', Vec3.NULL, STANDARD_BAUM)))).toBeNull();
  });

  it('zählt alle Ösen einer Plane mit, auch den Überstand eines Regendachs', () => {
    const regendach = new Plane('dach', new Vec3(0, 2, 0), new Vec3(3, 2, 0), STANDARD_PLANE); // 30°, 3 × 4 m
    const p = Platzbedarf.aus(kochstelle().mitPlane(regendach));
    expect(p?.laenge).toBeCloseTo(4, 9); // x von −0,5 bis 3,5
    expect(p?.breite).toBeCloseTo(0.8 + 3 * Math.cos(Math.PI / 6), 9); // z von −2,6 bis 0,8
  });

  it('gibt auch einer Plane allein einen Platzbedarf', () => {
    const plane = new Plane('pl', new Vec3(0, 1, 0), new Vec3(4, 1, 0), { ...STANDARD_PLANE, neigungGrad: 0 });
    const p = Platzbedarf.aus(Bauwerk.leer().mitPlane(plane));
    expect(p?.laenge).toBeCloseTo(4, 9);
    expect(p?.breite).toBeCloseTo(3, 9);
  });

  it('fragt jedes Objekt nach seinen Platzpunkten (Spec v3, D1)', () => {
    const pflock: LagerObjekt = {
      id: 'pflock',
      art: 'baum',
      ids: () => ['pflock'],
      verschobenUm() {
        return this;
      },
      gedreht() {
        return this;
      },
      platzPunkte: () => [new Vec3(10, 0, -4)],
    };
    const p = Platzbedarf.aus(Bauwerk.von([pflock]));
    expect([p?.minX, p?.maxX, p?.minZ, p?.maxZ]).toEqual([10, 10, -4, -4]);
  });

  it('ergibt für ein gemischtes Bauwerk dasselbe Rechteck wie die Rechnung bis v2b', () => {
    const regendach = new Plane('dach', new Vec3(0, 2, 0), new Vec3(3, 2, 0), STANDARD_PLANE);
    const frei = new Stange('frei', new Vec3(-2, 0, 1), new Vec3(-2, 2, 1), 0.08);
    const b = Bauwerk.von([
      frei,
      regendach,
      ...kochstelle().objekte,
      new Seil('l', new Vec3(0, 2, 0), new Vec3(1, 0, 3)),
      new Baum('baum', new Vec3(30, 0, 30), STANDARD_BAUM),
    ]);
    // So hat Platzbedarf.aus bis v2b gerechnet: Füße, Haringe, Planen-Ösen.
    const alt = [...b.fuesse().map((f) => f.position), ...b.haringe().map((h) => h.position), ...b.planen.flatMap((pl) => pl.oesen)];
    const p = Platzbedarf.aus(b);
    expect([p?.minX, p?.maxX, p?.minZ, p?.maxZ]).toEqual([
      Math.min(...alt.map((q) => q.x)),
      Math.max(...alt.map((q) => q.x)),
      Math.min(...alt.map((q) => q.z)),
      Math.max(...alt.map((q) => q.z)),
    ]);
  });
});
