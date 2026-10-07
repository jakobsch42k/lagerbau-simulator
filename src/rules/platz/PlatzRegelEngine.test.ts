import { describe, expect, it } from 'vitest';
import type { ObjektArt } from '../../arten/ObjektArt';
import { ObjektRegister } from '../../arten/ObjektRegister';
import { findeVorlage, paramsAusVorlage } from '../../arten/platz/vorlagen';
import { standardArten } from '../../arten/standardArten';
import { Baum } from '../../model/Baum';
import { Bauwerk } from '../../model/Bauwerk';
import { Grundriss } from '../../model/Grundriss';
import type { LagerObjekt } from '../../model/LagerObjekt';
import { Platzobjekt } from '../../model/Platzobjekt';
import { Vec3 } from '../../model/Vec3';
import { Zelt } from '../../model/Zelt';
import { SATTEL_KLEIN } from '../../model/Zelt.testdaten';
import { ZeltGeometrie } from '../../model/ZeltGeometrie';
import type { Hinweis } from '../Rule';
import { PlatzregelEinstellungen } from './PlatzregelEinstellungen';
import { PlatzRegelEngine } from './PlatzRegelEngine';

const register = standardArten();
const standard = PlatzregelEinstellungen.standard();

const platz = (id: string, vorlage: string, x: number, z = 0, name?: string): Platzobjekt => {
  const v = findeVorlage(vorlage);
  if (!v) throw new Error(`Vorlage ${vorlage} fehlt`);
  const p = paramsAusVorlage(v);
  return new Platzobjekt(id, new Vec3(x, 0, z), name === undefined ? p : { ...p, name });
};
const zelt = (id: string, x: number, drehung = 0, name = 'Testzelt'): Zelt =>
  new Zelt(id, new Vec3(x, 0, 0), { ...SATTEL_KLEIN, name }, drehung);

const pruefe = (objekte: readonly LagerObjekt[], e = standard): Hinweis[] => PlatzRegelEngine.fuer(e, register).pruefe(Bauwerk.von(objekte, undefined, undefined, undefined, e));
const halbX = (z: Zelt): number => Math.max(...ZeltGeometrie.umriss(z).map((p) => p.x - z.position.x));

describe('Platzregeln P1 bis P5: unter, auf und über dem Wert', () => {
  // Radien in x-Richtung: Feuerstelle 0,75, Wasserstelle 0,5, Latrine 0,75, Holzlager 1,5, Küche 2.
  const faelle = [
    { regel: 'P1', a: 'feuerstelle', ra: 0.75, b: 'zelt', rb: halbX(zelt('z', 0)), wert: 5, schwere: 'warnung', beginn: 'Faustregel (Camping-Blogs' },
    { regel: 'P2', a: 'feuerstelle', ra: 0.75, b: 'holzlager', rb: 1.5, wert: 5, schwere: 'info', beginn: 'Faustregel (ohne Quelle' },
    { regel: 'P3', a: 'zelt', ra: halbX(zelt('z', 0)), b: 'zelt', rb: halbX(zelt('z', 0)), wert: 3, schwere: 'info', beginn: 'Faustregel (Empfehlung VDE, Deutschland' },
    { regel: 'P4', a: 'latrine', ra: 0.75, b: 'wasserstelle', rb: 0.5, wert: 30, schwere: 'warnung', beginn: 'Faustregel (Richtlinie Schweizer Pfadi' },
    { regel: 'P5', a: 'latrine', ra: 0.75, b: 'kueche', rb: 2, wert: 20, schwere: 'info', beginn: 'Faustregel (ohne Zahlenquelle' },
    { regel: 'P5', a: 'latrine', ra: 0.75, b: 'feuerstelle', rb: 0.75, wert: 20, schwere: 'info', beginn: 'Faustregel (ohne Zahlenquelle' },
  ] as const;

  const bau = (f: (typeof faelle)[number], rand: number): LagerObjekt[] => {
    const abstandMitte = f.ra + rand + f.rb;
    const erstes = f.a === 'zelt' ? zelt('a', 0, 0, 'Eins') : platz('a', f.a, 0, 0, 'Eins');
    const zweites = f.b === 'zelt' ? zelt('b', abstandMitte, 0, 'Zwei') : platz('b', f.b, abstandMitte, 0, 'Zwei');
    return [erstes, zweites];
  };
  const nurRegel = (h: Hinweis[], regel: string): Hinweis[] => h.filter((x) => x.regel === regel);

  it.each(faelle)('$regel mit $a und $b: darunter Hinweis', (f) => {
    const hinweise = nurRegel(pruefe(bau(f, f.wert - 1)), f.regel);
    expect(hinweise).toHaveLength(1);
    const h = hinweise[0];
    expect(h.text.startsWith(f.beginn)).toBe(true);
    expect(h.schwere).toBe(f.schwere);
    expect([...h.betroffeneTeile].sort()).toEqual(['a', 'b']);
  });

  it.each(faelle)('$regel mit $a und $b: genau auf dem Wert und darüber kein Hinweis', (f) => {
    expect(nurRegel(pruefe(bau(f, f.wert)), f.regel)).toHaveLength(0);
    expect(nurRegel(pruefe(bau(f, f.wert + 2)), f.regel)).toHaveLength(0);
  });

  it('kein Text nennt ein Verbot, einen Verstoß oder das Gesetz (unter dem Wert und überlappend)', () => {
    const texte: string[] = [];
    for (const f of faelle) for (const rand of [f.wert - 1, -0.5]) texte.push(...pruefe(bau(f, rand)).map((h) => h.text));
    texte.push(...pruefe([zelt('z', 0), new Baum('b', new Vec3(0, 0, 0), { durchmesser: 0.4, hoehe: 12 })]).map((h) => h.text));
    expect(texte.length).toBeGreaterThan(8);
    for (const t of texte) {
      expect(t.startsWith('Faustregel (')).toBe(true);
      expect(t).not.toMatch(/verbot|verstoß|gesetz/i);
    }
  });
});

describe('Hinweistexte', () => {
  it('P1 nennt Namen, Abstand mit Komma und den Richtwert', () => {
    const z = zelt('z', 0, 0, 'Jurte 6er');
    const f = platz('f', 'feuerstelle', halbX(z) + 0.75 + 3.2, 0, 'Feuerstelle');
    const [h] = pruefe([z, f]);
    expect(h.text).toBe('Faustregel (Camping-Blogs, keine rechtliche Vorgabe): ‚Feuerstelle‘ ist nur 3,2 m von ‚Jurte 6er‘ entfernt, üblich sind mindestens 5 m.');
    expect(h.regel).toBe('P1');
  });

  it('P3 meldet Überlappung eigens', () => {
    const [h] = pruefe([zelt('a', 0, 0, 'A'), zelt('b', 0.5, 0, 'B')]);
    expect(h.regel).toBe('P3');
    expect(h.text).toContain('‚A‘ und ‚B‘ überlappen sich');
  });

  it('P3 prüft jedes Paar einmal und sortiert nach Abstand', () => {
    const w = halbX(zelt('z', 0)) * 2;
    const hinweise = pruefe([zelt('a', 0), zelt('b', w + 2.5), zelt('c', w + 2.5 + w + 1)]);
    expect(hinweise.map((h) => h.betroffeneTeile.join('+'))).toEqual(['b+c', 'a+b']);
  });

  it('P6 nennt den Baum mit Höhe', () => {
    const [h] = pruefe([zelt('z', 0, 0, 'Jurte 6er'), new Baum('b', new Vec3(0, 0, 0), { durchmesser: 0.4, hoehe: 12 })]);
    expect(h.text).toBe('Faustregel (Empfehlung VDE, Blitz und Astbruch; Kronengröße geschätzt): ‚Jurte 6er‘ steht unter der Krone eines Baums (Höhe 12 m).');
    expect(h.schwere).toBe('warnung');
    expect([...h.betroffeneTeile]).toEqual(['z', 'b']);
  });
});

describe('Abstand von Kante zu Kante', () => {
  it('gedrehtes Zelt: Drehung um 90° tauscht die Halbachsen', () => {
    const f = platz('f', 'feuerstelle', 6, 0);
    const unter = (z: Zelt): number => Number(/nur (\d+),(\d)/.exec(pruefe([z, f], PlatzregelEinstellungen.standard().mitWert('P1_MIN_ABSTAND_FEUER_ZELT_M', 10))[0].text)?.slice(1).join('.'));
    const gerade = unter(zelt('z', 0, 0));
    const quer = unter(zelt('z', 0, Math.PI / 2));
    expect([gerade, quer].sort()).toEqual([3.3, 3.8].sort()); // 6 - 0,75 - 2 = 3,25 und 6 - 0,75 - 1,5 = 3,75, auf eine Stelle gerundet
  });

  it('der Doppelkegler zählt mit seinem Oval', () => {
    const dk = new Zelt('dk', new Vec3(0, 0, 0), { ...SATTEL_KLEIN, aufbau: 'doppelkegel', name: 'Doppelkegler', laenge: 5.55, breite: 4 }, 0);
    const f = platz('f', 'feuerstelle', halbX(dk) + 0.75 + 1);
    expect(pruefe([dk, f]).map((h) => h.regel)).toEqual(['P1']);
  });
});

describe('Einstellungen wirken', () => {
  const z = zelt('z', 0);
  const f = platz('f', 'feuerstelle', halbX(z) + 0.75 + 3.2);

  it('abgeschaltete Regel erzeugt keinen Hinweis', () => {
    expect(pruefe([z, f]).map((h) => h.regel)).toEqual(['P1']);
    expect(pruefe([z, f], standard.mitAus('P1', true))).toEqual([]);
  });

  it('eingestellter Wert ändert das Ergebnis: P1 auf 2 m, bei 3,2 m kein Hinweis', () => {
    expect(pruefe([z, f], standard.mitWert('P1_MIN_ABSTAND_FEUER_ZELT_M', 2))).toEqual([]);
    expect(pruefe([z, f], standard.mitWert('P1_MIN_ABSTAND_FEUER_ZELT_M', 4)).map((h) => h.text)[0]).toContain('mindestens 4 m');
  });

  it('P6 mit Faktor 0,1 statt 0,3', () => {
    const baum = new Baum('b', new Vec3(halbX(z) + 2, 0, 0), { durchmesser: 0.4, hoehe: 12 });
    expect(pruefe([z, baum]).map((h) => h.regel)).toEqual(['P6']); // Krone 3,6 m reicht ans Zelt
    expect(pruefe([z, baum], standard.mitWert('P6_KRONENRADIUS_FAKTOR', 0.1))).toEqual([]); // Krone 1,2 m reicht nicht
  });

  it('P6: Berührung genau am Rand gibt keinen Hinweis', () => {
    const baum = new Baum('b', new Vec3(halbX(z) + 3.6, 0, 0), { durchmesser: 0.4, hoehe: 12 });
    expect(pruefe([z, baum])).toEqual([]);
  });

  it('ein Bauwerk ohne Zelte und Platz-Objekte ergibt []', () => {
    expect(pruefe([])).toEqual([]);
    expect(pruefe([new Baum('b', new Vec3(0, 0, 0), { durchmesser: 0.4, hoehe: 12 })])).toEqual([]);
  });

  it('ein Platz-Objekt ohne Rolle (Fahnenmast, Eigenes) löst nichts aus', () => {
    expect(pruefe([z, platz('m', 'fahnenmast', halbX(z) + 1), platz('e', 'eigenes', halbX(z) + 1, 5)])).toEqual([]);
  });
});

describe('keine Fallunterscheidung je Art', () => {
  it('eine Testart mit rolle und grundriss bekommt Hinweise', () => {
    interface Spur extends LagerObjekt {
      readonly x: number;
    }
    const spur = (id: string, x: number): Spur => ({ id, art: 'platzobjekt', x, ids: () => [id] }) as unknown as Spur;
    const testArt = {
      name: 'platzobjekt',
      label: 'Spur',
      istVon: () => true,
      rolle: (o: Spur) => (o.id === 'f' ? 'feuer' : 'zelt'),
      grundriss: (o: Spur) => Grundriss.rechteck({ x: o.x, z: 0 }, 1, 1, 0),
    } as unknown as ObjektArt;
    const e = PlatzRegelEngine.fuer(standard, new ObjektRegister([testArt]));
    const bauwerk = { objekte: [spur('f', 0), spur('z', 2)] } as unknown as Bauwerk;
    const hinweise = e.pruefe(bauwerk);
    expect(hinweise.map((h) => h.regel)).toEqual(['P1']);
    expect(hinweise[0].text).toContain('‚Spur‘'); // ohne anzeigeName gilt der Name der Art
    expect(hinweise[0].text).toContain('nur 1,0 m');
  });
});
