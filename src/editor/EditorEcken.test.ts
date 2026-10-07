import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../model/Bauwerk';
import { hatEcken } from '../model/LagerObjekt';
import { Linie } from '../model/Linie';
import { STANDARD_LINIE, STANDARD_ZONE } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Zone } from '../model/Zone';
import { Editor } from './Editor';
import type { Treffer } from './SnapService';

const v = (x: number, z: number): Vec3 => new Vec3(x, 0, z);
const quadrat = (): Zone => new Zone('z', [v(0, 0), v(10, 0), v(10, 10), v(0, 10)], STANDARD_ZONE);
const weg = (): Linie => new Linie('l', [v(0, 0), v(10, 0), v(10, 10)], STANDARD_LINIE);
const editorMit = (o: Zone | Linie): Editor => {
  const e = new Editor(Bauwerk.leer().mit(o));
  e.waehle(o.id);
  return e;
};
const flaecheVon = (e: Editor): number => (e.bauwerk.objekt('z') as Zone).flaeche();
const punkteVon = (e: Editor, id: string): number[][] => (e.bauwerk.objekt(id) as Zone | Linie).punkte.map((p) => p.toArray());
const bodenTreffer: Treffer = { art: 'boden', punkt: v(0, 0) };
/** Wählt einen Griff, ohne zu ziehen (Klick auf den Griff). */
const waehleGriff = (e: Editor, index: number, am: Vec3): void => {
  e.beginneEckenZiehen(index, am);
  e.brichZiehenAb();
};

describe('Fähigkeit „Ecken bearbeiten“ im Modell', () => {
  it('Zone (geschlossen) und Linie (offen) haben Ecken, eine Stange nicht', () => {
    expect(hatEcken(quadrat())).toBe(true);
    expect(hatEcken(weg())).toBe(true);
    expect(hatEcken(new Stange('s', v(0, 0), new Vec3(3, 0, 0), 0.1))).toBe(false);
    expect([quadrat().eckenGeschlossen, weg().eckenGeschlossen]).toEqual([true, false]);
    expect(quadrat().mitEcken([v(0, 0), v(2, 0), v(0, 2)]).ecken()).toHaveLength(3);
  });
});

describe('Griffe anzeigen', () => {
  it('Ist eine Zone oder Linie allein ausgewählt, zeigt der Zustand ihre Ecken; sonst nichts', () => {
    const e = editorMit(quadrat());
    expect(e.zustand().ecken?.punkte.map((p) => p.toArray())).toEqual([
      [0, 0, 0],
      [10, 0, 0],
      [10, 0, 10],
      [0, 0, 10],
    ]);
    expect(e.zustand().ecken?.geschlossen).toBe(true);
    expect(e.zustand().ecken?.gewaehlt).toBeNull();
    e.waehle(null);
    expect(e.zustand().ecken).toBeNull();
    expect(editorMit(weg()).zustand().ecken?.geschlossen).toBe(false);
  });

  it('Mit einem anderen Werkzeug als der Auswahl gibt es keine Griffe', () => {
    const e = editorMit(quadrat());
    e.waehleWerkzeug('stange');
    expect(e.zustand().ecken).toBeNull();
  });
});

describe('Ecke ziehen (E1-Ziehen, 0,1-m-Raster)', () => {
  it('zeigt beim Ziehen eine Vorschau und macht beim Loslassen genau einen Undo-Schritt', () => {
    const e = editorMit(quadrat());
    expect(e.beginneEckenZiehen(2, v(10, 10))).toBe(true);
    e.ziehe(v(14.04, 10.02));
    expect(e.zustand().vorschau?.objekt('z')).toBeDefined();
    expect(flaecheVon(e)).toBe(100); // das echte Bauwerk bleibt, bis man loslässt
    expect(e.zustand().ecken?.punkte[2]?.x).toBeCloseTo(14, 9); // Griffe folgen der Vorschau
    e.beendeZiehen();
    expect(punkteVon(e, 'z')[2]?.[0]).toBeCloseTo(14, 9);
    expect(punkteVon(e, 'z')[2]?.[2]).toBeCloseTo(10, 9);
    e.rueckgaengig();
    expect(flaecheVon(e)).toBe(100);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('rastet die Ecke auf 0,1 m', () => {
    const e = editorMit(quadrat());
    e.beginneEckenZiehen(1, v(10, 0));
    e.ziehe(v(10.26, 3.33));
    e.beendeZiehen();
    const [x, , z] = punkteVon(e, 'z')[1] ?? [];
    expect(x).toBeCloseTo(10.3, 9);
    expect(z).toBeCloseTo(3.3, 9);
  });

  it('wieder zurück auf den Start: kein leerer Undo-Schritt', () => {
    const e = editorMit(quadrat());
    e.beginneEckenZiehen(1, v(10, 0));
    e.ziehe(v(12, 1));
    e.ziehe(v(10.02, 0.01));
    expect(e.zustand().vorschau).toBeNull();
    e.beendeZiehen();
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('eine Lage mit Selbstschnitt zeigt die Meldung des Modells und ändert nichts', () => {
    const e = editorMit(quadrat());
    e.beginneEckenZiehen(2, v(10, 10));
    e.ziehe(v(-5, 5));
    expect(e.zustand().meldung).toBe('Die Zone darf sich nicht selbst schneiden.');
    e.beendeZiehen();
    expect(flaecheVon(e)).toBe(100);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('Esc beim Ziehen verwirft; ein Klick ohne Bewegung wählt nur den Griff', () => {
    const e = editorMit(quadrat());
    e.beginneEckenZiehen(3, v(0, 10));
    e.ziehe(v(5, 15));
    e.brichZiehenAb();
    expect(flaecheVon(e)).toBe(100);
    expect(e.zustand().ecken?.gewaehlt).toBe(3);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('eine Linie lässt sich ziehen; Griffe auf einem Objekt ohne Ecken gibt es nicht', () => {
    const e = editorMit(weg());
    e.beginneEckenZiehen(2, v(10, 10));
    e.ziehe(v(20, 10));
    e.beendeZiehen();
    expect(punkteVon(e, 'l')[2]).toEqual([20, 0, 10]);
    const s = new Editor(Bauwerk.leer().mit(new Stange('s', v(0, 0), new Vec3(3, 0, 0), 0.1)));
    s.waehle('s');
    expect(s.beginneEckenZiehen(0, v(0, 0))).toBe(false);
  });
});

describe('Ecke einfügen (Doppelklick auf eine Kante)', () => {
  it('setzt die Ecke auf die Kante, wählt sie und ist ein Undo-Schritt', () => {
    const e = editorMit(quadrat());
    e.fuegeEckeEin(0, v(4.04, 0.3));
    expect(punkteVon(e, 'z')).toEqual([
      [0, 0, 0],
      [4, 0, 0],
      [10, 0, 0],
      [10, 0, 10],
      [0, 0, 10],
    ]);
    expect(e.zustand().ecken?.gewaehlt).toBe(1);
    e.rueckgaengig();
    expect(punkteVon(e, 'z')).toHaveLength(4);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('die Schlusskante einer Zone hängt die Ecke hinten an; bei einer Linie gibt es keine Schlusskante', () => {
    const e = editorMit(quadrat());
    e.fuegeEckeEin(3, v(0, 5));
    expect(punkteVon(e, 'z')[4]).toEqual([0, 0, 5]);
    const l = editorMit(weg());
    l.fuegeEckeEin(1, v(10, 5));
    expect(punkteVon(l, 'l')).toEqual([
      [0, 0, 0],
      [10, 0, 0],
      [10, 0, 5],
      [10, 0, 10],
    ]);
  });

  it('ist die Kante kürzer als das Raster, wird die genaue Lage genommen statt eine doppelte Ecke', () => {
    const e = editorMit(new Zone('z', [v(0, 0), v(0.04, 0), v(5, 5)], STANDARD_ZONE));
    e.fuegeEckeEin(0, v(0.02, 0));
    expect(punkteVon(e, 'z')).toHaveLength(4);
    expect(e.zustand().meldung).toBeNull();
  });
});

describe('Ecke entfernen (Entf bei gewähltem Griff)', () => {
  it('entfernt die gewählte Ecke in einem Undo-Schritt; das Objekt bleibt', () => {
    const e = editorMit(quadrat());
    waehleGriff(e, 3, v(0, 10));
    expect(e.taste('Delete', false)).toBe(true);
    expect(punkteVon(e, 'z')).toEqual([
      [0, 0, 0],
      [10, 0, 0],
      [10, 0, 10],
    ]);
    expect(e.zustand().ecken?.gewaehlt).toBeNull();
    e.rueckgaengig();
    expect(punkteVon(e, 'z')).toHaveLength(4);
  });

  it('unter 3 Ecken (Zone) bzw. 2 (Linie): Fehlertext, die Ecke bleibt', () => {
    const z = editorMit(new Zone('z', [v(0, 0), v(4, 0), v(0, 4)], STANDARD_ZONE));
    waehleGriff(z, 0, v(0, 0));
    z.taste('Delete', false);
    expect(z.zustand().meldung).toBe('Eine Zone braucht mindestens 3 Ecken.');
    expect(punkteVon(z, 'z')).toHaveLength(3);
    expect(z.zustand().ecken?.gewaehlt).toBe(0);
    const l = editorMit(new Linie('l', [v(0, 0), v(4, 0)], STANDARD_LINIE));
    waehleGriff(l, 1, v(4, 0));
    l.taste('Delete', false);
    expect(l.zustand().meldung).toBe('Eine Linie braucht mindestens 2 Punkte.');
    expect(punkteVon(l, 'l')).toHaveLength(2);
  });

  it('eine Entfernung, die die Zone selbst schneiden ließe, zeigt den Modellfehler', () => {
    // Zunge von unten bis (5, 8): Ohne die Ecke (0, 10) läuft die Schlusskante quer durch die Zunge.
    const z = new Zone('z', [v(0, 0), v(4, 0), v(5, 8), v(6, 0), v(10, 0), v(10, 10), v(0, 10)], STANDARD_ZONE);
    const e = editorMit(z);
    waehleGriff(e, 6, v(0, 10));
    e.taste('Delete', false);
    expect(e.zustand().meldung).toBe('Die Zone darf sich nicht selbst schneiden.');
    expect(punkteVon(e, 'z')).toHaveLength(7);
  });

  it('ohne gewählten Griff löscht Entf wie bisher das ganze Objekt; ein neu gewähltes Objekt hat keinen Griff mehr gewählt', () => {
    const e = editorMit(quadrat());
    waehleGriff(e, 1, v(10, 0));
    e.waehle(null);
    e.zustand();
    e.waehle('z');
    expect(e.zustand().ecken?.gewaehlt).toBeNull();
    e.taste('Delete', false);
    expect(e.bauwerk.objekt('z')).toBeUndefined();
  });
});

describe('Griffe und Klicks', () => {
  it('ein Klick auf dasselbe Objekt lässt den gewählten Griff stehen, ein Klick auf den Boden nicht', () => {
    const e = editorMit(quadrat());
    waehleGriff(e, 1, v(10, 0));
    e.klick({ art: 'objekt', objektArt: 'zone', id: 'z', punkt: v(5, 5) });
    expect(e.zustand().ecken?.gewaehlt).toBe(1);
    e.klick(bodenTreffer);
    expect(e.zustand().ecken).toBeNull();
  });
});
