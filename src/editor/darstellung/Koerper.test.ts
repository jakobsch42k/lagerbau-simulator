import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { VORLAGEN, paramsAusVorlage } from '../../arten/platz/vorlagen';
import { ZELT_VORLAGEN, paramsAusZeltVorlage } from '../../arten/zelt/vorlagen';
import { Bauwerk } from '../../model/Bauwerk';
import { Platzobjekt } from '../../model/Platzobjekt';
import { Vec3 } from '../../model/Vec3';
import { Zelt } from '../../model/Zelt';
import { SzenenInhalt } from '../SzenenInhalt';
import { teilDaten } from './Darstellung';
import { standardDarstellungen } from './standardDarstellungen';

const darstellungen = standardDarstellungen();
const EPS = 1e-6;

const meshes = (g: THREE.Object3D): THREE.Mesh[] => {
  const m: THREE.Mesh[] = [];
  g.traverse((k) => {
    if (k instanceof THREE.Mesh) m.push(k);
  });
  return m;
};
const zeltVon = (schluessel: string): Zelt => {
  const v = ZELT_VORLAGEN.find((x) => x.schluessel === schluessel);
  if (!v) throw new Error('Vorlage fehlt');
  return new Zelt('z', Vec3.NULL, paramsAusZeltVorlage(v));
};
const platzVon = (schluessel: string, aus: object = {}): Platzobjekt => {
  const v = VORLAGEN.find((x) => x.schluessel === schluessel);
  if (!v) throw new Error('Vorlage fehlt');
  return new Platzobjekt('p', Vec3.NULL, { ...paramsAusVorlage(v), ...aus });
};
const kasten = (g: THREE.Object3D): THREE.Box3 => {
  g.updateMatrixWorld(true);
  const box = new THREE.Box3();
  for (const m of meshes(g)) box.union(new THREE.Box3().setFromObject(m));
  return box;
};

describe('Zelt-Körper (Chunk D)', () => {
  const zahl = (g: THREE.Object3D, geometrie: string): number => meshes(g).filter((m) => m.geometry.type === geometrie).length;

  it('Zubehör je Aufbau: Kappen, Firstbalken und Giebelstangen', () => {
    const jurte = darstellungen.zelt.baue(zeltVon('jurte6'));
    expect(zahl(jurte, 'ConeGeometry')).toBe(1);
    const doppel = darstellungen.zelt.baue(zeltVon('doppelkegler'));
    expect(zahl(doppel, 'ConeGeometry')).toBe(2);
    const hanger = darstellungen.zelt.baue(zeltVon('hanger'));
    expect(zahl(hanger, 'ConeGeometry')).toBe(0);
    // Trauf- und Sockelband (4 + 4) plus Firstbalken und zwei Stangen
    expect(zahl(hanger, 'BoxGeometry')).toBe(8 + 3);
  });

  it('jede sichtbare Fläche trägt Teil-Daten (Objekt, Teil, Art) und ist klickbar', () => {
    for (const v of ZELT_VORLAGEN) {
      const g = darstellungen.zelt.baue(new Zelt('z', Vec3.NULL, paramsAusZeltVorlage(v)));
      const klickbar = meshes(g).filter((m) => teilDaten(m)?.klickbar);
      expect(klickbar.length).toBeGreaterThan(3);
      for (const m of klickbar) expect([teilDaten(m)?.objektId, teilDaten(m)?.teilId, teilDaten(m)?.art]).toEqual(['z', 'z', 'zelt']);
    }
  });

  it('nichts ragt über die Firsthöhe', () => {
    for (const v of ZELT_VORLAGEN) {
      const z = new Zelt('z', Vec3.NULL, paramsAusZeltVorlage(v));
      expect(kasten(darstellungen.zelt.baue(z)).max.y).toBeLessThanOrEqual(z.params.firsthoehe + EPS);
    }
  });

  it('Sockelband fehlt vor einer ausgeschalteten Wand', () => {
    const z = zeltVon('jurte6');
    const alle = zahl(darstellungen.zelt.baue(z), 'BoxGeometry');
    const ohne = zahl(darstellungen.zelt.baue(z.mitParams({ ...z.params, waende: [true, false, true] })), 'BoxGeometry');
    expect(ohne).toBe(alle - z.params.ecken / 3);
  });
});

describe('Platz-Körper (Chunk D)', () => {
  it('jede Vorlage bleibt in Breite, Länge und Höhe des Modells', () => {
    for (const v of VORLAGEN) {
      const o = platzVon(v.schluessel);
      const box = kasten(darstellungen.platzobjekt.baue(o));
      const halb = [o.params.breite / 2, o.params.laenge / 2];
      expect(box.min.x).toBeGreaterThanOrEqual(-halb[0]! - EPS);
      expect(box.max.x).toBeLessThanOrEqual(halb[0]! + EPS);
      expect(box.min.z).toBeGreaterThanOrEqual(-halb[1]! - EPS);
      expect(box.max.z).toBeLessThanOrEqual(halb[1]! + EPS);
      expect(box.min.y).toBeGreaterThanOrEqual(-EPS);
      expect(box.max.y).toBeCloseTo(o.params.hoehe, 4);
      // und füllt die Fläche auch aus (Kreis: der Durchmesser, Rechteck: beide Seiten)
      expect(box.max.x - box.min.x).toBeGreaterThan(o.params.breite * 0.9);
      expect(box.max.z - box.min.z).toBeGreaterThan(o.params.laenge * 0.9);
    }
  });

  it('jeder Teil trägt Teil-Daten der Art platzobjekt; Vorlagen mit Einzelteilen haben mehrere', () => {
    for (const v of VORLAGEN) {
      const g = darstellungen.platzobjekt.baue(platzVon(v.schluessel));
      for (const m of meshes(g)) expect([teilDaten(m)?.objektId, teilDaten(m)?.art, teilDaten(m)?.klickbar]).toEqual(['p', 'platzobjekt', true]);
      expect(meshes(g).length > 1).toBe(v.schluessel !== 'eigenes');
    }
  });

  it('Holzlager: der unsichtbare Klickkörper deckt den ganzen Quader ab', () => {
    const o = platzVon('holzlager');
    const g = darstellungen.platzobjekt.baue(o);
    const unsichtbar = meshes(g).filter((m) => teilDaten(m)?.markiert === null);
    expect(unsichtbar).toHaveLength(1);
    const geo = unsichtbar[0]?.geometry as THREE.BoxGeometry;
    expect([geo.parameters.width, geo.parameters.height, geo.parameters.depth]).toEqual([o.params.breite, o.params.hoehe, o.params.laenge]);
  });

  it('Vorlage in anderer Form oder ohne Höhe bleibt ein einfacher Körper', () => {
    expect(meshes(darstellungen.platzobjekt.baue(platzVon('latrine', { form: 'kreis' })))).toHaveLength(1);
    expect(meshes(darstellungen.platzobjekt.baue(platzVon('holzlager', { hoehe: 0.05 })))).toHaveLength(1);
    expect(meshes(darstellungen.platzobjekt.baue(platzVon('feuerstelle', { hoehe: 0 })))).toHaveLength(1);
  });
});

describe('Freigabe eigener Materialien (Chunk D)', () => {
  it('beim Entfernen werden die eigenen Materialien freigegeben, auch bei Auswahl', () => {
    const inhalt = new SzenenInhalt();
    const bauwerk = Bauwerk.leer().mit(zeltVon('doppelkegler')).mit(platzVon('holzlager', {}));
    inhalt.zeige(bauwerk, new Set(['z']), null);
    const eigene = new Set<THREE.Material>();
    inhalt.wurzel.traverse((k) => {
      const daten = teilDaten(k);
      if (k.userData.eigenesMaterial === true && daten) eigene.add(daten.normal);
    });
    expect(eigene.size).toBeGreaterThan(3);
    const spione = [...eigene].map((m) => vi.spyOn(m, 'dispose'));
    inhalt.zeige(Bauwerk.leer(), new Set(), null);
    for (const s of spione) expect(s).toHaveBeenCalled();
  });
});
