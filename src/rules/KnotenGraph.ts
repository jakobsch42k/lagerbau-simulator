import { clustereNachNaehe, mittelpunkt } from '../model/Bund';
import { BUND_CLUSTER_RADIUS } from '../model/konstanten';
import type { Vec3 } from '../model/Vec3';
import type { Analyse } from './Analyse';

export const BODEN = 'boden';

export interface Knoten {
  readonly id: string;
  readonly position: Vec3;
  /** Stangen-IDs, auf denen der Knoten liegt, dazu BODEN bei Füßen. */
  readonly seiten: ReadonlySet<string>;
}

export interface Kante {
  readonly nach: Knoten;
  readonly seite: string;
}

/** Knoten = Bünde und Füße (nahe zusammengefasst). Zwei Knoten sind über jede gemeinsame Seite verbunden. */
export class KnotenGraph {
  readonly knoten: readonly Knoten[];
  private readonly kanten: ReadonlyMap<string, readonly Kante[]>;

  constructor(analyse: Analyse, clusterRadius = BUND_CLUSTER_RADIUS) {
    this.knoten = KnotenGraph.bilde(analyse, clusterRadius);
    this.kanten = new Map(this.knoten.map((k) => [k.id, this.kantenVon(k)]));
  }

  nachbarn(k: Knoten): readonly Kante[] {
    return this.kanten.get(k.id) ?? [];
  }

  verbunden(a: Knoten, b: Knoten): boolean {
    return this.nachbarn(a).some((kante) => kante.nach === b);
  }

  knotenAuf(seite: string): Knoten[] {
    return this.knoten.filter((k) => k.seiten.has(seite));
  }

  private kantenVon(k: Knoten): Kante[] {
    return this.knoten
      .filter((n) => n !== k)
      .flatMap((n) => [...k.seiten].filter((s) => n.seiten.has(s)).map((seite) => ({ nach: n, seite })));
  }

  private static bilde(analyse: Analyse, radius: number): Knoten[] {
    const roh = [
      ...analyse.buende.map((b) => ({ position: b.position, seiten: b.stangenIds })),
      ...analyse.fuesse.map((f) => ({ position: f.position, seiten: [f.stangeId, BODEN] })),
    ];
    return clustereNachNaehe(roh, (r) => r.position, radius).map((gruppe, i) => ({
      id: `k${i}`,
      position: mittelpunkt(gruppe.map((r) => r.position)),
      seiten: new Set(gruppe.flatMap((r) => [...r.seiten])),
    }));
  }
}
