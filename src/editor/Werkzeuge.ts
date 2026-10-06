import type { ObjektArt } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import { Bau } from '../model/Bau';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import { Messung } from './Messung';
import type { SnapPunkt, SnapService, Treffer } from './SnapService';

export type WerkzeugName = ArtName | 'auswahl' | 'messen';

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
  /** Zeigt eine Messung an (null löscht sie). Sie gehört nicht ins Bauwerk. */
  setzeMessung(messung: Messung | null): void;
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
  /**
   * Nur Werkzeuge ohne halben Zustand, die Objekte bewegen (die Auswahl): Drücken der Maus auf ein Objekt. Wählt es bei Bedarf allein
   * aus und liefert true, wenn ein Ziehen beginnen darf. Fehlt die Methode, reagiert das Werkzeug nicht auf Ziehen.
   */
  onZiehenStart?(treffer: Treffer, kontext: EditorKontext, optionen?: KlickOptionen): boolean;
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

  /** Ziehen bewegt die Auswahl; ein Objekt außerhalb der Auswahl wird vorher allein ausgewählt. Auf Boden oder mit Shift beginnt nichts. */
  onZiehenStart(treffer: Treffer, k: EditorKontext, optionen: KlickOptionen = {}): boolean {
    if (treffer.art === 'boden' || optionen.shift) return false;
    const id = k.bauwerk.auswahlIdFuer(treffer.id);
    if (!k.auswahl().has(id)) k.setzeAuswahl([id]);
    return true;
  }

  abbrechen(): void {}
}

/**
 * Messen (Spec E1, D5): zwei Klicks mit denselben Fangpunkten wie beim Seil. Die Messung bleibt sichtbar, bis man neu misst
 * (der nächste erste Klick), Esc drückt oder das Werkzeug wechselt; das Bauwerk ändert sich nicht.
 */
export class MessTool implements Werkzeug {
  readonly name = 'messen' as const;
  private start: SnapPunkt | null = null;

  constructor(
    readonly klickZiele: readonly ArtName[],
    private readonly fangtOesen: boolean,
  ) {}

  get angefangen(): Vec3 | null {
    return this.start?.punkt ?? null;
  }

  onKlick(treffer: Treffer, k: EditorKontext): void {
    const punkt = k.snap.snap(treffer, k.bauwerk, this.fangtOesen);
    if (this.start === null) {
      this.start = punkt;
      k.setzeMessung(new Messung(punkt.punkt, null));
      return;
    }
    k.setzeMessung(new Messung(this.start.punkt, punkt.punkt));
    this.start = null;
  }

  abbrechen(): void {
    this.start = null;
  }
}

/**
 * Die Klickziele kommen aus dem Register: Die Auswahl nennt alle Arten mit Klickverhalten `wahlweise`,
 * ein Werkzeug, das Ösen fängt, die Arten mit Ösen, alle anderen keine.
 */
export function erzeugeWerkzeug(name: WerkzeugName, arten: ObjektRegister = standardArten()): Werkzeug {
  if (name === 'auswahl') return new SelectTool(arten.wahlweise());
  if (name === 'messen') return new MessTool(arten.mitOesen(), true);
  const art = arten.art(name);
  const fangtOesen = art.platzieren.modus === 'linie' && art.platzieren.fangtOesen;
  return new PlatziereTool(art, fangtOesen ? arten.mitOesen() : []);
}
