import type { Bauwerk } from './Bauwerk';

export interface StangenlistenZeile {
  readonly laenge: number;
  readonly durchmesserCm: number;
  readonly anzahl: number;
}

/** Materialliste: wie viele Stangen welcher Mindestlänge und Stärke gebraucht werden. */
export class Stangenliste {
  private constructor(
    readonly zeilen: readonly StangenlistenZeile[],
    readonly anzahlBuende: number,
  ) {}

  static aus(bauwerk: Bauwerk): Stangenliste {
    const zaehler = new Map<string, StangenlistenZeile>();
    for (const s of bauwerk.stangen()) {
      const laenge = Math.ceil(s.laenge * 10 - 1e-6) / 10;
      const durchmesserCm = Math.round(s.durchmesser * 100);
      const schluessel = `${laenge}|${durchmesserCm}`;
      const bisher = zaehler.get(schluessel)?.anzahl ?? 0;
      zaehler.set(schluessel, { laenge, durchmesserCm, anzahl: bisher + 1 });
    }
    const zeilen = [...zaehler.values()].sort((a, b) => b.laenge - a.laenge || b.durchmesserCm - a.durchmesserCm);
    return new Stangenliste(zeilen, bauwerk.buende().length);
  }
}
