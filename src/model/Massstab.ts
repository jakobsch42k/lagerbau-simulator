import type { Vec3 } from './Vec3';

/** Liegen die zwei Klicks weniger als so viele Bildpixel auseinander, wird kein Maßstab gesetzt (Spec E2, D2). */
export const MIN_PUNKTABSTAND_PX = 10;

/** Abstand zweier Bodenpunkte in Bildpixeln beim aktuellen Maßstab. Nur x und z zählen. */
export function pixelAbstand(a: Vec3, b: Vec3, meterProPixel: number): number {
  return Math.hypot(b.x - a.x, b.z - a.z) / meterProPixel;
}

/** Wirft „Punkte zu nah beieinander“, wenn die Punkte weniger als 10 Bildpixel auseinanderliegen. */
export function pruefePunktabstand(a: Vec3, b: Vec3, meterProPixel: number): void {
  if (pixelAbstand(a, b, meterProPixel) < MIN_PUNKTABSTAND_PX) throw new RangeError('Punkte zu nah beieinander');
}

/**
 * Neuer Maßstab aus zwei Klicks auf das Bild und dem Abstand, den man kennt: `meterProPixel = Meter / Pixelabstand`.
 * `meterProPixelAlt` ist der Maßstab, in dem die Klickpunkte liegen. Wirft RangeError (deutsch) bei zu nahen Punkten oder Meter ≤ 0.
 */
export function massstabAusPunkten(a: Vec3, b: Vec3, meter: number, meterProPixelAlt: number): number {
  pruefePunktabstand(a, b, meterProPixelAlt);
  if (!(meter > 0) || !Number.isFinite(meter)) throw new RangeError('Maßstab muss größer als 0 sein');
  return meter / pixelAbstand(a, b, meterProPixelAlt);
}
