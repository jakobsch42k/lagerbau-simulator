import { Bau } from '../model/Bau';
import type { Bauwerk } from '../model/Bauwerk';
import type { Bund } from '../model/Bund';
import type { Fuss } from '../model/Fuss';
import type { Seil } from '../model/Seil';
import type { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import type { Haring, Verankerung } from '../model/Verankerung';

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
  readonly haringe: readonly Haring[];
  private readonly verankerungen: ReadonlyMap<string, readonly [Verankerung, Verankerung]>;

  constructor(readonly bauwerk: Bauwerk) {
    this.stangen = bauwerk.stangen();
    this.buende = bauwerk.buende();
    this.fuesse = bauwerk.fuesse();
    this.seile = bauwerk.seile;
    this.haringe = bauwerk.haringe();
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

  /** Stangen-IDs je zusammenhängendem Bau (über Bünde verbunden). Seile verbinden nichts. */
  komponenten(): string[][] {
    return Bau.stangenGruppen(this.stangen, this.buende);
  }
}
