import type { Baum } from './Baum';
import { clustereNachNaehe, mittelpunkt } from './Bund';
import { BUND_CLUSTER_RADIUS, BUND_TOLERANZ, FUSS_TOLERANZ } from './konstanten';
import type { Plane } from './Plane';
import type { Seil } from './Seil';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

/** Woran ein Seilende hängt. Wird aus der Geometrie abgeleitet, nie gespeichert. */
export type Verankerung =
  | { readonly art: 'haring' }
  | { readonly art: 'plane'; readonly planeId: string }
  | { readonly art: 'baum'; readonly baumId: string }
  | { readonly art: 'bau'; readonly stangeId: string }
  | { readonly art: 'frei' };

/** Ein Haring oder Pflock am Boden. Seilenden, die nah beieinander am Boden enden, teilen sich einen. */
export class Haring {
  constructor(
    readonly id: string,
    readonly position: Vec3,
    readonly seilIds: readonly string[],
  ) {}
}

interface Bodenende {
  readonly punkt: Vec3;
  readonly seilId: string;
}

/** Leitet ab, woran Seilenden hängen (Spec v2a, D1). */
export class VerankerungsFinder {
  constructor(
    private readonly toleranz = BUND_TOLERANZ,
    private readonly bodenToleranz = FUSS_TOLERANZ,
    private readonly clusterRadius = BUND_CLUSTER_RADIUS,
  ) {}

  /**
   * Reihenfolge: Boden vor Baum vor Stange vor Plane (Spec v2b, D1, geändert nach dem Final Review). Ein Knoten an Stange oder Stamm gehört zum Bau; eine Öse gewinnt nur, wo nichts Tragendes in Reichweite ist. Bei mehreren Teilen einer Art in Reichweite zählt das nächste.
   * Ein Ende an der Öse einer Bodenplane ist ein Haring, wie beim Abstecken.
   */
  finde(punkt: Vec3, stangen: readonly Stange[], baeume: readonly Baum[], planen: readonly Plane[] = []): Verankerung {
    if (punkt.y <= this.bodenToleranz) return { art: 'haring' };
    const baum = this.naechstes(baeume, (b) => b.abstandZumStamm(punkt));
    if (baum) return { art: 'baum', baumId: baum.id };
    const stange = this.naechstes(stangen, (s) => s.naechsterPunkt(punkt).distanceTo(punkt));
    if (stange) return { art: 'bau', stangeId: stange.id };
    const plane = this.naechstes(planen, (p) => p.abstandZurOese(punkt));
    return plane ? { art: 'plane', planeId: plane.id } : { art: 'frei' };
  }

  /** Das nächste Teil innerhalb der Toleranz, sonst null. Gleiche Frage, gleiche Antwort für Planen, Bäume und Stangen. */
  private naechstes<T>(teile: readonly T[], abstand: (teil: T) => number): T | null {
    let bestes: { readonly teil: T; readonly abstand: number } | null = null;
    for (const teil of teile) {
      const a = abstand(teil);
      if (a <= this.toleranz && (bestes === null || a < bestes.abstand)) bestes = { teil, abstand: a };
    }
    return bestes?.teil ?? null;
  }

  haringe(seile: readonly Seil[]): Haring[] {
    const enden: Bodenende[] = seile.flatMap((s) =>
      s
        .endpunkte()
        .filter((p) => p.y <= this.bodenToleranz)
        .map((punkt) => ({ punkt, seilId: s.id })),
    );
    return clustereNachNaehe(enden, (e) => e.punkt, this.clusterRadius).map(
      (gruppe, i) => new Haring(`haring-${i}`, mittelpunkt(gruppe.map((e) => e.punkt)), [...new Set(gruppe.map((e) => e.seilId))]),
    );
  }
}
