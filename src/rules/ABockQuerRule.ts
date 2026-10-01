import { ABock } from '../model/ABock';
import type { Analyse } from './Analyse';
import { R1_MIN_WINKEL_ZUR_EBENE_GRAD } from './constants';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R1: Ein A-Bock ist nur in seiner Ebene steif. Er braucht eine Stange, die aus dieser Ebene herausführt. */
export class ABockQuerRule implements Rule {
  readonly name = 'R1';
  private readonly minSinus: number;

  constructor(minWinkelGrad = R1_MIN_WINKEL_ZUR_EBENE_GRAD) {
    this.minSinus = Math.sin((minWinkelGrad * Math.PI) / 180);
  }

  pruefe(a: Analyse): Hinweis[] {
    return a.bauwerk.gruppen
      .filter((g): g is ABock => g instanceof ABock)
      .filter((abock) => !this.istQuerGehalten(abock, a))
      .map((abock) => hinweis(this.name, 'A-Bock kann seitlich umkippen, er braucht eine Querverbindung.', [abock.id]));
  }

  private istQuerGehalten(abock: ABock, a: Analyse): boolean {
    const eigene = new Set(abock.stangen().map((s) => s.id));
    const normale = abock.ebenenNormale();
    return a.buende
      .filter((b) => b.stangenIds.some((id) => eigene.has(id)))
      .flatMap((b) => b.stangenIds.filter((id) => !eigene.has(id)))
      .some((id) => Math.abs(a.stange(id).richtung.dot(normale)) >= this.minSinus);
  }
}
