import type { ObjektArt } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import { Bau } from '../model/Bau';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import type { SnapPunkt, SnapService, Treffer } from './SnapService';

export type WerkzeugName = ArtName | 'auswahl';

/** Was ein Werkzeug vom Editor sehen und ändern darf. Diese Methoden benachrichtigen nicht. */
export interface EditorKontext {
  readonly bauwerk: Bauwerk;
  readonly snap: SnapService;
  aendere(neu: Bauwerk): void;
  waehle(id: string | null): void;
  /** Die ausgewählten ids (Objekte, die das Bauwerk kennt). */
  auswahl(): ReadonlySet<string>;
  /** Ersetzt die ganze Auswahl. */
  setzeAuswahl(ids: Iterable<string>): void;
  neueId(praefix: string): string;
}

/** Klick-Zusatz: gedrückte Umschalttaste. */
export interface KlickOptionen {
  readonly shift?: boolean;
}

export interface Werkzeug {
  readonly name: WerkzeugName;
  readonly angefangen: Vec3 | null;
  /**
   * Welche Arten mit Klickverhalten `wahlweise` (Seile, Planen) Klicks fangen (Spec v2b, D2). Sonst trifft der Strahl,
   * was dahinter liegt: Ein großes Regendach blockiert so nicht das Setzen eines Dreibeins darunter.
   */
  readonly klickZiele: readonly ArtName[];
  onKlick(treffer: Treffer, kontext: EditorKontext, optionen?: KlickOptionen): void;
  /** Nur Werkzeuge, die auf Doppelklick reagieren (die Auswahl). */
  onDoppelklick?(treffer: Treffer, kontext: EditorKontext, optionen?: KlickOptionen): void;
  abbrechen(): void;
}

/**
 * Setzt ein Objekt einer Art (Spec v3, D4): im Modus `punkt` mit einem Bodenklick aufs Raster, im Modus `linie`
 * mit zwei Klicks auf Einrastpunkte. Liegen die zwei Punkte zu nah beieinander, passiert nichts.
 */
export class PlatziereTool implements Werkzeug {
  private start: SnapPunkt | null = null;

  constructor(
    private readonly art: ObjektArt,
    readonly klickZiele: readonly ArtName[] = [],
  ) {}

  get name(): ArtName {
    return this.art.name;
  }

  get angefangen(): Vec3 | null {
    return this.start?.punkt ?? null;
  }

  onKlick(treffer: Treffer, k: EditorKontext): void {
    const platzieren = this.art.platzieren;
    if (platzieren.modus === 'punkt') {
      if (treffer.art === 'boden') this.fuegeHinzu(k, platzieren.erzeuge(k.neueId(this.art.name), k.snap.aufRaster(treffer.punkt)));
      return;
    }
    const punkt = k.snap.snap(treffer, k.bauwerk, platzieren.fangtOesen);
    if (this.start === null) {
      this.start = punkt;
      return;
    }
    const start = this.start;
    this.start = null;
    if (start.punkt.distanceTo(punkt.punkt) < platzieren.mindestabstand) return;
    this.fuegeHinzu(k, platzieren.erzeuge(k.neueId(this.art.name), start.punkt, punkt.punkt));
  }

  abbrechen(): void {
    this.start = null;
  }

  private fuegeHinzu(k: EditorKontext, objekt: LagerObjekt): void {
    k.aendere(k.bauwerk.mit(objekt));
    k.waehle(objekt.id);
  }
}

/**
 * Auswahl (Spec E1, D1). Klick wählt ein Teil (bei einer Gruppenstange die ganze Gruppe), Shift+Klick fügt es hinzu oder nimmt es weg,
 * Doppelklick wählt den ganzen Bau des Teils. Klick auf den Boden hebt die Auswahl auf, mit Shift lässt er sie stehen.
 */
export class SelectTool implements Werkzeug {
  readonly name = 'auswahl' as const;
  readonly angefangen: Vec3 | null = null;

  constructor(readonly klickZiele: readonly ArtName[]) {}

  onKlick(treffer: Treffer, k: EditorKontext, optionen: KlickOptionen = {}): void {
    if (treffer.art === 'boden') {
      if (!optionen.shift) k.setzeAuswahl([]);
      return;
    }
    const id = k.bauwerk.auswahlIdFuer(treffer.id);
    if (!optionen.shift) return k.setzeAuswahl([id]);
    const rest = [...k.auswahl()].filter((x) => x !== id);
    k.setzeAuswahl(rest.length === k.auswahl().size ? [...rest, id] : rest);
  }

  onDoppelklick(treffer: Treffer, k: EditorKontext, optionen: KlickOptionen = {}): void {
    if (treffer.art === 'boden') return this.onKlick(treffer, k, optionen);
    const bau = Bau.von(k.bauwerk, treffer.id).objektIds;
    const ids = bau.length > 0 ? bau : [k.bauwerk.auswahlIdFuer(treffer.id)];
    k.setzeAuswahl(optionen.shift ? [...k.auswahl(), ...ids] : ids);
  }

  abbrechen(): void {}
}

/**
 * Die Klickziele kommen aus dem Register: Die Auswahl nennt alle Arten mit Klickverhalten `wahlweise`,
 * ein Werkzeug, das Ösen fängt, die Arten mit Ösen, alle anderen keine.
 */
export function erzeugeWerkzeug(name: WerkzeugName, arten: ObjektRegister = standardArten()): Werkzeug {
  if (name === 'auswahl') return new SelectTool(arten.wahlweise());
  const art = arten.art(name);
  const fangtOesen = art.platzieren.modus === 'linie' && art.platzieren.fangtOesen;
  return new PlatziereTool(art, fangtOesen ? arten.mitOesen() : []);
}
