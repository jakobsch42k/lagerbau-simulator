import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Analyse } from './Analyse';

describe('Analyse', () => {
  const a = new Analyse(kochstelle());

  it('stellt Stangen, Bünde und Füße bereit', () => {
    expect(a.stangen).toHaveLength(7);
    expect(a.buendeVon('first')).toHaveLength(2);
    expect(a.fuesseVon('dreibein-bein-0')).toHaveLength(1);
    expect(a.stange('first').id).toBe('first');
    expect(() => a.stange('gibtsnicht')).toThrow(/fehlt/);
  });

  it('fasst über Bünde verbundene Stangen zu einem Bau zusammen', () => {
    expect(a.komponenten()).toHaveLength(1);
    const getrennt = new Analyse(kochstelle().ohne('first')).komponenten();
    expect(getrennt.map((k) => k.length).sort()).toEqual([3, 3]);
  });
});
