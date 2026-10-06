import { Baum } from '../model/Baum';
import type { LagerObjekt } from '../model/LagerObjekt';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface BaumJson extends ObjektJson {
  readonly art: 'baum';
  readonly position: V3;
  readonly durchmesser: number;
  readonly hoehe: number;
}

/** Baum auf dem Platz (Spec v2a). */
export class BaumArt implements ObjektArt<Baum> {
  readonly name = 'baum' as const;
  readonly label = 'Baum';

  istVon(o: LagerObjekt): o is Baum {
    return o instanceof Baum;
  }

  zuJson(b: Baum): BaumJson {
    return { art: 'baum', id: b.id, position: b.position.toArray(), durchmesser: b.params.durchmesser, hoehe: b.params.hoehe };
  }

  ausJson(roh: Roh): Baum {
    return new Baum(text(roh.id, 'id'), vektor(roh.position, 'position'), {
      durchmesser: zahl(roh.durchmesser, 'durchmesser'),
      hoehe: zahl(roh.hoehe, 'hoehe'),
    });
  }
}
