/** Eine Zeile der Lagerliste (Spec E5, D1). */
export interface MaterialPosten {
  readonly kategorie: string;
  readonly bezeichnung: string;
  readonly menge: number;
  readonly einheit: 'Stk' | 'm';
}

/** Der Beitrag eines Objekts zur Lagerliste: `gruppe` ist der Titel des Blocks („Jurte 6er“, „Feuerstelle“, „Zaun“). */
export interface MaterialBeitrag {
  readonly gruppe: string;
  readonly posten: readonly MaterialPosten[];
}

/** Seillänge in ganzen Metern mit Zugabe je Ende; dieselbe Formel wie `Materialliste` bei den Seilen der Bauten. */
export const seilLaenge = (laenge: number, zugabeProEnde: number): number => Math.ceil(laenge + 2 * zugabeProEnde - 1e-6);

const SEIL_KATEGORIE = 'Seil';

/** Meter aus einer Bezeichnung wie „Abspannseil 3 m“ (für die Sortierung der Seile). */
const seilMeter = (bezeichnung: string): number => Number(/(\d+(?:\.\d+)?) m$/.exec(bezeichnung)?.[1] ?? 0);

export const MaterialPosten = {
  /** Kategorie der Seile; gleiche Kategorie wird nach Länge absteigend sortiert. */
  SEIL_KATEGORIE,

  /** Gleiche Kategorie + Bezeichnung + Einheit addieren ihre Menge. Sortiert nach Kategorie, dann Bezeichnung; Seile absteigend nach Länge. */
  summiere(posten: readonly MaterialPosten[]): MaterialPosten[] {
    const summe = new Map<string, MaterialPosten>();
    for (const p of posten) {
      const schluessel = `${p.kategorie}\u0000${p.bezeichnung}\u0000${p.einheit}`;
      const alt = summe.get(schluessel);
      summe.set(schluessel, alt ? { ...alt, menge: alt.menge + p.menge } : p);
    }
    return [...summe.values()].sort((a, b) => {
      if (a.kategorie !== b.kategorie) return a.kategorie.localeCompare(b.kategorie, 'de');
      if (a.kategorie === SEIL_KATEGORIE) return seilMeter(b.bezeichnung) - seilMeter(a.bezeichnung) || a.bezeichnung.localeCompare(b.bezeichnung, 'de');
      return a.bezeichnung.localeCompare(b.bezeichnung, 'de');
    });
  },
};
