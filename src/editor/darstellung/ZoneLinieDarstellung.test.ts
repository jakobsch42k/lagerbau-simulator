import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../../model/Bauwerk';
import { Linie } from '../../model/Linie';
import type { LinienParams } from '../../model/params';
import { Vec3 } from '../../model/Vec3';
import { Zone } from '../../model/Zone';
import { BODEN_HOEHEN } from '../Bodenbild';
import { SzenenInhalt } from '../SzenenInhalt';
import { teilDaten } from './Darstellung';
import { MARKIERT, UNSICHTBAR, ZONE_MARKIERT } from './materialien';
import { standardDarstellungen } from './standardDarstellungen';

const darstellungen = standardDarstellungen();
const p = (x: number, z: number): Vec3 => new Vec3(x, 0, z);
const WEG: LinienParams = { name: 'Weg', typ: 'weg', breite: 2, farbe: '#a68a64' };

const meshes = (g: THREE.Object3D): THREE.Mesh[] => {
  const m: THREE.Mesh[] = [];
  g.traverse((k) => {
    if (k instanceof THREE.Mesh) m.push(k);
  });
  return m;
};
const dreiecke = (m: THREE.Mesh): number => {
  const g = m.geometry as THREE.BufferGeometry;
  return (g.index ? g.index.count : g.getAttribute('position').count) / 3;
};
const box = (g: THREE.Object3D): THREE.Box3 => new THREE.Box3().setFromObject(g);

describe('Darstellung Zone (Spec E3, D1)', () => {
  const quadrat = new Zone('z', [p(0, 0), p(10, 0), p(10, 6), p(0, 6)], { name: 'Küche', farbe: '#4dabf7', deckkraft: 40 });

  it('eine flache, halbdurchsichtige Fläche bei y = 0,005 in der Farbe, klickbar mit Teil-Daten', () => {
    const gruppe = darstellungen.zone.baue(quadrat);
    const flaechen = meshes(gruppe);
    expect(flaechen).toHaveLength(1);
    const f = flaechen[0] as THREE.Mesh;
    const material = f.material as THREE.MeshBasicMaterial;
    expect([material.color.getHexString(), material.opacity, material.transparent, material.depthWrite]).toEqual(['4dabf7', 0.4, true, false]);
    const b = box(f);
    expect([b.min.toArray(), b.max.toArray()]).toEqual([
      [0, BODEN_HOEHEN.zone, 0],
      [10, BODEN_HOEHEN.zone, 6],
    ]);
    expect(BODEN_HOEHEN.zone).toBe(0.005);
    const daten = teilDaten(f);
    expect([daten?.objektId, daten?.teilId, daten?.art, daten?.klickbar, daten?.normal, daten?.markiert]).toEqual(['z', 'z', 'zone', true, material, ZONE_MARKIERT]);
    expect(dreiecke(f)).toBe(2);
  });

  it('Deckkraft 0 und 100 %; eine konkave Zone wird in n - 2 Dreiecke zerlegt', () => {
    const f = (d: number): THREE.MeshBasicMaterial =>
      meshes(darstellungen.zone.baue(quadrat.mitParams({ ...quadrat.params, deckkraft: d })))[0]?.material as THREE.MeshBasicMaterial;
    expect([f(0).opacity, f(100).opacity]).toEqual([0, 1]);
    const l = new Zone('l', [p(0, 0), p(4, 0), p(4, 2), p(2, 2), p(2, 4), p(0, 4)], quadrat.params);
    expect(dreiecke(meshes(darstellungen.zone.baue(l))[0] as THREE.Mesh)).toBe(4);
  });

  it('der Name steht als Sprite in der Mitte und hängt am Schalter „Beschriftungen zeigen“', () => {
    const gruppe = darstellungen.zone.baue(quadrat);
    const sprites: THREE.Sprite[] = [];
    gruppe.traverse((k) => k instanceof THREE.Sprite && sprites.push(k));
    expect(sprites).toHaveLength(1);
    expect([sprites[0]?.position.x, sprites[0]?.position.z]).toEqual([5, 3]);
    expect(sprites[0]?.userData.beschriftung).toBe(true);
  });

  it('die Szene gibt Zonen höchstens in der Auswahl als Klickziel frei', () => {
    const inhalt = new SzenenInhalt();
    inhalt.zeige(Bauwerk.leer().mit(quadrat), new Set(), null);
    expect(inhalt.ziele([])).toEqual([]);
    expect(inhalt.ziele(['zone']).map((z) => teilDaten(z)?.objektId)).toEqual(['z']);
  });
});

describe('Darstellung Linie (Spec E3, D1)', () => {
  it('Weg: flaches Band in der Breite über den Zonen, in der Farbe, klickbar', () => {
    const gruppe = darstellungen.linie.baue(new Linie('l', [p(0, 0), p(10, 0)], WEG));
    const flaechen = meshes(gruppe);
    expect(flaechen).toHaveLength(1);
    const b = box(gruppe);
    expect([b.min.toArray(), b.max.toArray()]).toEqual([
      [0, BODEN_HOEHEN.weg, -1],
      [10, BODEN_HOEHEN.weg, 1],
    ]);
    expect(BODEN_HOEHEN.weg).toBeGreaterThan(BODEN_HOEHEN.zone);
    const f = flaechen[0] as THREE.Mesh;
    expect(((f.material as THREE.MeshBasicMaterial).color).getHexString()).toBe('a68a64');
    const daten = teilDaten(f);
    expect([daten?.objektId, daten?.art, daten?.klickbar, daten?.markiert]).toEqual(['l', 'linie', true, MARKIERT]);
  });

  it('Weg mit Knick: die Ecke wird gefüllt (mehr Dreiecke als zwei Rechtecke)', () => {
    const gruppe = darstellungen.linie.baue(new Linie('l', [p(0, 0), p(10, 0), p(10, 10)], WEG));
    expect(dreiecke(meshes(gruppe)[0] as THREE.Mesh)).toBeGreaterThan(4);
    const b = box(gruppe);
    expect([b.min.x, b.max.x, b.min.z, b.max.z]).toEqual([0, 11, -1, 10]);
  });

  it('Zaun: Pfosten höchstens alle 2 m, 1 m hoch, mit Latte oben', () => {
    const gruppe = darstellungen.linie.baue(new Linie('l', [p(0, 0), p(10, 0)], { ...WEG, typ: 'zaun' }));
    const teile = meshes(gruppe);
    const pfosten = teile.filter((m) => (m.geometry as THREE.BoxGeometry).parameters.height === 1);
    expect(pfosten.map((m) => m.position.x)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(pfosten.every((m) => m.position.y === 0.5)).toBe(true);
    const latten = teile.filter((m) => !pfosten.includes(m));
    expect(latten).toHaveLength(1);
    expect(box(latten[0] as THREE.Object3D).max.y).toBeCloseTo(1, 5);
    expect(teile.every((m) => teilDaten(m)?.klickbar === true && teilDaten(m)?.art === 'linie')).toBe(true);
  });

  it('Zaun: die Ecke bekommt einen Pfosten, der Abstand bleibt höchstens 2 m', () => {
    const gruppe = darstellungen.linie.baue(new Linie('l', [p(0, 0), p(5, 0), p(5, 3)], { ...WEG, typ: 'zaun' }));
    const pfosten = meshes(gruppe).filter((m) => (m.geometry as THREE.BoxGeometry).parameters.height === 1);
    const erwartet = [
      [0, 0],
      [5 / 3, 0],
      [10 / 3, 0],
      [5, 0],
      [5, 1.5],
      [5, 3],
    ];
    expect(pfosten).toHaveLength(erwartet.length);
    pfosten.forEach((m, i) => {
      expect(m.position.x).toBeCloseTo(erwartet[i]?.[0] ?? Number.NaN, 9);
      expect(m.position.z).toBeCloseTo(erwartet[i]?.[1] ?? Number.NaN, 9);
    });
  });

  it('Grenze: gestrichelte Linie am Boden, dazu eine unsichtbare Klickfläche', () => {
    const gruppe = darstellungen.linie.baue(new Linie('l', [p(0, 0), p(10, 0)], { ...WEG, typ: 'grenze' }));
    const linien: THREE.Line[] = [];
    gruppe.traverse((k) => k instanceof THREE.Line && linien.push(k));
    expect(linien).toHaveLength(1);
    expect(linien[0]?.material).toBeInstanceOf(THREE.LineDashedMaterial);
    expect(box(linien[0] as THREE.Object3D).min.y).toBe(BODEN_HOEHEN.linie);
    const klick = meshes(gruppe);
    expect(klick).toHaveLength(1);
    expect(teilDaten(klick[0] as THREE.Object3D)?.normal).toBe(UNSICHTBAR);
    expect(teilDaten(klick[0] as THREE.Object3D)?.klickbar).toBe(true);
  });

  it('die Szene gibt Linien und Zonen nach Auswahl-Klickziel frei und baut bei geänderten Parametern neu', () => {
    const inhalt = new SzenenInhalt();
    const l = new Linie('l', [p(0, 0), p(10, 0)], WEG);
    inhalt.zeige(Bauwerk.leer().mit(l), new Set(), null);
    expect(inhalt.ziele([])).toEqual([]);
    expect(inhalt.ziele(['linie']).length).toBeGreaterThan(0);
    inhalt.zeige(Bauwerk.leer().mit(l.mitParams({ ...WEG, typ: 'zaun' })), new Set(), null);
    expect(inhalt.ziele(['linie']).length).toBeGreaterThan(1);
  });

  it('markiert: Zone und Linie wechseln auf ihr Markierungsmaterial', () => {
    const inhalt = new SzenenInhalt();
    const z = new Zone('z', [p(0, 0), p(4, 0), p(0, 4)], { name: 'Z', farbe: '#4dabf7', deckkraft: 40 });
    inhalt.zeige(Bauwerk.leer().mit(z), new Set(['z']), null);
    const f = inhalt.ziele(['zone'])[0] as THREE.Mesh;
    expect(f.material).toBe(ZONE_MARKIERT);
    inhalt.zeige(Bauwerk.leer().mit(z), new Set(), null);
    expect(f.material).not.toBe(ZONE_MARKIERT);
  });
});

describe('Zeichnungs-Vorschau in der Szene', () => {
  it('zeigt Punkte und Linienzug; geschlossen schließt zum Vieleck; null entfernt alles', () => {
    const inhalt = new SzenenInhalt();
    const zeichnung = { punkte: [p(0, 0), p(4, 0), p(4, 4)], geschlossen: true };
    inhalt.zeige(Bauwerk.leer(), new Set(), null, zeichnung);
    const vorschau = inhalt.wurzel.getObjectByName('zeichnung') as THREE.Group;
    expect(vorschau).toBeDefined();
    const kugeln = vorschau.children.filter((k) => k instanceof THREE.Mesh);
    const zuege = vorschau.children.filter((k): k is THREE.Line => k instanceof THREE.Line);
    expect(kugeln).toHaveLength(3);
    expect(zuege).toHaveLength(1);
    expect(zuege[0]).toBeInstanceOf(THREE.LineLoop);
    inhalt.zeige(Bauwerk.leer(), new Set(), null, { punkte: [p(0, 0), p(4, 0)], geschlossen: false });
    const offen = (inhalt.wurzel.getObjectByName('zeichnung') as THREE.Group).children.filter((k) => k instanceof THREE.Line);
    expect(offen[0]).not.toBeInstanceOf(THREE.LineLoop);
    inhalt.zeige(Bauwerk.leer(), new Set(), null, null);
    expect(inhalt.wurzel.getObjectByName('zeichnung')).toBeUndefined();
  });

  it('bei gleicher Zeichnung bleibt das Mesh stehen', () => {
    const inhalt = new SzenenInhalt();
    const zeichnung = { punkte: [p(0, 0), p(4, 0)], geschlossen: false };
    inhalt.zeige(Bauwerk.leer(), new Set(), null, zeichnung);
    const a = inhalt.wurzel.getObjectByName('zeichnung');
    inhalt.zeige(Bauwerk.leer(), new Set(), null, zeichnung);
    expect(inhalt.wurzel.getObjectByName('zeichnung')).toBe(a);
  });
});
