import type { Editor } from '../editor/Editor';

export interface WertFeld<S extends string> {
  readonly schluessel: S;
  readonly label: string;
  readonly einheit: string;
  readonly schritt: string;
}

export interface RegelEintrag<N extends string, S extends string> {
  readonly name: N;
  readonly text: string;
  /** Quellenart als Kleintext (nur Platzregeln). */
  readonly quelle?: string;
  readonly felder: readonly WertFeld<S>[];
}

/** Anzeige-Text eines Werts: auf drei Nachkommastellen gerundet. */
const anzeige = (wert: number): string => String(Math.round(wert * 1000) / 1000);

/**
 * Gemeinsamer Aufbau von „Regeln…“ und „Platzregeln…“: Liste mit Haken, Wertfeldern samt Einheit, Zurückspringen
 * ungültiger Werte und „Auf Standard zurücksetzen“. Jede Änderung ist ein Undo-Schritt (über den Editor); in der Ansicht nur lesbar.
 */
export abstract class EinstellungsPanel<E, N extends string, S extends string> {
  private gezeigt: { readonly einstellungen: E; readonly nurLesen: boolean } | null = null;

  constructor(
    knopf: HTMLButtonElement,
    private readonly liste: HTMLElement,
    protected readonly editor: Editor,
    private readonly nurLesen: () => boolean,
  ) {
    knopf.addEventListener('click', () => {
      const oeffnen = this.liste.hidden;
      this.liste.hidden = !oeffnen;
      knopf.setAttribute('aria-expanded', String(oeffnen));
    });
  }

  protected abstract katalog(): readonly RegelEintrag<N, S>[];
  protected abstract istAus(e: E, name: N): boolean;
  protected abstract wert(e: E, schluessel: S): number;
  protected abstract mitAus(e: E, name: N, aus: boolean): E;
  protected abstract mitWert(e: E, schluessel: S, wert: number): E;
  protected abstract standard(): E;
  protected abstract istStandard(e: E): boolean;
  /** Setzt die Einstellungen im Bauwerk (ein Undo-Schritt); false = abgelehnt. */
  protected abstract aendere(fn: (e: E) => E): boolean;
  /** Die Zeile „Ausgeschaltet: …“ nachführen. */
  protected abstract zeigeZeile(e: E): void;
  /** Zusätzliche Elemente unter dem Katalog. */
  protected fuss(): HTMLElement[] {
    return [];
  }

  zeige(einstellungen: E): void {
    this.zeigeZeile(einstellungen);
    const nurLesen = this.nurLesen();
    if (this.gezeigt?.einstellungen === einstellungen && this.gezeigt.nurLesen === nurLesen) return;
    this.gezeigt = { einstellungen, nurLesen };
    this.liste.replaceChildren(...this.katalog().map((r) => this.regel(r, einstellungen, nurLesen)), ...this.fuss(), this.zuruecksetzen(einstellungen, nurLesen));
  }

  private regel(r: RegelEintrag<N, S>, e: E, nurLesen: boolean): HTMLElement {
    const block = document.createElement('div');
    block.className = 'regel';
    const an = document.createElement('label');
    const haken = document.createElement('input');
    haken.type = 'checkbox';
    haken.checked = !this.istAus(e, r.name);
    haken.disabled = nurLesen;
    haken.addEventListener('change', () => this.aendere((x) => this.mitAus(x, r.name, !haken.checked)));
    an.append(haken, ` ${r.name}: ${r.text}`);
    block.append(an);
    if (r.quelle !== undefined) {
      const klein = document.createElement('small');
      klein.className = 'quelle';
      klein.textContent = `Quelle: ${r.quelle}`;
      block.append(klein);
    }
    block.append(...r.felder.map((f) => this.wertfeld(f, e, nurLesen)));
    return block;
  }

  private wertfeld(f: WertFeld<S>, e: E, nurLesen: boolean): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = f.einheit === '' ? f.label : `${f.label} (${f.einheit})`;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = f.schritt;
    input.disabled = nurLesen;
    const modellwert = anzeige(this.wert(e, f.schluessel));
    input.value = modellwert;
    input.addEventListener('change', () => {
      // Abgelehnt: Das Modell ist unverändert, also springt das Feld auf den Modellwert zurück (Muster aus v1).
      if (!this.aendere((x) => this.mitWert(x, f.schluessel, Number(input.value)))) input.value = modellwert;
    });
    label.append(input);
    return label;
  }

  private zuruecksetzen(e: E, nurLesen: boolean): HTMLButtonElement {
    const knopf = document.createElement('button');
    knopf.textContent = 'Auf Standard zurücksetzen';
    knopf.disabled = nurLesen || this.istStandard(e);
    knopf.addEventListener('click', () => this.aendere(() => this.standard()));
    return knopf;
  }
}
