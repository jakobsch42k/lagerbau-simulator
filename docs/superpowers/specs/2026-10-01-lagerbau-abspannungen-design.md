# Lagerbau-Simulator — Design-Spec v2a: Abspannungen

Baut auf der v1-Spec auf (`2026-09-30-lagerbau-simulator-design.md`). Alles dort gilt weiter, insbesondere: **keine Statik-Rechnung**, Schwellwerte kommen von Jakob, die Fußzeile bleibt immer sichtbar.

## Context

Jakob will im nächsten Schritt Planen über Bauten ziehen und Bauten abspannen können. Das zerfällt in drei Teile, die aufeinander aufbauen: **v2a Abspannungen** (dieser Spec), v2b rechteckige Planen, v2c Kohten-/Jurtenbahnen. Abspannungen kommen zuerst, weil sie der kleinste Teil sind und Planen später ohnehin abgespannt werden.

## Getroffene Entscheidungen (Brainstorming 01.10.2026)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Zweck | Anschauen (3D), Materialliste, Hinweise, Platzbedarf, alle vier |
| 2 | Was wird abgespannt | der Bau selbst, (später) die Plane, Seile zwischen Bauten bzw. zu Bäumen |
| 3 | Woran endet ein Seil | Haring/Pflock am Boden, anderer Bau (Stange, Bund, Spitze), Baum |
| 4 | Reihenfolge | v2a Abspannungen → v2b rechteckige Planen → v2c Jurtenbahnen |
| 5 | Modell | **Ansatz A: Seil per Geometrie.** Ein Seil ist eine Linie zwischen zwei Punkten; was an einem Ende hängt, ergibt sich aus der Lage. Verworfen: Seil per Teile-Verweis (bräuchte stabile Bund-Ids, großer Umbau) und Abspannung als Bauteil-Eigenschaft (kann keine Seile zwischen Bauten oder zu Bäumen) |
| 6 | R1 mit Seilen | Ein A-Bock gilt als gesichert, wenn auf **beiden** Seiten seiner Ebene je mindestens ein Seil hängt |
| 7 | Neue Hinweise | Winkel zu steil/flach (R6), Stolperfalle nur für tiefe Querseile (R7). Kein Hinweis „nur einseitig“ außer über R1 |
| 8 | Materialliste | Seillängen auf ganze Meter aufgerundet (keine Standardlängen), Anzahl Haringe |

## D1 Modell (`src/model/`, ohne three.js und DOM)

- **`Seil`** (unveränderlich): `id`, `start: Vec3`, `ende: Vec3`, abgeleitet `laenge` und `winkelZumBodenGrad` (Winkel der Linie zur Waagrechten, 0–90°). Ein Seil kürzer als `MIN_SEILLAENGE` wirft `RangeError` (wie `Stange`). Nicht-endliche Koordinaten werfen ebenfalls.
- **`Baum`** (unveränderlich): `id`, `position: Vec3` (am Boden, y = 0), `durchmesser`, `hoehe`. Werte ≤ 0 oder nicht endlich werfen `RangeError` mit deutscher Meldung. Ein Baum ist Teil des Platzes, nicht des Baus.
- **Verankerung** (abgeleitet, nicht gespeichert, wie Fuß und Bund): Für jedes Seilende wird bestimmt, woran es hängt:
  - **Haring**, wenn y ≤ `FUSS_TOLERANZ`. Mehrere Seilenden innerhalb `BUND_CLUSTER_RADIUS` am Boden teilen sich einen Haring.
  - **Baum**, wenn der Punkt höchstens `BUND_TOLERANZ` von der Stammoberfläche eines Baums entfernt ist und unter dessen Höhe liegt.
  - **Bau**, wenn der Punkt höchstens `BUND_TOLERANZ` von einer Stange entfernt ist (`Stange.naechsterPunkt`). Gemerkt wird, zu welcher Stange bzw. Baugruppe.
  - Sonst **frei**. Das kann nur über einen manipulierten Link entstehen, weil der Editor jedes Ende einrastet. Freie Enden lösen R5-artig den Hinweis „Seil hängt in der Luft“ aus.
- **`Bauwerk`** bekommt zwei neue Listen `seile` und `baeume` mit `mitSeil`, `ersetzeSeil`, `mitBaum`, `ersetzeBaum`. `ohne(id)` entfernt auch Seile und Bäume. `enthaelt(id)` kennt sie. Ids sind über alle Teile eindeutig.
- **Seile erzeugen keine Bünde.** Ein Seil wird angeknotet, nicht gebunden; `BundFinder` sieht nur Stangen. Ein Seil verbindet für `Analyse.komponenten` auch keine Bauten miteinander.

## D2 Editor & Darstellung

- Neue Werkzeuge in der Palette:
  - **„Seil spannen“** (`'seil'`): zwei Klicks wie „Stange ziehen“. Jedes Ende rastet über den `SnapService` ein, an Spitze, Bund, Stangenende, beliebigem Punkt einer Stange, Baumstamm oder Boden (Raster). Zweimal derselbe Punkt oder ein zu kurzes Seil wird ignoriert, ohne Exception.
  - **„Baum setzen“** (`'baum'`): Klick auf den Boden setzt einen Baum mit Startmaßen `STANDARD_BAUM` (Durchmesser, Höhe).
- `Treffer` bekommt die Art `'baum'` (Treffer auf dem Stamm, mit `baumId` und dem Punkt auf der Oberfläche).
- Parameter-Panel:
  - **Baum:** Durchmesser (cm) und Höhe (m), änderbar; unsinnige Werte → Meldung, Feld springt zurück (wie v1).
  - **Seil:** Länge und Winkel zum Boden nur als Anzeige, dazu „Löschen“.
- Auswählen, Löschen (Entf), Rückgängig/Wiederholen wie bisher.
- Darstellung in `Szene`:
  - Seil als dünne helle Linie (Zylinder, Ø 1 cm, nur optisch);
  - Haring als kleiner Kegel am Boden;
  - Baum als brauner Stamm mit einfacher grüner Krone;
  - **Platzbedarf** als gestricheltes Rechteck am Boden.
- **Seile wandern nicht mit**, wenn eine Baugruppe verschoben, gedreht oder in den Parametern geändert wird. Das gilt heute auch für freie Stangen. Dann fehlt eine Verankerung, und R1/R6 melden das sichtbar.

## D3 Regeln (`src/rules/`)

- **R1 „A-Bock quer“ (geändert):** Ein A-Bock gilt außerdem als gesichert, wenn an ihm (Verankerung „Bau“ an einer seiner Stangen) mindestens zwei Seile hängen, deren **anderes** Ende auf verschiedenen Seiten seiner Ebene liegt. Maßgeblich ist das Vorzeichen des Abstands zur Ebene entlang `ebenenNormale`. Ein Ende genau in der Ebene (|Abstand| < `BUND_TOLERANZ`) zählt für keine Seite.
- **R3 „Standfläche“ (geändert):** Zur Standfläche eines zusammenhängenden Baus zählen zusätzlich die Haringe der Seile, die an diesem Bau hängen. Die Grundfläche ist dann die Hülle aus Füßen und diesen Haringen.
- **R6 „Abspannwinkel“ (neu):** Für jedes Seil mit genau einem Ende „Bau“ und dem anderen „Haring“:
  - `winkelZumBodenGrad < R6_MIN_WINKEL_GRAD` → „Seil sehr flach: braucht viel Platz.“
  - `> R6_MAX_WINKEL_GRAD` → „Seil sehr steil: hält seitlich kaum.“
  - Betroffene Teile: das Seil.
- **R7 „Stolperfalle“ (neu):** Für jedes Seil, bei dem **keines** der beiden Enden ein Haring ist (Bau↔Bau, Bau↔Baum, Baum↔Baum): Liegt sein tiefster Punkt (das tiefere Ende, Seile sind gerade) unter `R7_MIN_HOEHE`, erscheint „Seil hängt tief: Stolper- oder Halsgefahr. Höher spannen oder gut sichtbar markieren.“ Seile zum Haring lösen R7 nie aus.
- **„Seil hängt in der Luft“:** Ein Seil mit einem freien Ende (siehe D1) erzeugt diesen Hinweis.
- Alle neuen Schwellwerte stehen in `src/rules/constants.ts` mit `// CHECK MANUALLY`: `R6_MIN_WINKEL_GRAD`, `R6_MAX_WINKEL_GRAD`, `R7_MIN_HOEHE`, `SEIL_ZUGABE_PRO_ENDE`. Startwerte setzt der Plan, Jakob bestätigt sie.

## D4 Materialliste & Platzbedarf

- Die Stangenliste heißt künftig **Materialliste** und hat drei Abschnitte:
  - **Stangen** wie bisher.
  - **Seile**, gruppiert nach Länge: `laenge + 2 × SEIL_ZUGABE_PRO_ENDE`, auf ganze Meter aufgerundet, mit Anzahl.
  - **Haringe** als Anzahl, geteilte Haringe nur einmal gezählt.
- **Platzbedarf:** Zeile „Platzbedarf: L × B m“ (auf 0,1 m gerundet, L ≥ B). Grundlage ist das achsparallele Rechteck in x/z über alle Füße und Haringe des ganzen Bauwerks; Bäume zählen nicht. Dasselbe Rechteck wird gestrichelt am Boden gezeichnet. Achsparallel ist bewusst einfach: Bei schräg gedrehten Bauten überschätzt es den Platz etwas. Ohne Füße und Haringe entfällt die Zeile.

## D5 Daten (Teilen/Speichern)

- Das Datenformat geht auf **Version 2**: zusätzlich `seile: [{ id, start, ende }]` und `baeume: [{ id, position, durchmesser, hoehe }]`.
- Geschrieben wird immer Version 2. Gelesen werden Version 1 (ohne Seile und Bäume) und Version 2. Jedes Feld wird geprüft wie bisher (endlich, Typen, eindeutige Ids).
- Die Obergrenze `MAX_TEILE = 500` zählt Gruppen, Stangen, Seile und Bäume zusammen.
- Ein v2-Link in einer **alten** `.exe` (v1-Stand) zeigt „Ungültige Bauwerk-Daten“. Die Web-Version ist immer aktuell; die README sagt, dass die Leiterteams dann die neue `.exe` brauchen.

## D6 Tests

- **Unit (TDD):**
  - `Seil` und `Baum`: Maße, Winkel, Validierung, unveränderliche Updates.
  - Verankerung: Haring (auch geteilt), Baum, Bau, frei.
  - `Bauwerk`: neue Operationen; `ohne` entfernt Seile und Bäume.
  - Serializer: Rundreise v2; v1 lesen; Grenzen inkl. Seile und Bäume.
  - R1: A-Bock ohne Querverbindung mit Seilen auf beiden Seiten → still. Nur einseitig → feuert. Zwei Seile auf derselben Seite → feuert. Ende genau in der Ebene → zählt nicht.
  - R3 mit Haringen.
  - R6 knapp unter, an und über beiden Grenzen.
  - R7: tiefes Querseil feuert, hohes nicht, Seil zum Haring nie.
  - Materialliste (Zugabe, Rundung, Gruppierung, geteilte Haringe) und Platzbedarf (L ≥ B, ohne Teile keine Zeile).
- **E2E Web:** Ein geteilter Link mit einem A-Bock ohne Querverbindung, aber mit Seilen auf beiden Seiten, zeigt keinen R1-Hinweis. Derselbe Link mit nur einem Seil zeigt R1. Die Materialliste zeigt Seile und Haringe.
- **E2E Desktop:** unverändert. Die exe lädt einen v2-Bau über „Laden“; das prüft Jakob manuell.
- **Gemeinheitsbau (Jakob):**
  - ein Seil, das knapp neben dem A-Bock endet;
  - zwei Seile auf derselben Seite;
  - ein Seil, das quer über einen anderen Bau läuft;
  - ein Querseil knapp über `R7_MIN_HOEHE`.

## Nicht in v2a

Planen (v2b, v2c), Seile, die beim Verschieben mitwandern, Durchhang und Kräfte, Abspannungen von Planen, Laufwege als eigenes Element, Standard-Seillängen, Seil-Kollisionen mit Stangen.

## Zeitplan (Vorschlag)

- v2a beginnt nach M2 (08.11.2026) und dem Merge des Windows-Programms.
- Ziel: fertig vor der Demo beim Weihnachts-Gruppenrat (19.12.2026).
- Ab Jänner gilt der Freeze.
- v2b/v2c kommen danach.
- Jakob liefert die Werte für `R6_MIN/MAX_WINKEL_GRAD`, `R7_MIN_HOEHE` und `SEIL_ZUGABE_PRO_ENDE`, sinnvollerweise mit den R1–R5-Werten.

## Verifikation

- `npm test` grün, Abdeckung `model/` + `rules/` ≥ 80 %. `npm run build`, `npm run e2e`, `npm run e2e:desktop` grün.
- Manuell (Jakob):
  - einen A-Bock nur mit Seilen auf beiden Seiten sichern; R1 verschwindet, mit einem Seil weniger kommt er zurück;
  - ein tiefes Firstseil zwischen zwei Dreibeinen löst R7 aus;
  - die Materialliste nennt die Seillängen und die Anzahl Haringe;
  - das Rechteck für den Platzbedarf passt zum gemessenen Platz.
