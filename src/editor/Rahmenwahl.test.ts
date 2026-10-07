import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Baum } from '../model/Baum';
import { Vec3 } from '../model/Vec3';
import { idsImRechteck, rechteckAus } from './Rahmenwahl';

describe('Rahmen-Auswahl', () => {
  const baum = new Baum('baum', new Vec3(10, 0, 10), { durchmesser: 0.3, hoehe: 5 });
  const bauwerk = kochstelle().mit(baum);

  it('rechteckAus ordnet beliebige Ecken', () => {
    expect(rechteckAus(new Vec3(3, 0, -1), new Vec3(-2, 0, 5))).toEqual({ minX: -2, maxX: 3, minZ: -1, maxZ: 5 });
  });

  it('wählt Objekte mit einem Platzpunkt im Rahmen, den Rest nicht', () => {
    const ids = idsImRechteck(bauwerk, rechteckAus(new Vec3(-3, 0, -3), new Vec3(3.5, 0, 3)));
    expect(ids).toEqual(['abock', 'dreibein', 'first']);
  });

  it('wählt einen Baum über seinen Mittelpunkt', () => {
    expect(idsImRechteck(bauwerk, rechteckAus(new Vec3(9, 0, 9), new Vec3(11, 0, 11)))).toEqual(['baum']);
  });

  it('wählt nichts, wenn der Rahmen leer ist', () => {
    expect(idsImRechteck(bauwerk, rechteckAus(new Vec3(50, 0, 50), new Vec3(60, 0, 60)))).toEqual([]);
  });
});
