import { Beschriftung } from '../model/Beschriftung';
import type { LagerObjekt } from '../model/LagerObjekt';
import { STANDARD_BESCHRIFTUNG } from '../model/params';
import { freierText, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { textWert, zahlWert } from './gemeinsam';
import type { ObjektArt, ObjektJson, PanelSpec, PlatzierenPunkt } from './ObjektArt';

export interface BeschriftungJson extends ObjektJson {
  readonly art: 'beschriftung';
  readonly position: V3;
  readonly text: string;
  readonly groesse: number;
  readonly farbe: string;
}

/** Beschriftung (Spec E3, D1): ein Text auf dem Plan, Schrifthöhe in Metern. */
export class BeschriftungArt implements ObjektArt<Beschriftung> {
  readonly name = 'beschriftung' as const;
  readonly label = 'Beschriftung';
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = false;
  readonly zaehltZumPlatzbedarf = false;
  readonly platzieren: PlatzierenPunkt = {
    modus: 'punkt',
    erzeuge: (id, position) => new Beschriftung(id, position, STANDARD_BESCHRIFTUNG),
  };

  istVon(o: LagerObjekt): o is Beschriftung {
    return o instanceof Beschriftung;
  }

  zuJson(b: Beschriftung): BeschriftungJson {
    const { text: inhalt, groesse, farbe } = b.params;
    return { art: 'beschriftung', id: b.id, position: b.position.toArray(), text: inhalt, groesse, farbe };
  }

  ausJson(roh: Roh): Beschriftung {
    return new Beschriftung(text(roh.id, 'id'), vektor(roh.position, 'position'), {
      text: freierText(roh.text, 'text'),
      groesse: zahl(roh.groesse, 'groesse'),
      farbe: freierText(roh.farbe, 'farbe'),
    });
  }

  panel(b: Beschriftung): PanelSpec {
    const { text: inhalt, groesse, farbe } = b.params;
    return {
      felder: [
        { art: 'text', schluessel: 'text', label: 'Text' },
        { schluessel: 'groesse', label: 'Schrifthöhe (m)', faktor: 1 },
        { art: 'farbe', schluessel: 'farbe', label: 'Farbe' },
      ],
      werte: { text: inhalt, groesse, farbe },
      info: 'Steht auf dem Plan, zählt nicht zum Platzbedarf.',
      extras: [],
      mit: (w) => b.mitParams({ text: textWert(w, 'text'), groesse: zahlWert(w, 'groesse'), farbe: textWert(w, 'farbe') }),
    };
  }

  fangpunkte(): readonly [] {
    return [];
  }

  beiTreffer(): null {
    return null;
  }
}
