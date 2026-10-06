import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../../beispiele/kochstelle';
import { ABock } from '../../model/ABock';
import { Baum } from '../../model/Baum';
import { Bauwerk } from '../../model/Bauwerk';
import { ART_NAMEN } from '../../model/LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_PLANE } from '../../model/params';
import { Plane } from '../../model/Plane';
import { Seil } from '../../model/Seil';
import { Stange } from '../../model/Stange';
import { Vec3 } from '../../model/Vec3';
import { baueAbleitungen } from './Ableitungen';
import { type TeilDaten, teilDaten } from './Darstellung';
import { HOLZ, KRONE, MARKIERT, PLANE, PLANE_MARKIERT, SEIL, STAMM, UNSICHTBAR } from './materialien';
import { standardDarstellungen } from './standardDarstellungen';

const darstellungen = standardDarstellungen();
const teile = (gruppe: THREE.Group): TeilDaten[] => gruppe.children.map((k) => teilDaten(k)).filter((t): t is TeilDaten => t !== undefined);

describe('Darstellung je Art (Spec v3, D2)', () => {
  it('gibt es für jede Art', () => {
    expect(Object.keys(darstellungen).sort()).toEqual([...ART_NAMEN].sort());
  });

  it('Baugruppe: ein Holzzylinder je Stange mit Objekt-id, Teil-id und Art', () => {
    const a = new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK);
    expect(teile(darstellungen.abock.baue(a))).toEqual(
      ['a-bein-0', 'a-bein-1', 'a-riegel'].map((teilId) => ({ objektId: 'a', teilId, art: 'abock', klickbar: true, normal: HOLZ, markiert: MARKIERT })),
    );
  });

  it('Stange: ein Zylinder mit der Art stange, mittig zwischen den Enden', () => {
    const gruppe = darstellungen.stange.baue(new Stange('s', Vec3.NULL, new Vec3(0, 2, 0), 0.08));
    expect(teile(gruppe)).toEqual([{ objektId: 's', teilId: 's', art: 'stange', klickbar: true, normal: HOLZ, markiert: MARKIERT }]);
    expect(gruppe.children[0]?.position.toArray()).toEqual([0, 1, 0]);
  });

  it('Seil: sichtbar dünn, angeklickt wird der unsichtbare Mantel', () => {
    const gruppe = darstellungen.seil.baue(new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0)));
    expect(teile(gruppe).map((t) => [t.teilId, t.klickbar, t.normal, t.markiert])).toEqual([
      ['l', false, SEIL, MARKIERT],
      ['l', true, UNSICHTBAR, null],
    ]);
  });

  it('Baum: der Stamm fängt Klicks und wird hervorgehoben, die Krone nicht', () => {
    const gruppe = darstellungen.baum.baue(new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM));
    expect(teile(gruppe).map((t) => [t.klickbar, t.normal, t.markiert])).toEqual([
      [true, STAMM, MARKIERT],
      [false, KRONE, null],
    ]);
  });

  it('Plane: ein Mesh mit zwei Dreiecken je Fläche', () => {
    const eben = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);
    const gruppe = darstellungen.plane.baue(eben);
    expect(teile(gruppe)).toEqual([{ objektId: 'pl', teilId: 'pl', art: 'plane', klickbar: true, normal: PLANE, markiert: PLANE_MARKIERT }]);
    expect((gruppe.children[0] as THREE.Mesh).geometry.getAttribute('position').count).toBe(6);
    const sattel = darstellungen.plane.baue(eben.mitParams({ ...STANDARD_PLANE, form: 'satteldach' }));
    expect((sattel.children[0] as THREE.Mesh).geometry.getAttribute('position').count).toBe(12);
  });

  it('Ableitungen: Bünde, Haringe und Platzrahmen; ein leeres Bauwerk hat keine', () => {
    const gruppe = baueAbleitungen(kochstelle());
    expect(gruppe.name).toBe('ableitungen');
    expect(gruppe.children.filter((k) => k instanceof THREE.Mesh)).toHaveLength(4); // 4 Bünde, keine Haringe
    expect(gruppe.children.filter((k) => k instanceof THREE.LineLoop)).toHaveLength(1);
    expect(baueAbleitungen(Bauwerk.leer()).children).toEqual([]);
  });
});
