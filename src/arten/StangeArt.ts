import { FUSS_TOLERANZ, MIN_STANGENLAENGE, STANDARD_DURCHMESSER, STANGEN_UEBERSTAND } from '../model/konstanten';
import type { LagerObjekt } from '../model/LagerObjekt';
import { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { aufStange, stangenEnden, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenLinie } from './ObjektArt';

export interface StangeJson extends ObjektJson {
  readonly art: 'stange';
  readonly start: V3;
  readonly ende: V3;
  readonly durchmesser: number;
}

/** Am Boden steht eine neue Stange ohne Überstand, sonst ragt sie 0,2 m über den Einrastpunkt hinaus (Spec v1). */
const ueberstand = (p: Vec3): number => (p.y <= FUSS_TOLERANZ ? 0 : STANGEN_UEBERSTAND);

/** Freie Stange (Spec v1): zwei Klicks auf Einrastpunkte. */
export class StangeArt implements ObjektArt<Stange> {
  readonly name = 'stange' as const;
  readonly label = 'Stange';
  readonly klick = 'immer' as const;
  readonly hatOesen = false;
  readonly materialGruppe = 'bau' as const;
  readonly platzieren: PlatzierenLinie = {
    modus: 'linie',
    mindestabstand: MIN_STANGENLAENGE,
    fangtOesen: false,
    erzeuge: (id, a, b) => Stange.zwischen(id, a, b, STANDARD_DURCHMESSER, ueberstand(a), ueberstand(b)),
  };

  istVon(o: LagerObjekt): o is Stange {
    return o instanceof Stange;
  }

  zuJson(s: Stange): StangeJson {
    return { art: 'stange', id: s.id, start: s.start.toArray(), ende: s.ende.toArray(), durchmesser: s.durchmesser };
  }

  ausJson(roh: Roh): Stange {
    return new Stange(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'), zahl(roh.durchmesser, 'durchmesser'));
  }

  panel(s: Stange): PanelSpec {
    return {
      felder: [{ schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 }],
      werte: { durchmesser: s.durchmesser },
      info: `Länge ${s.laenge.toFixed(2)} m`,
      extras: [],
      mit: (w) => s.mitDurchmesser(zahlWert(w, 'durchmesser')),
    };
  }

  fangpunkte(s: Stange): readonly Fangpunkt[] {
    return stangenEnden([s]);
  }

  beiTreffer(s: Stange, teilId: string, punkt: Vec3): Fangpunkt | null {
    return aufStange([s], teilId, punkt);
  }
}
