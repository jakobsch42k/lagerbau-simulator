import * as THREE from 'three';
import type { Platzobjekt } from '../../model/Platzobjekt';
import { alsTeil, type Darstellung } from './Darstellung';
import { MARKIERT } from './materialien';
import { textSprite } from './textSprite';

/** Mindesthöhe: ein Objekt mit Höhe 0 ist eine 1 cm dicke Scheibe bzw. Platte auf dem Boden (Spec E3, D1). */
const MIN_HOEHE = 0.01;
const NAME_HOEHE = 0.5; // m, Schrifthöhe des Namens über dem Objekt
const NAME_ABSTAND = 0.1; // m zwischen Oberkante und Namen
const KREIS_SEGMENTE = 32;

/** Zylinder bzw. Quader in der Farbe des Objekts, der Name als Beschriftung darüber (Spec E3, D1). */
export class PlatzobjektDarstellung implements Darstellung<Platzobjekt> {
  baue(o: Platzobjekt): THREE.Group {
    const { form, breite, laenge, hoehe, farbe, name } = o.params;
    const h = Math.max(hoehe, MIN_HOEHE);
    const geometrie =
      form === 'kreis' ? new THREE.CylinderGeometry(breite / 2, breite / 2, h, KREIS_SEGMENTE) : new THREE.BoxGeometry(breite, h, laenge);
    const material = new THREE.MeshLambertMaterial({ color: farbe });
    const koerper = alsTeil(new THREE.Mesh(geometrie, material), {
      objektId: o.id,
      teilId: o.id,
      art: 'platzobjekt',
      klickbar: true,
      normal: material,
      markiert: MARKIERT,
    });
    koerper.userData.eigenesMaterial = true;
    koerper.position.set(o.position.x, h / 2, o.position.z);
    // Wie Baugruppe.drehung: positiv dreht x nach z, in three.js ist das eine negative Drehung um y.
    koerper.rotation.y = -o.drehungRad;
    const beschriftung = textSprite(name, '#1d2733', NAME_HOEHE);
    beschriftung.position.set(o.position.x, h + NAME_ABSTAND + NAME_HOEHE / 2, o.position.z);
    return new THREE.Group().add(koerper, beschriftung);
  }
}
