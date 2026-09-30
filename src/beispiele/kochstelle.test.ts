import { describe, expect, it } from 'vitest';
import { kochstelle } from './kochstelle';

describe('Kochstelle', () => {
  const k = kochstelle();

  it('besteht aus A-Bock, Dreibein und First', () => {
    expect(k.gruppen.map((g) => g.id)).toEqual(['abock', 'dreibein']);
    expect(k.freieStangen.map((s) => s.id)).toEqual(['first']);
    expect(k.stangen()).toHaveLength(7);
  });

  it('hat vier Bünde: zwei Spitzen mit First und zwei Riegelbünde', () => {
    const buende = k.buende();
    expect(buende).toHaveLength(4);
    const mitFirst = buende.filter((b) => b.enthaelt('first'));
    expect(mitFirst).toHaveLength(2);
    expect(mitFirst.some((b) => b.enthaelt('abock-bein-0') && b.enthaelt('abock-bein-1'))).toBe(true);
    expect(mitFirst.some((b) => ['dreibein-bein-0', 'dreibein-bein-1', 'dreibein-bein-2'].every((id) => b.enthaelt(id)))).toBe(true);
  });

  it('steht auf fünf Füßen', () => {
    expect(k.fuesse()).toHaveLength(5);
  });
});
