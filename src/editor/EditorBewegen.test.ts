import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Baum } from '../model/Baum';
import { Dreibein } from '../model/Dreibein';
import { mitte } from '../model/Duplikat';
import { STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Plane } from '../model/Plane';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { Editor } from './Editor';
import type { Treffer } from './SnapService';

const objektTreffer = (id: string): Treffer => ({ art: 'objekt', objektArt: 'stange', id, punkt: Vec3.NULL });
const dreibein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const neuerEditor = (b: Bauwerk): Editor => {
  let n = 0;
  return new Editor(b, { neueId: (p) => `${p}-${++n}` });
};
const nah = (a: Vec3 | undefined, b: Vec3): boolean => a !== undefined && a.equals(b, 1e-9);
const abockSpitze = kochstelle().gruppe('abock')!.spitze();
const dreibeinSpitze = kochstelle().gruppe('dreibein')!.spitze();
/** Zählt die Undo-Schritte, indem es alles rückgängig macht. */
const schritte = (e: Editor): number => {
  let n = 0;
  while (e.zustand().kannRueckgaengig) {
    e.rueckgaengig();
    n++;
  }
  return n;
};

describe('Editor: Pfeiltasten', () => {
  it('verschieben die Auswahl um 0,1 m, mit Shift um 1 m; oben ist standardmäßig Norden (-z)', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.waehle('d');
    expect(e.taste('ArrowRight', false, false)).toBe(true);
    expect(nah(e.bauwerk.gruppe('d')?.position, new Vec3(0.1, 0, 0))).toBe(true);
    e.taste('ArrowUp', false, true);
    expect(nah(e.bauwerk.gruppe('d')?.position, new Vec3(0.1, 0, -1))).toBe(true);
    e.taste('ArrowDown', false, false);
    e.taste('ArrowLeft', false, true);
    expect(nah(e.bauwerk.gruppe('d')?.position, new Vec3(-0.9, 0, -0.9))).toBe(true);
  });

  it('jeder Tastendruck ist ein Undo-Schritt', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.waehle('d');
    e.taste('ArrowRight', false, false);
    e.taste('ArrowRight', false, false);
    e.taste('ArrowUp', false, true);
    expect(schritte(e)).toBe(3);
  });

  it('bewegen in 3D „oben“ in Blickrichtung, gerundet auf die nächste Weltachse', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.waehle('d');
    e.setzeBlickrichtung(new Vec3(1, -0.4, 0.3));
    e.taste('ArrowUp', false, false);
    expect(nah(e.bauwerk.gruppe('d')?.position, new Vec3(0.1, 0, 0))).toBe(true);
    e.taste('ArrowRight', false, false);
    expect(nah(e.bauwerk.gruppe('d')?.position, new Vec3(0.1, 0, 0.1))).toBe(true);
    e.setzeBlickrichtung(new Vec3(-0.2, 0, 1));
    e.taste('ArrowUp', false, false);
    e.taste('ArrowRight', false, false);
    expect(nah(e.bauwerk.gruppe('d')?.position, new Vec3(0, 0, 0.2))).toBe(true);
  });

  it('tun ohne Auswahl nichts und bleiben unbehandelt', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    expect(e.taste('ArrowUp', false, false)).toBe(false);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('nehmen Abspannung und Plane des Baus mit', () => {
    const b = kochstelle()
      .mitSeil(new Seil('s', abockSpitze, new Vec3(-1.5, 0, 1)))
      .mitPlane(new Plane('p', abockSpitze, dreibeinSpitze, STANDARD_PLANE));
    const e = neuerEditor(b);
    e.setzeAuswahl(['abock', 'dreibein', 'first']);
    e.taste('ArrowDown', false, true);
    expect(nah(e.bauwerk.seil('s')?.ende, new Vec3(-1.5, 0, 2))).toBe(true);
    expect(nah(e.bauwerk.plane('p')?.start, abockSpitze.add(new Vec3(0, 0, 1)))).toBe(true);
  });

  it('melden eine unmögliche Bewegung; die Auswahl bleibt und nichts ändert sich', () => {
    const steil = new Plane('p', abockSpitze, new Vec3(3, 5, 0), STANDARD_PLANE);
    const e = neuerEditor(kochstelle().mitPlane(steil));
    e.setzeAuswahl(['abock']);
    let vorher = e.bauwerk;
    for (let i = 0; i < 3 && e.zustand().meldung === null; i++) {
      vorher = e.bauwerk;
      e.taste('ArrowRight', false, true);
    }
    expect(e.zustand().meldung).toContain('Verschieben nicht möglich');
    expect(e.zustand().ausgewaehlt.has('abock')).toBe(true);
    expect(e.bauwerk).toBe(vorher);
  });
});

describe('Editor: Drehen', () => {
  it('R dreht ein Seil um seine Mitte, Shift+R zurück; ein Baum bleibt stehen', () => {
    const baum = new Baum('b', new Vec3(5, 0, 5), STANDARD_BAUM);
    const seil = new Seil('s', new Vec3(0, 0, 0), new Vec3(2, 0, 0));
    const e = neuerEditor(Bauwerk.leer().mitBaum(baum).mitSeil(seil));
    e.waehle('s');
    e.taste('r', false, false);
    const s = e.bauwerk.seil('s');
    expect(nah(s?.start.add(s.ende).scale(0.5), new Vec3(1, 0, 0))).toBe(true);
    expect(Math.abs((s?.ende.z ?? 0) - (s?.start.z ?? 0))).toBeCloseTo(2 * Math.sin(Math.PI / 12), 6);
    e.taste('R', false, true);
    expect(nah(e.bauwerk.seil('s')?.start, seil.start)).toBe(true);
    e.waehle('b');
    e.taste('r', false, false);
    expect(nah(e.bauwerk.baum('b')?.position, baum.position)).toBe(true);
  });

  it('dreht eine Auswahl um den Mittelpunkt ihrer Platzpunkte und nimmt Seile mit', () => {
    const b = kochstelle().mitSeil(new Seil('s', abockSpitze, new Vec3(-1.5, 0, 1)));
    const e = neuerEditor(b);
    e.setzeAuswahl(['abock', 'dreibein', 'first']);
    e.taste('r', false, false);
    const mitteVorher = mitte(b.objekte)!;
    const gedreht = e.bauwerk.gruppe('dreibein')!.position;
    expect(gedreht.distanceTo(mitteVorher)).toBeCloseTo(new Vec3(2.5, 0, 0).distanceTo(mitteVorher), 6);
    expect(nah(e.bauwerk.seil('s')?.ende, new Vec3(-1.5, 0, 1))).toBe(false);
    expect(schritte(e)).toBe(1);
  });
});

describe('Editor: Ziehen', () => {
  const kochstelleEditor = (): Editor => {
    const e = neuerEditor(kochstelle());
    e.waehleWerkzeug('auswahl');
    return e;
  };

  it('zeigt beim Ziehen nur eine Vorschau und macht beim Loslassen einen Undo-Schritt', () => {
    const e = kochstelleEditor();
    const vorher = e.bauwerk;
    e.setzeAuswahl(['abock', 'dreibein', 'first']);
    expect(e.beginneZiehen(objektTreffer('abock-bein-0'), new Vec3(1, 0, 1))).toBe(true);
    expect(e.zieht).toBe(true);
    e.ziehe(new Vec3(2.04, 0, 1.97));
    e.ziehe(new Vec3(3.04, 0, 3.02));
    expect(e.bauwerk).toBe(vorher);
    expect(e.zustand().kannRueckgaengig).toBe(false);
    expect(nah(e.zustand().vorschau?.gruppe('abock')?.position, new Vec3(2, 0, 2))).toBe(true);
    e.beendeZiehen();
    expect(e.zieht).toBe(false);
    expect(e.zustand().vorschau).toBeNull();
    expect(nah(e.bauwerk.gruppe('abock')?.position, new Vec3(2, 0, 2))).toBe(true);
    expect(nah(e.bauwerk.gruppe('dreibein')?.position, new Vec3(4.5, 0, 2))).toBe(true);
    expect(nah(e.bauwerk.stange('first')?.start, kochstelle().stange('first')!.start.add(new Vec3(2, 0, 2)))).toBe(true);
    expect(schritte(e)).toBe(1);
  });

  it('wählt ein nicht ausgewähltes Objekt vorher allein aus, bewegt sonst die ganze Auswahl', () => {
    const e = kochstelleEditor();
    e.setzeAuswahl(['dreibein']);
    e.beginneZiehen(objektTreffer('abock-bein-0'), Vec3.NULL);
    expect([...e.zustand().ausgewaehlt]).toEqual(['abock']);
    e.brichZiehenAb();
    e.setzeAuswahl(['abock', 'dreibein']);
    e.beginneZiehen(objektTreffer('abock-bein-0'), Vec3.NULL);
    e.ziehe(new Vec3(0, 0, 1));
    e.beendeZiehen();
    expect(nah(e.bauwerk.gruppe('abock')?.position, new Vec3(0, 0, 1))).toBe(true);
    expect(nah(e.bauwerk.gruppe('dreibein')?.position, new Vec3(2.5, 0, 1))).toBe(true);
  });

  it('Esc bricht das Ziehen ab; die Auswahl bleibt', () => {
    const e = kochstelleEditor();
    const vorher = e.bauwerk;
    e.beginneZiehen(objektTreffer('abock-bein-0'), Vec3.NULL);
    e.ziehe(new Vec3(3, 0, 0));
    expect(e.taste('Escape', false, false)).toBe(true);
    e.beendeZiehen();
    expect(e.zieht).toBe(false);
    expect(e.bauwerk).toBe(vorher);
    expect(e.zustand().vorschau).toBeNull();
    expect(e.zustand().kannRueckgaengig).toBe(false);
    expect([...e.zustand().ausgewaehlt]).toEqual(['abock']);
  });

  it('beginnt nicht auf dem Boden, mit Shift oder mit einem anderen Werkzeug', () => {
    const e = kochstelleEditor();
    expect(e.beginneZiehen({ art: 'boden', punkt: Vec3.NULL }, Vec3.NULL)).toBe(false);
    expect(e.beginneZiehen(objektTreffer('first'), Vec3.NULL, { shift: true })).toBe(false);
    e.waehleWerkzeug('seil');
    expect(e.beginneZiehen(objektTreffer('first'), Vec3.NULL)).toBe(false);
    expect(e.zieht).toBe(false);
  });

  it('ohne Versatz entsteht kein Undo-Schritt; eine unmögliche Lage zeigt die Meldung, nichts ändert sich', () => {
    const steil = new Plane('p', abockSpitze, new Vec3(3, 5, 0), STANDARD_PLANE);
    const e = neuerEditor(kochstelle().mitPlane(steil));
    e.beginneZiehen(objektTreffer('abock-bein-0'), Vec3.NULL);
    e.ziehe(new Vec3(0.02, 0, 0));
    e.beendeZiehen();
    expect(e.zustand().kannRueckgaengig).toBe(false);
    const vorher = e.bauwerk;
    e.beginneZiehen(objektTreffer('abock-bein-0'), Vec3.NULL);
    e.ziehe(new Vec3(2.9, 0, 0));
    expect(e.zustand().meldung).toContain('Verschieben nicht möglich');
    expect(e.zustand().vorschau).toBeNull();
    e.beendeZiehen();
    expect(e.bauwerk).toBe(vorher);
    expect([...e.zustand().ausgewaehlt]).toEqual(['abock']);
  });

  it('tut ohne Ziehvorgang nichts', () => {
    const e = kochstelleEditor();
    e.ziehe(new Vec3(1, 0, 1));
    e.beendeZiehen();
    e.brichZiehenAb();
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });
});

describe('Editor: Duplizieren, Kopieren, Einfügen', () => {
  it('Strg+D kopiert die Auswahl samt Abspannung um 1 m, wählt die Kopie und ist ein Undo-Schritt', () => {
    const b = kochstelle().mitSeil(new Seil('s', abockSpitze, new Vec3(-1.5, 0, 1)));
    const e = neuerEditor(b);
    e.setzeAuswahl(['abock', 'dreibein', 'first']);
    expect(e.taste('d', true, false)).toBe(true);
    expect(e.bauwerk.objekte).toHaveLength(8);
    expect([...e.zustand().ausgewaehlt]).toEqual(['abock-1', 'dreibein-2', 'stange-3', 'seil-4']);
    expect(nah(e.bauwerk.gruppe('abock-1')?.position, new Vec3(1, 0, 1))).toBe(true);
    expect(nah(e.bauwerk.seil('seil-4')?.ende, new Vec3(-0.5, 0, 2))).toBe(true);
    expect(nah(e.bauwerk.seil('s')?.ende, new Vec3(-1.5, 0, 1))).toBe(true);
    expect(schritte(e)).toBe(1);
  });

  it('50 Kopien hintereinander haben eindeutige ids', () => {
    const e = new Editor(Bauwerk.leer().mitGruppe(dreibein));
    e.waehle('d');
    for (let i = 0; i < 50; i++) e.dupliziere();
    const ids = e.bauwerk.objekte.flatMap((o) => o.ids());
    expect(e.bauwerk.objekte).toHaveLength(51);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Duplizieren ohne Auswahl tut nichts', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.dupliziere();
    expect(e.bauwerk.objekte).toHaveLength(1);
  });

  it('Strg+C und Strg+V setzen die Kopie mit ihrem Mittelpunkt auf den Bodenpunkt unter der Maus, gerastert', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(new Dreibein('d', new Vec3(2, 0, 3), 0, STANDARD_DREIBEIN)));
    e.waehle('d');
    expect(e.taste('c', true, false)).toBe(true);
    e.setzeMausPunkt(new Vec3(5.04, 0, -1.96));
    e.taste('v', true, false);
    expect(e.bauwerk.objekte).toHaveLength(2);
    expect(nah(e.bauwerk.gruppe('dreibein-1')?.position, new Vec3(5, 0, -2))).toBe(true);
    expect([...e.zustand().ausgewaehlt]).toEqual(['dreibein-1']);
    e.taste('v', true, false);
    expect(e.bauwerk.objekte).toHaveLength(3);
    expect(schritte(e)).toBe(2);
  });

  it('Einfügen ohne Maus über der Szene versetzt um +1 m; leere Zwischenablage tut nichts', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.taste('v', true, false);
    expect(e.bauwerk.objekte).toHaveLength(1);
    e.waehle('d');
    e.taste('c', true, false);
    e.setzeMausPunkt(new Vec3(9, 0, 9));
    e.setzeMausPunkt(null);
    e.taste('v', true, false);
    expect(nah(e.bauwerk.gruppe('dreibein-1')?.position, new Vec3(1, 0, 1))).toBe(true);
  });
});
