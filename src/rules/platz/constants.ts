/**
 * Startwerte der Platzregeln (Spec E6, D1). Alle sind Faustregeln: In Österreich und Salzburg gibt es keinen Rechtstext mit Meterwert
 * für Feuer, Zelt, Latrine oder Küche. Quelle: Recherche „Lagerplatz Zelte und Abstandsregeln“, Tabelle B. Jakob bestätigt oder ersetzt jeden Wert.
 */
export const P1_MIN_ABSTAND_FEUER_ZELT_M = 5; // m, CHECK MANUALLY: Camping-Blogs „3 min., 5 üblich, 5–10 ideal“ (smartercamping, outdoor-renner), Konfidenz niedrig
export const P2_MIN_ABSTAND_FEUER_HOLZ_M = 5; // m, CHECK MANUALLY: keine Quelle, Startwert von Claude (über dem freigeräumten Radius von 3 m, Scout-o-Wiki)
export const P3_MIN_ABSTAND_ZELT_ZELT_M = 3; // m, CHECK MANUALLY: VDE „mindestens 3 m“, Empfehlung Deutschland, Konfidenz mittel
export const P4_MIN_ABSTAND_LATRINE_WASSER_M = 30; // m, CHECK MANUALLY: Schweizer Pfadihandbuch Lagerbau (Sickergrube 30 m, Biwak-Toilette 50 m); andere Quellen 60 m (LNT), 100 m (Belgien), Jakob entscheidet
export const P5_MIN_ABSTAND_LATRINE_KUECHE_M = 20; // m, CHECK MANUALLY: keine Quelle, Startwert von Claude (Pfadi-Hinweise nur qualitativ)
export const P6_KRONENRADIUS_FAKTOR = 0.3; // × Baumhöhe, CHECK MANUALLY: keine Quelle, Startwert von Claude (Kronenradius geschätzt; VDE rät zum Meiden einzelner Bäume)
