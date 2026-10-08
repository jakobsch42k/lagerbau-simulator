import type { Editor } from '../editor/Editor';
import { RegelEinstellungen, type RegelName, type WertSchluessel } from '../rules/RegelEinstellungen';
import type { AusgeschaltetZeile } from './AusgeschaltetZeile';
import { EinstellungsPanel, type RegelEintrag } from './EinstellungsPanel';

/** Kurzbeschreibung und Wertfelder je Regel (Spec v3, D8). Die Standardwerte stehen in src/rules/constants.ts. */
const KATALOG: readonly RegelEintrag<RegelName, WertSchluessel>[] = [
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

/**
 * „Regeln…“: Regeln an- und abschalten und ihre Werte einstellen; gespeichert im Bauwerk (Spec v3, D8).
 * Aufbau und Verhalten in `EinstellungsPanel`.
 */
export class RegelnPanel extends EinstellungsPanel<RegelEinstellungen, RegelName, WertSchluessel> {
  constructor(
    knopf: HTMLButtonElement,
    liste: HTMLElement,
    private readonly zeile: AusgeschaltetZeile,
    editor: Editor,
    nurLesen: () => boolean,
  ) {
    super(knopf, liste, editor, nurLesen);
    this.zeige(editor.bauwerk.regelEinstellungen);
  }

  protected katalog(): readonly RegelEintrag<RegelName, WertSchluessel>[] {
    return KATALOG;
  }
  protected istAus(e: RegelEinstellungen, n: RegelName): boolean {
    return e.istAus(n);
  }
  protected wert(e: RegelEinstellungen, s: WertSchluessel): number {
    return e.wert(s);
  }
  protected mitAus(e: RegelEinstellungen, n: RegelName, aus: boolean): RegelEinstellungen {
    return e.mitAus(n, aus);
  }
  protected mitWert(e: RegelEinstellungen, s: WertSchluessel, w: number): RegelEinstellungen {
    return e.mitWert(s, w);
  }
  protected standard(): RegelEinstellungen {
    return RegelEinstellungen.standard();
  }
  protected istStandard(e: RegelEinstellungen): boolean {
    return e.istStandard;
  }
  protected zeigeZeile(e: RegelEinstellungen): void {
    this.zeile.setzeRegeln(e);
  }

  /** Über den Editor: ein Undo-Schritt, ein RangeError wird zur Meldung. */
  protected aendere(fn: (e: RegelEinstellungen) => RegelEinstellungen): boolean {
    return this.editor.aendereMit((b) => b.mitRegelEinstellungen(fn(b.regelEinstellungen)));
  }
}
