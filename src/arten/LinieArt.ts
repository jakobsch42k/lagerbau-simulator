import { Linie, MIN_LINIEN_PUNKTE } from '../model/Linie';
import type { LagerObjekt } from '../model/LagerObjekt';
import { type LinienTyp, STANDARD_LINIE } from '../model/params';
import { freierText, punkte, type Roh, text, type V3, zahl } from '../share/lesen';
import { textWert, zahlText, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelEingabe, PanelSpec, PlatzierenMehrpunkt } from './ObjektArt';

export interface LinieJson extends ObjektJson {
  readonly art: 'linie';
  readonly name: string;
  readonly typ: LinienTyp;
  readonly breite: number;
  readonly farbe: string;
  readonly punkte: readonly V3[];
}

const TYPEN: readonly (readonly [LinienTyp, string])[] = [
  ['weg', 'Weg'],
  ['zaun', 'Zaun'],
  ['grenze', 'Grenze'],
];

/** Linie (Spec E3, D1): Weg, Zaun oder Grenze als Linienzug; in der Auswahl klickbar, sonst nicht. Neue Linien sind Wege, der Typ ist im Panel einstellbar. */
export class LinieArt implements ObjektArt<Linie> {
  readonly name = 'linie' as const;
  readonly label = 'Linie';
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = false;
  readonly zaehltZumPlatzbedarf = false;
  readonly platzieren: PlatzierenMehrpunkt = {
    modus: 'mehrpunkt',
    mindestpunkte: MIN_LINIEN_PUNKTE,
    geschlossen: false,
    erzeuge: (id, linienPunkte) => new Linie(id, linienPunkte, STANDARD_LINIE),
  };

  istVon(o: LagerObjekt): o is Linie {
    return o instanceof Linie;
  }

  zuJson(l: Linie): LinieJson {
    const { name, typ, breite, farbe } = l.params;
    return { art: 'linie', id: l.id, name, typ, breite, farbe, punkte: l.punkte.map((p) => p.toArray()) };
  }

  ausJson(roh: Roh): Linie {
    return new Linie(text(roh.id, 'id'), punkte(roh.punkte, 'punkte'), {
      name: freierText(roh.name, 'name'),
      typ: roh.typ as LinienTyp,
      breite: zahl(roh.breite, 'breite'),
      farbe: freierText(roh.farbe, 'farbe'),
    });
  }

  panel(l: Linie): PanelSpec {
    const { name, typ, breite, farbe } = l.params;
    const felder: readonly PanelEingabe[] = [
      { art: 'text', schluessel: 'name', label: 'Name' },
      { art: 'auswahl', schluessel: 'typ', label: 'Typ', optionen: TYPEN },
      ...(typ === 'weg' ? [{ schluessel: 'breite', label: 'Breite (m)', faktor: 1 }] : []),
      { art: 'farbe', schluessel: 'farbe', label: 'Farbe' },
    ];
    return {
      felder,
      werte: { name, typ, breite, farbe },
      info: `Länge ${zahlText(l.laenge(), 1)} m`,
      extras: [],
      mit: (w) => l.mitParams({ name: textWert(w, 'name'), typ: textWert(w, 'typ') as LinienTyp, breite: zahlWert(w, 'breite'), farbe: textWert(w, 'farbe') }),
    };
  }

  fangpunkte(l: Linie): readonly Fangpunkt[] {
    return l.punkte.map((punkt): Fangpunkt => ({ punkt, art: 'ecke' }));
  }

  beiTreffer(): null {
    return null;
  }
}
