import { Vec3 } from '../model/Vec3';
export const SNAP_RADIUS = 0.25; // m, so nah rastet ein Klick auf Spitze, Bund oder Stangenende ein
export const BODEN_RASTER = 0.1; // m
export const DREH_SCHRITT = Math.PI / 12; // 15° je Tastendruck R
export const KLICK_TOLERANZ_PX = 5; // mehr Mausweg zählt als Drehen der Ansicht, nicht als Klick
export const PFEIL_SCHRITT = 0.1; // m je Pfeiltaste
export const PFEIL_SCHRITT_GROSS = 1; // m je Pfeiltaste mit Shift
export const DUPLIKAT_VERSATZ = new Vec3(1, 0, 1); // m, so weit liegt eine Kopie neben dem Original
export const GRIFF_TREFFER_PX = 12; // so nah am Mittelpunkt eines Griffs oder an einer Kante greift die Maus ihn
