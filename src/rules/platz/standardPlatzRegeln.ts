import type { AbstandsRegelDefinition } from './AbstandsRegel';
import { meterText, namenText, richtwertText } from './formate';

/**
 * P1 bis P5 als Daten (Spec E6, D1). Jeder Text beginnt mit „Faustregel (<Quellenart>): …“; die Quellenart steht in der Klammer.
 * Kein Text nennt das Wort für ein Verbot oder einen Rechtsverstoß: In Österreich gibt es für diese Abstände keinen Rechtstext mit Meterwert.
 */
export const ABSTANDS_REGELN: readonly AbstandsRegelDefinition[] = [
  {
    name: 'P1',
    schwere: 'warnung',
    rollenA: ['feuer'],
    rollenB: ['zelt'],
    text: (f) =>
      `Faustregel (Camping-Blogs, keine rechtliche Vorgabe): ${namenText(f.a)} ist nur ${meterText(f.abstand)} m von ${namenText(f.b)} entfernt, üblich sind mindestens ${richtwertText(f.richtwert)} m.`,
  },
  {
    name: 'P2',
    schwere: 'info',
    rollenA: ['holzlager'],
    rollenB: ['feuer'],
    text: (f) =>
      `Faustregel (ohne Quelle, vorsichtiger Startwert): Holzlager ${namenText(f.a)} liegt nur ${meterText(f.abstand)} m von ${namenText(f.b)}, Funkenflug beachten, Richtwert ${richtwertText(f.richtwert)} m.`,
  },
  {
    name: 'P3',
    schwere: 'info',
    rollenA: ['zelt'],
    rollenB: ['zelt'],
    text: (f) =>
      f.ueberlappt
        ? `Faustregel (Empfehlung VDE, Deutschland, keine Pflicht): ${namenText(f.a)} und ${namenText(f.b)} überlappen sich, empfohlen sind mindestens ${richtwertText(f.richtwert)} m.`
        : `Faustregel (Empfehlung VDE, Deutschland, keine Pflicht): ${namenText(f.a)} und ${namenText(f.b)} stehen nur ${meterText(f.abstand)} m auseinander, empfohlen sind mindestens ${richtwertText(f.richtwert)} m.`,
  },
  {
    name: 'P4',
    schwere: 'warnung',
    rollenA: ['latrine'],
    rollenB: ['wasser'],
    text: (f) =>
      `Faustregel (Richtlinie Schweizer Pfadi, kein österreichisches Recht): Latrine ${namenText(f.a)} liegt nur ${meterText(f.abstand)} m von Wasserstelle ${namenText(f.b)}, Richtwert ${richtwertText(f.richtwert)} m. Möglichst unterhalb der Wasserentnahme; das Programm kennt kein Gefälle.`,
  },
  {
    name: 'P5',
    schwere: 'info',
    rollenA: ['latrine'],
    rollenB: ['kueche', 'feuer'],
    text: (f) =>
      `Faustregel (ohne Zahlenquelle, nur qualitativ in Schweizer Pfadi-Hinweisen): Latrine ${namenText(f.a)} liegt nur ${meterText(f.abstand)} m von ${namenText(f.b)}, Richtwert ${richtwertText(f.richtwert)} m.`,
  },
];
