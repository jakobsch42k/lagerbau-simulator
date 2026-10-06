import type { LagerObjekt } from '../model/LagerObjekt';
import { STANDARD_ZONE } from '../model/params';
import { MIN_ZONEN_ECKEN, Zone } from '../model/Zone';
import { freierText, punkte, type Roh, text, type V3, zahl } from '../share/lesen';
import { textWert, zahlText, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenMehrpunkt } from './ObjektArt';

export interface ZoneJson extends ObjektJson {
  readonly art: 'zone';
  readonly name: string;
  readonly farbe: string;
  readonly deckkraft: number;
  readonly punkte: readonly V3[];
}

/** Ab dieser Fläche (m²) zeigt die Info keine Nachkommastelle mehr. */
const GANZ_AB_M2 = 100;

/** Zone (Spec E3, D1): eine Fläche am Boden, die man Ecke für Ecke zeichnet; in der Auswahl klickbar, sonst nicht, damit man darauf bauen kann. */
export class ZoneArt implements ObjektArt<Zone> {
  readonly name = 'zone' as const;
  readonly label = 'Zone';
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = false;
  readonly zaehltZumPlatzbedarf = false;
  readonly platzieren: PlatzierenMehrpunkt = {
    modus: 'mehrpunkt',
    mindestpunkte: MIN_ZONEN_ECKEN,
    geschlossen: true,
    erzeuge: (id, ecken) => new Zone(id, ecken, STANDARD_ZONE),
  };

  istVon(o: LagerObjekt): o is Zone {
    return o instanceof Zone;
  }

  zuJson(z: Zone): ZoneJson {
    const { name, farbe, deckkraft } = z.params;
    return { art: 'zone', id: z.id, name, farbe, deckkraft, punkte: z.punkte.map((p) => p.toArray()) };
  }

  ausJson(roh: Roh): Zone {
    return new Zone(text(roh.id, 'id'), punkte(roh.punkte, 'punkte'), {
      name: freierText(roh.name, 'name'),
      farbe: freierText(roh.farbe, 'farbe'),
      deckkraft: zahl(roh.deckkraft, 'deckkraft'),
    });
  }

  panel(z: Zone): PanelSpec {
    const { name, farbe, deckkraft } = z.params;
    const flaeche = z.flaeche();
    return {
      felder: [
        { art: 'text', schluessel: 'name', label: 'Name' },
        { art: 'farbe', schluessel: 'farbe', label: 'Farbe' },
        { schluessel: 'deckkraft', label: 'Deckkraft (%)', faktor: 1, schritt: '5' },
      ],
      werte: { name, farbe, deckkraft },
      info: `Fläche ${zahlText(flaeche, flaeche >= GANZ_AB_M2 ? 0 : 1)} m²`,
      extras: [],
      mit: (w) => z.mitParams({ name: textWert(w, 'name'), farbe: textWert(w, 'farbe'), deckkraft: zahlWert(w, 'deckkraft') }),
    };
  }

  fangpunkte(z: Zone): readonly Fangpunkt[] {
    return z.punkte.map((punkt): Fangpunkt => ({ punkt, art: 'ecke' }));
  }

  beiTreffer(): null {
    return null;
  }
}
