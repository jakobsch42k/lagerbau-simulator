import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';

/** Lagertor: zwei A-Böcke (A-Ebene x = const) bei x = 0 und x = 4, dazwischen eine Firststange über beide Spitzen. */
export function lagertor(mitLaengsabspannung: boolean): Bauwerk {
  const a1 = new ABock('a1', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
  const a2 = new ABock('a2', new Vec3(4, 0, 0), Math.PI / 2, STANDARD_ABOCK);
  const hoehe = a1.spitze().y;
  const first = new Stange('first', new Vec3(-0.2, hoehe, 0), new Vec3(4.2, hoehe, 0), 0.08);
  const ohneSeile = Bauwerk.leer().mitGruppe(a1).mitGruppe(a2).mitStange(first);
  if (!mitLaengsabspannung) return ohneSeile;
  return ohneSeile
    .mitSeil(new Seil('s1', new Vec3(0, hoehe, 0), new Vec3(-1.5, 0, 0)))
    .mitSeil(new Seil('s2', new Vec3(4, hoehe, 0), new Vec3(5.5, 0, 0)));
}
