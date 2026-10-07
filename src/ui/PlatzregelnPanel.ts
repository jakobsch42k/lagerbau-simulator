import type { Editor } from '../editor/Editor';
import {
  PlatzregelEinstellungen,
  type PlatzRegelName,
  type PlatzWertSchluessel,
} from '../rules/platz/PlatzregelEinstellungen';
import type { AusgeschaltetZeile } from './AusgeschaltetZeile';
import { EinstellungsPanel, type RegelEintrag } from './EinstellungsPanel';

const FORSTGESETZ =
  'Feuer im Wald und im Gefährdungsbereich ist nach § 40 Forstgesetz nur mit Erlaubnis erlaubt (Waldbrandverordnung beachten). Dafür gibt es hier keine Meterregel.';

type PlatzEintrag = RegelEintrag<PlatzRegelName, PlatzWertSchluessel>;


/** Kurzbeschreibung, Quellenart und Wertfeld je Platzregel. Die Startwerte stehen in src/rules/platz/constants.ts. */
const KATALOG: readonly PlatzEintrag[] = [
  { name: 'P1', text: 'Feuer – Zelt', quelle: 'Camping-Blogs', felder: [{ schluessel: 'P1_MIN_ABSTAND_FEUER_ZELT_M', label: 'Mindestabstand Feuer – Zelt', einheit: 'm', schritt: '0.5' }] },
  { name: 'P2', text: 'Feuer – Holzlager', quelle: 'keine Quelle (vorsichtiger Startwert)', felder: [{ schluessel: 'P2_MIN_ABSTAND_FEUER_HOLZ_M', label: 'Mindestabstand Feuer – Holzlager', einheit: 'm', schritt: '0.5' }] },
  { name: 'P3', text: 'Zelt – Zelt', quelle: 'VDE (Empfehlung, Deutschland)', felder: [{ schluessel: 'P3_MIN_ABSTAND_ZELT_ZELT_M', label: 'Mindestabstand Zelt – Zelt', einheit: 'm', schritt: '0.5' }] },
  { name: 'P4', text: 'Latrine – Wasserstelle', quelle: 'Schweizer Pfadi', felder: [{ schluessel: 'P4_MIN_ABSTAND_LATRINE_WASSER_M', label: 'Mindestabstand Latrine – Wasserstelle', einheit: 'm', schritt: '0.5' }] },
  { name: 'P5', text: 'Latrine – Küche und Feuerstelle', quelle: 'keine Zahlenquelle (nur qualitativ)', felder: [{ schluessel: 'P5_MIN_ABSTAND_LATRINE_KUECHE_M', label: 'Mindestabstand Latrine – Küche', einheit: 'm', schritt: '0.5' }] },
  { name: 'P6', text: 'Zelt unter Baumkrone', quelle: 'VDE (Empfehlung), Kronengröße geschätzt', felder: [{ schluessel: 'P6_KRONENRADIUS_FAKTOR', label: 'Kronenradius', einheit: '× Höhe', schritt: '0.05' }] },
];

/**
 * „Platzregeln…“: Faustregeln für den Lagerplatz an- und abschalten und einstellen; gespeichert im Bauwerk (Spec E6, D5).
 * Aufbau und Verhalten in `EinstellungsPanel`.
 */
export class PlatzregelnPanel extends EinstellungsPanel<PlatzregelEinstellungen, PlatzRegelName, PlatzWertSchluessel> {
  constructor(
    knopf: HTMLButtonElement,
    liste: HTMLElement,
    private readonly zeile: AusgeschaltetZeile,
    editor: Editor,
    nurLesen: () => boolean,
  ) {
    super(knopf, liste, editor, nurLesen);
    this.zeige(editor.bauwerk.platzregelEinstellungen);
  }

  protected katalog(): readonly PlatzEintrag[] {
    return KATALOG;
  }
  protected istAus(e: PlatzregelEinstellungen, n: PlatzRegelName): boolean {
    return e.istAus(n);
  }
  protected wert(e: PlatzregelEinstellungen, s: PlatzWertSchluessel): number {
    return e.wert(s);
  }
  protected mitAus(e: PlatzregelEinstellungen, n: PlatzRegelName, aus: boolean): PlatzregelEinstellungen {
    return e.mitAus(n, aus);
  }
  protected mitWert(e: PlatzregelEinstellungen, s: PlatzWertSchluessel, w: number): PlatzregelEinstellungen {
    return e.mitWert(s, w);
  }
  protected standard(): PlatzregelEinstellungen {
    return PlatzregelEinstellungen.standard();
  }
  protected istStandard(e: PlatzregelEinstellungen): boolean {
    return e.istStandard;
  }
  protected zeigeZeile(e: PlatzregelEinstellungen): void {
    this.zeile.setzePlatzregeln(e);
  }
  protected override fuss(): HTMLElement[] {
    const p = document.createElement('p');
    p.className = 'forstgesetz';
    p.textContent = FORSTGESETZ;
    return [p];
  }

  /** Über den Editor: ein Undo-Schritt, ein RangeError wird zur Meldung. */
  protected aendere(fn: (e: PlatzregelEinstellungen) => PlatzregelEinstellungen): boolean {
    return this.editor.aendereMit((b) => b.mitPlatzregelEinstellungen(fn(b.platzregelEinstellungen)));
  }
}

