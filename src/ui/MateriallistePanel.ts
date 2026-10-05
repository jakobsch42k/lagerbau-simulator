import type { Materialliste } from '../model/Materialliste';

function zeile(tag: 'th' | 'td', zellen: readonly string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const text of zellen) {
    const zelle = document.createElement(tag);
    zelle.textContent = text;
    tr.append(zelle);
  }
  return tr;
}

/** Zeigt die Materialliste als Tabelle und den Platzbedarf als Zeile darunter. */
export class MateriallistePanel {
  constructor(
    private readonly tabelle: HTMLTableElement,
    private readonly platz: HTMLElement,
  ) {}

  zeige(liste: Materialliste): void {
    const { stangen, seile, anzahlHeringe, planen, platzbedarf } = liste;
    this.tabelle.replaceChildren(
      zeile('th', ['Länge', 'Ø', 'Anzahl']),
      ...stangen.zeilen.map((z) => zeile('td', [`${z.laenge.toFixed(1)} m`, `${z.durchmesserCm} cm`, String(z.anzahl)])),
      zeile('td', ['Bünde', '', String(stangen.anzahlBuende)]),
      ...(seile.length > 0 ? [zeile('th', ['Seil', '', 'Anzahl']), ...seile.map((s) => zeile('td', [`${s.laenge} m`, '', String(s.anzahl)]))] : []),
      ...(anzahlHeringe > 0 ? [zeile('td', ['Heringe', '', String(anzahlHeringe)])] : []),
      ...(planen.length > 0
        ? [
            zeile('th', ['Plane', '', 'Anzahl']),
            ...planen.map((p) => zeile('td', [`${p.breite.toFixed(1)} × ${p.laenge.toFixed(1)} m`, '', String(p.anzahl)])),
          ]
        : []),
    );
    this.platz.textContent = platzbedarf ? `Platzbedarf: ${platzbedarf.laenge.toFixed(1)} × ${platzbedarf.breite.toFixed(1)} m` : '';
  }
}
