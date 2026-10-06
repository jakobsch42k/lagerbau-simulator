# Lagerbau-Simulator — Design-Spec E2: Luftbild als Boden

Teil der Spec v3 (`2026-10-05-lagerplatz-planer-design.md`), Etappe E2. Setzt E0 (Datenformat v4, Registry, inkrementelle Szene) und E1 voraus. E1 liefert die Planansicht, „Alles zeigen“, Strg+A und Ziehen. Alles aus v1–v3 gilt weiter.

## Context

Ein Lagerplatz wird auf dem echten Gelände geplant: Wiese, Bäume, Wege, Bach. Statt den Platz nachzubauen, lädt man einen Screenshot aus einem Kartendienst (z. B. Google Maps oder basemap.at, Orthofoto) als Boden. Der Boden bleibt flach (y = 0).

## Getroffene Entscheidungen

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Gelände (Spec v3) | Luftbild als Boden, Maßstab mit zwei Klicks; flach |
| 2 | Teilen (Spec v3) | Das Bild steckt in der **Datei**, nicht im Teilen-Link (zu groß) |
| 3 | Ausrichtung (05.10.2026) | **Bilder sind immer genordet.** Das Bild wird so eingesetzt, wie es ist, mit Norden oben (−z). Es gibt keinen Dreh-Regler; ein gedrehtes Bild dreht man vorher im Bildprogramm |

## D1 Modell (`src/model/`, ohne three.js und DOM)

- **`Luftbild`** (neu, unveränderlich):
  - Felder: `daten` (Data-URL `data:image/jpeg;base64,…` oder `data:image/png;base64,…`), `breitePx`, `hoehePx` (ganze Zahlen > 0), `meterProPixel` (> 0, endlich) und `deckkraft` (0–1).
  - Abgeleitet: `breiteM`, `hoeheM`, `ecken()`. Das Bild liegt mittig auf dem Ursprung, Norden ist −z.
  - Methoden: `mitMassstab(meterProPixel)`, `mitDeckkraft(d)`.
- **Fehler** (`RangeError`, deutsch):
  - „Ungültiges Bildformat (nur PNG oder JPEG)“;
  - „Maßstab muss größer als 0 sein“;
  - „Deckkraft muss zwischen 0 und 100 % liegen“;
  - „Bild zu groß“ (D4).
- **`Bauwerk`** bekommt `luftbild: Luftbild | null` und `mitLuftbild(l | null)`.
  - Das Luftbild ist **kein** `LagerObjekt`: Es steht nicht in `objekte` und lässt sich nicht auswählen oder verschieben.
  - Laden, Maßstab, Deckkraft und Entfernen laufen damit über den bestehenden Verlauf und sind je ein Undo-Schritt.

## D2 Laden und Maßstab

- **Knopf „Luftbild…“:** Datei-Auswahl für PNG/JPG (`<input type="file" accept="image/png,image/jpeg">`); das geht in Browser und exe.
- **Verkleinern beim Laden:** Ist die längere Seite größer als 4096 px, wird das Bild per Canvas auf 4096 px verkleinert und als JPEG mit Qualität 0,85 gespeichert. Kleinere Bilder bleiben unverändert.
- **Vorläufiger Maßstab:** `meterProPixel` so, dass die längere Seite 100 m lang ist. Danach startet sofort das Werkzeug „Maßstab setzen“.
- **Werkzeug „Maßstab setzen“:**
  1. Statuszeile: „Klicke zwei Punkte, deren Abstand du kennst.“
  2. Zwei Klicks auf das Bild. Es rastet nichts ein, gerechnet wird in Bildpixeln.
  3. Im Panel erscheint das Feld „Abstand in Metern“ mit dem Knopf „Übernehmen“. Es gibt bewusst kein `window.prompt`, weil das in der exe nicht geht.
  4. Ergebnis: `meterProPixel = Meter / Pixelabstand`.
  5. Liegen die beiden Punkte weniger als 10 px auseinander, erscheint „Punkte zu nah beieinander“, und das Werkzeug bleibt aktiv.
- **Panel des Luftbilds**, über den Knopf „Luftbild“ in der Werkzeugleiste, sobald ein Bild geladen ist:
  - Info „Bild 245 × 180 m, 1 px = 0,12 m“;
  - Knopf „Maßstab neu setzen“;
  - Regler „Deckkraft“ (0–100 %);
  - Schalter „Raster zeigen“;
  - Knopf „Luftbild entfernen“.
- **Bestehende Objekte bleiben**, wo sie sind; das Bild liegt immer mittig auf dem Ursprung. Passt der Bau nicht zum Bild, wählt man alles (Strg+A) und zieht es an die richtige Stelle (E1).

## D3 Darstellung

- **Boden:** Ein Mesh in Bildgröße mit dem Bild als Textur und der eingestellten Deckkraft.
  - Darunter bleibt eine neutrale Bodenfläche, mindestens 40 × 40 m und mindestens Bildgröße + 20 m.
  - Ist ein Bild geladen, ist das Raster standardmäßig aus.
- **Kamera:** Die Far-Plane und der Zoombereich wachsen mit der Bodengröße.
  - „Alles zeigen“ passt auf die Objekte ein.
  - Gibt es keine Objekte, passt es auf das Bild ein.
- **Nordpfeil:** oben rechts im Ansichtsfenster.
  - In der Planansicht zeigt er immer nach oben.
  - In 3D dreht er sich mit der Kamera (Azimut).
- **Szene neu bauen:** Die Bild-Textur wird nur neu gebaut, wenn sich das `Luftbild`-Objekt ändert (Identität, wie in E0 D5).

## D4 Daten

- **Datenformat v5:** wie v4 plus optional `luftbild: { daten, breitePx, hoehePx, meterProPixel, deckkraft }`. Gelesen werden v1–v5.
- **Datei:**
  - Die Datei enthält das Bild.
  - Neue Grenze `MAX_DATEI_ZEICHEN = 15_000_000`: `pruefeDateigroesse` prüft Dateien künftig dagegen statt gegen `MAX_JSON_ZEICHEN`.
  - Links behalten ihre Grenzen `MAX_HASH_ZEICHEN` und `MAX_JSON_ZEICHEN`.
  - Ist die Data-URL länger als 12 000 000 Zeichen, erscheint „Bild zu groß“.
- **Teilen-Link:**
  - Der Link lässt `daten` weg und schreibt stattdessen `luftbild: { entfernt: true }`.
  - Wer den Link öffnet, sieht den Plan ohne Bild und in der Statuszeile „Das Luftbild ist nur in der gespeicherten Datei enthalten.“
- **README:** Dateien aus der Version, die E2 setzt, öffnet nur die exe ab dieser Version. Die Zeile kommt in die bestehende Liste.

## D5 Tests

- **Unit (TDD):**
  - `Luftbild`: Maße, Ecken, Fehlertexte, `mitMassstab`, `mitDeckkraft`.
  - Maßstab aus zwei Pixelpunkten und Metern, inklusive „Punkte zu nah beieinander“.
  - Verkleinern: Die Zielgröße wird rein rechnerisch geprüft (4096er-Grenze, Seitenverhältnis).
  - Serializer:
    - v5 mit und ohne Bild im Rundlauf;
    - Link ohne `daten` mit `entfernt: true`;
    - v1–v4 lesen weiter;
    - Datei-Grenze und „Bild zu groß“.
  - Undo: Laden → Maßstab → Deckkraft → Entfernen und jeweils zurück.
- **e2e:**
  - Ein kleines Test-PNG (im Repo, z. B. 200 × 100 px, ohne echte Ortsdaten) laden.
  - Maßstab setzen: 100 px = 10 m → Info „Bild 20 × 10 m“.
  - Speichern und Laden ergibt dasselbe Bild.
  - Link kopieren → Link öffnen → Hinweis in der Statuszeile.
- **Desktop-e2e:** Laden eines Bildes über die Datei-Auswahl in der exe.
- **Unverändert grün:** alle bestehenden Tests, Build, Web-e2e, Desktop-e2e.

## Nicht in E2

- Bild drehen;
- mehrere Bilder;
- Bild verschieben (die Objekte werden verschoben);
- Höhen und Gelände;
- Karten direkt aus dem Internet laden (Kacheln, API-Schlüssel);
- GPS-Koordinaten;
- das Bild im Teilen-Link.

**Datenschutz im öffentlichen Repo:** Das Test-Bild ist eine künstliche Grafik, kein Foto eines echten Platzes. Jakobs echtes Luftbild bleibt lokal und wird nicht committet.

## Verifikation

- Die Tests aus D5 sind grün, ebenso Build und beide e2e-Läufe.
- **Manuell (Jakob):** echtes Luftbild laden, Maßstab an einer bekannten Strecke setzen, Kochstelle draufziehen, Deckkraft ändern, speichern und in der exe laden, Link am Handy öffnen.
