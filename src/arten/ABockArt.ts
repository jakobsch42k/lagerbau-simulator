import { ABock } from '../model/ABock';
import type { LagerObjekt } from '../model/LagerObjekt';
import { type ABockParams, STANDARD_ABOCK } from '../model/params';
import type { Vec3 } from '../model/Vec3';
import { objekt, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { aufStange, baugruppenFang, baugruppenInfo, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenPunkt } from './ObjektArt';

export interface ABockJson extends ObjektJson {
  readonly art: 'abock';
  readonly position: V3;
  readonly drehung: number;
  readonly params: ABockParams;
}

/** A-Bock (Spec v1): per Bodenklick gesetzt, Maße im Panel. Gespeichert werden die Parameter, nicht die Stangen. */
export class ABockArt implements ObjektArt<ABock> {
  readonly name = 'abock' as const;
  readonly label = 'A-Bock';
  readonly klick = 'immer' as const;
  readonly hatOesen = false;
  readonly materialGruppe = 'bau' as const;
  readonly platzieren: PlatzierenPunkt = {
    modus: 'punkt',
    erzeuge: (id, position) => new ABock(id, position, 0, STANDARD_ABOCK),
  };

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

  panel(a: ABock): PanelSpec {
    const { stangenlaenge, fussabstand, riegelhoehe, durchmesser } = a.params;
    return {
      felder: [
        { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
        { schluessel: 'fussabstand', label: 'Fußabstand (m)', faktor: 1 },
        { schluessel: 'riegelhoehe', label: 'Riegelhöhe (m)', faktor: 1 },
        { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
      ],
      werte: { stangenlaenge, fussabstand, riegelhoehe, durchmesser },
      info: baugruppenInfo(a),
      extras: [],
      mit: (w) =>
        a.mitParams({
          stangenlaenge: zahlWert(w, 'stangenlaenge'),
          fussabstand: zahlWert(w, 'fussabstand'),
          riegelhoehe: zahlWert(w, 'riegelhoehe'),
          durchmesser: zahlWert(w, 'durchmesser'),
        }),
    };
  }

  fangpunkte(a: ABock): readonly Fangpunkt[] {
    return baugruppenFang(a);
  }

  beiTreffer(a: ABock, teilId: string, punkt: Vec3): Fangpunkt | null {
    return aufStange(a.stangen(), teilId, punkt);
  }
}
