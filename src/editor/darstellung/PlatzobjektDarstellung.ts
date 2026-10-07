import * as THREE from 'three';
import type { Platzobjekt } from '../../model/Platzobjekt';
import type { Darstellung } from './Darstellung';
import { MARKIERT } from './materialien';
import { platzKoerper } from './platzKoerper';
import { TeilBauer } from './teilBauer';
import { textSprite } from './textSprite';

/** Mindesthöhe: ein Objekt mit Höhe 0 ist eine 1 cm dicke Scheibe bzw. Platte auf dem Boden (Spec E3, D1). */
const MIN_HOEHE = 0.01;
const NAME_HOEHE = 0.5; // m, Schrifthöhe des Namens über dem Objekt
const NAME_ABSTAND = 0.1; // m zwischen Oberkante und Namen

/**
 * Gestalt der Vorlage aus einfachen Körpern (`platzKoerper`), immer genau in Breite, Länge und Höhe des Objekts;
 * der Name steht als Beschriftung darüber (Spec E3, D1).
 */
export class PlatzobjektDarstellung implements Darstellung<Platzobjekt> {
  baue(o: Platzobjekt): THREE.Group {
    const { hoehe, name } = o.params;
    const h = Math.max(hoehe, MIN_HOEHE);
    const koerper = new THREE.Group();
    koerper.position.set(o.position.x, 0, o.position.z);
    // Wie Baugruppe.drehung: positiv dreht x nach z, in three.js ist das eine negative Drehung um y.
    koerper.rotation.y = -o.drehungRad;
    koerper.add(...platzKoerper(o.params, h, new TeilBauer(o.id, 'platzobjekt', MARKIERT)));
    const beschriftung = textSprite(name, '#1d2733', NAME_HOEHE);
    beschriftung.position.set(o.position.x, h + NAME_ABSTAND + NAME_HOEHE / 2, o.position.z);
    return new THREE.Group().add(koerper, beschriftung);
  }
}
