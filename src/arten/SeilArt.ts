import type { LagerObjekt } from '../model/LagerObjekt';
import { Seil } from '../model/Seil';
import { type Roh, text, type V3, vektor } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface SeilJson extends ObjektJson {
  readonly art: 'seil';
  readonly start: V3;
  readonly ende: V3;
}

/** Seil (Spec v2a). */
export class SeilArt implements ObjektArt<Seil> {
  readonly name = 'seil' as const;
  readonly label = 'Seil';

  istVon(o: LagerObjekt): o is Seil {
    return o instanceof Seil;
  }

  zuJson(s: Seil): SeilJson {
    return { art: 'seil', id: s.id, start: s.start.toArray(), ende: s.ende.toArray() };
  }

  ausJson(roh: Roh): Seil {
    return new Seil(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'));
  }
}
