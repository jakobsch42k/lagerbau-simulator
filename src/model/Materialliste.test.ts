import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from './Bauwerk';
import { Materialliste } from './Materialliste';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';
import { STANDARD_PLANE } from './params';

describe('Materialliste', () => {
  it('rundet Seile samt Zugabe auf ganze Meter und gruppiert sie', () => {
    const b = Bauwerk.leer()
      .mitSeil(new Seil('a', new Vec3(0, 2, 0), new Vec3(1.5, 0, 0))) // 2,5 m + 1 m → 4 m
      .mitSeil(new Seil('b', new Vec3(0, 2, 0), new Vec3(-1.5, 0, 0))) // 2,5 m + 1 m → 4 m
      .mitSeil(new Seil('c', new Vec3(0, 3, 0), new Vec3(0, 3, 3))); // genau 3 m + 1 m → 4 m, nicht 5 m
    expect(Materialliste.aus(b, 0.5).seile).toEqual([{ laenge: 4, anzahl: 3 }]);
    // 1 m Zugabe je Ende: 2,5 m → 4,5 m → 5 m und 3 m → 5,0 m → 5 m, also alle drei in einer Zeile.
    expect(Materialliste.aus(b, 1).seile).toEqual([{ laenge: 5, anzahl: 3 }]);
  });

  it('sortiert Seillängen absteigend', () => {
    const b = Bauwerk.leer()
      .mitSeil(new Seil('kurz', new Vec3(0, 1, 0), new Vec3(0, 1, 1)))
      .mitSeil(new Seil('lang', new Vec3(0, 1, 0), new Vec3(0, 1, 6)));
    expect(Materialliste.aus(b, 0.5).seile).toEqual([
      { laenge: 7, anzahl: 1 },
      { laenge: 2, anzahl: 1 },
    ]);
  });

  it('zählt geteilte Heringe nur einmal', () => {
    const b = Bauwerk.leer()
      .mitSeil(new Seil('a', new Vec3(0, 2, 0), new Vec3(2, 0, 0)))
      .mitSeil(new Seil('b', new Vec3(0, 2, 1), new Vec3(2.1, 0, 0)));
    expect(Materialliste.aus(b, 0.5).anzahlHeringe).toBe(1);
  });

  it('enthält Stangenliste und Platzbedarf', () => {
    const m = Materialliste.aus(kochstelle(), 0.5);
    expect(m.stangen.zeilen.length).toBeGreaterThan(0);
    expect(m.seile).toEqual([]);
    expect(m.anzahlHeringe).toBe(0);
    expect(m.platzbedarf?.laenge).toBeCloseTo(3.2, 9);
  });

  it('gruppiert Planen nach Größe, kleinere Seite zuerst, auf 0,1 m gerundet', () => {
    const bodenplane = (id: string, breite: number, laenge: number): Plane =>
      new Plane(id, Vec3.NULL, new Vec3(4, 0, 0), { ...STANDARD_PLANE, neigungGrad: 0, breite, laenge });
    const b = [bodenplane('a', 3, 4), bodenplane('b', 4, 3), bodenplane('c', 3.04, 4), bodenplane('d', 2, 2), bodenplane('e', 2, 5)].reduce(
      (bw, p) => bw.mitPlane(p),
      Bauwerk.leer(),
    );
    expect(Materialliste.aus(b, 0.5).planen).toEqual([
      { breite: 2, laenge: 5, anzahl: 1 },
      { breite: 3, laenge: 4, anzahl: 3 },
      { breite: 2, laenge: 2, anzahl: 1 },
    ]);
    expect(Materialliste.aus(Bauwerk.leer(), 0.5).planen).toEqual([]);
  });
});
