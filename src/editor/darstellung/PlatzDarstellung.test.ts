import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Beschriftung } from '../../model/Beschriftung';
import { Bauwerk } from '../../model/Bauwerk';
import { STANDARD_BESCHRIFTUNG } from '../../model/params';
import { Platzobjekt } from '../../model/Platzobjekt';
import { Vec3 } from '../../model/Vec3';
import { SzenenInhalt } from '../SzenenInhalt';
import { teilDaten } from './Darstellung';
import { MARKIERT, UNSICHTBAR } from './materialien';
import { standardDarstellungen } from './standardDarstellungen';

const darstellungen = standardDarstellungen();
const KREIS = { vorlage: 'eigenes', name: 'Feuerstelle', form: 'kreis', breite: 1.5, laenge: 1.5, hoehe: 0.3, farbe: '#e8590c' } as const;
const RECHTECK = { vorlage: 'eigenes', name: 'Holzlager', form: 'rechteck', breite: 3, laenge: 2, hoehe: 1, farbe: '#8b5a2b' } as const;
const meshes = (g: THREE.Object3D): THREE.Mesh[] => {
  const m: THREE.Mesh[] = [];
  g.traverse((k) => {
    if (k instanceof THREE.Mesh) m.push(k);
  });
  return m;
};
const sprites = (g: THREE.Object3D): THREE.Sprite[] => {
  const s: THREE.Sprite[] = [];
  g.traverse((k) => {
    if (k instanceof THREE.Sprite) s.push(k);
  });
  return s;
};

describe('Darstellung Platz-Objekt (Spec E3, D1)', () => {
  it('Kreis: Zylinder in der Farbe, Höhe und Lage stimmen, Teil-Daten wie bei den anderen Arten', () => {
    const gruppe = darstellungen.platzobjekt.baue(new Platzobjekt('p', new Vec3(2, 0, 3), KREIS));
    const [koerper] = meshes(gruppe);
    expect(koerper?.geometry).toBeInstanceOf(THREE.CylinderGeometry);
    const geo = koerper?.geometry as THREE.CylinderGeometry;
    expect([geo.parameters.radiusTop, geo.parameters.height]).toEqual([0.75, 0.3]);
    gruppe.updateMatrixWorld(true);
    expect(koerper?.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([2, 0.15, 3]);
    expect((koerper?.material as THREE.MeshLambertMaterial).color.getHexString()).toBe('e8590c');
    const daten = koerper && teilDaten(koerper);
    expect([daten?.objektId, daten?.teilId, daten?.art, daten?.klickbar, daten?.markiert]).toEqual(['p', 'p', 'platzobjekt', true, MARKIERT]);
    expect(daten?.normal).toBe(koerper?.material);
  });

  it('Rechteck: Quader Breite × Höhe × Länge, mit Drehung (x dreht nach z)', () => {
    const gruppe = darstellungen.platzobjekt.baue(new Platzobjekt('p', Vec3.NULL, RECHTECK, Math.PI / 2));
    const [koerper] = meshes(gruppe);
    const geo = koerper?.geometry as THREE.BoxGeometry;
    expect(geo).toBeInstanceOf(THREE.BoxGeometry);
    expect([geo.parameters.width, geo.parameters.height, geo.parameters.depth]).toEqual([3, 1, 2]);
    gruppe.updateMatrixWorld(true);
    const ecke = new THREE.Vector3(1.5, 0, 0).applyMatrix4(koerper?.matrixWorld ?? new THREE.Matrix4());
    expect([ecke.x, ecke.z].map((z) => Math.round(z * 1000) / 1000)).toEqual([0, 1.5]);
  });

  it('Höhe 0: flache Scheibe bzw. Platte von 1 cm auf dem Boden', () => {
    const scheibe = meshes(darstellungen.platzobjekt.baue(new Platzobjekt('p', Vec3.NULL, { ...KREIS, hoehe: 0 })))[0];
    expect((scheibe?.geometry as THREE.CylinderGeometry).parameters.height).toBeCloseTo(0.01);
    expect(scheibe?.position.y).toBeCloseTo(0.005);
    const platte = meshes(darstellungen.platzobjekt.baue(new Platzobjekt('p', Vec3.NULL, { ...RECHTECK, hoehe: 0 })))[0];
    expect((platte?.geometry as THREE.BoxGeometry).parameters.height).toBeCloseTo(0.01);
  });

  it('der Name steht als Beschriftung über dem Objekt und ist als Beschriftung markiert', () => {
    const gruppe = darstellungen.platzobjekt.baue(new Platzobjekt('p', new Vec3(2, 0, 3), RECHTECK));
    const [name] = sprites(gruppe);
    expect(name?.userData.beschriftung).toBe(true);
    expect(name?.position.x).toBe(2);
    expect(name?.position.z).toBe(3);
    expect(name?.position.y).toBeGreaterThan(1);
  });
});

describe('Darstellung Beschriftung (Spec E3, D1)', () => {
  const b = new Beschriftung('b', new Vec3(1, 0, 2), { ...STANDARD_BESCHRIFTUNG, groesse: 2 });

  it('Text als Sprite knapp über dem Boden, Höhe in Metern', () => {
    const gruppe = darstellungen.beschriftung.baue(b);
    const [text] = sprites(gruppe);
    expect(text?.scale.y).toBe(2);
    expect(text?.scale.x).toBeGreaterThan(0);
    expect(text?.position.x).toBe(1);
    expect(text?.position.z).toBe(2);
    expect(text?.position.y).toBeLessThan(2.5);
    expect(text?.userData.beschriftung).toBe(true);
  });

  it('eine flache, unsichtbare Fläche fängt Klicks und zeigt die Auswahl', () => {
    const gruppe = darstellungen.beschriftung.baue(b);
    const flaeche = meshes(gruppe)[0];
    const daten = flaeche && teilDaten(flaeche);
    expect([daten?.objektId, daten?.art, daten?.klickbar, daten?.normal]).toEqual(['b', 'beschriftung', true, UNSICHTBAR]);
    expect(daten?.markiert).not.toBeNull();
    expect(flaeche?.userData.beschriftung).toBe(true);
    expect(flaeche?.position.y).toBeLessThan(0.1);
  });
});

describe('SzenenInhalt: „Beschriftungen zeigen“ (Spec E3)', () => {
  const bauwerk = Bauwerk.von([
    new Platzobjekt('p', Vec3.NULL, RECHTECK),
    new Beschriftung('b', new Vec3(5, 0, 5), STANDARD_BESCHRIFTUNG),
  ]);
  const sichtbar = (i: SzenenInhalt, art: 'sprite' | 'mesh'): boolean[] => {
    const liste: boolean[] = [];
    i.wurzel.traverse((k) => {
      if ((art === 'sprite' && k instanceof THREE.Sprite) || (art === 'mesh' && k instanceof THREE.Mesh && k.userData.beschriftung === true)) liste.push(k.visible);
    });
    return liste;
  };

  it('blendet Namen und Beschriftungen aus und ein; neue Objekte folgen dem Schalter', () => {
    const inhalt = new SzenenInhalt();
    expect(inhalt.beschriftungenSichtbar).toBe(true);
    inhalt.zeige(bauwerk, new Set(), null);
    expect(sichtbar(inhalt, 'sprite')).toEqual([true, true]);
    inhalt.setzeBeschriftungen(false);
    expect(sichtbar(inhalt, 'sprite')).toEqual([false, false]);
    expect(sichtbar(inhalt, 'mesh')).toEqual([false]);
    inhalt.zeige(bauwerk.mit(new Beschriftung('b2', Vec3.NULL, STANDARD_BESCHRIFTUNG)), new Set(), null);
    expect(sichtbar(inhalt, 'sprite')).toEqual([false, false, false]);
    inhalt.setzeBeschriftungen(true);
    expect(sichtbar(inhalt, 'sprite')).toEqual([true, true, true]);
  });

  it('ausgeblendete Beschriftungen sind keine Klickziele, Platz-Objekte schon (Auswahl nennt beide Arten)', () => {
    const inhalt = new SzenenInhalt();
    inhalt.zeige(bauwerk, new Set(), null);
    const ids = (): string[] => [...new Set(inhalt.ziele(['platzobjekt', 'beschriftung']).map((z) => teilDaten(z)?.objektId ?? ''))];
    expect([...new Set(ids())].sort()).toEqual(['b', 'p']);
    inhalt.setzeBeschriftungen(false);
    expect(ids()).toEqual(['p']);
    expect(inhalt.ziele([])).toEqual([]);
  });
});
