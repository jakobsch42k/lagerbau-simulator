import {
  R1_MIN_WINKEL_ZUR_EBENE_GRAD,
  R2_PLANAR_TOLERANZ_RELATIV,
  R3_MAX_HOEHE_ZU_BREITE,
  R3_MIN_HOEHE,
  R4_MAX_BEINWINKEL_GRAD,
  R4_MIN_BEINWINKEL_GRAD,
  R6_MAX_WINKEL_GRAD,
  R6_MIN_WINKEL_GRAD,
  R7_MIN_HOEHE,
} from './constants';

export const REGEL_NAMEN = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'] as const;
export type RegelName = (typeof REGEL_NAMEN)[number];

/** Die einstellbaren Schwellwerte, benannt wie ihre Konstanten in constants.ts. */
export const WERT_SCHLUESSEL = [
  'R1_MIN_WINKEL_ZUR_EBENE_GRAD',
  'R2_PLANAR_TOLERANZ_RELATIV',
  'R3_MAX_HOEHE_ZU_BREITE',
  'R3_MIN_HOEHE',
  'R4_MIN_BEINWINKEL_GRAD',
  'R4_MAX_BEINWINKEL_GRAD',
  'R6_MIN_WINKEL_GRAD',
  'R6_MAX_WINKEL_GRAD',
  'R7_MIN_HOEHE',
] as const;
export type WertSchluessel = (typeof WERT_SCHLUESSEL)[number];
export type Regelwerte = Readonly<Partial<Record<WertSchluessel, number>>>;

/** Die Standardwerte bleiben in constants.ts (Startwerte, von Jakob zu bestätigen). */
const STANDARD: Readonly<Record<WertSchluessel, number>> = {
  R1_MIN_WINKEL_ZUR_EBENE_GRAD,
  R2_PLANAR_TOLERANZ_RELATIV,
  R3_MAX_HOEHE_ZU_BREITE,
  R3_MIN_HOEHE,
  R4_MIN_BEINWINKEL_GRAD,
  R4_MAX_BEINWINKEL_GRAD,
  R6_MIN_WINKEL_GRAD,
  R6_MAX_WINKEL_GRAD,
  R7_MIN_HOEHE,
};

const WINKEL: ReadonlySet<WertSchluessel> = new Set<WertSchluessel>([
  'R1_MIN_WINKEL_ZUR_EBENE_GRAD',
  'R4_MIN_BEINWINKEL_GRAD',
  'R4_MAX_BEINWINKEL_GRAD',
  'R6_MIN_WINKEL_GRAD',
  'R6_MAX_WINKEL_GRAD',
]);

/** Untergrenze und Obergrenze derselben Regel. */
const PAARE: readonly (readonly [WertSchluessel, WertSchluessel])[] = [
  ['R4_MIN_BEINWINKEL_GRAD', 'R4_MAX_BEINWINKEL_GRAD'],
  ['R6_MIN_WINKEL_GRAD', 'R6_MAX_WINKEL_GRAD'],
];

export function istRegelName(x: unknown): x is RegelName {
  return typeof x === 'string' && (REGEL_NAMEN as readonly string[]).includes(x);
}

export function istWertSchluessel(x: unknown): x is WertSchluessel {
  return typeof x === 'string' && (WERT_SCHLUESSEL as readonly string[]).includes(x);
}

/**
 * Welche Regeln aus sind und welche Werte vom Standard abweichen (Spec v3, D8). Unveränderlich;
 * sie gehören zum Bauwerk, damit eine Änderung über den Verlauf läuft und mit Datei und Link reist.
 */
export class RegelEinstellungen {
  private static readonly STANDARD_INSTANZ = new RegelEinstellungen(new Set(), {});

  private constructor(
    readonly aus: ReadonlySet<RegelName>,
    readonly werte: Regelwerte,
  ) {}

  /** Alle Regeln an, alle Werte aus constants.ts. */
  static standard(): RegelEinstellungen {
    return RegelEinstellungen.STANDARD_INSTANZ;
  }

  /** Baut Einstellungen in einem Schritt, z. B. beim Laden: erst alle Werte prüfen, dann die Paare. */
  static von(aus: Iterable<RegelName>, werte: Regelwerte): RegelEinstellungen {
    const einstellungen = new RegelEinstellungen(new Set(aus), { ...werte });
    einstellungen.pruefe();
    return einstellungen;
  }

  get istStandard(): boolean {
    return this.aus.size === 0 && Object.keys(this.werte).length === 0;
  }

  istAus(name: RegelName): boolean {
    return this.aus.has(name);
  }

  /** Der wirksame Wert: eingestellt oder Standard. */
  wert(schluessel: WertSchluessel): number {
    return this.werte[schluessel] ?? STANDARD[schluessel];
  }

  mitAus(name: RegelName, aus: boolean): RegelEinstellungen {
    if (this.aus.has(name) === aus) return this;
    const neu = aus ? [...this.aus, name] : [...this.aus].filter((n) => n !== name);
    return new RegelEinstellungen(new Set(neu), this.werte);
  }

  /** Wirft einen RangeError mit deutscher Meldung, wenn der Wert nicht passt. */
  mitWert(schluessel: WertSchluessel, wert: number): RegelEinstellungen {
    const werte: Partial<Record<WertSchluessel, number>> = { ...this.werte, [schluessel]: wert };
    return RegelEinstellungen.von(this.aus, werte);
  }

  private pruefe(): void {
    for (const schluessel of WERT_SCHLUESSEL) {
      const wert = this.werte[schluessel];
      if (wert === undefined) continue;
      if (WINKEL.has(schluessel)) {
        if (!(Number.isFinite(wert) && wert > 0 && wert <= 90)) throw new RangeError('Winkel muss zwischen 0 und 90° liegen');
      } else if (!(Number.isFinite(wert) && wert > 0)) {
        throw new RangeError('Wert muss größer als 0 sein');
      }
    }
    for (const [unten, oben] of PAARE) {
      if (!(this.wert(unten) < this.wert(oben))) throw new RangeError('Untergrenze muss kleiner als die Obergrenze sein');
    }
  }
}
