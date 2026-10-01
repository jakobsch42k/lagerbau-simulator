import type { Baugruppe } from './Baugruppe';
import type { Baum } from './Baum';
import { type Bund, BundFinder } from './Bund';
import { Fuss } from './Fuss';
import type { Seil } from './Seil';
import type { Stange } from './Stange';

/** Unveränderliches Aggregat aus Baugruppen, freien Stangen, Seilen und Bäumen. Bünde und Füße werden abgeleitet. */
export class Bauwerk {
  private constructor(
    readonly gruppen: readonly Baugruppe[],
    readonly freieStangen: readonly Stange[],
    readonly seile: readonly Seil[],
    readonly baeume: readonly Baum[],
  ) {}

  static leer(): Bauwerk {
    return new Bauwerk([], [], [], []);
  }

  get istLeer(): boolean {
    return this.gruppen.length === 0 && this.freieStangen.length === 0 && this.seile.length === 0 && this.baeume.length === 0;
  }

  stangen(): readonly Stange[] {
    return [...this.gruppen.flatMap((g) => g.stangen()), ...this.freieStangen];
  }

  gruppe(id: string): Baugruppe | undefined {
    return this.gruppen.find((g) => g.id === id);
  }

  stange(id: string): Stange | undefined {
    return this.stangen().find((s) => s.id === id);
  }

  seil(id: string): Seil | undefined {
    return this.seile.find((s) => s.id === id);
  }

  baum(id: string): Baum | undefined {
    return this.baeume.find((b) => b.id === id);
  }

  enthaelt(id: string): boolean {
    return this.gruppe(id) !== undefined || this.stange(id) !== undefined || this.seil(id) !== undefined || this.baum(id) !== undefined;
  }

  /** Klickt man eine Gruppenstange an, wird die ganze Gruppe ausgewählt. */
  auswahlIdFuer(stangeId: string): string {
    return this.stange(stangeId)?.gruppeId ?? stangeId;
  }

  mitGruppe(gruppe: Baugruppe): Bauwerk {
    this.pruefeNeu([gruppe.id, ...gruppe.stangen().map((s) => s.id)]);
    return new Bauwerk([...this.gruppen, gruppe], this.freieStangen, this.seile, this.baeume);
  }

  ersetzeGruppe(gruppe: Baugruppe): Bauwerk {
    if (!this.gruppe(gruppe.id)) throw new Error(`Baugruppe ${gruppe.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen.map((g) => (g.id === gruppe.id ? gruppe : g)),
      this.freieStangen,
      this.seile,
      this.baeume,
    );
  }

  mitStange(stange: Stange): Bauwerk {
    if (stange.gruppeId !== null) throw new Error('Nur freie Stangen können direkt hinzugefügt werden');
    this.pruefeNeu([stange.id]);
    return new Bauwerk(this.gruppen, [...this.freieStangen, stange], this.seile, this.baeume);
  }

  ersetzeStange(stange: Stange): Bauwerk {
    if (!this.freieStangen.some((s) => s.id === stange.id)) throw new Error(`Freie Stange ${stange.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen.map((s) => (s.id === stange.id ? stange : s)),
      this.seile,
      this.baeume,
    );
  }

  mitSeil(seil: Seil): Bauwerk {
    this.pruefeNeu([seil.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, [...this.seile, seil], this.baeume);
  }

  mitBaum(baum: Baum): Bauwerk {
    this.pruefeNeu([baum.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, this.seile, [...this.baeume, baum]);
  }

  ersetzeBaum(baum: Baum): Bauwerk {
    if (!this.baum(baum.id)) throw new Error(`Baum ${baum.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen,
      this.seile,
      this.baeume.map((b) => (b.id === baum.id ? baum : b)),
    );
  }

  ohne(id: string): Bauwerk {
    return new Bauwerk(
      this.gruppen.filter((g) => g.id !== id),
      this.freieStangen.filter((s) => s.id !== id),
      this.seile.filter((s) => s.id !== id),
      this.baeume.filter((b) => b.id !== id),
    );
  }

  buende(): readonly Bund[] {
    return new BundFinder().finde(this.stangen());
  }

  fuesse(): readonly Fuss[] {
    return this.stangen().flatMap((s) => Fuss.von(s));
  }

  private pruefeNeu(ids: readonly string[]): void {
    for (const id of ids) {
      if (this.enthaelt(id)) throw new Error(`ID ${id} ist schon vergeben`);
    }
  }
}
