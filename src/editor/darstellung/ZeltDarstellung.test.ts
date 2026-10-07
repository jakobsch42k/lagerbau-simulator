import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { findeZeltVorlage, paramsAusZeltVorlage } from '../../arten/zelt/vorlagen';
import { Bauwerk } from '../../model/Bauwerk';
import { Vec3 } from '../../model/Vec3';
import { Zelt } from '../../model/Zelt';
import { ZeltGeometrie } from '../../model/ZeltGeometrie';
import { SzenenInhalt } from '../SzenenInhalt';
import { teilDaten } from './Darstellung';
import { standardDarstellungen } from './standardDarstellungen';
import { ZELT_MARKIERT } from './materialien';

const KEINE: ReadonlySet<string> = new Set();

const zelt = (schluessel: string, drehung = 0, position = new Vec3(3, 0, -2)): Zelt => {
  const v = findeZeltVorlage(schluessel);
  if (!v) throw new Error('Vorlage fehlt');
  return new Zelt('z', position, paramsAusZeltVorlage(v), drehung);
};

const teile = (g: THREE.Object3D): THREE.Mesh[] => {
  const meshe: THREE.Mesh[] = [];
  g.traverse((k) => {
    if (k instanceof THREE.Mesh) meshe.push(k);
  });
  return meshe;
};

/** Meshes ohne Haringe (Dach und Wände). */
const koerper = (g: THREE.Object3D): THREE.Mesh[] => teile(g).filter((m) => m.geometry.type === 'BufferGeometry');
const haringe = (g: THREE.Object3D): THREE.Mesh[] => teile(g).filter((m) => m.geometry.type === 'CylinderGeometry');

const scheitel = (m: THREE.Mesh): THREE.Vector3[] => {
  const p = m.geometry.getAttribute('position');
  return Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i));
};

/** Float32 der Geometrie: auf Millimeter genau vergleichen. */
const nah = (a: number, b: number): boolean => Math.abs(a - b) < 1e-4;

describe('ZeltDarstellung (Spec E4, D4)', () => {
  const darstellung = standardDarstellungen().zelt;

  it('rund: Dach plus drei Wandsektoren, Haringe, Seillinien; alles trägt Objekt-, Teil-id und Art', () => {
    const g = darstellung.baue(zelt('jurte6'));
    expect(koerper(g)).toHaveLength(4);
    expect(haringe(g)).toHaveLength(12);
    for (const m of teile(g)) expect([teilDaten(m)?.objektId, teilDaten(m)?.teilId, teilDaten(m)?.art]).toEqual(['z', 'z', 'zelt']);
    let linien = 0;
    g.traverse((k) => {
      if (k instanceof THREE.LineSegments && k.userData.rolle === 'seil') linien += k.geometry.getAttribute('position').count / 2;
    });
    expect(linien).toBe(12);
  });

  it('rund: Dach reicht von wandhoehe bis firsthoehe, Wände bis wandhoehe', () => {
    const z = zelt('jurte6');
    const [dach, ...waende] = koerper(darstellung.baue(z));
    const ys = scheitel(dach as THREE.Mesh).map((v) => v.y);
    expect(Math.min(...ys)).toBeCloseTo(z.params.wandhoehe, 4);
    expect(Math.max(...ys)).toBeCloseTo(z.params.firsthoehe, 4);
    for (const w of waende) {
      const wy = scheitel(w).map((v) => v.y);
      expect(Math.min(...wy)).toBeCloseTo(0, 4);
      expect(Math.max(...wy)).toBeCloseTo(z.params.wandhoehe, 4);
    }
  });

  it('eine ausgeschaltete Wand fehlt', () => {
    const z = zelt('jurte6');
    const ohne = z.mitParams({ ...z.params, waende: [true, false, true] });
    expect(koerper(darstellung.baue(ohne))).toHaveLength(3);
    const keine = z.mitParams({ ...z.params, waende: [false, false, false] });
    expect(koerper(darstellung.baue(keine))).toHaveLength(1);
  });

  it('Wand 2 liegt im Sektor 120° bis 240° der Zeltdrehung', () => {
    const z = zelt('jurte6', 0, Vec3.NULL);
    const wand2 = koerper(darstellung.baue(z))[2] as THREE.Mesh;
    for (const v of scheitel(wand2)) {
      const grad = ((Math.atan2(v.z, v.x) * 180) / Math.PI + 360) % 360;
      expect(grad).toBeGreaterThanOrEqual(120 - 1e-6);
      expect(grad).toBeLessThanOrEqual(240 + 1e-6);
    }
  });

  it('doppelkegel: zwei Spitzen auf firsthoehe bei ±(Länge − Breite)/2, Wände bis wandhoehe', () => {
    const z = zelt('doppelkegler', 0, Vec3.NULL);
    const [dach, waende] = koerper(darstellung.baue(z)) as [THREE.Mesh, THREE.Mesh];
    const spitzen = scheitel(dach).filter((v) => nah(v.y, z.params.firsthoehe));
    // Der First liegt auf firsthoehe zwischen den beiden Mittelstangen bei ±0,775.
    const xs = spitzen.map((v) => v.x);
    expect(Math.max(...xs)).toBeCloseTo(0.775, 6);
    expect(Math.min(...xs)).toBeCloseTo(-0.775, 6);
    // Das Oval hat nur eine niedrige Wand; höher reichen allein die Seitenteile des Vorbaus (|x| = 0,78).
    expect(Math.max(...scheitel(waende).filter((v) => Math.abs(v.x) > 0.8).map((v) => v.y))).toBeCloseTo(z.params.wandhoehe, 4);
  });

  it('sattel: First entlang der Länge auf firsthoehe', () => {
    const z = zelt('hanger', 0, Vec3.NULL);
    const [dach] = koerper(darstellung.baue(z)) as [THREE.Mesh];
    const first = scheitel(dach).filter((v) => nah(v.y, z.params.firsthoehe));
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((v) => v.z === 0)).toBe(true);
    expect(Math.max(...first.map((v) => v.x))).toBeCloseTo(z.params.laenge / 2, 4);
    expect(Math.min(...first.map((v) => v.x))).toBeCloseTo(-z.params.laenge / 2, 4);
  });

  it('Haringe stehen in der Welt an den Punkten von ZeltGeometrie, auch gedreht', () => {
    const z = zelt('doppelkegler', 0.7);
    const g = darstellung.baue(z);
    g.updateMatrixWorld(true);
    const welt = haringe(g).map((m) => m.getWorldPosition(new THREE.Vector3()));
    const soll = ZeltGeometrie.haringe(z);
    expect(welt).toHaveLength(soll.length);
    soll.forEach((p, i) => {
      expect(welt[i]?.x).toBeCloseTo(p.x, 6);
      expect(welt[i]?.z).toBeCloseTo(p.z, 6);
    });
  });

  it('der Name hängt an „Beschriftungen zeigen“', () => {
    const inhalt = new SzenenInhalt();
    inhalt.zeige(Bauwerk.leer().mit(zelt('jurte6')), KEINE, null);
    const namen: THREE.Sprite[] = [];
    inhalt.wurzel.traverse((k) => {
      if (k instanceof THREE.Sprite) namen.push(k);
    });
    expect(namen).toHaveLength(1);
    expect(namen[0]?.userData.beschriftung).toBe(true);
    inhalt.setzeBeschriftungen(false);
    expect(namen[0]?.visible).toBe(false);
  });

  it('Auswahl färbt Dach und Wände um, Haringe bleiben', () => {
    const inhalt = new SzenenInhalt();
    inhalt.zeige(Bauwerk.leer().mit(zelt('jurte6')), new Set(['z']), null);
    const gruppe = inhalt.wurzel.getObjectByName('z') as THREE.Group;
    expect(koerper(gruppe).every((m) => m.material === ZELT_MARKIERT)).toBe(true);
    expect(haringe(gruppe).every((m) => m.material !== ZELT_MARKIERT)).toBe(true);
  });

  it('Szene ohne WebGL: Auswahlwechsel baut nichts neu, ein geändertes Zelt genau einmal', () => {
    const darstellungen = standardDarstellungen();
    const spion = vi.spyOn(darstellungen.zelt, 'baue');
    const inhalt = new SzenenInhalt(darstellungen);
    const z = zelt('jurte6');
    inhalt.zeige(Bauwerk.leer().mit(z), KEINE, null);
    expect(spion).toHaveBeenCalledTimes(1);
    inhalt.zeige(Bauwerk.leer().mit(z), new Set(['z']), null);
    inhalt.zeige(Bauwerk.leer().mit(z), KEINE, null);
    expect(spion).toHaveBeenCalledTimes(1);
    inhalt.zeige(Bauwerk.leer().mit(z.gedreht(0.3)), KEINE, null);
    expect(spion).toHaveBeenCalledTimes(2);
  });
});
