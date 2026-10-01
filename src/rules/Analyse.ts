import type { Bauwerk } from '../model/Bauwerk';
import type { Bund } from '../model/Bund';
import type { Fuss } from '../model/Fuss';
import type { Seil } from '../model/Seil';
import type { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import type { Hering, Verankerung } from '../model/Verankerung';

/** Ein Seil, das an einer Stange hängt, gesehen von dieser Stange aus. */
export interface SeilAnschluss {
  readonly seil: Seil;
  /** Das andere Ende des Seils … */
  readonly anderesEnde: Vec3;
  /** … und woran es hängt. */
  readonly anderes: Verankerung;
}

/** Einmal pro Prüfung abgeleitete Daten, die alle Regeln teilen. */
export class Analyse {
  readonly stangen: readonly Stange[];
  readonly buende: readonly Bund[];
  readonly fuesse: readonly Fuss[];
  readonly seile: readonly Seil[];
  readonly heringe: readonly Hering[];
  private readonly verankerungen: ReadonlyMap<string, readonly [Verankerung, Verankerung]>;

  constructor(readonly bauwerk: Bauwerk) {
    this.stangen = bauwerk.stangen();
    this.buende = bauwerk.buende();
    this.fuesse = bauwerk.fuesse();
    this.seile = bauwerk.seile;
    this.heringe = bauwerk.heringe();
    this.verankerungen = new Map(
      this.seile.map((s): [string, readonly [Verankerung, Verankerung]] => [
        s.id,
        [bauwerk.verankerung(s.start), bauwerk.verankerung(s.ende)],
      ]),
    );
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

  /** Verankerung von Start und Ende eines Seils. */
  verankerungVon(seilId: string): readonly [Verankerung, Verankerung] {
    const v = this.verankerungen.get(seilId);
    if (!v) throw new Error(`Seil ${seilId} fehlt`);
    return v;
  }

  /** Seile, die mit einem Ende an einer der Stangen hängen, jeweils mit ihrem anderen Ende. */
  seileAn(stangenIds: ReadonlySet<string>): SeilAnschluss[] {
    return this.seile.flatMap((seil) => {
      const [anfang, schluss] = this.verankerungVon(seil.id);
      const anschluesse: SeilAnschluss[] = [];
      if (anfang.art === 'bau' && stangenIds.has(anfang.stangeId)) anschluesse.push({ seil, anderesEnde: seil.ende, anderes: schluss });
      if (schluss.art === 'bau' && stangenIds.has(schluss.stangeId)) anschluesse.push({ seil, anderesEnde: seil.start, anderes: anfang });
      return anschluesse;
    });
  }

  /** Stangen-IDs je zusammenhängendem Bau (über Bünde verbunden), per Union-Find. Seile verbinden nichts. */
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
