// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '../editor/Editor';
import { Bauwerk } from '../model/Bauwerk';
import { AusgeschaltetZeile } from './AusgeschaltetZeile';
import { RegelnPanel } from './RegelnPanel';

const aufbau = (nurLesen = false): { knopf: HTMLButtonElement; liste: HTMLElement; zeile: HTMLElement; editor: Editor } => {
  const knopf = document.createElement('button');
  const liste = document.createElement('section');
  liste.hidden = true;
  const zeile = document.createElement('p');
  const editor = new Editor(Bauwerk.leer());
  const panel = new RegelnPanel(knopf, liste, new AusgeschaltetZeile(zeile), editor, () => nurLesen);
  editor.abonniere((z) => panel.zeige(z.bauwerk.regelEinstellungen));
  return { knopf, liste, zeile, editor };
};

const haken = (liste: HTMLElement, regel: string): HTMLInputElement => {
  const label = [...liste.querySelectorAll('label')].find((l) => l.textContent?.trim().startsWith(`${regel}:`));
  const input = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!input) throw new Error(`Haken ${regel} fehlt`);
  return input;
};

const feld = (liste: HTMLElement, text: string): HTMLInputElement => {
  const label = [...liste.querySelectorAll('label')].find((l) => l.textContent?.startsWith(text));
  const input = label?.querySelector<HTMLInputElement>('input[type="number"]');
  if (!input) throw new Error(`Feld ${text} fehlt`);
  return input;
};

const knopfMit = (wurzel: HTMLElement, text: string): HTMLButtonElement => {
  const k = [...wurzel.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!k) throw new Error(`Knopf ${text} fehlt`);
  return k;
};

const tippe = (input: HTMLInputElement, wert: string): void => {
  input.value = wert;
  input.dispatchEvent(new Event('change'));
};

describe('RegelnPanel (Spec v3, D8)', () => {
  it('klappt mit „Regeln…“ die Liste R1–R8 auf, alle an, mit den Werten aus constants.ts', () => {
    const { knopf, liste, zeile } = aufbau();
    expect(liste.hidden).toBe(true);
    knopf.click();
    expect(liste.hidden).toBe(false);
    expect(knopf.getAttribute('aria-expanded')).toBe('true');
    expect(liste.querySelectorAll('input[type="checkbox"]')).toHaveLength(8);
    expect(haken(liste, 'R4').checked).toBe(true);
    expect(feld(liste, 'Beinwinkel höchstens').value).toBe('35');
    expect(zeile.textContent).toBe('');
  });

  it('schaltet eine Regel ab, zeigt „Ausgeschaltet: R4“ und macht das als einen Undo-Schritt', () => {
    const { liste, zeile, editor } = aufbau();
    const h = haken(liste, 'R4');
    h.checked = false;
    h.dispatchEvent(new Event('change'));
    expect(editor.bauwerk.regelEinstellungen.istAus('R4')).toBe(true);
    expect(zeile.textContent).toBe('Ausgeschaltet: R4');
    expect(haken(liste, 'R4').checked).toBe(false);
    editor.rueckgaengig();
    expect(editor.bauwerk.regelEinstellungen.istAus('R4')).toBe(false);
    expect(zeile.textContent).toBe('');
  });

  it('übernimmt gültige Werte, meldet ungültige, setzt das Feld zurück und kann alles zurücksetzen', () => {
    const { liste, editor } = aufbau();
    tippe(feld(liste, 'Beinwinkel höchstens'), '40');
    expect(editor.bauwerk.regelEinstellungen.wert('R4_MAX_BEINWINKEL_GRAD')).toBe(40);
    tippe(feld(liste, 'Beinwinkel mindestens'), '45');
    expect(editor.zustand().meldung).toBe('Untergrenze muss kleiner als die Obergrenze sein');
    expect(feld(liste, 'Beinwinkel mindestens').value).toBe('10');
    tippe(feld(liste, 'Querseil mindestens auf'), '0');
    expect(editor.zustand().meldung).toBe('Wert muss größer als 0 sein');
    expect(feld(liste, 'Querseil mindestens auf').value).toBe('2');
    knopfMit(liste, 'Auf Standard zurücksetzen').click();
    expect(editor.bauwerk.regelEinstellungen.istStandard).toBe(true);
  });

  it('ist in der Ansicht nur lesbar', () => {
    const { liste } = aufbau(true);
    expect([...liste.querySelectorAll('input')].every((i) => i.disabled)).toBe(true);
    expect(knopfMit(liste, 'Auf Standard zurücksetzen').disabled).toBe(true);
  });
});
