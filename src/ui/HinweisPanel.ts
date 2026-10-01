import type { Hinweis } from '../rules/Rule';

export class HinweisPanel {
  constructor(
    private readonly liste: HTMLUListElement,
    private readonly beiKlick: (h: Hinweis) => void,
  ) {}

  zeige(hinweise: readonly Hinweis[]): void {
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
        eintrag.textContent = `${h.regel}: ${h.text}`;
        eintrag.title = 'Klicken markiert die betroffenen Teile';
        eintrag.addEventListener('click', () => this.beiKlick(h));
        return eintrag;
      }),
    );
  }
}
