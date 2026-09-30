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

### 2026-09-30 — Statik überbetont im Design
**Was die KI gemacht hat:** Nach der Antwort „Kernproblem = Statik“ ein Stabwerk-Modell mit Einhüllender (Bund-Steifigkeit 0/∞), Lastfällen, Bodenarten und vier Ampeln entworfen.
**Gefunden durch:** Jakobs Einwand vor der Spec-Freigabe („zu sehr auf Statik aus, macht alles nur zu kompliziert“).
**Richtig ist:** 3D-Planer + Faustregeln (Geometrie-/Graph-Regeln), keine Rechnung.
**Lehre:** Eine Multiple-Choice-Antwort ist kein Auftrag für die maximale Lösung. Bei großem Aufwandssprung früh fragen, ob die einfache Variante reicht.
