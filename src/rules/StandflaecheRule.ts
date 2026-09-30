import type { Analyse } from './Analyse';
import { R3_MAX_HOEHE_ZU_BREITE, R3_MIN_HOEHE } from './constants';
import { minimaleBreite } from './geometrie2d';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R3: Ein Bau, der im Verhältnis zu seiner schmalsten Standbreite zu hoch ist, kippt leicht. */
export class StandflaecheRule implements Rule {
  readonly name = 'R3';

  constructor(
    private readonly maxVerhaeltnis = R3_MAX_HOEHE_ZU_BREITE,
    private readonly minHoehe = R3_MIN_HOEHE,
  ) {}

  pruefe(a: Analyse): Hinweis[] {
    return a
      .komponenten()
      .filter((ids) => this.kippgefaehrdet(a, ids))
      .map((ids) => hinweis(this.name, 'Hoch und schmal, Kippgefahr. Füße weiter auseinander oder abspannen.', ids));
  }

  private kippgefaehrdet(a: Analyse, ids: readonly string[]): boolean {
    const fuesse = ids.flatMap((id) => a.fuesseVon(id));
    if (fuesse.length === 0) return false;
    const hoehe = this.hoehe(a, ids);
    if (hoehe < this.minHoehe) return false;
    const breite = minimaleBreite(fuesse.map((f) => [f.position.x, f.position.z] as const));
    return hoehe > this.maxVerhaeltnis * breite;
  }

  private hoehe(a: Analyse, ids: readonly string[]): number {
    const buende = a.buende.filter((b) => b.stangenIds.some((id) => ids.includes(id)));
    const punkte = buende.length > 0 ? buende.map((b) => b.position) : ids.flatMap((id) => a.stange(id).endpunkte());
    return Math.max(...punkte.map((p) => p.y));
  }
}
