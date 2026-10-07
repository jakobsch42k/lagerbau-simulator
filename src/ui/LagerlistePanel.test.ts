// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { standardArten } from '../arten/standardArten';
import { findeVorlage, paramsAusVorlage } from '../arten/platz/vorlagen';
import { findeZeltVorlage, paramsAusZeltVorlage } from '../arten/zelt/vorlagen';
import { kochstelle } from '../beispiele/kochstelle';
import { Editor } from '../editor/Editor';
import { ABock } from '../model/ABock';
import { Bau } from '../model/Bau';
import type { Bauwerk } from '../model/Bauwerk';
import { Lagerliste } from '../model/Lagerliste';
import { Platzobjekt } from '../model/Platzobjekt';
import { STANDARD_ABOCK } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { Zelt } from '../model/Zelt';
import { BauHinweise } from '../rules/BauHinweise';
import { RuleEngine } from '../rules/RuleEngine';
import { LagerlistePanel } from './LagerlistePanel';

const arten = standardArten();
const vorlage = <T>(x: T | undefined): T => x as T;

function lager(): Bauwerk {
  return kochstelle()
    .mit(new ABock('abock2', new Vec3(20, 0, 0), 0, STANDARD_ABOCK))
    .mit(new Zelt('z1', new Vec3(0, 0, 30), paramsAusZeltVorlage(vorlage(findeZeltVorlage('jurte6')))))
    .mit(new Zelt('z2', new Vec3(10, 0, 30), paramsAusZeltVorlage(vorlage(findeZeltVorlage('jurte6')))))
    .mit(new Platzobjekt('f1', new Vec3(0, 0, -20), paramsAusVorlage(vorlage(findeVorlage('feuerstelle')))));
}

function aufbau(nurLesen = false) {
  const container = document.createElement('section');
  container.hidden = true;
  const knopf = document.createElement('button');
  const editor = new Editor(lager(), { arten });
  const zeigeBau = vi.fn();
  const panel = new LagerlistePanel(container, knopf, editor, zeigeBau, () => nurLesen);
  const meldungen: (string | null)[] = [];
  editor.abonniere((z) => {
    meldungen.push(z.meldung ?? null);
    const b = z.bauwerk;
    panel.zeige(Lagerliste.aus(b, arten, 0.5), b, BauHinweise.zuordnen(b, RuleEngine.fuer(b.regelEinstellungen).pruefe(b)));
  });
  editor.setzeBauwerk(lager());
  return { container, knopf, editor, zeigeBau, meldungen };
}

const namensfeld = (c: HTMLElement, i = 0): HTMLInputElement => c.querySelectorAll<HTMLInputElement>('input[aria-label="Bau-Name"]')[i] as HTMLInputElement;
const aendere = (feld: HTMLInputElement, wert: string): void => {
  feld.value = wert;
  feld.dispatchEvent(new Event('change'));
};

afterEach(() => vi.restoreAllMocks());

describe('LagerlistePanel', () => {
  it('ist zu, bis der Knopf es öffnet, und schließt wieder', () => {
    const { container, knopf } = aufbau();
    expect(container.hidden).toBe(true);
    knopf.click();
    expect(container.hidden).toBe(false);
    container.querySelector<HTMLButtonElement>('button.schliessen')?.click();
    expect(container.hidden).toBe(true);
  });

  it('zeigt Gesamtsumme, beide Bauten, Zelt- und Platzblock', () => {
    const { container, knopf } = aufbau();
    knopf.click();
    const text = container.textContent ?? '';
    for (const erwartet of ['Lagerplan – Materialliste', 'Gesamtsumme', 'Hinweise', 'Jurte 6er (2 ×)', 'Feuerstelle (1 ×)']) expect(text).toContain(erwartet);
    expect([namensfeld(container, 0).value, namensfeld(container, 1).value]).toEqual(['Bau 1', 'Bau 2']);
  });

  it('Umbenennen läuft über aendereMit als ein Undo-Schritt', () => {
    const { container, knopf, editor } = aufbau();
    knopf.click();
    const spy = vi.spyOn(editor, 'aendereMit');
    aendere(namensfeld(container), 'Küche');
    expect(spy).toHaveBeenCalledOnce();
    expect(editor.bauwerk.bauName(Bau.alle(editor.bauwerk)[0] as Bau)).toBe('Küche');
    expect(namensfeld(container).value).toBe('Küche');
    editor.rueckgaengig();
    expect(namensfeld(container).value).toBe('Bau 1');
  });

  it('ein zu langer Name springt zurück und meldet den Grund', () => {
    const { container, knopf, editor, meldungen } = aufbau();
    knopf.click();
    aendere(namensfeld(container), 'x'.repeat(41));
    expect(namensfeld(container).value).toBe('Bau 1');
    expect(meldungen.at(-1)).toBe('Name muss 1 bis 40 Zeichen lang sein.');
    expect(editor.bauwerk.bauNamen.size).toBe(0);
  });

  it('Zeigen wählt alle Objekte des Baus und springt darauf', () => {
    const { container, knopf, editor, zeigeBau } = aufbau();
    knopf.click();
    container.querySelector<HTMLButtonElement>('button.zeigen')?.click();
    const erster = Bau.alle(editor.bauwerk)[0] as Bau;
    expect([...editor.auswahl()].sort()).toEqual([...erster.objektIds].sort());
    expect(zeigeBau).toHaveBeenCalledOnce();
    expect(container.hidden).toBe(true);
  });

  it('Drucken ruft window.print', () => {
    const { container, knopf } = aufbau();
    const print = vi.fn();
    vi.stubGlobal('print', print);
    knopf.click();
    container.querySelector<HTMLButtonElement>('button.drucken')?.click();
    expect(print).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('Ansichtsmodus: lesbar, ohne Eingabefelder und Zeigen, Drucken bleibt', () => {
    const { container, knopf } = aufbau(true);
    knopf.click();
    expect(container.textContent).toContain('Bau 1');
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('button.zeigen')).toBeNull();
    expect(container.querySelector('button.drucken')).not.toBeNull();
  });

  it('nennt die Hinweise je Bau', () => {
    const { container, knopf } = aufbau();
    knopf.click();
    expect(container.querySelector('.lager-hinweise')).not.toBeNull();
  });
});
