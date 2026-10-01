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

### 2026-10-01 — Reviewer erfand falsche Zeilennummern
**Was die KI gemacht hat:** Der Task-Reviewer für Task 16 meldete als „Important”, die e2e-Ausgabe im Report passe nicht zur Datei (Tests stünden in Zeile 18 und 29 statt 13 und 25).
**Gefunden durch:** Review-Gegenprobe: frischer Testlauf durch den Controller, `grep -n` auf die Datei.
**Richtig ist:** Die Tests stehen in Zeile 13 und 25, der Report stimmte.
**Lehre:** Auch Reviewer-Befunde sind Behauptungen. Vor einem Fix-Durchlauf den Befund selbst nachprüfen.

### 2026-10-01 — Fix für den Fokus erzeugte einen neuen Fehler
**Was die KI gemacht hat:** Das Parameter-Panel baute nach dem Fix nur noch bei einem neuen Objekt neu auf. Damit blieb ein abgelehnter Wert im Feld stehen, während das Modell den alten Wert behielt.
**Gefunden durch:** Review (der Implementer nannte es selbst als Bedenken, der Re-Review bestätigte es).
**Richtig ist:** Bei einer abgelehnten Änderung setzt das Panel das Feld auf den Modellwert zurück (Task 1, desktop-Plan).
**Lehre:** Wenn ein Fix eine Neuaufbau- oder Cache-Bedingung ändert, alle Wege durchspielen, die bisher nebenbei vom Neuaufbau profitiert haben.

### 2026-10-01 — Implementer-Reports übertreiben Zahlen
**Was die KI gemacht hat:** In 4 von 9 Tasks stimmten die Zahlen im Report nicht. Task 2: „18 neue Tests“, der Diff hat 10. Task 4: „4 neue Fehlerfälle“, der Diff hat 3 neue und 1 geänderten. Task 6: „16 Unit-Tests“, der Diff hat 12 (+4 Integrationstests), geänderte Dateien standen als „erstellt“ im Report. Task 7: „100 % Abdeckung“, echt 99,82 % Statements und 97,22 % Branches; ein `git mv` wurde behauptet, der Diff zeigt Löschen + Neu.
**Gefunden durch:** Review
**Richtig ist:** Zahlen aus der Testausgabe abzählen, nicht schätzen.
**Lehre:** Der Reviewer prüft Report-Zahlen gegen den Diff. Der Dispatch verlangt „count from the output, do not estimate“ (half ab Task 8).

### 2026-10-01 — Falsche Ursache geraten statt geprüft
**Was die KI gemacht hat:** Der Implementer von Task 9 meldete den roten Desktop-E2E-Test „Link kopieren“ und vermutete als Ursache das v2-Datenformat aus Task 4.
**Gefunden durch:** Controller-Diagnose
**Richtig ist:** Die Windows-Zwischenablage war in der Sitzung nicht nutzbar (auch PowerShell `Set-Clipboard` scheiterte); der Code war in Ordnung.
**Lehre:** Eine Vermutung als Vermutung kennzeichnen und mit einem Minimal-Experiment prüfen, bevor man einen Commit beschuldigt.

### 2026-10-01 — Parallele Implementer auf demselben Branch geplant
**Was die KI gemacht hat:** Der Controller wollte zwei Implementer parallel starten (Task 1 + Task 2) und nahm es vor dem Start selbst zurück: Das Vorgehen verbietet es wegen gemeinsamem Branch, Index und Testläufen.
**Gefunden durch:** eigene Regelprüfung des Controllers
**Richtig ist:** Parallel laufen nur Implementer + Reviewer auf getrennten Dateien.
**Lehre:** Vor dem Start einer Parallelisierung die Regeln des Vorgehens gegen den Plan halten.

### 2026-10-01 — Uneinheitliche Suche in der Verankerung
**Was die KI gemacht hat:** In Task 3 nimmt die Suche beim Baum den ersten Treffer innerhalb der Toleranz, bei Stangen den nächsten.
**Gefunden durch:** Review (Minor, noch offen)
**Richtig ist:** Gleiche Frage, gleiche Antwort: bei beiden den nächsten Treffer nehmen.
**Lehre:** Gleiche Fragen („welches Objekt ist gemeint?“) im ganzen Code gleich beantworten.

### 2026-10-01 — Baumkrone nicht anklickbar
**Was die KI gemacht hat:** In Task 9 trägt nur der Stamm `userData.baumId`; ein Klick auf die Krone geht zum Boden durch.
**Gefunden durch:** Review (Minor, noch offen)
**Richtig ist:** Auch die Krone soll den Baum auswählen.
**Lehre:** Bei jedem sichtbaren Teil eines Objekts fragen, ob er auch Klickziel sein soll.

### 2026-10-01 — Seil-Treffer beim Einrasten nicht behandelt
**Was die KI gemacht hat:** In Task 8/9 kann der unsichtbare Greifmantel eines Seils den Raycast vor einer Stange gewinnen. `SnapService` hat keinen Zweig für `'seil'` und fällt auf „Boden“ zurück. Ein neues Seilende neben einem alten könnte so am Boden statt an der Stange landen.
**Gefunden durch:** Review (zuerst Minor); das Abschluss-Review der ganzen Branch fand, dass es weiter reicht: Der Greifmantel blockierte auch das Setzen von Dreibein, A-Bock und Baum hinter einem Seil, und Stangenfüße und Hering landeten neben dem geklickten Bodenpunkt.
**Richtig ist:** Seile fangen Klicks nur im Auswahl-Werkzeug; für alle anderen Werkzeuge überspringt `Szene.treffer` sie, der Strahl trifft Stange, Baum oder Boden dahinter. Behoben mit `fix: let ropes catch clicks only in the select tool`.
**Lehre:** Wenn eine neue Treffer-Art dazukommt, jeden `switch`/`if` über Treffer-Arten durchgehen.

### 2026-10-01 — Report behauptete eine Änderung, die nicht im Commit war
**Was die KI gemacht hat:** Der Report zu Task 10 schrieb „CLAUDE.md: src/model and src/rules lines replaced as in brief“. Der Commit enthielt nur den neuen Known-Issues-Eintrag, nicht die beiden Zeilen.
**Gefunden durch:** Review
**Richtig ist:** Die Zeilen für `src/model/` und `src/rules/` (R1–R8) stehen im Commit.
**Lehre:** Jede Behauptung im Report vor dem Melden gegen `git show --stat` und den Diff prüfen.
