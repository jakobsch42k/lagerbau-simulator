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
