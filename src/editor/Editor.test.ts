import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import { Plane } from '../model/Plane';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
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
    e.klick({ art: 'objekt', objektArt: 'stange', id: 'x', punkt: Vec3.NULL });
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
    e.klick({ art: 'objekt', objektArt: 'dreibein', id: 'd-bein-0', punkt: spitze.add(new Vec3(0.05, 0, 0)) });
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
    e.klick({ art: 'objekt', objektArt: 'dreibein', id: 'd-bein-1', punkt: Vec3.NULL });
    expect(e.zustand().auswahl).toBe('d');
    expect(e.taste('r', false)).toBe(true);
    expect(e.bauwerk.gruppe('d')?.drehung).toBeCloseTo(Math.PI / 12, 9);
    expect(e.taste('Delete', false)).toBe(true);
    expect(e.bauwerk.istLeer).toBe(true);
    expect(e.zustand().auswahl).toBeNull();
  });

  it('hebt die Auswahl bei Bodenklick auf und tut ohne Auswahl bei Entf und R nichts', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.klick({ art: 'objekt', objektArt: 'dreibein', id: 'd-bein-0', punkt: Vec3.NULL });
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

  it('setzt einen Baum per Bodenklick aufs Raster und wählt ihn aus', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('baum');
    e.klick(boden(3.04, 1.02));
    expect(e.zustand().auswahl).toBe('baum-1');
    expect(e.bauwerk.baum('baum-1')?.position.equals(new Vec3(3, 0, 1), 1e-9)).toBe(true);
  });

  it('spannt ein Seil von der Spitze zum Boden; das Bodenende wird ein Haring', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.waehleWerkzeug('seil');
    e.klick({ art: 'objekt', objektArt: 'dreibein', id: dreibein.stangen()[0]!.id, punkt: dreibein.spitze() });
    expect(e.zustand().stangenStart).not.toBeNull();
    e.klick(boden(3, 0));
    const seil = e.bauwerk.seil('seil-1');
    expect(seil?.start.equals(dreibein.spitze(), 1e-9)).toBe(true);
    expect(seil?.ende.equals(new Vec3(3, 0, 0), 1e-9)).toBe(true);
    expect(e.bauwerk.haringe()).toHaveLength(1);
    expect(e.zustand().auswahl).toBe('seil-1');
  });

  it('ignoriert ein Seil mit zweimal demselben Punkt', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('seil');
    e.klick(boden(1, 1));
    e.klick(boden(1, 1));
    expect(e.bauwerk.istLeer).toBe(true);
  });

  it('bricht ein angefangenes Seil mit Esc oder Werkzeugwechsel ab', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('seil');
    e.klick(boden(1, 1));
    e.taste('Escape', false);
    expect(e.zustand().stangenStart).toBeNull();
    e.klick(boden(1, 1));
    e.waehleWerkzeug('auswahl');
    expect(e.zustand().stangenStart).toBeNull();
    expect(e.bauwerk.istLeer).toBe(true);
  });

  it('wählt Seile und Bäume per Klick aus und löscht sie', () => {
    const seil = new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
    const baum = new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM);
    const e = neuerEditor(Bauwerk.leer().mitSeil(seil).mitBaum(baum));
    e.klick({ art: 'objekt', objektArt: 'seil', id: 's', punkt: new Vec3(1, 1, 0) });
    expect(e.zustand().auswahl).toBe('s');
    e.loescheAuswahl();
    e.klick({ art: 'objekt', objektArt: 'baum', id: 'b', punkt: new Vec3(4.85, 1, 0) });
    expect(e.zustand().auswahl).toBe('b');
    e.loescheAuswahl();
    expect(e.bauwerk.istLeer).toBe(true);
  });

  it('legt pro Werkzeug fest, welche Teile Klicks fangen (Spec v2b, D2)', () => {
    const e = neuerEditor();
    expect(e.klickZiele).toEqual(['seil', 'plane']);
    e.waehleWerkzeug('seil');
    expect(e.klickZiele).toEqual(['plane']);
    for (const name of ['dreibein', 'abock', 'stange', 'baum', 'plane'] as const) {
      e.waehleWerkzeug(name);
      expect(e.klickZiele, name).toEqual([]);
    }
  });

  it('spannt eine Bodenplane, wenn beide Punkte am Boden liegen', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('plane');
    e.klick(boden(0, 0));
    expect(e.zustand().stangenStart).not.toBeNull();
    e.klick(boden(4, 0));
    expect(e.bauwerk.plane('plane-1')?.params).toEqual({ ...STANDARD_PLANE, neigungGrad: 0 });
    expect(e.zustand().auswahl).toBe('plane-1');
  });

  it('neigt eine hängende Plane mit 30° und flacher, wenn sie sonst in den Boden reicht', () => {
    const spanne = (hoehe: number): number | undefined => {
      const pfosten = (id: string, x: number) => new Stange(id, new Vec3(x, 0, 0), new Vec3(x, hoehe, 0), 0.08);
      const e = neuerEditor(Bauwerk.leer().mitStange(pfosten('p1', 0)).mitStange(pfosten('p2', 4)));
      e.waehleWerkzeug('plane');
      e.klick({ art: 'objekt', objektArt: 'stange', id: 'p1', punkt: new Vec3(0, hoehe, 0) });
      e.klick({ art: 'objekt', objektArt: 'stange', id: 'p2', punkt: new Vec3(4, hoehe, 0) });
      return e.bauwerk.plane('plane-1')?.params.neigungGrad;
    };
    expect(spanne(2)).toBe(30); // Unterkante bei 2 − 3 · sin 30° = 0,5 m
    expect(spanne(1)).toBe(20); // 1 − 3 · sin 20° ≈ −0,03 m liegt noch in FUSS_TOLERANZ, 21° nicht mehr
  });

  it('meldet eine Plane, die selbst flach in den Boden reicht, und legt keine an', () => {
    const e = neuerEditor(Bauwerk.leer().mitStange(new Stange('p', new Vec3(2, 0, 0), new Vec3(2, 1, 0), 0.08)));
    e.waehleWerkzeug('plane');
    e.klick(boden(0, 0));
    e.klick({ art: 'objekt', objektArt: 'stange', id: 'p', punkt: new Vec3(2, 1, 0) });
    expect(e.bauwerk.planen).toHaveLength(0);
    expect(e.zustand().meldung).toBe('Plane reicht in den Boden: Aufhängelinie höher oder waagrechter spannen.');
    expect(e.zustand().stangenStart).toBeNull();
  });

  it('meldet eine fast senkrechte Aufhängelinie und ignoriert zweimal denselben Punkt ohne Meldung', () => {
    const e = neuerEditor(Bauwerk.leer().mitStange(new Stange('p', Vec3.NULL, new Vec3(0, 3, 0), 0.08)));
    e.waehleWerkzeug('plane');
    e.klick({ art: 'objekt', objektArt: 'stange', id: 'p', punkt: new Vec3(0, 3, 0) });
    e.klick(boden(0.1, 0));
    expect(e.zustand().meldung).toBe('Aufhängelinie zu steil.');
    e.zeigeMeldung(null);
    e.klick(boden(2, 2));
    e.klick(boden(2, 2));
    expect(e.bauwerk.planen).toHaveLength(0);
    expect(e.zustand().meldung).toBeNull();
  });

  it('hängt ein Seil per Klick auf die Plane an deren nächste Öse', () => {
    const plane = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { ...STANDARD_PLANE, neigungGrad: 0 });
    const e = neuerEditor(Bauwerk.leer().mitPlane(plane));
    e.waehleWerkzeug('seil');
    e.klick({ art: 'objekt', objektArt: 'plane', id: 'pl', punkt: new Vec3(3.6, 2, -0.3) });
    e.klick(boden(6, 0));
    expect(e.bauwerk.seil('seil-1')?.start.equals(new Vec3(4, 2, 0), 1e-9)).toBe(true);
    expect(e.bauwerk.verankerung(new Vec3(4, 2, 0))).toEqual({ art: 'plane', planeId: 'pl' });
  });

  it('wählt eine Plane per Klick aus und löscht sie', () => {
    const plane = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);
    const e = neuerEditor(Bauwerk.leer().mitPlane(plane));
    e.klick({ art: 'objekt', objektArt: 'plane', id: 'pl', punkt: new Vec3(2, 1.5, -1) });
    expect(e.zustand().auswahl).toBe('pl');
    e.taste('Delete', false);
    expect(e.bauwerk.istLeer).toBe(true);
  });

  it('wählt per Klick auf den Riegel den ganzen A-Bock (Spec v3, D4)', () => {
    const abock = new ABock('a', new Vec3(6, 0, 0), 0, STANDARD_ABOCK);
    const e = neuerEditor(Bauwerk.leer().mitGruppe(abock));
    e.klick({ art: 'objekt', objektArt: 'abock', id: 'a-riegel', punkt: new Vec3(6.3, 0.4, 0) });
    expect(e.zustand().auswahl).toBe('a');
  });
});
