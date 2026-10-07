import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import type { Roh } from '../share/lesen';

/** Ein Objekt im Datenformat v4: Art und id vorneweg, danach die Felder der Art wie in v3 (Spec v3, D3). */
export interface ObjektJson {
  readonly art: ArtName;
  readonly id: string;
  readonly [feld: string]: unknown;
}

/**
 * Woran ein Klick einrastet. Vorrang bei gleichem Abstand: Spitze → Bund → Ende → Öse (zuletzt `ecke`, eine Ecke einer Zone oder Linie, Spec E3).
 * `stange` und `baum` liefert nur das getroffene Objekt selbst (`beiTreffer`).
 */
export type FangArt = 'spitze' | 'bund' | 'ende' | 'oese' | 'stange' | 'baum' | 'ecke';

export interface Fangpunkt {
  readonly punkt: Vec3;
  readonly art: FangArt;
}

/** Werte im Panel: Zahlen in Modelleinheiten, Texte z. B. für die Form einer Plane. */
export type Werte = Readonly<Record<string, number | string>>;

/** Ein Zahlenfeld. Anzeige = Modellwert × faktor (Ø in cm, sonst m). */
export interface PanelFeld {
  readonly schluessel: string;
  readonly label: string;
  readonly faktor: number;
  /** Standard: 0.05 bei Metern, 1 bei Zentimetern. */
  readonly schritt?: string;
}

export interface PanelAuswahl {
  readonly art: 'auswahl';
  readonly schluessel: string;
  readonly label: string;
  /** Wert und angezeigter Text. */
  readonly optionen: readonly (readonly [string, string])[];
}

export interface PanelKnopf {
  readonly art: 'knopf';
  readonly text: string;
  /** Werte, die ein Klick überschreibt. */
  readonly aenderung: Werte;
}

/** Ein Textfeld (Name, Beschriftung). Das Modell prüft die Länge mit seiner eigenen Meldung. */
export interface PanelText {
  readonly art: 'text';
  readonly schluessel: string;
  readonly label: string;
}

/** Eine Farbwahl (`<input type="color">`); der Wert ist `#rrggbb`. */
export interface PanelFarbe {
  readonly art: 'farbe';
  readonly schluessel: string;
  readonly label: string;
}

/**
 * Eine Eingabe im Formular, in der Reihenfolge des Panels. Zahlenfelder haben kein `art`. Welche Eingaben es gibt, entscheidet
 * die Art beim Bauen der Beschreibung (z. B. „Länge“ nur beim Rechteck); ändert eine Eingabe das Objekt, baut das Panel neu auf.
 */
export type PanelEingabe = PanelFeld | PanelAuswahl | PanelText | PanelFarbe;

export type PanelExtra = PanelAuswahl | PanelKnopf;

/** Beschreibung des Formulars für ein Objekt (Spec v3, D4). Das ParameterPanel baut daraus die Eingaben. */
export interface PanelSpec {
  readonly felder: readonly PanelEingabe[];
  readonly werte: Werte;
  readonly info: string;
  readonly extras: readonly PanelExtra[];
  /** Das Objekt mit diesen Werten. Ungültige Werte: RangeError mit der Meldung des Modells. */
  mit(werte: Werte): LagerObjekt;
}

/** Ein Bodenklick setzt das Objekt auf den Rasterpunkt. */
export interface PlatzierenPunkt {
  readonly modus: 'punkt';
  erzeuge(id: string, position: Vec3): LagerObjekt;
}

/** Zwei Klicks auf Einrastpunkte; liegen sie näher als `mindestabstand`, passiert nichts. */
export interface PlatzierenLinie {
  readonly modus: 'linie';
  readonly mindestabstand: number;
  /** Ösen sind Fangpunkte, und Arten mit Ösen fangen Klicks (nur das Seil, Spec v2b, D2). */
  readonly fangtOesen: boolean;
  erzeuge(id: string, a: Vec3, b: Vec3): LagerObjekt;
}

/**
 * Beliebig viele Klicks auf Einrastpunkte (Zone, Linie; Spec E3): jeder Klick setzt einen Punkt, Doppelklick oder Enter schließt ab,
 * Esc bricht ab. `erzeuge` wirft einen RangeError mit der Meldung des Modells, wenn es zu wenige oder ungültige Punkte sind.
 */
export interface PlatzierenMehrpunkt {
  readonly modus: 'mehrpunkt';
  /** So viele Punkte braucht das Objekt mindestens (für die Statuszeile; die Prüfung macht das Modell). */
  readonly mindestpunkte: number;
  /** Ob die Vorschau den Linienzug zum Vieleck schließt (Zone) oder offen lässt (Linie). */
  readonly geschlossen: boolean;
  erzeuge(id: string, punkte: readonly Vec3[]): LagerObjekt;
}

export type Platzieren = PlatzierenPunkt | PlatzierenLinie | PlatzierenMehrpunkt;

/** `immer`: fängt Klicks in jedem Werkzeug; `wahlweise`: nur, wo das Werkzeug die Art als Klickziel nennt (ersetzt `KlickZiel`). */
export type KlickVerhalten = 'immer' | 'wahlweise';

/** Alles Editor-Seitige einer Objektart, ohne three.js (Spec v3, D2). */
export interface ObjektArt<T extends LagerObjekt = LagerObjekt> {
  readonly name: ArtName;
  /** Anzeigename, z. B. als Überschrift im Panel und in der Statuszeile. */
  readonly label: string;
  readonly klick: KlickVerhalten;
  readonly hatOesen: boolean;
  /** Ob die Objekte dieser Art zum Platzbedarf zählen (Spec E3, D3). Fehlt die Angabe: ja. */
  readonly zaehltZumPlatzbedarf?: boolean;
  readonly platzieren: Platzieren;
  istVon(o: LagerObjekt): o is T;
  zuJson(o: T): ObjektJson;
  /** Wirft einen Error mit dem Feldnamen, wenn `roh` nicht passt. */
  ausJson(roh: Roh): T;
  panel(o: T): PanelSpec;
  /** Fangpunkte in der Nähe eines Klicks; Ösen nur, wenn `mitOesen`. */
  fangpunkte(o: T, mitOesen: boolean): readonly Fangpunkt[];
  /** Wohin ein Klick auf das Objekt selbst einrastet, wenn kein Fangpunkt in Reichweite liegt; `teilId` ist der getroffene Teil. */
  beiTreffer(o: T, teilId: string, punkt: Vec3, mitOesen: boolean): Fangpunkt | null;
}
