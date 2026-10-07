import * as THREE from 'three';

/** Pixelhöhe der Schrift in der Textur; bestimmt nur die Schärfe, die Größe in der Szene kommt aus der Höhe in Metern. */
const TEXTUR_HOEHE_PX = 96;
const RAND_PX = 12;
const UMRISS_PX = 10;
/** Seitenverhältnis ohne Canvas (Tests ohne DOM): grob die Breite eines Zeichens im Verhältnis zur Höhe. */
const ZEICHEN_BREITE = 0.55;

/** Ein Sprite, das `text` in `farbe` zeigt, `hoehe` m hoch; es dreht sich zur Kamera und bleibt in der Planansicht lesbar. */
export function textSprite(text: string, farbe: string, hoehe: number): THREE.Sprite {
  const leinwand = typeof document === 'undefined' ? null : document.createElement('canvas');
  const zeichner = leinwand?.getContext('2d') ?? null;
  const material = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  let seitenverhaeltnis = Math.max(1, text.length * ZEICHEN_BREITE);
  if (leinwand && zeichner) {
    const schrift = `bold ${TEXTUR_HOEHE_PX}px sans-serif`;
    zeichner.font = schrift;
    const textBreite = Math.ceil(zeichner.measureText(text).width);
    leinwand.width = textBreite + 2 * RAND_PX;
    leinwand.height = TEXTUR_HOEHE_PX + 2 * RAND_PX;
    zeichner.font = schrift; // Die Größe der Leinwand zu ändern setzt die Schrift zurück.
    zeichner.textBaseline = 'middle';
    zeichner.textAlign = 'center';
    zeichner.lineJoin = 'round';
    zeichner.lineWidth = UMRISS_PX;
    zeichner.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    zeichner.fillStyle = farbe;
    zeichner.strokeText(text, leinwand.width / 2, leinwand.height / 2);
    zeichner.fillText(text, leinwand.width / 2, leinwand.height / 2);
    const textur = new THREE.CanvasTexture(leinwand);
    textur.colorSpace = THREE.SRGBColorSpace;
    material.map = textur;
    seitenverhaeltnis = leinwand.width / leinwand.height;
  } else {
    material.color.set(farbe);
  }
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(hoehe * seitenverhaeltnis, hoehe, 1);
  sprite.userData.beschriftung = true;
  sprite.userData.eigenesMaterial = true;
  return sprite;
}
