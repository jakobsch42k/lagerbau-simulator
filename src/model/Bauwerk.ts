import type { Baugruppe } from './Baugruppe';
import type { Baum } from './Baum';
import { type Bund, BundFinder } from './Bund';
import { Fuss } from './Fuss';
import type { Plane } from './Plane';
import type { Seil } from './Seil';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';
import { type Hering, type Verankerung, VerankerungsFinder } from './Verankerung';

/** Unveränderliches Aggregat aus Baugruppen, freien Stangen, Seilen, Bäumen und Planen. Bünde und Füße werden abgeleitet. */
export class Bauwerk {
  private constructor(
    readonly gruppen: readonly Baugruppe[],
    readonly freieStangen: readonly Stange[],
    readonly seile: readonly Seil[],
    readonly baeume: readonly Baum[],
    readonly planen: readonly Plane[],
  ) {}

  static leer(): Bauwerk {
    return new Bauwerk([], [], [], [], []);
  }

  get istLeer(): boolean {
    return (
      this.gruppen.length === 0 &&
      this.freieStangen.length === 0 &&
      this.seile.length === 0 &&
      this.baeume.length === 0 &&
      this.planen.length === 0
    );
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

  plane(id: string): Plane | undefined {
    return this.planen.find((p) => p.id === id);
  }

  enthaelt(id: string): boolean {
    return (
      this.gruppe(id) !== undefined ||
      this.stange(id) !== undefined ||
      this.seil(id) !== undefined ||
      this.baum(id) !== undefined ||
      this.plane(id) !== undefined
    );
  }

  /** Klickt man eine Gruppenstange an, wird die ganze Gruppe ausgewählt. */
  auswahlIdFuer(stangeId: string): string {
    return this.stange(stangeId)?.gruppeId ?? stangeId;
  }

  mitGruppe(gruppe: Baugruppe): Bauwerk {
    this.pruefeNeu([gruppe.id, ...gruppe.stangen().map((s) => s.id)]);
    return new Bauwerk([...this.gruppen, gruppe], this.freieStangen, this.seile, this.baeume, this.planen);
  }

  ersetzeGruppe(gruppe: Baugruppe): Bauwerk {
    if (!this.gruppe(gruppe.id)) throw new Error(`Baugruppe ${gruppe.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen.map((g) => (g.id === gruppe.id ? gruppe : g)),
      this.freieStangen,
      this.seile,
      this.baeume,
      this.planen,
    );
  }

  mitStange(stange: Stange): Bauwerk {
    if (stange.gruppeId !== null) throw new Error('Nur freie Stangen können direkt hinzugefügt werden');
    this.pruefeNeu([stange.id]);
    return new Bauwerk(this.gruppen, [...this.freieStangen, stange], this.seile, this.baeume, this.planen);
  }

  ersetzeStange(stange: Stange): Bauwerk {
    if (!this.freieStangen.some((s) => s.id === stange.id)) throw new Error(`Freie Stange ${stange.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen.map((s) => (s.id === stange.id ? stange : s)),
      this.seile,
      this.baeume,
      this.planen,
    );
  }

  mitSeil(seil: Seil): Bauwerk {
    this.pruefeNeu([seil.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, [...this.seile, seil], this.baeume, this.planen);
  }

  mitBaum(baum: Baum): Bauwerk {
    this.pruefeNeu([baum.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, this.seile, [...this.baeume, baum], this.planen);
  }

  ersetzeBaum(baum: Baum): Bauwerk {
    if (!this.baum(baum.id)) throw new Error(`Baum ${baum.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen,
      this.seile,
      this.baeume.map((b) => (b.id === baum.id ? baum : b)),
      this.planen,
    );
  }

  mitPlane(plane: Plane): Bauwerk {
    this.pruefeNeu([plane.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, this.seile, this.baeume, [...this.planen, plane]);
  }

  ersetzePlane(plane: Plane): Bauwerk {
    if (!this.plane(plane.id)) throw new Error(`Plane ${plane.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen,
      this.seile,
      this.baeume,
      this.planen.map((p) => (p.id === plane.id ? plane : p)),
    );
  }

  ohne(id: string): Bauwerk {
    return new Bauwerk(
      this.gruppen.filter((g) => g.id !== id),
      this.freieStangen.filter((s) => s.id !== id),
      this.seile.filter((s) => s.id !== id),
      this.baeume.filter((b) => b.id !== id),
      this.planen.filter((p) => p.id !== id),
    );
  }

  buende(): readonly Bund[] {
    return new BundFinder().finde(this.stangen());
  }

  fuesse(): readonly Fuss[] {
    return this.stangen().flatMap((s) => Fuss.von(s));
  }

  heringe(): readonly Hering[] {
    return new VerankerungsFinder().heringe(this.seile);
  }

  /** Woran ein Punkt hängt (Hering, Plane, Baum, Stange oder frei), z. B. ein Seilende. */
  verankerung(punkt: Vec3): Verankerung {
    return new VerankerungsFinder().finde(punkt, this.stangen(), this.baeume, this.planen);
  }

  private pruefeNeu(ids: readonly string[]): void {
    for (const id of ids) {
      if (this.enthaelt(id)) throw new Error(`ID ${id} ist schon vergeben`);
    }
  }
}
