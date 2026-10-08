import { MIN_SEILLAENGE } from '../model/konstanten';
import type { LagerObjekt } from '../model/LagerObjekt';
import { Seil } from '../model/Seil';
import { type Roh, text, type V3, vektor } from '../share/lesen';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenLinie } from './ObjektArt';

export interface SeilJson extends ObjektJson {
  readonly art: 'seil';
  readonly start: V3;
  readonly ende: V3;
}

/**
 * Seil (Spec v2a): zwei Klicks; ein Ende am Boden wird ein Haring. Im Seil-Werkzeug rasten Klicks an Planen-Ösen ein.
 * Ein Seil fängt Klicks nur in der Auswahl, sonst blockiert sein Greifmantel, was dahinter liegt.
 */
export class SeilArt implements ObjektArt<Seil> {
  readonly name = 'seil' as const;
  readonly label = 'Seil';
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = false;
  readonly materialGruppe = 'bau' as const;
  readonly platzieren: PlatzierenLinie = {
    modus: 'linie',
    mindestabstand: MIN_SEILLAENGE,
    fangtOesen: true,
    erzeuge: (id, a, b) => new Seil(id, a, b),
  };

  istVon(o: LagerObjekt): o is Seil {
    return o instanceof Seil;
  }

  zuJson(s: Seil): SeilJson {
    return { art: 'seil', id: s.id, start: s.start.toArray(), ende: s.ende.toArray() };
  }

  ausJson(roh: Roh): Seil {
    return new Seil(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'));
  }

  panel(s: Seil): PanelSpec {
    return {
      felder: [],
      werte: {},
      info: `Länge ${s.laenge.toFixed(2)} m · Winkel zum Boden ${s.winkelZumBodenGrad.toFixed(0)}°`,
      extras: [],
      mit: () => s,
    };
  }

  fangpunkte(): readonly Fangpunkt[] {
    return [];
  }

  /** Ein Klick auf ein Seil rastet nirgends ein; ohne Fangpunkt in Reichweite zählt der Boden darunter (v2a). */
  beiTreffer(): Fangpunkt | null {
    return null;
  }
}
