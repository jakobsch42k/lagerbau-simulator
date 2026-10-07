# Lagerbau-Simulator

3D-Planer für Pfadfinder-Lagerbauten (Dreibein, A-Bock, freie Stangen, Abspannungen, Bäume, Planen, Platz-Objekte, Zonen, Wege) mit Faustregel-Hinweisen, Materialliste und Platzbedarf.
**Planungshilfe. Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.**

Online: https://jakobsch42k.github.io/lagerbau-simulator/

## Bedienung (Editor)

- **Auswählen:** Klick wählt ein Teil (Baugruppe, freie Stange, Seil, Baum, Plane). Shift+Klick fügt hinzu oder nimmt weg. **Doppelklick** wählt den ganzen Bau samt Seilen und Planen. Strg+A wählt alles, Esc oder Klick auf den Boden hebt die Auswahl auf.
- **Verschieben:** ein Objekt der Auswahl mit der Maus ziehen (Raster 0,1 m), oder mit den Pfeiltasten (0,1 m, mit Shift 1 m). Abspannungen, Haringe und Planen wandern mit; geht das nicht (z. B. wird eine Plane zu steil), bleibt alles, wie es war, und eine Meldung erscheint.
- **Drehen:** R dreht die Auswahl um 15°, Shift+R zurück.
- **Kopieren:** Strg+D (oder „Duplizieren“) legt eine Kopie 1 m daneben. Strg+C / Strg+V kopiert und fügt an der Maus ein (nur innerhalb der App).
- **Löschen:** Entf löscht die ganze Auswahl. Alles lässt sich mit Strg+Z / Strg+Y rückgängig machen.
- **Planansicht:** Knopf „Plan / 3D“ oder Taste P. Der Plan schaut senkrecht von oben, Norden ist oben; Ziehen verschiebt, das Mausrad zoomt, unten links zeigt eine Maßstabsleiste die Länge. In der Planansicht wählt **Shift+Ziehen** (auch über einer Zone oder Linie) alle Objekte im Rahmen; „oben“ der Pfeiltasten ist dann Norden.
- **Alles zeigen:** Knopf oder Taste F passt die Ansicht an. Geschieht auch beim Laden eines Links oder einer Datei.
- **Messen:** Werkzeug „Messen“, zwei Klicks (Spitzen, Bünde, Stangenenden und Boden rasten ein). Es erscheinen die Länge und der waagrechte Abstand. Esc oder ein anderes Werkzeug löscht die Messung; gespeichert wird sie nicht.

- **Luftbild als Boden:** Knopf „Luftbild…“ lädt ein PNG oder JPG, z. B. einen Screenshot aus Google Maps oder basemap.at (Orthofoto). Das Bild liegt mittig auf dem Ursprung, **Norden ist oben**; ein gedrehtes Bild vorher im Bildprogramm drehen. Sehr große Bilder (über 4096 Pixel) werden beim Laden verkleinert.
- **Maßstab setzen:** Direkt nach dem Laden (und über „Maßstab neu setzen“) zwei Punkte auf dem Bild anklicken, deren Abstand du kennst, dann den Abstand in Metern eintragen und „Übernehmen“. Bis dahin ist die längere Bildseite 100 m. Bereits gesetzte Teile bleiben, wo sie sind; passt der Bau nicht zum Bild, mit Strg+A alles wählen und an die richtige Stelle ziehen.
- **Deckkraft, Raster, Entfernen:** Der Knopf „Luftbild“ öffnet das Panel mit Deckkraft-Regler, Schalter „Raster zeigen“ (mit Bild zunächst aus) und „Luftbild entfernen“. Alles ist rückgängig zu machen. Oben rechts zeigt der Nordpfeil, wo Norden ist.
- **Speichern und Teilen:** Das Bild steckt in der gespeicherten **Datei**, nicht im Link (er wäre zu lang). Wer den Link öffnet, sieht den Plan ohne Bild und den Hinweis „Das Luftbild ist nur in der gespeicherten Datei enthalten.“
- **Lagerplatz auslegen:** „Platz-Objekt setzen“ stellt eine Vorlage (Feuerstelle, Fahnenmast, Latrine/WC, Wasserstelle, Holzlager, Eigenes) mit einem Klick auf den Platz; alle Maße, Name und Farbe sind im Panel einstellbar. „Beschriftung setzen“ legt einen Text auf den Boden (Schalter „Beschriftungen zeigen“ blendet Namen und Texte aus). „Zone zeichnen“ (Fläche, z. B. Küche) und „Linie zeichnen“ (Weg, Zaun, Grenze): Punkte anklicken, Doppelklick oder Enter schließt ab, Esc bricht ab. Die Zone zeigt ihre Fläche, die Linie ihre Länge. Platz-Objekte, Zonen und Linien zählen nicht zum Platzbedarf; Zonen und Linien lassen sich nur mit „Auswählen“ anklicken, sonst kann man auf ihnen bauen.
- **Ecken bearbeiten:** Ist eine Zone oder Linie ausgewählt, zeigt sie gelbe Griffe. Griff ziehen verschiebt die Ecke (Raster 0,1 m), **Doppelklick auf eine Kante** fügt eine Ecke ein, **Entf** bei gewähltem Griff entfernt sie (mindestens 3 Ecken bei der Zone, 2 Punkte bei der Linie; die Zone darf sich nicht selbst schneiden). Jeder Schritt ist rückgängig zu machen.

Am Handy gibt es nur die Ansicht, aber auch dort Plan / 3D und „Alles zeigen“.

## Entwickeln

    npm install
    npm run dev        # http://localhost:5173/lagerbau-simulator/
    npm test           # Unit-Tests + Abdeckung
    npm run e2e        # Browser-Smoke-Test (vorher einmal: npx playwright install chromium)
    npm run desktop    # Windows-Programm aus dem Quellcode starten

## Windows-Programm

    npm run dist         # erzeugt release/Lagerbau-Simulator-<version>.exe (portabel, ~100 MB)
    npm run e2e:desktop  # packt neu und testet die gebaute .exe

Die `.exe` per Doppelklick starten, ohne Installation. Sie braucht kein Internet.
Das Programm ist nicht signiert, deshalb zeigt Windows beim ersten Start „Der Computer wurde durch Windows geschützt“:
„Weitere Informationen“ → „Trotzdem ausführen“.
„Link kopieren“ erzeugt einen Link auf die Web-Version, den man z. B. am Handy öffnet.
Alle Links und Dateien, die mit Version 1.1 gespeichert wurden (Format-Version geändert), öffnet nur die .exe ab 1.1.0; ältere zeigen „Ungültige Bauwerk-Daten“.
Alle Links und Dateien, die mit Version 1.2 gespeichert wurden (Format-Version geändert, auch ohne Planen), öffnet nur die .exe ab 1.2.0; ältere zeigen „Ungültige Bauwerk-Daten”.
Alle Links und Dateien, die mit Version 1.3 gespeichert wurden (Format-Version geändert), öffnet nur die .exe ab 1.3.0; ältere zeigen „Ungültige Bauwerk-Daten”.
Alle Links und Dateien, die mit Version 1.5 gespeichert wurden (Format-Version 5, Luftbild), öffnet nur die .exe ab 1.5.0; ältere zeigen „Ungültige Bauwerk-Daten“.
Alle Links und Dateien, die mit Version 1.6 gespeichert wurden (Format-Version 6, Platz-Objekte und Beschriftungen), öffnet nur die .exe ab 1.6.0; ältere zeigen „Ungültige Bauwerk-Daten“.
