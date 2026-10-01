import { ABockQuerRule } from './ABockQuerRule';
import { LoseStangeRule } from './LoseStangeRule';
import type { Rule } from './Rule';
import { SpreizungRule } from './SpreizungRule';
import { StandflaecheRule } from './StandflaecheRule';
import { ViereckRule } from './ViereckRule';

/** R1–R5 mit den Schwellwerten aus constants.ts. */
export function standardRegeln(): Rule[] {
  return [new ABockQuerRule(), new ViereckRule(), new StandflaecheRule(), new SpreizungRule(), new LoseStangeRule()];
}
