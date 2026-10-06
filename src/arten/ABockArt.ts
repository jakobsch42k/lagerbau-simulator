import { ABock } from '../model/ABock';
import type { LagerObjekt } from '../model/LagerObjekt';
import type { ABockParams } from '../model/params';
import { objekt, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface ABockJson extends ObjektJson {
  readonly art: 'abock';
  readonly position: V3;
  readonly drehung: number;
  readonly params: ABockParams;
}

/** A-Bock (Spec v1). Gespeichert werden die Parameter, nicht die Stangen. */
export class ABockArt implements ObjektArt<ABock> {
  readonly name = 'abock' as const;
  readonly label = 'A-Bock';

  istVon(o: LagerObjekt): o is ABock {
    return o instanceof ABock;
  }

  zuJson(a: ABock): ABockJson {
    return { art: 'abock', id: a.id, position: a.position.toArray(), drehung: a.drehung, params: a.params };
  }

  ausJson(roh: Roh): ABock {
    const id = text(roh.id, 'id');
    const position = vektor(roh.position, 'position');
    const drehung = zahl(roh.drehung, 'drehung');
    const p = objekt(roh.params, 'params');
    return new ABock(id, position, drehung, {
      stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
      fussabstand: zahl(p.fussabstand, 'fussabstand'),
      riegelhoehe: zahl(p.riegelhoehe, 'riegelhoehe'),
      durchmesser: zahl(p.durchmesser, 'durchmesser'),
    });
  }
}
