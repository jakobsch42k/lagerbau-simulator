import type { Vec3 } from '../model/Vec3';
import type { Analyse } from './Analyse';
import { R2_PLANAR_TOLERANZ_RELATIV } from './constants';
import { FesteKnoten } from './FesteKnoten';
import { BODEN, type Kante, type Knoten, KnotenGraph } from './KnotenGraph';
import { type Hinweis, hinweis, type Rule } from './Rule';

interface Viereck {
  readonly knoten: readonly [Knoten, Knoten, Knoten, Knoten];
  readonly seiten: readonly [string, string, string, string];
}

/** R2: Ein ebenes Viereck aus Stangen (und Boden) ohne Diagonale kann sich zum Parallelogramm verziehen, sofern nicht alle Ecken schon anderweitig fest liegen. */
export class ViereckRule implements Rule {
  readonly name = 'R2';

  constructor(private readonly planarToleranz = R2_PLANAR_TOLERANZ_RELATIV) {}

  pruefe(a: Analyse): Hinweis[] {
    const graph = new KnotenGraph(a);
    const feste = new FesteKnoten(a, graph);
    const nachEcken = new Map<string, { viereck: Viereck; ausgesteift: boolean }>();
    for (const v of this.vierecke(graph)) {
      if (!this.istEben(v)) continue;
      const schluessel = v.knoten.map((k) => k.id).sort().join('|');
      const bisher = nachEcken.get(schluessel);
      nachEcken.set(schluessel, {
        viereck: bisher?.viereck ?? v,
        ausgesteift: (bisher?.ausgesteift ?? false) || this.istAusgesteift(graph, v),
      });
    }
    return [...nachEcken.values()]
      .filter((e) => !e.ausgesteift && e.viereck.knoten.some((k) => !feste.istFest(k)))
      .map((e) => hinweis(this.name, 'Dieses Viereck kann sich verziehen, eine Diagonale fehlt.', e.viereck.seiten.filter((s) => s !== BODEN)));
  }

  private *vierecke(g: KnotenGraph): Generator<Viereck> {
    for (const k0 of g.knoten) {
      for (const [e01, e12, e23] of this.wege(g, k0, 3)) {
        for (const e30 of g.nachbarn(e23.nach)) {
          if (e30.nach !== k0 || [e01.seite, e12.seite, e23.seite].includes(e30.seite)) continue;
          yield { knoten: [k0, e01.nach, e12.nach, e23.nach], seiten: [e01.seite, e12.seite, e23.seite, e30.seite] };
        }
      }
    }
  }

  /** Alle Wege ab start mit `laenge` Kanten, ohne Knoten oder Seite doppelt zu benutzen. */
  private *wege(g: KnotenGraph, start: Knoten, laenge: number, bisher: readonly Kante[] = []): Generator<readonly Kante[]> {
    if (bisher.length === laenge) {
      yield bisher;
      return;
    }
    const aktuell = bisher.at(-1)?.nach ?? start;
    for (const kante of g.nachbarn(aktuell)) {
      const benutzt = kante.nach === start || bisher.some((k) => k.nach === kante.nach || k.seite === kante.seite);
      if (!benutzt) yield* this.wege(g, start, laenge, [...bisher, kante]);
    }
  }

  private istEben({ knoten }: Viereck): boolean {
    const p = knoten.map((k) => k.position);
    const laengsteSeite = Math.max(...p.map((q, i) => q.distanceTo(p[(i + 1) % 4] as Vec3)));
    return p.every((_, i) => this.abstandZurEbene(p, i) <= this.planarToleranz * laengsteSeite);
  }

  /** Abstand von Punkt i zur Ebene der anderen drei; unendlich, wenn diese auf einer Geraden liegen. */
  private abstandZurEbene(p: readonly Vec3[], i: number): number {
    const [a, b, c] = p.filter((_, j) => j !== i) as [Vec3, Vec3, Vec3];
    const n = b.sub(a).cross(c.sub(a));
    const laenge = n.length();
    return laenge < 1e-9 ? Infinity : Math.abs((p[i] as Vec3).sub(a).dot(n)) / laenge;
  }

  private istAusgesteift(g: KnotenGraph, { knoten: [k0, k1, k2, k3], seiten: [s01, s12, s23, s30] }: Viereck): boolean {
    if (g.verbunden(k0, k2) || g.verbunden(k1, k3)) return true;
    return this.teilenKnoten(g, s01, s23) || this.teilenKnoten(g, s12, s30);
  }

  private teilenKnoten(g: KnotenGraph, s: string, t: string): boolean {
    const aufT = g.knotenAuf(t);
    return g.knotenAuf(s).some((k) => aufT.includes(k));
  }
}
