# Lagerbau-Simulator — Design-Spec v2b: Planen

Baut auf der v1-Spec (`2026-09-30-lagerbau-simulator-design.md`) und der v2a-Spec (`2026-10-01-lagerbau-abspannungen-design.md`) auf. Alles dort gilt weiter, insbesondere: **keine Statik-Rechnung**, Schwellwerte kommen von Jakob, die Fußzeile bleibt immer sichtbar.

## Context

v2b ist der zweite der drei Teile aus der v2a-Spec: v2a Abspannungen (fertig) → **v2b rechteckige Planen** (dieser Spec) → v2c Kohten-/Jurtenbahnen. Die Leiterteams wollen Planen über, an und unter Bauten ziehen, sehen, wie das aussieht, und wissen, welche Planen sie mitnehmen müssen und wie viel Platz das braucht.

## Getroffene Entscheidungen (Brainstorming 01.–02.10.2026)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Einsatz | alle vier: Regendach/Sonnensegel, Satteldach über einer Firststange, Wand/Windschutz, Bodenplane |
| 2 | Ausgaben | 3D-Ansicht, Materialliste, Platzbedarf. **Keine Hinweise (Regeln) für Planen.** |
| 3 | Größen | freie Eingabe Breite × Länge in Metern (Startwert 3 × 4 m), keine Bestandsliste |
| 4 | Modell | **Ansatz A: Aufhängelinie + Form.** Verworfen: B vier geklickte Ecken (4 Klicks, Größe nur geschätzt, Satteldach bräuchte 6 Punkte); C Plane als Eigenschaft eines Baus (keine Wand, keine Bodenplane, kein Segel zwischen Bäumen) |
| 5 | Seilbefestigung | Ösen an den 4 Ecken + 4 Kantenmitten |

## D1 Modell (`src/model/`, ohne three.js und DOM)

- **`Plane`** (unveränderlich): `id`, Aufhängelinie `start: Vec3` und `ende: Vec3` (zwei Klicks), Parameter `breite`, `laenge` (m), `form: 'eben' | 'satteldach'`, `neigungGrad` (0–90), `seite: 1 | -1` (nur für `eben` wirksam, bei `satteldach` gespeichert, aber ignoriert).
- **Lage der Länge:** Die Länge läuft entlang der Linie, mittig zu deren Mittelpunkt. Eine 4-m-Plane auf einer 3-m-Linie steht also auf jeder Seite 0,5 m über.
- **Form `eben`:** Die Linie ist die Oberkante. Die Plane läuft `breite` weit zur gewählten Seite, um `neigungGrad` unter die Waagrechte geneigt: 0° Bodenplane/flaches Segel, 30° Regendach, 90° Wand.
- **Form `satteldach`:** Die Linie ist der First. Je `breite / 2` hängt zu beiden Seiten mit derselben Neigung.
- **Geometrie:** Sei `u` die Einheitsrichtung der Linie, `h = normiert(ŷ × u) · seite` die waagrechte Richtung quer zur Linie und `v` die Richtung senkrecht zu `u` und `h` mit negativem y-Anteil. Die Plane läuft von der Linie weg in Richtung `d = cos(neigung) · h + sin(neigung) · v`. Weil `d ⟂ u`, bleibt die Plane auch auf einer schrägen Linie ein echtes Rechteck und kippt mit ihr. Beim Satteldach gilt dasselbe für beide Seiten (`seite = +1` und `−1`).
- **Ösen** = die 4 Ecken + die 4 Kantenmitten der ausgebreiteten Plane, immer genau 8 Punkte (`oesen(): readonly Vec3[]`). Beim Satteldach liegen zwei davon auf den Firstenden. Weil die Ecken die tiefsten Punkte des Rechtecks sind, reicht die Bodenprüfung über die Ösen.
- **Fehler** (`RangeError`, deutsche Meldung):
  - `breite` oder `laenge` ≤ 0 oder nicht endlich;
  - `neigungGrad` außerhalb 0–90 oder nicht endlich;
  - `form` oder `seite` mit unbekanntem Wert;
  - Linie kürzer als `MIN_SEILLAENGE` → „Aufhängelinie zu kurz.";
  - waagrechter Anteil der Linie kürzer als `MIN_SEILLAENGE` → „Aufhängelinie zu steil." (sonst ist `h` nicht bestimmt);
  - eine Öse tiefer als `−FUSS_TOLERANZ` → „Plane reicht in den Boden: Neigung oder Breite verringern."
- Unveränderliche Updates: `mitParams(...)` liefert eine neue `Plane` und prüft dabei alles neu.
- **`Bauwerk`** bekommt die Liste `planen` mit `mitPlane`, `ersetzePlane`, `plane(id)`. `ohne(id)` entfernt auch Planen, `enthaelt(id)` kennt sie, Ids sind über alle Teile eindeutig.
- **Verankerung** bekommt die Art `{ art: 'plane'; planeId }`: Ein Seilende höchstens `BUND_TOLERANZ` von einer Öse entfernt hängt an dieser Plane. Neue Reihenfolge: **Hering → Plane → Baum → Bau → frei.** Ein Seil zu einer Öse einer Bodenplane am Boden ist also ein Hering, genau wie beim Abstecken einer Bodenplane.
- **Seile wandern nicht mit**, wenn eine Plane geändert oder neu gespannt wird (wie in v2a). Die alten Seilenden hängen dann in der Luft, und R8 meldet sie.
- Das Tool prüft nicht, ob die Plane selbst richtig auf Stangen aufliegt oder hängt.

## D2 Editor & Darstellung

- **Neues Werkzeug „Plane spannen"** (`'plane'`): zwei Klicks für die Aufhängelinie. Jedes Ende rastet über den `SnapService` ein wie bei „Seil spannen" (Spitze, Bund, Stangenende, Stange, Baum, Boden).
  - Startwerte: `STANDARD_PLANE` = 3 × 4 m, `eben`, Seite +1.
  - Neigung: Liegen beide Enden am Boden (y ≤ `FUSS_TOLERANZ`), 0° (Bodenplane). Sonst 30°. Würde die Plane damit in den Boden reichen, nimmt das Werkzeug die größte ganze Gradzahl darunter, bei der keine Öse im Boden liegt.
  - Zweimal derselbe Punkt oder eine zu kurze Linie wird ignoriert, ohne Meldung (wie beim Seil). Jeder andere Modellfehler, auch „reicht selbst bei 0° in den Boden", erscheint als Meldung im Editor; es entsteht keine Plane.
- **Klickziele pro Werkzeug** ersetzen das v2a-Flag `trifftSeile`: `klickZiele: readonly ('seil' | 'plane')[]`.
  - Auswahl → Seile und Planen;
  - Seil spannen → Planen (für die Ösen);
  - alle anderen Werkzeuge → keine. Ein großes Regendach blockiert also nicht das Setzen eines Dreibeins darunter.
- `Treffer` bekommt die Art `'plane'` (mit `planeId` und Trefferpunkt).
- **Ösen als Fangpunkte**, nur für „Seil spannen": neue Fangart `oese`. Ein Klick irgendwo auf eine Plane rastet auf die **nächstgelegene Öse dieser Plane** ein, egal wie weit sie entfernt ist. So landet kein Seilende in der Luft.
- **Parameter-Panel** für eine ausgewählte Plane:
  - Felder Breite (m), Länge (m), Neigung (°) im bestehenden Formularmuster; ungültiger Wert → deutsche Meldung, Feld springt zurück;
  - neue Auswahlliste **Form** (eben / Satteldach); ist die neue Form ungültig (z. B. Öse im Boden), Meldung und die Auswahl springt zurück;
  - Knopf **„Seite wechseln"**, nur bei `eben` sichtbar; ist die andere Seite ungültig, Meldung, nichts ändert sich;
  - „Löschen". Auswählen, Löschen (Entf), Rückgängig/Wiederholen wie bisher. Kein Verschieben: Eine Plane wird neu gespannt.
- **Darstellung in `Szene`:**
  - Plane als beidseitige Fläche, deckend in Oliv/Khaki, ausgewählt orange (wie Seile);
  - Ösen werden nicht gezeichnet;
  - das Mesh trägt `userData.planeId` und ist Klickziel gemäß der Tabelle oben.

## D3 Regeln (`src/rules/`)

Keine neue Regel, keine Hinweise zu Planen selbst. Anpassungen an bestehenden Regeln, damit die neue Verankerungsart richtig zählt:

- **R1 „A-Bock quer":** Ein Seil, dessen anderes Ende an einer Plane hängt, zählt **nicht** als Sicherung des A-Bocks. Eine Plane hält einen A-Bock nicht seitlich. (Heute filtert R1 nur `frei` aus; künftig auch `plane`.)
- **R6 „Abspannwinkel":** unverändert, gilt nur für Seile Bau → Hering.
- **R7 „Stolperfalle":** gilt wie in der v2a-Spec für jedes Seil, bei dem **kein** Ende ein Hering ist. Ein Ende an einer Plane zählt dabei wie Bau oder Baum: Ein tiefes Seil von einer Öse zu einem Baum feuert R7. (Heute erkennt der Code ein Querseil nur an `bau`/`baum`; `plane` kommt dazu. Ein freies Ende bleibt bei R8.)
- **R8 „Seil hängt in der Luft":** unverändert; `plane` gilt als verankert.
- R3 (Standfläche) zählt weiter nur Heringe von Seilen am Bau. Planen ändern die Standfläche nicht.

## D4 Materialliste & Platzbedarf

- Die Materialliste bekommt einen vierten Abschnitt **Planen** mit den Spalten „Plane | Anzahl", gruppiert nach Größe:
  - Größe immer als kleinere × größere Seite, also zählt 4 × 3 als 3 × 4;
  - Gruppierung nach den auf 0,1 m gerundeten Maßen, damit nie zwei Zeilen mit gleichem Text entstehen;
  - Anzeige wie bisher mit Punkt: `3.0 × 4.0 m`;
  - Sortierung: größere Seite absteigend, dann kleinere Seite absteigend.
- Seile und Heringe bleiben wie in v2a; Seile an Planen werden normal mitgezählt.
- **Platzbedarf:** Das Rechteck umfasst zusätzlich alle Ösen aller Planen, auf den Boden projiziert. Der Überstand eines Regendachs zählt also mit. Eine einzelne Plane zwischen zwei Bäumen hat damit einen Platzbedarf, auch ohne Füße und Heringe. Bäume zählen weiterhin nicht.

## D5 Daten (Teilen/Speichern)

- Das Datenformat geht auf **Version 3**: zusätzlich `planen: [{ id, start, ende, breite, laenge, form, neigung, seite }]` (`neigung` in Grad).
- Geschrieben wird immer Version 3. Gelesen werden Version 1 (ohne Seile, Bäume, Planen), Version 2 (ohne Planen) und Version 3. Jedes Feld wird geprüft wie bisher; Modellfehler einer Plane erscheinen als „Ungültige Bauwerk-Daten: …".
- `MAX_TEILE = 500` zählt Gruppen, Stangen, Seile, Bäume und Planen zusammen.
- **App-Version 1.2.0.** Ein v3-Link oder eine v3-Datei in einer **älteren** `.exe` zeigt „Ungültige Bauwerk-Daten". Die README sagt, dass die Leiterteams dann die neue `.exe` brauchen.

## D6 Tests

- **Unit (TDD):**
  - `Plane`: `eben` bei 0°, 30°, 90°; Satteldach; eine schräge Linie ergibt ein Rechteck mit rechten Winkeln; Überstand mittig; immer 8 Ösen; jede Fehlerart aus D1 mit ihrer Meldung; `mitParams` prüft neu.
  - `Bauwerk`: `mitPlane`, `ersetzePlane`, `plane(id)`; `ohne` entfernt Planen; eindeutige Ids.
  - Verankerung: `plane` an einer Öse; Reihenfolge (Öse am Boden → Hering, Öse an einem Baum → Plane).
  - Regeln: R1 ignoriert Seile zu Planen; R7 feuert für ein tiefes Seil Öse ↔ Baum; R8 still bei Seilen zu Planen.
  - Serializer: Rundreise v3; v1- und v2-Links lesen; Grenze inkl. Planen; ungültige Planenwerte abgelehnt.
  - Materialliste: Gruppierung, 4 × 3 = 3 × 4, Rundung, Sortierung. Platzbedarf mit Plane, auch eine Plane allein.
  - Editor: Fangart `oese` und nächste Öse bei Treffer auf einer Plane; Klickziele pro Werkzeug; Startwerte (Boden → 0°, automatisch flacher, Meldung wenn nichts passt).
  - Panel: Felder, Form-Auswahl, „Seite wechseln" nur bei `eben`, ungültige Werte springen zurück.
- **E2E Web:** neues `e2e/planen.spec.ts`. Ein v3-Link mit Satteldach über der Kochstelle wird geöffnet; die Materialliste zeigt die Plane, und der Platzbedarf stimmt. `smoke` und `abspannung` bleiben grün.
- **E2E Desktop:** unverändert, läuft gegen die neue `.exe` 1.2.0.
- **Sichtprüfung** per Screenshot wie bei v2a: Satteldach, Regendach, Wand, Bodenplane.
- **Gemeinheitsbau (Jakob):**
  - eine Plane auf einer schrägen Linie mit großem Überstand;
  - ein Seil an einer Öse, danach die Plane breiter machen;
  - ein Satteldach, dessen Hälfte knapp über dem Boden endet;
  - ein Seil, das von einem A-Bock nur zu Planen läuft.

## Nicht in v2b

Hinweise für Planen, Prüfung, ob eine Plane trägt oder richtig hängt, Durchhang und Wind, Planen verschieben, Ösen alle X cm, schiefe Segel mit vier verschiedenen Eckhöhen, Seile, die beim Ändern einer Plane mitwandern, v2c Kohten-/Jurtenbahnen.

## Verifikation

- `npm test` grün, Abdeckung `model/` + `rules/` ≥ 80 %. `npm run build`, `npm run e2e`, `npm run e2e:desktop` grün.
- Manuell (Jakob):
  - ein Satteldach über die Firststange der Kochstelle spannen, die Neigung ändern, die Form auf „eben" stellen und die Seite wechseln;
  - eine Bodenplane, eine Wand und ein Regendach zwischen zwei Bäumen spannen;
  - ein Seil von einer Öse zu einem Hering spannen; die Plane danach ändern, und R8 meldet das Seil;
  - die Materialliste nennt die Planengrößen, und der Platzbedarf umfasst den Überstand.
