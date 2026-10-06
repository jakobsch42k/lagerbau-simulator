import type { LagerObjekt } from '../model/LagerObjekt';
import { Stange } from '../model/Stange';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface StangeJson extends ObjektJson {
  readonly art: 'stange';
  readonly start: V3;
  readonly ende: V3;
  readonly durchmesser: number;
}

/** Freie Stange (Spec v1). */
export class StangeArt implements ObjektArt<Stange> {
  readonly name = 'stange' as const;
  readonly label = 'Stange';

  istVon(o: LagerObjekt): o is Stange {
    return o instanceof Stange;
  }

  zuJson(s: Stange): StangeJson {
    return { art: 'stange', id: s.id, start: s.start.toArray(), ende: s.ende.toArray(), durchmesser: s.durchmesser };
  }

  ausJson(roh: Roh): Stange {
    return new Stange(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'), zahl(roh.durchmesser, 'durchmesser'));
  }
}
