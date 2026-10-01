import type { Bauwerk } from './Bauwerk';
import { Platzbedarf } from './Platzbedarf';
import { Stangenliste } from './Stangenliste';

export interface SeilZeile {
  readonly laenge: number;
  readonly anzahl: number;
}

/** Alles, was man zum Aufbauen holen muss: Stangen, Seile, Heringe, dazu der Platzbedarf. */
export class Materialliste {
  private constructor(
    readonly stangen: Stangenliste,
    readonly seile: readonly SeilZeile[],
    readonly anzahlHeringe: number,
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
    return new Materialliste(Stangenliste.aus(bauwerk), seile, bauwerk.heringe().length, Platzbedarf.aus(bauwerk));
  }
}
