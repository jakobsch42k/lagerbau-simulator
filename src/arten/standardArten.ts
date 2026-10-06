import { ABockArt } from './ABockArt';
import { BaumArt } from './BaumArt';
import { DreibeinArt } from './DreibeinArt';
import { ObjektRegister } from './ObjektRegister';
import { PlaneArt } from './PlaneArt';
import { SeilArt } from './SeilArt';
import { StangeArt } from './StangeArt';

/** Alle Arten in der Reihenfolge der Werkzeug-Knöpfe. Eine neue Art braucht hier eine Zeile (Spec v3, D2). */
export function standardArten(): ObjektRegister {
  return new ObjektRegister([new DreibeinArt(), new ABockArt(), new StangeArt(), new SeilArt(), new PlaneArt(), new BaumArt()]);
}
