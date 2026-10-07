import type { ZeltParams } from './params';

/** Gemeinsame Testdaten für Zelt-Tests: eine Jurte 6er nach der Vorlage der Spec E4. */
export const JURTE6: ZeltParams = {
  vorlage: 'jurte6',
  name: 'Jurte 6er',
  aufbau: 'rund',
  durchmesser: 6.07,
  ecken: 12,
  laenge: 6.07,
  breite: 6.07,
  wandhoehe: 1.65,
  firsthoehe: 2.62,
  waende: [true, true, true],
  abspannungen: 12,
  seillaenge: 3,
  haringAbstand: 2,
  farbe: '#4a4a4a',
};

export const SATTEL_KLEIN: ZeltParams = { ...JURTE6, vorlage: 'eigenes', aufbau: 'sattel', laenge: 4, breite: 3, abspannungen: 4, haringAbstand: 1 };
export const HANGER: ZeltParams = { ...JURTE6, vorlage: 'hanger', aufbau: 'sattel', laenge: 6, breite: 4.5, abspannungen: 8, haringAbstand: 1 };
export const DOPPELKEGEL: ZeltParams = { ...JURTE6, vorlage: 'doppelkegler', aufbau: 'doppelkegel', laenge: 5.55, breite: 4, abspannungen: 20, haringAbstand: 1 };
