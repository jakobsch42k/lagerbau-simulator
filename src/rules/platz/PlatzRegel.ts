import type { Hinweis } from '../Rule';
import type { PlatzKontext } from './PlatzKontext';
import type { PlatzRegelName } from './PlatzregelEinstellungen';

/** Eine Platzregel (Spec E6, D3): prüft Rollen und Grundrisse, nie Arten. */
export interface PlatzRegel {
  readonly name: PlatzRegelName;
  pruefe(k: PlatzKontext): readonly Hinweis[];
}
