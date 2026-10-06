import type { Editor } from '../editor/Editor';
import { REGEL_NAMEN, RegelEinstellungen, type RegelName, type WertSchluessel } from '../rules/RegelEinstellungen';

interface WertFeld {
  readonly schluessel: WertSchluessel;
  readonly label: string;
  readonly einheit: string;
  readonly schritt: string;
}

interface RegelEintrag {
  readonly name: RegelName;
  readonly text: string;
  readonly felder: readonly WertFeld[];
}

/** Kurzbeschreibung und Wertfelder je Regel (Spec v3, D8). Die Standardwerte stehen in src/rules/constants.ts. */
const KATALOG: readonly RegelEintrag[] = [
  { name: 'R1', text: 'A-Bock seitlich gesichert', felder: [{ schluessel: 'R1_MIN_WINKEL_ZUR_EBENE_GRAD', label: 'Mindestwinkel zur A-Ebene', einheit: '°', schritt: '1' }] },
  { name: 'R2', text: 'Viereck mit Diagonale', felder: [{ schluessel: 'R2_PLANAR_TOLERANZ_RELATIV', label: 'Ebenen-Toleranz (Anteil der längsten Seite)', einheit: '', schritt: '0.01' }] },
  {
    name: 'R3',
    text: 'Standfläche breit genug',
    felder: [
      { schluessel: 'R3_MAX_HOEHE_ZU_BREITE', label: 'Höhe ÷ Breite höchstens', einheit: '', schritt: '0.1' },
      { schluessel: 'R3_MIN_HOEHE', label: 'Geprüft ab Höhe', einheit: 'm', schritt: '0.1' },
    ],
  },
  {
    name: 'R4',
    text: 'Spreizung der Beine',
    felder: [
      { schluessel: 'R4_MIN_BEINWINKEL_GRAD', label: 'Beinwinkel mindestens', einheit: '°', schritt: '1' },
      { schluessel: 'R4_MAX_BEINWINKEL_GRAD', label: 'Beinwinkel höchstens', einheit: '°', schritt: '1' },
    ],
  },
  { name: 'R5', text: 'Jede Stange hält an zwei Punkten', felder: [] },
  {
    name: 'R6',
    text: 'Abspannwinkel',
    felder: [
      { schluessel: 'R6_MIN_WINKEL_GRAD', label: 'Seilwinkel mindestens', einheit: '°', schritt: '1' },
      { schluessel: 'R6_MAX_WINKEL_GRAD', label: 'Seilwinkel höchstens', einheit: '°', schritt: '1' },
    ],
  },
  { name: 'R7', text: 'Querseile hoch genug', felder: [{ schluessel: 'R7_MIN_HOEHE', label: 'Querseil mindestens auf', einheit: 'm', schritt: '0.1' }] },
  { name: 'R8', text: 'Jedes Seilende befestigt', felder: [] },
];

/** Anzeige-Text eines Werts: auf drei Nachkommastellen gerundet. */
const anzeige = (wert: number): string => String(Math.round(wert * 1000) / 1000);

/**
 * „Regeln…“: Regeln an- und abschalten und ihre Werte einstellen; gespeichert im Bauwerk (Spec v3, D8).
 * Jede Änderung ist ein Undo-Schritt; ungültige Werte meldet der Editor, und das Feld springt zurück. In der Ansicht nur lesbar.
 */
export class RegelnPanel {
  private gezeigt: { readonly einstellungen: RegelEinstellungen; readonly nurLesen: boolean } | null = null;

  constructor(
    knopf: HTMLButtonElement,
    private readonly liste: HTMLElement,
    private readonly zeile: HTMLElement,
    private readonly editor: Editor,
    private readonly nurLesen: () => boolean,
  ) {
    knopf.addEventListener('click', () => {
      const oeffnen = this.liste.hidden;
      this.liste.hidden = !oeffnen;
      knopf.setAttribute('aria-expanded', String(oeffnen));
    });
    this.zeige(editor.bauwerk.regelEinstellungen);
  }

  zeige(einstellungen: RegelEinstellungen): void {
    const aus = REGEL_NAMEN.filter((n) => einstellungen.istAus(n));
    this.zeile.textContent = aus.length > 0 ? `Ausgeschaltet: ${aus.join(', ')}` : '';
    const nurLesen = this.nurLesen();
    if (this.gezeigt?.einstellungen === einstellungen && this.gezeigt.nurLesen === nurLesen) return;
    this.gezeigt = { einstellungen, nurLesen };
    this.liste.replaceChildren(...KATALOG.map((r) => this.regel(r, einstellungen, nurLesen)), this.zuruecksetzen(einstellungen, nurLesen));
  }

  private regel(r: RegelEintrag, e: RegelEinstellungen, nurLesen: boolean): HTMLElement {
    const block = document.createElement('div');
    block.className = 'regel';
    const an = document.createElement('label');
    const haken = document.createElement('input');
    haken.type = 'checkbox';
    haken.checked = !e.istAus(r.name);
    haken.disabled = nurLesen;
    haken.addEventListener('change', () => this.aendere((x) => x.mitAus(r.name, !haken.checked)));
    an.append(haken, ` ${r.name}: ${r.text}`);
    block.append(an, ...r.felder.map((f) => this.wertfeld(f, e, nurLesen)));
    return block;
  }

  private wertfeld(f: WertFeld, e: RegelEinstellungen, nurLesen: boolean): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = f.einheit === '' ? f.label : `${f.label} (${f.einheit})`;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = f.schritt;
    input.disabled = nurLesen;
    const modellwert = anzeige(e.wert(f.schluessel));
    input.value = modellwert;
    input.addEventListener('change', () => {
      // Abgelehnt: Das Modell ist unverändert, also springt das Feld auf den Modellwert zurück (Muster aus v1).
      if (!this.aendere((x) => x.mitWert(f.schluessel, Number(input.value)))) input.value = modellwert;
    });
    label.append(input);
    return label;
  }

  private zuruecksetzen(e: RegelEinstellungen, nurLesen: boolean): HTMLButtonElement {
    const knopf = document.createElement('button');
    knopf.textContent = 'Auf Standard zurücksetzen';
    knopf.disabled = nurLesen || e.istStandard;
    knopf.addEventListener('click', () => this.aendere(() => RegelEinstellungen.standard()));
    return knopf;
  }

  /** Über den Editor: ein Undo-Schritt, ein RangeError wird zur Meldung. */
  private aendere(fn: (e: RegelEinstellungen) => RegelEinstellungen): boolean {
    return this.editor.aendereMit((b) => b.mitRegelEinstellungen(fn(b.regelEinstellungen)));
  }
}
