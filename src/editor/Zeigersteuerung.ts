import type { Editor } from './Editor';
import type { Vec3 } from '../model/Vec3';
import { naheKante, naherGriff } from './eckenTreffer';
import { GRIFF_TREFFER_PX, KLICK_TOLERANZ_PX } from './konstanten';
import { rahmenMoeglich, rechteckAus } from './Rahmenwahl';
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
 * Ein Klick ist Drücken und Loslassen ohne nennenswerte Mausbewegung. In der Planansicht wählt Shift+Ziehen auf leerem Boden
 * mit einem Rahmen alle Objekte darin (Spec E1, D1); dabei ist die Kamera gesperrt.
 */
export class Zeigersteuerung {
  private druck: Druck | null = null;
  /** Der Bodenpunkt, an dem ein Auswahlrahmen begann; null, wenn keiner aufgezogen wird. */
  private rahmenStart: Vec3 | null = null;
  /** Der Druck begann auf einem Griff oder an einer Kante der gewählten Zone/Linie: Loslassen ist dann kein Klick (er träfe oft den Boden und würde abwählen). */
  private ohneKlick = false;
  private readonly rahmenElement = document.createElement('div');

  constructor(
    private readonly szene: Szene,
    private readonly editor: Editor,
    private readonly bearbeitbar: () => boolean,
  ) {
    const leinwand = szene.leinwand;
    this.rahmenElement.id = 'rahmen';
    this.rahmenElement.hidden = true;
    leinwand.parentElement?.appendChild(this.rahmenElement);
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
    this.druck = e.button === 0 && e.target === this.szene.leinwand && this.bearbeitbar() ? { x: e.clientX, y: e.clientY, entfernt: false } : null;
    if (!this.druck) return;
    const treffer = this.szene.treffer(e, this.editor.klickZiele);
    const boden = this.szene.bodenPunkt(e);
    if (boden && this.greifeGriff(e, boden)) return;
    this.ohneKlick = this.amRand(e);
    if (boden && rahmenMoeglich(e.shiftKey, this.szene.ansicht, this.editor.zustand().werkzeug)) {
      this.rahmenStart = boden;
      this.szene.setzeKamerasteuerung(false);
    } else if (treffer && boden && this.editor.beginneZiehen(treffer, boden, { shift: e.shiftKey })) this.szene.setzeKamerasteuerung(false);
  }

  /** Drücken auf einen Griff der ausgewählten Zone oder Linie beginnt das Ziehen der Ecke (Spec E3). */
  private greifeGriff(e: MouseEvent, boden: Vec3): boolean {
    const ecken = this.editor.zustand().ecken;
    if (!ecken) return false;
    const index = naherGriff({ x: e.clientX, y: e.clientY }, ecken.punkte.map((p) => this.szene.zuBildschirm(p)), GRIFF_TREFFER_PX);
    if (index === null || !this.editor.beginneEckenZiehen(index, boden)) return false;
    this.szene.setzeKamerasteuerung(false);
    this.ohneKlick = true;
    return true;
  }

  private bewegt(e: PointerEvent): void {
    const druck = this.druck;
    if (!druck) return;
    // Auch beim Kamera-Orbit/-Pan zählt die Wanderung: sonst löst das Loslassen einen Klick aus.
    druck.entfernt ||= Math.hypot(e.clientX - druck.x, e.clientY - druck.y) >= KLICK_TOLERANZ_PX;
    if (this.rahmenStart) return this.ziehRahmen(druck, e);
    if (!this.editor.zieht) return;
    const boden = druck.entfernt ? this.szene.bodenPunkt(e) : null;
    if (boden) this.editor.ziehe(boden);
  }

  private ziehRahmen(druck: Druck, e: PointerEvent): void {
    if (!druck.entfernt) return;
    const box = this.szene.leinwand.getBoundingClientRect();
    const stil = this.rahmenElement.style;
    stil.left = `${Math.min(druck.x, e.clientX) - box.left}px`;
    stil.top = `${Math.min(druck.y, e.clientY) - box.top}px`;
    stil.width = `${Math.abs(e.clientX - druck.x)}px`;
    stil.height = `${Math.abs(e.clientY - druck.y)}px`;
    this.rahmenElement.hidden = false;
  }

  private beendeRahmen(druck: Druck | null, e: PointerEvent): boolean {
    const start = this.rahmenStart;
    this.rahmenStart = null;
    this.rahmenElement.hidden = true;
    if (!start || !druck?.entfernt) return false;
    const ende = this.szene.bodenPunkt(e);
    if (ende) this.editor.waehleImRahmen(rechteckAus(start, ende));
    return true;
  }

  private losgelassen(e: PointerEvent): void {
    const druck = this.druck;
    this.druck = null;
    this.szene.setzeKamerasteuerung(true);
    if (this.beendeRahmen(druck, e)) return;
    if (this.editor.zieht) {
      if (druck?.entfernt) return this.editor.beendeZiehen();
      this.editor.brichZiehenAb();
    }
    if (this.ohneKlick) {
      this.ohneKlick = false;
      return;
    }
    if (!druck || druck.entfernt || e.target !== this.szene.leinwand) return;
    const treffer = this.szene.treffer(e, this.editor.klickZiele);
    if (treffer) this.editor.klick(treffer, { shift: e.shiftKey });
  }

  private abgebrochen(): void {
    this.druck = null;
    this.rahmenStart = null;
    this.ohneKlick = false;
    this.rahmenElement.hidden = true;
    this.szene.setzeKamerasteuerung(true);
    this.editor.brichZiehenAb();
  }

  private doppelklick(e: MouseEvent): void {
    if (!this.bearbeitbar()) return;
    if (this.fuegeEckeEin(e)) return;
    const treffer = this.szene.treffer(e, this.editor.klickZiele);
    if (treffer) this.editor.doppelklick(treffer, { shift: e.shiftKey });
  }

  /** Der Zeiger steht an einer Kante der ausgewählten Zone oder Linie. */
  private amRand(e: MouseEvent): boolean {
    const ecken = this.editor.zustand().ecken;
    if (!ecken) return false;
    const pixel = ecken.punkte.map((p) => this.szene.zuBildschirm(p));
    return naheKante({ x: e.clientX, y: e.clientY }, pixel, ecken.geschlossen, GRIFF_TREFFER_PX) !== null;
  }

  /** Doppelklick auf eine Kante der ausgewählten Zone oder Linie fügt dort eine Ecke ein; nicht auf einem Griff. */
  private fuegeEckeEin(e: MouseEvent): boolean {
    const ecken = this.editor.zustand().ecken;
    const boden = this.szene.bodenPunkt(e);
    if (!ecken || !boden) return false;
    const maus = { x: e.clientX, y: e.clientY };
    const pixel = ecken.punkte.map((p) => this.szene.zuBildschirm(p));
    if (naherGriff(maus, pixel, GRIFF_TREFFER_PX) !== null) return false;
    const kante = naheKante(maus, pixel, ecken.geschlossen, GRIFF_TREFFER_PX);
    return kante !== null && this.editor.fuegeEckeEin(kante, boden);
  }
}
