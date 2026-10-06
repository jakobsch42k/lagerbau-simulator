import type { Editor } from './Editor';
import { KLICK_TOLERANZ_PX } from './konstanten';
import type { Szene } from './Szene';

/** Zustand von Drücken bis Loslassen der linken Maustaste. */
interface Druck {
  readonly x: number;
  readonly y: number;
  /** Die Maus ist über die Klick-Toleranz hinaus gewandert. */
  entfernt: boolean;
}

/**
 * Übersetzt Mausereignisse auf der Leinwand in Editor-Aufrufe (Spec E1, D3): Klick, Doppelklick und Ziehen eines Objekts.
 * Drücken auf ein Objekt der Auswahl startet ein Ziehen und sperrt solange die Kamera. Alles andere dreht wie bisher die Ansicht.
 * Ein Klick ist Drücken und Loslassen ohne nennenswerte Mausbewegung.
 */
export class Zeigersteuerung {
  private druck: Druck | null = null;

  constructor(
    private readonly szene: Szene,
    private readonly editor: Editor,
    private readonly bearbeitbar: () => boolean,
  ) {
    const leinwand = szene.leinwand;
    // Capture auf dem Eltern-Element: läuft vor den Orbit-Controls der Leinwand und kann sie noch sperren.
    leinwand.parentElement?.addEventListener('pointerdown', (e) => this.gedrueckt(e), { capture: true });
    leinwand.addEventListener('pointermove', (e) => this.editor.setzeMausPunkt(this.szene.bodenPunkt(e)));
    leinwand.addEventListener('pointerleave', () => this.editor.setzeMausPunkt(null));
    leinwand.addEventListener('dblclick', (e) => this.doppelklick(e));
    window.addEventListener('pointermove', (e) => this.bewegt(e));
    window.addEventListener('pointerup', (e) => this.losgelassen(e));
    window.addEventListener('pointercancel', () => this.abgebrochen());
  }

  private gedrueckt(e: PointerEvent): void {
    this.druck = e.button === 0 && this.bearbeitbar() ? { x: e.clientX, y: e.clientY, entfernt: false } : null;
    if (!this.druck) return;
    const treffer = this.szene.treffer(e, this.editor.klickZiele);
    const boden = this.szene.bodenPunkt(e);
    if (treffer && boden && this.editor.beginneZiehen(treffer, boden, { shift: e.shiftKey })) this.szene.setzeKamerasteuerung(false);
  }

  private bewegt(e: PointerEvent): void {
    const druck = this.druck;
    if (!druck || !this.editor.zieht) return;
    druck.entfernt ||= Math.hypot(e.clientX - druck.x, e.clientY - druck.y) >= KLICK_TOLERANZ_PX;
    const boden = druck.entfernt ? this.szene.bodenPunkt(e) : null;
    if (boden) this.editor.ziehe(boden);
  }

  private losgelassen(e: PointerEvent): void {
    const druck = this.druck;
    this.druck = null;
    this.szene.setzeKamerasteuerung(true);
    if (this.editor.zieht) {
      if (druck?.entfernt) return this.editor.beendeZiehen();
      this.editor.brichZiehenAb();
    }
    if (!druck || druck.entfernt || e.target !== this.szene.leinwand) return;
    const treffer = this.szene.treffer(e, this.editor.klickZiele);
    if (treffer) this.editor.klick(treffer, { shift: e.shiftKey });
  }

  private abgebrochen(): void {
    this.druck = null;
    this.szene.setzeKamerasteuerung(true);
    this.editor.brichZiehenAb();
  }

  private doppelklick(e: MouseEvent): void {
    if (!this.bearbeitbar()) return;
    const treffer = this.szene.treffer(e, this.editor.klickZiele);
    if (treffer) this.editor.doppelklick(treffer, { shift: e.shiftKey });
  }
}
