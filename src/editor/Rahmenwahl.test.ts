import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Baum } from '../model/Baum';
import { Vec3 } from '../model/Vec3';
import { idsImRechteck, rahmenMoeglich, rechteckAus } from './Rahmenwahl';

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

describe('Wann Shift+Drücken einen Auswahlrahmen beginnt', () => {
  it('im Plan mit der Auswahl und Shift immer, auch wenn die Maus auf einer Zone oder Linie steht', () => {
    expect(rahmenMoeglich(true, 'plan', 'auswahl')).toBe(true);
  });

  it('nicht ohne Shift, nicht in 3D, nicht mit einem anderen Werkzeug', () => {
    expect(rahmenMoeglich(false, 'plan', 'auswahl')).toBe(false);
    expect(rahmenMoeglich(true, 'drei-d', 'auswahl')).toBe(false);
    expect(rahmenMoeglich(true, 'plan', 'zone')).toBe(false);
  });
});
