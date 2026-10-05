# Lagerbau-Simulator — Design-Spec E3: Platz-Objekte

Teil der Spec v3 (`2026-10-05-lagerplatz-planer-design.md`), Etappe E3. Setzt voraus:
- **E0:** Registry je Art, Datenformat, inkrementelle Szene;
- **E1:** Auswahl, Ziehen, Drehen, Duplizieren, Planansicht;
- **E2:** Luftbild, Datenformat v5.

Alles aus v1–v3 gilt weiter.

## Context

Auf dem Lagerplatz stehen außer Bauten und Zelten viele einfache Dinge: Feuerstelle, Fahnenmast, Latrine, Wasserstelle, Holzlager. Dazu kommen Bereiche (Küche, Spielwiese), Wege, Zäune und Beschriftungen. E3 macht sie planbar.

## Getroffene Entscheidungen (05.10.2026)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Objektliste | Feuerstelle, Fahnenmast, Latrine/WC, Wasserstelle, Holzlager, Text-Beschriftung, Zonen als Fläche, Wege/Zäune als Linie (Vorschlag der Spec v3; Jakob hat nichts gestrichen) |
| 2 | Grundsatz | **„So einstellbar wie möglich“** (Jakob): Maße, Formen, Namen und Farben sind Felder im Panel, keine festen Werte. Feste Objekttypen gibt es nicht; die Liste aus #1 sind **Vorlagen**, die die Felder vorbelegen. Mit der Vorlage „Eigenes“ legt man alles an, was fehlt |

## D1 Arten (je eine `ObjektArt` nach E0)

Alle Platz-Objekte liegen am Boden. Sie werden mit E1 verschoben, gedreht, dupliziert und gelöscht.

### Platz-Objekt (`platzobjekt`, ein Klick)

- **Parameter:**
  - `vorlage` (Schlüssel aus D2);
  - `name` (Text, 1–40 Zeichen);
  - `form` (`kreis` | `rechteck`);
  - `breite` (m, > 0; beim Kreis der Durchmesser);
  - `laenge` (m, > 0; nur beim Rechteck);
  - `hoehe` (m, ≥ 0);
  - `farbe` (`#rrggbb`);
  - `drehungRad`.
- **Darstellung:** Zylinder bzw. Quader in der Farbe. Bei Höhe 0 ist es eine flache Scheibe bzw. Platte (1 cm). Über dem Objekt steht der Name als Beschriftung, die sich über „Beschriftungen zeigen“ ausblenden lässt.
- **Panel:**
  - Auswahlfeld „Vorlage“: Ein Wechsel setzt alle Felder auf die Werte der Vorlage, als ein Undo-Schritt.
  - Die Felder Name, Form, Breite/Durchmesser, Länge (nur beim Rechteck), Höhe und Farbe (`<input type="color">`).
  - Ungültige Werte zeigen eine deutsche Meldung, und das Feld springt zurück (Muster aus v1).

### Beschriftung (`beschriftung`, ein Klick)

- **Parameter:** `text` (1–80 Zeichen), `groesse` (Schrifthöhe in m, > 0, Start 1 m), `farbe`.
- **Darstellung:** Text als Sprite knapp über dem Boden, in der Planansicht lesbar. Die Größe ist in Metern, wächst also mit der Szene mit.

### Zone (`zone`, Polygon)

- **Parameter:** `name`, `farbe`, `deckkraft` (0–100 %, Start 40 %), `punkte: Vec3[]` (y = 0, mindestens 3).
- **Werkzeug „Zone zeichnen“:**
  - Jeder Klick setzt eine Ecke.
  - Doppelklick oder Enter schließt die Fläche, Esc bricht ab.
  - Ecken rasten auf das Raster und auf vorhandene Ecken (neue Fangart `ecke`, Radius `SNAP_RADIUS`).
- **Darstellung:** eine flache Fläche bei y = 0,005, also unter Bodenplanen (Planen liegen auf y ≥ 0, Zonen darunter); der Name steht in der Mitte.
- **Panel:** Name, Farbe, Deckkraft, Info „Fläche 312 m²“.
- **Fehler:** „Eine Zone braucht mindestens 3 Ecken.“ und „Die Zone darf sich nicht selbst schneiden.“

### Linie (`linie`, Linienzug)

- **Parameter:** `name`, `typ` (`weg` | `zaun` | `grenze`), `breite` (m, > 0, nur beim Weg; Start 1 m), `farbe`, `punkte: Vec3[]` (mindestens 2).
- **Werkzeug „Linie zeichnen“:** wie „Zone zeichnen“, Abschluss mit Doppelklick oder Enter.
- **Darstellung je Typ:**
  - Weg: flaches Band in der eingestellten Breite;
  - Zaun: Pfosten alle 2 m, Höhe 1 m, mit einer Linie oben;
  - Grenze: gestrichelte Linie am Boden.
- **Panel:** Name, Typ, Breite (nur beim Weg), Farbe, Info „Länge 48,3 m“.
- **Fehler:** „Eine Linie braucht mindestens 2 Punkte.“

### Ecken bearbeiten (Zone und Linie)

- Ist eine Zone oder Linie ausgewählt, zeigt sie Griffe an ihren Ecken. Einen Griff zieht man mit E1-Ziehen, gerastert auf 0,1 m.
- **Ecke einfügen:** Doppelklick auf eine Kante.
- **Ecke entfernen:** Entf, während ein Griff ausgewählt ist. Unter 3 bzw. 2 Ecken kommt die Fehlermeldung, und die Ecke bleibt.
- Jede Änderung ist ein Undo-Schritt.

## D2 Vorlagen (`src/arten/platz/vorlagen.ts`)

Eine Liste von Startwerten, an einer Stelle und leicht zu ändern. **Alle Werte sind Startwerte von Claude mit `// CHECK MANUALLY`**; Jakob kann sie jederzeit ändern, und jedes Objekt lässt sich ohnehin frei einstellen.

| Vorlage | Form | Breite × Länge | Höhe | Farbe |
|---|---|---|---|---|
| Feuerstelle | Kreis | Ø 1,5 m | 0,3 m | Orange |
| Fahnenmast | Kreis | Ø 0,2 m | 8 m | Braun |
| Latrine/WC | Rechteck | 1,5 × 1,5 m | 2 m | Grau |
| Wasserstelle | Kreis | Ø 1 m | 1 m | Blau |
| Holzlager | Rechteck | 3 × 2 m | 1 m | Braun |
| Eigenes | Rechteck | 2 × 2 m | 1 m | Grau |

- **Werkzeug „Platz-Objekt“:** Ein Knopf öffnet ein Auswahlfeld mit den Vorlagen. Der nächste Klick setzt ein Objekt mit dieser Vorlage.
- Die zuletzt gewählte Vorlage bleibt aktiv, sodass man mehrere Feuerstellen nacheinander setzen kann.

## D3 Zusammenspiel mit dem Bestehenden

- **Platzbedarf:** Er zählt weiterhin nur Bauten (Füße, Heringe, Ösen). Platz-Objekte, Zonen und Linien gehören nicht dazu.
  - Dafür bekommt `ObjektArt` die Eigenschaft `zaehltZumPlatzbedarf` (Standard `true`; für die vier Arten aus D1 `false`).
  - Für Auswahlrahmen, Drehpunkt und „Alles zeigen“ zählen alle Arten.
- **Regeln:** Es gibt keine neuen Regeln. R1–R8 sehen nur Stangen und Seile, daher erzeugen Platz-Objekte keine Hinweise. Abstandsregeln kommen mit E6.
- **Materialliste:** Platz-Objekte kommen erst mit E5 hinein (gruppiert nach Name, Zäune mit Länge).
- **Klickziele:**
  - Platz-Objekte und Beschriftungen sind in „Auswahl“ immer klickbar.
  - Zonen und Linien sind in „Auswahl“ ebenfalls klickbar. In allen anderen Werkzeugen sind sie das nicht, damit man auf einer Zone Bauten setzen kann.
- **Daten:**
  - Datenformat v6 mit den vier neuen Arten in `objekte`; gelesen werden v1–v6.
  - Ältere exes lehnen v6 mit „Ungültige Bauwerk-Daten“ ab; das kommt in die README-Liste.

## D4 Tests

- **Unit (TDD):**
  - je Art die Parameterprüfung mit allen Fehlertexten;
  - Zone: Fläche (Shoelace-Formel) und Selbstschnitt;
  - Linie: Länge;
  - `verschobenUm` und `gedreht` für alle vier Arten;
  - Vorlagenwechsel setzt alle Felder und ist ein Undo-Schritt;
  - Ecke einfügen, ziehen und entfernen samt Mindestanzahl;
  - Fangart `ecke`;
  - Platzbedarf ignoriert Platz-Objekte;
  - Serializer v6-Rundlauf, v1–v5 lesen weiter.
- **e2e:**
  - Feuerstelle setzen, Durchmesser im Panel auf 2 m ändern und die Darstellung prüfen.
  - Zone mit 4 Klicks + Enter zeichnen → Info „Fläche … m²“.
  - Weg zeichnen → Info „Länge … m“.
  - Speichern und Laden ergibt dasselbe.
- **Unverändert grün:** alle bestehenden Tests, Build, Web-e2e, Desktop-e2e.

## Nicht in E3

- Abstandsregeln (E6);
- Materialliste (E5);
- eigene Vorlagen speichern (Duplizieren aus E1 deckt Wiederverwendung ab);
- Symbole oder Icons statt Grundkörpern;
- gebogene Linien;
- Löcher in Zonen;
- Höhenlinien.

## Verifikation

- Die Tests aus D4 sind grün, ebenso Build und beide e2e-Läufe.
- **Manuell (Jakob):**
  - Einen Lagerplatz auf seinem Luftbild auslegen: Feuerstelle, Fahnenmast, Latrine, Küchen-Zone, Weg, Zaun.
  - Alles verschieben und drehen.
  - Ecken bearbeiten.
  - Speichern und in der exe laden.
