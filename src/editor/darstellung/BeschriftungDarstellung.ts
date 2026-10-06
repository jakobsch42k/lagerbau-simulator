import * as THREE from 'three';
import type { Beschriftung } from '../../model/Beschriftung';
import { alsTeil, type Darstellung } from './Darstellung';
import { BESCHRIFTUNG_MARKIERT, UNSICHTBAR } from './materialien';
import { textSprite } from './textSprite';

const FLAECHE_Y = 0.03; // m, knapp über Boden, Raster und Bild
const TEXT_ABSTAND = 0.02; // m zwischen Boden und Unterkante des Textes

/**
 * Der Text als Sprite, Höhe in Metern, knapp über dem Boden (Spec E3, D1). Darunter liegt eine flache, unsichtbare Fläche in
 * Textgröße: Sie fängt Klicks in der Planansicht und zeigt die Auswahl. Beide hängen am Schalter „Beschriftungen zeigen“.
 */
export class BeschriftungDarstellung implements Darstellung<Beschriftung> {
  baue(b: Beschriftung): THREE.Group {
    const { text, groesse, farbe } = b.params;
    const daten = { objektId: b.id, teilId: b.id, art: 'beschriftung' as const, klickbar: true };
    const sprite = textSprite(text, farbe, groesse);
    sprite.position.set(b.position.x, groesse / 2 + TEXT_ABSTAND, b.position.z);
    alsTeil(sprite, { ...daten, normal: sprite.material, markiert: null });
    const flaeche = alsTeil(new THREE.Mesh(new THREE.PlaneGeometry(sprite.scale.x, groesse), UNSICHTBAR), {
      ...daten,
      normal: UNSICHTBAR,
      markiert: BESCHRIFTUNG_MARKIERT,
    });
    flaeche.rotation.x = -Math.PI / 2;
    flaeche.position.set(b.position.x, FLAECHE_Y, b.position.z);
    flaeche.userData.beschriftung = true;
    return new THREE.Group().add(sprite, flaeche);
  }
}
