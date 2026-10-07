// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { BaumArt } from '../arten/BaumArt';
import type { PanelSpec } from '../arten/ObjektArt';
import { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import { kochstelle } from '../beispiele/kochstelle';
import { Editor } from '../editor/Editor';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Baum } from '../model/Baum';
import { Dreibein } from '../model/Dreibein';
import { Plane } from '../model/Plane';
import { Platzobjekt } from '../model/Platzobjekt';
import { STANDARD_BAUM, STANDARD_PLANE } from '../model/params';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
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

const panelMit = (bauwerk: Bauwerk, id: string): { wurzel: HTMLElement; editor: Editor } => {
  const wurzel = document.createElement('section');
  const editor = new Editor(bauwerk);
  const panel = new ParameterPanel(wurzel, editor);
  editor.abonniere((z) => panel.zeige(z));
  editor.waehle(id);
  panel.zeige(editor.zustand());
  return { wurzel, editor };
};

const form = (wurzel: HTMLElement): HTMLSelectElement => {
  const auswahl = wurzel.querySelector('select');
  if (!auswahl) throw new Error('Form-Auswahl fehlt');
  return auswahl;
};

const waehleForm = (wurzel: HTMLElement, wert: string): void => {
  const auswahl = form(wurzel);
  auswahl.value = wert;
  auswahl.dispatchEvent(new Event('change'));
};

const knopftexte = (wurzel: HTMLElement): string[] => [...wurzel.querySelectorAll('button')].map((b) => b.textContent ?? '');

const knopf = (wurzel: HTMLElement, text: string): HTMLButtonElement => {
  const k = [...wurzel.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!k) throw new Error(`Knopf ${text} fehlt`);
  return k;
};

const dach = (y: number, art: 'eben' | 'satteldach' = 'eben'): Plane =>
  new Plane('pl', new Vec3(0, y, 0), new Vec3(4, y, 0), { ...STANDARD_PLANE, form: art });

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

  it('zeigt beim Baum Stammdurchmesser und Höhe und setzt unsinnige Werte zurück', () => {
    const { wurzel, editor } = panelMit(Bauwerk.leer().mitBaum(new Baum('b', Vec3.NULL, STANDARD_BAUM)), 'b');
    tippe(feld(wurzel, 'Höhe'), '0');
    expect(editor.zustand().meldung).toBe('Baumhöhe muss größer als 0 sein');
    expect(feld(wurzel, 'Höhe').value).toBe('8');
    tippe(feld(wurzel, 'Höhe'), '');
    expect(feld(wurzel, 'Höhe').value).toBe('8');
    tippe(feld(wurzel, 'Höhe'), '12');
    expect(editor.bauwerk.baum('b')?.params.hoehe).toBe(12);
    expect(feld(wurzel, 'Stammdurchmesser').value).toBe('30');
  });

  it('zeigt beim Seil Länge und Winkel ohne Eingabefelder', () => {
    const { wurzel } = panelMit(Bauwerk.leer().mitSeil(new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 0, 0))), 's');
    expect(wurzel.querySelectorAll('input')).toHaveLength(0);
    expect(wurzel.textContent).toContain('Länge 2.83 m · Winkel zum Boden 45°');
    expect(wurzel.textContent).toContain('Löschen');
  });

  it('zeigt bei der Plane Breite, Länge und Neigung und setzt unsinnige Werte zurück', () => {
    const { wurzel, editor } = panelMit(Bauwerk.leer().mitPlane(dach(2)), 'pl');
    expect(feld(wurzel, 'Breite').value).toBe('3');
    expect(feld(wurzel, 'Länge').value).toBe('4');
    expect(feld(wurzel, 'Neigung').value).toBe('30');
    expect(feld(wurzel, 'Neigung').step).toBe('1');
    expect(wurzel.textContent).toContain('Aufhängelinie 4.00 m');
    tippe(feld(wurzel, 'Breite'), '5'); // 2 − 5 · sin 30° = −0,5 m
    expect(editor.zustand().meldung).toBe('Plane reicht in den Boden: Neigung, Breite oder Länge verringern.');
    expect(feld(wurzel, 'Breite').value).toBe('3');
    tippe(feld(wurzel, 'Neigung'), '120');
    expect(editor.zustand().meldung).toBe('Neigung muss zwischen 0 und 90° liegen');
    expect(feld(wurzel, 'Neigung').value).toBe('30');
    tippe(feld(wurzel, 'Länge'), '');
    expect(feld(wurzel, 'Länge').value).toBe('4');
    tippe(feld(wurzel, 'Neigung'), '10');
    expect(editor.bauwerk.plane('pl')?.params.neigungGrad).toBe(10);
  });

  it('wechselt Seite und Form; „Seite wechseln“ gibt es nur bei eben', () => {
    const { wurzel, editor } = panelMit(Bauwerk.leer().mitPlane(dach(2)), 'pl');
    expect(form(wurzel).value).toBe('eben');
    knopf(wurzel, 'Seite wechseln').click();
    expect(editor.bauwerk.plane('pl')?.params.seite).toBe(-1);
    waehleForm(wurzel, 'satteldach');
    expect(editor.bauwerk.plane('pl')?.params.form).toBe('satteldach');
    expect(knopftexte(wurzel)).not.toContain('Seite wechseln');
    expect(knopftexte(wurzel)).toContain('Löschen (Entf)');
  });

  it('setzt die Form zurück, wenn die Plane damit in den Boden reicht', () => {
    // Satteldach auf 1 m: Hälften 1,5 m, Unterkante 0,25 m. Eben hinge die volle Breite 1,5 m tief.
    const { wurzel, editor } = panelMit(Bauwerk.leer().mitPlane(dach(1, 'satteldach')), 'pl');
    waehleForm(wurzel, 'eben');
    expect(editor.zustand().meldung).toBe('Plane reicht in den Boden: Neigung, Breite oder Länge verringern.');
    expect(form(wurzel).value).toBe('satteldach');
    expect(editor.bauwerk.plane('pl')?.params.form).toBe('satteldach');
  });

  it('nimmt Felder und Info aus der Panel-Beschreibung der Art im übergebenen Register (Spec v3, D4)', () => {
    class Testbaum extends BaumArt {
      override panel(b: Baum): PanelSpec {
        return { ...super.panel(b), info: 'Panel aus dem übergebenen Register' };
      }
    }
    const arten = new ObjektRegister([...standardArten().alle.filter((a) => a.name !== 'baum'), new Testbaum()]);
    const wurzel = document.createElement('section');
    const editor = new Editor(Bauwerk.leer().mitBaum(new Baum('b', Vec3.NULL, STANDARD_BAUM)), { arten });
    const panel = new ParameterPanel(wurzel, editor, arten);
    editor.waehle('b');
    panel.zeige(editor.zustand());
    expect(wurzel.textContent).toContain('Panel aus dem übergebenen Register');
    expect(feld(wurzel, 'Höhe').value).toBe('8');
  });

  it('baut das Formular des A-Bocks wie bisher', () => {
    const { wurzel, editor } = panelMit(kochstelle(), 'abock');
    expect(wurzel.querySelector('h2')?.textContent).toBe('A-Bock');
    expect([...wurzel.querySelectorAll('label')].map((l) => l.textContent)).toEqual(['Stangenlänge (m)', 'Fußabstand (m)', 'Riegelhöhe (m)', 'Ø (cm)']);
    expect(feld(wurzel, 'Ø').value).toBe('8');
    expect(wurzel.textContent).toContain('Höhe 2.05 m · Beinwinkel 21° · R dreht');
    tippe(feld(wurzel, 'Riegelhöhe'), '0.6');
    const a = editor.bauwerk.gruppe('abock');
    expect(a instanceof ABock && a.params.riegelhoehe).toBe(0.6);
  });

  it('zeigt bei der freien Stange nur den Durchmesser und setzt 0 zurück', () => {
    const { wurzel, editor } = panelMit(kochstelle(), 'first');
    expect(wurzel.querySelector('h2')?.textContent).toBe('Stange');
    expect(wurzel.querySelectorAll('input')).toHaveLength(1);
    tippe(feld(wurzel, 'Ø'), '10');
    expect(editor.bauwerk.stange('first')?.durchmesser).toBeCloseTo(0.1, 9);
    tippe(feld(wurzel, 'Ø'), '0');
    expect(editor.zustand().meldung).toBe('Durchmesser muss größer als 0 sein');
    expect(feld(wurzel, 'Ø').value).toBe('10');
  });

  it('zeigt bei mehreren Objekten die Anzahl mit Löschen, das alle löscht', () => {
    const { wurzel, editor } = aufbau();
    editor.waehleMehrere(['abock', 'dreibein']);
    expect(wurzel.querySelector('h2')?.textContent).toBe('2 Objekte ausgewählt');
    expect(wurzel.querySelectorAll('input')).toHaveLength(0);
    wurzel.querySelector('button')?.click();
    expect(editor.bauwerk.gruppen).toHaveLength(0);
    expect(wurzel.querySelector('h2')).toBeNull();
  });

  it('Duplizieren kopiert die Auswahl, bei einem Objekt wie bei mehreren', () => {
    const { wurzel, editor } = aufbau();
    const duplizieren = (): HTMLButtonElement | undefined => [...wurzel.querySelectorAll('button')].find((k) => k.textContent?.startsWith('Duplizieren'));
    editor.waehle('abock');
    duplizieren()?.click();
    expect(editor.bauwerk.gruppen).toHaveLength(3);
    expect(editor.zustand().auswahl).not.toBe('abock');
    editor.waehleMehrere(['abock', 'dreibein']);
    duplizieren()?.click();
    expect(editor.bauwerk.gruppen).toHaveLength(5);
  });
});

describe('ParameterPanel: Text-, Farb- und Auswahlfelder (Spec E3, D1)', () => {
  const feuer = (): Platzobjekt => new Platzobjekt('po', new Vec3(1, 0, 1), { vorlage: 'feuerstelle', name: 'Feuerstelle', form: 'kreis', breite: 1.5, laenge: 1.5, hoehe: 0.3, farbe: '#e8590c' });
  const eingabe = (wurzel: HTMLElement, label: string, typ: string): HTMLInputElement => {
    const l = [...wurzel.querySelectorAll('label')].find((x) => x.textContent?.startsWith(label));
    const i = l?.querySelector<HTMLInputElement>(`input[type=${typ}]`);
    if (!i) throw new Error(`${typ}-Feld ${label} fehlt`);
    return i;
  };
  const wahl = (wurzel: HTMLElement, label: string): HTMLSelectElement => {
    const l = [...wurzel.querySelectorAll('label')].find((x) => x.textContent?.startsWith(label));
    const s = l?.querySelector('select');
    if (!s) throw new Error(`Auswahl ${label} fehlt`);
    return s;
  };

  it('zeigt Vorlage, Name, Form, Durchmesser, Höhe und Farbe; Länge erst beim Rechteck', () => {
    const { wurzel } = panelMit(Bauwerk.leer().mit(feuer()), 'po');
    const beschriftungen = (): string[] => [...wurzel.querySelectorAll('label')].map((l) => l.firstChild?.textContent ?? '');
    expect(beschriftungen()).toEqual(['Vorlage', 'Name', 'Form', 'Durchmesser (m)', 'Höhe (m)', 'Farbe']);
    expect(eingabe(wurzel, 'Name', 'text').value).toBe('Feuerstelle');
    expect(eingabe(wurzel, 'Farbe', 'color').value).toBe('#e8590c');
    expect(wahl(wurzel, 'Vorlage').value).toBe('feuerstelle');
    const formWahl = wahl(wurzel, 'Form');
    formWahl.value = 'rechteck';
    formWahl.dispatchEvent(new Event('change'));
    expect(beschriftungen()).toEqual(['Vorlage', 'Name', 'Form', 'Breite (m)', 'Länge (m)', 'Höhe (m)', 'Farbe']);
  });

  it('Name und Farbe ändern das Objekt; ein ungültiger Name zeigt die Meldung und springt zurück', () => {
    const { wurzel, editor } = panelMit(Bauwerk.leer().mit(feuer()), 'po');
    const name = eingabe(wurzel, 'Name', 'text');
    name.value = 'Lagerfeuer';
    name.dispatchEvent(new Event('change'));
    expect((editor.bauwerk.objekt('po') as Platzobjekt).params.name).toBe('Lagerfeuer');
    const neu = eingabe(wurzel, 'Name', 'text');
    neu.value = '';
    neu.dispatchEvent(new Event('change'));
    expect(editor.zustand().meldung).toBe('Name muss 1 bis 40 Zeichen lang sein');
    expect(eingabe(wurzel, 'Name', 'text').value).toBe('Lagerfeuer');
    const farbe = eingabe(wurzel, 'Farbe', 'color');
    farbe.value = '#00ff00';
    farbe.dispatchEvent(new Event('change'));
    expect((editor.bauwerk.objekt('po') as Platzobjekt).params.farbe).toBe('#00ff00');
  });

  it('ein Wechsel der Vorlage setzt alle Felder und ist ein Undo-Schritt', () => {
    const { wurzel, editor } = panelMit(Bauwerk.leer().mit(feuer()), 'po');
    const auswahl = wahl(wurzel, 'Vorlage');
    auswahl.value = 'holzlager';
    auswahl.dispatchEvent(new Event('change'));
    const p = (editor.bauwerk.objekt('po') as Platzobjekt).params;
    expect([p.vorlage, p.name, p.form, p.breite, p.laenge, p.hoehe]).toEqual(['holzlager', 'Holzlager', 'rechteck', 3, 2, 1]);
    expect(eingabe(wurzel, 'Name', 'text').value).toBe('Holzlager');
    editor.rueckgaengig();
    expect((editor.bauwerk.objekt('po') as Platzobjekt).params.vorlage).toBe('feuerstelle');
    expect(editor.zustand().kannRueckgaengig).toBe(false);
  });
});
