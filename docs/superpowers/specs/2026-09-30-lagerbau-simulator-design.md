# Lagerbau-Simulator — Design-Spec v1

## Context
Jakob ist Pfadfinderleiter. Lagerbauten (Rundholz + Seilbünde) lassen sich auf Papier oder in generischem CAD schlecht planen. Ziel ist ein **3D-Planer im Browser**, in dem seine Leiterteams einen Bau aus Baugruppen zusammenklicken, ihn von allen Seiten anschauen, per Link teilen und dabei **einfache Faustregel-Hinweise** bekommen. Die Hinweise zielen auf die Fehler, die in der Praxis wirklich passiert sind: Wackeln/Verziehen (fehlende Dreiecke) und Kippen (Standfläche zu schmal).
Eine Statik-Rechnung (Finite-Elemente-Methode (FEM)/Stabwerk) wurde bewusst verworfen, weil sie zu kompliziert ist. Die Hinweise sind Geometrie- und Graph-Regeln, keine Rechnung.
Das Projekt ist gleichzeitig eine **Übung im Bauen mit KI**. Claude implementiert den Großteil. Jakob will dabei (a) den Ablauf beherrschen (Spec → Plan → Subagenten → Review → TDD), (b) den Code verstehen und prüfen und (c) die Grenzen der KI finden.

## Getroffene Entscheidungen (Grill-Protokoll)
| # | Frage | Entscheidung |
|---|---|---|
| 1 | Reale Fehler | Wackeln/Verziehen + Kippen (nicht Bund-Rutschen, nicht Stangenbruch) |
| 2 | Prüfstein v1 | Kochstelle: A-Bock + Dreibein + Firstholz (Spitze ↔ Spitze), Kessel am First |
| 3 | Nutzer | Jakobs Leiterteams (~10) → Deutsch, Browser, keine Installation, kein Konto |
| 4 | Gerät | Laptop + Maus zum Bauen; am Handy nur Ansicht über den geteilten Link |
| 5 | Editor | Baukasten (parametrische Baugruppen + Stange zwischen Einrastpunkten) |
| 6 | Behebungsvorschläge | Keine, der Hinweis + die Markierung reichen |
| 7 | Rollen | Claude baut. Jakob ist Auftraggeber, Reviewer, Tester und **liefert die Faustregeln + Schwellwerte** (Fachwissen) |
| 8 | **Kern (revidiert)** | **3D-Planer + Faustregeln.** Statik-Rechnung (FEM, Lastfälle, Bodenarten, Ampeln) gestrichen |

## D1 Architektur & Stack
- Statische Web-App ohne Backend: **TypeScript + Vite + three.js**, Tests **Vitest**, Browser-Smoke **Playwright**. Keine Mathe-Bibliothek nötig.
- Repo `C:\Users\Jakob\Lagerbau-Simulator\` → GitHub **`jakobsch42k/lagerbau-simulator` (öffentlich)**, Deploy über **GitHub Pages** via GitHub Actions.
- Teilen: Bauwerk → JSON → `lz-string` → URL-Hash; der Link öffnet den Ansichtsmodus. Zusätzlich JSON-Download/-Upload.
- OOP, immutable Updates. `model/` und `rules/` hängen nicht von three.js ab und sind damit unit-testbar.
  - `src/model/` `Stange`, `Bund`, `Fuss`, `Bauwerk` (immutable Aggregat + Verbindungsgraph Stange–Bund), `DreibeinFactory`, `ABockFactory`
  - `src/rules/` `Rule`-Interface → `Hinweis {schwere: info|warnung, text, betroffeneTeile}`, `RuleEngine` (führt alle Regeln aus), `constants.ts` (Schwellwerte, jeweils `// CHECK MANUALLY: <Quelle>`)
  - `src/editor/` Szene, `SnapService`, `PlaceBaugruppeTool`, `DrawStangeTool`, `SelectTool`, Parameter-Panel, Undo-Stack
  - `src/share/` `BauwerkSerializer`, `UrlCodec`
  - `src/ui/` Hinweis-Panel, Stangenliste, Fußzeile, Ansichtsmodus

## D2 Faustregeln v1
Jede Regel ist eine eigene Klasse. Die Schwellwerte liefert Jakob aus seiner Erfahrung bzw. aus PPÖ-Material (Infopedia).
| Regel | Erkennung (Geometrie/Graph) | Hinweis |
|---|---|---|
| **R1 A-Bock quer** | Ein A-Bock hat keine Verbindung, die aus seiner Ebene herausführt (Winkel zur Ebene > Schwelle) | „A-Bock kann seitlich umkippen, er braucht eine Querverbindung.“ |
| **R2 Viereck ohne Diagonale** | Ein 4er-Zyklus im Stange–Bund-Graph liegt annähernd in einer Ebene und hat keine Diagonale | „Dieses Viereck kann sich verziehen, eine Diagonale fehlt.“ |
| **R3 Standfläche** | Höhe des höchsten Punkts ÷ kleinste Breite der Fußpunkt-Hülle > Schwelle | „Hoch und schmal, Kippgefahr. Füße weiter auseinander oder abspannen.“ |
| **R4 Spreizung** | Beinwinkel von Dreibein/A-Bock zur Senkrechten außerhalb [min, max] | zu steil: „kippt leicht“ / zu flach: „Beine rutschen weg“ |
| **R5 Lose Stange** | Eine Stange hat nur einen Bund und keinen Fuß am Boden | „Diese Stange hängt nur an einem Bund.“ |

## D3 Editor & Anzeige
- Links Palette (Dreibein, A-Bock, Stange) + Parameter · Mitte 3D (OrbitControls) · rechts Hinweis-Liste + Stangenliste · Fußzeile: *„Planungshilfe. Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.“*
- **Platzieren** per Raycast auf den Boden, Raster 10 cm, Taste R dreht um 15°.
- **Parameter** (Stangenlänge statt Höhe, weil die Stangen feste Längen haben; die Höhe wird angezeigt):
  - Dreibein: Stangenlänge, Fußkreisradius, Ø
  - A-Bock: Stangenlänge, Fußabstand, Riegelhöhe, Ø
  - Stange: Ø, Überstand je Ende (Default 20 cm)
- **Stange ziehen:** zwei Einrastpunkte anklicken (Spitze, Stangenende, Punkt auf einer Stange, Boden). Endet sie auf einer Stange, entsteht automatisch ein Bund. Es gibt nie einen freien Tiefen-Klick.
- Entf löscht, Strg+Z/Y für Undo/Redo. Die Hinweise werden bei jeder Änderung live neu berechnet. Ein Klick auf einen Hinweis markiert die betroffenen Teile.
- **Stangenliste:** Anzahl je Länge × Ø + Anzahl der Bünde. Das ist ein billiges Nebenprodukt des Modells; streichbar.
- Menüpunkt „Beispiel laden“ = Kochstelle. Ein schmaler Bildschirm oder ein geteilter Link öffnet den Ansichtsmodus (nur Drehen + Hinweise).

## D4 Tests
TDD. Abdeckung von `model/` + `rules/` ≥ 80 %. Die erwarteten Hinweise ergeben sich aus Jakobs Regel-Definitionen.
| # | Bau | Erwartung |
|---|---|---|
| 1 | A-Bock allein | R1 feuert |
| 2 | Kochstelle komplett | keine Warnung |
| 3 | Kochstelle ohne First | R1 feuert für den A-Bock |
| 4 | Rechteckrahmen aus 4 Stangen / mit Diagonale | R2 feuert / feuert nicht |
| 5 | Dreibein mit Stangenlänge 4 m, Fußkreis 0,5 m | R3 bzw. R4 „zu steil“ |
| 6 | Dreibein mit Fußkreis nahe der Stangenlänge | R4 „zu flach“ |
| 7 | Stange mit nur einem Bund | R5 feuert |
| 8 | Factories | Dreibein-/A-Bock-Geometrie stimmt (Höhe aus Stangenlänge und Spreizung) |
| 9 | Serializer/UrlCodec | Rundreise identisch |
| 10 | Playwright-Smoke | Beispiel laden → keine Warnung → First löschen → R1-Hinweis sichtbar |

## Ablauf (Lernziele)
- **Jakob steuert:** Jede Etappe ist eine eigene Sitzung, die er startet. Die Ausführungsmethode wählt er nach `writing-plans`; empfohlen ist subagent-driven mit Sonnet/Haiku-Subagenten, damit der Ablauf sichtbar wird.
- **Verstehen:** Nach jedem Meilenstein kommt ein Walkthrough (Datenmodell, Regeln, Editor). Jakob liest den Diff und reviewt ihn (optional `/code-review`).
- **Grenzen finden:** Jede Stelle, an der die KI falsch lag, landet in `docs/ki-lernlog.md`, und zwar mit dem Fehler, dem Weg, auf dem er gefunden wurde, und der Korrektur. Technische Sackgassen kommen zusätzlich in die Projekt-`CLAUDE.md` unter „Known Issues & Failed Attempts“. Zum Schluss baut Jakob einen „Gemeinheitsbau“, der die Regeln austricksen soll.

## Meilensteine
- **M0 (direkt nach Freigabe):** Repo, Vite + TS + Vitest, Projekt-`CLAUDE.md`, Spec unter `docs/superpowers/specs/2026-09-30-lagerbau-simulator-design.md`, `ki-lernlog.md`, Actions. Dann `writing-plans`.
- **Jakob bis 11.10.:** Faustregeln R1–R5 bestätigen oder ergänzen und Schwellwerte festlegen (Erfahrung + PPÖ-Infopedia).
- **M1 bis 16.10.:** Datenmodell, Factories, Baukasten-Editor, Kochstelle-Beispiel, Teilen-Link, Handy-Ansicht, Deploy. Walkthrough 1.
- **M2 bis 08.11.:** RuleEngine R1–R5 + Hinweis-Panel + Stangenliste, Tests 1–10. Walkthrough 2 + Gemeinheitsbau.
- **19.12.:** Demo beim Weihnachts-Gruppenrat. Ab Jänner Freeze.

**Nicht in v1:** Statik-Rechnung jeder Art, Lastfälle, Bodenarten, Seillängen, Vierbein, Abspannungen als Bauteil, Bauablauf, Touch-Editor, Behebungsvorschläge, Konten/Server.

## Nach Freigabe dieses Plans (Reihenfolge)
1. Repo anlegen + M0-Gerüst, Spec und `CLAUDE.md` (mit Known-Issues-Abschnitt) committen. **Das GitHub-Repo erst nach Rückfrage anlegen und pushen** (öffentlich).
2. Projektnotiz im persönlichen Notizsystem anlegen.
3. Meilensteine in den persönlichen Kalender eintragen.
4. Memory: Projekt-Fakt speichern (KI-Bau-Übung, Jakob liefert Regeln, Statik bewusst gestrichen).
5. Skill `superpowers:writing-plans` → Implementierungsplan → Jakob wählt die Ausführungsmethode.

## Verifikation
- `npm test` grün, Abdeckung ≥ 80 % für `model/` + `rules/` (`vitest --coverage`).
- `npm run build` fehlerfrei. Playwright-Smoke (Test 10) grün gegen `vite preview`.
- Die Pages-URL öffnet sich am Handy. Ein geteilter Link zeigt denselben Bau im Ansichtsmodus.
- Manuell: Jakob baut die Kochstelle im Editor in < 5 min ohne Anleitung nach. Beim Löschen des Firsts erscheint der R1-Hinweis.
