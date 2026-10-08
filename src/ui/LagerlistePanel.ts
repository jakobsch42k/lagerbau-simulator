import type { Editor } from '../editor/Editor';
import type { Bau } from '../model/Bau';
import type { Bauwerk } from '../model/Bauwerk';
import type { GruppenBlock, Lagerliste } from '../model/Lagerliste';
import type { MaterialPosten } from '../model/MaterialPosten';
import type { BauHinweis } from '../rules/BauHinweise';
import { platzText, restZeilen, stangenZeilen, zeile } from './MateriallistePanel';

const NAME_TOOLTIP = 'Name hängt am ersten Teil des Baus';
const KEINE_HINWEISE = 'Keine Hinweise.';

function knoten<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', klasse = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (klasse) el.className = klasse;
  return el;
}

const zahl = (x: number): string => String(x).replace('.', ',');

function postenTabelle(posten: readonly MaterialPosten[]): HTMLTableElement {
  const tabelle = knoten('table', '', 'lager-tabelle');
  tabelle.append(...posten.map((p) => zeile('td', [p.bezeichnung, `${zahl(p.menge)} ${p.einheit}`])));
  return tabelle;
}

/**
 * Die Lagerliste fürs ganze Lager (Spec E5, D5): Gesamtsumme, je Bau ein Block mit Namensfeld, Zelte, Platz-Objekte und Hinweise je Bau.
 * Ein Vollbild-Panel über der Ansicht; `@media print` zeigt nur dieses Panel und die Fußzeile. Der Name läuft über `editor.aendereMit`.
 */
export class LagerlistePanel {
  private letzte: { liste: Lagerliste; bauwerk: Bauwerk; hinweise: readonly BauHinweis[] } | null = null;

  constructor(
    private readonly container: HTMLElement,
    knopf: HTMLButtonElement,
    private readonly editor: Editor,
    /** Springt die Ansicht auf das Teil-Bauwerk des Baus. */
    private readonly zeigeBau: (teil: Bauwerk) => void,
    private readonly nurLesen: () => boolean,
  ) {
    knopf.addEventListener('click', () => this.oeffne());
  }

  zeige(liste: Lagerliste, bauwerk: Bauwerk, hinweise: readonly BauHinweis[]): void {
    this.letzte = { liste, bauwerk, hinweise };
    if (!this.container.hidden) this.baue();
  }

  private oeffne(): void {
    this.container.hidden = false;
    this.baue();
  }

  private schliesse(): void {
    this.container.hidden = true;
  }

  private baue(): void {
    if (!this.letzte) return;
    const { liste, bauwerk, hinweise } = this.letzte;
    this.container.replaceChildren(
      this.leiste(),
      knoten('h2', 'Lagerplan – Materialliste', 'lager-kopf'),
      knoten('p', new Date().toLocaleDateString('de-AT'), 'lager-datum'),
      this.gesamt(liste),
      ...this.baueBloecke(liste, bauwerk),
      ...liste.zelte.map((b) => this.gruppe(b, 'Zelt')),
      ...liste.platz.map((b) => this.gruppe(b, 'Platz')),
      this.hinweiseBlock(liste, hinweise),
    );
  }

  private leiste(): HTMLElement {
    const leiste = knoten('div', '', 'lager-leiste nicht-drucken');
    const drucken = knoten('button', 'Drucken', 'drucken');
    drucken.addEventListener('click', () => window.print());
    const zu = knoten('button', 'Schließen', 'schliessen');
    zu.addEventListener('click', () => this.schliesse());
    leiste.append(drucken, zu);
    return leiste;
  }

  private gesamt(liste: Lagerliste): HTMLElement {
    const block = knoten('section', '', 'lager-block lager-gesamt');
    const stangen = knoten('table', '', 'lager-tabelle');
    stangen.append(...stangenZeilen(liste.gesamt.bau));
    block.append(knoten('h3', 'Gesamtsumme'), stangen, postenTabelle(liste.gesamt.posten), knoten('p', platzText(liste.gesamt.bau), 'lager-platz'));
    return block;
  }

  private baueBloecke(liste: Lagerliste, bauwerk: Bauwerk): HTMLElement[] {
    return liste.baue.map((zeileBau) => {
      const block = knoten('section', '', 'lager-block lager-bau');
      const kopf = knoten('h3');
      if (zeileBau.bau && !this.nurLesen()) kopf.append(this.namensfeld(zeileBau.bau, zeileBau.name), this.zeigenKnopf(zeileBau.bau, bauwerk));
      else kopf.textContent = zeileBau.name;
      const tabelle = knoten('table', '', 'lager-tabelle');
      tabelle.append(...stangenZeilen(zeileBau.liste), ...restZeilen(zeileBau.liste));
      block.append(kopf, tabelle, knoten('p', platzText(zeileBau.liste), 'lager-platz'));
      return block;
    });
  }

  /** Enter oder Verlassen speichert; ein ungültiger Name springt zurück (die Meldung kommt aus dem Editor). */
  private namensfeld(bau: Bau, name: string): HTMLInputElement {
    const feld = knoten('input');
    feld.type = 'text';
    feld.value = name;
    feld.title = NAME_TOOLTIP;
    feld.setAttribute('aria-label', 'Bau-Name');
    feld.addEventListener('change', () => {
      const angenommen = this.editor.aendereMit((b) => b.mitBauName(bau, feld.value));
      if (!angenommen) feld.value = name;
    });
    feld.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') feld.blur();
    });
    return feld;
  }

  private zeigenKnopf(bau: Bau, bauwerk: Bauwerk): HTMLButtonElement {
    const knopf = knoten('button', 'Zeigen', 'zeigen nicht-drucken');
    knopf.addEventListener('click', () => {
      this.editor.waehleMehrere(bau.objektIds);
      this.zeigeBau(bau.teilBauwerk(bauwerk));
      this.schliesse();
    });
    return knopf;
  }

  private gruppe(block: GruppenBlock, klasse: string): HTMLElement {
    const el = knoten('section', '', `lager-block lager-${klasse.toLowerCase()}`);
    el.append(knoten('h3', `${block.titel} (${block.anzahl} ×)`), postenTabelle(block.posten));
    return el;
  }

  private hinweiseBlock(liste: Lagerliste, hinweise: readonly BauHinweis[]): HTMLElement {
    const block = knoten('section', '', 'lager-block lager-hinweise');
    block.append(knoten('h3', 'Hinweise'));
    if (hinweise.length === 0) {
      block.append(knoten('p', KEINE_HINWEISE));
      return block;
    }
    const gruppen = liste.baue.map((z) => ({ titel: z.name, treffer: hinweise.filter((h) => h.bau !== null && h.bau.erstesObjekt === z.bau?.erstesObjekt) }));
    gruppen.push({ titel: 'Ohne Bau', treffer: hinweise.filter((h) => h.bau === null) });
    for (const g of gruppen.filter((x) => x.treffer.length > 0)) {
      const ul = knoten('ul');
      ul.append(...g.treffer.map((h) => knoten('li', `${h.regel}: ${h.text}`)));
      block.append(knoten('h4', `${g.titel} (${g.treffer.length})`), ul);
    }
    return block;
  }
}
