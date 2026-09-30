/**
 * Schwellwerte der Faustregeln. Startwerte von Claude, jeder einzeln von Jakob zu bestätigen
 * (eigene Erfahrung + PPÖ-Infopedia). Nie ohne seine Rückmeldung als gesichert behandeln.
 */
export const R1_MIN_WINKEL_ZUR_EBENE_GRAD = 30; // CHECK MANUALLY: ab diesem Winkel zur A-Ebene hält eine Querverbindung den A-Bock seitlich
export const R2_PLANAR_TOLERANZ_RELATIV = 0.05; // CHECK MANUALLY: erlaubte Abweichung von der Ebene, relativ zur längsten Viereckseite
export const R3_MAX_HOEHE_ZU_BREITE = 2.5; // CHECK MANUALLY: Höhe ÷ kleinste Breite der Standfläche, darüber Kippgefahr
export const R3_MIN_HOEHE = 0.5; // m, CHECK MANUALLY: niedrigere Bauten werden nicht auf Kippen geprüft
export const R4_MIN_BEINWINKEL_GRAD = 10; // CHECK MANUALLY: steilere Beine → kippt leicht
export const R4_MAX_BEINWINKEL_GRAD = 35; // CHECK MANUALLY: flachere Beine → rutschen weg
