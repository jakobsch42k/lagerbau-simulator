import type { Rolle } from '../../arten/platz/rollen';
import { type Hinweis, hinweis, type Schwere } from '../Rule';
import type { PlatzEintrag, PlatzKontext } from './PlatzKontext';
import type { PlatzRegel } from './PlatzRegel';
import type { PlatzRegelName } from './PlatzregelEinstellungen';

/** Rundungsfehler der Gleitkommarechnung: Ein Abstand genau auf dem Richtwert gibt keinen Hinweis. */
const TOLERANZ_M = 1e-9;

/** Was die Textvorlage einer Abstandsregel bekommt. */
export interface AbstandsFall {
  /** Namen der beiden Objekte in der Reihenfolge von `rollenA`, `rollenB`. */
  readonly a: string;
  readonly b: string;
  readonly abstand: number;
  readonly richtwert: number;
  readonly ueberlappt: boolean;
}

export interface AbstandsRegelDefinition {
  readonly name: PlatzRegelName;
  readonly schwere: Schwere;
  readonly rollenA: readonly Rolle[];
  readonly rollenB: readonly Rolle[];
  text(fall: AbstandsFall): string;
}

/** Mindestabstand von Kante zu Kante zwischen zwei Rollen (P1 bis P5). Gleiche Rollen auf beiden Seiten prüfen jedes Paar einmal. */
export class AbstandsRegel implements PlatzRegel {
  constructor(
    private readonly definition: AbstandsRegelDefinition,
    private readonly richtwert: number,
  ) {}

  get name(): PlatzRegelName {
    return this.definition.name;
  }

  /** Ein Hinweis je Paar unter dem Wert, der kleinste Abstand zuerst. */
  pruefe(k: PlatzKontext): readonly Hinweis[] {
    const { rollenA, rollenB, schwere, name } = this.definition;
    const paare = this.paare(k.eintraege(rollenA), k.eintraege(rollenB), rollenA.every((r) => rollenB.includes(r)));
    return paare
      .map(([a, b]) => ({ a, b, abstand: a.grundriss.abstand(b.grundriss), ueberlappt: a.grundriss.ueberlappt(b.grundriss) }))
      .filter((p) => p.abstand < this.richtwert - TOLERANZ_M)
      .sort((x, y) => x.abstand - y.abstand)
      .map((p) =>
        hinweis(
          name,
          this.definition.text({ a: p.a.name, b: p.b.name, abstand: p.abstand, richtwert: this.richtwert, ueberlappt: p.ueberlappt }),
          [p.a.objekt.id, p.b.objekt.id],
          schwere,
        ),
      );
  }

  private paare(a: readonly PlatzEintrag[], b: readonly PlatzEintrag[], gleicheSeite: boolean): readonly (readonly [PlatzEintrag, PlatzEintrag])[] {
    if (gleicheSeite) return a.flatMap((x, i) => a.slice(i + 1).map((y) => [x, y] as const));
    return a.flatMap((x) => b.filter((y) => y !== x).map((y) => [x, y] as const));
  }
}
