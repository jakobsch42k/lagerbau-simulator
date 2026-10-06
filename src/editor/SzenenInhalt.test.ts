import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import type { ArtName } from '../model/LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Plane } from '../model/Plane';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { teilDaten } from './darstellung/Darstellung';
import { HOLZ, MARKIERT, SEIL, UNSICHTBAR } from './darstellung/materialien';
import { standardDarstellungen } from './darstellung/standardDarstellungen';
import { SzenenInhalt } from './SzenenInhalt';

const KEINE: ReadonlySet<string> = new Set();
const d = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const l = new Seil('l', d.spitze(), new Vec3(2, 0, 0));
const b1 = Bauwerk.von([d, l]);

/** Ein SzenenInhalt, dessen baue-Aufrufe gezählt werden. Ohne WebGL: three.js baut Geometrie auch so. */
const mitZaehler = (): { inhalt: SzenenInhalt; baue: () => number } => {
  const darstellungen = standardDarstellungen();
  const spione = Object.values(darstellungen).map((x) => vi.spyOn(x, 'baue'));
  return { inhalt: new SzenenInhalt(darstellungen), baue: () => spione.reduce((n, s) => n + s.mock.calls.length, 0) };
};

const frisch = (bauwerk: Bauwerk): SzenenInhalt => {
  const inhalt = new SzenenInhalt();
  inhalt.zeige(bauwerk, KEINE, null);
  return inhalt;
};

const meshe = (inhalt: SzenenInhalt, teilId: string): THREE.Mesh[] => {
  const gefunden: THREE.Mesh[] = [];
  inhalt.wurzel.traverse((k) => {
    if (k instanceof THREE.Mesh && teilDaten(k)?.teilId === teilId) gefunden.push(k);
  });
  return gefunden;
};

/** Alle Objekt-Meshes mit Teil-id, Lage und Ausdehnung der Geometrie, sortiert. */
const fingerabdruck = (inhalt: SzenenInhalt): string[] => {
  const zeilen: string[] = [];
  inhalt.wurzel.traverse((k) => {
    const daten = teilDaten(k);
    if (!(k instanceof THREE.Mesh) || !daten) return;
    k.geometry.computeBoundingSphere();
    const kugel = k.geometry.boundingSphere;
    const zahlen = [...k.position.toArray(), ...(kugel ? [...kugel.center.toArray(), kugel.radius] : [])];
    zeilen.push(`${daten.objektId}/${daten.teilId}@${zahlen.map((z) => z.toFixed(3)).join(',')}`);
  });
  return zeilen.sort();
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SzenenInhalt (Spec v3, D5)', () => {
  it('baut bei einem Auswahlwechsel nichts, bei einem geänderten Objekt genau eines', () => {
    const { inhalt, baue } = mitZaehler();
    inhalt.zeige(b1, KEINE, null);
    expect(baue()).toBe(2);
    inhalt.zeige(b1, new Set(['d']), null);
    inhalt.zeige(b1, new Set(['l']), null);
    expect(baue()).toBe(2);
    inhalt.zeige(b1.ersetze(d.gedreht(0.2)), new Set(['d']), null);
    expect(baue()).toBe(3);
  });

  it('färbt nur um: eine einzelne Gruppenstange oder die ganze Gruppe', () => {
    const { inhalt, baue } = mitZaehler();
    inhalt.zeige(b1, new Set(['d-bein-1']), null);
    expect(meshe(inhalt, 'd-bein-1')[0]?.material).toBe(MARKIERT);
    expect(meshe(inhalt, 'd-bein-0')[0]?.material).toBe(HOLZ);
    expect(meshe(inhalt, 'd-bein-2')[0]?.material).toBe(HOLZ);
    inhalt.zeige(b1, new Set(['d']), null);
    expect(['d-bein-0', 'd-bein-1', 'd-bein-2'].every((id) => meshe(inhalt, id)[0]?.material === MARKIERT)).toBe(true);
    inhalt.zeige(b1, new Set(['l']), null);
    expect(meshe(inhalt, 'l').map((m) => m.material)).toEqual([MARKIERT, UNSICHTBAR]);
    expect(meshe(inhalt, 'd-bein-1')[0]?.material).toBe(HOLZ);
    expect(baue()).toBe(2);
  });

  it('zeigt nach Rückgängig genau den alten Stand, ohne Geister und ohne Lücken', () => {
    const { inhalt, baue } = mitZaehler();
    const b2 = b1.ersetze(d.gedreht(0.3));
    const b3 = b2.ohne('l');
    for (const b of [b1, b2, b3, b2, b1]) inhalt.zeige(b, KEINE, null);
    expect(fingerabdruck(inhalt)).toEqual(fingerabdruck(frisch(b1)));
    expect(inhalt.wurzel.children).toHaveLength(3); // d, l, ableitungen
    // b1: d, l · b2: d · b3: nichts · b2: l (war entfernt) · b1: d (das alte Dreibein ist nicht === dem gedrehten)
    expect(baue()).toBe(2 + 1 + 0 + 1 + 1);
  });

  it('entfernt beim Löschen alle Meshes des Objekts und gibt nur deren Geometrie frei', () => {
    const inhalt = frisch(b1);
    const seilMeshe = meshe(inhalt, 'l');
    expect(seilMeshe).toHaveLength(2);
    const freigaben = seilMeshe.map((m) => vi.spyOn(m.geometry, 'dispose'));
    const materialien = [SEIL, UNSICHTBAR, MARKIERT].map((m) => vi.spyOn(m, 'dispose'));
    inhalt.zeige(b1.ohne('l'), KEINE, null);
    expect(meshe(inhalt, 'l')).toEqual([]);
    expect(inhalt.wurzel.getObjectByName('l')).toBeUndefined();
    for (const f of freigaben) expect(f).toHaveBeenCalledOnce();
    for (const m of materialien) expect(m).not.toHaveBeenCalled();
  });

  it('baut die Ableitungen nur bei einem neuen Bauwerk neu', () => {
    const inhalt = frisch(b1);
    const vorher = inhalt.wurzel.getObjectByName('ableitungen');
    expect(vorher?.children).toHaveLength(3); // ein Bund an der Spitze, ein Haring, der Platzrahmen
    inhalt.zeige(b1, new Set(['d']), new Vec3(1, 0, 1));
    expect(inhalt.wurzel.getObjectByName('ableitungen')).toBe(vorher);
    inhalt.zeige(b1.ohne('l'), KEINE, null);
    const nachher = inhalt.wurzel.getObjectByName('ableitungen');
    expect(nachher).not.toBe(vorher);
    expect(nachher?.children).toHaveLength(2);
    expect(inhalt.wurzel.children.filter((k) => k.name === 'ableitungen')).toHaveLength(1);
  });

  it('zeigt den Startpunkt eines Zwei-Klick-Werkzeugs und nimmt ihn wieder weg', () => {
    const inhalt = frisch(b1);
    const start = new Vec3(1, 0, 1);
    inhalt.zeige(b1, KEINE, start);
    const kugel = inhalt.wurzel.getObjectByName('start');
    expect(kugel?.position.toArray()).toEqual([1, 0, 1]);
    inhalt.zeige(b1, KEINE, start);
    expect(inhalt.wurzel.getObjectByName('start')).toBe(kugel);
    inhalt.zeige(b1, KEINE, null);
    expect(inhalt.wurzel.getObjectByName('start')).toBeUndefined();
  });

  it('nennt Stangen und Stämme immer als Klickziele, Seile und Planen nur auf Wunsch des Werkzeugs (Spec v2b, D2)', () => {
    const a = new ABock('a', new Vec3(6, 0, 0), 0, STANDARD_ABOCK);
    const plane = new Plane('pl', new Vec3(0, 2, 5), new Vec3(4, 2, 5), STANDARD_PLANE);
    const inhalt = frisch(Bauwerk.von([a, l, plane, new Baum('b', new Vec3(9, 0, 9), STANDARD_BAUM)]));
    const ziele = (klickZiele: readonly ArtName[]): string[] => inhalt.ziele(klickZiele).map((k) => teilDaten(k)?.teilId ?? '?').sort();
    expect(ziele([])).toEqual(['a-bein-0', 'a-bein-1', 'a-riegel', 'b']);
    expect(ziele(['plane'])).toEqual(['a-bein-0', 'a-bein-1', 'a-riegel', 'b', 'pl']);
    expect(ziele(['seil', 'plane'])).toEqual(['a-bein-0', 'a-bein-1', 'a-riegel', 'b', 'l', 'pl']);
  });

  it('macht aus einem getroffenen Mesh einen Treffer mit Teil-id und Art des Objekts', () => {
    const inhalt = frisch(Bauwerk.von([new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK)]));
    const riegel = meshe(inhalt, 'a-riegel')[0];
    const punkt = new Vec3(0.3, 0.4, 0);
    expect(riegel && SzenenInhalt.treffer(riegel, punkt)).toEqual({ art: 'objekt', objektArt: 'abock', id: 'a-riegel', punkt });
    expect(SzenenInhalt.treffer(new THREE.Mesh(), punkt)).toBeNull();
  });
});
