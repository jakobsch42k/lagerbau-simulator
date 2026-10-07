import { ABockArt } from './ABockArt';
import { BaumArt } from './BaumArt';
import { BeschriftungArt } from './BeschriftungArt';
import { DreibeinArt } from './DreibeinArt';
import { LinieArt } from './LinieArt';
import { ObjektRegister } from './ObjektRegister';
import { PlaneArt } from './PlaneArt';
import { VorlagenWahl } from './platz/vorlagen';
import { PlatzobjektArt } from './PlatzobjektArt';
import { SeilArt } from './SeilArt';
import { StangeArt } from './StangeArt';
import { ZeltArt } from './ZeltArt';
import { ZoneArt } from './ZoneArt';

/** Alle Arten in der Reihenfolge der Werkzeug-Knöpfe. Eine neue Art braucht hier eine Zeile (Spec v3, D2). */
export function standardArten(vorlagen: VorlagenWahl = new VorlagenWahl()): ObjektRegister {
  return new ObjektRegister([
    new DreibeinArt(),
    new ABockArt(),
    new StangeArt(),
    new SeilArt(),
    new PlaneArt(),
    new BaumArt(),
    new PlatzobjektArt(vorlagen),
    new BeschriftungArt(),
    new ZoneArt(),
    new LinieArt(),
    new ZeltArt(),
  ]);
}
