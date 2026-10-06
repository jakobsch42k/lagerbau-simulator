import { describe, expect, it } from 'vitest';
import { ABock } from './ABock';
import { Baum } from './Baum';
import { Beschriftung } from './Beschriftung';
import { Dreibein } from './Dreibein';
import { ART_NAMEN, type LagerObjekt } from './LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_BESCHRIFTUNG, STANDARD_DREIBEIN, STANDARD_PLANE } from './params';
import { Plane } from './Plane';
import { Platzobjekt } from './Platzobjekt';
import { Seil } from './Seil';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

const istBei = (p: Vec3 | undefined, x: number, y: number, z: number): void => {
  expect(p?.equals(new Vec3(x, y, z), 1e-9), `${p?.toArray().join(', ')} ≠ ${x}, ${y}, ${z}`).toBe(true);
};
const VIERTEL = Math.PI / 2;

it('erfüllen alle acht Klassen die gemeinsame Schnittstelle (Spec v3, D1)', () => {
  const alle: readonly LagerObjekt[] = [
    new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN),
    new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK),
    new Stange('s', Vec3.NULL, new Vec3(0, 2, 0), 0.08),
    new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0)),
    new Baum('b', Vec3.NULL, STANDARD_BAUM),
    new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE),
    new Platzobjekt('po', Vec3.NULL, { vorlage: 'eigenes', name: 'Eigenes', form: 'rechteck', breite: 2, laenge: 2, hoehe: 1, farbe: '#868e96' }),
    new Beschriftung('be', Vec3.NULL, STANDARD_BESCHRIFTUNG),
  ];
  expect(alle.map((o) => o.art)).toEqual([...ART_NAMEN]);
});

describe('LagerObjekt: Dreibein', () => {
  const d = new Dreibein('d', new Vec3(2, 0, 0), 0, STANDARD_DREIBEIN);

  it('kennt Art und ids samt Beinen', () => {
    expect(d.art).toBe('dreibein');
    expect(d.ids()).toEqual(['d', 'd-bein-0', 'd-bein-1', 'd-bein-2']);
  });

  it('verschiebt um einen Vektor und behält Drehung und Maße', () => {
    const v = d.verschobenUm(new Vec3(1, 0, -1));
    expect(v).toBeInstanceOf(Dreibein);
    istBei(v.position, 3, 0, -1);
    expect(v.drehung).toBe(0);
    expect((v as Dreibein).params).toBe(d.params);
    istBei(d.position, 2, 0, 0);
  });

  it('dreht ohne Drehpunkt um die eigene Position (wie bisher)', () => {
    const g = d.gedreht(VIERTEL);
    istBei(g.position, 2, 0, 0);
    expect(g.drehung).toBeCloseTo(VIERTEL, 12);
  });

  it('dreht mit Drehpunkt die Position und alle Füße mit', () => {
    const g = d.gedreht(VIERTEL, Vec3.NULL);
    istBei(g.position, 0, 0, 2);
    expect(g.drehung).toBeCloseTo(VIERTEL, 12);
    d.fuesse().forEach((f, i) => istBei(g.fuesse()[i], ...f.gedrehtUmY(VIERTEL, Vec3.NULL).toArray()));
  });

  it('hat seine Füße als Platzpunkte', () => {
    const punkte = d.platzPunkte();
    expect(punkte).toHaveLength(3);
    d.fuesse().forEach((f, i) => istBei(punkte[i], f.x, f.y, f.z));
  });
});

describe('LagerObjekt: A-Bock', () => {
  const a = new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK);

  it('kennt Art und ids samt Beinen und Riegel', () => {
    expect(a.art).toBe('abock');
    expect(a.ids()).toEqual(['a', 'a-bein-0', 'a-bein-1', 'a-riegel']);
  });

  it('dreht um einen fremden Drehpunkt und verschiebt um einen Vektor', () => {
    const g = a.gedreht(Math.PI, new Vec3(1, 0, 0));
    istBei(g.position, 2, 0, 0);
    expect(g.drehung).toBeCloseTo(Math.PI, 12);
    istBei(a.verschobenUm(new Vec3(0, 0, 3)).position, 0, 0, 3);
  });

  it('hat nur die beiden Füße als Platzpunkte, nicht den Riegel', () => {
    const punkte = a.platzPunkte();
    expect(punkte).toHaveLength(2);
    istBei(punkte[0], -0.8, 0, 0);
    istBei(punkte[1], 0.8, 0, 0);
  });
});

describe('LagerObjekt: Stange', () => {
  const s = new Stange('s', Vec3.NULL, new Vec3(2, 2, 0), 0.08);

  it('kennt Art und id', () => {
    expect(s.art).toBe('stange');
    expect(s.ids()).toEqual(['s']);
  });

  it('verschiebt beide Enden und behält Durchmesser, Rolle und Gruppe', () => {
    const v = s.verschobenUm(new Vec3(1, 0, 1));
    istBei(v.start, 1, 0, 1);
    istBei(v.ende, 3, 2, 1);
    expect(v.durchmesser).toBe(0.08);
    const bein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN).stangen()[0];
    const verschoben = bein?.verschobenUm(new Vec3(1, 0, 0));
    expect([verschoben?.rolle, verschoben?.gruppeId]).toEqual(['bein', 'd']);
  });

  it('dreht ohne Drehpunkt um die Mitte, mit Drehpunkt um diesen', () => {
    const umMitte = s.gedreht(VIERTEL);
    istBei(umMitte.start, 1, 0, -1);
    istBei(umMitte.ende, 1, 2, 1);
    const umNull = s.gedreht(VIERTEL, Vec3.NULL);
    istBei(umNull.start, 0, 0, 0);
    istBei(umNull.ende, 0, 2, 2);
  });

  it('hat ihre Enden am Boden als Platzpunkte', () => {
    expect(s.platzPunkte()).toHaveLength(1);
    istBei(s.platzPunkte()[0], 0, 0, 0);
    expect(new Stange('first', new Vec3(0, 2, 0), new Vec3(3, 2, 0), 0.08).platzPunkte()).toEqual([]);
  });
});

describe('LagerObjekt: Seil', () => {
  const l = new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0));

  it('kennt Art und id und braucht selbst keinen Platz', () => {
    expect(l.art).toBe('seil');
    expect(l.ids()).toEqual(['l']);
    expect(l.platzPunkte()).toEqual([]);
  });

  it('verschiebt und dreht um die Mitte oder einen Drehpunkt', () => {
    const v = l.verschobenUm(new Vec3(0, 0, 3));
    istBei(v.start, 0, 2, 3);
    istBei(v.ende, 2, 0, 3);
    const halb = l.gedreht(Math.PI);
    istBei(halb.start, 2, 2, 0);
    istBei(halb.ende, 0, 0, 0);
    const umEnde = l.gedreht(VIERTEL, new Vec3(2, 0, 0));
    istBei(umEnde.start, 2, 2, -2);
    istBei(umEnde.ende, 2, 0, 0);
  });
});

describe('LagerObjekt: Baum', () => {
  const b = new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM);

  it('kennt Art und id und zählt nicht zum Platzbedarf', () => {
    expect(b.art).toBe('baum');
    expect(b.ids()).toEqual(['b']);
    expect(b.platzPunkte()).toEqual([]);
  });

  it('bleibt beim Verschieben am Boden und dreht nur um einen fremden Drehpunkt sichtbar', () => {
    istBei(b.verschobenUm(new Vec3(1, 3, 1)).position, 6, 0, 1);
    istBei(b.gedreht(1).position, 5, 0, 0);
    istBei(b.gedreht(VIERTEL, Vec3.NULL).position, 0, 0, 5);
    expect(b.gedreht(VIERTEL, Vec3.NULL).params).toBe(b.params);
  });
});

describe('LagerObjekt: Plane', () => {
  const p = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { ...STANDARD_PLANE, neigungGrad: 0 });

  it('kennt Art und id und hat ihre Ösen als Platzpunkte', () => {
    expect(p.art).toBe('plane');
    expect(p.ids()).toEqual(['pl']);
    expect(p.platzPunkte()).toEqual(p.oesen);
    expect(p.platzPunkte()).toHaveLength(8);
  });

  it('dreht um die Mitte der Linie oder einen Drehpunkt und behält die Maße', () => {
    const g = p.gedreht(VIERTEL);
    istBei(g.start, 2, 2, -2);
    istBei(g.ende, 2, 2, 2);
    expect(g.params).toBe(p.params);
    istBei(p.gedreht(VIERTEL, Vec3.NULL).ende, 0, 2, 4);
  });

  it('verschiebt und prüft die neue Lage', () => {
    istBei(p.verschobenUm(new Vec3(1, 0, 0)).start, 1, 2, 0);
    expect(() => p.verschobenUm(new Vec3(0, -3, 0))).toThrow('Plane reicht in den Boden');
  });
});
