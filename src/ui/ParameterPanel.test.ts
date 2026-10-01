// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Editor } from '../editor/Editor';
import { Dreibein } from '../model/Dreibein';
import { ParameterPanel } from './ParameterPanel';

const aufbau = (): { wurzel: HTMLElement; editor: Editor } => {
  const wurzel = document.createElement('section');
  const editor = new Editor(kochstelle());
  const panel = new ParameterPanel(wurzel, editor);
  editor.abonniere((z) => panel.zeige(z));
  editor.waehle('dreibein');
  panel.zeige(editor.zustand());
  return { wurzel, editor };
};

const feld = (wurzel: HTMLElement, label: string): HTMLInputElement => {
  const treffer = [...wurzel.querySelectorAll('label')].find((l) => l.textContent?.startsWith(label));
  const input = treffer?.querySelector('input');
  if (!input) throw new Error(`Feld ${label} fehlt`);
  return input;
};

const tippe = (input: HTMLInputElement, wert: string): void => {
  input.value = wert;
  input.dispatchEvent(new Event('change'));
};

describe('ParameterPanel', () => {
  it('setzt ein abgelehntes Feld auf den Modellwert zurück und zeigt die Meldung', () => {
    const { wurzel, editor } = aufbau();
    tippe(feld(wurzel, 'Stangenlänge'), '0.5');
    expect(editor.zustand().meldung).toBe('Fußkreisradius muss kleiner als Stangenlänge minus Überstand sein');
    expect(feld(wurzel, 'Stangenlänge').value).toBe('2.4');
  });

  it('übernimmt einen gültigen Wert ins Modell', () => {
    const { wurzel, editor } = aufbau();
    tippe(feld(wurzel, 'Stangenlänge'), '3');
    const d = editor.bauwerk.gruppe('dreibein');
    expect(d instanceof Dreibein && d.params.stangenlaenge).toBe(3);
    expect(feld(wurzel, 'Stangenlänge').value).toBe('3');
  });

  it('baut das Formular bei einer reinen Meldung nicht neu auf', () => {
    const { wurzel, editor } = aufbau();
    const vorher = feld(wurzel, 'Stangenlänge');
    editor.zeigeMeldung('Link kopiert.');
    expect(feld(wurzel, 'Stangenlänge')).toBe(vorher);
  });
});
