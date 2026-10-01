import { ABockQuerRule } from './ABockQuerRule';
import { AbspannwinkelRule } from './AbspannwinkelRule';
import { LoseStangeRule } from './LoseStangeRule';
import { LosesSeilRule } from './LosesSeilRule';
import type { Rule } from './Rule';
import { SpreizungRule } from './SpreizungRule';
import { StandflaecheRule } from './StandflaecheRule';
import { StolperfalleRule } from './StolperfalleRule';
import { ViereckRule } from './ViereckRule';

/** R1–R8 mit den Schwellwerten aus constants.ts. */
export function standardRegeln(): Rule[] {
  return [
    new ABockQuerRule(),
    new ViereckRule(),
    new StandflaecheRule(),
    new SpreizungRule(),
    new LoseStangeRule(),
    new AbspannwinkelRule(),
    new StolperfalleRule(),
    new LosesSeilRule(),
  ];
}
