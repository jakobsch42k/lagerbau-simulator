import type { Stangenliste } from '../model/Stangenliste';

function zeile(tag: 'th' | 'td', zellen: readonly string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const text of zellen) {
    const zelle = document.createElement(tag);
    zelle.textContent = text;
    tr.append(zelle);
  }
  return tr;
}

export class StangenlistePanel {
  constructor(private readonly tabelle: HTMLTableElement) {}

  zeige(liste: Stangenliste): void {
    this.tabelle.replaceChildren(
      zeile('th', ['Länge', 'Ø', 'Anzahl']),
      ...liste.zeilen.map((z) => zeile('td', [`${z.laenge.toFixed(1)} m`, `${z.durchmesserCm} cm`, String(z.anzahl)])),
      zeile('td', ['Bünde', '', String(liste.anzahlBuende)]),
    );
  }
}
