import * as THREE from 'three';
import type { Seil } from '../../model/Seil';
import { alsTeil, type Darstellung } from './Darstellung';
import { zylinder } from './formen';
import { MARKIERT, SEIL, UNSICHTBAR } from './materialien';

const SEIL_RADIUS = 0.005; // Ø 1 cm, nur optisch
const SEIL_GREIFRADIUS = 0.05; // unsichtbarer Mantel, damit man ein dünnes Seil anklicken kann

export class SeilDarstellung implements Darstellung<Seil> {
  baue(s: Seil): THREE.Group {
    const basis = { objektId: s.id, teilId: s.id, art: 'seil' as const };
    const sichtbar = alsTeil(zylinder(s.start, s.ende, SEIL_RADIUS, SEIL), { ...basis, klickbar: false, normal: SEIL, markiert: MARKIERT });
    const greifbar = alsTeil(zylinder(s.start, s.ende, SEIL_GREIFRADIUS, UNSICHTBAR), { ...basis, klickbar: true, normal: UNSICHTBAR, markiert: null });
    return new THREE.Group().add(sichtbar, greifbar);
  }
}
