import type { Baum } from './Baum';
import { clustereNachNaehe, mittelpunkt } from './Bund';
import { BUND_CLUSTER_RADIUS, BUND_TOLERANZ, FUSS_TOLERANZ } from './konstanten';
import type { Seil } from './Seil';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

/** Woran ein Seilende hängt. Wird aus der Geometrie abgeleitet, nie gespeichert. */
export type Verankerung =
  | { readonly art: 'hering' }
  | { readonly art: 'baum'; readonly baumId: string }
  | { readonly art: 'bau'; readonly stangeId: string }
  | { readonly art: 'frei' };

/** Ein Hering oder Pflock am Boden. Seilenden, die nah beieinander am Boden enden, teilen sich einen. */
export class Hering {
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

  /** Reihenfolge: Boden vor Baum vor Stange. Bei mehreren Stangen in Reichweite zählt die nächste. */
  finde(punkt: Vec3, stangen: readonly Stange[], baeume: readonly Baum[]): Verankerung {
    if (punkt.y <= this.bodenToleranz) return { art: 'hering' };
    const baum = baeume.find((b) => b.abstandZumStamm(punkt) <= this.toleranz);
    if (baum) return { art: 'baum', baumId: baum.id };
    let naechste: { readonly id: string; readonly abstand: number } | null = null;
    for (const s of stangen) {
      const abstand = s.naechsterPunkt(punkt).distanceTo(punkt);
      if (abstand <= this.toleranz && (naechste === null || abstand < naechste.abstand)) naechste = { id: s.id, abstand };
    }
    return naechste ? { art: 'bau', stangeId: naechste.id } : { art: 'frei' };
  }

  heringe(seile: readonly Seil[]): Hering[] {
    const enden: Bodenende[] = seile.flatMap((s) =>
      s
        .endpunkte()
        .filter((p) => p.y <= this.bodenToleranz)
        .map((punkt) => ({ punkt, seilId: s.id })),
    );
    return clustereNachNaehe(enden, (e) => e.punkt, this.clusterRadius).map(
      (gruppe, i) => new Hering(`hering-${i}`, mittelpunkt(gruppe.map((e) => e.punkt)), [...new Set(gruppe.map((e) => e.seilId))]),
    );
  }
}
