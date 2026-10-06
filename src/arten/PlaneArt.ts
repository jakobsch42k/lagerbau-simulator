import type { LagerObjekt } from '../model/LagerObjekt';
import type { PlanenForm } from '../model/params';
import { Plane } from '../model/Plane';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface PlaneJson extends ObjektJson {
  readonly art: 'plane';
  readonly start: V3;
  readonly ende: V3;
  readonly breite: number;
  readonly laenge: number;
  readonly form: PlanenForm;
  /** Grad. */
  readonly neigung: number;
  readonly seite: 1 | -1;
}

/** Plane an einer Aufhängelinie (Spec v2b). Im JSON heißt die Neigung `neigung`, im Modell `neigungGrad`. */
export class PlaneArt implements ObjektArt<Plane> {
  readonly name = 'plane' as const;
  readonly label = 'Plane';

  istVon(o: LagerObjekt): o is Plane {
    return o instanceof Plane;
  }

  zuJson(p: Plane): PlaneJson {
    const { breite, laenge, form, neigungGrad, seite } = p.params;
    return { art: 'plane', id: p.id, start: p.start.toArray(), ende: p.ende.toArray(), breite, laenge, form, neigung: neigungGrad, seite };
  }

  ausJson(roh: Roh): Plane {
    const form = roh.form;
    if (form !== 'eben' && form !== 'satteldach') throw new Error('form unbekannt');
    const seite = roh.seite;
    if (seite !== 1 && seite !== -1) throw new Error('seite muss 1 oder -1 sein');
    return new Plane(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'), {
      breite: zahl(roh.breite, 'breite'),
      laenge: zahl(roh.laenge, 'laenge'),
      form,
      neigungGrad: zahl(roh.neigung, 'neigung'),
      seite,
    });
  }
}
