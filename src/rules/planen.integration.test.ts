import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Plane } from '../model/Plane';
import { STANDARD_PLANE } from '../model/params';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { RuleEngine } from './RuleEngine';
import { standardRegeln } from './standardRegeln';

const regeln = new RuleEngine(standardRegeln());
const regelnVon = (b: Bauwerk): string[] => regeln.pruefe(b).map((h) => h.regel);

describe('Planen in den Regeln (Spec v2b, D3)', () => {
  it('bringt in der Kochstelle mit Satteldach keinen Hinweis', () => {
    const k = kochstelle();
    const dach = new Plane('dach', k.gruppe('abock')!.spitze(), k.gruppe('dreibein')!.spitze(), { ...STANDARD_PLANE, form: 'satteldach' });
    expect(regelnVon(k.mitPlane(dach))).toEqual([]);
  });

  it('meldet ein Seil per R8, wenn die Plane danach ihre Breite oder Seite ändert', () => {
    // Linie entlang z bei x = 0, flach Richtung +x; Öse in der Mitte der Außenkante bei (3 | 2,5 | 0).
    const plane = new Plane('pl', new Vec3(0, 2.5, -2), new Vec3(0, 2.5, 2), { ...STANDARD_PLANE, neigungGrad: 0 });
    const vorher = Bauwerk.leer().mitPlane(plane).mitSeil(new Seil('s', new Vec3(3, 2.5, 0), new Vec3(5, 0, 0)));
    expect(regelnVon(vorher)).toEqual([]);
    const schmaler = vorher.ersetzePlane(plane.mitParams({ ...plane.params, breite: 2 }));
    expect(regelnVon(schmaler)).toEqual(['R8']);
    const gewechselt = vorher.ersetzePlane(plane.mitParams({ ...plane.params, seite: -1 }));
    expect(regelnVon(gewechselt)).toEqual(['R8']);
  });
});
