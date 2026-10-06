import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import { Dreibein } from '../model/Dreibein';
import { MIN_SEILLAENGE, MIN_STANGENLAENGE, STANDARD_DURCHMESSER } from '../model/konstanten';
import type { LagerObjekt } from '../model/LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Plane } from '../model/Plane';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import type { PanelFeld, PanelSpec, Platzieren, PlatzierenLinie, PlatzierenPunkt } from './ObjektArt';
import { standardArten } from './standardArten';

const arten = standardArten();
const d = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const a = new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK);
const s = new Stange('s', Vec3.NULL, new Vec3(0, 2, 0), 0.08);
const l = new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
const b = new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM);
const pl = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);

const panel = (o: LagerObjekt): PanelSpec => arten.artVon(o).panel(o);
const labels = (spec: PanelSpec): string[] => spec.felder.map((f) => f.label);
const istBei = (p: Vec3 | undefined, x: number, y: number, z: number): void => {
  expect(p?.equals(new Vec3(x, y, z), 1e-9), `${p?.toArray().join(', ')} ≠ ${x}, ${y}, ${z}`).toBe(true);
};
const punkt = (p: Platzieren): PlatzierenPunkt => {
  if (p.modus !== 'punkt') throw new Error('Modus punkt erwartet');
  return p;
};
const linie = (p: Platzieren): PlatzierenLinie => {
  if (p.modus !== 'linie') throw new Error('Modus linie erwartet');
  return p;
};

describe('Klickverhalten (Spec v2b, D2)', () => {
  it('lässt Seile und Planen nur wahlweise Klicks fangen (Platz-Objekte und Beschriftungen auch, Spec E3, D3: in der Auswahl immer klickbar); nur Planen haben Ösen', () => {
    expect(arten.alle.map((x) => [x.name, x.klick])).toEqual([
      ['dreibein', 'immer'],
      ['abock', 'immer'],
      ['stange', 'immer'],
      ['seil', 'wahlweise'],
      ['plane', 'wahlweise'],
      ['baum', 'immer'],
      ['platzobjekt', 'wahlweise'],
      ['beschriftung', 'wahlweise'],
      ['zone', 'wahlweise'],
      ['linie', 'wahlweise'],
    ]);
    expect(arten.wahlweise()).toEqual(['seil', 'plane', 'platzobjekt', 'beschriftung', 'zone', 'linie']);
    expect(arten.mitOesen()).toEqual(['plane']);
  });
});

describe('Panel je Art (Spec v3, D4)', () => {
  it('Dreibein: Felder, Werte und Info wie bisher; mit() prüft neu', () => {
    const spec = panel(d);
    expect(labels(spec)).toEqual(['Stangenlänge (m)', 'Fußkreisradius (m)', 'Ø (cm)']);
    expect(spec.felder.map((f) => (f as PanelFeld).faktor)).toEqual([1, 1, 100]);
    expect(spec.werte).toEqual({ stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 });
    expect(spec.info).toBe('Höhe 2.09 m · Beinwinkel 19° · R dreht');
    expect(spec.extras).toEqual([]);
    const neu = spec.mit({ ...spec.werte, stangenlaenge: 3 });
    expect(neu).toBeInstanceOf(Dreibein);
    expect((neu as Dreibein).params.stangenlaenge).toBe(3);
    expect(neu.id).toBe('d');
    expect(() => spec.mit({ ...spec.werte, stangenlaenge: 0.5 })).toThrow('Fußkreisradius muss kleiner als Stangenlänge minus Überstand sein');
  });

  it('A-Bock: vier Felder und die Info der Baugruppe', () => {
    const spec = panel(a);
    expect(labels(spec)).toEqual(['Stangenlänge (m)', 'Fußabstand (m)', 'Riegelhöhe (m)', 'Ø (cm)']);
    expect(spec.info).toBe('Höhe 2.05 m · Beinwinkel 21° · R dreht');
    expect((spec.mit({ ...spec.werte, riegelhoehe: 0.6 }) as ABock).params.riegelhoehe).toBe(0.6);
  });

  it('Stange: nur der Durchmesser; ein Wert, der keine Zahl ist, wird abgelehnt', () => {
    const spec = panel(s);
    expect(labels(spec)).toEqual(['Ø (cm)']);
    expect(spec.werte).toEqual({ durchmesser: 0.08 });
    expect(spec.info).toBe('Länge 2.00 m');
    expect((spec.mit({ durchmesser: 0.1 }) as Stange).durchmesser).toBe(0.1);
    expect(() => spec.mit({ durchmesser: 'x' })).toThrow('Durchmesser muss größer als 0 sein');
  });

  it('Baum: Stammdurchmesser in cm und Höhe in m', () => {
    const spec = panel(b);
    expect(labels(spec)).toEqual(['Stammdurchmesser (cm)', 'Höhe (m)']);
    expect(spec.felder.map((f) => (f as PanelFeld).faktor)).toEqual([100, 1]);
    expect(spec.info).toBe('Steht auf dem Platz, gehört nicht zum Bau.');
    expect((spec.mit({ ...spec.werte, hoehe: 12 }) as Baum).params.hoehe).toBe(12);
    expect(() => spec.mit({ ...spec.werte, hoehe: 0 })).toThrow('Baumhöhe muss größer als 0 sein');
  });

  it('Seil: keine Felder, nur Länge und Winkel; mit() ändert nichts', () => {
    const spec = panel(l);
    expect(spec.felder).toEqual([]);
    expect(spec.info).toBe('Länge 2.83 m · Winkel zum Boden 45°');
    expect(spec.mit({})).toBe(l);
  });

  it('Plane: drei Felder, Form-Auswahl und „Seite wechseln“ nur bei eben', () => {
    const spec = panel(pl);
    expect(labels(spec)).toEqual(['Breite (m)', 'Länge (m)', 'Neigung (°)']);
    expect((spec.felder[2] as PanelFeld).schritt).toBe('1');
    expect(spec.werte).toEqual({ breite: 3, laenge: 4, form: 'eben', neigungGrad: 30, seite: 1 });
    expect(spec.info).toBe('Aufhängelinie 4.00 m · zum Verschieben neu spannen');
    expect(spec.extras).toEqual([
      { art: 'auswahl', schluessel: 'form', label: 'Form', optionen: [['eben', 'eben'], ['satteldach', 'Satteldach']] },
      { art: 'knopf', text: 'Seite wechseln', aenderung: { seite: -1 } },
    ]);
    expect((spec.mit({ ...spec.werte, seite: -1 }) as Plane).params.seite).toBe(-1);
    expect(() => spec.mit({ ...spec.werte, form: 'schief' })).toThrow('Unbekannte Planenform');
    const sattel = panel(pl.mitParams({ ...STANDARD_PLANE, form: 'satteldach' }));
    expect(sattel.extras.map((e) => e.art)).toEqual(['auswahl']);
  });
});

describe('Platzieren je Art (Spec v3, D4)', () => {
  it('setzt Dreibein, A-Bock und Baum mit Startmaßen auf einen Punkt', () => {
    const neu = punkt(arten.art('dreibein').platzieren).erzeuge('d1', new Vec3(1, 0, 2)) as Dreibein;
    expect(neu).toBeInstanceOf(Dreibein);
    expect(neu.params).toEqual(STANDARD_DREIBEIN);
    expect(neu.drehung).toBe(0);
    istBei(neu.position, 1, 0, 2);
    expect((punkt(arten.art('abock').platzieren).erzeuge('a1', Vec3.NULL) as ABock).params).toEqual(STANDARD_ABOCK);
    expect((punkt(arten.art('baum').platzieren).erzeuge('b1', Vec3.NULL) as Baum).params).toEqual(STANDARD_BAUM);
  });

  it('zieht eine Stange zwischen zwei Punkten; am Boden ohne Überstand', () => {
    const p = linie(arten.art('stange').platzieren);
    expect([p.mindestabstand, p.fangtOesen]).toEqual([MIN_STANGENLAENGE, false]);
    const neu = p.erzeuge('s1', Vec3.NULL, new Vec3(0, 2, 0)) as Stange;
    istBei(neu.start, 0, 0, 0);
    istBei(neu.ende, 0, 2.2, 0);
    expect(neu.durchmesser).toBe(STANDARD_DURCHMESSER);
  });

  it('spannt ein Seil gerade von Punkt zu Punkt und fängt dabei Ösen', () => {
    const p = linie(arten.art('seil').platzieren);
    expect([p.mindestabstand, p.fangtOesen]).toEqual([MIN_SEILLAENGE, true]);
    const neu = p.erzeuge('l1', new Vec3(0, 2, 0), new Vec3(2, 0, 0)) as Seil;
    istBei(neu.start, 0, 2, 0);
    istBei(neu.ende, 2, 0, 0);
  });

  it('spannt eine Plane: am Boden 0°, hängend 30° oder flacher, sonst die Meldung fürs Anlegen', () => {
    const p = linie(arten.art('plane').platzieren);
    expect([p.mindestabstand, p.fangtOesen]).toEqual([MIN_SEILLAENGE, false]);
    expect((p.erzeuge('p1', Vec3.NULL, new Vec3(4, 0, 0)) as Plane).params.neigungGrad).toBe(0);
    expect((p.erzeuge('p2', new Vec3(0, 2, 0), new Vec3(4, 2, 0)) as Plane).params.neigungGrad).toBe(30);
    expect((p.erzeuge('p3', new Vec3(0, 1, 0), new Vec3(4, 1, 0)) as Plane).params.neigungGrad).toBe(20);
    expect(() => p.erzeuge('p4', Vec3.NULL, new Vec3(2, 1, 0))).toThrow('Plane reicht in den Boden: Aufhängelinie höher oder waagrechter spannen.');
    expect(() => p.erzeuge('p5', new Vec3(0, 3, 0), new Vec3(0.1, 0, 0))).toThrow('Aufhängelinie zu steil.');
  });
});

describe('Fangpunkte und Treffer je Art (Spec v3, D4)', () => {
  it('liefert je Art die erwarteten Fangpunkte', () => {
    expect([d, a, s, l, b, pl].map((o) => arten.artVon(o).fangpunkte(o, true).length)).toEqual([7, 7, 2, 0, 0, 8]);
    expect(arten.artVon(pl).fangpunkte(pl, false)).toEqual([]);
  });

  it('Baugruppen: zuerst die Spitze, dann die Stangenenden; ein Treffer projiziert auf die getroffene Stange', () => {
    const fang = arten.artVon(d).fangpunkte(d, false);
    expect(fang.map((f) => f.art)).toEqual(['spitze', 'ende', 'ende', 'ende', 'ende', 'ende', 'ende']);
    istBei(fang[0]?.punkt, ...d.spitze().toArray());
    const bein = d.stangen()[0]!;
    const mitte = bein.start.add(bein.ende).scale(0.5);
    const amBein = arten.artVon(d).beiTreffer(d, 'd-bein-0', mitte.add(new Vec3(0, 0, 0.04)), false);
    expect(amBein?.art).toBe('stange');
    expect(amBein && bein.naechsterPunkt(amBein.punkt).distanceTo(amBein.punkt)).toBeLessThan(1e-9);
    const riegel = arten.artVon(a).beiTreffer(a, 'a-riegel', new Vec3(0.3, 0.45, 0.04), false);
    expect(riegel?.art).toBe('stange');
    istBei(riegel?.punkt, 0.3, 0.4, 0);
    expect(arten.artVon(a).beiTreffer(a, 'weg', Vec3.NULL, false)).toBeNull();
  });

  it('Stange: beide Enden; ein Treffer landet auf der Achse', () => {
    expect(arten.artVon(s).fangpunkte(s, true).map((f) => f.art)).toEqual(['ende', 'ende']);
    istBei(arten.artVon(s).beiTreffer(s, 's', new Vec3(0.05, 1, 0), false)?.punkt, 0, 1, 0);
  });

  it('Plane: ein Treffer rastet nur mit mitOesen auf die nächste Öse, egal wie weit', () => {
    const art = arten.artVon(pl);
    expect(art.beiTreffer(pl, 'pl', new Vec3(3.9, 2, -0.1), false)).toBeNull();
    const oese = art.beiTreffer(pl, 'pl', new Vec3(3.9, 2, -0.1), true);
    expect(oese?.art).toBe('oese');
    istBei(oese?.punkt, 4, 2, 0);
  });

  it('Baum: kein Fangpunkt, der Treffer bleibt am Stamm; Seil: weder noch', () => {
    expect(arten.artVon(b).beiTreffer(b, 'b', new Vec3(4.85, 1.7, 0), false)).toEqual({ punkt: new Vec3(4.85, 1.7, 0), art: 'baum' });
    expect(arten.artVon(l).beiTreffer(l, 'l', new Vec3(1, 1, 0), true)).toBeNull();
  });
});
