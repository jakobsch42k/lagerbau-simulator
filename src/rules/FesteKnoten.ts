import { BUND_CLUSTER_RADIUS } from '../model/konstanten';
import type { Vec3 } from '../model/Vec3';
import type { Analyse } from './Analyse';
import { BODEN, type Knoten, type KnotenGraph } from './KnotenGraph';

/** Kreuzprodukt-Länge (m²), ab der drei Punkte als „nicht auf einer Geraden“ gelten. */
export const KOLLINEAR_TOLERANZ = 1e-3;

/** Mindestzahl nicht kollinearer Stützpunkte, die einen Knoten im Raum festlegen. */
const MIN_STUETZPUNKTE = 3;

/** Mindestzahl fester Knoten auf einer Stange, die jeden weiteren Knoten auf ihr festlegen. */
const MIN_FESTE_AUF_STANGE = 2;

/**
 * Welche Knoten eines Baus liegen über Dreiecke fest? Start: Füße am Boden. Dazu zählen Abspannseile zu Haring oder Baum
 * und Seile zwischen zwei Knoten des Baus. Ein Knoten wird fest, wenn er auf einer Stange mit ≥ 2 festen Knoten liegt
 * oder wenn seine festen Nachbarn und Ankerpunkte ≥ 3 nicht kollineare Punkte ergeben. Keine Statik, nur Geometrie.
 */
export class FesteKnoten {
  private readonly fest: ReadonlySet<Knoten>;

  constructor(
    analyse: Analyse,
    private readonly graph: KnotenGraph,
    private readonly clusterRadius = BUND_CLUSTER_RADIUS,
  ) {
    const anker = new Map<Knoten, Vec3[]>();
    const seilNachbarn = new Map<Knoten, Knoten[]>();
    this.sammleSeile(analyse, anker, seilNachbarn);
    this.fest = this.verbreite(anker, seilNachbarn);
  }

  istFest(k: Knoten): boolean {
    return this.fest.has(k);
  }

  private sammleSeile(analyse: Analyse, anker: Map<Knoten, Vec3[]>, seilNachbarn: Map<Knoten, Knoten[]>): void {
    const festesZiel = (art: string) => art === 'haring' || art === 'baum';
    for (const seil of analyse.seile) {
      const [vs, ve] = analyse.verankerungVon(seil.id);
      if (vs.art === 'bau' && festesZiel(ve.art)) this.merkeAnker(anker, seil.start, seil.ende);
      else if (ve.art === 'bau' && festesZiel(vs.art)) this.merkeAnker(anker, seil.ende, seil.start);
      else if (vs.art === 'bau' && ve.art === 'bau') {
        const a = this.knotenBei(seil.start);
        const b = this.knotenBei(seil.ende);
        if (a && b && a !== b) {
          seilNachbarn.set(a, [...(seilNachbarn.get(a) ?? []), b]);
          seilNachbarn.set(b, [...(seilNachbarn.get(b) ?? []), a]);
        }
      }
    }
  }

  private merkeAnker(anker: Map<Knoten, Vec3[]>, amBau: Vec3, ziel: Vec3): void {
    const k = this.knotenBei(amBau);
    if (k) anker.set(k, [...(anker.get(k) ?? []), ziel]);
  }

  /** Nächster Knoten, aber nur innerhalb des Cluster-Radius. */
  private knotenBei(p: Vec3): Knoten | undefined {
    let bester: Knoten | undefined;
    for (const k of this.graph.knoten) {
      if (k.position.distanceTo(p) <= this.clusterRadius && (!bester || k.position.distanceTo(p) < bester.position.distanceTo(p))) bester = k;
    }
    return bester;
  }

  private verbreite(anker: ReadonlyMap<Knoten, Vec3[]>, seilNachbarn: ReadonlyMap<Knoten, Knoten[]>): Set<Knoten> {
    const fest = new Set(this.graph.knoten.filter((k) => k.seiten.has(BODEN)));
    let geaendert = true;
    while (geaendert) {
      geaendert = false;
      for (const k of this.graph.knoten) {
        if (fest.has(k) || !this.wirdFest(k, fest, anker.get(k) ?? [], seilNachbarn.get(k) ?? [])) continue;
        fest.add(k);
        geaendert = true;
      }
    }
    return fest;
  }

  private wirdFest(k: Knoten, fest: ReadonlySet<Knoten>, anker: readonly Vec3[], seilNachbarn: readonly Knoten[]): boolean {
    const stangen = [...k.seiten].filter((s) => s !== BODEN);
    const festeAuf = (s: string) => this.graph.knotenAuf(s).filter((n) => n !== k && fest.has(n));
    if (stangen.some((s) => festeAuf(s).length >= MIN_FESTE_AUF_STANGE)) return true;
    const nachbarn = new Set([...stangen.flatMap(festeAuf), ...seilNachbarn.filter((n) => fest.has(n))]);
    const punkte = [...[...nachbarn].map((n) => n.position), ...anker];
    return punkte.length >= MIN_STUETZPUNKTE && FesteKnoten.nichtKollinear(punkte);
  }

  private static nichtKollinear(p: readonly Vec3[]): boolean {
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        for (let l = j + 1; l < p.length; l++) {
          const flaeche = (p[j] as Vec3).sub(p[i] as Vec3).cross((p[l] as Vec3).sub(p[i] as Vec3)).length();
          if (flaeche > KOLLINEAR_TOLERANZ) return true;
        }
      }
    }
    return false;
  }
}
