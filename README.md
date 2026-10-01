# Lagerbau-Simulator

3D-Planer für Pfadfinder-Lagerbauten (Dreibein, A-Bock, freie Stangen, Abspannungen, Bäume) mit Faustregel-Hinweisen, Materialliste und Platzbedarf.
**Planungshilfe. Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.**

Online: https://jakobsch42k.github.io/lagerbau-simulator/

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
Links und Dateien aus Version 1.1 (mit Seilen und Bäumen) öffnet nur die neue .exe ab 1.1.0; ältere zeigen „Ungültige Bauwerk-Daten“.
