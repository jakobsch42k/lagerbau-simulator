import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Vec3 } from '../model/Vec3';
import { dreiDEinpassen, EINPASS_RAND, massstabsLaenge, planEinpassen, rahmenUm, sichtbarePunkte } from './Ansicht';

describe('rahmenUm', () => {
  it('passt bei einem leeren Bauwerk den Boden mit 40 × 40 m ein', () => {
    const r = rahmenUm(sichtbarePunkte(Bauwerk.leer()));
    expect([r.minX, r.maxX, r.minZ, r.maxZ]).toEqual([-20, 20, -20, 20]);
  });

  it('umfasst Füße, Spitzen und Haringe der Kochstelle', () => {
    const r = rahmenUm(sichtbarePunkte(kochstelle()));
    const punkte = sichtbarePunkte(kochstelle());
    expect(r.minX).toBe(Math.min(...punkte.map((p) => p.x)));
    expect(r.maxY).toBeGreaterThan(1);
  });

  it('nimmt auch Bäume ohne Platzpunkte mit', () => {
    const baum = new Baum('b', new Vec3(7, 0, -3), { durchmesser: 0.3, hoehe: 6 });
    const r = rahmenUm(sichtbarePunkte(Bauwerk.leer().mit(baum)));
    expect([r.minX, r.maxX, r.minZ, r.maxZ]).toEqual([7, 7, -3, -3]);
  });
});

describe('planEinpassen', () => {
  const rahmen = { minX: 0, maxX: 10, minY: 0, maxY: 0, minZ: 0, maxZ: 4 };

  it('zentriert und nimmt bei breitem Rahmen die Breite als Maß', () => {
    const a = planEinpassen(rahmen, 2);
    expect([a.mitteX, a.mitteZ]).toEqual([5, 2]);
    // halbe Breite 5 m + 10 % = 5,5 m bei Seitenverhältnis 2 → halbe Höhe 2,75 m (größer als 2 m + 10 %)
    expect(a.halbeHoehe).toBeCloseTo(5 * (1 + EINPASS_RAND) / 2);
  });

  it('nimmt bei hohem Ausschnitt die Tiefe als Maß', () => {
    expect(planEinpassen(rahmen, 10).halbeHoehe).toBeCloseTo(2 * (1 + EINPASS_RAND));
  });

  it('zoomt auf einen einzelnen Punkt nicht unendlich heran', () => {
    const punkt = { minX: 3, maxX: 3, minY: 0, maxY: 0, minZ: 3, maxZ: 3 };
    expect(planEinpassen(punkt, 1).halbeHoehe).toBe(1);
  });

  it('zeigt den leeren Boden mit 40 × 40 m samt Rand', () => {
    expect(planEinpassen(rahmenUm([]), 1).halbeHoehe).toBeCloseTo(22);
  });
});

describe('dreiDEinpassen', () => {
  it('hält alle Eckpunkte samt Rand im Bild (Kugel passt in den engeren Öffnungswinkel)', () => {
    const rahmen = { minX: -5, maxX: 5, minY: 0, maxY: 3, minZ: -2, maxZ: 2 };
    for (const aspekt of [0.5, 1, 2]) {
      const { ziel, abstand } = dreiDEinpassen(rahmen, aspekt, 50);
      const radius = (Math.hypot(10, 3, 4) / 2) * (1 + EINPASS_RAND);
      const halb = Math.min((50 * Math.PI) / 360, Math.atan(Math.tan((50 * Math.PI) / 360) * aspekt));
      expect(abstand * Math.sin(halb)).toBeCloseTo(radius);
      expect(ziel).toEqual(new Vec3(0, 1.5, 0));
    }
  });

  it('wählt bei schmaler Leinwand einen größeren Abstand', () => {
    const rahmen = { minX: -5, maxX: 5, minY: 0, maxY: 3, minZ: -2, maxZ: 2 };
    expect(dreiDEinpassen(rahmen, 0.5, 50).abstand).toBeGreaterThan(dreiDEinpassen(rahmen, 2, 50).abstand);
  });
});

describe('massstabsLaenge', () => {
  it.each([
    [0.05, 5, 100], // 1 m = 20 px, 2 m = 40, 5 m = 100 px
    [0.01, 1, 100], // 1 m = 100 px
    [0.1, 10, 100],
    [0.2, 20, 100],
    [0.5, 50, 100],
  ])('bei %f m/px: %i m', (mpp, meter, pixel) => {
    const l = massstabsLaenge(mpp);
    expect(l.meter).toBe(meter);
    expect(l.pixel).toBeCloseTo(pixel);
  });

  it('liegt, wo es geht, zwischen 80 und 160 px', () => {
    for (let mpp = 0.001; mpp < 0.6; mpp *= 1.07) {
      const l = massstabsLaenge(mpp);
      if (l.meter > 1 && l.meter < 50) expect(l.pixel).toBeGreaterThanOrEqual(80);
      if (l.meter > 1) expect(l.pixel).toBeLessThanOrEqual(200);
    }
  });

  it('bleibt bei starkem Hineinzoomen bei 1 m und bei weitem Herauszoomen bei 50 m', () => {
    expect(massstabsLaenge(0.0001).meter).toBe(1);
    expect(massstabsLaenge(5).meter).toBe(50);
  });
});
