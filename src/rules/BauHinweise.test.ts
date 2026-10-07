import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ABock } from '../model/ABock';
import { Bau } from '../model/Bau';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { BauHinweise } from './BauHinweise';
import { hinweis } from './Rule';
import { RuleEngine } from './RuleEngine';

const zweiBauten = (): Bauwerk => kochstelle().mit(new ABock('abock2', new Vec3(20, 0, 0), 0, STANDARD_ABOCK));

describe('BauHinweise.zuordnen', () => {
  it('lässt die Texte der Regeln unverändert', () => {
    const b = zweiBauten();
    const hinweise = RuleEngine.fuer(b.regelEinstellungen).pruefe(b);
    expect(BauHinweise.zuordnen(b, hinweise).map((h) => h.text)).toEqual(hinweise.map((h) => h.text));
  });

  it('ordnet per erstem betroffenem Teil dem Bau zu', () => {
    const b = zweiBauten();
    const zweiter = Bau.alle(b)[1] as Bau;
    const stange = zweiter.stangenIds[0] as string;
    const [h] = BauHinweise.zuordnen(b, [hinweise1(stange)]);
    expect(h?.bau?.erstesObjekt).toBe(zweiter.erstesObjekt);
    expect(h?.bauName).toBe('Bau 2');
  });

  it('nutzt den vergebenen Namen', () => {
    const b0 = zweiBauten();
    const b = b0.mitBauName(Bau.alle(b0)[0] as Bau, 'Küche');
    const stange = (Bau.alle(b)[0] as Bau).stangenIds[0] as string;
    expect(BauHinweise.zuordnen(b, [hinweise1(stange)])[0]?.bauName).toBe('Küche');
  });

  it('lässt Hinweise ohne Teile oder mit unbekanntem Teil ohne Bau', () => {
    const b = zweiBauten();
    const r = BauHinweise.zuordnen(b, [hinweise1(), hinweise1('gibt-es-nicht')]);
    expect(r.map((h) => [h.bau, h.bauName])).toEqual([[null, null], [null, null]]);
  });
});

function hinweise1(...teile: string[]) {
  return hinweis('R1', 'Test', teile);
}
