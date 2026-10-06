# Lagerbau-Simulator — Design-Spec E5: Gesamt-Materialliste

Teil der Spec v3 (`2026-10-05-lagerplatz-planer-design.md`), Etappe E5. Setzt voraus:
- **E0:** `Bauwerk.objekte`, `besitzer(teilId)`, Registry je Art, `Materialliste`, Regel-Einstellungen;
- **E1:** `Bau` (automatisch erkannte Gruppe, `Bau.von`), Auswahl und Planansicht;
- **E3:** Platz-Objekte mit Vorlagen und Linien (`zaun`);
- **E4:** `Zelt` mit `haringe()` und `abspannseile()`; Datenformat v7.

Alles aus v1–v3 gilt weiter, insbesondere: **keine Statik-Rechnung**, die Fußzeile bleibt sichtbar.

## Context

Heute zeigt der Simulator die Materialliste **eines** Bauwerks als eine Tabelle. Ein Lagerplatz besteht aus mehreren Bauten, Zelten und Platz-Objekten, und die Leiter wollen wissen, was sie für das ganze Lager einpacken müssen und was zu welchem Bau gehört. Außerdem gelten R1–R8 bisher für „das Bauwerk“; mit mehreren Bauten sollen die Hinweise sagen, **welcher Bau** gemeint ist.

## Getroffene Entscheidungen (Jakob 06.10.2026, Rest Claude)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Umfang | Eine **Liste fürs ganze Lager**, gruppiert nach **Bau** (benennbar), **Zelttyp** und **Platz-Objekten**, dazu eine **Gesamtsumme** |
| 2 | Ausgabe | **Druckansicht** (Knopf „Drucken“) |
| 3 | Regeln je Bau | R1–R8 werden **je Bau** ausgewiesen; jeder Hinweis nennt den Bau |
| 4 | Material je Art | Jede Art liefert ihren Beitrag **über das Register**; die Liste hat keine Fallunterscheidung je Art |
| 5 | Bau-Name | Ein Bau wird automatisch erkannt, sein Name steckt deshalb nicht im Bau, sondern an einem seiner Objekte (D2). Die einfachste robuste Regel, ihre Grenzen stehen dort |
| 6 | Hinweise je Bau | Die Regeln laufen **wie bisher einmal über das ganze Bauwerk**; jeder Hinweis wird seinem Bau über `betroffeneTeile` zugeordnet. Das ändert kein Ergebnis (Test) und vermeidet, dass ein Seil zwischen zwei Bauten oder zu einem Baum in einem Teil-Bauwerk plötzlich „nicht befestigt“ wirkt *(Entscheidung Claude, Jakob kann umdrehen: Regeln mit eigenen Einstellungen je Bau gibt es nicht)* |
| 7 | Bau-Gruppen der Bau-Arten | Die bestehende `Materialliste` (Stangen, Bünde, Seile, Haringe, Planen) bleibt unverändert und wird **je Bau** auf ein Teil-Bauwerk angewendet. Nur die neuen Arten (Zelt, Platz-Objekte) liefern Posten über das Register; die alten Arten dafür umzubauen wäre mehr Aufwand ohne Nutzen *(Entscheidung Claude, Jakob kann umdrehen)* |
| 8 | Zählung | Jedes Objekt zählt **genau einmal**. Gehört ein Seil nach `Bau.von` zu zwei Bauten, zählt es beim Bau mit dem ersten Objekt in `Bauwerk.objekte` |
| 9 | Zusatzgruppe „Ohne Bau“ | Objekte ohne Stange (z. B. eine Plane zwischen zwei Bäumen, ein Seil Baum–Haring) stehen in der Gruppe „Ohne Bau“, damit nichts fehlt |
| 10 | Weg, Zone, Grenze, Beschriftung | Kommen **nicht** in die Liste; von den Linien zählt nur der **Zaun** (Länge in m) *(Entscheidung Claude, Jakob kann umdrehen)* |

## D1 Material über das Register

- **`ObjektArt`** (`src/arten/ObjektArt.ts`) bekommt zwei Eigenschaften:
  ```ts
  readonly materialGruppe: 'bau' | 'zelt' | 'platz';
  material?(o: T, ctx: { zugabeProEnde: number }): MaterialBeitrag;
  ```
  - `materialGruppe` für die sechs Bau-Arten: `'bau'`; `zelt`: `'zelt'`; `platzobjekt` und `linie`: `'platz'`; `beschriftung` und `zone`: `'platz'`, ohne `material`.
  - `material` ist nur für `zelt`, `platzobjekt` und `linie` (Typ `zaun`) gesetzt; ein Bau-Objekt liefert keinen Beitrag, weil dafür `Materialliste` zuständig ist (Entscheidung 7).
- **`MaterialBeitrag`** (neu, `src/model/MaterialPosten.ts`): `{ gruppe: string; posten: readonly MaterialPosten[] }`.
  - `gruppe` ist der Titel des Blocks in der Liste: bei Zelten der **Vorlagenname** („Jurte 6er“, nicht der Name des einzelnen Zelts), bei Platz-Objekten der Vorlagenname („Feuerstelle“), beim Zaun „Zaun“.
  - `MaterialPosten` = `{ kategorie: string; bezeichnung: string; menge: number; einheit: 'Stk' | 'm' }`.
- **Beiträge:**
  - `Zelt`: „Zelt · <Vorlagenname> · 1 Stk“, „Haring · `abspannungen` Stk“, „Abspannseil <L> m · `abspannungen` Stk“. `L = ceil(seillaenge + 2 · zugabeProEnde − 1e-6)`, dieselbe Formel wie bei den Seilen der Bauten.
  - `Platzobjekt`: „<Vorlagenname> · 1 Stk“.
  - Zaun: „Zaun · Länge auf 0,1 m gerundet · m“.
- **Zusammenfassen** (`MaterialPosten.summiere`): gleiche `kategorie` + `bezeichnung` + `einheit` addieren ihre `menge`. Sortierung: nach Kategorie, dann Bezeichnung, Seile absteigend nach Länge.

## D2 Bau und Bau-Name

- **`Bau`** (aus E1, `src/model/Bau.ts`) bekommt:
  - `static alle(bauwerk): readonly Bau[]`, geordnet nach dem ersten Objekt jedes Baus in `Bauwerk.objekte`;
  - `static ohneBau(bauwerk): readonly string[]` (ids der Objekte, die in keinem Bau liegen, ohne Bäume);
  - `objektIds: readonly string[]` (in der Reihenfolge von `Bauwerk.objekte`) und `erstesObjekt: string`;
  - `teilBauwerk(bauwerk): Bauwerk` = ein Bauwerk (`Bauwerk.von`) mit den Objekten des Baus, damit `Materialliste.aus` darauf läuft. Bäume sind nicht enthalten; ein Seil zu einem Baum zählt trotzdem als Seil mit Haring-Ende.
- **Name:** `Bauwerk.bauNamen: ReadonlyMap<string, string>` (Objekt-id → Name), `mitBauName(bau: Bau, name: string | null): Bauwerk`, `bauName(bau: Bau): string`.
  - **Regel (die einfachste robuste, Entscheidung 5):** Der Name hängt **an einem Objekt des Baus**, dem **ersten** in `Bauwerk.objekte`. `bauName` nimmt den Eintrag des ersten Objekts, das einen hat. Gibt es keinen, heißt der Bau „Bau N“, wobei N die Position in `Bau.alle` (ab 1) ist.
  - **Umbenennen** löscht alle Einträge der Bau-Objekte und schreibt einen am ersten Objekt. Leerer Name (nach Trim) entfernt alle Einträge: wieder „Bau N“. Ungültig: „Name muss 1 bis 40 Zeichen lang sein.“ (Trim, Feld springt zurück).
  - **Löschen des Namensträgers:** `Bauwerk.ohne(id)` gibt den Namen an das erste überlebende Objekt desselben Baus weiter; überlebt keines, entfällt der Eintrag. Einträge zu nicht mehr vorhandenen ids werden beim Schreiben der Datei weggelassen.
- **Grenzen** (kommen in die Tooltip-Zeile „Name hängt am ersten Teil des Baus“ und in die README):
  - Werden zwei benannte Bauten verbunden, gilt der Name des Teils, der in `Bauwerk.objekte` weiter vorne steht; der andere ruht und kommt wieder, wenn man sie trennt.
  - Wird ein Bau getrennt, behält der Teil mit dem Namensträger den Namen; der andere heißt „Bau N“.
  - Eine Kopie (E1 Duplizieren) hat neue ids und damit den automatischen Namen.
  - Die Nummer in „Bau N“ ändert sich, wenn davor ein Bau entsteht oder verschwindet.
- **Undo:** Jede Umbenennung läuft über `editor.aendereMit` und ist ein Undo-Schritt.

## D3 Lagerliste (`src/model/Lagerliste.ts`)

```ts
class Lagerliste {
  readonly baue: readonly BauZeile[];       // { bau: Bau | null; name: string; liste: Materialliste } — „Ohne Bau“ mit bau = null, nur wenn nicht leer
  readonly zelte: readonly GruppenBlock[];  // { titel; anzahl: number; posten: MaterialPosten[] }
  readonly platz: readonly GruppenBlock[];
  readonly gesamt: Gesamtsumme;
  static aus(bauwerk: Bauwerk, register: ObjektRegister, zugabeProEnde: number): Lagerliste;
}
```
- **Bau-Blöcke:** je `Bau.alle` ein `Materialliste.aus(bau.teilBauwerk(bauwerk), zugabe)`; dazu „Ohne Bau“ (Entscheidung 9). Zählung wie Entscheidung 8.
- **Zelt- und Platz-Blöcke:** die Beiträge aller Objekte mit `material`, nach `gruppe` gruppiert (`anzahl` = Zahl der Objekte, `posten` summiert). Reihenfolge der Blöcke: nach erstem Auftreten in `Bauwerk.objekte`. **Kein `switch` auf die Art:** Die Liste fragt nur `register.fuer(o).material`.
- **`Gesamtsumme`:**
  - Der Bau-Teil kommt aus **einer** `Materialliste.aus(bauwerk, zugabe)` über das ganze Bauwerk (Stangen, Bünde, Seile, Planen, Haringe, Platzbedarf des ganzen Lagers). So werden gemeinsam genutzte Haringe nicht doppelt gezählt; die Summe der Bau-Blöcke kann deshalb bei einem Haring, an dem Seile zweier Bauten hängen, um diesen einen Haring höher liegen *(bekannte Grenze)*.
  - Dazu kommen die Posten aller Zelt- und Platz-Beiträge. **Seile** (Bauten) und **Abspannseile** (Zelte) erscheinen in einer Tabelle nach Länge, **Haringe** als eine Zeile (Bauten + Zelte). Zelte, Platz-Objekte und Zaun stehen als eigene Zeilen.
- **Platzbedarf:** gilt fürs ganze Lager (`Platzbedarf.aus(bauwerk)`, enthält Zelte) und steht in der Gesamtsumme; je Bau steht der Platzbedarf des Teil-Bauwerks.

## D4 Hinweise je Bau (`src/rules/BauHinweise.ts`)

- **`BauHinweis`** = `Hinweis` plus `bau: Bau | null` und `bauName: string | null`.
- **`BauHinweise.zuordnen(bauwerk, hinweise): readonly BauHinweis[]`:**
  - Der Bau kommt vom ersten Eintrag in `betroffeneTeile` (`besitzer` → `Bau.alle`-Suche, einmal pro Aufruf als Map aufgebaut).
  - Ohne `betroffeneTeile` oder bei einem Teil ohne Bau ist `bau = null`; der Hinweis bleibt wie heute ohne Zusatz.
- **Anzeige:** Das `HinweisPanel` stellt dem Text `„<Bauname>“: ` voran, **nur wenn es mehr als einen Bau gibt** (Entscheidung Claude, damit sich der Ein-Bau-Fall nicht ändert, Jakob kann umdrehen). Der Klick markiert wie bisher `betroffeneTeile`.
- `main.ts`: `pruefung()` ruft nach `RuleEngine.fuer(...).pruefe(bauwerk)` noch `BauHinweise.zuordnen` und `Lagerliste.aus`. Die Rechenergebnisse der Regeln bleiben identisch.

## D5 Oberfläche und Druck (`src/ui/LagerlistePanel.ts`)

- **Knopf „Materialliste…“** im bisherigen Panel öffnet die Lagerliste; das Panel `MateriallistePanel` (eine Tabelle je `Materialliste`) bleibt und wird je Bau-Block wiederverwendet.
- **Aufbau:**
  1. **Gesamtsumme** (oben).
  2. **Bauten:** je Block die Überschrift mit einem Namensfeld („Bau-Name“, Enter oder Verlassen speichert), dem Knopf „Zeigen“ (wählt alle Objekte des Baus, springt die Ansicht darauf) und die Tabelle des Baus mit Platzbedarf.
  3. **Zelte** und **Platz** je Block: „Jurte 6er (3 ×)“, darunter die Posten.
  4. **Hinweise** je Bau (Zähler und Texte), damit auf dem Papier steht, was noch offen ist.
- **Drucken:** Knopf „Drucken“ ruft `window.print()`.
  - Ein `@media print`-Block im bestehenden Stylesheet blendet 3D-Szene, Werkzeugleisten und Panels aus und zeigt nur die Lagerliste.
  - Kopf: „Lagerplan – Materialliste“ und das Datum (`de-AT`). Die **Fußzeile mit dem Faustregel-Hinweis bleibt** auch im Druck.
  - Jeder Block hat `break-inside: avoid`.
- **Ansichtsmodus (Handy):** Die Liste ist lesbar, Namensfeld und „Zeigen“ nur lesend bzw. aus; „Drucken“ bleibt.

## D6 Daten

- **Datenformat:** optional `bauNamen: { "<objekt-id>": "<Name>" }`. Fehlt das Feld, gelten die automatischen Namen. Die **Version bleibt v7**, wie bei `regeln` in E0 (D8): ein optionales Feld, dessen Fehlen nicht ablehnt. Ein älteres exe ignoriert es; zu prüfen ist, dass `BauwerkSerializer` unbekannte Felder nicht ablehnt, sonst wird es v8.
- Die Namen reisen mit Datei und Link und stehen im Undo-Verlauf.
- Gelesen werden v1–v7. Eine Datei ohne `bauNamen` lädt unverändert.

## D7 Tests

- **Unit (TDD), Modell:**
  - `Bau.alle` an der Kochstelle (ein Bau) und an zwei getrennten Bauten, Reihenfolge nach erstem Objekt; `ohneBau` mit einer Plane zwischen zwei Bäumen;
  - Bau-Name: Standardname „Bau N“, Umbenennen, leerer Name, Namensträger gelöscht (Weitergabe und Wegfall), Verbinden zweier benannter Bauten (erster gewinnt), Trennen, Kopie bekommt keinen Namen, Eintrag zu entfernter id fällt beim Schreiben weg;
  - `Materialliste` je `teilBauwerk` ergibt für einen einzelnen Bau dieselben Zeilen wie heute für das ganze Bauwerk (die bestehenden Tests bleiben unverändert);
  - `Lagerliste`: zwei Bauten + zwei Jurten 6er + Hanger + zwei Feuerstellen + 20 m Zaun → Blöcke, Anzahl, Gesamtsumme (Haringe aus Bauten und Zelten, Seile nach Länge gemischt);
  - jedes Objekt genau einmal gezählt, auch bei einem Seil zwischen zwei Bauten; ein gemeinsamer Haring (Grenze) im Test dokumentiert;
  - **kein Fall je Art:** Test registriert eine Testart mit `material` und findet sie in der Liste, ohne dass `Lagerliste` sie kennt;
  - `MaterialPosten.summiere` und die Seillängen-Formel.
- **Unit, Regeln:** `BauHinweise.zuordnen`: gleiche Hinweise wie `RuleEngine.pruefe` allein (Identität der `text`-Felder), Zuordnung per erstem `betroffeneTeile`, Hinweis ohne Teile bleibt `bau = null`.
- **Unit, UI** (happy-dom): `LagerlistePanel` zeigt alle Blöcke; Umbenennen ruft `aendereMit`, ungültiger Name springt zurück; Präfix im `HinweisPanel` nur bei mehr als einem Bau; Ansichtsmodus ohne Eingabefelder.
- **Serializer:** Rundlauf mit und ohne `bauNamen`; v1–v7 laden weiter.
- **e2e:**
  - Zwei Bauten und eine Jurte setzen → Liste zeigt „Bau 1“, „Bau 2“, „Jurte 6er“; „Bau 1“ in „Küche“ umbenennen, speichern, laden → Name bleibt.
  - Ein Hinweis erscheint als „Küche“: …
  - `window.print` wird aufgerufen (Stub); `emulateMedia({ media: 'print' })` zeigt nur die Liste.
- **Unverändert grün:** alle bestehenden Tests, Build, Web-e2e, Desktop-e2e.

## Nicht in E5

- Regeln mit eigenen Einstellungen je Bau (die Einstellungen bleiben pro Plan, D8 aus E0);
- Material der Bau-Arten über `material` im Register (Entscheidung 7);
- PDF-Export oder Datei-Download der Liste (Drucken genügt; „Als PDF drucken“ bietet der Browser);
- Preise, Gewichte, Packlisten, Lagermaterial außerhalb des Plans;
- Weg, Zone und Beschriftung in der Liste;
- Abstandsregeln (E6).

## Verifikation

- Die Tests aus D7 sind grün, ebenso Build und beide e2e-Läufe.
- **Manuell (Jakob):**
  - Einen echten Lagerplan mit mehreren Bauten, Zelten und Platz-Objekten legen und die Liste mit seiner Packliste vergleichen.
  - Bauten umbenennen, speichern, in der exe laden; zwei Bauten verbinden und trennen und prüfen, ob die Namen sinnvoll bleiben (Grenzen aus D2).
  - Die Druckansicht auf Papier oder als PDF ansehen: Kopf, Blöcke, Fußzeile, Seitenumbrüche.
  - Prüfen, ob ein Hinweis den richtigen Bau nennt.
