import {
  P1_MIN_ABSTAND_FEUER_ZELT_M,
  P2_MIN_ABSTAND_FEUER_HOLZ_M,
  P3_MIN_ABSTAND_ZELT_ZELT_M,
  P4_MIN_ABSTAND_LATRINE_WASSER_M,
  P5_MIN_ABSTAND_LATRINE_KUECHE_M,
  P6_KRONENRADIUS_FAKTOR,
} from './constants';

export const PLATZREGEL_NAMEN = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const;
export type PlatzRegelName = (typeof PLATZREGEL_NAMEN)[number];

/** Die einstellbaren Werte, benannt wie ihre Konstanten in constants.ts. */
export const PLATZ_WERT_SCHLUESSEL = [
  'P1_MIN_ABSTAND_FEUER_ZELT_M',
  'P2_MIN_ABSTAND_FEUER_HOLZ_M',
  'P3_MIN_ABSTAND_ZELT_ZELT_M',
  'P4_MIN_ABSTAND_LATRINE_WASSER_M',
  'P5_MIN_ABSTAND_LATRINE_KUECHE_M',
  'P6_KRONENRADIUS_FAKTOR',
] as const;
export type PlatzWertSchluessel = (typeof PLATZ_WERT_SCHLUESSEL)[number];
export type PlatzRegelwerte = Readonly<Partial<Record<PlatzWertSchluessel, number>>>;

const STANDARD: Readonly<Record<PlatzWertSchluessel, number>> = {
  P1_MIN_ABSTAND_FEUER_ZELT_M,
  P2_MIN_ABSTAND_FEUER_HOLZ_M,
  P3_MIN_ABSTAND_ZELT_ZELT_M,
  P4_MIN_ABSTAND_LATRINE_WASSER_M,
  P5_MIN_ABSTAND_LATRINE_KUECHE_M,
  P6_KRONENRADIUS_FAKTOR,
};

const MAX_ABSTAND_M = 500;
const FAKTOR: PlatzWertSchluessel = 'P6_KRONENRADIUS_FAKTOR';

export function istPlatzRegelName(x: unknown): x is PlatzRegelName {
  return typeof x === 'string' && (PLATZREGEL_NAMEN as readonly string[]).includes(x);
}

export function istPlatzWertSchluessel(x: unknown): x is PlatzWertSchluessel {
  return typeof x === 'string' && (PLATZ_WERT_SCHLUESSEL as readonly string[]).includes(x);
}

/**
 * Welche Platzregeln aus sind und welche Werte vom Standard abweichen (Spec E6, D4). Gleiches Muster wie `RegelEinstellungen`;
 * unveränderlich, gehört zum Bauwerk (Undo, Datei, Link).
 */
export class PlatzregelEinstellungen {
  private static readonly STANDARD_INSTANZ = new PlatzregelEinstellungen(new Set(), {});

  private constructor(
    readonly aus: ReadonlySet<PlatzRegelName>,
    readonly werte: PlatzRegelwerte,
  ) {}

  static standard(): PlatzregelEinstellungen {
    return PlatzregelEinstellungen.STANDARD_INSTANZ;
  }

  /** Baut Einstellungen in einem Schritt, z. B. beim Laden; prüft alle Werte. */
  static von(aus: Iterable<PlatzRegelName>, werte: PlatzRegelwerte): PlatzregelEinstellungen {
    const einstellungen = new PlatzregelEinstellungen(new Set(aus), { ...werte });
    einstellungen.pruefe();
    return einstellungen;
  }

  get istStandard(): boolean {
    return this.aus.size === 0 && Object.keys(this.werte).length === 0;
  }

  istAus(name: PlatzRegelName): boolean {
    return this.aus.has(name);
  }

  /** Der wirksame Wert: eingestellt oder Standard. */
  wert(schluessel: PlatzWertSchluessel): number {
    return this.werte[schluessel] ?? STANDARD[schluessel];
  }

  mitAus(name: PlatzRegelName, aus: boolean): PlatzregelEinstellungen {
    if (this.aus.has(name) === aus) return this;
    const neu = aus ? [...this.aus, name] : [...this.aus].filter((n) => n !== name);
    return new PlatzregelEinstellungen(new Set(neu), this.werte);
  }

  /** Wirft einen RangeError mit deutscher Meldung, wenn der Wert nicht passt; der Standardwert wird nicht gespeichert. */
  mitWert(schluessel: PlatzWertSchluessel, wert: number): PlatzregelEinstellungen {
    if (this.wert(schluessel) === wert) return this;
    const werte: Partial<Record<PlatzWertSchluessel, number>> = { ...this.werte, [schluessel]: wert };
    if (wert === STANDARD[schluessel]) delete werte[schluessel];
    return PlatzregelEinstellungen.von(this.aus, werte);
  }

  private pruefe(): void {
    for (const schluessel of PLATZ_WERT_SCHLUESSEL) {
      const wert = this.werte[schluessel];
      if (wert === undefined) continue;
      if (schluessel === FAKTOR) {
        if (!(Number.isFinite(wert) && wert > 0 && wert <= 1)) throw new RangeError('Faktor muss zwischen 0 und 1 liegen');
      } else if (!(Number.isFinite(wert) && wert > 0)) {
        throw new RangeError('Wert muss größer als 0 sein');
      } else if (wert > MAX_ABSTAND_M) {
        throw new RangeError('Abstand darf höchstens 500 m betragen');
      }
    }
  }
}
