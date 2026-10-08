import { describe, expect, it } from 'vitest';
import { Baum } from '../../model/Baum';
import { Platzobjekt } from '../../model/Platzobjekt';
import { Vec3 } from '../../model/Vec3';
import { Zelt } from '../../model/Zelt';
import { JURTE6 } from '../../model/Zelt.testdaten';
import { ZeltGeometrie } from '../../model/ZeltGeometrie';
import { BaumArt } from '../BaumArt';
import { PlatzobjektArt } from '../PlatzobjektArt';
import { ZeltArt } from '../ZeltArt';
import { ROLLEN_NAME, rolleAusVorlage } from './rollen';
import { findeVorlage, paramsAusVorlage } from './vorlagen';

const art = new PlatzobjektArt();
const objekt = (vorlage: string, x = 0): Platzobjekt => {
  const v = findeVorlage(vorlage);
  if (!v) throw new Error(vorlage);
  return new Platzobjekt('p', new Vec3(x, 0, 0), paramsAusVorlage(v), 0.3);
};

describe('Rollen (Spec E6, D2)', () => {
  it.each([
    ['feuerstelle', 'feuer'],
    ['holzlager', 'holzlager'],
    ['latrine', 'latrine'],
    ['wasserstelle', 'wasser'],
    ['kueche', 'kueche'],
  ])('Vorlage %s zählt als %s', (vorlage, rolle) => {
    expect(art.rolle(objekt(vorlage))).toBe(rolle);
  });

  it('Fahnenmast und Eigenes haben keine Rolle', () => {
    expect(art.rolle(objekt('fahnenmast'))).toBeNull();
    expect(art.rolle(objekt('eigenes'))).toBeNull();
    expect(rolleAusVorlage('gibtsnicht')).toBeNull();
  });

  it('die Feuerstelle bleibt Feuer nach geänderter Größe und geändertem Namen', () => {
    const f = objekt('feuerstelle');
    const anders = f.mitParams({ ...f.params, breite: 3, name: 'Lagerfeuer' });
    expect(art.rolle(anders)).toBe('feuer');
    expect(art.anzeigeName(anders)).toBe('Lagerfeuer');
  });

  it('der Wechsel auf Eigenes entfernt die Rolle, der Wechsel auf Latrine ändert sie', () => {
    const f = objekt('feuerstelle');
    const eigenes = art.panel(f).mit({ ...art.panel(f).werte, vorlage: 'eigenes' }) as Platzobjekt;
    expect(art.rolle(eigenes)).toBeNull();
    const latrine = art.panel(f).mit({ ...art.panel(f).werte, vorlage: 'latrine' }) as Platzobjekt;
    expect(art.rolle(latrine)).toBe('latrine');
  });

  it('das Panel zeigt, wofür das Objekt zählt', () => {
    expect(art.panel(objekt('feuerstelle')).info).toContain('Zählt als: Feuer (Platzregeln).');
    expect(art.panel(objekt('eigenes')).info).not.toContain('Zählt als');
    expect(ROLLEN_NAME.kueche).toBe('Küche');
  });

  it('Küche ist eine Vorlage: Rechteck 4 × 3 m, Höhe 0,1 m, #c9a227', () => {
    const v = findeVorlage('kueche');
    expect([v?.form, v?.breite, v?.laenge, v?.hoehe, v?.farbe]).toEqual(['rechteck', 4, 3, 0.1, '#c9a227']);
  });

  it('Grundriss des Platz-Objekts: Kreis und gedrehtes Rechteck', () => {
    const kreis = art.grundriss(objekt('feuerstelle'));
    expect(kreis.punkte).toHaveLength(24);
    const rechteck = art.grundriss(objekt('holzlager'));
    const eck = rechteck.punkte[0];
    expect(Math.hypot(eck.x, eck.z)).toBeCloseTo(Math.hypot(1.5, 1));
    // gleiche Ecken wie `platzPunkte` (Drehung um 0,3 rad, nur die Menge der Ecken zählt)
    const soll = objekt('holzlager').platzPunkte();
    for (const s of soll) expect(rechteck.punkte.some((p) => Math.hypot(p.x - s.x, p.z - s.z) < 1e-9)).toBe(true);
  });

  it('Zelt und Baum: Rolle, Grundriss und Name', () => {
    const z = new Zelt('z', new Vec3(1, 0, 2), JURTE6);
    const zeltArt = new ZeltArt();
    expect(zeltArt.rolle()).toBe('zelt');
    expect(zeltArt.anzeigeName(z)).toBe('Jurte 6er');
    expect(zeltArt.grundriss(z).punkte).toHaveLength(ZeltGeometrie.umriss(z).length);
    const b = new Baum('b', new Vec3(0, 0, 0), { durchmesser: 0.4, hoehe: 12 });
    expect(new BaumArt().rolle()).toBe('baum');
    expect(new BaumArt().grundriss(b).punkte[0].x).toBeCloseTo(0.2);
  });
});
