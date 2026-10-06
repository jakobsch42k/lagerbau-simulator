# CLAUDE.md — Lagerbau-Simulator

3D-Planer im Browser für Pfadfinder-Lagerbauten (Rundholz + Seilbünde) mit Faustregel-Hinweisen. Nutzer: Jakobs Leiterteams. Spec: `docs/superpowers/specs/2026-09-30-lagerbau-simulator-design.md`.

## Rahmen

- **Übung im Bauen mit KI:** Claude implementiert, Jakob steuert, reviewt, testet und liefert die Faustregeln + Schwellwerte. Jede Etappe = eigene Sitzung.
- **Keine Statik-Rechnung.** Bewusst gestrichen (30.09.2026). Das Tool sagt nie „hält“, es gibt nur Hinweise auf typische Fehler. Fußzeilen-Hinweis bleibt immer sichtbar.
- **Schwellwerte der Regeln kommen von Jakob**, nicht von Claude. Unbestätigte Werte in `src/rules/constants.ts` tragen `// CHECK MANUALLY: <Quelle>`.
- UI-Sprache Deutsch, **österreichische Fachwörter**: „Haring“ (nicht „Hering“). Einheiten im Modell: Meter.
- Bauen am Laptop mit Maus; am Handy nur Ansichtsmodus (geteilter Link).
- Windows-Programm (Spec D5): portable `.exe` per Electron, offline. `npm run dist` → `release/`. Die Web-Version auf Pages bleibt für die Handy-Ansicht.

## Stack & Struktur

TypeScript + Vite + three.js, Vitest (+ happy-dom für DOM-Tests), Playwright (Browser + Electron). Statisch, kein Backend. Deploy: GitHub Pages via Actions. Windows-Programm: Electron + electron-builder. Repo `jakobsch42k/lagerbau-simulator` (öffentlich, MIT).

- `src/model/` — Domain (immutable), kein three.js: `LagerObjekt` (gemeinsame Schnittstelle, `ART_NAMEN`), Stange, Bund, Fuss, Baugruppen, Seil, Baum, Plane (Ösen aus der Geometrie), `Bauwerk` (eine geordnete Liste `objekte` + typisierte Hüllen), Verankerung/Haring (aus der Geometrie abgeleitet), `Bau` (Bau = über Bünde verbundene Stangen + Seile/Planen daran; `Bau.von`), `Mitbewegung` (`bewege`: Verschieben/Drehen samt Seilen, Haringen, Planen; RangeError „Verschieben nicht möglich: …“; `mitgenommen` = Menge für Kopieren), `Duplikat` (`kopiere` mit neuen ids über `LagerObjekt.mitId`, `mitte` = Drehpunkt/Einfügemitte; `LagerObjekt.drehpunkt()`), Materialliste, Platzbedarf
- `src/rules/` — `Rule`-Klassen R1–R8 + `RuleEngine`, kein three.js (R6–R8: Seile; Spec v2a). Planen haben bewusst keine Regeln (Spec v2b). R2 prüft Vierecke nur bei losen Ecken: `FesteKnoten` gibt Festigkeit von den Füßen über Dreiecke und Abspannseile weiter; Regel-Einstellungen je Plan in `RegelEinstellungen` (an/aus, Werte; Spec v3, D8)
- `src/arten/` — Registry je Objektart (`ObjektArt`, `ObjektRegister`, `standardArten()`): Codec, Panel, Platzieren, Fangpunkte, Klickverhalten; kein three.js
- `src/editor/` — three.js-Szene (`SzenenInhalt` baut nur Geändertes neu), Darstellung je Art in `src/editor/darstellung/`, Einrasten, Werkzeuge (`PlatziereTool`, `SelectTool`; nur die Auswahl hat `onZiehenStart`), Undo, `Ziehvorgang` (Zwischenstand beim Ziehen; `EditorZustand.vorschau` zeigt die Szene, Hinweise rechnen am echten Bauwerk), `Zeigersteuerung` (Maus: Klick, Doppelklick, Ziehen; sperrt dabei die Orbit-Kamera). Ansicht: `Kameras` (Perspektive + Orthografisch von oben, je eine eigene Orbit-Steuerung; Plan: Norden -z oben, nur Pan/Zoom), `Ansicht.ts` (reine Rechnung: Einpassen, Maßstabsleisten-Länge), `Massstabsleiste`, `Messung`/`Messanzeige` + Werkzeug `messen` (`EditorZustand.messung`, nicht im Bauwerk, nicht im Format), `Rahmenwahl` (Shift+Ziehen im Plan, Overlay `#rahmen` in `Zeigersteuerung`). Tasten im Editor: P Plan/3D und F Alles zeigen (in `main.ts`, auch im Ansichtsmodus), Pfeile (0,1 m, Shift 1 m, „oben“ = `setzeBlickrichtung`, Standard Norden -z), R/Shift+R, Strg+D/C/V (App-interne Zwischenablage, `setzeMausPunkt`)
- `src/share/` — Serializer (Datenformat v4 mit `objekte`; v1–v3 über `AltesFormat`), URL-Codec (`lz-string`)
- `src/ui/` — Panels, Ansichtsmodus
- `desktop/main.mjs` — Electron-Hauptprozess (ein gehärtetes Fenster, lädt `dist-desktop/`)
- `e2e-desktop/` — E2E gegen die gebaute `.exe` (`npm run e2e:desktop`)
- `build/` — Icon (`icon.svg` → `npm run icon` → `icon.png`)

## Arbeitsweise

- TDD: Test zuerst. Abdeckung `model/` + `rules/` + `arten/` ≥ 80 %.
- Neue Objektart: Modellklasse + Name in `ART_NAMEN`, `src/arten/<Art>Art.ts` + Zeile in `standardArten()`, Darstellung + Zeile in `standardDarstellungen()`, Knopf in `index.html` (Spec v3, D2).
- OOP, immutable Updates, kleine Dateien.
- Jeder Fehler der KI, den Jakob oder ein Test findet → Eintrag in `docs/ki-lernlog.md`.
- Technische Sackgassen → Abschnitt unten.

## Known Issues & Failed Attempts

### Playwright wartet nach blockierter Navigation endlos
**What failed:** Im Desktop-E2E: `location.href = 'https://example.com/'` (von `will-navigate` per `preventDefault` gesperrt), danach `await expect(locator('footer')).toBeVisible()` lief in den Timeout (`waiting for navigation to finish...`).
**Why:** Playwright sieht die abgebrochene Navigation nie als abgeschlossen; web-first-Assertions warten darauf. Die App ist intakt (URL bleibt `file:`, Fußzeile da, `isVisible()` liefert true, `webContents.isLoading()` false).
**Fix / avoid:** Nach einer geblockten Navigation `expect(await locator.isVisible()).toBe(true)` statt `await expect(locator).toBeVisible()` verwenden.

### electron-builder lehnt `directories` in package.json ab
**What failed:** `npm run dist` brach ab mit `"directories" in the root is deprecated, please specify in the "build"`.
**Why:** `package.json` enthielt das npm-Metadatenfeld `"directories": {"doc": "docs"}`; electron-builder liest `directories` im Root als eigene (veraltete) Konfiguration.
**Fix / avoid:** Das Feld aus `package.json` entfernt. Ausgabe-/Ressourcenordner stehen in `electron-builder.yml`.

### Desktop-E2E „Link kopieren“ rot, obwohl der Code stimmt
**What failed:** `npm run e2e:desktop` zeigte 4 passed, 1 failed bei „Link kopieren legt einen Link auf die Web-Version in die Zwischenablage“; die Ursache wurde zuerst im v2-Datenformat vermutet.
**Why:** Die Windows-Zwischenablage war in der Sitzung nicht nutzbar (auch PowerShell `Set-Clipboard` schlug fehl); `clipboard.readText()` lieferte keinen Link.
**Fix / avoid:** Vor einem Codefix mit `Set-Clipboard` prüfen, ob die Zwischenablage überhaupt geht. Test und App-Code nicht ändern.
