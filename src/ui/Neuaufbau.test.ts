import { describe, expect, it } from 'vitest';
import { Neuaufbau } from './Neuaufbau';

describe('Neuaufbau', () => {
  const a = { name: 'a' };
  const a2 = { name: 'a, geändert' };
  const b = { name: 'b' };

  it('baut bei gleicher Auswahl und gleichem Objekt nicht neu auf', () => {
    const n = new Neuaufbau();
    expect(n.noetig('a', a)).toBe(true);
    expect(n.noetig('a', a)).toBe(false);
  });

  it('baut bei anderer ID neu auf', () => {
    const n = new Neuaufbau();
    n.noetig('a', a);
    expect(n.noetig('b', b)).toBe(true);
  });

  it('baut bei gleicher ID, aber neuem Objekt neu auf', () => {
    const n = new Neuaufbau();
    n.noetig('a', a);
    expect(n.noetig('a', a2)).toBe(true);
  });

  it('baut beim Aufheben der Auswahl einmal neu auf, danach nicht mehr', () => {
    const n = new Neuaufbau();
    n.noetig('a', a);
    expect(n.noetig(null, null)).toBe(true);
    expect(n.noetig(null, null)).toBe(false);
  });
});
