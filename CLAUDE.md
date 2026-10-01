# CLAUDE.md — Lagerbau-Simulator

3D-Planer im Browser für Pfadfinder-Lagerbauten (Rundholz + Seilbünde) mit Faustregel-Hinweisen. Nutzer: Jakobs Leiterteams. Spec: `docs/superpowers/specs/2026-09-30-lagerbau-simulator-design.md`.

## Rahmen

- **Übung im Bauen mit KI:** Claude implementiert, Jakob steuert, reviewt, testet und liefert die Faustregeln + Schwellwerte. Jede Etappe = eigene Sitzung.
- **Keine Statik-Rechnung.** Bewusst gestrichen (30.09.2026). Das Tool sagt nie „hält“, es gibt nur Hinweise auf typische Fehler. Fußzeilen-Hinweis bleibt immer sichtbar.
- **Schwellwerte der Regeln kommen von Jakob**, nicht von Claude. Unbestätigte Werte in `src/rules/constants.ts` tragen `// CHECK MANUALLY: <Quelle>`.
- UI-Sprache Deutsch. Einheiten im Modell: Meter.
- Bauen am Laptop mit Maus; am Handy nur Ansichtsmodus (geteilter Link).
- Windows-Programm (Spec D5): portable `.exe` per Electron, offline. `npm run dist` → `release/`. Die Web-Version auf Pages bleibt für die Handy-Ansicht.

## Stack & Struktur

TypeScript + Vite + three.js, Vitest (+ happy-dom für DOM-Tests), Playwright (Browser + Electron). Statisch, kein Backend. Deploy: GitHub Pages via Actions. Windows-Programm: Electron + electron-builder. Repo `jakobsch42k/lagerbau-simulator` (öffentlich, MIT).

- `src/model/` — Domain (immutable), kein three.js
- `src/rules/` — `Rule`-Klassen R1–R5 + `RuleEngine`, kein three.js
- `src/editor/` — three.js-Szene, Einrasten, Werkzeuge, Undo
- `src/share/` — Serializer, URL-Codec (`lz-string`)
- `src/ui/` — Panels, Ansichtsmodus
- `desktop/main.mjs` — Electron-Hauptprozess (ein gehärtetes Fenster, lädt `dist-desktop/`)
- `e2e-desktop/` — E2E gegen die gebaute `.exe` (`npm run e2e:desktop`)
- `build/` — Icon (`icon.svg` → `npm run icon` → `icon.png`)

## Arbeitsweise

- TDD: Test zuerst. Abdeckung `model/` + `rules/` ≥ 80 %.
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
