import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_DURCHMESSER } from '../model/konstanten';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';

/** Referenzbau aus der Spec: A-Bock + Dreibein, dazwischen ein First von Spitze zu Spitze. */
export function kochstelle(): Bauwerk {
  const abock = new ABock('abock', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
  const dreibein = new Dreibein('dreibein', new Vec3(2.5, 0, 0), 0, STANDARD_DREIBEIN);
  const first = Stange.zwischen('first', abock.spitze(), dreibein.spitze(), STANDARD_DURCHMESSER);
  return Bauwerk.leer().mitGruppe(abock).mitGruppe(dreibein).mitStange(first);
}
