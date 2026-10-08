import { Dreibein } from '../model/Dreibein';
import type { LagerObjekt } from '../model/LagerObjekt';
import { type DreibeinParams, STANDARD_DREIBEIN } from '../model/params';
import type { Vec3 } from '../model/Vec3';
import { objekt, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { aufStange, baugruppenFang, baugruppenInfo, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenPunkt } from './ObjektArt';

export interface DreibeinJson extends ObjektJson {
  readonly art: 'dreibein';
  readonly position: V3;
  readonly drehung: number;
  readonly params: DreibeinParams;
}

/** Dreibein (Spec v1): per Bodenklick gesetzt, Maße im Panel. Gespeichert werden die Parameter, nicht die Stangen. */
export class DreibeinArt implements ObjektArt<Dreibein> {
  readonly name = 'dreibein' as const;
  readonly label = 'Dreibein';
  readonly klick = 'immer' as const;
  readonly hatOesen = false;
  readonly materialGruppe = 'bau' as const;
  readonly platzieren: PlatzierenPunkt = {
    modus: 'punkt',
    erzeuge: (id, position) => new Dreibein(id, position, 0, STANDARD_DREIBEIN),
  };

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

  panel(d: Dreibein): PanelSpec {
    const { stangenlaenge, fusskreisradius, durchmesser } = d.params;
    return {
      felder: [
        { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
        { schluessel: 'fusskreisradius', label: 'Fußkreisradius (m)', faktor: 1 },
        { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
      ],
      werte: { stangenlaenge, fusskreisradius, durchmesser },
      info: baugruppenInfo(d),
      extras: [],
      mit: (w) =>
        d.mitParams({
          stangenlaenge: zahlWert(w, 'stangenlaenge'),
          fusskreisradius: zahlWert(w, 'fusskreisradius'),
          durchmesser: zahlWert(w, 'durchmesser'),
        }),
    };
  }

  fangpunkte(d: Dreibein): readonly Fangpunkt[] {
    return baugruppenFang(d);
  }

  beiTreffer(d: Dreibein, teilId: string, punkt: Vec3): Fangpunkt | null {
    return aufStange(d.stangen(), teilId, punkt);
  }
}
