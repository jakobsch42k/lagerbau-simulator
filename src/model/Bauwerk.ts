import { Bau } from './Bau';
import { Baugruppe } from './Baugruppe';
import { Baum } from './Baum';
import { type Bund, BundFinder } from './Bund';
import { Fuss } from './Fuss';
import type { LagerObjekt } from './LagerObjekt';
import type { Luftbild } from './Luftbild';
import { RegelEinstellungen } from '../rules/RegelEinstellungen';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Stange } from './Stange';
import type { Vec3 } from './Vec3';
import { type Haring, type Verankerung, VerankerungsFinder } from './Verankerung';

/** Längster Bau-Name (Spec E5, D2). */
export const MAX_BAUNAME = 40;

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

  private constructor(
    readonly objekte: readonly LagerObjekt[],
    /** Regeln an/aus und eingestellte Werte (Spec v3, D8). Gehören zum Plan, nicht zu einem Objekt. */
    readonly regelEinstellungen: RegelEinstellungen = RegelEinstellungen.standard(),
    /** Das Luftbild als Boden (Spec E2, D1). Kein Objekt: nicht auswählbar, nicht verschiebbar, nicht in `objekte`. */
    readonly luftbild: Luftbild | null = null,
    /** Namen der Bauten (Spec E5, D2): Objekt-id → Name, am ersten Objekt des Baus. Nicht jeder Eintrag gilt, siehe `bauName`. */
    readonly bauNamen: ReadonlyMap<string, string> = new Map(),
  ) {
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
  static von(
    liste: readonly LagerObjekt[],
    regelEinstellungen: RegelEinstellungen = RegelEinstellungen.standard(),
    luftbild: Luftbild | null = null,
    bauNamen: ReadonlyMap<string, string> = new Map(),
  ): Bauwerk {
    const bauwerk = new Bauwerk([...liste], regelEinstellungen, luftbild, bauNamen);
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
    return new Bauwerk([...this.objekte, o], this.regelEinstellungen, this.luftbild, this.bauNamen);
  }

  /** Ersetzt das Objekt mit derselben id. Alle anderen Objekte bleiben dieselben (`===`). */
  ersetze(o: LagerObjekt): Bauwerk {
    const alt = this.objekt(o.id);
    if (!alt) throw new Error(`Objekt ${o.id} gibt es nicht`);
    if (alt === o) return this;
    this.pruefeFrei(o.ids(), alt);
    return new Bauwerk(this.objekte.map((x) => (x === alt ? o : x)), this.regelEinstellungen, this.luftbild, this.bauNamen);
  }

  /**
   * Entfernt das Objekt mit dieser id. Teil-ids (Stangen einer Gruppe) entfernen nichts. Trug das Objekt den Namen eines Baus,
   * geht er an das erste überlebende Objekt desselben Baus (Spec E5, D2); überlebt keines, entfällt er.
   */
  ohne(id: string): Bauwerk {
    const rest = this.objekte.filter((o) => o.id !== id);
    if (rest.length === this.objekte.length) return this;
    return new Bauwerk(rest, this.regelEinstellungen, this.luftbild, this.namenOhne(id));
  }

  /** Neue Regel-Einstellungen; alle Objekte bleiben dieselben (`===`). Über den Editor ein Undo-Schritt. */
  mitRegelEinstellungen(e: RegelEinstellungen): Bauwerk {
    return e === this.regelEinstellungen ? this : new Bauwerk(this.objekte, e, this.luftbild, this.bauNamen);
  }

  /** Luftbild laden, ändern oder (mit null) entfernen; alle Objekte bleiben dieselben (`===`). Über den Editor ein Undo-Schritt. */
  mitLuftbild(luftbild: Luftbild | null): Bauwerk {
    return luftbild === this.luftbild ? this : new Bauwerk(this.objekte, this.regelEinstellungen, luftbild, this.bauNamen);
  }

  /**
   * Benennt einen Bau (Spec E5, D2): löscht alle Einträge der Objekte des Baus und schreibt den Namen (getrimmt) am ersten Objekt.
   * `null` oder leerer Name entfernt den Namen („Bau N“). Wirft einen RangeError bei mehr als 40 Zeichen. Über den Editor ein Undo-Schritt.
   */
  mitBauName(bau: Bau, name: string | null): Bauwerk {
    const sauber = (name ?? '').trim();
    if (sauber.length > MAX_BAUNAME) throw new RangeError('Name muss 1 bis 40 Zeichen lang sein.');
    const neu = new Map(this.bauNamen);
    for (const id of bau.objektIds) neu.delete(id);
    if (sauber.length > 0 && bau.erstesObjekt !== '') neu.set(bau.erstesObjekt, sauber);
    return new Bauwerk(this.objekte, this.regelEinstellungen, this.luftbild, neu);
  }

  /** Name des Baus: der Eintrag des ersten Objekts, das einen hat; sonst „Bau N“ mit N = Position in `Bau.alle` (ab 1). */
  bauName(bau: Bau): string {
    for (const id of bau.objektIds) {
      const name = this.bauNamen.get(id);
      if (name !== undefined) return name;
    }
    const position = Bau.alle(this).findIndex((b) => b.stangenIds[0] === bau.stangenIds[0]);
    return position < 0 ? 'Bau' : `Bau ${position + 1}`;
  }

  private namenOhne(id: string): ReadonlyMap<string, string> {
    const name = this.bauNamen.get(id);
    if (name === undefined) return this.bauNamen;
    const neu = new Map(this.bauNamen);
    neu.delete(id);
    const bau = Bau.alle(this).find((b) => b.objektIds.includes(id));
    const erbe = bau?.objektIds.find((x) => x !== id);
    if (erbe !== undefined && !neu.has(erbe)) neu.set(erbe, name);
    return neu;
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
