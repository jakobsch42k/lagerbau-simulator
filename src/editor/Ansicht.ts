import type { Bauwerk } from '../model/Bauwerk';
import { Vec3 } from '../model/Vec3';

/** Spec E1, D5: 10 % Rand um alles beim „Alles zeigen“. */
export const EINPASS_RAND = 0.1;
/** Bei einem leeren Bauwerk wird der Boden eingepasst (m, Seitenlänge). */
export const LEERER_BODEN = 40;
/** Kleinste halbe Ausdehnung beim Einpassen (m), damit ein einzelner Punkt nicht unendlich nah herangezoomt wird. */
const MIN_HALBE_AUSDEHNUNG = 1;
/** Längen der Maßstabsleiste (m) und die gewünschte Breite in Pixel. */
const MASSSTAB_LAENGEN = [1, 2, 5, 10, 20, 50] as const;
export const MASSSTAB_MIN_PX = 80;
export const MASSSTAB_MAX_PX = 160;

export type AnsichtsArt = 'plan' | 'drei-d';

/** Achsparalleler Quader um die sichtbaren Punkte. */
export interface Rahmen {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/** Wie die Planansicht eingestellt wird: Mitte am Boden und halbe Höhe des Ausschnitts in m. */
export interface PlanAusschnitt {
  readonly mitteX: number;
  readonly mitteZ: number;
  readonly halbeHoehe: number;
}

/** Wohin die 3D-Kamera schaut und wie weit sie vom Ziel entfernt ist. */
export interface DreiDAusschnitt {
  readonly ziel: Vec3;
  readonly abstand: number;
}

/** Alle Punkte, die „Alles zeigen“ sehen muss: Platzpunkte, Drehpunkte (Bäume, Seile), Stangenenden und Haringe. */
export function sichtbarePunkte(bauwerk: Bauwerk): readonly Vec3[] {
  return [
    ...bauwerk.objekte.flatMap((o) => [...o.platzPunkte(), o.drehpunkt()]),
    ...bauwerk.stangen().flatMap((s) => [s.start, s.ende]),
    ...bauwerk.haringe().map((h) => h.position),
  ];
}

/** Der Rahmen um die Punkte; ohne Punkte der Boden mit 40 × 40 m. */
export function rahmenUm(punkte: readonly Vec3[]): Rahmen {
  if (punkte.length === 0) {
    const h = LEERER_BODEN / 2;
    return { minX: -h, maxX: h, minY: 0, maxY: 0, minZ: -h, maxZ: h };
  }
  const bereich = (wert: (p: Vec3) => number): [number, number] => {
    const werte = punkte.map(wert);
    return [Math.min(...werte), Math.max(...werte)];
  };
  const [minX, maxX] = bereich((p) => p.x);
  const [minY, maxY] = bereich((p) => p.y);
  const [minZ, maxZ] = bereich((p) => p.z);
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

/** Planansicht: kleinster Ausschnitt mit dem Seitenverhältnis (Breite / Höhe) der Leinwand, der den Rahmen samt Rand zeigt. */
export function planEinpassen(rahmen: Rahmen, seitenverhaeltnis: number): PlanAusschnitt {
  const halbeBreite = Math.max(((rahmen.maxX - rahmen.minX) / 2) * (1 + EINPASS_RAND), MIN_HALBE_AUSDEHNUNG);
  const halbeTiefe = Math.max(((rahmen.maxZ - rahmen.minZ) / 2) * (1 + EINPASS_RAND), MIN_HALBE_AUSDEHNUNG);
  return {
    mitteX: (rahmen.minX + rahmen.maxX) / 2,
    mitteZ: (rahmen.minZ + rahmen.maxZ) / 2,
    halbeHoehe: Math.max(halbeTiefe, halbeBreite / Math.max(seitenverhaeltnis, 1e-6)),
  };
}

/**
 * 3D: Ziel in der Mitte des Rahmens, Abstand so, dass die Kugel um den Rahmen (mit Rand) ins Bild passt.
 * `blick` bleibt, nur der Abstand ändert sich; die Kamera liegt bei `ziel - blick * abstand`.
 */
export function dreiDEinpassen(rahmen: Rahmen, seitenverhaeltnis: number, senkrechterOeffnungswinkelGrad: number): DreiDAusschnitt {
  const ziel = new Vec3((rahmen.minX + rahmen.maxX) / 2, (rahmen.minY + rahmen.maxY) / 2, (rahmen.minZ + rahmen.maxZ) / 2);
  const halbeDiagonale = Math.hypot(rahmen.maxX - rahmen.minX, rahmen.maxY - rahmen.minY, rahmen.maxZ - rahmen.minZ) / 2;
  const radius = Math.max(halbeDiagonale * (1 + EINPASS_RAND), MIN_HALBE_AUSDEHNUNG);
  const halbSenkrecht = (senkrechterOeffnungswinkelGrad * Math.PI) / 360;
  const halbWaagrecht = Math.atan(Math.tan(halbSenkrecht) * seitenverhaeltnis);
  return { ziel, abstand: radius / Math.sin(Math.min(halbSenkrecht, halbWaagrecht)) };
}

/** Länge der Maßstabsleiste: die kleinste runde Länge, die mindestens 80 px breit ist (meist bis 160 px), sonst die größte. */
export function massstabsLaenge(meterProPixel: number): { readonly meter: number; readonly pixel: number } {
  const laengen = MASSSTAB_LAENGEN.map((meter) => ({ meter, pixel: meter / meterProPixel }));
  return laengen.find((l) => l.pixel >= MASSSTAB_MIN_PX) ?? laengen[laengen.length - 1]!;
}
