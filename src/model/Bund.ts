import { naechstePunkte } from './geometrie';
import { BUND_CLUSTER_RADIUS, BUND_TOLERANZ } from './konstanten';
import type { Stange } from './Stange';
import { Vec3 } from './Vec3';

/** Stelle, an der zwei oder mehr Stangen zusammengebunden sind. Wird aus der Geometrie abgeleitet. */
export class Bund {
  constructor(
    readonly id: string,
    readonly position: Vec3,
    readonly stangenIds: readonly string[],
  ) {}

  enthaelt(stangeId: string): boolean {
    return this.stangenIds.includes(stangeId);
  }
}

export function mittelpunkt(punkte: readonly Vec3[]): Vec3 {
  return punkte.reduce((summe, p) => summe.add(p), Vec3.NULL).scale(1 / punkte.length);
}

interface Kontakt {
  readonly punkt: Vec3;
  readonly ids: readonly [string, string];
}

interface Cluster {
  readonly punkte: Vec3[];
  readonly ids: Set<string>;
}

/** Findet Bünde: Stangenpaare mit Achsabstand ≤ Toleranz, nahe Kontakte zu einem Bund zusammengefasst. */
export class BundFinder {
  constructor(
    private readonly toleranz = BUND_TOLERANZ,
    private readonly clusterRadius = BUND_CLUSTER_RADIUS,
  ) {}

  finde(stangen: readonly Stange[]): Bund[] {
    return this.gruppiere(this.kontakte(stangen)).map(
      (c, i) => new Bund(`bund-${i}`, mittelpunkt(c.punkte), [...c.ids].sort()),
    );
  }

  private kontakte(stangen: readonly Stange[]): Kontakt[] {
    const kontakte: Kontakt[] = [];
    for (let i = 0; i < stangen.length; i++) {
      for (let j = i + 1; j < stangen.length; j++) {
        const a = stangen[i] as Stange;
        const b = stangen[j] as Stange;
        const r = naechstePunkte(a.start, a.ende, b.start, b.ende);
        if (r.abstand <= this.toleranz) kontakte.push({ punkt: r.a.add(r.b).scale(0.5), ids: [a.id, b.id] });
      }
    }
    return kontakte;
  }

  private gruppiere(kontakte: readonly Kontakt[]): Cluster[] {
    const cluster: Cluster[] = [];
    for (const k of kontakte) {
      const passend = cluster.find((c) => mittelpunkt(c.punkte).distanceTo(k.punkt) <= this.clusterRadius);
      if (passend) {
        passend.punkte.push(k.punkt);
        k.ids.forEach((id) => passend.ids.add(id));
      } else {
        cluster.push({ punkte: [k.punkt], ids: new Set(k.ids) });
      }
    }
    return cluster;
  }
}
