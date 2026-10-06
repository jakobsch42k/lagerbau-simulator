import { Baugruppe } from './Baugruppe';
import { Baum } from './Baum';
import { type Bund, BundFinder } from './Bund';
import { Fuss } from './Fuss';
import type { LagerObjekt } from './LagerObjekt';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Stange } from './Stange';
import type { Vec3 } from './Vec3';
import { type Haring, type Verankerung, VerankerungsFinder } from './Verankerung';

/**
 * Unveränderliches Aggregat: eine geordnete Liste aller Objekte (Spec v3, D1). Bünde, Füße und Haringe werden abgeleitet.
 * Die typisierten Listen und Methoden sind dünne Hüllen um `objekte`, damit Regeln und Tests unverändert bleiben.
 */
export class Bauwerk {
  readonly gruppen: readonly Baugruppe[];
  readonly freieStangen: readonly Stange[];
  readonly seile: readonly Seil[];
  readonly baeume: readonly Baum[];
  readonly planen: readonly Plane[];
  /** Jede id, auch die einer Gruppenstange, → ihr Objekt. Einmal pro Instanz berechnet; sicher, weil das Bauwerk unveränderlich ist. */
  private besitzerIndex: ReadonlyMap<string, LagerObjekt> | undefined;
  private stangenListe: readonly Stange[] | undefined;

  private constructor(readonly objekte: readonly LagerObjekt[]) {
    this.gruppen = objekte.filter((o): o is Baugruppe => o instanceof Baugruppe);
    this.freieStangen = objekte.filter((o): o is Stange => o instanceof Stange);
    this.seile = objekte.filter((o): o is Seil => o instanceof Seil);
    this.baeume = objekte.filter((o): o is Baum => o instanceof Baum);
    this.planen = objekte.filter((o): o is Plane => o instanceof Plane);
  }

  static leer(): Bauwerk {
    return new Bauwerk([]);
  }

  /** Baut ein Bauwerk in einem Schritt, z. B. beim Laden. Wirft bei doppelten ids. */
  static von(liste: readonly LagerObjekt[]): Bauwerk {
    const bauwerk = new Bauwerk([...liste]);
    bauwerk.index();
    return bauwerk;
  }

  get istLeer(): boolean {
    return this.objekte.length === 0;
  }

  /** Erst die Stangen aller Gruppen, dann die freien Stangen, wie vor E0. Von dieser Reihenfolge hängen die ids der Bünde ab. */
  stangen(): readonly Stange[] {
    this.stangenListe ??= [...this.gruppen.flatMap((g) => g.stangen()), ...this.freieStangen];
    return this.stangenListe;
  }

  /** Das Objekt mit genau dieser id. Die Stange einer Baugruppe ist kein eigenes Objekt. */
  objekt(id: string): LagerObjekt | undefined {
    const o = this.besitzer(id);
    return o?.id === id ? o : undefined;
  }

  /** Das Objekt, zu dem eine id gehört; bei der Stange einer Baugruppe die Baugruppe. */
  besitzer(teilId: string): LagerObjekt | undefined {
    return this.index().get(teilId);
  }

  gruppe(id: string): Baugruppe | undefined {
    const o = this.objekt(id);
    return o instanceof Baugruppe ? o : undefined;
  }

  stange(id: string): Stange | undefined {
    return this.stangen().find((s) => s.id === id);
  }

  seil(id: string): Seil | undefined {
    const o = this.objekt(id);
    return o instanceof Seil ? o : undefined;
  }

  baum(id: string): Baum | undefined {
    const o = this.objekt(id);
    return o instanceof Baum ? o : undefined;
  }

  plane(id: string): Plane | undefined {
    const o = this.objekt(id);
    return o instanceof Plane ? o : undefined;
  }

  enthaelt(id: string): boolean {
    return this.index().has(id);
  }

  /** Klickt man eine Gruppenstange an, wird die ganze Gruppe ausgewählt. */
  auswahlIdFuer(teilId: string): string {
    return this.besitzer(teilId)?.id ?? teilId;
  }

  mit(o: LagerObjekt): Bauwerk {
    this.pruefeFrei(o.ids());
    return new Bauwerk([...this.objekte, o]);
  }

  /** Ersetzt das Objekt mit derselben id. Alle anderen Objekte bleiben dieselben (`===`). */
  ersetze(o: LagerObjekt): Bauwerk {
    const alt = this.objekt(o.id);
    if (!alt) throw new Error(`Objekt ${o.id} gibt es nicht`);
    if (alt === o) return this;
    this.pruefeFrei(o.ids(), alt);
    return new Bauwerk(this.objekte.map((x) => (x === alt ? o : x)));
  }

  /** Entfernt das Objekt mit dieser id. Teil-ids (Stangen einer Gruppe) entfernen nichts. */
  ohne(id: string): Bauwerk {
    const rest = this.objekte.filter((o) => o.id !== id);
    return rest.length === this.objekte.length ? this : new Bauwerk(rest);
  }

  mitGruppe(gruppe: Baugruppe): Bauwerk {
    return this.mit(gruppe);
  }

  ersetzeGruppe(gruppe: Baugruppe): Bauwerk {
    if (!this.gruppe(gruppe.id)) throw new Error(`Baugruppe ${gruppe.id} gibt es nicht`);
    return this.ersetze(gruppe);
  }

  mitStange(stange: Stange): Bauwerk {
    if (stange.gruppeId !== null) throw new Error('Nur freie Stangen können direkt hinzugefügt werden');
    return this.mit(stange);
  }

  ersetzeStange(stange: Stange): Bauwerk {
    if (!this.freieStangen.some((s) => s.id === stange.id)) throw new Error(`Freie Stange ${stange.id} gibt es nicht`);
    return this.ersetze(stange);
  }

  mitSeil(seil: Seil): Bauwerk {
    return this.mit(seil);
  }

  mitBaum(baum: Baum): Bauwerk {
    return this.mit(baum);
  }

  ersetzeBaum(baum: Baum): Bauwerk {
    if (!this.baum(baum.id)) throw new Error(`Baum ${baum.id} gibt es nicht`);
    return this.ersetze(baum);
  }

  mitPlane(plane: Plane): Bauwerk {
    return this.mit(plane);
  }

  ersetzePlane(plane: Plane): Bauwerk {
    if (!this.plane(plane.id)) throw new Error(`Plane ${plane.id} gibt es nicht`);
    return this.ersetze(plane);
  }

  buende(): readonly Bund[] {
    return new BundFinder().finde(this.stangen());
  }

  fuesse(): readonly Fuss[] {
    return this.stangen().flatMap((s) => Fuss.von(s));
  }

  haringe(): readonly Haring[] {
    return new VerankerungsFinder().haringe(this.seile);
  }

  /** Woran ein Punkt hängt (Haring, Plane, Baum, Stange oder frei), z. B. ein Seilende. */
  verankerung(punkt: Vec3): Verankerung {
    return new VerankerungsFinder().finde(punkt, this.stangen(), this.baeume, this.planen);
  }

  private index(): ReadonlyMap<string, LagerObjekt> {
    if (this.besitzerIndex === undefined) {
      const index = new Map<string, LagerObjekt>();
      for (const o of this.objekte) {
        for (const id of o.ids()) {
          if (index.has(id)) throw new Error(`ID ${id} ist schon vergeben`);
          index.set(id, o);
        }
      }
      this.besitzerIndex = index;
    }
    return this.besitzerIndex;
  }

  /** Wirft, wenn eine der ids schon einem anderen Objekt als `ausser` gehört. */
  private pruefeFrei(ids: readonly string[], ausser?: LagerObjekt): void {
    for (const id of ids) {
      const besitzer = this.besitzer(id);
      if (besitzer !== undefined && besitzer !== ausser) throw new Error(`ID ${id} ist schon vergeben`);
    }
  }
}
