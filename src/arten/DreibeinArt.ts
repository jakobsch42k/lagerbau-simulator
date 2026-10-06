import { Dreibein } from '../model/Dreibein';
import type { LagerObjekt } from '../model/LagerObjekt';
import type { DreibeinParams } from '../model/params';
import { objekt, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface DreibeinJson extends ObjektJson {
  readonly art: 'dreibein';
  readonly position: V3;
  readonly drehung: number;
  readonly params: DreibeinParams;
}

/** Dreibein (Spec v1). Gespeichert werden die Parameter, nicht die Stangen, damit Links kurz bleiben. */
export class DreibeinArt implements ObjektArt<Dreibein> {
  readonly name = 'dreibein' as const;
  readonly label = 'Dreibein';

  istVon(o: LagerObjekt): o is Dreibein {
    return o instanceof Dreibein;
  }

  zuJson(d: Dreibein): DreibeinJson {
    return { art: 'dreibein', id: d.id, position: d.position.toArray(), drehung: d.drehung, params: d.params };
  }

  ausJson(roh: Roh): Dreibein {
    const id = text(roh.id, 'id');
    const position = vektor(roh.position, 'position');
    const drehung = zahl(roh.drehung, 'drehung');
    const p = objekt(roh.params, 'params');
    return new Dreibein(id, position, drehung, {
      stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
      fusskreisradius: zahl(p.fusskreisradius, 'fusskreisradius'),
      durchmesser: zahl(p.durchmesser, 'durchmesser'),
    });
  }
}
