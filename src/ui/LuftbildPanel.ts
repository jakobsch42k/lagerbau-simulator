import type { Editor, EditorZustand } from '../editor/Editor';
import type { Luftbild } from '../model/Luftbild';

/** Was das Panel von der Szene braucht: das Raster (nur Ansicht) und die Deckkraft-Vorschau beim Ziehen. */
export interface BildAnsicht {
  readonly rasterSichtbar: boolean;
  setzeRaster(an: boolean): void;
  zeigeDeckkraft(deckkraft: number): void;
}

const zahl = (wert: number, optionen: Intl.NumberFormatOptions): string => new Intl.NumberFormat('de-AT', optionen).format(wert);

/** „Bild 245 × 180 m, 1 px = 0,12 m“ (Spec E2, D2). */
export function luftbildInfo(l: Luftbild): string {
  const m = (wert: number): string => zahl(wert, { maximumFractionDigits: 1 });
  return `Bild ${m(l.breiteM)} × ${m(l.hoeheM)} m, 1 px = ${zahl(l.meterProPixel, { maximumSignificantDigits: 2 })} m`;
}

/**
 * Das Panel des Luftbilds (Spec E2, D2), über den Knopf „Luftbild“ zu öffnen, sobald ein Bild geladen ist: Info, „Maßstab neu setzen“,
 * das Feld „Abstand in Metern“ mit „Übernehmen“ (solange das Werkzeug „Maßstab setzen“ zwei Punkte hat), Deckkraft, Raster, Entfernen.
 * Die Bedienelemente werden einmal gebaut und nur umgeschaltet, damit ein Regler beim Ziehen nicht neu entsteht.
 */
export class LuftbildPanel {
  private offen = true;
  private hatteBild = false;
  private readonly info = document.createElement('p');
  private readonly strecke = document.createElement('div');
  private readonly meter = document.createElement('input');
  private readonly regler = document.createElement('input');
  private readonly prozent = document.createElement('output');
  private readonly raster = document.createElement('input');

  constructor(
    private readonly wurzel: HTMLElement,
    private readonly knopf: HTMLButtonElement,
    private readonly editor: Editor,
    private readonly ansicht: BildAnsicht,
  ) {
    knopf.addEventListener('click', () => {
      this.offen = !this.offen;
      this.zeige(editor.zustand());
    });
    this.baue();
    this.zeige(editor.zustand());
  }

  zeige(z: EditorZustand): void {
    const bild = z.bauwerk.luftbild;
    if (bild && !this.hatteBild) this.offen = true;
    this.hatteBild = bild !== null;
    this.knopf.hidden = bild === null;
    this.knopf.setAttribute('aria-pressed', String(this.offen));
    this.wurzel.hidden = bild === null || !this.offen;
    if (bild === null) return;
    this.info.textContent = luftbildInfo(bild);
    this.strecke.hidden = !(z.werkzeug === 'massstab' && z.messung?.bis);
    const prozent = Math.round(bild.deckkraft * 100);
    if (document.activeElement !== this.regler) this.regler.value = String(prozent);
    this.prozent.textContent = `${this.regler.value} %`;
    this.raster.checked = this.ansicht.rasterSichtbar;
  }

  private baue(): void {
    const kopf = document.createElement('h2');
    kopf.textContent = 'Luftbild';
    this.wurzel.append(kopf, this.info, this.massstabKnopf(), this.strecke, this.deckkraft(), this.rasterSchalter(), this.entfernenKnopf());
    this.baueStrecke();
  }

  private massstabKnopf(): HTMLButtonElement {
    const knopf = document.createElement('button');
    knopf.textContent = 'Maßstab neu setzen';
    knopf.addEventListener('click', () => this.editor.waehleWerkzeug('massstab'));
    return knopf;
  }

  /** „Abstand in Metern“ und „Übernehmen“; bewusst kein window.prompt, das gibt es im Programm nicht. */
  private baueStrecke(): void {
    this.strecke.className = 'luftbild-strecke';
    this.strecke.hidden = true;
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = 'Abstand in Metern';
    this.meter.type = 'number';
    this.meter.min = '0';
    this.meter.step = 'any';
    label.append(this.meter);
    const uebernehmen = document.createElement('button');
    uebernehmen.textContent = 'Übernehmen';
    uebernehmen.addEventListener('click', () => this.uebernehme());
    this.meter.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.uebernehme();
    });
    this.strecke.append(label, uebernehmen);
  }

  private uebernehme(): void {
    // Leer ergibt NaN; der Editor lehnt das als „Maßstab muss größer als 0 sein“ ab.
    if (this.editor.setzeMassstab(this.meter.value === '' ? Number.NaN : Number(this.meter.value))) this.meter.value = '';
  }

  private deckkraft(): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.append('Deckkraft ');
    this.regler.type = 'range';
    this.regler.min = '0';
    this.regler.max = '100';
    this.regler.step = '1';
    this.regler.addEventListener('input', () => {
      this.prozent.textContent = `${this.regler.value} %`;
      this.ansicht.zeigeDeckkraft(Number(this.regler.value) / 100);
    });
    // Erst beim Loslassen ein Undo-Schritt; abgelehnt (z. B. kein Bild mehr) springt die Vorschau zurück.
    this.regler.addEventListener('change', () => {
      if (!this.editor.setzeDeckkraft(Number(this.regler.value) / 100)) this.zeige(this.editor.zustand());
    });
    label.append(this.regler, this.prozent);
    return label;
  }

  private rasterSchalter(): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    this.raster.type = 'checkbox';
    this.raster.addEventListener('change', () => this.ansicht.setzeRaster(this.raster.checked));
    label.append(this.raster, ' Raster zeigen');
    return label;
  }

  private entfernenKnopf(): HTMLButtonElement {
    const knopf = document.createElement('button');
    knopf.textContent = 'Luftbild entfernen';
    knopf.addEventListener('click', () => this.editor.entferneLuftbild());
    return knopf;
  }
}
