import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_DREIBEIN } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { Editor, type EditorZustand } from './Editor';
import type { Treffer } from './SnapService';
import { kochstelle } from '../beispiele/kochstelle';

const zaehler = (): ((p: string) => string) => {
  let n = 0;
  return (p) => `${p}-${++n}`;
};
const boden = (x: number, z: number): Treffer => ({ art: 'boden', punkt: new Vec3(x, 0, z) });
const neuerEditor = (anfang = Bauwerk.leer()): Editor => new Editor(anfang, { neueId: zaehler() });
const dreibein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);

describe('Editor', () => {
  it('setzt ein Dreibein per Bodenklick aufs Raster und wählt es aus', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('dreibein');
    e.klick(boden(1.03, 2.04));
    const z = e.zustand();
    expect(z.bauwerk.gruppen).toHaveLength(1);
    expect(z.auswahl).toBe('dreibein-1');
    expect(z.bauwerk.gruppe('dreibein-1')?.position.equals(new Vec3(1, 0, 2), 1e-9)).toBe(true);
  });

  it('setzt einen A-Bock und ignoriert Stangenklicks beim Platzieren', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('abock');
    e.klick({ art: 'stange', punkt: Vec3.NULL, stangeId: 'x' });
    expect(e.bauwerk.istLeer).toBe(true);
    e.klick(boden(0, 0));
    expect(e.bauwerk.gruppe('abock-1')?.typ).toBe('abock');
  });

  it('macht Änderungen rückgängig und wiederholt sie; die Auswahl verschwindet mit der Gruppe', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('dreibein');
    e.klick(boden(0, 0));
    expect(e.taste('z', true)).toBe(true);
    expect(e.bauwerk.istLeer).toBe(true);
    expect(e.zustand().auswahl).toBeNull();
    expect(e.zustand().kannWiederholen).toBe(true);
    expect(e.taste('Y', true)).toBe(true);
    expect(e.bauwerk.gruppen).toHaveLength(1);
  });

  it('zieht eine Stange vom Boden zur Dreibein-Spitze und bindet sie dort an', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    const spitze = dreibein.spitze();
    e.waehleWerkzeug('stange');
    e.klick(boden(3, 0));
    expect(e.zustand().stangenStart?.equals(new Vec3(3, 0, 0), 1e-9)).toBe(true);
    e.klick({ art: 'stange', punkt: spitze.add(new Vec3(0.05, 0, 0)), stangeId: 'd-bein-0' });
    const s = e.bauwerk.stange('stange-1');
    expect(s?.start.equals(new Vec3(3, 0, 0), 1e-9)).toBe(true);
    expect(s?.naechsterPunkt(spitze).distanceTo(spitze)).toBeLessThan(1e-9);
    expect(s?.laenge).toBeCloseTo(new Vec3(3, 0, 0).distanceTo(spitze) + 0.2, 9);
    expect(e.bauwerk.buende().some((b) => b.enthaelt('stange-1'))).toBe(true);
    expect(e.zustand().auswahl).toBe('stange-1');
  });

  it('ignoriert eine Stange, deren zwei Klicks fast auf denselben Punkt fallen', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('stange');
    e.klick(boden(1, 1));
    e.klick(boden(1.02, 1.01));
    expect(e.bauwerk.istLeer).toBe(true);
    expect(e.zustand().stangenStart).toBeNull();
    expect(e.zustand().meldung).toBeNull();
  });

  it('meldet unsinnige Parameter und lässt das Bauwerk unverändert', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.aendereMit((b) => b.ersetzeGruppe(dreibein.mitParams({ ...STANDARD_DREIBEIN, fusskreisradius: 9 })));
    expect(e.zustand().meldung).toMatch(/Fußkreisradius/);
    expect((e.bauwerk.gruppe('d') as Dreibein).params.fusskreisradius).toBe(0.7);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('wählt per Klick die ganze Gruppe, dreht sie mit R und löscht sie mit Entf', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.klick({ art: 'stange', punkt: Vec3.NULL, stangeId: 'd-bein-1' });
    expect(e.zustand().auswahl).toBe('d');
    expect(e.taste('r', false)).toBe(true);
    expect(e.bauwerk.gruppe('d')?.drehung).toBeCloseTo(Math.PI / 12, 9);
    expect(e.taste('Delete', false)).toBe(true);
    expect(e.bauwerk.istLeer).toBe(true);
    expect(e.zustand().auswahl).toBeNull();
  });

  it('hebt die Auswahl bei Bodenklick auf und tut ohne Auswahl bei Entf und R nichts', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.klick({ art: 'stange', punkt: Vec3.NULL, stangeId: 'd-bein-0' });
    e.klick(boden(5, 5));
    expect(e.zustand().auswahl).toBeNull();
    e.taste('Delete', false);
    e.taste('r', false);
    expect(e.bauwerk.gruppen).toHaveLength(1);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('bricht mit Escape das Stange-Ziehen ab und lässt fremde Tasten durch', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('stange');
    e.klick(boden(1, 1));
    expect(e.taste('Escape', false)).toBe(true);
    expect(e.zustand().stangenStart).toBeNull();
    expect(e.taste('q', false)).toBe(false);
  });

  it('benachrichtigt Beobachter, markiert Teile und zeigt Meldungen', () => {
    const e = neuerEditor();
    const zustaende: EditorZustand[] = [];
    e.abonniere((z) => zustaende.push(z));
    e.markiere(['x']);
    e.zeigeMeldung('Hallo');
    expect(zustaende).toHaveLength(3);
    expect(zustaende[1]?.markiert.has('x')).toBe(true);
    expect(zustaende[2]?.meldung).toBe('Hallo');
  });

  it('ersetzt das Bauwerk rückgängig machbar', () => {
    const e = neuerEditor();
    e.setzeBauwerk(Bauwerk.leer().mitGruppe(dreibein));
    expect(e.bauwerk.gruppen).toHaveLength(1);
    e.rueckgaengig();
    expect(e.bauwerk.istLeer).toBe(true);
    e.wiederholen();
    expect(e.bauwerk.gruppen).toHaveLength(1);
  });

  it('meldet über den Rückgabewert, ob aendereMit die Änderung übernommen hat', () => {
    const e = neuerEditor(kochstelle());
    const d = e.bauwerk.gruppe('dreibein') as Dreibein;
    expect(e.aendereMit((b) => b.ersetzeGruppe(d.mitParams({ ...d.params, stangenlaenge: 3 })))).toBe(true);
    expect(e.aendereMit((b) => b.ersetzeGruppe(d.mitParams({ ...d.params, stangenlaenge: 0.5 })))).toBe(false);
    expect(e.zustand().meldung).toBe('Fußkreisradius muss kleiner als Stangenlänge minus Überstand sein');
  });
});
