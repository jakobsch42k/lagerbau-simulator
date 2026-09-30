# CLAUDE.md — Lagerbau-Simulator

3D-Planer im Browser für Pfadfinder-Lagerbauten (Rundholz + Seilbünde) mit Faustregel-Hinweisen. Nutzer: Jakobs Leiterteams. Spec: `docs/superpowers/specs/2026-09-30-lagerbau-simulator-design.md`.

## Rahmen

- **Übung im Bauen mit KI:** Claude implementiert, Jakob steuert, reviewt, testet und liefert die Faustregeln + Schwellwerte. Jede Etappe = eigene Sitzung.
- **Keine Statik-Rechnung.** Bewusst gestrichen (30.09.2026). Das Tool sagt nie „hält“, es gibt nur Hinweise auf typische Fehler. Fußzeilen-Hinweis bleibt immer sichtbar.
- **Schwellwerte der Regeln kommen von Jakob**, nicht von Claude. Unbestätigte Werte in `src/rules/constants.ts` tragen `// CHECK MANUALLY: <Quelle>`.
- UI-Sprache Deutsch. Einheiten im Modell: Meter.
- Bauen am Laptop mit Maus; am Handy nur Ansichtsmodus (geteilter Link).

## Stack & Struktur

TypeScript + Vite + three.js, Vitest, Playwright. Statisch, kein Backend. Deploy: GitHub Pages via Actions. Repo `jakobsch42k/lagerbau-simulator` (öffentlich).

- `src/model/` — Domain (immutable), kein three.js
- `src/rules/` — `Rule`-Klassen R1–R5 + `RuleEngine`, kein three.js
- `src/editor/` — three.js-Szene, Einrasten, Werkzeuge, Undo
- `src/share/` — Serializer, URL-Codec (`lz-string`)
- `src/ui/` — Panels, Ansichtsmodus

## Arbeitsweise

- TDD: Test zuerst. Abdeckung `model/` + `rules/` ≥ 80 %.
- OOP, immutable Updates, kleine Dateien.
- Jeder Fehler der KI, den Jakob oder ein Test findet → Eintrag in `docs/ki-lernlog.md`.
- Technische Sackgassen → Abschnitt unten.

## Known Issues & Failed Attempts

_Noch keine._
