export interface DreibeinParams {
  readonly stangenlaenge: number;
  readonly fusskreisradius: number;
  readonly durchmesser: number;
}

export interface ABockParams {
  readonly stangenlaenge: number;
  readonly fussabstand: number;
  readonly riegelhoehe: number;
  readonly durchmesser: number;
}

export interface BaumParams {
  readonly durchmesser: number;
  readonly hoehe: number;
}

export type PlanenForm = 'eben' | 'satteldach';

export interface PlanenParams {
  readonly breite: number;
  readonly laenge: number;
  readonly form: PlanenForm;
  /** Neigung unter die Waagrechte in Grad: 0 flach, 90 senkrecht. */
  readonly neigungGrad: number;
  /** Zu welcher Seite der Linie eine ebene Plane hängt. Beim Satteldach ohne Wirkung. */
  readonly seite: 1 | -1;
}

export const STANDARD_DREIBEIN: DreibeinParams = { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 };
export const STANDARD_ABOCK: ABockParams = { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 };

/** Startmaße für „Baum setzen". Nur Darstellung und Einrasten, keine Regel-Schwellwerte. */
export const STANDARD_BAUM: BaumParams = { durchmesser: 0.3, hoehe: 8 };

/** Startmaße für „Plane spannen“ (Spec v2b, D2). Keine Regel-Schwellwerte. */
export const STANDARD_PLANE: PlanenParams = { breite: 3, laenge: 4, form: 'eben', neigungGrad: 30, seite: 1 };

export type PlatzobjektForm = 'kreis' | 'rechteck';

/** Ein Platz-Objekt (Spec E3, D1): alles ist einstellbar; die Vorlage ist nur der Schlüssel, aus dem die Felder vorbelegt wurden. */
export interface PlatzobjektParams {
  readonly vorlage: string;
  readonly name: string;
  readonly form: PlatzobjektForm;
  /** Beim Kreis der Durchmesser. */
  readonly breite: number;
  /** Nur beim Rechteck. */
  readonly laenge: number;
  readonly hoehe: number;
  /** `#rrggbb`. */
  readonly farbe: string;
}

export interface BeschriftungParams {
  readonly text: string;
  /** Schrifthöhe in m. */
  readonly groesse: number;
  readonly farbe: string;
}

/** Startwerte für „Beschriftung setzen“ (Spec E3, D1). Keine Regel-Schwellwerte. */
export const STANDARD_BESCHRIFTUNG: BeschriftungParams = { text: 'Beschriftung', groesse: 1, farbe: '#1d2733' };

/** Eine Zone (Spec E3, D1): Name, Farbe und Deckkraft in Prozent; die Ecken liegen in `Zone.punkte`. */
export interface ZoneParams {
  readonly name: string;
  readonly farbe: string;
  /** 0 bis 100 %. */
  readonly deckkraft: number;
}

/** Startwerte für „Zone zeichnen“. Keine Regel-Schwellwerte. */
// CHECK MANUALLY: Deckkraft 40 % laut Spec E3, D1; Name und Farbe Startwert Claude
export const STANDARD_ZONE: ZoneParams = { name: 'Zone', farbe: '#4dabf7', deckkraft: 40 };

export type LinienTyp = 'weg' | 'zaun' | 'grenze';

/** Eine Linie (Spec E3, D1). `breite` (m) gilt nur beim Weg; bei Zaun und Grenze bleibt der Wert gespeichert, wird aber nicht geprüft. */
export interface LinienParams {
  readonly name: string;
  readonly typ: LinienTyp;
  readonly breite: number;
  readonly farbe: string;
}

/** Startwerte für „Linie zeichnen“: ein Weg, 1 m breit. Keine Regel-Schwellwerte. */
// CHECK MANUALLY: Breite 1 m laut Spec E3, D1; Name und Farbe Startwert Claude
export const STANDARD_LINIE: LinienParams = { name: 'Weg', typ: 'weg', breite: 1, farbe: '#a68a64' };
