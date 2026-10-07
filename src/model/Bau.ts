import { Bauwerk } from './Bauwerk';
import type { Bund } from './Bund';
import { BUND_TOLERANZ } from './konstanten';
import { Plane } from './Plane';
import { Seil } from './Seil';
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

  /** Das erste Objekt des Baus in `Bauwerk.objekte`; trägt den Namen (Spec E5, D2). Leer nur bei einem Bau ohne Objekte (unbekannte id). */
  get erstesObjekt(): string {
    return this.objektIds[0] ?? '';
  }

  /**
   * Alle Bauten (Gruppen über Bünde verbundener Stangen, Spec E5, D2), geordnet nach dem ersten Objekt jedes Baus in `Bauwerk.objekte`.
   * Ein Seil zwischen zwei Bauten steht in beiden. Bäume und Objekte ohne Stange sind kein Bau.
   */
  static alle(bauwerk: Bauwerk): readonly Bau[] {
    const gruppen = Bau.stangenGruppen(bauwerk.stangen(), bauwerk.buende());
    const position = new Map(bauwerk.objekte.map((o, i) => [o.id, i]));
    const rang = (b: Bau): number => position.get(b.erstesObjekt) ?? Number.MAX_SAFE_INTEGER;
    return gruppen
      .map((g) => Bau.von(bauwerk, g[0] as string))
      .sort((a, b) => rang(a) - rang(b));
  }

  /** Ids der Seile und Planen, die an keinem Bau hängen (Seil Baum–Haring, Plane zwischen Bäumen), in der Reihenfolge des Bauwerks. */
  static ohneBau(bauwerk: Bauwerk): readonly string[] {
    const imBau = new Set(Bau.alle(bauwerk).flatMap((b) => b.objektIds));
    return bauwerk.objekte.filter((o) => (o instanceof Seil || o instanceof Plane) && !imBau.has(o.id)).map((o) => o.id);
  }

  /** Ein Bauwerk nur mit den Objekten dieses Baus (ohne Bäume), damit `Materialliste.aus` darauf läuft. Ohne Luftbild und Namen. */
  teilBauwerk(bauwerk: Bauwerk): Bauwerk {
    return Bauwerk.von(this.objektIds.flatMap((id) => bauwerk.objekt(id) ?? []), bauwerk.regelEinstellungen);
  }

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
    // Seile an der Öse einer Plane mit beiden Enden am Bau wandern mit der Plane (siehe `Mitbewegung`).
    const ganzePlanen = new Set(bauwerk.planen.filter((p) => Bau.haengtAnPunkt(p.start, stangen) && Bau.haengtAnPunkt(p.ende, stangen)).map((p) => p.id));
    for (const seil of bauwerk.seile) {
      const anPlane = seil.endpunkte().some((p) => {
        const v = bauwerk.verankerung(p);
        return v.art === 'plane' && ganzePlanen.has(v.planeId);
      });
      if (anPlane) ids.add(seil.id);
    }
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
