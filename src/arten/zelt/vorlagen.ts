import type { ZeltAufbau, ZeltParams } from '../../model/params';
import { VorlagenWahl } from '../VorlagenWahl';

/**
 * Eine Zelt-Vorlage (Spec E4, D2): Startwerte, die alle Felder vorbelegen; das Zelt lässt sich danach frei einstellen.
 * Maße, die zur Form nicht gehören (z. B. der Durchmesser beim Hanger), tragen Startwerte, damit ein Formwechsel nichts verliert.
 * Alle drei Wände sind beim Setzen an.
 */
export interface ZeltVorlage {
  readonly schluessel: string;
  /** Text in der Auswahl. */
  readonly label: string;
  /** Name des gesetzten Zelts. */
  readonly name: string;
  readonly aufbau: ZeltAufbau;
  readonly durchmesser: number;
  readonly ecken: number;
  readonly laenge: number;
  readonly breite: number;
  readonly wandhoehe: number;
  readonly firsthoehe: number;
  readonly abspannungen: number;
  readonly seillaenge: number;
  readonly haringAbstand: number;
  readonly farbe: string;
}

export function findeZeltVorlage(schluessel: string): ZeltVorlage | undefined {
  return ZELT_VORLAGEN.find((v) => v.schluessel === schluessel);
}

/** Alle Felder eines Zelts aus einer Vorlage; der Name ist der der Vorlage, alle Wände sind an. */
export function paramsAusZeltVorlage(v: ZeltVorlage): ZeltParams {
  return {
    vorlage: v.schluessel,
    name: v.name,
    aufbau: v.aufbau,
    durchmesser: v.durchmesser,
    ecken: v.ecken,
    laenge: v.laenge,
    breite: v.breite,
    wandhoehe: v.wandhoehe,
    firsthoehe: v.firsthoehe,
    waende: [true, true, true],
    abspannungen: v.abspannungen,
    seillaenge: v.seillaenge,
    haringAbstand: v.haringAbstand,
    farbe: v.farbe,
  };
}

// Quelle aller Werte: Recherche „Lagerplatz Zelte und Abstandsregeln“, Tabelle A (Pfadfinder/reports), sofern nicht anders vermerkt.
// Jeder Wert hat seine eigene `CHECK MANUALLY`-Zeile; Platzhalter sind als solche benannt (Spec E4, D2).
// Jakob prüft die Werte an den echten Zelten und übernimmt Korrekturen hier.
// Auffällig: Die 5er-Dachanhebung (3,25 - 1,65 = 1,60 m) und die der 8er (3,17 - 1,65 = 1,52 m) wirken gegenüber der 6er (0,97 m) groß.
// Die Reihenfolge ist die der Auswahl im Werkzeug und im Panel.
export const ZELT_VORLAGEN: readonly ZeltVorlage[] = [
  {
    schluessel: 'jurte5',
    label: 'Jurte 5er',
    name: 'Jurte 5er',
    aufbau: 'rund', // CHECK MANUALLY: Jurte ist rund (Jurtenland Maße, Konfidenz hoch)
    durchmesser: 5.08, // CHECK MANUALLY: Jurtenland Maße, 508 cm, Konfidenz hoch
    ecken: 10, // CHECK MANUALLY: Jurtenland Maße, 10 Felder, Konfidenz hoch
    laenge: 5.08, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude = Durchmesser
    breite: 5.08, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude = Durchmesser
    wandhoehe: 1.65, // CHECK MANUALLY: Jurtenland Maße, 165 cm, Konfidenz hoch
    firsthoehe: 3.25, // CHECK MANUALLY: Zeltstadt Anleitung (5er), auffällig groß: Dachanhebung 1,60 m gegenüber 0,97 m bei der 6er
    abspannungen: 10, // CHECK MANUALLY: ein Haring je Ecke wie bei der 6er (Tortuga: 12 bei 12 Ecken), Startwert Claude
    seillaenge: 3.0, // CHECK MANUALLY: Jurtenland Jurte, 300 cm (kohten.com: 450 cm), Konfidenz mittel
    haringAbstand: 2.0, // CHECK MANUALLY: Zeltstadt Anleitung, ca. 2 m, Konfidenz mittel
    farbe: '#4a4a4a', // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
  },
  {
    schluessel: 'jurte6',
    label: 'Jurte 6er',
    name: 'Jurte 6er',
    aufbau: 'rund', // CHECK MANUALLY: Jurte ist rund (Jurtenland Maße, Konfidenz hoch)
    durchmesser: 6.07, // CHECK MANUALLY: Jurtenland Maße, 607 cm (Händler 600 bis 610), Konfidenz hoch
    ecken: 12, // CHECK MANUALLY: Stromeyer, 12 Wandfelder, Konfidenz hoch
    laenge: 6.07, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude = Durchmesser
    breite: 6.07, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude = Durchmesser
    wandhoehe: 1.65, // CHECK MANUALLY: Jurtenland Maße, 165 cm, Konfidenz hoch
    firsthoehe: 2.62, // CHECK MANUALLY: Jurtenland Maße, Wand 1,65 + Dachanhebung 0,97 m; Tortuga/kohten.com nennen 2,50 (Bereich 2,20 bis 2,62), Konfidenz mittel
    abspannungen: 12, // CHECK MANUALLY: Jurtenland Jurte, 12 Abspannseile (Tortuga: 12 Haringe), Konfidenz mittel
    seillaenge: 3.0, // CHECK MANUALLY: Jurtenland Jurte, 300 cm (alternativ 450 cm), Konfidenz mittel
    haringAbstand: 2.0, // CHECK MANUALLY: Zeltstadt Anleitung, ca. 2 m, Konfidenz mittel
    farbe: '#4a4a4a', // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
  },
  {
    schluessel: 'jurte8',
    label: 'Jurte 8er',
    name: 'Jurte 8er',
    aufbau: 'rund', // CHECK MANUALLY: Jurte ist rund (Jurtenland Maße, Konfidenz hoch)
    durchmesser: 8.05, // CHECK MANUALLY: Jurtenland Maße, 805 cm, Konfidenz hoch
    ecken: 16, // CHECK MANUALLY: Jurtenland Maße, 16 Felder, Konfidenz hoch
    laenge: 8.05, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude = Durchmesser
    breite: 8.05, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude = Durchmesser
    wandhoehe: 1.65, // CHECK MANUALLY: Jurtenland Maße, 165 cm (Zeltstadt 8m XL: 200 cm), Konfidenz hoch
    firsthoehe: 3.17, // CHECK MANUALLY: Zeltstadt 8m, auffällig groß: Dachanhebung 1,52 m gegenüber 0,97 m bei der 6er
    abspannungen: 16, // CHECK MANUALLY: ein Haring je Ecke wie bei der 6er, Startwert Claude
    seillaenge: 3.0, // CHECK MANUALLY: Zeltstadt 8m und Jurtenland Jurte, 300 cm, Konfidenz mittel
    haringAbstand: 2.0, // CHECK MANUALLY: Zeltstadt Anleitung, ca. 2 m, Konfidenz mittel
    farbe: '#4a4a4a', // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
  },
  {
    schluessel: 'hanger',
    label: 'Hanger (Platzhalter)',
    name: 'Hanger (Platzhalter)',
    aufbau: 'sattel', // CHECK MANUALLY: PLATZHALTER, Hanger = Sattler-Zelt (Spec E4, Entscheidung 3), Maße unbekannt
    durchmesser: 6.0, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude = Länge
    ecken: 12, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude
    laenge: 6.0, // CHECK MANUALLY: PLATZHALTER Alabama Gr. 3 (Zeltstadt), 600 cm, Konfidenz niedrig; Zeltwart fragen
    breite: 4.5, // CHECK MANUALLY: PLATZHALTER Alabama Gr. 3 (Zeltstadt), 450 cm, Konfidenz niedrig; Zeltwart fragen
    wandhoehe: 1.75, // CHECK MANUALLY: PLATZHALTER Alabama Gr. 3 (Zeltstadt), 175 cm, Konfidenz niedrig; Zeltwart fragen
    firsthoehe: 2.15, // CHECK MANUALLY: PLATZHALTER Alabama Gr. 3 (Zeltstadt), 215 cm, Konfidenz niedrig; Zeltwart fragen
    abspannungen: 8, // CHECK MANUALLY: PLATZHALTER, Anzahl nicht gefunden
    seillaenge: 3.0, // CHECK MANUALLY: PLATZHALTER wie bei der Jurte (Jurtenland 3,0 m, kohten.com 4,5 m), Länge beim Hanger nicht gefunden
    haringAbstand: 1.0, // CHECK MANUALLY: PLATZHALTER, 1,0 m geschätzt (Zeltstadt nennt ca. 2 m nur bei der Jurte)
    farbe: '#8a8a6a', // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
  },
  {
    schluessel: 'doppelkegler',
    label: 'Doppelkegler',
    name: 'Doppelkegler',
    aufbau: 'doppelkegel', // CHECK MANUALLY: Zeltstadt Doppelkegelzelt, Konfidenz mittel
    durchmesser: 5.55, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude = Länge
    ecken: 12, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude
    laenge: 5.55, // CHECK MANUALLY: Zeltstadt Doppelkegelzelt, 555 cm ohne Vorbau (Vorbaumaß unbekannt, nicht modelliert), Konfidenz mittel
    breite: 4.0, // CHECK MANUALLY: Zeltstadt Doppelkegelzelt, 400 cm, Konfidenz mittel
    wandhoehe: 0.4, // CHECK MANUALLY: geschätzt aus der BZW-Skizze (senkrechte Wand ca. 30-40 cm, Dach läuft fast bis zum Boden); die 185 cm der Stückliste sind die Stützstangen am Vorbau, nicht die Wand. Messen, Konfidenz niedrig
    firsthoehe: 2.75, // CHECK MANUALLY: Zeltstadt und BZW, 275 cm, Konfidenz mittel
    abspannungen: 20, // CHECK MANUALLY: BZW Stückliste, 20 T-Haringe (30 Bodennägel, Zeltstadt ohne Zahl), Konfidenz niedrig
    seillaenge: 3.0, // CHECK MANUALLY: PLATZHALTER wie bei der Jurte, Zeltstadt nennt keine Länge (Hanf)
    haringAbstand: 1.0, // CHECK MANUALLY: PLATZHALTER, 1,0 m geschätzt
    farbe: '#6b7a4a', // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
  },
  {
    schluessel: 'eigenes',
    label: 'Eigenes',
    name: 'Eigenes',
    aufbau: 'sattel', // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
    durchmesser: 4.0, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude = Länge
    ecken: 12, // CHECK MANUALLY: gehört nicht zur Form, Startwert Claude
    laenge: 4.0, // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
    breite: 3.0, // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
    wandhoehe: 1.8, // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
    firsthoehe: 2.4, // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
    abspannungen: 4, // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
    seillaenge: 3.0, // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
    haringAbstand: 1.0, // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
    farbe: '#9a9a9a', // CHECK MANUALLY: Startwert Claude (Spec E4, D2)
  },
];

/** Die im Werkzeug „Zelt“ gewählte Vorlage (Mechanismus in `../VorlagenWahl`); Start ist die Jurte 5er. */
export class ZeltVorlagenWahl extends VorlagenWahl<ZeltVorlage> {
  constructor() {
    super(ZELT_VORLAGEN);
  }
}
