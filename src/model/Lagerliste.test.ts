import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ObjektRegister } from '../arten/ObjektRegister';
import { findeVorlage, paramsAusVorlage } from '../arten/platz/vorlagen';
import { standardArten } from '../arten/standardArten';
import { findeZeltVorlage, paramsAusZeltVorlage } from '../arten/zelt/vorlagen';
import { ABock } from './ABock';
import { Bau } from './Bau';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { Lagerliste } from './Lagerliste';
import { Linie } from './Linie';
import { Materialliste } from './Materialliste';
import type { MaterialPosten } from './MaterialPosten';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_LINIE, STANDARD_PLANE } from './params';
import { Plane } from './Plane';
import { Platzobjekt } from './Platzobjekt';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';
import { Zelt } from './Zelt';

const register = standardArten();
const ZUGABE = 0.5;
const SPITZE_KOCH = new ABock('x', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK).spitze();
const abock2 = new ABock('abock2', new Vec3(20, 0, 0), 0, STANDARD_ABOCK);

const zelt = (id: string, schluessel: string, x: number): Zelt => new Zelt(id, new Vec3(x, 0, 30), paramsAusZeltVorlage(findeZeltVorlage(schluessel) as NonNullable<ReturnType<typeof findeZeltVorlage>>));
const feuer = (id: string, x: number): Platzobjekt => new Platzobjekt(id, new Vec3(x, 0, -20), paramsAusVorlage(findeVorlage('feuerstelle') as NonNullable<ReturnType<typeof findeVorlage>>));
const posten = (liste: readonly MaterialPosten[], kategorie: string, bezeichnung: string): number =>
  liste.find((p) => p.kategorie === kategorie && p.bezeichnung === bezeichnung)?.menge ?? 0;

/** Zwei Bauten, zwei Jurten 6er, ein Hanger, zwei Feuerstellen und 20 m Zaun (Spec E5, D7). */
function lager(): Bauwerk {
  return kochstelle()
    .mitGruppe(abock2)
    .mitSeil(new Seil('s1', SPITZE_KOCH, new Vec3(-3, 0, 2)))
    .mitSeil(new Seil('s2', abock2.spitze(), new Vec3(24, 0, 3)))
    .mit(zelt('j1', 'jurte6', 0))
    .mit(zelt('j2', 'jurte6', 10))
    .mit(zelt('h', 'hanger', 20))
    .mit(feuer('f1', 0))
    .mit(feuer('f2', 5))
    .mit(new Linie('zaun', [new Vec3(0, 0, 50), new Vec3(20, 0, 50)], { ...STANDARD_LINIE, typ: 'zaun' }));
}

describe('Lagerliste (Spec E5, D3)', () => {
  it('Bau-Blöcke je Bau mit Namen und der Materialliste des Teil-Bauwerks', () => {
    const l = Lagerliste.aus(lager().mitBauName(Bau.alle(lager())[0] as Bau, 'Küche'), register, ZUGABE);
    expect(l.baue.map((z) => z.name)).toEqual(['Küche', 'Bau 2']);
    expect(l.baue.every((z) => z.bau !== null)).toBe(true);
    expect(l.baue[0]?.liste.seile).toEqual([{ laenge: 6, anzahl: 1 }]);
    expect(l.baue[0]?.liste.anzahlHaringe).toBe(1);
    expect(l.baue[1]?.liste.anzahlHaringe).toBe(1);
  });

  it('Zelt-Blöcke nach Vorlagenname in der Reihenfolge des ersten Auftretens, mit Anzahl und summierten Posten', () => {
    const l = Lagerliste.aus(lager(), register, ZUGABE);
    expect(l.zelte.map((b) => [b.titel, b.anzahl])).toEqual([['Jurte 6er', 2], ['Hanger (Platzhalter)', 1]]);
    expect(posten(l.zelte[0]?.posten ?? [], 'Zelt', 'Jurte 6er')).toBe(2);
    expect(posten(l.zelte[0]?.posten ?? [], 'Haring', 'Haring')).toBe(24);
  });

  it('Platz-Blöcke: Feuerstelle (2 ×) und Zaun mit 20 m', () => {
    const l = Lagerliste.aus(lager(), register, ZUGABE);
    expect(l.platz.map((b) => [b.titel, b.anzahl])).toEqual([['Feuerstelle', 2], ['Zaun', 1]]);
    expect(l.platz[1]?.posten).toEqual([{ kategorie: 'Zaun', bezeichnung: 'Zaun', menge: 20, einheit: 'm' }]);
  });

  it('Weg und Grenze bilden keinen Block', () => {
    const b = Bauwerk.leer().mit(new Linie('w', [Vec3.NULL, new Vec3(5, 0, 0)], STANDARD_LINIE));
    expect(Lagerliste.aus(b, register, ZUGABE).platz).toEqual([]);
  });

  it('Gesamtsumme: Haringe aus Bauten und Zelten, Seile und Abspannseile nach Länge gemischt', () => {
    const g = Lagerliste.aus(lager(), register, ZUGABE).gesamt;
    const hanger = findeZeltVorlage('hanger');
    const jurte = findeZeltVorlage('jurte6');
    expect(posten(g.posten, 'Haring', 'Haring')).toBe(2 + 12 + 12 + (hanger?.abspannungen ?? 0));
    expect(posten(g.posten, 'Zelt', 'Jurte 6er')).toBe(2);
    expect(posten(g.posten, 'Platz', 'Feuerstelle')).toBe(2);
    expect(posten(g.posten, 'Zaun', 'Zaun')).toBe(20);
    const seile = g.posten.filter((p) => p.kategorie === 'Seil');
    const meter = seile.map((p) => Number(/(\d+) m$/.exec(p.bezeichnung)?.[1]));
    expect([...meter].sort((a, b) => b - a)).toEqual(meter);
    expect(seile.reduce((n, p) => n + p.menge, 0)).toBe(2 + (jurte?.abspannungen ?? 0) * 2 + (hanger?.abspannungen ?? 0));
    expect(g.bau.stangen.zeilen.length).toBeGreaterThan(0);
    expect(g.bau.platzbedarf).not.toBeNull();
  });

  it('Platzbedarf des ganzen Lagers enthält die Zelte, je Bau steht der Platzbedarf des Teil-Bauwerks', () => {
    const l = Lagerliste.aus(lager(), register, ZUGABE);
    const ohneZelte = Materialliste.aus(kochstelle().mitGruppe(abock2), ZUGABE, register.zaehltZumPlatzbedarf).platzbedarf;
    expect(l.gesamt.bau.platzbedarf?.breite).toBeGreaterThan(ohneZelte?.breite ?? 0);
    const bau1 = Bau.alle(lager())[0] as Bau;
    expect(l.baue[0]?.liste.platzbedarf).toEqual(Materialliste.aus(bau1.teilBauwerk(lager()), ZUGABE, register.zaehltZumPlatzbedarf).platzbedarf);
  });

  it('jedes Objekt genau einmal: ein Seil zwischen zwei Bauten steht nur im ersten', () => {
    const b = kochstelle().mitGruppe(abock2).mitSeil(new Seil('brueck', SPITZE_KOCH, abock2.spitze()));
    const alle = Bau.alle(b);
    expect(alle.every((x) => x.objektIds.includes('brueck'))).toBe(true);
    const l = Lagerliste.aus(b, register, ZUGABE);
    expect(l.baue.map((z) => z.liste.seile.reduce((n, s) => n + s.anzahl, 0))).toEqual([1, 0]);
    expect(l.gesamt.posten.filter((p) => p.kategorie === 'Seil').reduce((n, p) => n + p.menge, 0)).toBe(1);
  });

  it('bekannte Grenze: ein gemeinsamer Haring zweier Bauten zählt je Bau, aber in der Gesamtsumme einmal', () => {
    const b = kochstelle()
      .mitGruppe(abock2)
      .mitSeil(new Seil('a', SPITZE_KOCH, new Vec3(10, 0, 0)))
      .mitSeil(new Seil('b', abock2.spitze(), new Vec3(10.05, 0, 0)));
    const l = Lagerliste.aus(b, register, ZUGABE);
    expect(l.baue.map((z) => z.liste.anzahlHaringe)).toEqual([1, 1]);
    expect(posten(l.gesamt.posten, 'Haring', 'Haring')).toBe(1);
  });

  it('„Ohne Bau“: Plane zwischen zwei Bäumen und Seil Baum–Haring, nur wenn nicht leer', () => {
    expect(Lagerliste.aus(kochstelle(), register, ZUGABE).baue.map((z) => z.name)).toEqual(['Bau 1']);
    const b = Bauwerk.leer()
      .mitBaum(new Baum('b1', new Vec3(0, 0, 0), STANDARD_BAUM))
      .mitBaum(new Baum('b2', new Vec3(4, 0, 0), STANDARD_BAUM))
      .mitPlane(new Plane('p', new Vec3(0, 3, 0), new Vec3(4, 3, 0), STANDARD_PLANE))
      .mitSeil(new Seil('s', new Vec3(0, 3, 0), new Vec3(2, 0, 3)));
    const l = Lagerliste.aus(b, register, ZUGABE);
    expect(l.baue).toHaveLength(1);
    expect(l.baue[0]?.bau).toBeNull();
    expect(l.baue[0]?.name).toBe('Ohne Bau');
    expect(l.baue[0]?.liste.planen).toEqual([{ breite: 3, laenge: 4, anzahl: 1 }]);
    expect(l.baue[0]?.liste.seile).toHaveLength(1);
    expect(l.gesamt.bau.planen).toEqual([{ breite: 3, laenge: 4, anzahl: 1 }]);
  });

  it('ein einzelner Bau hat dieselbe Materialliste wie das ganze Bauwerk heute', () => {
    const b = kochstelle().mitSeil(new Seil('s', SPITZE_KOCH, new Vec3(-2, 0, 1)));
    const ganz = Materialliste.aus(b, ZUGABE, register.zaehltZumPlatzbedarf);
    const teil = Materialliste.aus((Bau.alle(b)[0] as Bau).teilBauwerk(b), ZUGABE, register.zaehltZumPlatzbedarf);
    expect(teil.stangen).toEqual(ganz.stangen);
    expect(teil.seile).toEqual(ganz.seile);
    expect(teil.anzahlHaringe).toBe(ganz.anzahlHaringe);
    expect(teil.planen).toEqual(ganz.planen);
    expect(teil.platzbedarf).toEqual(ganz.platzbedarf);
  });

  it('leeres Bauwerk: leere Liste', () => {
    const l = Lagerliste.aus(Bauwerk.leer(), register, ZUGABE);
    expect([l.baue, l.zelte, l.platz, l.gesamt.posten]).toEqual([[], [], [], []]);
  });

  it('kein Fall je Art: eine Testart mit `material` steht in der Liste, ohne dass Lagerliste sie kennt', () => {
    const echt = register.art('platzobjekt');
    const testArt = Object.create(echt, {
      material: { value: () => ({ gruppe: 'Testgruppe', posten: [{ kategorie: 'Test', bezeichnung: 'Ding', menge: 3, einheit: 'Stk' }] }) },
    });
    const eigenes = new ObjektRegister(register.alle.map((a) => (a === echt ? testArt : a)));
    const l = Lagerliste.aus(Bauwerk.leer().mit(feuer('f', 0)), eigenes, ZUGABE);
    expect(l.platz).toEqual([{ titel: 'Testgruppe', anzahl: 1, posten: [{ kategorie: 'Test', bezeichnung: 'Ding', menge: 3, einheit: 'Stk' }] }]);
    expect(posten(l.gesamt.posten, 'Test', 'Ding')).toBe(3);
  });
});
