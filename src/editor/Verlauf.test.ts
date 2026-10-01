import { describe, expect, it } from 'vitest';
import { Verlauf } from './Verlauf';

describe('Verlauf', () => {
  it('geht zurück und wieder vor', () => {
    const v = Verlauf.start('a').mit('b').mit('c');
    expect(v.aktuell).toBe('c');
    const r = v.rueckgaengig();
    expect(r.aktuell).toBe('b');
    expect(r.kannWiederholen).toBe(true);
    expect(r.wiederholen().aktuell).toBe('c');
  });

  it('bleibt am Anfang und am Ende stehen', () => {
    const v = Verlauf.start('a');
    expect(v.kannRueckgaengig).toBe(false);
    expect(v.rueckgaengig()).toBe(v);
    expect(v.wiederholen()).toBe(v);
  });

  it('verwirft die Wiederholen-Liste bei einer neuen Änderung', () => {
    const r = Verlauf.start('a').mit('b').rueckgaengig().mit('x');
    expect(r.aktuell).toBe('x');
    expect(r.kannWiederholen).toBe(false);
  });

  it('merkt sich höchstens max Schritte', () => {
    const v = Verlauf.start(0, 2).mit(1).mit(2).mit(3);
    const zurueck = v.rueckgaengig().rueckgaengig();
    expect(zurueck.aktuell).toBe(1);
    expect(zurueck.kannRueckgaengig).toBe(false);
  });
});
