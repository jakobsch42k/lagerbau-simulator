// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { Editor } from '../editor/Editor';
import { Nordpfeil } from '../editor/Nordpfeil';
import { Bauwerk } from '../model/Bauwerk';
import { Luftbild } from '../model/Luftbild';
import { Vec3 } from '../model/Vec3';
import { type BildAnsicht, LuftbildPanel, luftbildInfo } from './LuftbildPanel';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const bild = (px = 200, mpp = 0.5): Luftbild => new Luftbild(PNG, px, px / 2, mpp, 1);

function aufbau() {
  const wurzel = document.createElement('section');
  const knopf = document.createElement('button');
  const editor = new Editor(Bauwerk.leer());
  const ansicht = { rasterSichtbar: true, setzeRaster: vi.fn(), zeigeDeckkraft: vi.fn() } satisfies BildAnsicht;
  const panel = new LuftbildPanel(wurzel, knopf, editor, ansicht);
  editor.abonniere((z) => panel.zeige(z));
  const knopfMit = (text: string): HTMLButtonElement => {
    const k = [...wurzel.querySelectorAll('button')].find((b) => b.textContent === text);
    if (!k) throw new Error(`Knopf ${text} fehlt`);
    return k;
  };
  const feld = (typ: string): HTMLInputElement => wurzel.querySelector<HTMLInputElement>(`input[type="${typ}"]`)!;
  return { wurzel, knopf, editor, ansicht, knopfMit, feld };
}

describe('luftbildInfo', () => {
  it('nennt Maße in Metern und den Maßstab mit Komma', () => {
    expect(luftbildInfo(new Luftbild(PNG, 2040, 1500, 0.12, 1))).toBe('Bild 244,8 × 180 m, 1 px = 0,12 m');
    expect(luftbildInfo(bild(200, 0.1))).toBe('Bild 20 × 10 m, 1 px = 0,1 m');
  });
});

describe('LuftbildPanel (Spec E2, D2)', () => {
  it('ist ohne Bild samt Knopf verborgen', () => {
    const { wurzel, knopf } = aufbau();
    expect(wurzel.hidden).toBe(true);
    expect(knopf.hidden).toBe(true);
  });

  it('zeigt mit Bild die Info, den Regler, den Raster-Schalter und die Knöpfe', () => {
    const { wurzel, knopf, editor, knopfMit, feld } = aufbau();
    editor.ladeLuftbild(bild());
    expect(knopf.hidden).toBe(false);
    expect(wurzel.hidden).toBe(false);
    expect(wurzel.textContent).toContain('Bild 100 × 50 m, 1 px = 0,5 m');
    expect(feld('range').value).toBe('100');
    expect(feld('checkbox').checked).toBe(true);
    expect(knopfMit('Maßstab neu setzen')).toBeTruthy();
    expect(knopfMit('Luftbild entfernen')).toBeTruthy();
  });

  it('der Knopf „Luftbild“ klappt das Panel zu und auf', () => {
    const { wurzel, knopf, editor } = aufbau();
    editor.ladeLuftbild(bild());
    knopf.click();
    expect(wurzel.hidden).toBe(true);
    expect(knopf.getAttribute('aria-pressed')).toBe('false');
    knopf.click();
    expect(wurzel.hidden).toBe(false);
  });

  it('das Feld „Abstand in Metern“ erscheint erst nach zwei Klicks; „Übernehmen“ setzt den Maßstab', () => {
    const { wurzel, editor, feld, knopfMit } = aufbau();
    editor.ladeLuftbild(bild());
    const strecke = wurzel.querySelector<HTMLElement>('.luftbild-strecke')!;
    expect(strecke.hidden).toBe(true);
    editor.klick({ art: 'boden', punkt: new Vec3(-25, 0, 0) });
    expect(strecke.hidden).toBe(true);
    editor.klick({ art: 'boden', punkt: new Vec3(25, 0, 0) });
    expect(strecke.hidden).toBe(false);
    expect(strecke.textContent).toContain('Abstand in Metern');
    feld('number').value = '10';
    knopfMit('Übernehmen').click();
    expect(editor.bauwerk.luftbild?.breiteM).toBeCloseTo(20);
    expect(wurzel.textContent).toContain('Bild 20 × 10 m, 1 px = 0,1 m');
    expect(strecke.hidden).toBe(true);
  });

  it('„Übernehmen“ mit leerem oder ungültigem Feld ändert nichts und meldet', () => {
    const { editor, feld, knopfMit } = aufbau();
    editor.ladeLuftbild(bild());
    editor.klick({ art: 'boden', punkt: new Vec3(0, 0, 0) });
    editor.klick({ art: 'boden', punkt: new Vec3(50, 0, 0) });
    knopfMit('Übernehmen').click();
    expect(editor.zustand().meldung).toBe('Maßstab muss größer als 0 sein');
    feld('number').value = '-3';
    knopfMit('Übernehmen').click();
    expect(editor.bauwerk.luftbild?.breiteM).toBe(100);
  });

  it('Enter im Feld übernimmt', () => {
    const { editor, feld } = aufbau();
    editor.ladeLuftbild(bild());
    editor.klick({ art: 'boden', punkt: new Vec3(0, 0, 0) });
    editor.klick({ art: 'boden', punkt: new Vec3(50, 0, 0) });
    feld('number').value = '10';
    feld('number').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(editor.bauwerk.luftbild?.breiteM).toBeCloseTo(20);
  });

  it('„Maßstab neu setzen“ startet das Werkzeug', () => {
    const { editor, knopfMit } = aufbau();
    editor.ladeLuftbild(bild());
    editor.waehleWerkzeug('auswahl');
    knopfMit('Maßstab neu setzen').click();
    expect(editor.zustand().werkzeug).toBe('massstab');
  });

  it('der Regler zeigt beim Ziehen eine Vorschau und legt beim Loslassen einen Undo-Schritt an', () => {
    const { wurzel, editor, ansicht, feld } = aufbau();
    editor.ladeLuftbild(bild());
    const regler = feld('range');
    regler.value = '40';
    regler.dispatchEvent(new Event('input'));
    expect(ansicht.zeigeDeckkraft).toHaveBeenCalledWith(0.4);
    expect(editor.bauwerk.luftbild?.deckkraft).toBe(1);
    expect(wurzel.querySelector('output')?.textContent).toBe('40 %');
    regler.dispatchEvent(new Event('change'));
    expect(editor.bauwerk.luftbild?.deckkraft).toBe(0.4);
    editor.rueckgaengig();
    expect(editor.bauwerk.luftbild?.deckkraft).toBe(1);
    expect(feld('range').value).toBe('100');
  });

  it('der Raster-Schalter gibt seinen Zustand an die Ansicht', () => {
    const { editor, ansicht, feld } = aufbau();
    editor.ladeLuftbild(bild());
    feld('checkbox').checked = false;
    feld('checkbox').dispatchEvent(new Event('change'));
    expect(ansicht.setzeRaster).toHaveBeenCalledWith(false);
  });

  it('„Luftbild entfernen“ blendet das Panel aus; Rückgängig bringt es zurück', () => {
    const { wurzel, editor, knopfMit } = aufbau();
    editor.ladeLuftbild(bild());
    knopfMit('Luftbild entfernen').click();
    expect(editor.bauwerk.luftbild).toBeNull();
    expect(wurzel.hidden).toBe(true);
    editor.rueckgaengig();
    expect(wurzel.hidden).toBe(false);
  });
});

describe('Nordpfeil', () => {
  it('dreht sich mit dem übergebenen Winkel', () => {
    const container = document.createElement('div');
    const pfeil = new Nordpfeil(container);
    const el = container.querySelector<HTMLElement>('#nordpfeil')!;
    expect(el.style.transform).toBe('rotate(0deg)');
    pfeil.drehe(-90);
    expect(el.style.transform).toBe('rotate(-90deg)');
    pfeil.drehe(-90.02);
    expect(el.style.transform).toBe('rotate(-90deg)');
    expect(el.textContent).toContain('N');
  });
});
