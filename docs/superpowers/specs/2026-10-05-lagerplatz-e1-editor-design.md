# Lagerbau-Simulator — Design-Spec E1: Editor-Grundlagen

Teil der Spec v3 (`2026-10-05-lagerplatz-planer-design.md`), Etappe E1. Setzt E0 „Fundament“ voraus: `LagerObjekt.verschobenUm` / `gedreht`, `Bauwerk.objekte`, Registry je Art, inkrementelle Szene, `ausgewaehlt: ReadonlySet<string>` und `aendereObjekte(ids, fn)`. Alles aus v1–v3 gilt weiter, insbesondere: keine Statik-Rechnung, die Fußzeile bleibt sichtbar.

## Context

Ohne Verschieben, Kopieren und Draufsicht lässt sich kein Lagerplatz planen. Heute kann man ein Objekt nur löschen und neu setzen, und gedreht werden können nur Baugruppen. E1 macht den Editor zum Layout-Werkzeug. Danach folgen das Luftbild (E2) und die Platz-Objekte (E3).

## Getroffene Entscheidungen (Brainstorming 05.10.2026)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Verschieben | **Ziehen mit der Maus + Pfeiltasten.** Verworfen: Verschiebe-Griffe (Gizmo; mehr UI, für Leiter ungewohnt) und nur Zahlen im Panel (mühsam) |
| 2 | Seile und Planen beim Verschieben | **Abspannungen und Planen wandern immer mit** (D2) |
| 3 | Mehrfachauswahl | **Shift + Klick** fügt hinzu oder nimmt weg |
| 4 | Klick auf eine Stange | **Klick = Teil** (Baugruppe oder freie Stange, wie heute), **Doppelklick = ganzer Bau** |
| 5 | Draufsicht | **Umschaltbar 3D / Plan:** echte Planansicht von oben ohne Perspektive. Verworfen: nur eine Kamera von oben (verzerrt, Messen ungenau) |

## D1 Bau und Auswahl

- **`Bau`** (neu, `src/model/Bau.ts`): eine Gruppe verbundener Stangen (über Bünde), dazu alle Seile und Planen, deren Enden an diesen Stangen hängen.
  - Die Logik zieht aus `Analyse.komponenten` (`src/rules/`) ins Modell, und `Analyse` nutzt sie von dort.
  - `Bau.von(bauwerk, teilId): Bau` liefert die Objekt-ids des Baus, zu dem ein Teil gehört.
  - E5 baut darauf auf (Materialliste und Regeln je Bau).
- **Auswahl:**
  - Klick wählt ein Teil: eine Baugruppe, eine freie Stange, ein Seil, einen Baum oder eine Plane.
  - Shift+Klick fügt ein Teil zur Auswahl hinzu oder nimmt es wieder weg.
  - Doppelklick wählt den ganzen Bau des getroffenen Teils.
  - Strg+A wählt alles.
  - Klick auf leeren Boden oder Esc hebt die Auswahl auf.
- **Rahmen-Auswahl in der Planansicht:** Shift+Ziehen auf leerem Boden wählt alle Objekte, deren Platzpunkte oder Mittelpunkt im Rahmen liegen.
- **Panel:** Bei genau einem ausgewählten Objekt erscheint das Panel wie bisher. Bei mehreren steht dort „N Objekte ausgewählt“ mit den Knöpfen Löschen und Duplizieren.
- **Entf** löscht die ganze Auswahl in **einem** Undo-Schritt.

## D2 Mitbewegung (rein, `src/model/Mitbewegung.ts`, ohne three.js)

Eine Funktion nimmt das Bauwerk, die bewegten ids und die Bewegung und liefert das neue Bauwerk oder einen `RangeError`. Die Bewegung ist eine Verschiebung `dv` oder eine Drehung `winkelRad` um einen Punkt.

- **Bewegte Objekte** werden mit `verschobenUm` bzw. `gedreht` bewegt.
- **Seile:** Jedes Ende wird über die bestehende Verankerung (Haring → Baum → Bau → Plane → frei) eingeordnet.
  - Ein Ende **wandert mit**, wenn es an einem bewegten Objekt hängt: an einer Stange eines bewegten Baus oder einer bewegten Baugruppe bzw. freien Stange, oder an einer Öse einer bewegten Plane.
  - Ein **Haring-Ende** wandert mit, wenn das andere Ende mitwandert. Die Abspannung zieht also samt Haring mit.
  - Ein Ende an einem **Baum** oder an einem **nicht bewegten** Teil bleibt liegen. Das Seil wird zwischen altem und neuem Ende neu gespannt.
  - **Freie Enden** wandern mit, wenn das andere Ende mitwandert.
- **Planen:**
  - Ein Ende der Aufhängelinie wandert mit, wenn es höchstens `BUND_TOLERANZ` von einer bewegten Stange entfernt liegt.
  - Wandern beide Enden, wird die Plane mitbewegt.
  - Wandert nur eines, entsteht eine neue Plane mit derselben Breite, Länge, Form, Neigung und Seite auf der neuen Linie.
- **Fehler:** Scheitert dabei eine Plane („Aufhängelinie zu kurz.“, „… zu steil.“, „Plane reicht in den Boden …“), wird **die ganze Bewegung abgelehnt**. Die Meldung lautet „Verschieben nicht möglich: “ + die Meldung der Plane, und nichts ändert sich.
- **Gleiche Regel für alle Wege:** Ziehen, Pfeiltasten, Drehen und Duplizieren nutzen dieselbe Mitbewegung.
- **Höhe:** Die Bewegung ist immer waagrecht (`dv.y = 0`). Alle Objekte behalten ihre Höhe.

## D3 Ziehen, Pfeiltasten, Drehen

- **Ziehen:**
  - **Start:** Linke Maustaste auf ein Objekt drücken und ziehen. Ist das Objekt ausgewählt, bewegt sich die ganze Auswahl. Sonst wird es vorher allein ausgewählt.
  - **Während des Ziehens:**
    - Der Versatz folgt dem Bodenpunkt unter der Maus, gerundet auf `BODEN_RASTER` (0,1 m).
    - Die Szene zeigt den Zwischenstand, ohne Eintrag im Verlauf.
    - Die Hinweise rechnen erst beim Loslassen neu.
    - Die Kamera bewegt sich dabei nicht.
  - **Loslassen:** ergibt **einen** Undo-Schritt. Esc während des Ziehens bricht ab.
  - Ziehen auf leerem Boden dreht wie bisher die Kamera; in der Planansicht verschiebt es sie.
- **Pfeiltasten** verschieben die Auswahl um 0,1 m, mit Shift um 1 m.
  - In der Planansicht gilt: oben = Norden = −z.
  - In 3D bewegt „oben“ in Blickrichtung, gerundet auf die nächste Weltachse.
  - Jeder Tastendruck ist ein Undo-Schritt.
- **Drehen:** R dreht die Auswahl um +15° (`DREH_SCHRITT`), Shift+R um −15°.
  - Gedreht wird um den Mittelpunkt der Platzpunkte der Auswahl. Bei einem einzelnen Objekt ohne Platzpunkte gilt dessen eigener Drehpunkt.
  - Das gilt jetzt für **alle Arten**, nicht nur für Baugruppen.
- **Einheitliche Ablehnung:** Werkzeuge mit halbem Zustand (z. B. ein halb gespanntes Seil) reagieren nicht auf Ziehen. Ist eine Bewegung unmöglich, erscheint die Meldung aus D2 und die Auswahl bleibt.

## D4 Kopieren und Duplizieren

- **Strg+D** oder der Knopf „Duplizieren“ kopiert die Auswahl samt mitwandernder Seile, Planen und Haringe (Regeln aus D2) um +1 m in x und z.
  - Alle Kopien bekommen neue ids.
  - Danach ist die Kopie ausgewählt.
  - Das Ganze ist ein Undo-Schritt.
- **Strg+C / Strg+V** arbeiten mit einer Zwischenablage nur innerhalb der App, nicht der System-Zwischenablage.
  - Einfügen setzt die Kopie mit ihrem Mittelpunkt auf den Bodenpunkt unter der Maus, gerundet auf das Raster.
  - Ist die Maus nicht über der Szene, wird um +1 m versetzt.
- **Ids:** Ein neuer Präfix-Zähler wie beim Platzieren verhindert Kollisionen. Ein Test baut 50 Kopien hintereinander und prüft, dass alle ids eindeutig sind.

## D5 Planansicht, „Alles zeigen“, Messen

- **Umschalten:** Knopf „Plan / 3D“ oder Taste P.
- **Plan:** `OrthographicCamera` senkrecht von oben, Norden (−z) oben.
  - Ziehen auf leerem Boden verschiebt die Ansicht, das Mausrad zoomt.
  - Kein Drehen der Kamera.
  - Die Objekte bleiben 3D-Meshes von oben gesehen; es gibt keine eigene 2D-Darstellung.
- **3D:** wie heute, perspektivisch mit OrbitControls.
- **„Alles zeigen“** (Knopf oder Taste F) passt die aktive Kamera so ein, dass alle Platzpunkte und Objekte mit 10 % Rand sichtbar sind.
  - Das passiert auch beim Laden eines Links oder einer Datei.
  - Bei einem leeren Bauwerk wird der Boden mit 40 × 40 m eingepasst.
- **Maßstabsleiste** (nur Planansicht): unten links, Länge automatisch 1, 2, 5, 10, 20 oder 50 m, sodass sie 80–160 px breit ist. Beschriftung z. B. „10 m“.
- **Werkzeug „Messen“:**
  - Zwei Klicks mit denselben Fangpunkten wie „Seil spannen“.
  - Angezeigt werden eine Linie und die Länge „3.42 m (waagrecht 3.40 m)“.
  - Die Messung bleibt sichtbar, bis man neu misst, Esc drückt oder das Werkzeug wechselt.
  - Sie wird nicht gespeichert und gehört nicht ins Bauwerk.
- **Ansichtsmodus am Handy:** Plan / 3D und „Alles zeigen“ gibt es auch dort; bearbeitet wird weiterhin nichts.

## D6 Daten

- Das Datenformat ändert sich nicht (v4 aus E0).
- Ansicht, Messung und Zwischenablage werden nicht gespeichert.

## D7 Tests

- **Unit (TDD), Modell:**
  - `Bau.von` an der Kochstelle mit Firststange: Doppelklick auf das A-Bock-Bein liefert A-Bock, Dreibein, Firststange und alle Abspannseile.
  - `Mitbewegung` mit Verschieben und Drehen:
    - Abspannung Bau → Haring wandert ganz mit;
    - Seil Bau → Baum: das Baum-Ende bleibt;
    - Seil zwischen zwei nicht bewegten Teilen bleibt identisch (`===`);
    - Plane mit beiden Enden am Bau wandert mit;
    - Plane mit einem Ende am Baum wird neu gespannt;
    - Plane, die dabei zu steil würde → ganze Bewegung abgelehnt, das Bauwerk bleibt `===`;
    - Höhe bleibt.
- **Unit, Editor:**
  - Shift+Klick, Doppelklick, Strg+A, Esc;
  - Entf mehrerer Objekte in einem Undo-Schritt;
  - Pfeiltasten mit Schrittweiten;
  - R / Shift+R für alle Arten;
  - Strg+D mit neuen ids (50 Kopien eindeutig) und einem Undo-Schritt;
  - Strg+C/V;
  - Ziehen als ein Undo-Schritt, Esc während des Ziehens.
- **Unit, Ansicht:** Wahl der Maßstabsleisten-Länge; Kamera-Einpassen auf Platzpunkte (rein rechnerisch, ohne WebGL).
- **e2e:**
  - Kochstelle laden → Doppelklick auf eine Stange → ziehen → alle Teile und Abspannungen sind verschoben, die Hinweise sind gleich.
  - Plan / 3D umschalten.
  - Messen zwischen zwei Spitzen zeigt den erwarteten Abstand.
- **Unverändert grün:** alle bestehenden Tests, Build, Web-e2e, Desktop-e2e.

## Nicht in E1

- Gizmo-Griffe;
- Fangen an anderen Objekten beim Ziehen (nur Raster);
- Höhe ändern;
- Ecken von Flächen ziehen (kommt mit E3);
- Luftbild und Nordpfeil (E2);
- Kopieren über die System-Zwischenablage oder zwischen zwei Fenstern;
- Regeln oder Materialliste je Bau (E5).

## Verifikation

- Die Tests aus D7 sind grün, ebenso Build, Web-e2e und Desktop-e2e.
- **Manuell (Jakob):**
  - Kochstelle per Doppelklick wählen und über den Platz ziehen: Abspannungen und Planen wandern mit.
  - Einen Bau duplizieren und drehen.
  - In der Planansicht per Shift-Rahmen mehrere Bauten wählen und mit den Pfeiltasten verschieben.
  - Messen.
  - Undo nach jedem Schritt.
