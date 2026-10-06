import { ABockQuerRule } from './ABockQuerRule';
import { AbspannwinkelRule } from './AbspannwinkelRule';
import { LoseStangeRule } from './LoseStangeRule';
import { LosesSeilRule } from './LosesSeilRule';
import { RegelEinstellungen } from './RegelEinstellungen';
import type { Rule } from './Rule';
import { SpreizungRule } from './SpreizungRule';
import { StandflaecheRule } from './StandflaecheRule';
import { StolperfalleRule } from './StolperfalleRule';
import { ViereckRule } from './ViereckRule';

/** R1–R8 mit den eingestellten Werten; ohne Einstellungen die Schwellwerte aus constants.ts (Spec v3, D8). */
export function standardRegeln(e: RegelEinstellungen = RegelEinstellungen.standard()): Rule[] {
  return [
    new ABockQuerRule(e.wert('R1_MIN_WINKEL_ZUR_EBENE_GRAD')),
    new ViereckRule(e.wert('R2_PLANAR_TOLERANZ_RELATIV')),
    new StandflaecheRule(e.wert('R3_MAX_HOEHE_ZU_BREITE'), e.wert('R3_MIN_HOEHE')),
    new SpreizungRule(e.wert('R4_MIN_BEINWINKEL_GRAD'), e.wert('R4_MAX_BEINWINKEL_GRAD')),
    new LoseStangeRule(),
    new AbspannwinkelRule(e.wert('R6_MIN_WINKEL_GRAD'), e.wert('R6_MAX_WINKEL_GRAD')),
    new StolperfalleRule(e.wert('R7_MIN_HOEHE')),
    new LosesSeilRule(),
  ];
}
