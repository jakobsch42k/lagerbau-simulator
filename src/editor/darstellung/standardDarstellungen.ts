import { BaugruppeDarstellung } from './BaugruppeDarstellung';
import { BaumDarstellung } from './BaumDarstellung';
import { BeschriftungDarstellung } from './BeschriftungDarstellung';
import type { Darstellungen } from './Darstellung';
import { PlaneDarstellung } from './PlaneDarstellung';
import { PlatzobjektDarstellung } from './PlatzobjektDarstellung';
import { SeilDarstellung } from './SeilDarstellung';
import { StangeDarstellung } from './StangeDarstellung';

/** Je Art eine Darstellung (Spec v3, D2). Eine neue Art braucht hier eine Zeile; der Typ meldet sie sonst als fehlend. */
export function standardDarstellungen(): Darstellungen {
  return {
    dreibein: new BaugruppeDarstellung(),
    abock: new BaugruppeDarstellung(),
    stange: new StangeDarstellung(),
    seil: new SeilDarstellung(),
    baum: new BaumDarstellung(),
    plane: new PlaneDarstellung(),
    platzobjekt: new PlatzobjektDarstellung(),
    beschriftung: new BeschriftungDarstellung(),
  };
}
