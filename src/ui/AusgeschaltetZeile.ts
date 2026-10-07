import { PLATZREGEL_NAMEN, type PlatzregelEinstellungen } from '../rules/platz/PlatzregelEinstellungen';
import { REGEL_NAMEN, type RegelEinstellungen } from '../rules/RegelEinstellungen';

/** Die Zeile „Ausgeschaltet: R4, P1“ aus den Bau- und den Platzregeln; beide Panels schreiben hierhin (Spec E6, D5). */
export class AusgeschaltetZeile {
  private regeln: readonly string[] = [];
  private platz: readonly string[] = [];

  constructor(private readonly element: HTMLElement) {}

  setzeRegeln(e: RegelEinstellungen): void {
    this.regeln = REGEL_NAMEN.filter((n) => e.istAus(n));
    this.zeige();
  }

  setzePlatzregeln(e: PlatzregelEinstellungen): void {
    this.platz = PLATZREGEL_NAMEN.filter((n) => e.istAus(n));
    this.zeige();
  }

  private zeige(): void {
    const aus = [...this.regeln, ...this.platz];
    this.element.textContent = aus.length > 0 ? `Ausgeschaltet: ${aus.join(', ')}` : '';
  }
}
