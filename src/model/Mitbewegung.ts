import type { Bauwerk } from './Bauwerk';
import { Baugruppe } from './Baugruppe';
import { Bau } from './Bau';
import type { LagerObjekt } from './LagerObjekt';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';
import type { Verankerung } from './Verankerung';

/** Eine waagrechte Verschiebung oder eine Drehung um die senkrechte Achse durch `um` (Winkel in Bogenmaß, wie `LagerObjekt.gedreht`). */
export type Bewegung =
  | { readonly art: 'verschiebung'; readonly dv: Vec3 }
  | { readonly art: 'drehung'; readonly winkelRad: number; readonly um: Vec3 };

export const PRAEFIX_ABGELEHNT = 'Verschieben nicht möglich: ';

/**
 * Bewegt Objekte samt dem, was an ihnen hängt (Spec E1, D2). Rein, ohne three.js. Liefert das neue Bauwerk, oder wirft
 * einen RangeError mit „Verschieben nicht möglich: …“, wenn dabei etwas nicht mehr geht (z. B. eine Plane); dann ändert sich nichts.
 * Die Bewegung ist immer waagrecht, alle Objekte behalten ihre Höhe. Unbekannte ids zählen nicht.
 */
export function bewege(bauwerk: Bauwerk, ids: readonly string[], bewegung: Bewegung): Bauwerk {
  try {
    return new Mitbewegung(bauwerk, ids, bewegung).ergebnis();
  } catch (e) {
    if (e instanceof RangeError && !e.message.startsWith(PRAEFIX_ABGELEHNT)) throw new RangeError(PRAEFIX_ABGELEHNT + e.message);
    throw e;
  }
}

/**
 * Alles, was bei einer Bewegung der `ids` ganz mitwandert: die Objekte selbst, dazu Planen mit beiden Enden und Seile mit beiden
 * Enden an Bewegtem (ein Haring-Ende zieht mit). Seile und Planen mit einem festen Ende (Baum, nicht Gewähltes) bleiben draußen.
 * Das ist die Menge, die Duplizieren und Kopieren mitnehmen. Die Reihenfolge ist die des Bauwerks.
 */
export function mitgenommen(bauwerk: Bauwerk, ids: readonly string[]): readonly LagerObjekt[] {
  return new Mitbewegung(bauwerk, ids, { art: 'verschiebung', dv: Vec3.NULL }).mitgenommene();
}

class Mitbewegung {
  private readonly bewegte: ReadonlyMap<string, LagerObjekt>;
  private readonly stangen: readonly Stange[];
  private readonly planen = new Map<string, Plane>();

  constructor(
    private readonly bauwerk: Bauwerk,
    ids: readonly string[],
    private readonly bewegung: Bewegung,
  ) {
    const objekte = ids.flatMap((id) => bauwerk.besitzer(id) ?? []);
    this.bewegte = new Map(objekte.map((o) => [o.id, o]));
    this.stangen = objekte.flatMap((o) => (o instanceof Baugruppe ? o.stangen() : o instanceof Stange ? [o] : []));
  }

  ergebnis(): Bauwerk {
    if (this.bewegte.size === 0) return this.bauwerk;
    const neu = new Map<string, LagerObjekt>();
    for (const o of this.bewegte.values()) neu.set(o.id, this.bewegeObjekt(o));
    for (const plane of this.bauwerk.planen) {
      if (!this.bewegte.has(plane.id)) this.mitPlane(plane, neu);
    }
    for (const seil of this.bauwerk.seile) {
      if (!this.bewegte.has(seil.id)) this.mitSeil(seil, neu);
    }
    return [...neu.values()].reduce((b, o) => b.ersetze(o), this.bauwerk);
  }

  mitgenommene(): readonly LagerObjekt[] {
    for (const p of this.bauwerk.planen) if (this.beideAmBewegten(p)) this.planen.set(p.id, p);
    const mit = new Set<string>(this.bewegte.keys());
    for (const p of this.planen.keys()) mit.add(p);
    for (const seil of this.bauwerk.seile) {
      const [startZieht, endeZieht] = this.zieht2(seil);
      if (startZieht && endeZieht) mit.add(seil.id);
    }
    return this.bauwerk.objekte.filter((o) => mit.has(o.id));
  }

  private beideAmBewegten(plane: Plane): boolean {
    return !this.bewegte.has(plane.id) && this.amBewegten(plane.start) && this.amBewegten(plane.ende);
  }

  private bewegeObjekt(o: LagerObjekt): LagerObjekt {
    return this.bewegung.art === 'verschiebung' ? o.verschobenUm(this.waagrecht(this.bewegung.dv)) : o.gedreht(this.bewegung.winkelRad, this.bewegung.um);
  }

  private bewegePunkt(p: Vec3): Vec3 {
    return this.bewegung.art === 'verschiebung' ? p.add(this.waagrecht(this.bewegung.dv)) : p.gedrehtUmY(this.bewegung.winkelRad, this.bewegung.um);
  }

  private waagrecht(dv: Vec3): Vec3 {
    return new Vec3(dv.x, 0, dv.z);
  }

  private amBewegten(p: Vec3): boolean {
    return Bau.haengtAnPunkt(p, this.stangen);
  }

  /** Beide Enden an bewegten Stangen: Plane wandert ganz. Eines: neue Plane mit denselben Maßen auf der neuen Linie. Sonst unverändert. */
  private mitPlane(plane: Plane, neu: Map<string, LagerObjekt>): void {
    const startMit = this.amBewegten(plane.start);
    const endeMit = this.amBewegten(plane.ende);
    if (!startMit && !endeMit) return;
    const bewegt = startMit && endeMit
      ? this.bewegeObjekt(plane) as Plane
      : new Plane(plane.id, startMit ? this.bewegePunkt(plane.start) : plane.start, endeMit ? this.bewegePunkt(plane.ende) : plane.ende, plane.params);
    if (startMit && endeMit) this.planen.set(plane.id, bewegt);
    neu.set(plane.id, bewegt);
  }

  /**
   * Ein Ende wandert mit, wenn es an einem bewegten Teil hängt. Haring und freie Enden ziehen mit, wenn das andere Ende mitwandert.
   * Ein Ende an Baum oder an einem nicht bewegten Teil bleibt liegen, das Seil wird neu gespannt.
   */
  private mitSeil(seil: Seil, neu: Map<string, LagerObjekt>): void {
    const [startZieht, endeZieht] = this.zieht2(seil);
    if (!startZieht && !endeZieht) return;
    neu.set(seil.id, new Seil(seil.id, startZieht ? this.bewegePunkt(seil.start) : seil.start, endeZieht ? this.bewegePunkt(seil.ende) : seil.ende));
  }

  /** Ob Start und Ende des Seils mitwandern. */
  private zieht2(seil: Seil): readonly [boolean, boolean] {
    const start = this.bauwerk.verankerung(seil.start);
    const ende = this.bauwerk.verankerung(seil.ende);
    const startMit = this.haengtMit(start);
    const endeMit = this.haengtMit(ende);
    return [startMit || (endeMit && this.zieht(start)), endeMit || (startMit && this.zieht(ende))];
  }

  private haengtMit(v: Verankerung): boolean {
    if (v.art === 'bau') return this.stangen.some((s) => s.id === v.stangeId);
    if (v.art === 'plane') return this.bewegte.has(v.planeId) || this.planen.has(v.planeId);
    return false;
  }

  private zieht(v: Verankerung): boolean {
    return v.art === 'haring' || v.art === 'frei';
  }
}
