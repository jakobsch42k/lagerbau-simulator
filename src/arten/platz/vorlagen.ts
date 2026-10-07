import type { PlatzobjektForm, PlatzobjektParams } from '../../model/params';
import { VorlagenWahl as VorlagenWahlBasis } from '../VorlagenWahl';

/** Eine Vorlage für Platz-Objekte: Startwerte, die alle Felder vorbelegen (Spec E3, D2). Das Objekt lässt sich danach frei einstellen. */
export interface Vorlage {
  readonly schluessel: string;
  readonly label: string;
  readonly form: PlatzobjektForm;
  /** Beim Kreis der Durchmesser. */
  readonly breite: number;
  /** Beim Kreis gleich der Breite (das Feld wird dort nicht gezeigt). */
  readonly laenge: number;
  readonly hoehe: number;
  readonly farbe: string;
}

/**
 * Die Vorlagen an einer Stelle, leicht zu ändern. Alle Werte sind Startwerte von Claude, keine Regel-Schwellwerte.
 * Die Reihenfolge ist die der Auswahl im Werkzeug und im Panel.
 */
export const VORLAGEN: readonly Vorlage[] = [
  // CHECK MANUALLY: Startwert Claude (Spec E3, D2)
  { schluessel: 'feuerstelle', label: 'Feuerstelle', form: 'kreis', breite: 1.5, laenge: 1.5, hoehe: 0.3, farbe: '#e8590c' },
  // CHECK MANUALLY: Startwert Claude (Spec E3, D2)
  { schluessel: 'fahnenmast', label: 'Fahnenmast', form: 'kreis', breite: 0.2, laenge: 0.2, hoehe: 8, farbe: '#7f5539' },
  // CHECK MANUALLY: Startwert Claude (Spec E3, D2)
  { schluessel: 'latrine', label: 'Latrine/WC', form: 'rechteck', breite: 1.5, laenge: 1.5, hoehe: 2, farbe: '#868e96' },
  // CHECK MANUALLY: Startwert Claude (Spec E3, D2)
  { schluessel: 'wasserstelle', label: 'Wasserstelle', form: 'kreis', breite: 1, laenge: 1, hoehe: 1, farbe: '#339af0' },
  // CHECK MANUALLY: Startwert Claude (Spec E3, D2)
  { schluessel: 'holzlager', label: 'Holzlager', form: 'rechteck', breite: 3, laenge: 2, hoehe: 1, farbe: '#8b5a2b' },
  // CHECK MANUALLY: keine Quelle, Startwert von Claude (Spec E6, D2)
  { schluessel: 'kueche', label: 'Küche', form: 'rechteck', breite: 4, laenge: 3, hoehe: 0.1, farbe: '#c9a227' },
  // CHECK MANUALLY: Startwert Claude (Spec E3, D2)
  { schluessel: 'eigenes', label: 'Eigenes', form: 'rechteck', breite: 2, laenge: 2, hoehe: 1, farbe: '#868e96' },
];

export function findeVorlage(schluessel: string): Vorlage | undefined {
  return VORLAGEN.find((v) => v.schluessel === schluessel);
}

/** Alle Felder eines Platz-Objekts aus einer Vorlage; der Name ist der Name der Vorlage. */
export function paramsAusVorlage(v: Vorlage): PlatzobjektParams {
  return { vorlage: v.schluessel, name: v.label, form: v.form, breite: v.breite, laenge: v.laenge, hoehe: v.hoehe, farbe: v.farbe };
}

/** Die im Werkzeug „Platz-Objekt“ gewählte Vorlage (Mechanismus in `../VorlagenWahl`); Start ist die Feuerstelle. */
export class VorlagenWahl extends VorlagenWahlBasis<Vorlage> {
  constructor() {
    super(VORLAGEN);
  }
}
