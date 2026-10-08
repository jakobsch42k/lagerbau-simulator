/** Wofür ein Objekt in den Platzregeln zählt (Spec E6, D2). Die Regeln kennen nur Rollen, keine Arten. */
export type Rolle = 'feuer' | 'holzlager' | 'latrine' | 'wasser' | 'kueche' | 'zelt' | 'baum';

export const ROLLEN_NAME: Readonly<Record<Rolle, string>> = {
  feuer: 'Feuer',
  holzlager: 'Holzlager',
  latrine: 'Latrine',
  wasser: 'Wasserstelle',
  kueche: 'Küche',
  zelt: 'Zelt',
  baum: 'Baum',
};

/** Die Rolle folgt aus dem Vorlagen-Schlüssel (E3 `vorlagen.ts`); Fahnenmast und „Eigenes“ haben keine. */
export const VORLAGE_ROLLE: Readonly<Record<string, Rolle>> = {
  feuerstelle: 'feuer',
  holzlager: 'holzlager',
  latrine: 'latrine',
  wasserstelle: 'wasser',
  kueche: 'kueche',
};

export function rolleAusVorlage(schluessel: string): Rolle | null {
  return VORLAGE_ROLLE[schluessel] ?? null;
}
