import type { Bauwerk } from '../model/Bauwerk';
import type { Bund } from '../model/Bund';
import type { Fuss } from '../model/Fuss';
import type { Stange } from '../model/Stange';

/** Einmal pro Prüfung abgeleitete Daten, die alle Regeln teilen. */
export class Analyse {
  readonly stangen: readonly Stange[];
  readonly buende: readonly Bund[];
  readonly fuesse: readonly Fuss[];

  constructor(readonly bauwerk: Bauwerk) {
    this.stangen = bauwerk.stangen();
    this.buende = bauwerk.buende();
    this.fuesse = bauwerk.fuesse();
  }

  stange(id: string): Stange {
    const s = this.stangen.find((x) => x.id === id);
    if (!s) throw new Error(`Stange ${id} fehlt`);
    return s;
  }

  buendeVon(stangeId: string): Bund[] {
    return this.buende.filter((b) => b.enthaelt(stangeId));
  }

  fuesseVon(stangeId: string): Fuss[] {
    return this.fuesse.filter((f) => f.stangeId === stangeId);
  }

  /** Stangen-IDs je zusammenhängendem Bau (über Bünde verbunden), per Union-Find. */
  komponenten(): string[][] {
    const eltern = new Map(this.stangen.map((s) => [s.id, s.id]));
    const wurzel = (id: string): string => {
      let w = id;
      while (eltern.get(w) !== w) w = eltern.get(w) as string;
      return w;
    };
    for (const b of this.buende) {
      const [erste, ...rest] = b.stangenIds;
      for (const id of rest) eltern.set(wurzel(id), wurzel(erste as string));
    }
    const gruppen = new Map<string, string[]>();
    for (const s of this.stangen) {
      const w = wurzel(s.id);
      gruppen.set(w, [...(gruppen.get(w) ?? []), s.id]);
    }
    return [...gruppen.values()];
  }
}
