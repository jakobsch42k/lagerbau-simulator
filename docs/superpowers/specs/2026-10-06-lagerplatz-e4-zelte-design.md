# Lagerbau-Simulator — Design-Spec E4: Zelte als Ganzes

Teil der Spec v3 (`2026-10-05-lagerplatz-planer-design.md`), Etappe E4. Setzt voraus:
- **E0:** `LagerObjekt`, Registry je Art, Darstellung je Art, inkrementelle Szene;
- **E1:** Auswahl, Ziehen, Drehen (R), Duplizieren, Planansicht;
- **E3:** Platz-Objekte mit Vorlagen (`src/arten/platz/vorlagen.ts`), Text- und Farbfelder im Panel, `zaehltZumPlatzbedarf`, Datenformat v6.

Alles aus v1–v3 gilt weiter, insbesondere: **keine Statik-Rechnung**, Schwellwerte und Maße kommen von Jakob, die Fußzeile bleibt sichtbar. Quelle aller Startwerte: Recherche `Pfadfinder/reports/Lagerplatz Zelte und Abstandsregeln.md`, Tabelle A.

## Context

Auf dem Lagerplatz stehen die Zelte der Gruppen: Jurten (Komplettdach plus 3 Seitenwände), der Hanger und der Doppelkegler. Für das Layout und die Materialliste braucht der Planer sie als **ganze Objekte** mit Maßen, Drehung, vereinfachtem Körper und den Haringen samt Abspannung, aber ohne Bahnen, Knöpfe oder Stangen im Detail. Ein Bahnen-Baukasten ist gestrichen (Spec v3, E7).

## Getroffene Entscheidungen (Jakob 06.10.2026, Rest Claude)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Art | **Eine Art `zelt`** mit Vorlagen: Jurte 5er/6er/8er, Hanger, Doppelkegler, dazu „Eigenes“. Keine Art je Zelttyp |
| 2 | Jurte | **Komplettdach plus 3 Seitenwände**, jede Wand einzeln an/aus (z. B. offenes Küchenzelt) |
| 3 | Hanger | Ein Sattler-Zelt. Die Maße sind unbekannt; die Vorlage ist ein **Platzhalter** (Alabama Gr. 3 aus der Recherche) mit einstellbarer Länge. Das Programm gibt ihn nicht als „den Hanger“ aus |
| 4 | Doppelkegler | Zeltstadt.at Doppelkegelzelt: 5,55 × 4,00 m, Höhe 2,75 m, Seitenhöhe 1,85 m |
| 5 | Startwerte | Die Werte der Recherche, alle `// CHECK MANUALLY: <Quelle>`. **Jede Abmessung ist je Zelt einstellbar** (Spec v3, #7) |
| 6 | Bestandteile | Drehung, vereinfachter 3D-Körper, **Haringe und Abspannung abgeleitet** (E5 zählt sie), Platzbedarf |
| 7 | Schreibweise | „Haring“, nie „Hering“ (UI, Code, Meldungen) |
| 8 | Alle Maße immer gespeichert | Auch die Maße, die zur gewählten Form nicht gehören (z. B. Durchmesser beim Hanger), bleiben im Objekt, damit ein Formwechsel nichts verliert. Das Panel zeigt nur die passenden *(Entscheidung Claude, Jakob kann umdrehen)* |
| 9 | Wand-Aufteilung | Die Jurte hat drei gleich große Wände zu je 120° (Start bei der Drehung des Zelts). Die Recherche hat **keine** Wandmaße (nur „12 Felder = 3 × 4“); Jakob misst nach *(Entscheidung Claude, Jakob kann umdrehen)* |
| 10 | Wand an/aus im Panel | Als Auswahlfeld „an/aus“ je Wand (vorhandenes `PanelAuswahl`), kein neuer Panel-Typ *(Entscheidung Claude, Jakob kann umdrehen)* |
| 11 | Haring-Zahl | Eine Zahl „Abspannungen“ je Zelt (je ein Haring und ein Seil), nicht aus der Wand-Anzahl berechnet. Eine ausgeschaltete Wand ändert sie nicht *(Entscheidung Claude, Jakob kann umdrehen)* |

## D1 Modell (`src/model/Zelt.ts`, ohne three.js)

- **`Zelt implements LagerObjekt`**, unveränderlich, `art = 'zelt'`.
  - Felder: `id`, `position: Vec3` (Mitte, y = 0), `drehungRad`, `params: ZeltParams`.
  - `ids()` = `[id]`. `verschobenUm(dv)` ändert `position`. `gedreht(w, um?)` addiert `w` zu `drehungRad` und dreht `position` um `um` (ohne `um`: um die eigene Position, also nur `drehungRad`).
  - `platzPunkte()` = `umriss()` plus `haringe()` (D3). Die Haringe laufen so über `Platzbedarf`; `Bauwerk.haringe()` kennt sie nicht, damit nichts doppelt zählt.
- **`ZeltParams`** (alle Längen in m):

| Feld | Bedeutung | Gültig |
|---|---|---|
| `vorlage` | Schlüssel aus D2 | bekannter Schlüssel |
| `name` | Anzeigename, z. B. „Jurte Wölfe“ | 1–40 Zeichen |
| `aufbau` | `'rund'` \| `'doppelkegel'` \| `'sattel'` | eines davon |
| `durchmesser`, `ecken` | nur `rund`: Eck-zu-Eck, Anzahl Ecken | > 0, ≤ 50; ganze Zahl 6–24 |
| `laenge`, `breite` | nur `doppelkegel` und `sattel` | > 0, ≤ 50 |
| `wandhoehe`, `firsthoehe` | Traufe und First | > 0, ≤ 50; First ≥ Wand |
| `waende` | `[boolean, boolean, boolean]`, nur `rund` | — |
| `abspannungen` | Anzahl Haringe = Anzahl Abspannseile | ganze Zahl 0–100 |
| `seillaenge` | Länge je Abspannseil (E5) | > 0 |
| `haringAbstand` | Abstand der Haringe zur Zeltkante | ≥ 0, ≤ 20 |
| `farbe` | `#rrggbb` | gültige Farbe |

- **Prüfung** (`RangeError`, deutsch): „Name muss 1 bis 40 Zeichen lang sein.“, „<Feld> muss größer als 0 sein.“ (Durchmesser, Länge, Breite, Wandhöhe, Firsthöhe, Seillänge), „Maß darf höchstens 50 m betragen.“, „Ecken: ganze Zahl von 6 bis 24.“, „Abspannungen: ganze Zahl von 0 bis 100.“, „Haring-Abstand darf nicht negativ sein.“, „Firsthöhe muss mindestens so hoch wie die Wandhöhe sein.“, „Ungültige Farbe.“
- **Fehlertext-Reihenfolge** wie in E3: erster Fehler gewinnt, das Feld springt zurück (Muster aus v1).

## D2 Vorlagen (`src/arten/zelt/vorlagen.ts`)

Eine Liste, an einer Stelle und leicht zu ändern, im Muster von E3 D2. Der Vorlagen-Mechanismus (Auswahlfeld im Werkzeug, „zuletzt gewählte Vorlage bleibt aktiv“) wird von E3 übernommen; liegt er dort noch in der Platz-Art, zieht er in `src/arten/VorlagenWahl.ts`, und beide Arten nutzen ihn.

| Vorlage (`vorlage`) | aufbau | Maße | Wand / First | Abspannungen × Seil, Abstand | Quelle (Tabelle A) |
|---|---|---|---|---|---|
| Jurte 5er (`jurte5`) | rund | Ø 5,08, 10 Ecken | 1,65 / 3,25 | 10 × 3,0 m, 2,0 m | Jurtenland Maße; Zeltstadt Anleitung |
| Jurte 6er (`jurte6`) | rund | Ø 6,07, 12 Ecken | 1,65 / 2,62 | 12 × 3,0 m, 2,0 m | Jurtenland Maße; Stromeyer |
| Jurte 8er (`jurte8`) | rund | Ø 8,05, 16 Ecken | 1,65 / 3,17 | 16 × 3,0 m, 2,0 m | Jurtenland Maße; Zeltstadt 8m |
| Hanger (`hanger`) | sattel | 6,0 × 4,5 | 1,75 / 2,15 | 8 × 3,0 m, 1,0 m | **Platzhalter** Alabama Gr. 3 (Zeltstadt) |
| Doppelkegler (`doppelkegler`) | doppelkegel | 5,55 × 4,00 | 1,85 / 2,75 | 20 × 3,0 m, 1,0 m | Zeltstadt, BZW Stückliste |
| Eigenes (`eigenes`) | sattel | 4,0 × 3,0 | 1,80 / 2,40 | 4 × 3,0 m, 1,0 m | — |

- **Alle Werte `// CHECK MANUALLY: <Quelle>`**, jeder Wert mit seiner eigenen Zeile und Konfidenz aus der Recherche.
- **Wo die Recherche nichts hat**, steht ein Platzhalter mit genau diesem Vermerk:
  - Hanger: alle Maße (siehe Entscheidung 3) und die Abspannung (8 ist ein Platzhalter);
  - Wandmaße der Jurte (nur die Aufteilung 3 × 120° ist Entscheidung 9);
  - Abspannseil-Länge beim Doppelkegler und Hanger (3,0 m wie bei der Jurte; Jurtenland nennt 3,0 m, kohten.com 4,5 m);
  - Haring-Abstand (Zeltstadt: ca. 2 m bei der Jurte; für die anderen Zelte 1,0 m geschätzt);
  - das Vorbau-Maß des Doppelkeglers (nicht modelliert, siehe „Nicht in E4“).
- **Auffällige Werte** bekommen einen Kommentar: Die 5er-Dachanhebung von 1,60 m und die der 8er von 1,52 m (First 3,25 bzw. 3,17 m) wirken gegenüber der 6er (0,97 m) groß. Der Doppelkegler hat zwei widersprüchliche Stückzahlen (Zeltstadt: keine Heringzahl, BZW: 20 T-Heringe und 30 Bodennägel); die Vorlage nimmt 20.
- **Farben** (Startwerte, `// CHECK MANUALLY`): Jurte `#4a4a4a`, Hanger `#8a8a6a`, Doppelkegler `#6b7a4a`, Eigenes `#9a9a9a`.
- **Namen** beim Setzen: der Vorlagenname, z. B. „Jurte 6er“; beim Hanger „Hanger (Platzhalter)“, bis Jakob die Maße bestätigt hat.

## D3 Geometrie und Ableitungen (`src/model/ZeltGeometrie.ts`, ohne three.js)

Eine Klasse mit statischen Methoden, die `Zelt` aufruft. Alles rechnet in der Welt (Position und Drehung eingerechnet), y = 0.

- **`umriss(): Vec3[]`** — der Grundriss:
  - `rund`: regelmäßiges `ecken`-Eck mit Umkreisdurchmesser `durchmesser`;
  - `doppelkegel`, `sattel`: Rechteck `laenge` × `breite`, Länge entlang der Zeltachse.
  - E6 nutzt diesen Umriss für Abstände von Kante zu Kante.
- **`flaeche(): number`** nach der Shoelace-Formel; steht im Panel.
- **`haringe(): Vec3[]`**, `abspannungen` Punkte:
  - `rund`: gleichmäßig auf einem Kreis mit Radius `durchmesser / 2 + haringAbstand`, der erste bei `drehung + halber Winkelschritt`;
  - sonst: gleichmäßig verteilt auf dem Umfang des um `haringAbstand` nach außen versetzten Rechtecks, Start an einer Ecke.
- **`abspannseile(): { laenge: number; anzahl: number }`** = `{ seillaenge, abspannungen }`. Die Länge ist ein Eingabewert und wird **nicht** aus der Lage der Haringe berechnet *(Entscheidung Claude, Jakob kann umdrehen: die Seile hängen an der Zeltplane, deren Höhe das Modell nicht kennt)*.
- **Folgen:**
  - `Platzbedarf` umfasst Umriss und Haringe automatisch über `platzPunkte()`; `zaehltZumPlatzbedarf = true`.
  - E5 liest `abspannseile()` und `haringe().length`; die Haringe sind **nicht** mit denen der Seile aus `Bauwerk.haringe()` zusammengefasst.
  - Regeln R1–R8 sehen Zelte nicht (nur Stangen und Seile), es entstehen keine Hinweise.

## D4 Darstellung (`src/editor/darstellung/ZeltDarstellung.ts`, three.js)

Ein vereinfachter Körper, kein Plan der Bahnen. Material und Farbe aus `farbe`, doppelseitig.

- **`rund`:** Dach als Kegel mit `ecken` Seiten (Spitze auf `firsthoehe`, Rand auf `wandhoehe`, Radius = Umkreisradius). Die drei Wände als Flächen von y = 0 bis `wandhoehe` entlang des Umrisses, je 120°-Sektor (Wand 1 ab Drehung 0°, Wand 2 ab 120°, Wand 3 ab 240°). Eine ausgeschaltete Wand fehlt; man sieht ins Zelt.
- **`doppelkegel`:** Wände als Quader-Mantel bis `wandhoehe`; das Dach aus Dreiecken vom Traufrechteck zu zwei Spitzen auf `firsthoehe` bei ±`laenge / 4` entlang der Zeltachse.
- **`sattel`:** Wände bis `wandhoehe`, Satteldach mit First entlang der Länge auf `firsthoehe`.
- **Haringe und Abspannseile** liegen in derselben Gruppe: kleine Zylinder an den `haringe()`-Punkten (Höhe 0,3 m), dünne Linien von dort zu einem Punkt der Traufe in Richtung Zeltmitte. Sie werden mit dem Zelt neu gebaut, nicht in der „Ableitungen“-Gruppe der Szene (Entscheidung Claude, damit kein neuer Haken in der Szene nötig ist).
- **Beschriftung:** Der Name über dem Zelt, ausblendbar mit „Beschriftungen zeigen“ (E3).
- Jedes Mesh trägt in `userData` Objekt-id, Teil-id (die Id des Zelts) und Art.

## D5 Art und Panel (`src/arten/ZeltArt.ts`)

- **Registrierung:** `'zelt'` in `ART_NAMEN`, `new ZeltArt()` in `standardArten()`, `new ZeltDarstellung()` in `standardDarstellungen()`, Knopf „Zelt“ in `index.html` (CLAUDE.md „Neue Objektart“). `platzieren` = Modus `punkt`; `klick = 'wahlweise'`, `hatOesen = false`, `fangpunkte` leer, `beiTreffer` ergibt `null`. Ein Zelt ist in „Auswahl“ immer klickbar und in den Bau-Werkzeugen kein Klickziel.
- **Werkzeug „Zelt“:** wie E3 D2, ein Knopf öffnet die Vorlagenliste, der nächste Bodenklick setzt das Zelt mit Drehung 0. Die letzte Vorlage bleibt aktiv.
- **Panel** (`panel(o)`, deutsche Labels):
  - immer: Vorlage (Auswahl; ein Wechsel setzt alle Maße auf die Vorlage, behält Position und Drehung, ein Undo-Schritt), Name, Form (Auswahl: „Rund (Jurte)“, „Doppelkegel“, „Sattel“), Wandhöhe, Firsthöhe, Abspannungen, Seillänge, Haring-Abstand, Drehung (°), Farbe;
  - nur `rund`: Durchmesser, Ecken, „Wand 1“, „Wand 2“, „Wand 3“ (je „an“/„aus“);
  - sonst: Länge, Breite (Schritt 0,5 m, damit der Hanger schnell verlängert werden kann).
  - Info: „Fläche 29 m² · 12 Haringe · Seil je 3,0 m“.
- **Drehung** per Panel (Grad) und per R / Shift+R aus E1; beide landen in `gedreht`.
- **Statuszeile:** „Zelt gesetzt: Jurte 6er“.

## D6 Daten

- **Format v7** (E3 hat v6): ein Objekt `{ "art": "zelt", "id": "…", "vorlage": "…", "name": "…", "aufbau": "…", "position": <Vec3>, "drehungRad": 0, "durchmesser": …, "ecken": …, "laenge": …, "breite": …, "wandhoehe": …, "firsthoehe": …, "waende": [true, true, true], "abspannungen": …, "seillaenge": …, "haringAbstand": …, "farbe": "#rrggbb" }`. Alle Felder Pflicht, Prüfung wie D1. Lesen mit den Hilfen aus `src/share/lesen.ts`.
- **Neue Version nötig**, weil eine unbekannte Art in älteren exes „Ungültige Bauwerk-Daten“ ergibt; Zeile in die README-Liste.
- Gelesen werden v1–v7; v1–v6 enthalten kein Zelt und laden unverändert.

## D7 Tests

- **Unit (TDD):**
  - `ZeltParams`-Prüfung mit allen Fehlertexten und Grenzwerten (50 m, 24 Ecken, 100 Abspannungen);
  - `verschobenUm`, `gedreht` mit und ohne Drehpunkt (Position und Drehung);
  - `umriss` und `flaeche` für `rund` (12-Eck, Ø 6,07 m ergibt rund 29 m²), `doppelkegel`, `sattel`, jeweils auch gedreht;
  - `haringe`: Anzahl = `abspannungen`, Abstand zur Kante = `haringAbstand`, bei 0 Abspannungen leer;
  - `platzPunkte` enthält Umriss und Haringe; `Platzbedarf` eines Bauwerks mit einem Zelt umfasst sie;
  - Vorlagen: jede Vorlage besteht die Prüfung; jede Zeile trägt einen `CHECK MANUALLY`-Vermerk (Test liest die Quelldatei);
  - Panel: Felder je Form, Vorlagenwechsel setzt alle Maße und ist ein Undo-Schritt, Wand 2 „aus“ ergibt `waende = [true, false, true]`, ungültiger Wert springt zurück;
  - Serializer v7-Rundlauf für alle Vorlagen; v1–v6 laden weiter; fehlendes Feld und unbekannte Form ergeben „Ungültige Bauwerk-Daten“;
  - Register: `zelt` genau einmal registriert;
  - Szene ohne WebGL: Auswahlwechsel baut nichts neu; geändertes Zelt baut genau einmal.
- **e2e:** Jurte 6er setzen, Wand 2 ausschalten, drehen, speichern und laden ergibt dasselbe. Doppelkegler setzen und „Alles zeigen“ umfasst die Haringe.
- **Unverändert grün:** alle bestehenden Tests, Build, Web-e2e, Desktop-e2e.

## Nicht in E4

- Bahnen, Knöpfe, Stangen im Detail, Mittelstangen und Rauchloch;
- Wandmaße der Jurte als Länge und Höhe je Wand (kommen, sobald Jakob gemessen hat);
- Vorbau des Doppelkeglers;
- Hanger mit echten Maßen (Zeltwart fragen);
- Statik, Windlast, Blitzschutz;
- Zelte in der Materialliste (E5 zählt Zelte, Haringe und Abspannseile);
- Abstandsregeln (E6; sie nutzen `umriss()`).

## Verifikation

- Die Tests aus D7 sind grün, ebenso Build und beide e2e-Läufe.
- **Manuell (Jakob):**
  - Eine Jurte 6er setzen und mit der echten vergleichen: Durchmesser, Wand- und Firsthöhe, Anzahl Haringe und Seillänge. Abweichungen im Panel korrigieren und die Werte danach in `vorlagen.ts` übernehmen.
  - Die 3 Wände der echten Jurte messen (Länge, Höhe) und melden.
  - Ein offenes Küchenzelt: eine Wand aus.
  - Den Doppelkegler prüfen (Seitenhöhe, Haringzahl) und die Maße des Hangers beim Zeltwart erfragen.
  - Speichern und in der exe laden.
