# KI-Lernlog

Wo lag die KI falsch? Ein Eintrag pro Fehler: Physik, Pfadfinder-Fachwissen, Code, Annahmen, Ablauf.

## Format

```
### YYYY-MM-DD — <kurzer Titel>
**Was die KI gemacht hat:** …
**Gefunden durch:** Review · Test · Nutzung · Jakobs Fachwissen · Gemeinheitsbau
**Richtig ist:** …
**Lehre:** was man beim nächsten Mal im Prompt, in der Spec oder im Review anders macht
```

## Einträge

### 2026-09-30 — SnapService Tie-Break hatte Float-Vergleich ohne Toleranz
**Was die KI gemacht hat:** SnapService nutzte strikte `<` Vergleiche zwischen Bund und Dreibein-Spitze ohne Toleranz gegen Float-Noise.
**Gefunden durch:** Test (Task 6): Ein Implementer-Test schlug fehl.
**Richtig ist:** 1e-9 Toleranz + Type-Priorität für Tie-Break statt strikter Vergleich.
**Lehre:** Bei Float-Vergleichen in der Geometrie immer einen Toleranz-Puffer vorsehen.

### 2026-09-30 — deploy.yml hatte zu breite Permissions
**Was die KI gemacht hat:** deploy.yml erteilte `pages:write` + `id-token:write` auf Workflow-Ebene, nicht nur dem Deploy-Job.
**Gefunden durch:** Automatischer Security Review (Task 10).
**Richtig ist:** Permissions auf den Deploy-Job beschränkt (d085095).
**Lehre:** Permissions so spät und so eng wie möglich (Principle of Least Privilege).

### 2026-09-30 — Implementer-Report zitierte veraltete Testnummern
**Was die KI gemacht hat:** Fix-Report nach Task 10 nannte 82 statt 92 Tests.
**Gefunden durch:** Controller beim erneuten Lauf der Test-Suite.
**Richtig ist:** 92 Tests nach dem Fix.
**Lehre:** Report-Zahlen durch Frisch-Run vor dem Absenden verifizieren.

### 2026-09-30 — Task-15-Report beschrieb Tests ungenau
**Was die KI gemacht hat:** Bericht zu R2 behauptete „gültiges Rechteck”, aber der Test prüft nur, dass kein Hinweis feuert. Auch Rounding-Beispiel stimmte nicht mit Test überein.
**Gefunden durch:** Task Reviewer.
**Richtig ist:** Tests beschreiben, nicht interpretieren; Beispiele müssen mit echtem Test matchen.
**Lehre:** Report-Beispiele aus Logdump oder aktuellem Test-Run nehmen, nicht neu erfinden.

### 2026-09-30 — Statik überbetont im Design
**Was die KI gemacht hat:** Nach der Antwort „Kernproblem = Statik” ein Stabwerk-Modell mit Einhüllender (Bund-Steifigkeit 0/∞), Lastfällen, Bodenarten und vier Ampeln entworfen.
**Gefunden durch:** Jakobs Einwand vor der Spec-Freigabe („zu sehr auf Statik aus, macht alles nur zu kompliziert”).
**Richtig ist:** 3D-Planer + Faustregeln (Geometrie-/Graph-Regeln), keine Rechnung.
**Lehre:** Eine Multiple-Choice-Antwort ist kein Auftrag für die maximale Lösung. Bei großem Aufwandssprung früh fragen, ob die einfache Variante reicht.
