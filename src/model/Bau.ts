import type { Bauwerk } from './Bauwerk';
import type { Bund } from './Bund';
import { BUND_TOLERANZ } from './konstanten';
import type { Plane } from './Plane';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

/**
 * Ein Bau (Spec E1, D1): eine Gruppe über Bünde verbundener Stangen, dazu alle Seile und Planen, deren Enden an diesen
 * Stangen hängen. Wird aus der Geometrie abgeleitet, nie gespeichert. Baum und fremde Seile gehören nicht dazu.
 */
export class Bau {
  private constructor(
    /** Ids der Stangen des Baus (leer bei einem Seil, einem Baum oder einer Plane ohne Bau). */
    readonly stangenIds: readonly string[],
    /** Ids aller Objekte des Baus in der Reihenfolge des Bauwerks: Baugruppen, freie Stangen, Seile, Planen. */
    readonly objektIds: readonly string[],
  ) {}

  /** Stangen-ids je zusammenhängendem Bau (über Bünde verbunden), per Union-Find. Seile verbinden nichts. */
  static stangenGruppen(stangen: readonly Stange[], buende: readonly Bund[]): string[][] {
    const eltern = new Map(stangen.map((s) => [s.id, s.id]));
    const wurzel = (id: string): string => {
      let w = id;
      while (eltern.get(w) !== w) w = eltern.get(w) as string;
      return w;
    };
    for (const b of buende) {
      const [erste, ...rest] = b.stangenIds;
      for (const id of rest) eltern.set(wurzel(id), wurzel(erste as string));
    }
    const gruppen = new Map<string, string[]>();
    for (const s of stangen) {
      const w = wurzel(s.id);
      gruppen.set(w, [...(gruppen.get(w) ?? []), s.id]);
    }
    return [...gruppen.values()];
  }

  /**
   * Der Bau, zu dem ein Teil gehört: eine Stange (auch die einer Baugruppe), eine Baugruppe, ein Seil oder eine Plane an
   * einem Bau. Alles andere (Baum, freies Seil, freie Plane) ist ein Bau aus nur diesem Objekt; eine unbekannte id ergibt einen leeren Bau.
   */
  static von(bauwerk: Bauwerk, teilId: string): Bau {
    const besitzer = bauwerk.besitzer(teilId);
    if (!besitzer) return new Bau([], []);
    const gruppen = Bau.stangenGruppen(bauwerk.stangen(), bauwerk.buende());
    const start = Bau.startStangen(bauwerk, besitzer.id);
    const stangenIds = gruppen.filter((g) => g.some((id) => start.has(id))).flat();
    if (stangenIds.length === 0) return new Bau([], [besitzer.id]);
    const dazu = new Set(stangenIds);
    const stangen = stangenIds.map((id) => bauwerk.stange(id) as Stange);
    const ids = new Set<string>(stangenIds.map((id) => bauwerk.auswahlIdFuer(id)));
    for (const seil of bauwerk.seile) {
      const haengtAn = seil.endpunkte().some((p) => {
        const v = bauwerk.verankerung(p);
        return v.art === 'bau' && dazu.has(v.stangeId);
      });
      if (haengtAn) ids.add(seil.id);
    }
    for (const plane of bauwerk.planen) if (Bau.haengtAn(plane, stangen)) ids.add(plane.id);
    return new Bau(stangenIds, bauwerk.objekte.map((o) => o.id).filter((id) => ids.has(id)));
  }

  /** Stangen, von denen aus der Bau gesucht wird: die des Objekts, bei Seil und Plane die, an denen es hängt. */
  private static startStangen(bauwerk: Bauwerk, objektId: string): Set<string> {
    const stange = bauwerk.stange(objektId);
    if (stange) return new Set([stange.id]);
    const gruppe = bauwerk.gruppe(objektId);
    if (gruppe) return new Set(gruppe.stangen().map((s) => s.id));
    const seil = bauwerk.seil(objektId);
    if (seil) {
      const anker = seil.endpunkte().map((p) => bauwerk.verankerung(p));
      return new Set(anker.flatMap((v) => (v.art === 'bau' ? [v.stangeId] : [])));
    }
    const plane = bauwerk.plane(objektId);
    if (plane) return new Set(bauwerk.stangen().filter((s) => Bau.haengtAn(plane, [s])).map((s) => s.id));
    return new Set();
  }

  /** Eine Plane hängt am Bau, wenn ein Ende ihrer Aufhängelinie höchstens `BUND_TOLERANZ` von einer Stange entfernt liegt. */
  static haengtAn(plane: Plane, stangen: readonly Stange[]): boolean {
    return [plane.start, plane.ende].some((p) => Bau.haengtAnPunkt(p, stangen));
  }

  /** Liegt der Punkt höchstens `BUND_TOLERANZ` von einer der Stangen entfernt? */
  static haengtAnPunkt(p: Vec3, stangen: readonly Stange[]): boolean {
    return stangen.some((s) => s.naechsterPunkt(p).distanceTo(p) <= BUND_TOLERANZ);
  }
}
