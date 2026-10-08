// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '../editor/Editor';
import { Bauwerk } from '../model/Bauwerk';
import { PlatzregelEinstellungen } from '../rules/platz/PlatzregelEinstellungen';
import { RegelEinstellungen } from '../rules/RegelEinstellungen';
import { AusgeschaltetZeile } from './AusgeschaltetZeile';
import { PlatzregelnPanel } from './PlatzregelnPanel';

const aufbau = (nurLesen = false): { knopf: HTMLButtonElement; liste: HTMLElement; zeile: HTMLElement; editor: Editor } => {
  const knopf = document.createElement('button');
  const liste = document.createElement('section');
  liste.hidden = true;
  const zeile = document.createElement('p');
  const editor = new Editor(Bauwerk.leer());
  const panel = new PlatzregelnPanel(knopf, liste, new AusgeschaltetZeile(zeile), editor, () => nurLesen);
  editor.abonniere((z) => panel.zeige(z.bauwerk.platzregelEinstellungen));
  return { knopf, liste, zeile, editor };
};

const tippe = (input: HTMLInputElement, wert: string): void => {
  input.value = wert;
  input.dispatchEvent(new Event('change'));
};
const zahl = (liste: HTMLElement, text: string): HTMLInputElement => {
  const label = [...liste.querySelectorAll('label')].find((l) => l.textContent?.startsWith(text));
  const input = label?.querySelector<HTMLInputElement>('input[type="number"]');
  if (!input) throw new Error(`Feld ${text} fehlt`);
  return input;
};
const haken = (liste: HTMLElement, regel: string): HTMLInputElement => {
  const label = [...liste.querySelectorAll('label')].find((l) => l.textContent?.trim().startsWith(`${regel}:`));
  const input = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!input) throw new Error(`Haken ${regel} fehlt`);
  return input;
};

describe('PlatzregelnPanel (Spec E6, D5)', () => {
  it('zeigt P1–P6 mit Quellenart, Werten, der festen Forstgesetz-Zeile und klappt mit dem Knopf auf', () => {
    const { knopf, liste } = aufbau();
    expect(liste.hidden).toBe(true);
    knopf.click();
    expect(liste.hidden).toBe(false);
    expect(liste.querySelectorAll('input[type="checkbox"]')).toHaveLength(6);
    expect(liste.querySelectorAll('.quelle')).toHaveLength(6);
    expect(liste.textContent).toContain('Quelle: Camping-Blogs');
    expect(liste.textContent).toContain('Quelle: keine Quelle');
    expect(liste.textContent).toContain('Quelle: Schweizer Pfadi');
    expect(liste.textContent).toContain('nach § 40 Forstgesetz');
    expect(liste.textContent).toContain('Dafür gibt es hier keine Meterregel.');
    expect(zahl(liste, 'Mindestabstand Feuer – Zelt').value).toBe('5');
    expect(zahl(liste, 'Kronenradius').value).toBe('0.3');
  });

  it('Wert ändern ist ein Undo-Schritt, ein ungültiger Wert springt zurück und meldet', () => {
    const { liste, editor } = aufbau();
    tippe(zahl(liste, 'Mindestabstand Feuer – Zelt'), '2');
    expect(editor.bauwerk.platzregelEinstellungen.wert('P1_MIN_ABSTAND_FEUER_ZELT_M')).toBe(2);
    editor.rueckgaengig();
    expect(editor.bauwerk.platzregelEinstellungen.istStandard).toBe(true);
    expect(zahl(liste, 'Mindestabstand Feuer – Zelt').value).toBe('5');
    tippe(zahl(liste, 'Mindestabstand Feuer – Zelt'), '-1');
    expect(zahl(liste, 'Mindestabstand Feuer – Zelt').value).toBe('5');
    expect(editor.zustand().meldung).toContain('größer als 0');
  });

  it('Ausschalten zeigt „Ausgeschaltet: P1“ und R- und P-Namen stehen zusammen in einer Zeile', () => {
    const { liste, zeile, editor } = aufbau();
    const h = haken(liste, 'P1');
    h.checked = false;
    h.dispatchEvent(new Event('change'));
    expect(zeile.textContent).toBe('Ausgeschaltet: P1');
    const e = editor.bauwerk;
    const z = new AusgeschaltetZeile(zeile);
    z.setzeRegeln(RegelEinstellungen.standard().mitAus('R4', true));
    z.setzePlatzregeln(e.platzregelEinstellungen);
    expect(zeile.textContent).toBe('Ausgeschaltet: R4, P1');
    z.setzePlatzregeln(PlatzregelEinstellungen.standard());
    expect(zeile.textContent).toBe('Ausgeschaltet: R4');
  });

  it('„Auf Standard zurücksetzen“ ist ein Undo-Schritt und im Ansichtsmodus sind alle Felder gesperrt', () => {
    const { liste, editor } = aufbau();
    tippe(zahl(liste, 'Mindestabstand Feuer – Zelt'), '2');
    const knopf = [...liste.querySelectorAll('button')].find((b) => b.textContent === 'Auf Standard zurücksetzen');
    knopf?.click();
    expect(editor.bauwerk.platzregelEinstellungen.istStandard).toBe(true);
    const lesen = aufbau(true);
    expect([...lesen.liste.querySelectorAll('input')].every((i) => i.disabled)).toBe(true);
    expect([...lesen.liste.querySelectorAll('button')].every((b) => b.disabled)).toBe(true);
  });
});
