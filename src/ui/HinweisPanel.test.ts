// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { BauHinweis } from '../rules/BauHinweise';
import { HinweisPanel } from './HinweisPanel';

const h = (bauName: string | null): BauHinweis => ({ regel: 'R1', schwere: 'warnung', text: 'Test', betroffeneTeile: ['a'], bau: null, bauName });

describe('HinweisPanel', () => {
  it('setzt den Baunamen nur bei mehr als einem Bau voran', () => {
    const liste = document.createElement('ul');
    const panel = new HinweisPanel(liste, () => {});
    panel.zeige([h('Küche')], 2);
    expect(liste.textContent).toBe('„Küche“: R1: Test');
    panel.zeige([h('Küche')], 1);
    expect(liste.textContent).toBe('R1: Test');
  });

  it('lässt Hinweise ohne Bau ohne Zusatz und meldet den Klick', () => {
    const liste = document.createElement('ul');
    const klick = vi.fn();
    new HinweisPanel(liste, klick).zeige([h(null)], 3);
    expect(liste.textContent).toBe('R1: Test');
    liste.querySelector('li')?.click();
    expect(klick).toHaveBeenCalledOnce();
  });

  it('zeigt „Keine Hinweise.“ bei leerer Liste', () => {
    const liste = document.createElement('ul');
    new HinweisPanel(liste, () => {}).zeige([], 2);
    expect(liste.textContent).toBe('Keine Hinweise.');
  });
});
