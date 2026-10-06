import type { Bauwerk } from './Bauwerk';
import { Platzbedarf } from './Platzbedarf';
import { Stangenliste } from './Stangenliste';

export interface SeilZeile {
  readonly laenge: number;
  readonly anzahl: number;
}

export interface PlanenZeile {
  /** Kürzere Seite in m, auf 0,1 m gerundet. */
  readonly breite: number;
  /** Längere Seite in m, auf 0,1 m gerundet. */
  readonly laenge: number;
  readonly anzahl: number;
}

const aufZehntel = (x: number): number => Math.round(x * 10) / 10;

/** Alles, was man zum Aufbauen holen muss: Stangen, Seile, Haringe, Planen, dazu der Platzbedarf. */
export class Materialliste {
  private constructor(
    readonly stangen: Stangenliste,
    readonly seile: readonly SeilZeile[],
    readonly anzahlHaringe: number,
    readonly planen: readonly PlanenZeile[],
    readonly platzbedarf: Platzbedarf | null,
  ) {}

  /** @param zugabeProEnde Seil für den Knoten je Ende in m (SEIL_ZUGABE_PRO_ENDE aus src/rules/constants.ts). */
  static aus(bauwerk: Bauwerk, zugabeProEnde: number): Materialliste {
    const zaehler = new Map<number, number>();
    for (const s of bauwerk.seile) {
      const laenge = Math.ceil(s.laenge + 2 * zugabeProEnde - 1e-6);
      zaehler.set(laenge, (zaehler.get(laenge) ?? 0) + 1);
    }
    const seile = [...zaehler.entries()].map(([laenge, anzahl]) => ({ laenge, anzahl })).sort((a, b) => b.laenge - a.laenge);
    return new Materialliste(
      Stangenliste.aus(bauwerk),
      seile,
      bauwerk.haringe().length,
      Materialliste.planen(bauwerk),
      Platzbedarf.aus(bauwerk),
    );
  }

  /** Planen nach Größe gruppiert; 4 × 3 zählt als 3 × 4 (Spec v2b, D4). */
  private static planen(bauwerk: Bauwerk): PlanenZeile[] {
    const zeilen = new Map<string, PlanenZeile>();
    for (const p of bauwerk.planen) {
      const a = aufZehntel(p.params.breite);
      const b = aufZehntel(p.params.laenge);
      const breite = Math.min(a, b);
      const laenge = Math.max(a, b);
      const schluessel = `${breite}×${laenge}`;
      zeilen.set(schluessel, { breite, laenge, anzahl: (zeilen.get(schluessel)?.anzahl ?? 0) + 1 });
    }
    return [...zeilen.values()].sort((x, y) => y.laenge - x.laenge || y.breite - x.breite);
  }
}
