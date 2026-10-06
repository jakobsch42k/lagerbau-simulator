import { Baum } from '../model/Baum';
import type { LagerObjekt } from '../model/LagerObjekt';
import { STANDARD_BAUM } from '../model/params';
import type { Vec3 } from '../model/Vec3';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenPunkt } from './ObjektArt';

export interface BaumJson extends ObjektJson {
  readonly art: 'baum';
  readonly position: V3;
  readonly durchmesser: number;
  readonly hoehe: number;
}

/** Baum auf dem Platz (Spec v2a): per Bodenklick gesetzt, gehört nicht zum Bau. */
export class BaumArt implements ObjektArt<Baum> {
  readonly name = 'baum' as const;
  readonly label = 'Baum';
  readonly klick = 'immer' as const;
  readonly hatOesen = false;
  readonly platzieren: PlatzierenPunkt = {
    modus: 'punkt',
    erzeuge: (id, position) => new Baum(id, position, STANDARD_BAUM),
  };

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

  panel(b: Baum): PanelSpec {
    const { durchmesser, hoehe } = b.params;
    return {
      felder: [
        { schluessel: 'durchmesser', label: 'Stammdurchmesser (cm)', faktor: 100 },
        { schluessel: 'hoehe', label: 'Höhe (m)', faktor: 1 },
      ],
      werte: { durchmesser, hoehe },
      info: 'Steht auf dem Platz, gehört nicht zum Bau.',
      extras: [],
      mit: (w) => b.mitParams({ durchmesser: zahlWert(w, 'durchmesser'), hoehe: zahlWert(w, 'hoehe') }),
    };
  }

  fangpunkte(): readonly Fangpunkt[] {
    return [];
  }

  /** Am Stamm zählt der getroffene Oberflächenpunkt; die Verankerung erkennt ihn als „Baum“. */
  beiTreffer(_baum: Baum, _teilId: string, punkt: Vec3): Fangpunkt {
    return { punkt, art: 'baum' };
  }
}
