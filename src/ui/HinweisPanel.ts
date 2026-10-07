import type { BauHinweis } from '../rules/BauHinweise';
import type { Hinweis } from '../rules/Rule';

export class HinweisPanel {
  constructor(
    private readonly liste: HTMLUListElement,
    private readonly beiKlick: (h: Hinweis) => void,
  ) {}

  /** Der Baunamen steht nur voran, wenn es mehr als einen Bau gibt (Spec E5, D4); sonst ändert sich nichts. */
  zeige(hinweise: readonly BauHinweis[], anzahlBaue: number): void {
    if (hinweise.length === 0) {
      const leer = document.createElement('li');
      leer.textContent = 'Keine Hinweise.';
      this.liste.replaceChildren(leer);
      return;
    }
    this.liste.replaceChildren(
      ...hinweise.map((h) => {
        const eintrag = document.createElement('li');
        eintrag.className = h.schwere;
        const praefix = anzahlBaue > 1 && h.bauName !== null ? `„${h.bauName}“: ` : '';
        eintrag.textContent = `${praefix}${h.regel}: ${h.text}`;
        eintrag.title = 'Klicken markiert die betroffenen Teile';
        eintrag.addEventListener('click', () => this.beiKlick(h));
        return eintrag;
      }),
    );
  }
}
