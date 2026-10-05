# Lagerplatz-Planer E0: Fundament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein gemeinsames Objekt-Modell (`LagerObjekt`, `Bauwerk.objekte`), eine Registry je Objektart, Datenformat v4 und eine Szene, die nur Geändertes neu baut, ohne dass sich für den Nutzer etwas sichtbar ändert; dazu als einzige sichtbare Neuerung die Regel-Einstellungen je Plan (D8).

**Architecture:**
- `src/model/` bekommt die Schnittstelle `LagerObjekt`, die alle sechs Klassen erfüllen. `Bauwerk` hält eine geordnete Liste `objekte`; die bisherigen typisierten Felder und Methoden bleiben als dünne Hüllen, damit Regeln und Tests unverändert bleiben.
- Das Neue `src/arten/` beschreibt je Art alles Editor-Seitige ohne three.js (Codec, Panel, Platzieren, Fangpunkte, Klickverhalten). Serializer, `SnapService`, Werkzeuge, `ParameterPanel` und Szene fragen nur noch das `ObjektRegister`, keine Fallunterscheidung je Art mehr.
- Die three.js-Seite liegt je Art in `src/editor/darstellung/`. Ein neuer `SzenenInhalt` (ohne Renderer, also ohne WebGL testbar) hält je Objekt eine Mesh-Gruppe und baut nur neu, was nicht mehr `===` gleich ist.
- D8: `RegelEinstellungen` (`src/rules/`) gehören zum `Bauwerk`, reisen als optionales Feld `regeln` im Format v4 mit und steuern `standardRegeln(einstellungen)` und die `RuleEngine`. Die Liste „Regeln…“ im Hinweis-Panel ändert sie über den Editor (Undo-Schritt).

**Tech Stack:** TypeScript 7, Vite, three.js, Vitest (+ happy-dom), Playwright (Browser + Electron). Nichts Neues.

**Spec:** `docs/superpowers/specs/2026-10-05-lagerplatz-planer-design.md` (Spec v3), Abschnitte „E0 Fundament“ (D1–D8, D8 als Nachtrag vom 05.10.2026) und „Verifikation“. Die v1-, v2a- und v2b-Specs gelten weiter.

Branch: `feat/objektmodell`, Stand `5cd4fef` (nur Spec-Commits über dem Code von `6b4d36d`). Die Specs zu E1–E3 und die gestrichene E7 ändern an E0 nichts.

**Vor Task 1: Rebase auf den R2-Fix.** `main` bekommt vorher den Bugfix aus `fix/r2-feste-knoten` (neue Datei `src/rules/FesteKnoten.ts`; `ViereckRule` meldet nur noch Vierecke mit mindestens einer nicht festen Ecke; Version 1.2.1). Diesen Fix plant E0 nicht. Vor Task 1 `feat/objektmodell` auf das neue `main` rebasen; danach steht `package.json` auf 1.2.1. Der Fix ändert weder den Konstruktor von `ViereckRule` noch `src/rules/constants.ts`; E0 lässt `FesteKnoten.ts`, `ViereckRule.ts` und die Fix-Tests (`FesteKnoten.test.ts`, `lagerplatz.integration.test.ts`) unverändert, und sie müssen in jedem Task grün bleiben. `lagerplatz.integration.test.ts` liest einen echten v3-Lagerplatz über den Serializer und sichert damit zusätzlich das Lesen alter Dateien.

Grundlinie: vor dem Rebase `npx vitest run` → 36 Testdateien, 277 Tests; nach dem Rebase (gemessen auf dem Stand von `fix/r2-feste-knoten`, `b39026e`) → **38 Testdateien, 292 Tests, alle grün**. Alle Testzahlen in diesem Plan gelten nach dem Rebase. Weicht die Grundlinie ab, weil der Fix sich bis zum Merge noch ändert, die Differenz einmal messen und auf alle Zahlen addieren.

**Testzahlen nach jedem Task** (Dateien / Tests, nach dem Rebase): Task 1: 39 / 313 · Task 2: 39 / 320 · Task 3: 39 / 322 · Task 4a: 40 / 339 · Task 4b: 41 / 355 · Task 5: 42 / 368 · Task 6: 42 / 370 · Task 7: 43 / 372 · Task 8: 43 / 375 · Task 9a: 44 / 382 · Task 9b: 45 / 390 · Task 10: 45 / 393 · Task 10b: 49 / 427.

**Beim Schreiben geprüft:** Alle Codeblöcke dieses Plans wurden auf eine Kopie des Codes angewendet, einmal ohne und einmal mit dem R2-Fix. Ohne R2-Fix bestand jeder Zwischenstand nach Task 1 bis 9b `tsc --noEmit` und `vitest run` mit den Zahlen oben minus 2 Dateien / 15 Tests (Task 10: 43 / 378, Task 10b: 47 / 412). Mit R2-Fix bestand der Endstand mit 49 / 427, Abdeckung ≥ 97 % in allen Metriken. `npm run e2e` ergab 7 passed. Im Sichtvergleich (Bilder vom Code vor E0, verglichen mit dem Endstand) ergab sich 5 passed. Ein einziger Lauf des Zwischenstands nach Task 6 meldete einmal einen roten Test unter hoher Last; vier Wiederholungen waren grün. Taucht das wieder auf, den Test benennen und als BLOCKED melden.

## Global Constraints

- UI-Texte, Bezeichner, Kommentare und Doku auf Deutsch; Commit-Nachrichten auf Englisch im Format `<type>: <beschreibung>`. Einheiten: Meter; y zeigt nach oben, der Boden ist y = 0. **Drehwinkel in Bogenmaß** (`DREH_SCHRITT = Math.PI / 12`), positiv wie `Baugruppe.drehung` (x dreht nach z).
- **Was der Nutzer sieht, ändert sich nicht**, außer den Regel-Einstellungen (D8, Task 10b). Sonst keine sichtbaren neuen Funktionen. **Keine Statik-Rechnung**, die Fußzeile bleibt immer sichtbar.
- `src/model/`, `src/rules/` und `src/arten/` importieren weder `three` noch DOM-APIs. `src/model/` importiert nichts aus `src/arten/`, `src/share/`, `src/editor/` oder `src/ui/`; aus `src/rules/` nur `RegelEinstellungen.ts` (D8), und diese Datei importiert nur `constants.ts`. Die Regel-Klassen (`*Rule.ts`), `Analyse.ts`, `KnotenGraph.ts`, `FesteKnoten.ts` und `constants.ts` ändert E0 nicht; in `src/rules/` kommen nur D8 dazu: `RegelEinstellungen.ts`, `standardRegeln(einstellungen)` und abgeschaltete Regeln in der `RuleEngine`.
- Unveränderliche Domänenobjekte: Methoden geben neue Objekte zurück. `Bauwerk.ersetze` und `Bauwerk.ohne` klonen unberührte Objekte nie (sie bleiben `===`).
- **`LagerObjekt`** (Spec D1, exakt): `id`, `art: ArtName`, `ids()`, `verschobenUm(dv: Vec3)`, `gedreht(winkelRad: number, um?: Vec3)`, `platzPunkte()`; `ArtName = 'dreibein' | 'abock' | 'stange' | 'seil' | 'baum' | 'plane'`. Drehpunkt ohne `um`: Baugruppe und Baum ihre Position; Stange, Seil und Plane die Mitte zwischen Start und Ende. `platzPunkte()`: Füße für Baugruppen und freie Stangen, Ösen für Planen, nichts für Seile und Bäume.
- `Baugruppe.verschoben(position)` (absolut) und `Baugruppe.gedreht(delta)` behalten ihre Bedeutung; `gedreht` bekommt nur den optionalen zweiten Parameter.
- **Datenformat (Spec D3):**
  - geschrieben wird immer `{ "version": 4, "objekte": [ { "art": "…", "id": "…", … }, … ] }`, Felder je Art wie in v3, Reihenfolge wie `Bauwerk.objekte`;
  - gelesen werden die Versionen 1, 2, 3 und 4; v1–v3 in der alten Reihenfolge **Gruppen, Stangen, Bäume, Planen, Seile**;
  - eine unbekannte Art oder Version ergibt „Ungültige Bauwerk-Daten“;
  - `MAX_TEILE = 2000` (vorher 500); `MAX_HASH_ZEICHEN = 200_000` und `MAX_JSON_ZEICHEN = 1_000_000` bleiben;
  - optional `regeln: { aus: ['R4'], werte: { R4_MAX_BEINWINKEL_GRAD: 40 } }` (D8); fehlt das Feld, gelten die Standardwerte, v1–v3 haben es nie. Es reist mit Datei und Link.
- **Regel-Einstellungen (D8):** jede Regel R1–R8 an/aus; die Schwellwerte aus `constants.ts` einstellbar (fehlt ein Wert, gilt der Standard). Meldungen (`RangeError`, exakt): „Wert muss größer als 0 sein“, „Winkel muss zwischen 0 und 90° liegen“, „Untergrenze muss kleiner als die Obergrenze sein“ (R4 min < max, R6 min < max). Ohne Einstellungen ist das Prüfergebnis identisch zu heute. Knopf „Regeln…“ im Hinweis-Panel, Zeile „Ausgeschaltet: R4“, ungültige Werte springen zurück, in der Handy-Ansicht nur lesbar.
- **`Treffer`** (Spec D4, exakt): `{ art: 'boden'; punkt } | { art: 'objekt'; objektArt: ArtName; id: string; punkt }`; `id` ist die Teil-id (z. B. eine Stange einer Baugruppe), `objektArt` die Art des Objekts, dem sie gehört.
- **Einrasten:** Prioritäten Spitze → Bund → Ende → Öse → Stange/Baum → Boden. Regel aus v2b-Review M-1: Spitze/Bund/Ende in Reichweite gewinnen vor der Öse einer getroffenen Plane.
- **Klickziele pro Werkzeug (v2b):** Auswahl → `['seil', 'plane']`, Seil spannen → `['plane']`, alle anderen → `[]`. `WerkzeugName = ArtName | 'auswahl'`.
- **Panel:** Feldnamen, Texte, Meldungen und das Zurückspringen ungültiger Werte bleiben gleich.
- `Szene.zeige(bauwerk, markiert, stangenStart)` behält ihre Signatur.
- `Editor.dreheAuswahl` dreht weiter nur Baugruppen.
- **Nicht in E0:** Regeln oder Materialliste je Bau, ein Materialbeitrag je Art, Ziehen, Kopieren, Draufsicht, variable Bodengröße.
- Abdeckung ≥ 80 % (alle vier Metriken) für `src/model/**`, `src/rules/**` und neu `src/arten/**`.
- **Tests:** Angepasst werden nur `share.test.ts` (Format v4), die `Treffer`-Literale in `SnapService.test.ts` und `Editor.test.ts`; deren Assertions bleiben. Alle anderen bestehenden Tests bleiben unverändert grün. `npm run build` prüft die Tests mit (tsconfig `include: src, e2e, …`): bewusst falsche Casts in Tests immer als `as unknown as X`.
- `npm run e2e` bleibt bis Task 10 bei 6 Tests; Task 10b bringt `e2e/regeln.spec.ts` dazu (7). `npm run e2e:desktop` bleibt bei 5 Tests. Der Web-Build bleibt `base: '/lagerbau-simulator/'`.
- Version **1.2.1 → 1.3.0** (1.2.1 kommt mit dem R2-Fix; Format v4: ältere `.exe` können neue Dateien nicht lesen; wie bei 1.1 und 1.2 ein Minor-Sprung).
- Immer einzelne Dateien stagen, nie `git add -A`. Kein `Co-Authored-By`-Trailer. Öffentliches Repo: keine persönlichen Termine, Gruppennamen oder Vault-Interna.

## Abweichungen von der Spec (bewusst)

- **Startmarkierung außerhalb der „Ableitungen“:** D5 legt sie in die Gruppe, die nur bei neuem `Bauwerk` neu gebaut wird. Beim ersten Klick eines Zwei-Klick-Werkzeugs ändert sich aber nur `stangenStart`, nicht das Bauwerk; die Kugel würde dann fehlen. Sie wird deshalb getrennt geführt und neu gebaut, wenn sich `stangenStart` (Identität) ändert. Bünde, Heringe und Platzrahmen bleiben wie in D5.
- **`beiTreffer(o, teilId, punkt, mitOesen)`** statt `beiTreffer(o, punkt)`: Die Teil-id sagt, welche Stange einer Baugruppe getroffen wurde; `mitOesen`, weil eine Plane nur im Seil-Werkzeug auf ihre Öse einrastet.
- **`ObjektArt` hat zusätzlich `hatOesen`**, und `platzieren` im Modus `linie` hat `fangtOesen`. Daraus leitet das Register die Klickziele ab (Seil spannen → Arten mit Ösen), statt sie je Werkzeug festzuschreiben.
- **v4-Gruppen haben kein Feld `typ`:** `art` sagt dasselbe. Beim Lesen von v1–v3 wird `typ` zur `art`.
- **Lesen der Formate 1–3 in `src/share/AltesFormat.ts`**, damit `BauwerkSerializer.ts` keine Artnamen mehr enthält (Spec-Verifikation: keine Fallunterscheidung je Art).
- **Eine Darstellung für beide Baugruppen** (`BaugruppeDarstellung`, je eine Instanz für `dreibein` und `abock`). Die Darstellungen stehen in `standardDarstellungen()` (three.js darf nicht ins reine Register). Eine neue Art braucht damit: Modellklasse **und ihren Namen in `ART_NAMEN`**, `src/arten/<Art>Art.ts` + Zeile in `standardArten()`, Darstellung + Zeile in `standardDarstellungen()` (der Typ `Record<ArtName, Darstellung>` erzwingt sie), Knopf in `index.html`.
- **`SzenenInhalt`** (neu, `src/editor/SzenenInhalt.ts`) enthält die inkrementelle Logik; `Szene` behält Renderer, Kamera und Raycasting und reicht `zeige` weiter. So ist D5 ohne WebGL testbar.
- **`Editor.waehleMehrere(ids)`** kommt dazu: ohne sie ließe sich die abgeleitete `auswahl` bei mehreren ausgewählten Objekten nicht testen; E1 braucht sie ohnehin.
- **`Bauwerk.stangen()`** bleibt „erst alle Gruppenstangen, dann die freien Stangen“, unabhängig von der Reihenfolge in `objekte`. Davon hängen die ids der Bünde ab (`bund-0`, …).
- **Gleich weite Fangpunkte derselben Art:** Bei exakt gleichem Abstand und gleicher Art gewinnt der erste in `objekte`-Reihenfolge (vorher: erst alle Spitzen, dann alle Enden). Nur exakte Gleichstände sind betroffen; Prioritäten und Toleranz bleiben.
- **Panel für eine Gruppenstangen-id:** Ist per Code eine Stange einer Baugruppe ausgewählt (über die Oberfläche nicht erreichbar, die Auswahl springt auf die Gruppe), bleibt das Panel leer statt eines Stangen-Formulars, dessen Änderung mit einem unbehandelten `Error` scheiterte.
- **Weitere `share.test.ts`-Anpassungen** über D7 hinaus: Drei Tests lesen `json.gruppen`, `json.seile` bzw. `json.planen` aus dem geschriebenen JSON; sie lesen jetzt `json.objekte`. Ihre Aussagen bleiben.
- **Sichtvergleich (Spec-Verifikation):** Er läuft mit einer **nicht eingecheckten** Playwright-Konfiguration in `e2e-sicht/`. Die Referenzbilder entstehen in Task 1 vor jeder Codeänderung, verglichen wird in Task 9b und Task 11; danach wird der Ordner gelöscht. Er kommt nicht zu `npm run e2e` dazu.
- **D8 im Detail** (Task 10b, „Entscheidungen zu D8“): Einstellbar sind die neun Regel-Schwellwerte aus `constants.ts`, nicht `SEIL_ZUGABE_PRO_ENDE` (Materialliste). `regeln` wird nur geschrieben, wenn etwas vom Standard abweicht; Dateien ohne Einstellungen bleiben wie nach Task 5. Untergrenze < Obergrenze wird mit den wirksamen Werten geprüft, beim Laden erst nach allen Einzelwerten. „Regeln…“ klappt einen Bereich im Hinweis-Panel auf (kein Dialog).

## Review Focus

1. **Alte v1/v2/v3-Links und -Dateien**, darunter die Daten in `e2e/smoke.spec.ts`, `e2e/abspannung.spec.ts` und `e2e/planen.spec.ts`. Erwartet: Sie öffnen und sehen aus wie vorher. Objekt-Reihenfolge, Stangen-Reihenfolge, Bünde (ids und Stangen), Heringe und Platzbedarf sind gleich Eine v4-Datei ohne `regeln` ergibt genau die Hinweise von heute → Test mit vor dem Umbau gemessenen Werten in Task 5 (`AltesFormat.test.ts`), Test „gibt für eine v4-Datei ohne regeln genau die Hinweise von heute“ in Task 10b (`RegelnFormat.test.ts`), dazu `lagerplatz.integration.test.ts` aus dem R2-Fix; Bildvergleich in Task 9b und Task 11.
2. **Klicken nach dem Umbau der `Treffer`.** Erwartet: Ein Klick auf eine Stange (auch den Riegel) eines Dreibeins oder A-Bocks wählt die Gruppe. Seile und Planen fangen Klicks nur in den Werkzeugen aus v2b (Auswahl → Seile + Planen, Seil spannen → Planen, sonst keine) → Tests in Task 6 (Riegel), Task 7 (Klickziele aus dem Register) und Task 9b (`SzenenInhalt.ziele`).
3. **Rückgängig/Wiederholen mit der inkrementellen Szene.** Erwartet: Springt man zu einem älteren Bauwerk zurück, dessen Objekte `===` zu zwischengespeicherten sind, zeigt die Szene genau diesen Stand. Es bleiben keine Geister-Meshes, und es fehlt kein Mesh → Test in Task 9b (Fingerabdruck nach b1 → b2 → b3 → b2 → b1 gleich einem frisch gebauten b1).
4. **Löschen und Hervorheben.** Erwartet: Ein gelöschtes Objekt verliert alle Meshes, und deren Geometrie wird freigegeben, die geteilten Materialien nicht. Markiert ein Hinweis eine einzelne Stange einer Gruppe, leuchtet nur diese → Tests in Task 9b.
5. **Eine Datei an der neuen Grenze.** Erwartet: Eine gespeicherte Datei mit 2000 Teilen (2000 Planen voller Genauigkeit, die größte Art) passt unter `MAX_JSON_ZEICHEN` und lädt über `Teilen.lade`. 2001 Teile ergeben „Ungültige Bauwerk-Daten: mehr als 2000 Teile“ → Test in Task 5.

## Dateistruktur

| Datei | Verantwortung | Task |
|---|---|---|
| `src/model/LagerObjekt.ts` (neu), `src/model/Vec3.ts`, `Baugruppe.ts`, `Dreibein.ts`, `ABock.ts`, `Stange.ts`, `Seil.ts`, `Baum.ts`, `Plane.ts` | Schnittstelle `LagerObjekt`, `ART_NAMEN`, `Vec3.gedrehtUmY`, Umsetzung in allen sechs Klassen | 1 |
| `e2e-sicht/` (neu, **nie einchecken**) | Referenzbilder für den Sichtvergleich | 1 |
| `src/model/Bauwerk.ts` | eine Liste `objekte`, `mit`/`ersetze`/`ohne`/`objekt`/`besitzer`/`von`, typisierte Hüllen | 2 |
| `src/model/Platzbedarf.ts` | über `platzPunkte()` | 3 |
| `src/share/lesen.ts` (neu), `src/arten/ObjektArt.ts`, `ObjektRegister.ts`, `standardArten.ts`, `DreibeinArt.ts`, `ABockArt.ts`, `StangeArt.ts`, `SeilArt.ts`, `BaumArt.ts`, `PlaneArt.ts` (alle neu), `vite.config.ts` | Register und Codec je Art | 4a |
| `src/arten/*` (wie 4a), `src/arten/gemeinsam.ts` (neu) | Panel, Platzieren, Fangpunkte, Klickverhalten je Art | 4b |
| `src/share/BauwerkSerializer.ts`, `src/share/AltesFormat.ts` (neu), `src/share/grenzen.ts` | Datenformat v4, v1–v3 lesen, `MAX_TEILE` 2000 | 5 |
| `src/editor/SnapService.ts`, `src/editor/Werkzeuge.ts` (nur `SelectTool`), `src/editor/Szene.ts` (nur Treffer) | generischer `Treffer`, Einrasten über das Register | 6 |
| `src/editor/Werkzeuge.ts`, `src/editor/Editor.ts`, `src/main.ts` | `PlatziereTool`, `SelectTool`, Klickziele aus dem Register | 7 |
| `src/ui/ParameterPanel.ts`, `src/main.ts` | Formular aus der Panel-Beschreibung | 8 |
| `src/editor/darstellung/` (neu: `Darstellung.ts`, `materialien.ts`, `formen.ts`, `StangeDarstellung.ts`, `BaugruppeDarstellung.ts`, `SeilDarstellung.ts`, `BaumDarstellung.ts`, `PlaneDarstellung.ts`, `Ableitungen.ts`, `standardDarstellungen.ts`) | three.js je Art | 9a |
| `src/editor/SzenenInhalt.ts` (neu), `src/editor/Szene.ts` | inkrementelle Szene | 9b |
| `src/editor/Editor.ts` | `ausgewaehlt`, `waehleMehrere`, `aendereObjekte` | 10 |
| `src/rules/RegelEinstellungen.ts` (neu), `src/rules/standardRegeln.ts`, `src/rules/RuleEngine.ts`, `src/model/Bauwerk.ts`, `src/share/RegelnFormat.ts` (neu), `src/share/BauwerkSerializer.ts`, `src/ui/RegelnPanel.ts` (neu), `src/main.ts`, `index.html`, `src/style.css`, `e2e/regeln.spec.ts` (neu) | Regel-Einstellungen je Plan (D8) | 10b |
| `package.json`, `package-lock.json`, `README.md`, `CLAUDE.md`, ggf. `docs/ki-lernlog.md` | Version 1.3.0, Doku, Abschlussprüfung | 11 |

**Aufteilung:** Task 4 (Register) und Task 9 (Szene) sind je in zwei Tasks geteilt, weil ein Reviewer die eine Hälfte ablehnen und die andere annehmen kann. 4a ist das Datenformat je Art, 4b das Editor-Verhalten je Art. 9a sind die Meshes je Art, 9b das Zwischenspeichern und Umfärben. Task 7 bleibt ganz: Werkzeuge, Editor-Anschluss und `main.ts` gehören zusammen. D8 ist ein eigener Task 10b nach Task 10: Er braucht das Format v4 (Task 5) und den Editor, berührt aber kein Objekt-Modell.

---

### Task 1: `LagerObjekt` in den sechs Modellklassen

**Files:**
- Create: `src/model/LagerObjekt.ts`
- Modify: `src/model/Vec3.ts`, `src/model/Baugruppe.ts` (ganze Datei), `src/model/Dreibein.ts`, `src/model/ABock.ts`, `src/model/Stange.ts` (ganze Datei), `src/model/Seil.ts` (ganze Datei), `src/model/Baum.ts` (ganze Datei), `src/model/Plane.ts`
- Test: `src/model/LagerObjekt.test.ts` (neu), `src/model/Vec3.test.ts`
- Nicht einchecken: `e2e-sicht/playwright.config.ts`, `e2e-sicht/sicht.spec.ts`, `e2e-sicht/bilder/*.png`

**Interfaces:**
- Consumes: `Vec3` (`add`, `scale`, `equals`, `toArray`, `Vec3.NULL`), `Fuss.von(stange)`, die bestehenden `Baugruppe.verschoben(position)` und `fuesse()` von Dreibein/A-Bock.
- Produces:
  - `export const ART_NAMEN = ['dreibein', 'abock', 'stange', 'seil', 'baum', 'plane'] as const;` und `export type ArtName = (typeof ART_NAMEN)[number];` in `src/model/LagerObjekt.ts`;
  - `export interface LagerObjekt { readonly id: string; readonly art: ArtName; ids(): readonly string[]; verschobenUm(dv: Vec3): LagerObjekt; gedreht(winkelRad: number, um?: Vec3): LagerObjekt; platzPunkte(): readonly Vec3[] }`;
  - `Vec3.gedrehtUmY(winkelRad: number, um: Vec3 = Vec3.NULL): Vec3`;
  - `Baugruppe implements LagerObjekt` mit `get art(): BaugruppenTyp`, `ids()`, `verschobenUm(dv): Baugruppe`, `platzPunkte()`, `abstract gedreht(delta: number, um?: Vec3): Baugruppe`;
  - `Stange`, `Seil`, `Baum`, `Plane` mit `readonly art = '<name>' as const`, `ids()`, `verschobenUm(dv)` und `gedreht(winkelRad, um?)` (Rückgabe: die eigene Klasse) sowie `platzPunkte()`.

- [ ] **Step 1: Referenzbilder für den Sichtvergleich aufnehmen (vor jeder Codeänderung, nicht einchecken)**

Die Spec verlangt, dass alte Bauten „aussehen wie vorher“. Dafür entstehen jetzt Bilder vom unveränderten Stand; Task 9b und Task 11 vergleichen dagegen. Der Ordner `e2e-sicht/` liegt außerhalb von `testDir: 'e2e'` und von `tsconfig.include`; `npm run e2e` und `npm run build` sehen ihn also nicht.

Neue Datei `e2e-sicht/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const BASIS = 'http://localhost:4173/lagerbau-simulator/';

/** Einmaliger Sichtvergleich für E0 (Spec v3, Verifikation). Nicht einchecken; nach Task 11 löschen. */
export default defineConfig({
  testDir: '.',
  snapshotPathTemplate: '{testDir}/bilder/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  use: { baseURL: BASIS },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    cwd: '..',
    url: BASIS,
    // Nie einen laufenden Server mit altem Build wiederverwenden: Dann verglichen die Bilder den falschen Stand.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

Neue Datei `e2e-sicht/sicht.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

type V3 = [number, number, number];

// Dieselben Daten wie in e2e/smoke.spec.ts (v1), e2e/abspannung.spec.ts (v2) und e2e/planen.spec.ts (v3).
const ABOCK_SPITZE: V3 = [0, Math.sqrt(2.2 ** 2 - 0.8 ** 2), 0];
const DREIBEIN_SPITZE: V3 = [2.5, Math.sqrt(2.2 ** 2 - 0.7 ** 2), 0];
const ABOCK = { id: 'abock', typ: 'abock', position: [0, 0, 0], drehung: Math.PI / 2, params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 } };
const DREIBEIN = { id: 'dreibein', typ: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 } };
const seil = (id: string, x: number) => ({ id, start: ABOCK_SPITZE, ende: [x, 0, 0] });

/** Der First ragt wie bei Stange.zwischen an beiden Enden 0,2 m über die Spitzen hinaus. */
function first(): { id: string; start: V3; ende: V3; durchmesser: number } {
  const d = DREIBEIN_SPITZE.map((x, i) => x - ABOCK_SPITZE[i]!);
  const laenge = Math.hypot(...d);
  const r = d.map((x) => x / laenge);
  return {
    id: 'first',
    start: ABOCK_SPITZE.map((x, i) => x - r[i]! * 0.2) as V3,
    ende: DREIBEIN_SPITZE.map((x, i) => x + r[i]! * 0.2) as V3,
    durchmesser: 0.08,
  };
}

const FAELLE: Record<string, object> = {
  v1: { version: 1, gruppen: [ABOCK, DREIBEIN], stangen: [] },
  v2: { version: 2, gruppen: [ABOCK], stangen: [], seile: [seil('l', -1.5), seil('r', 1.5)], baeume: [] },
  v3: {
    version: 3,
    gruppen: [ABOCK, DREIBEIN],
    stangen: [first()],
    seile: [],
    baeume: [],
    planen: [{ id: 'dach', start: ABOCK_SPITZE, ende: DREIBEIN_SPITZE, breite: 3, laenge: 4, form: 'satteldach', neigung: 30, seite: 1 }],
  },
};
const LEINWAND = '#ansicht canvas';

test('Beispiel-Kochstelle', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Beispiel laden' }).click();
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(page.locator(LEINWAND)).toHaveScreenshot('kochstelle.png');
});

for (const [name, daten] of Object.entries(FAELLE)) {
  test(`Link ${name}`, async ({ page }) => {
    await page.goto(`./?t=${name}#b=${LZString.compressToEncodedURIComponent(JSON.stringify(daten))}`);
    await expect(page.locator('#platzbedarf')).toContainText('Platzbedarf');
    await expect(page.locator(LEINWAND)).toHaveScreenshot(`link-${name}.png`);
  });
}

test('Datei v3 laden', async ({ page }) => {
  await page.goto('./');
  await page.locator('#inp-laden').setInputFiles({ name: 'lagerbau.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(FAELLE.v3)) });
  await expect(page.locator('#platzbedarf')).toContainText('Platzbedarf');
  await expect(page.locator(LEINWAND)).toHaveScreenshot('datei-v3.png');
});
```

Run: `npx playwright test -c e2e-sicht/playwright.config.ts --update-snapshots`
Expected: `5 passed`; es gibt `e2e-sicht/bilder/kochstelle.png`, `link-v1.png`, `link-v2.png`, `link-v3.png`, `datei-v3.png`. Belegt schon ein anderer Prozess Port 4173, bricht Playwright ab: den Prozess beenden und wiederholen.

Run: `npx playwright test -c e2e-sicht/playwright.config.ts`
Expected: `5 passed`. Damit ist belegt, dass die Bilder stabil sind. Scheitert schon dieser zweite Lauf, `maxDiffPixelRatio` auf `0.01` setzen und beide Läufe wiederholen. Reicht auch das nicht: in `CLAUDE.md` unter „Known Issues & Failed Attempts“ eintragen; die Vergleichs-Schritte in Task 9b und Task 11 entfallen, und Jakob vergleicht dort per Augenschein.

Run: `git status --short`
Expected: `?? e2e-sicht/` steht in der Liste. Diesen Ordner **nie** stagen.

- [ ] **Step 2: Failing tests schreiben**

Neue Datei `src/model/LagerObjekt.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from './ABock';
import { Baum } from './Baum';
import { Dreibein } from './Dreibein';
import { ART_NAMEN, type LagerObjekt } from './LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from './params';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

const istBei = (p: Vec3 | undefined, x: number, y: number, z: number): void => {
  expect(p?.equals(new Vec3(x, y, z), 1e-9), `${p?.toArray().join(', ')} ≠ ${x}, ${y}, ${z}`).toBe(true);
};
const VIERTEL = Math.PI / 2;

it('erfüllen alle sechs Klassen die gemeinsame Schnittstelle (Spec v3, D1)', () => {
  const alle: readonly LagerObjekt[] = [
    new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN),
    new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK),
    new Stange('s', Vec3.NULL, new Vec3(0, 2, 0), 0.08),
    new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0)),
    new Baum('b', Vec3.NULL, STANDARD_BAUM),
    new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE),
  ];
  expect(alle.map((o) => o.art)).toEqual([...ART_NAMEN]);
});

describe('LagerObjekt: Dreibein', () => {
  const d = new Dreibein('d', new Vec3(2, 0, 0), 0, STANDARD_DREIBEIN);

  it('kennt Art und ids samt Beinen', () => {
    expect(d.art).toBe('dreibein');
    expect(d.ids()).toEqual(['d', 'd-bein-0', 'd-bein-1', 'd-bein-2']);
  });

  it('verschiebt um einen Vektor und behält Drehung und Maße', () => {
    const v = d.verschobenUm(new Vec3(1, 0, -1));
    expect(v).toBeInstanceOf(Dreibein);
    istBei(v.position, 3, 0, -1);
    expect(v.drehung).toBe(0);
    expect((v as Dreibein).params).toBe(d.params);
    istBei(d.position, 2, 0, 0);
  });

  it('dreht ohne Drehpunkt um die eigene Position (wie bisher)', () => {
    const g = d.gedreht(VIERTEL);
    istBei(g.position, 2, 0, 0);
    expect(g.drehung).toBeCloseTo(VIERTEL, 12);
  });

  it('dreht mit Drehpunkt die Position und alle Füße mit', () => {
    const g = d.gedreht(VIERTEL, Vec3.NULL);
    istBei(g.position, 0, 0, 2);
    expect(g.drehung).toBeCloseTo(VIERTEL, 12);
    d.fuesse().forEach((f, i) => istBei(g.fuesse()[i], ...f.gedrehtUmY(VIERTEL, Vec3.NULL).toArray()));
  });

  it('hat seine Füße als Platzpunkte', () => {
    const punkte = d.platzPunkte();
    expect(punkte).toHaveLength(3);
    d.fuesse().forEach((f, i) => istBei(punkte[i], f.x, f.y, f.z));
  });
});

describe('LagerObjekt: A-Bock', () => {
  const a = new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK);

  it('kennt Art und ids samt Beinen und Riegel', () => {
    expect(a.art).toBe('abock');
    expect(a.ids()).toEqual(['a', 'a-bein-0', 'a-bein-1', 'a-riegel']);
  });

  it('dreht um einen fremden Drehpunkt und verschiebt um einen Vektor', () => {
    const g = a.gedreht(Math.PI, new Vec3(1, 0, 0));
    istBei(g.position, 2, 0, 0);
    expect(g.drehung).toBeCloseTo(Math.PI, 12);
    istBei(a.verschobenUm(new Vec3(0, 0, 3)).position, 0, 0, 3);
  });

  it('hat nur die beiden Füße als Platzpunkte, nicht den Riegel', () => {
    const punkte = a.platzPunkte();
    expect(punkte).toHaveLength(2);
    istBei(punkte[0], -0.8, 0, 0);
    istBei(punkte[1], 0.8, 0, 0);
  });
});

describe('LagerObjekt: Stange', () => {
  const s = new Stange('s', Vec3.NULL, new Vec3(2, 2, 0), 0.08);

  it('kennt Art und id', () => {
    expect(s.art).toBe('stange');
    expect(s.ids()).toEqual(['s']);
  });

  it('verschiebt beide Enden und behält Durchmesser, Rolle und Gruppe', () => {
    const v = s.verschobenUm(new Vec3(1, 0, 1));
    istBei(v.start, 1, 0, 1);
    istBei(v.ende, 3, 2, 1);
    expect(v.durchmesser).toBe(0.08);
    const bein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN).stangen()[0];
    const verschoben = bein?.verschobenUm(new Vec3(1, 0, 0));
    expect([verschoben?.rolle, verschoben?.gruppeId]).toEqual(['bein', 'd']);
  });

  it('dreht ohne Drehpunkt um die Mitte, mit Drehpunkt um diesen', () => {
    const umMitte = s.gedreht(VIERTEL);
    istBei(umMitte.start, 1, 0, -1);
    istBei(umMitte.ende, 1, 2, 1);
    const umNull = s.gedreht(VIERTEL, Vec3.NULL);
    istBei(umNull.start, 0, 0, 0);
    istBei(umNull.ende, 0, 2, 2);
  });

  it('hat ihre Enden am Boden als Platzpunkte', () => {
    expect(s.platzPunkte()).toHaveLength(1);
    istBei(s.platzPunkte()[0], 0, 0, 0);
    expect(new Stange('first', new Vec3(0, 2, 0), new Vec3(3, 2, 0), 0.08).platzPunkte()).toEqual([]);
  });
});

describe('LagerObjekt: Seil', () => {
  const l = new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0));

  it('kennt Art und id und braucht selbst keinen Platz', () => {
    expect(l.art).toBe('seil');
    expect(l.ids()).toEqual(['l']);
    expect(l.platzPunkte()).toEqual([]);
  });

  it('verschiebt und dreht um die Mitte oder einen Drehpunkt', () => {
    const v = l.verschobenUm(new Vec3(0, 0, 3));
    istBei(v.start, 0, 2, 3);
    istBei(v.ende, 2, 0, 3);
    const halb = l.gedreht(Math.PI);
    istBei(halb.start, 2, 2, 0);
    istBei(halb.ende, 0, 0, 0);
    const umEnde = l.gedreht(VIERTEL, new Vec3(2, 0, 0));
    istBei(umEnde.start, 2, 2, -2);
    istBei(umEnde.ende, 2, 0, 0);
  });
});

describe('LagerObjekt: Baum', () => {
  const b = new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM);

  it('kennt Art und id und zählt nicht zum Platzbedarf', () => {
    expect(b.art).toBe('baum');
    expect(b.ids()).toEqual(['b']);
    expect(b.platzPunkte()).toEqual([]);
  });

  it('bleibt beim Verschieben am Boden und dreht nur um einen fremden Drehpunkt sichtbar', () => {
    istBei(b.verschobenUm(new Vec3(1, 3, 1)).position, 6, 0, 1);
    istBei(b.gedreht(1).position, 5, 0, 0);
    istBei(b.gedreht(VIERTEL, Vec3.NULL).position, 0, 0, 5);
    expect(b.gedreht(VIERTEL, Vec3.NULL).params).toBe(b.params);
  });
});

describe('LagerObjekt: Plane', () => {
  const p = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { ...STANDARD_PLANE, neigungGrad: 0 });

  it('kennt Art und id und hat ihre Ösen als Platzpunkte', () => {
    expect(p.art).toBe('plane');
    expect(p.ids()).toEqual(['pl']);
    expect(p.platzPunkte()).toEqual(p.oesen);
    expect(p.platzPunkte()).toHaveLength(8);
  });

  it('dreht um die Mitte der Linie oder einen Drehpunkt und behält die Maße', () => {
    const g = p.gedreht(VIERTEL);
    istBei(g.start, 2, 2, -2);
    istBei(g.ende, 2, 2, 2);
    expect(g.params).toBe(p.params);
    istBei(p.gedreht(VIERTEL, Vec3.NULL).ende, 0, 2, 4);
  });

  it('verschiebt und prüft die neue Lage', () => {
    istBei(p.verschobenUm(new Vec3(1, 0, 0)).start, 1, 2, 0);
    expect(() => p.verschobenUm(new Vec3(0, -3, 0))).toThrow('Plane reicht in den Boden');
  });
});
```

In `src/model/Vec3.test.ts` innerhalb von `describe('Vec3', …)` nach dem letzten `it(…)` einfügen:

```ts

  it('dreht um die senkrechte Achse durch einen Punkt, ohne die Höhe zu ändern', () => {
    expect(new Vec3(1, 2, 0).gedrehtUmY(Math.PI / 2).equals(new Vec3(0, 2, 1), 1e-12)).toBe(true);
    expect(new Vec3(3, 1, 0).gedrehtUmY(Math.PI, new Vec3(2, 5, 0)).equals(new Vec3(1, 1, 0), 1e-12)).toBe(true);
  });
```

- [ ] **Step 3: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/model/LagerObjekt.test.ts src/model/Vec3.test.ts`
Expected: FAIL. `./LagerObjekt` fehlt; `gedrehtUmY`, `ids`, `verschobenUm` und `platzPunkte` sind keine Funktionen.

- [ ] **Step 4: Schnittstelle und Drehung um die senkrechte Achse**

Neue Datei `src/model/LagerObjekt.ts`:

```ts
import type { Vec3 } from './Vec3';

/**
 * Alle Objektarten des Planers (Spec v3, D1). Eine neue Art kommt hier dazu, außerdem in `standardArten()` (src/arten)
 * und in `standardDarstellungen()` (src/editor/darstellung).
 */
export const ART_NAMEN = ['dreibein', 'abock', 'stange', 'seil', 'baum', 'plane'] as const;
export type ArtName = (typeof ART_NAMEN)[number];

/** Gemeinsame Schnittstelle aller Objekte auf dem Platz. Unveränderlich: Jede Methode liefert ein neues Objekt. */
export interface LagerObjekt {
  readonly id: string;
  readonly art: ArtName;
  /** Eigene id und die ids aller Teile, z. B. der Stangen einer Baugruppe. */
  ids(): readonly string[];
  verschobenUm(dv: Vec3): LagerObjekt;
  /**
   * Um die senkrechte Achse durch `um` gedreht, Winkel in Bogenmaß, positiv wie `Baugruppe.drehung`.
   * Ohne `um`: Baugruppe und Baum um ihre Position, Stange, Seil und Plane um die Mitte zwischen Start und Ende.
   */
  gedreht(winkelRad: number, um?: Vec3): LagerObjekt;
  /** Punkte, die der Platzbedarf umfasst: Füße bei Baugruppen und freien Stangen, Ösen bei Planen. */
  platzPunkte(): readonly Vec3[];
}
```

In `src/model/Vec3.ts` vor `toArray()` einfügen:

```ts
  /** Um die senkrechte Achse durch `um` gedreht; positiv wie `Baugruppe.drehung` (x dreht nach z). Die Höhe bleibt. */
  gedrehtUmY(winkelRad: number, um: Vec3 = Vec3.NULL): Vec3 {
    const c = Math.cos(winkelRad);
    const s = Math.sin(winkelRad);
    const dx = this.x - um.x;
    const dz = this.z - um.z;
    return new Vec3(um.x + dx * c - dz * s, this.y, um.z + dx * s + dz * c);
  }

```

- [ ] **Step 5: Baugruppen**

`src/model/Baugruppe.ts` ganz ersetzen:

```ts
import { Fuss } from './Fuss';
import type { LagerObjekt } from './LagerObjekt';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

export type BaugruppenTyp = 'dreibein' | 'abock';

/** Parametrische Baugruppe, die ihre Stangen selbst erzeugt. */
export abstract class Baugruppe implements LagerObjekt {
  abstract readonly typ: BaugruppenTyp;

  constructor(
    readonly id: string,
    readonly position: Vec3,
    readonly drehung: number,
  ) {
    if (!Number.isFinite(drehung)) throw new RangeError('Drehung muss eine endliche Zahl sein');
  }

  /** Im Objekt-Modell ist die Art der Baugruppen-Typ. */
  get art(): BaugruppenTyp {
    return this.typ;
  }

  protected static pruefePositiv(wert: number, name: string): void {
    if (!(Number.isFinite(wert) && wert > 0)) throw new RangeError(`${name} muss größer als 0 sein`);
  }

  /** Eigene id und die ids der Stangen; ein Klick auf eine Stange wählt die ganze Gruppe. */
  ids(): readonly string[] {
    return [this.id, ...this.stangen().map((s) => s.id)];
  }

  verschobenUm(dv: Vec3): Baugruppe {
    return this.verschoben(this.position.add(dv));
  }

  /** Die Füße der Stangen; so zählte der Platzbedarf sie schon bisher. */
  platzPunkte(): readonly Vec3[] {
    return this.stangen()
      .flatMap((s) => Fuss.von(s))
      .map((f) => f.position);
  }

  abstract stangen(): readonly Stange[];
  abstract spitze(): Vec3;
  abstract hoehe(): number;
  abstract beinwinkelGrad(): number;
  /** Ohne `um` um die eigene Position (wie bisher), sonst um die senkrechte Achse durch `um`. */
  abstract gedreht(delta: number, um?: Vec3): Baugruppe;
  /** Auf eine absolute Position. */
  abstract verschoben(position: Vec3): Baugruppe;
}
```

In `src/model/Dreibein.ts` die Methode

```ts
  gedreht(delta: number): Dreibein {
    return new Dreibein(this.id, this.position, this.drehung + delta, this.params);
  }
```

ersetzen durch

```ts
  gedreht(delta: number, um?: Vec3): Dreibein {
    const position = um === undefined ? this.position : this.position.gedrehtUmY(delta, um);
    return new Dreibein(this.id, position, this.drehung + delta, this.params);
  }
```

In `src/model/ABock.ts` die Methode

```ts
  gedreht(delta: number): ABock {
    return new ABock(this.id, this.position, this.drehung + delta, this.params);
  }
```

ersetzen durch

```ts
  gedreht(delta: number, um?: Vec3): ABock {
    const position = um === undefined ? this.position : this.position.gedrehtUmY(delta, um);
    return new ABock(this.id, position, this.drehung + delta, this.params);
  }
```

- [ ] **Step 6: Stange, Seil, Baum, Plane**

`src/model/Stange.ts` ganz ersetzen:

```ts
import { Fuss } from './Fuss';
import { clamp } from './geometrie';
import { MIN_STANGENLAENGE, STANGEN_UEBERSTAND } from './konstanten';
import type { LagerObjekt } from './LagerObjekt';
import type { Vec3 } from './Vec3';

export type StangenRolle = 'bein' | 'riegel' | 'frei';

/** Eine Rundholzstange als Strecke start–ende mit Durchmesser. */
export class Stange implements LagerObjekt {
  readonly art = 'stange' as const;

  constructor(
    readonly id: string,
    readonly start: Vec3,
    readonly ende: Vec3,
    readonly durchmesser: number,
    readonly rolle: StangenRolle = 'frei',
    readonly gruppeId: string | null = null,
  ) {
    const abstand = start.distanceTo(ende);
    if (!Number.isFinite(abstand) || !(abstand >= MIN_STANGENLAENGE)) {
      throw new RangeError(`Eine Stange muss mindestens ${MIN_STANGENLAENGE} m lang sein`);
    }
    if (!(durchmesser > 0)) throw new RangeError('Durchmesser muss größer als 0 sein');
  }

  /** Stange durch a und b, an den Enden um den jeweiligen Überstand verlängert. */
  static zwischen(
    id: string,
    a: Vec3,
    b: Vec3,
    durchmesser: number,
    ueberstandStart = STANGEN_UEBERSTAND,
    ueberstandEnde = STANGEN_UEBERSTAND,
  ): Stange {
    const abstand = a.distanceTo(b);
    if (!Number.isFinite(abstand) || !(abstand >= MIN_STANGENLAENGE)) {
      throw new RangeError(`Die Punkte liegen näher als ${MIN_STANGENLAENGE} m beieinander`);
    }
    const r = b.sub(a).normalize();
    return new Stange(id, a.sub(r.scale(ueberstandStart)), b.add(r.scale(ueberstandEnde)), durchmesser);
  }

  get laenge(): number {
    return this.start.distanceTo(this.ende);
  }

  get richtung(): Vec3 {
    return this.ende.sub(this.start).normalize();
  }

  endpunkte(): readonly [Vec3, Vec3] {
    return [this.start, this.ende];
  }

  naechsterPunkt(p: Vec3): Vec3 {
    const d = this.ende.sub(this.start);
    const t = clamp(p.sub(this.start).dot(d) / d.dot(d), 0, 1);
    return this.start.add(d.scale(t));
  }

  mitDurchmesser(durchmesser: number): Stange {
    return new Stange(this.id, this.start, this.ende, durchmesser, this.rolle, this.gruppeId);
  }

  ids(): readonly string[] {
    return [this.id];
  }

  /** Rolle und Gruppe bleiben, damit auch eine Stange einer Baugruppe sie behält. */
  verschobenUm(dv: Vec3): Stange {
    return new Stange(this.id, this.start.add(dv), this.ende.add(dv), this.durchmesser, this.rolle, this.gruppeId);
  }

  /** Ohne `um` um die Mitte der Stange. */
  gedreht(winkelRad: number, um: Vec3 = this.mitte()): Stange {
    return new Stange(
      this.id,
      this.start.gedrehtUmY(winkelRad, um),
      this.ende.gedrehtUmY(winkelRad, um),
      this.durchmesser,
      this.rolle,
      this.gruppeId,
    );
  }

  /** Die Enden am Boden (Füße); so zählte der Platzbedarf sie schon bisher. */
  platzPunkte(): readonly Vec3[] {
    return Fuss.von(this).map((f) => f.position);
  }

  private mitte(): Vec3 {
    return this.start.add(this.ende).scale(0.5);
  }
}
```

`src/model/Seil.ts` ganz ersetzen:

```ts
import { MIN_SEILLAENGE } from './konstanten';
import type { LagerObjekt } from './LagerObjekt';
import type { Vec3 } from './Vec3';

/** Ein gespanntes Seil als gerade Strecke start–ende. Kein Durchhang, keine Kräfte (Spec v2a, D1). */
export class Seil implements LagerObjekt {
  readonly art = 'seil' as const;

  constructor(
    readonly id: string,
    readonly start: Vec3,
    readonly ende: Vec3,
  ) {
    const laenge = start.distanceTo(ende);
    if (!Number.isFinite(laenge) || !(laenge >= MIN_SEILLAENGE)) {
      throw new RangeError(`Ein Seil muss mindestens ${MIN_SEILLAENGE} m lang sein`);
    }
  }

  get laenge(): number {
    return this.start.distanceTo(this.ende);
  }

  /** Winkel der Seillinie zur Waagrechten in Grad, 0–90. */
  get winkelZumBodenGrad(): number {
    const hoehenunterschied = Math.abs(this.ende.y - this.start.y);
    return (Math.asin(Math.min(1, hoehenunterschied / this.laenge)) * 180) / Math.PI;
  }

  /** Tiefster Punkt der geraden Seillinie: das tiefere Ende. */
  get tiefsteHoehe(): number {
    return Math.min(this.start.y, this.ende.y);
  }

  endpunkte(): readonly [Vec3, Vec3] {
    return [this.start, this.ende];
  }

  ids(): readonly string[] {
    return [this.id];
  }

  verschobenUm(dv: Vec3): Seil {
    return new Seil(this.id, this.start.add(dv), this.ende.add(dv));
  }

  /** Ohne `um` um die Mitte des Seils. */
  gedreht(winkelRad: number, um: Vec3 = this.start.add(this.ende).scale(0.5)): Seil {
    return new Seil(this.id, this.start.gedrehtUmY(winkelRad, um), this.ende.gedrehtUmY(winkelRad, um));
  }

  /** Ein Seil braucht selbst keinen Platz; seine Heringe zählt `Platzbedarf` über `Bauwerk.heringe()`. */
  platzPunkte(): readonly Vec3[] {
    return [];
  }
}
```

`src/model/Baum.ts` ganz ersetzen:

```ts
import type { LagerObjekt } from './LagerObjekt';
import type { BaumParams } from './params';
import { Vec3 } from './Vec3';

/** Ein Baum auf dem Lagerplatz: senkrechter Stamm ab dem Boden. Teil des Platzes, nicht des Baus. */
export class Baum implements LagerObjekt {
  readonly art = 'baum' as const;
  readonly position: Vec3;

  constructor(
    readonly id: string,
    position: Vec3,
    readonly params: BaumParams,
  ) {
    if (!(Number.isFinite(params.durchmesser) && params.durchmesser > 0)) throw new RangeError('Stammdurchmesser muss größer als 0 sein');
    if (!(Number.isFinite(params.hoehe) && params.hoehe > 0)) throw new RangeError('Baumhöhe muss größer als 0 sein');
    if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) throw new RangeError('Die Position muss endlich sein');
    this.position = new Vec3(position.x, 0, position.z);
  }

  mitParams(params: BaumParams): Baum {
    return new Baum(this.id, this.position, params);
  }

  /** Abstand eines Punkts zur Stammoberfläche. Unter dem Boden oder über der Baumhöhe: unendlich. */
  abstandZumStamm(p: Vec3): number {
    if (p.y < 0 || p.y > this.params.hoehe) return Infinity;
    const waagrecht = Math.hypot(p.x - this.position.x, p.z - this.position.z);
    return Math.abs(waagrecht - this.params.durchmesser / 2);
  }

  ids(): readonly string[] {
    return [this.id];
  }

  /** Der Baum bleibt am Boden: Der Konstruktor setzt y wieder auf 0. */
  verschobenUm(dv: Vec3): Baum {
    return new Baum(this.id, this.position.add(dv), this.params);
  }

  /** Ohne `um` um die eigene Position, also ohne sichtbare Änderung. */
  gedreht(winkelRad: number, um: Vec3 = this.position): Baum {
    return new Baum(this.id, this.position.gedrehtUmY(winkelRad, um), this.params);
  }

  /** Bäume stehen auf dem Platz und zählen nicht zum Platzbedarf (Spec v2a). */
  platzPunkte(): readonly Vec3[] {
    return [];
  }
}
```

In `src/model/Plane.ts`:
1. Nach `import { FUSS_TOLERANZ, MIN_SEILLAENGE } from './konstanten';` einfügen: `import type { LagerObjekt } from './LagerObjekt';`
2. `export class Plane {` ersetzen durch `export class Plane implements LagerObjekt {` und als erste Zeile im Klassenrumpf (vor `/** Eine Fläche bei …`) einfügen: `  readonly art = 'plane' as const;`
3. Nach der Methode `mitParams(…)` einfügen:

```ts

  ids(): readonly string[] {
    return [this.id];
  }

  /** Prüft die neue Lage wie der Konstruktor: Reicht sie in den Boden, fliegt ein RangeError. */
  verschobenUm(dv: Vec3): Plane {
    return new Plane(this.id, this.start.add(dv), this.ende.add(dv), this.params);
  }

  /** Ohne `um` um die Mitte der Aufhängelinie. */
  gedreht(winkelRad: number, um: Vec3 = mitteVon(this.start, this.ende)): Plane {
    return new Plane(this.id, this.start.gedrehtUmY(winkelRad, um), this.ende.gedrehtUmY(winkelRad, um), this.params);
  }

  /** Die Ösen; so zählte der Platzbedarf sie schon bisher (Spec v2b, D4). */
  platzPunkte(): readonly Vec3[] {
    return this.oesen;
  }
```

- [ ] **Step 7: Tests laufen lassen**

Run: `npx vitest run src/model/LagerObjekt.test.ts src/model/Vec3.test.ts`
Expected: PASS (20 Tests in `LagerObjekt.test.ts`, 6 in `Vec3.test.ts`).
Run: `npx vitest run`
Expected: 39 Dateien, 313 Tests, alle grün.
Run: `npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/model/LagerObjekt.ts src/model/LagerObjekt.test.ts src/model/Vec3.ts src/model/Vec3.test.ts src/model/Baugruppe.ts src/model/Dreibein.ts src/model/ABock.ts src/model/Stange.ts src/model/Seil.ts src/model/Baum.ts src/model/Plane.ts
git commit -m "feat: add the LagerObjekt interface to all six model classes"
```

---

### Task 2: `Bauwerk` als eine geordnete Liste

**Files:**
- Modify: `src/model/Bauwerk.ts` (ganze Datei ersetzen)
- Test: `src/model/Bauwerk.test.ts`

**Interfaces:**
- Consumes: `LagerObjekt` und `ids()` aus Task 1; `Baugruppe`, `Stange`, `Seil`, `Baum`, `Plane` als Klassen (für `instanceof`).
- Produces (alles auf `Bauwerk`):
  - `readonly objekte: readonly LagerObjekt[]`;
  - `static von(liste: readonly LagerObjekt[]): Bauwerk` (wirft `Error('ID <id> ist schon vergeben')`);
  - `mit(o: LagerObjekt): Bauwerk`, `ersetze(o: LagerObjekt): Bauwerk` (wirft `Error('Objekt <id> gibt es nicht')`; gibt `this` zurück, wenn `o` schon drinsteht), `ohne(id: string): Bauwerk` (gibt `this` zurück, wenn es die id nicht gibt);
  - `objekt(id: string): LagerObjekt | undefined` (nur Objekte, keine Teil-ids), `besitzer(teilId: string): LagerObjekt | undefined`;
  - unverändert in Bedeutung und Signatur: `leer()`, `istLeer`, `gruppen`, `freieStangen`, `seile`, `baeume`, `planen`, `stangen()`, `gruppe()`, `stange()`, `seil()`, `baum()`, `plane()`, `enthaelt()`, `auswahlIdFuer()`, `mitGruppe`, `ersetzeGruppe`, `mitStange`, `ersetzeStange`, `mitSeil`, `mitBaum`, `ersetzeBaum`, `mitPlane`, `ersetzePlane`, `buende()`, `fuesse()`, `heringe()`, `verankerung()`.

- [ ] **Step 1: Failing tests schreiben**

Am Ende von `src/model/Bauwerk.test.ts` anhängen (die Konstanten `dreibein`, `abock` und `frei` stehen oben in der Datei):

```ts

describe('Bauwerk als eine geordnete Liste (Spec v3, D1)', () => {
  const seil = new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
  const baum = new Baum('b', new Vec3(9, 0, 0), STANDARD_BAUM);

  it('baut mit von in einem Schritt und behält die Reihenfolge', () => {
    const liste = [frei, seil, dreibein, baum];
    const b = Bauwerk.von(liste);
    expect(b.objekte.map((o) => o.id)).toEqual(['s', 'l', 'd', 'b']);
    b.objekte.forEach((o, i) => expect(o).toBe(liste[i]));
    expect(Bauwerk.von([]).istLeer).toBe(true);
  });

  it('lehnt in von doppelte ids ab, auch die einer Gruppenstange', () => {
    expect(() => Bauwerk.von([dreibein, dreibein])).toThrow('ID d ist schon vergeben');
    expect(() => Bauwerk.von([dreibein, new Stange('d-bein-1', Vec3.NULL, new Vec3(0, 1, 0), 0.08)])).toThrow('ID d-bein-1 ist schon vergeben');
  });

  it('hängt mit mit an und findet Objekte und Besitzer', () => {
    const b = Bauwerk.leer().mit(dreibein).mit(seil);
    expect(b.objekt('d')).toBe(dreibein);
    expect(b.objekt('d-bein-1')).toBeUndefined();
    expect(b.besitzer('d-bein-1')).toBe(dreibein);
    expect(b.besitzer('l')).toBe(seil);
    expect(b.besitzer('weg')).toBeUndefined();
    expect(() => b.mit(new Seil('d-bein-0', Vec3.NULL, new Vec3(1, 0, 0)))).toThrow('ID d-bein-0 ist schon vergeben');
  });

  it('lässt beim Ersetzen und Entfernen alle anderen Objekte unverändert (Identität)', () => {
    const b = Bauwerk.von([dreibein, abock, frei, seil, baum]);
    const gedreht = dreibein.gedreht(0.1);
    const neu = b.ersetze(gedreht);
    expect(neu.objekte[0]).toBe(gedreht);
    neu.objekte.slice(1).forEach((o, i) => expect(o).toBe(b.objekte[i + 1]));
    const ohne = b.ohne('a');
    expect(ohne.objekte.map((o) => o.id)).toEqual(['d', 's', 'l', 'b']);
    ohne.objekte.forEach((o) => expect(o).toBe(b.objekt(o.id)));
    expect(b.objekte).toHaveLength(5);
  });

  it('gibt bei unveränderten Objekten dasselbe Bauwerk zurück', () => {
    const b = Bauwerk.von([dreibein, seil]);
    expect(b.ersetze(dreibein)).toBe(b);
    expect(b.ohne('weg')).toBe(b);
  });

  it('lehnt beim Ersetzen unbekannte Objekte und fremde ids ab', () => {
    const b = Bauwerk.von([dreibein, new Stange('d-riegel', new Vec3(5, 0, 0), new Vec3(5, 1, 0), 0.08)]);
    expect(() => b.ersetze(seil)).toThrow('Objekt l gibt es nicht');
    // Ein A-Bock mit der id des Dreibeins brächte eine Stange „d-riegel“ mit; die steht schon frei herum.
    expect(() => b.ersetze(new ABock('d', Vec3.NULL, 0, STANDARD_ABOCK))).toThrow('ID d-riegel ist schon vergeben');
  });

  it('leitet die Stangen wie bisher ab: erst alle Gruppen, dann die freien Stangen', () => {
    const b = Bauwerk.leer().mitStange(frei).mitGruppe(dreibein);
    expect(b.objekte.map((o) => o.id)).toEqual(['s', 'd']);
    expect(b.stangen().map((s) => s.id)).toEqual(['d-bein-0', 'd-bein-1', 'd-bein-2', 's']);
    expect(b.gruppen[0]).toBe(dreibein);
    expect(b.freieStangen[0]).toBe(frei);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/model/Bauwerk.test.ts`
Expected: FAIL. `Bauwerk.von`, `mit`, `objekt`, `besitzer` und `ersetze` gibt es nicht, `objekte` ist undefined. Die 13 alten Tests bleiben grün.

- [ ] **Step 3: Bauwerk umbauen**

`src/model/Bauwerk.ts` ganz ersetzen:

```ts
import { Baugruppe } from './Baugruppe';
import { Baum } from './Baum';
import { type Bund, BundFinder } from './Bund';
import { Fuss } from './Fuss';
import type { LagerObjekt } from './LagerObjekt';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Stange } from './Stange';
import type { Vec3 } from './Vec3';
import { type Hering, type Verankerung, VerankerungsFinder } from './Verankerung';

/**
 * Unveränderliches Aggregat: eine geordnete Liste aller Objekte (Spec v3, D1). Bünde, Füße und Heringe werden abgeleitet.
 * Die typisierten Listen und Methoden sind dünne Hüllen um `objekte`, damit Regeln und Tests unverändert bleiben.
 */
export class Bauwerk {
  readonly gruppen: readonly Baugruppe[];
  readonly freieStangen: readonly Stange[];
  readonly seile: readonly Seil[];
  readonly baeume: readonly Baum[];
  readonly planen: readonly Plane[];
  /** Jede id, auch die einer Gruppenstange, → ihr Objekt. Einmal pro Instanz berechnet; sicher, weil das Bauwerk unveränderlich ist. */
  private besitzerIndex: ReadonlyMap<string, LagerObjekt> | undefined;
  private stangenListe: readonly Stange[] | undefined;

  private constructor(readonly objekte: readonly LagerObjekt[]) {
    this.gruppen = objekte.filter((o): o is Baugruppe => o instanceof Baugruppe);
    this.freieStangen = objekte.filter((o): o is Stange => o instanceof Stange);
    this.seile = objekte.filter((o): o is Seil => o instanceof Seil);
    this.baeume = objekte.filter((o): o is Baum => o instanceof Baum);
    this.planen = objekte.filter((o): o is Plane => o instanceof Plane);
  }

  static leer(): Bauwerk {
    return new Bauwerk([]);
  }

  /** Baut ein Bauwerk in einem Schritt, z. B. beim Laden. Wirft bei doppelten ids. */
  static von(liste: readonly LagerObjekt[]): Bauwerk {
    const bauwerk = new Bauwerk([...liste]);
    bauwerk.index();
    return bauwerk;
  }

  get istLeer(): boolean {
    return this.objekte.length === 0;
  }

  /** Erst die Stangen aller Gruppen, dann die freien Stangen, wie vor E0. Von dieser Reihenfolge hängen die ids der Bünde ab. */
  stangen(): readonly Stange[] {
    this.stangenListe ??= [...this.gruppen.flatMap((g) => g.stangen()), ...this.freieStangen];
    return this.stangenListe;
  }

  /** Das Objekt mit genau dieser id. Die Stange einer Baugruppe ist kein eigenes Objekt. */
  objekt(id: string): LagerObjekt | undefined {
    const o = this.besitzer(id);
    return o?.id === id ? o : undefined;
  }

  /** Das Objekt, zu dem eine id gehört; bei der Stange einer Baugruppe die Baugruppe. */
  besitzer(teilId: string): LagerObjekt | undefined {
    return this.index().get(teilId);
  }

  gruppe(id: string): Baugruppe | undefined {
    const o = this.objekt(id);
    return o instanceof Baugruppe ? o : undefined;
  }

  stange(id: string): Stange | undefined {
    return this.stangen().find((s) => s.id === id);
  }

  seil(id: string): Seil | undefined {
    const o = this.objekt(id);
    return o instanceof Seil ? o : undefined;
  }

  baum(id: string): Baum | undefined {
    const o = this.objekt(id);
    return o instanceof Baum ? o : undefined;
  }

  plane(id: string): Plane | undefined {
    const o = this.objekt(id);
    return o instanceof Plane ? o : undefined;
  }

  enthaelt(id: string): boolean {
    return this.index().has(id);
  }

  /** Klickt man eine Gruppenstange an, wird die ganze Gruppe ausgewählt. */
  auswahlIdFuer(teilId: string): string {
    return this.besitzer(teilId)?.id ?? teilId;
  }

  mit(o: LagerObjekt): Bauwerk {
    this.pruefeFrei(o.ids());
    return new Bauwerk([...this.objekte, o]);
  }

  /** Ersetzt das Objekt mit derselben id. Alle anderen Objekte bleiben dieselben (`===`). */
  ersetze(o: LagerObjekt): Bauwerk {
    const alt = this.objekt(o.id);
    if (!alt) throw new Error(`Objekt ${o.id} gibt es nicht`);
    if (alt === o) return this;
    this.pruefeFrei(o.ids(), alt);
    return new Bauwerk(this.objekte.map((x) => (x === alt ? o : x)));
  }

  /** Entfernt das Objekt mit dieser id. Teil-ids (Stangen einer Gruppe) entfernen nichts. */
  ohne(id: string): Bauwerk {
    const rest = this.objekte.filter((o) => o.id !== id);
    return rest.length === this.objekte.length ? this : new Bauwerk(rest);
  }

  mitGruppe(gruppe: Baugruppe): Bauwerk {
    return this.mit(gruppe);
  }

  ersetzeGruppe(gruppe: Baugruppe): Bauwerk {
    if (!this.gruppe(gruppe.id)) throw new Error(`Baugruppe ${gruppe.id} gibt es nicht`);
    return this.ersetze(gruppe);
  }

  mitStange(stange: Stange): Bauwerk {
    if (stange.gruppeId !== null) throw new Error('Nur freie Stangen können direkt hinzugefügt werden');
    return this.mit(stange);
  }

  ersetzeStange(stange: Stange): Bauwerk {
    if (!this.freieStangen.some((s) => s.id === stange.id)) throw new Error(`Freie Stange ${stange.id} gibt es nicht`);
    return this.ersetze(stange);
  }

  mitSeil(seil: Seil): Bauwerk {
    return this.mit(seil);
  }

  mitBaum(baum: Baum): Bauwerk {
    return this.mit(baum);
  }

  ersetzeBaum(baum: Baum): Bauwerk {
    if (!this.baum(baum.id)) throw new Error(`Baum ${baum.id} gibt es nicht`);
    return this.ersetze(baum);
  }

  mitPlane(plane: Plane): Bauwerk {
    return this.mit(plane);
  }

  ersetzePlane(plane: Plane): Bauwerk {
    if (!this.plane(plane.id)) throw new Error(`Plane ${plane.id} gibt es nicht`);
    return this.ersetze(plane);
  }

  buende(): readonly Bund[] {
    return new BundFinder().finde(this.stangen());
  }

  fuesse(): readonly Fuss[] {
    return this.stangen().flatMap((s) => Fuss.von(s));
  }

  heringe(): readonly Hering[] {
    return new VerankerungsFinder().heringe(this.seile);
  }

  /** Woran ein Punkt hängt (Hering, Plane, Baum, Stange oder frei), z. B. ein Seilende. */
  verankerung(punkt: Vec3): Verankerung {
    return new VerankerungsFinder().finde(punkt, this.stangen(), this.baeume, this.planen);
  }

  private index(): ReadonlyMap<string, LagerObjekt> {
    if (this.besitzerIndex === undefined) {
      const index = new Map<string, LagerObjekt>();
      for (const o of this.objekte) {
        for (const id of o.ids()) {
          if (index.has(id)) throw new Error(`ID ${id} ist schon vergeben`);
          index.set(id, o);
        }
      }
      this.besitzerIndex = index;
    }
    return this.besitzerIndex;
  }

  /** Wirft, wenn eine der ids schon einem anderen Objekt als `ausser` gehört. */
  private pruefeFrei(ids: readonly string[], ausser?: LagerObjekt): void {
    for (const id of ids) {
      const besitzer = this.besitzer(id);
      if (besitzer !== undefined && besitzer !== ausser) throw new Error(`ID ${id} ist schon vergeben`);
    }
  }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/model/Bauwerk.test.ts`
Expected: PASS (20 Tests: 13 alte, 7 neue).
Run: `npx vitest run`
Expected: 39 Dateien, 320 Tests, alle grün. Regeln, Materialliste, Serializer und Editor laufen unverändert über die Hüllen.
Run: `npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/model/Bauwerk.ts src/model/Bauwerk.test.ts
git commit -m "refactor: keep all objects of a Bauwerk in one ordered list"
```

---

### Task 3: `Platzbedarf` über `platzPunkte()`

**Files:**
- Modify: `src/model/Platzbedarf.ts`
- Test: `src/model/Platzbedarf.test.ts`

**Interfaces:**
- Consumes: `Bauwerk.objekte`, `Bauwerk.von` (Task 2), `LagerObjekt.platzPunkte()` (Task 1), `Bauwerk.heringe()`.
- Produces: `Platzbedarf.aus(bauwerk)` mit derselben Signatur. Es rechnet über die Platzpunkte aller Objekte plus die Heringe; jede künftige Art bringt ihre Punkte selbst mit.

- [ ] **Step 1: Failing test und Charakterisierungstest schreiben**

In `src/model/Platzbedarf.test.ts` die Importe ergänzen:

```ts
import type { LagerObjekt } from './LagerObjekt';
import { Stange } from './Stange';
```

und innerhalb von `describe('Platzbedarf', …)` nach dem letzten `it(…)` einfügen:

```ts

  it('fragt jedes Objekt nach seinen Platzpunkten (Spec v3, D1)', () => {
    const pflock: LagerObjekt = {
      id: 'pflock',
      art: 'baum',
      ids: () => ['pflock'],
      verschobenUm() {
        return this;
      },
      gedreht() {
        return this;
      },
      platzPunkte: () => [new Vec3(10, 0, -4)],
    };
    const p = Platzbedarf.aus(Bauwerk.von([pflock]));
    expect([p?.minX, p?.maxX, p?.minZ, p?.maxZ]).toEqual([10, 10, -4, -4]);
  });

  it('ergibt für ein gemischtes Bauwerk dasselbe Rechteck wie die Rechnung bis v2b', () => {
    const regendach = new Plane('dach', new Vec3(0, 2, 0), new Vec3(3, 2, 0), STANDARD_PLANE);
    const frei = new Stange('frei', new Vec3(-2, 0, 1), new Vec3(-2, 2, 1), 0.08);
    const b = Bauwerk.von([
      frei,
      regendach,
      ...kochstelle().objekte,
      new Seil('l', new Vec3(0, 2, 0), new Vec3(1, 0, 3)),
      new Baum('baum', new Vec3(30, 0, 30), STANDARD_BAUM),
    ]);
    // So hat Platzbedarf.aus bis v2b gerechnet: Füße, Heringe, Planen-Ösen.
    const alt = [...b.fuesse().map((f) => f.position), ...b.heringe().map((h) => h.position), ...b.planen.flatMap((pl) => pl.oesen)];
    const p = Platzbedarf.aus(b);
    expect([p?.minX, p?.maxX, p?.minZ, p?.maxZ]).toEqual([
      Math.min(...alt.map((q) => q.x)),
      Math.max(...alt.map((q) => q.x)),
      Math.min(...alt.map((q) => q.z)),
      Math.max(...alt.map((q) => q.z)),
    ]);
  });
```

- [ ] **Step 2: Tests laufen lassen**

Run: `npx vitest run src/model/Platzbedarf.test.ts`
Expected: FAIL nur bei „fragt jedes Objekt nach seinen Platzpunkten“ (das Rechteck ist `null`, weil die alte Rechnung nur Füße, Heringe und Planen-Ösen kennt). Der Charakterisierungstest „ergibt … dasselbe Rechteck“ ist schon grün; er sichert, dass die Umstellung nichts ändert.

- [ ] **Step 3: Platzbedarf umstellen**

In `src/model/Platzbedarf.ts` den Kommentar über der Klasse und die ersten Zeilen von `aus` ersetzen. Alt:

```ts
/** Achsparalleles Rechteck am Boden über alle Füße, Heringe und Planen-Ösen (Spec v2a/v2b, D4). Bäume zählen nicht. */
```

```ts
    const punkte = [
      ...bauwerk.fuesse().map((f) => f.position),
      ...bauwerk.heringe().map((h) => h.position),
      ...bauwerk.planen.flatMap((p) => p.oesen),
    ];
```

Neu:

```ts
/**
 * Achsparalleles Rechteck am Boden über die Platzpunkte aller Objekte (Füße, Planen-Ösen) und die Heringe (Spec v3, D1).
 * Bäume und Seile haben keine Platzpunkte; die Heringe der Seile werden zusammengefasst wie bisher.
 */
```

```ts
    const punkte = [...bauwerk.objekte.flatMap((o) => o.platzPunkte()), ...bauwerk.heringe().map((h) => h.position)];
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/model/Platzbedarf.test.ts src/model/Materialliste.test.ts`
Expected: PASS (8 Tests in `Platzbedarf.test.ts`; die Materialliste nutzt `Platzbedarf.aus` und bleibt grün).
Run: `npx vitest run`
Expected: 39 Dateien, 322 Tests, alle grün.

- [ ] **Step 5: Commit**

```bash
git add src/model/Platzbedarf.ts src/model/Platzbedarf.test.ts
git commit -m "refactor: compute Platzbedarf from the objects' platzPunkte"
```

---

### Task 4a: Art-Register und Codec je Art

**Files:**
- Create: `src/share/lesen.ts`
- Create: `src/arten/ObjektArt.ts`, `src/arten/ObjektRegister.ts`, `src/arten/standardArten.ts`, `src/arten/DreibeinArt.ts`, `src/arten/ABockArt.ts`, `src/arten/StangeArt.ts`, `src/arten/SeilArt.ts`, `src/arten/BaumArt.ts`, `src/arten/PlaneArt.ts`
- Modify: `src/share/BauwerkSerializer.ts` (nur die Lese-Hilfen ziehen um), `vite.config.ts` (Abdeckung)
- Test: `src/arten/arten.test.ts` (neu)

**Interfaces:**
- Consumes: `LagerObjekt`, `ArtName`, `ART_NAMEN` (Task 1); die sechs Modellklassen; `Vec3`.
- Produces:
  - `src/share/lesen.ts`: `type Roh = Record<string, unknown>`, `type V3 = readonly [number, number, number]`, `objekt(d, name): Roh`, `liste(d, name): unknown[]`, `zahl(d, name): number`, `text(d, name): string`, `vektor(d, name): Vec3`. Alle werfen `Error` mit dem Feldnamen, z. B. `'fusskreisradius ist keine Zahl'`.
  - `src/arten/ObjektArt.ts`: `interface ObjektJson { readonly art: ArtName; readonly id: string; readonly [feld: string]: unknown }`; `interface ObjektArt<T extends LagerObjekt = LagerObjekt> { readonly name: ArtName; readonly label: string; istVon(o: LagerObjekt): o is T; zuJson(o: T): ObjektJson; ausJson(roh: Roh): T }`. Task 4b erweitert die Schnittstelle.
  - `src/arten/ObjektRegister.ts`: `class ObjektRegister(readonly alle: readonly ObjektArt[])` mit `finde(name: string): ObjektArt | undefined`, `art(name: ArtName): ObjektArt`, `artVon(o: LagerObjekt): ObjektArt`. Wirft `'Art <name> ist doppelt registriert'`, `'Art <name> ist nicht registriert'` und `'<id> passt nicht zur Art <art>'`.
  - `src/arten/standardArten.ts`: `standardArten(): ObjektRegister`, Reihenfolge wie die Werkzeug-Knöpfe: dreibein, abock, stange, seil, plane, baum.
  - Je Art eine Klasse `DreibeinArt`, `ABockArt`, `StangeArt`, `SeilArt`, `BaumArt`, `PlaneArt` und ein JSON-Typ `DreibeinJson`, `ABockJson`, `StangeJson`, `SeilJson`, `BaumJson`, `PlaneJson`. Die Felder sind die aus v3, nur mit `art` vorneweg und ohne `typ`.

- [ ] **Step 1: Failing tests schreiben**

Neue Datei `src/arten/arten.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import { Dreibein } from '../model/Dreibein';
import { ART_NAMEN, type ArtName, type LagerObjekt } from '../model/LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Plane } from '../model/Plane';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { ObjektRegister } from './ObjektRegister';
import { SeilArt } from './SeilArt';
import { standardArten } from './standardArten';

const arten = standardArten();
const beispiele: readonly LagerObjekt[] = [
  new Dreibein('d', new Vec3(1, 0, 2), 0.5, STANDARD_DREIBEIN),
  new ABock('a', new Vec3(4, 0, 0), Math.PI / 2, STANDARD_ABOCK),
  new Stange('s', new Vec3(8, 0, 0), new Vec3(8, 2, 0), 0.08),
  new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0)),
  new Baum('b', new Vec3(5, 0, 5), STANDARD_BAUM),
  new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { ...STANDARD_PLANE, form: 'satteldach' }),
];
/** Die Felder je Art wie in v3, nur mit `art` vorneweg und bei Gruppen ohne `typ` (Spec v3, D3). */
const FELDER: Readonly<Record<ArtName, readonly string[]>> = {
  dreibein: ['art', 'id', 'position', 'drehung', 'params'],
  abock: ['art', 'id', 'position', 'drehung', 'params'],
  stange: ['art', 'id', 'start', 'ende', 'durchmesser'],
  seil: ['art', 'id', 'start', 'ende'],
  baum: ['art', 'id', 'position', 'durchmesser', 'hoehe'],
  plane: ['art', 'id', 'start', 'ende', 'breite', 'laenge', 'form', 'neigung', 'seite'],
};

describe('ObjektRegister (Spec v3, D2)', () => {
  it('kennt jede Art genau einmal', () => {
    const namen = arten.alle.map((a) => a.name);
    expect(namen).toHaveLength(ART_NAMEN.length);
    expect([...namen].sort()).toEqual([...ART_NAMEN].sort());
  });

  it('lehnt eine doppelt registrierte Art ab', () => {
    expect(() => new ObjektRegister([new SeilArt(), new SeilArt()])).toThrow('Art seil ist doppelt registriert');
  });

  it('findet zu jedem Objekt seine Art; jede Art erkennt nur ihre eigenen Objekte', () => {
    for (const o of beispiele) {
      expect(arten.artVon(o).name).toBe(o.art);
      expect(arten.alle.filter((a) => a.istVon(o)).map((a) => a.name)).toEqual([o.art]);
    }
  });

  it('meldet unbekannte Namen und Objekte, die nicht zu ihrer Art passen', () => {
    expect(arten.finde('vierbein')).toBeUndefined();
    expect(() => arten.art('vierbein' as unknown as ArtName)).toThrow('Art vierbein ist nicht registriert');
    const falsch = { ...new Seil('x', Vec3.NULL, new Vec3(1, 0, 0)), art: 'stange' } as unknown as LagerObjekt;
    expect(() => arten.artVon(falsch)).toThrow('x passt nicht zur Art stange');
  });
});

describe('Codec je Art (Datenformat v4)', () => {
  it.each<[ArtName, LagerObjekt]>(beispiele.map((o): [ArtName, LagerObjekt] => [o.art, o]))('%s übersteht die Rundreise über JSON-Text', (_name, o) => {
    const art = arten.artVon(o);
    const json = art.zuJson(o);
    expect(Object.keys(json)).toEqual(FELDER[o.art]);
    expect([json.art, json.id]).toEqual([o.art, o.id]);
    const zurueck = art.ausJson(JSON.parse(JSON.stringify(json)));
    expect(art.istVon(zurueck)).toBe(true);
    expect(art.zuJson(zurueck)).toEqual(json);
  });

  it.each<[string, ArtName, Record<string, unknown>, string]>([
    ['Dreibein ohne Fußkreisradius', 'dreibein', { id: 'd', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, durchmesser: 0.08 } }, 'fusskreisradius ist keine Zahl'],
    ['A-Bock ohne params', 'abock', { id: 'a', position: [0, 0, 0], drehung: 0 }, 'params ist kein Objekt'],
    ['Stange mit leerer id', 'stange', { id: '', start: [0, 0, 0], ende: [0, 2, 0], durchmesser: 0.08 }, 'id fehlt'],
    ['Seil mit kurzem Vektor', 'seil', { id: 'l', start: [0, 0], ende: [1, 0, 0] }, 'start braucht drei Koordinaten'],
    ['Baum ohne Höhe', 'baum', { id: 'b', position: [0, 0, 0], durchmesser: 0.3 }, 'hoehe ist keine Zahl'],
    ['Plane mit unbekannter Form', 'plane', { id: 'p', start: [0, 2, 0], ende: [4, 2, 0], breite: 3, laenge: 4, form: 'schief', neigung: 30, seite: 1 }, 'form unbekannt'],
    ['Plane mit Seite 0', 'plane', { id: 'p', start: [0, 2, 0], ende: [4, 2, 0], breite: 3, laenge: 4, form: 'eben', neigung: 30, seite: 0 }, 'seite muss 1 oder -1 sein'],
  ])('lehnt ab: %s', (_name, name, roh, meldung) => {
    expect(() => arten.art(name).ausJson(roh)).toThrow(meldung);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/arten/arten.test.ts`
Expected: FAIL, weil `./ObjektRegister`, `./SeilArt` und `./standardArten` fehlen.

- [ ] **Step 3: Lese-Hilfen nach `src/share/lesen.ts`**

Neue Datei `src/share/lesen.ts` (die Funktionen sind wörtlich die aus `BauwerkSerializer.ts`, jetzt exportiert):

```ts
import { Vec3 } from '../model/Vec3';

// Lese-Hilfen für Bauwerk-Daten (Spec v3, D3). Jede wirft einen Error mit dem Feldnamen;
// der Serializer stellt „Ungültige Bauwerk-Daten:“ davor.

/** Ein JSON-Objekt, dessen Felder erst noch geprüft werden. */
export type Roh = Record<string, unknown>;
/** Ein Punkt im JSON: [x, y, z] in Metern. */
export type V3 = readonly [number, number, number];

export function objekt(d: unknown, name: string): Roh {
  if (typeof d !== 'object' || d === null || Array.isArray(d)) throw new Error(`${name} ist kein Objekt`);
  return d as Roh;
}

export function liste(d: unknown, name: string): unknown[] {
  if (!Array.isArray(d)) throw new Error(`${name} ist keine Liste`);
  return d;
}

export function zahl(d: unknown, name: string): number {
  if (typeof d !== 'number' || !Number.isFinite(d)) throw new Error(`${name} ist keine Zahl`);
  return d;
}

export function text(d: unknown, name: string): string {
  if (typeof d !== 'string' || d.length === 0) throw new Error(`${name} fehlt`);
  return d;
}

export function vektor(d: unknown, name: string): Vec3 {
  const l = liste(d, name);
  if (l.length !== 3) throw new Error(`${name} braucht drei Koordinaten`);
  return new Vec3(zahl(l[0], name), zahl(l[1], name), zahl(l[2], name));
}
```

In `src/share/BauwerkSerializer.ts`:
1. Die Zeile `import { Vec3 } from '../model/Vec3';` löschen (Vec3 wurde nur in `vektor` gebraucht).
2. Nach `import { MAX_TEILE } from './grenzen';` einfügen: `import { liste, objekt, text, type V3, vektor, zahl } from './lesen';`
3. Die Zeile `type V3 = readonly [number, number, number];` löschen.
4. Den Block von `type Roh = Record<string, unknown>;` bis einschließlich der Funktion `vektor(…) { … }` löschen (die fünf Funktionen `objekt`, `liste`, `zahl`, `text`, `vektor`).

- [ ] **Step 4: Schnittstelle und Register**

Neue Datei `src/arten/ObjektArt.ts`:

```ts
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Roh } from '../share/lesen';

/** Ein Objekt im Datenformat v4: Art und id vorneweg, danach die Felder der Art wie in v3 (Spec v3, D3). */
export interface ObjektJson {
  readonly art: ArtName;
  readonly id: string;
  readonly [feld: string]: unknown;
}

/** Was der Editor über eine Objektart wissen muss, ohne three.js (Spec v3, D2). */
export interface ObjektArt<T extends LagerObjekt = LagerObjekt> {
  readonly name: ArtName;
  /** Anzeigename, z. B. als Überschrift im Panel. */
  readonly label: string;
  istVon(o: LagerObjekt): o is T;
  zuJson(o: T): ObjektJson;
  /** Wirft einen Error mit dem Feldnamen, wenn `roh` nicht passt. */
  ausJson(roh: Roh): T;
}
```

Neue Datei `src/arten/ObjektRegister.ts`:

```ts
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { ObjektArt } from './ObjektArt';

/** Alle Objektarten des Planers, je Name genau eine (Spec v3, D2). Gebaut von `standardArten()`, wie `standardRegeln()`. */
export class ObjektRegister {
  private readonly nachName: ReadonlyMap<string, ObjektArt>;

  constructor(readonly alle: readonly ObjektArt[]) {
    const nachName = new Map<string, ObjektArt>();
    for (const art of alle) {
      if (nachName.has(art.name)) throw new Error(`Art ${art.name} ist doppelt registriert`);
      nachName.set(art.name, art);
    }
    this.nachName = nachName;
  }

  /** Die Art zu einem Namen aus Daten; undefined, wenn es sie nicht gibt. */
  finde(name: string): ObjektArt | undefined {
    return this.nachName.get(name);
  }

  art(name: ArtName): ObjektArt {
    const art = this.finde(name);
    if (!art) throw new Error(`Art ${name} ist nicht registriert`);
    return art;
  }

  /** Die Art eines Objekts. Wirft, wenn das Objekt nicht zu der Art passt, die es nennt. */
  artVon(o: LagerObjekt): ObjektArt {
    const { id, art: name } = o;
    const art = this.art(name);
    if (!art.istVon(o)) throw new Error(`${id} passt nicht zur Art ${name}`);
    return art;
  }
}
```

(`id` und `name` werden vorher gelesen, weil TypeScript `o` nach dem negativen Typwächter `istVon` als `never` sieht.)

Neue Datei `src/arten/standardArten.ts`:

```ts
import { ABockArt } from './ABockArt';
import { BaumArt } from './BaumArt';
import { DreibeinArt } from './DreibeinArt';
import { ObjektRegister } from './ObjektRegister';
import { PlaneArt } from './PlaneArt';
import { SeilArt } from './SeilArt';
import { StangeArt } from './StangeArt';

/** Alle Arten in der Reihenfolge der Werkzeug-Knöpfe. Eine neue Art braucht hier eine Zeile (Spec v3, D2). */
export function standardArten(): ObjektRegister {
  return new ObjektRegister([new DreibeinArt(), new ABockArt(), new StangeArt(), new SeilArt(), new PlaneArt(), new BaumArt()]);
}
```

- [ ] **Step 5: Die sechs Arten (Codec)**

Neue Datei `src/arten/DreibeinArt.ts`:

```ts
import { Dreibein } from '../model/Dreibein';
import type { LagerObjekt } from '../model/LagerObjekt';
import type { DreibeinParams } from '../model/params';
import { objekt, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface DreibeinJson extends ObjektJson {
  readonly art: 'dreibein';
  readonly position: V3;
  readonly drehung: number;
  readonly params: DreibeinParams;
}

/** Dreibein (Spec v1). Gespeichert werden die Parameter, nicht die Stangen, damit Links kurz bleiben. */
export class DreibeinArt implements ObjektArt<Dreibein> {
  readonly name = 'dreibein' as const;
  readonly label = 'Dreibein';

  istVon(o: LagerObjekt): o is Dreibein {
    return o instanceof Dreibein;
  }

  zuJson(d: Dreibein): DreibeinJson {
    return { art: 'dreibein', id: d.id, position: d.position.toArray(), drehung: d.drehung, params: d.params };
  }

  ausJson(roh: Roh): Dreibein {
    const id = text(roh.id, 'id');
    const position = vektor(roh.position, 'position');
    const drehung = zahl(roh.drehung, 'drehung');
    const p = objekt(roh.params, 'params');
    return new Dreibein(id, position, drehung, {
      stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
      fusskreisradius: zahl(p.fusskreisradius, 'fusskreisradius'),
      durchmesser: zahl(p.durchmesser, 'durchmesser'),
    });
  }
}
```

Neue Datei `src/arten/ABockArt.ts`:

```ts
import { ABock } from '../model/ABock';
import type { LagerObjekt } from '../model/LagerObjekt';
import type { ABockParams } from '../model/params';
import { objekt, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface ABockJson extends ObjektJson {
  readonly art: 'abock';
  readonly position: V3;
  readonly drehung: number;
  readonly params: ABockParams;
}

/** A-Bock (Spec v1). Gespeichert werden die Parameter, nicht die Stangen. */
export class ABockArt implements ObjektArt<ABock> {
  readonly name = 'abock' as const;
  readonly label = 'A-Bock';

  istVon(o: LagerObjekt): o is ABock {
    return o instanceof ABock;
  }

  zuJson(a: ABock): ABockJson {
    return { art: 'abock', id: a.id, position: a.position.toArray(), drehung: a.drehung, params: a.params };
  }

  ausJson(roh: Roh): ABock {
    const id = text(roh.id, 'id');
    const position = vektor(roh.position, 'position');
    const drehung = zahl(roh.drehung, 'drehung');
    const p = objekt(roh.params, 'params');
    return new ABock(id, position, drehung, {
      stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
      fussabstand: zahl(p.fussabstand, 'fussabstand'),
      riegelhoehe: zahl(p.riegelhoehe, 'riegelhoehe'),
      durchmesser: zahl(p.durchmesser, 'durchmesser'),
    });
  }
}
```

Neue Datei `src/arten/StangeArt.ts`:

```ts
import type { LagerObjekt } from '../model/LagerObjekt';
import { Stange } from '../model/Stange';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface StangeJson extends ObjektJson {
  readonly art: 'stange';
  readonly start: V3;
  readonly ende: V3;
  readonly durchmesser: number;
}

/** Freie Stange (Spec v1). */
export class StangeArt implements ObjektArt<Stange> {
  readonly name = 'stange' as const;
  readonly label = 'Stange';

  istVon(o: LagerObjekt): o is Stange {
    return o instanceof Stange;
  }

  zuJson(s: Stange): StangeJson {
    return { art: 'stange', id: s.id, start: s.start.toArray(), ende: s.ende.toArray(), durchmesser: s.durchmesser };
  }

  ausJson(roh: Roh): Stange {
    return new Stange(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'), zahl(roh.durchmesser, 'durchmesser'));
  }
}
```

Neue Datei `src/arten/SeilArt.ts`:

```ts
import type { LagerObjekt } from '../model/LagerObjekt';
import { Seil } from '../model/Seil';
import { type Roh, text, type V3, vektor } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface SeilJson extends ObjektJson {
  readonly art: 'seil';
  readonly start: V3;
  readonly ende: V3;
}

/** Seil (Spec v2a). */
export class SeilArt implements ObjektArt<Seil> {
  readonly name = 'seil' as const;
  readonly label = 'Seil';

  istVon(o: LagerObjekt): o is Seil {
    return o instanceof Seil;
  }

  zuJson(s: Seil): SeilJson {
    return { art: 'seil', id: s.id, start: s.start.toArray(), ende: s.ende.toArray() };
  }

  ausJson(roh: Roh): Seil {
    return new Seil(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'));
  }
}
```

Neue Datei `src/arten/BaumArt.ts`:

```ts
import { Baum } from '../model/Baum';
import type { LagerObjekt } from '../model/LagerObjekt';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface BaumJson extends ObjektJson {
  readonly art: 'baum';
  readonly position: V3;
  readonly durchmesser: number;
  readonly hoehe: number;
}

/** Baum auf dem Platz (Spec v2a). */
export class BaumArt implements ObjektArt<Baum> {
  readonly name = 'baum' as const;
  readonly label = 'Baum';

  istVon(o: LagerObjekt): o is Baum {
    return o instanceof Baum;
  }

  zuJson(b: Baum): BaumJson {
    return { art: 'baum', id: b.id, position: b.position.toArray(), durchmesser: b.params.durchmesser, hoehe: b.params.hoehe };
  }

  ausJson(roh: Roh): Baum {
    return new Baum(text(roh.id, 'id'), vektor(roh.position, 'position'), {
      durchmesser: zahl(roh.durchmesser, 'durchmesser'),
      hoehe: zahl(roh.hoehe, 'hoehe'),
    });
  }
}
```

Neue Datei `src/arten/PlaneArt.ts`:

```ts
import type { LagerObjekt } from '../model/LagerObjekt';
import type { PlanenForm } from '../model/params';
import { Plane } from '../model/Plane';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson } from './ObjektArt';

export interface PlaneJson extends ObjektJson {
  readonly art: 'plane';
  readonly start: V3;
  readonly ende: V3;
  readonly breite: number;
  readonly laenge: number;
  readonly form: PlanenForm;
  /** Grad. */
  readonly neigung: number;
  readonly seite: 1 | -1;
}

/** Plane an einer Aufhängelinie (Spec v2b). Im JSON heißt die Neigung `neigung`, im Modell `neigungGrad`. */
export class PlaneArt implements ObjektArt<Plane> {
  readonly name = 'plane' as const;
  readonly label = 'Plane';

  istVon(o: LagerObjekt): o is Plane {
    return o instanceof Plane;
  }

  zuJson(p: Plane): PlaneJson {
    const { breite, laenge, form, neigungGrad, seite } = p.params;
    return { art: 'plane', id: p.id, start: p.start.toArray(), ende: p.ende.toArray(), breite, laenge, form, neigung: neigungGrad, seite };
  }

  ausJson(roh: Roh): Plane {
    const form = roh.form;
    if (form !== 'eben' && form !== 'satteldach') throw new Error('form unbekannt');
    const seite = roh.seite;
    if (seite !== 1 && seite !== -1) throw new Error('seite muss 1 oder -1 sein');
    return new Plane(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'), {
      breite: zahl(roh.breite, 'breite'),
      laenge: zahl(roh.laenge, 'laenge'),
      form,
      neigungGrad: zahl(roh.neigung, 'neigung'),
      seite,
    });
  }
}
```

- [ ] **Step 6: Abdeckung auf `src/arten/` ausdehnen**

In `vite.config.ts` die Zeile

```ts
      include: ['src/model/**', 'src/rules/**'],
```

ersetzen durch

```ts
      include: ['src/model/**', 'src/rules/**', 'src/arten/**'],
```

- [ ] **Step 7: Tests laufen lassen**

Run: `npx vitest run src/arten/arten.test.ts src/share/share.test.ts`
Expected: PASS (17 Tests in `arten.test.ts`; `share.test.ts` unverändert grün, der Serializer nutzt nur die verschobenen Lese-Hilfen).
Run: `npm test`
Expected: 40 Dateien, 339 Tests, alle grün; die Abdeckung von `src/model/**`, `src/rules/**` und `src/arten/**` liegt in allen vier Metriken bei mindestens 80 %.
Run: `npx tsc --noEmit`
Expected: Exit 0.
Run: `grep -rE "from 'three'|document\.|window\.|from '\.\./editor|from '\.\./ui" src/arten`
Expected: keine Ausgabe.

- [ ] **Step 8: Commit**

```bash
git add src/share/lesen.ts src/share/BauwerkSerializer.ts src/arten/ObjektArt.ts src/arten/ObjektRegister.ts src/arten/standardArten.ts src/arten/DreibeinArt.ts src/arten/ABockArt.ts src/arten/StangeArt.ts src/arten/SeilArt.ts src/arten/BaumArt.ts src/arten/PlaneArt.ts src/arten/arten.test.ts vite.config.ts
git commit -m "feat: add the object kind registry with a codec per kind"
```

---

### Task 4b: Editor-Verhalten je Art (Panel, Platzieren, Fangpunkte, Klickverhalten)

**Files:**
- Modify: `src/arten/ObjektArt.ts` (ganze Datei), `src/arten/ObjektRegister.ts`, `src/arten/DreibeinArt.ts`, `src/arten/ABockArt.ts`, `src/arten/StangeArt.ts`, `src/arten/SeilArt.ts`, `src/arten/BaumArt.ts`, `src/arten/PlaneArt.ts` (alle sechs: ganze Datei)
- Create: `src/arten/gemeinsam.ts`
- Test: `src/arten/verhalten.test.ts` (neu)

**Interfaces:**
- Consumes: alles aus Task 4a; `Baugruppe.spitze()`, `stangen()`, `hoehe()`, `beinwinkelGrad()`, `mitParams` der Klassen; `Stange.zwischen`, `Stange.naechsterPunkt`, `Stange.mitDurchmesser`; `Plane.naechsteOese`, `Plane.oesen`; `STANDARD_*` aus `src/model/params.ts`; `MIN_STANGENLAENGE`, `MIN_SEILLAENGE`, `STANDARD_DURCHMESSER`, `STANGEN_UEBERSTAND`, `FUSS_TOLERANZ` aus `src/model/konstanten.ts`.
- Produces (in `src/arten/ObjektArt.ts`):
  - `type FangArt = 'spitze' | 'bund' | 'ende' | 'oese' | 'stange' | 'baum'`; `interface Fangpunkt { readonly punkt: Vec3; readonly art: FangArt }`;
  - `type Werte = Readonly<Record<string, number | string>>`;
  - `interface PanelFeld { schluessel: string; label: string; faktor: number; schritt?: string }`, `interface PanelAuswahl { art: 'auswahl'; schluessel: string; label: string; optionen: readonly (readonly [string, string])[] }`, `interface PanelKnopf { art: 'knopf'; text: string; aenderung: Werte }`, `type PanelExtra = PanelAuswahl | PanelKnopf`;
  - `interface PanelSpec { felder; werte: Werte; info: string; extras: readonly PanelExtra[]; mit(werte: Werte): LagerObjekt }`;
  - `interface PlatzierenPunkt { modus: 'punkt'; erzeuge(id: string, position: Vec3): LagerObjekt }`, `interface PlatzierenLinie { modus: 'linie'; mindestabstand: number; fangtOesen: boolean; erzeuge(id: string, a: Vec3, b: Vec3): LagerObjekt }`, `type Platzieren = PlatzierenPunkt | PlatzierenLinie`;
  - `type KlickVerhalten = 'immer' | 'wahlweise'`;
  - `ObjektArt<T>` zusätzlich: `readonly klick: KlickVerhalten`, `readonly hatOesen: boolean`, `readonly platzieren: Platzieren`, `panel(o: T): PanelSpec`, `fangpunkte(o: T, mitOesen: boolean): readonly Fangpunkt[]`, `beiTreffer(o: T, teilId: string, punkt: Vec3, mitOesen: boolean): Fangpunkt | null`.
- Produces (sonst):
  - `ObjektRegister.wahlweise(): readonly ArtName[]` (`['seil', 'plane']`) und `ObjektRegister.mitOesen(): readonly ArtName[]` (`['plane']`);
  - `src/arten/gemeinsam.ts`: `zahlWert(werte, schluessel): number` (sonst `NaN`), `textWert(werte, schluessel): string` (sonst `''`), `baugruppenFang(g): Fangpunkt[]`, `stangenEnden(stangen): Fangpunkt[]`, `aufStange(stangen, teilId, punkt): Fangpunkt | null`, `baugruppenInfo(g): string`.

Die Panel-Texte, die Startmaße, die Startneigung der Plane und ihre Bodenmeldung sind wörtlich die aus `ParameterPanel.ts` und `Werkzeuge.ts`. Task 7 und Task 8 schalten auf diese Beschreibungen um; bis dahin gibt es `startPlane` doppelt (hier und in `DrawPlaneTool`), Task 7 löscht die Kopie in `Werkzeuge.ts`.

- [ ] **Step 1: Failing tests schreiben**

Neue Datei `src/arten/verhalten.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import { Dreibein } from '../model/Dreibein';
import { MIN_SEILLAENGE, MIN_STANGENLAENGE, STANDARD_DURCHMESSER } from '../model/konstanten';
import type { LagerObjekt } from '../model/LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Plane } from '../model/Plane';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import type { PanelSpec, Platzieren, PlatzierenLinie, PlatzierenPunkt } from './ObjektArt';
import { standardArten } from './standardArten';

const arten = standardArten();
const d = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const a = new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK);
const s = new Stange('s', Vec3.NULL, new Vec3(0, 2, 0), 0.08);
const l = new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
const b = new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM);
const pl = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);

const panel = (o: LagerObjekt): PanelSpec => arten.artVon(o).panel(o);
const labels = (spec: PanelSpec): string[] => spec.felder.map((f) => f.label);
const istBei = (p: Vec3 | undefined, x: number, y: number, z: number): void => {
  expect(p?.equals(new Vec3(x, y, z), 1e-9), `${p?.toArray().join(', ')} ≠ ${x}, ${y}, ${z}`).toBe(true);
};
const punkt = (p: Platzieren): PlatzierenPunkt => {
  if (p.modus !== 'punkt') throw new Error('Modus punkt erwartet');
  return p;
};
const linie = (p: Platzieren): PlatzierenLinie => {
  if (p.modus !== 'linie') throw new Error('Modus linie erwartet');
  return p;
};

describe('Klickverhalten (Spec v2b, D2)', () => {
  it('lässt Seile und Planen nur wahlweise Klicks fangen; nur Planen haben Ösen', () => {
    expect(arten.alle.map((x) => [x.name, x.klick])).toEqual([
      ['dreibein', 'immer'],
      ['abock', 'immer'],
      ['stange', 'immer'],
      ['seil', 'wahlweise'],
      ['plane', 'wahlweise'],
      ['baum', 'immer'],
    ]);
    expect(arten.wahlweise()).toEqual(['seil', 'plane']);
    expect(arten.mitOesen()).toEqual(['plane']);
  });
});

describe('Panel je Art (Spec v3, D4)', () => {
  it('Dreibein: Felder, Werte und Info wie bisher; mit() prüft neu', () => {
    const spec = panel(d);
    expect(labels(spec)).toEqual(['Stangenlänge (m)', 'Fußkreisradius (m)', 'Ø (cm)']);
    expect(spec.felder.map((f) => f.faktor)).toEqual([1, 1, 100]);
    expect(spec.werte).toEqual({ stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 });
    expect(spec.info).toBe('Höhe 2.09 m · Beinwinkel 19° · R dreht');
    expect(spec.extras).toEqual([]);
    const neu = spec.mit({ ...spec.werte, stangenlaenge: 3 });
    expect(neu).toBeInstanceOf(Dreibein);
    expect((neu as Dreibein).params.stangenlaenge).toBe(3);
    expect(neu.id).toBe('d');
    expect(() => spec.mit({ ...spec.werte, stangenlaenge: 0.5 })).toThrow('Fußkreisradius muss kleiner als Stangenlänge minus Überstand sein');
  });

  it('A-Bock: vier Felder und die Info der Baugruppe', () => {
    const spec = panel(a);
    expect(labels(spec)).toEqual(['Stangenlänge (m)', 'Fußabstand (m)', 'Riegelhöhe (m)', 'Ø (cm)']);
    expect(spec.info).toBe('Höhe 2.05 m · Beinwinkel 21° · R dreht');
    expect((spec.mit({ ...spec.werte, riegelhoehe: 0.6 }) as ABock).params.riegelhoehe).toBe(0.6);
  });

  it('Stange: nur der Durchmesser; ein Wert, der keine Zahl ist, wird abgelehnt', () => {
    const spec = panel(s);
    expect(labels(spec)).toEqual(['Ø (cm)']);
    expect(spec.werte).toEqual({ durchmesser: 0.08 });
    expect(spec.info).toBe('Länge 2.00 m');
    expect((spec.mit({ durchmesser: 0.1 }) as Stange).durchmesser).toBe(0.1);
    expect(() => spec.mit({ durchmesser: 'x' })).toThrow('Durchmesser muss größer als 0 sein');
  });

  it('Baum: Stammdurchmesser in cm und Höhe in m', () => {
    const spec = panel(b);
    expect(labels(spec)).toEqual(['Stammdurchmesser (cm)', 'Höhe (m)']);
    expect(spec.felder.map((f) => f.faktor)).toEqual([100, 1]);
    expect(spec.info).toBe('Steht auf dem Platz, gehört nicht zum Bau.');
    expect((spec.mit({ ...spec.werte, hoehe: 12 }) as Baum).params.hoehe).toBe(12);
    expect(() => spec.mit({ ...spec.werte, hoehe: 0 })).toThrow('Baumhöhe muss größer als 0 sein');
  });

  it('Seil: keine Felder, nur Länge und Winkel; mit() ändert nichts', () => {
    const spec = panel(l);
    expect(spec.felder).toEqual([]);
    expect(spec.info).toBe('Länge 2.83 m · Winkel zum Boden 45°');
    expect(spec.mit({})).toBe(l);
  });

  it('Plane: drei Felder, Form-Auswahl und „Seite wechseln“ nur bei eben', () => {
    const spec = panel(pl);
    expect(labels(spec)).toEqual(['Breite (m)', 'Länge (m)', 'Neigung (°)']);
    expect(spec.felder[2]?.schritt).toBe('1');
    expect(spec.werte).toEqual({ breite: 3, laenge: 4, form: 'eben', neigungGrad: 30, seite: 1 });
    expect(spec.info).toBe('Aufhängelinie 4.00 m · zum Verschieben neu spannen');
    expect(spec.extras).toEqual([
      { art: 'auswahl', schluessel: 'form', label: 'Form', optionen: [['eben', 'eben'], ['satteldach', 'Satteldach']] },
      { art: 'knopf', text: 'Seite wechseln', aenderung: { seite: -1 } },
    ]);
    expect((spec.mit({ ...spec.werte, seite: -1 }) as Plane).params.seite).toBe(-1);
    expect(() => spec.mit({ ...spec.werte, form: 'schief' })).toThrow('Unbekannte Planenform');
    const sattel = panel(pl.mitParams({ ...STANDARD_PLANE, form: 'satteldach' }));
    expect(sattel.extras.map((e) => e.art)).toEqual(['auswahl']);
  });
});

describe('Platzieren je Art (Spec v3, D4)', () => {
  it('setzt Dreibein, A-Bock und Baum mit Startmaßen auf einen Punkt', () => {
    const neu = punkt(arten.art('dreibein').platzieren).erzeuge('d1', new Vec3(1, 0, 2)) as Dreibein;
    expect(neu).toBeInstanceOf(Dreibein);
    expect(neu.params).toEqual(STANDARD_DREIBEIN);
    expect(neu.drehung).toBe(0);
    istBei(neu.position, 1, 0, 2);
    expect((punkt(arten.art('abock').platzieren).erzeuge('a1', Vec3.NULL) as ABock).params).toEqual(STANDARD_ABOCK);
    expect((punkt(arten.art('baum').platzieren).erzeuge('b1', Vec3.NULL) as Baum).params).toEqual(STANDARD_BAUM);
  });

  it('zieht eine Stange zwischen zwei Punkten; am Boden ohne Überstand', () => {
    const p = linie(arten.art('stange').platzieren);
    expect([p.mindestabstand, p.fangtOesen]).toEqual([MIN_STANGENLAENGE, false]);
    const neu = p.erzeuge('s1', Vec3.NULL, new Vec3(0, 2, 0)) as Stange;
    istBei(neu.start, 0, 0, 0);
    istBei(neu.ende, 0, 2.2, 0);
    expect(neu.durchmesser).toBe(STANDARD_DURCHMESSER);
  });

  it('spannt ein Seil gerade von Punkt zu Punkt und fängt dabei Ösen', () => {
    const p = linie(arten.art('seil').platzieren);
    expect([p.mindestabstand, p.fangtOesen]).toEqual([MIN_SEILLAENGE, true]);
    const neu = p.erzeuge('l1', new Vec3(0, 2, 0), new Vec3(2, 0, 0)) as Seil;
    istBei(neu.start, 0, 2, 0);
    istBei(neu.ende, 2, 0, 0);
  });

  it('spannt eine Plane: am Boden 0°, hängend 30° oder flacher, sonst die Meldung fürs Anlegen', () => {
    const p = linie(arten.art('plane').platzieren);
    expect([p.mindestabstand, p.fangtOesen]).toEqual([MIN_SEILLAENGE, false]);
    expect((p.erzeuge('p1', Vec3.NULL, new Vec3(4, 0, 0)) as Plane).params.neigungGrad).toBe(0);
    expect((p.erzeuge('p2', new Vec3(0, 2, 0), new Vec3(4, 2, 0)) as Plane).params.neigungGrad).toBe(30);
    expect((p.erzeuge('p3', new Vec3(0, 1, 0), new Vec3(4, 1, 0)) as Plane).params.neigungGrad).toBe(20);
    expect(() => p.erzeuge('p4', Vec3.NULL, new Vec3(2, 1, 0))).toThrow('Plane reicht in den Boden: Aufhängelinie höher oder waagrechter spannen.');
    expect(() => p.erzeuge('p5', new Vec3(0, 3, 0), new Vec3(0.1, 0, 0))).toThrow('Aufhängelinie zu steil.');
  });
});

describe('Fangpunkte und Treffer je Art (Spec v3, D4)', () => {
  it('liefert je Art die erwarteten Fangpunkte', () => {
    expect([d, a, s, l, b, pl].map((o) => arten.artVon(o).fangpunkte(o, true).length)).toEqual([7, 7, 2, 0, 0, 8]);
    expect(arten.artVon(pl).fangpunkte(pl, false)).toEqual([]);
  });

  it('Baugruppen: zuerst die Spitze, dann die Stangenenden; ein Treffer projiziert auf die getroffene Stange', () => {
    const fang = arten.artVon(d).fangpunkte(d, false);
    expect(fang.map((f) => f.art)).toEqual(['spitze', 'ende', 'ende', 'ende', 'ende', 'ende', 'ende']);
    istBei(fang[0]?.punkt, ...d.spitze().toArray());
    const bein = d.stangen()[0]!;
    const mitte = bein.start.add(bein.ende).scale(0.5);
    const amBein = arten.artVon(d).beiTreffer(d, 'd-bein-0', mitte.add(new Vec3(0, 0, 0.04)), false);
    expect(amBein?.art).toBe('stange');
    expect(amBein && bein.naechsterPunkt(amBein.punkt).distanceTo(amBein.punkt)).toBeLessThan(1e-9);
    const riegel = arten.artVon(a).beiTreffer(a, 'a-riegel', new Vec3(0.3, 0.45, 0.04), false);
    expect(riegel?.art).toBe('stange');
    istBei(riegel?.punkt, 0.3, 0.4, 0);
    expect(arten.artVon(a).beiTreffer(a, 'weg', Vec3.NULL, false)).toBeNull();
  });

  it('Stange: beide Enden; ein Treffer landet auf der Achse', () => {
    expect(arten.artVon(s).fangpunkte(s, true).map((f) => f.art)).toEqual(['ende', 'ende']);
    istBei(arten.artVon(s).beiTreffer(s, 's', new Vec3(0.05, 1, 0), false)?.punkt, 0, 1, 0);
  });

  it('Plane: ein Treffer rastet nur mit mitOesen auf die nächste Öse, egal wie weit', () => {
    const art = arten.artVon(pl);
    expect(art.beiTreffer(pl, 'pl', new Vec3(3.9, 2, -0.1), false)).toBeNull();
    const oese = art.beiTreffer(pl, 'pl', new Vec3(3.9, 2, -0.1), true);
    expect(oese?.art).toBe('oese');
    istBei(oese?.punkt, 4, 2, 0);
  });

  it('Baum: kein Fangpunkt, der Treffer bleibt am Stamm; Seil: weder noch', () => {
    expect(arten.artVon(b).beiTreffer(b, 'b', new Vec3(4.85, 1.7, 0), false)).toEqual({ punkt: new Vec3(4.85, 1.7, 0), art: 'baum' });
    expect(arten.artVon(l).beiTreffer(l, 'l', new Vec3(1, 1, 0), true)).toBeNull();
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/arten/verhalten.test.ts`
Expected: FAIL. `klick`, `wahlweise`, `panel`, `platzieren`, `fangpunkte` und `beiTreffer` gibt es noch nicht.

- [ ] **Step 3: Schnittstelle erweitern und Hilfen für mehrere Arten**

`src/arten/ObjektArt.ts` ganz ersetzen:

```ts
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import type { Roh } from '../share/lesen';

/** Ein Objekt im Datenformat v4: Art und id vorneweg, danach die Felder der Art wie in v3 (Spec v3, D3). */
export interface ObjektJson {
  readonly art: ArtName;
  readonly id: string;
  readonly [feld: string]: unknown;
}

/**
 * Woran ein Klick einrastet. Vorrang bei gleichem Abstand: Spitze → Bund → Ende → Öse.
 * `stange` und `baum` liefert nur das getroffene Objekt selbst (`beiTreffer`).
 */
export type FangArt = 'spitze' | 'bund' | 'ende' | 'oese' | 'stange' | 'baum';

export interface Fangpunkt {
  readonly punkt: Vec3;
  readonly art: FangArt;
}

/** Werte im Panel: Zahlen in Modelleinheiten, Texte z. B. für die Form einer Plane. */
export type Werte = Readonly<Record<string, number | string>>;

/** Ein Zahlenfeld. Anzeige = Modellwert × faktor (Ø in cm, sonst m). */
export interface PanelFeld {
  readonly schluessel: string;
  readonly label: string;
  readonly faktor: number;
  /** Standard: 0.05 bei Metern, 1 bei Zentimetern. */
  readonly schritt?: string;
}

export interface PanelAuswahl {
  readonly art: 'auswahl';
  readonly schluessel: string;
  readonly label: string;
  /** Wert und angezeigter Text. */
  readonly optionen: readonly (readonly [string, string])[];
}

export interface PanelKnopf {
  readonly art: 'knopf';
  readonly text: string;
  /** Werte, die ein Klick überschreibt. */
  readonly aenderung: Werte;
}

export type PanelExtra = PanelAuswahl | PanelKnopf;

/** Beschreibung des Formulars für ein Objekt (Spec v3, D4). Das ParameterPanel baut daraus die Eingaben. */
export interface PanelSpec {
  readonly felder: readonly PanelFeld[];
  readonly werte: Werte;
  readonly info: string;
  readonly extras: readonly PanelExtra[];
  /** Das Objekt mit diesen Werten. Ungültige Werte: RangeError mit der Meldung des Modells. */
  mit(werte: Werte): LagerObjekt;
}

/** Ein Bodenklick setzt das Objekt auf den Rasterpunkt. */
export interface PlatzierenPunkt {
  readonly modus: 'punkt';
  erzeuge(id: string, position: Vec3): LagerObjekt;
}

/** Zwei Klicks auf Einrastpunkte; liegen sie näher als `mindestabstand`, passiert nichts. */
export interface PlatzierenLinie {
  readonly modus: 'linie';
  readonly mindestabstand: number;
  /** Ösen sind Fangpunkte, und Arten mit Ösen fangen Klicks (nur das Seil, Spec v2b, D2). */
  readonly fangtOesen: boolean;
  erzeuge(id: string, a: Vec3, b: Vec3): LagerObjekt;
}

export type Platzieren = PlatzierenPunkt | PlatzierenLinie;

/** `immer`: fängt Klicks in jedem Werkzeug; `wahlweise`: nur, wo das Werkzeug die Art als Klickziel nennt (ersetzt `KlickZiel`). */
export type KlickVerhalten = 'immer' | 'wahlweise';

/** Alles Editor-Seitige einer Objektart, ohne three.js (Spec v3, D2). */
export interface ObjektArt<T extends LagerObjekt = LagerObjekt> {
  readonly name: ArtName;
  /** Anzeigename, z. B. als Überschrift im Panel und in der Statuszeile. */
  readonly label: string;
  readonly klick: KlickVerhalten;
  readonly hatOesen: boolean;
  readonly platzieren: Platzieren;
  istVon(o: LagerObjekt): o is T;
  zuJson(o: T): ObjektJson;
  /** Wirft einen Error mit dem Feldnamen, wenn `roh` nicht passt. */
  ausJson(roh: Roh): T;
  panel(o: T): PanelSpec;
  /** Fangpunkte in der Nähe eines Klicks; Ösen nur, wenn `mitOesen`. */
  fangpunkte(o: T, mitOesen: boolean): readonly Fangpunkt[];
  /** Wohin ein Klick auf das Objekt selbst einrastet, wenn kein Fangpunkt in Reichweite liegt; `teilId` ist der getroffene Teil. */
  beiTreffer(o: T, teilId: string, punkt: Vec3, mitOesen: boolean): Fangpunkt | null;
}
```

Neue Datei `src/arten/gemeinsam.ts`:

```ts
import type { Baugruppe } from '../model/Baugruppe';
import type { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import type { Fangpunkt, Werte } from './ObjektArt';

/** Eine Zahl aus den Panel-Werten; alles andere wird NaN, und das Modell lehnt es mit seiner eigenen Meldung ab. */
export function zahlWert(werte: Werte, schluessel: string): number {
  const wert = werte[schluessel];
  return typeof wert === 'number' ? wert : Number.NaN;
}

/** Ein Text aus den Panel-Werten; alles andere wird '', und das Modell lehnt es ab. */
export function textWert(werte: Werte, schluessel: string): string {
  const wert = werte[schluessel];
  return typeof wert === 'string' ? wert : '';
}

export function stangenEnden(stangen: readonly Stange[]): Fangpunkt[] {
  return stangen.flatMap((s) => s.endpunkte().map((punkt): Fangpunkt => ({ punkt, art: 'ende' })));
}

/** Spitze und Stangenenden jeder Baugruppe (Spec v1). */
export function baugruppenFang(g: Baugruppe): Fangpunkt[] {
  return [{ punkt: g.spitze(), art: 'spitze' }, ...stangenEnden(g.stangen())];
}

/** Klick auf eine der Stangen: der nächste Punkt auf ihrer Achse; null, wenn die Teil-id nicht dazugehört. */
export function aufStange(stangen: readonly Stange[], teilId: string, punkt: Vec3): Fangpunkt | null {
  const stange = stangen.find((s) => s.id === teilId);
  return stange ? { punkt: stange.naechsterPunkt(punkt), art: 'stange' } : null;
}

export function baugruppenInfo(g: Baugruppe): string {
  return `Höhe ${g.hoehe().toFixed(2)} m · Beinwinkel ${g.beinwinkelGrad().toFixed(0)}° · R dreht`;
}
```

In `src/arten/ObjektRegister.ts` nach der Methode `artVon(…)` einfügen:

```ts

  /** Arten, die Klicks nur in Werkzeugen fangen, die sie nennen (Spec v2b, D2). */
  wahlweise(): readonly ArtName[] {
    return this.alle.filter((a) => a.klick === 'wahlweise').map((a) => a.name);
  }

  /** Arten mit Ösen, an denen ein Seil einrastet. */
  mitOesen(): readonly ArtName[] {
    return this.alle.filter((a) => a.hatOesen).map((a) => a.name);
  }
```

- [ ] **Step 4: Die sechs Arten vervollständigen**

`src/arten/DreibeinArt.ts` ganz ersetzen:

```ts
import { Dreibein } from '../model/Dreibein';
import type { LagerObjekt } from '../model/LagerObjekt';
import { type DreibeinParams, STANDARD_DREIBEIN } from '../model/params';
import type { Vec3 } from '../model/Vec3';
import { objekt, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { aufStange, baugruppenFang, baugruppenInfo, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenPunkt } from './ObjektArt';

export interface DreibeinJson extends ObjektJson {
  readonly art: 'dreibein';
  readonly position: V3;
  readonly drehung: number;
  readonly params: DreibeinParams;
}

/** Dreibein (Spec v1): per Bodenklick gesetzt, Maße im Panel. Gespeichert werden die Parameter, nicht die Stangen. */
export class DreibeinArt implements ObjektArt<Dreibein> {
  readonly name = 'dreibein' as const;
  readonly label = 'Dreibein';
  readonly klick = 'immer' as const;
  readonly hatOesen = false;
  readonly platzieren: PlatzierenPunkt = {
    modus: 'punkt',
    erzeuge: (id, position) => new Dreibein(id, position, 0, STANDARD_DREIBEIN),
  };

  istVon(o: LagerObjekt): o is Dreibein {
    return o instanceof Dreibein;
  }

  zuJson(d: Dreibein): DreibeinJson {
    return { art: 'dreibein', id: d.id, position: d.position.toArray(), drehung: d.drehung, params: d.params };
  }

  ausJson(roh: Roh): Dreibein {
    const id = text(roh.id, 'id');
    const position = vektor(roh.position, 'position');
    const drehung = zahl(roh.drehung, 'drehung');
    const p = objekt(roh.params, 'params');
    return new Dreibein(id, position, drehung, {
      stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
      fusskreisradius: zahl(p.fusskreisradius, 'fusskreisradius'),
      durchmesser: zahl(p.durchmesser, 'durchmesser'),
    });
  }

  panel(d: Dreibein): PanelSpec {
    const { stangenlaenge, fusskreisradius, durchmesser } = d.params;
    return {
      felder: [
        { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
        { schluessel: 'fusskreisradius', label: 'Fußkreisradius (m)', faktor: 1 },
        { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
      ],
      werte: { stangenlaenge, fusskreisradius, durchmesser },
      info: baugruppenInfo(d),
      extras: [],
      mit: (w) =>
        d.mitParams({
          stangenlaenge: zahlWert(w, 'stangenlaenge'),
          fusskreisradius: zahlWert(w, 'fusskreisradius'),
          durchmesser: zahlWert(w, 'durchmesser'),
        }),
    };
  }

  fangpunkte(d: Dreibein): readonly Fangpunkt[] {
    return baugruppenFang(d);
  }

  beiTreffer(d: Dreibein, teilId: string, punkt: Vec3): Fangpunkt | null {
    return aufStange(d.stangen(), teilId, punkt);
  }
}
```

`src/arten/ABockArt.ts` ganz ersetzen:

```ts
import { ABock } from '../model/ABock';
import type { LagerObjekt } from '../model/LagerObjekt';
import { type ABockParams, STANDARD_ABOCK } from '../model/params';
import type { Vec3 } from '../model/Vec3';
import { objekt, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { aufStange, baugruppenFang, baugruppenInfo, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenPunkt } from './ObjektArt';

export interface ABockJson extends ObjektJson {
  readonly art: 'abock';
  readonly position: V3;
  readonly drehung: number;
  readonly params: ABockParams;
}

/** A-Bock (Spec v1): per Bodenklick gesetzt, Maße im Panel. Gespeichert werden die Parameter, nicht die Stangen. */
export class ABockArt implements ObjektArt<ABock> {
  readonly name = 'abock' as const;
  readonly label = 'A-Bock';
  readonly klick = 'immer' as const;
  readonly hatOesen = false;
  readonly platzieren: PlatzierenPunkt = {
    modus: 'punkt',
    erzeuge: (id, position) => new ABock(id, position, 0, STANDARD_ABOCK),
  };

  istVon(o: LagerObjekt): o is ABock {
    return o instanceof ABock;
  }

  zuJson(a: ABock): ABockJson {
    return { art: 'abock', id: a.id, position: a.position.toArray(), drehung: a.drehung, params: a.params };
  }

  ausJson(roh: Roh): ABock {
    const id = text(roh.id, 'id');
    const position = vektor(roh.position, 'position');
    const drehung = zahl(roh.drehung, 'drehung');
    const p = objekt(roh.params, 'params');
    return new ABock(id, position, drehung, {
      stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
      fussabstand: zahl(p.fussabstand, 'fussabstand'),
      riegelhoehe: zahl(p.riegelhoehe, 'riegelhoehe'),
      durchmesser: zahl(p.durchmesser, 'durchmesser'),
    });
  }

  panel(a: ABock): PanelSpec {
    const { stangenlaenge, fussabstand, riegelhoehe, durchmesser } = a.params;
    return {
      felder: [
        { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
        { schluessel: 'fussabstand', label: 'Fußabstand (m)', faktor: 1 },
        { schluessel: 'riegelhoehe', label: 'Riegelhöhe (m)', faktor: 1 },
        { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
      ],
      werte: { stangenlaenge, fussabstand, riegelhoehe, durchmesser },
      info: baugruppenInfo(a),
      extras: [],
      mit: (w) =>
        a.mitParams({
          stangenlaenge: zahlWert(w, 'stangenlaenge'),
          fussabstand: zahlWert(w, 'fussabstand'),
          riegelhoehe: zahlWert(w, 'riegelhoehe'),
          durchmesser: zahlWert(w, 'durchmesser'),
        }),
    };
  }

  fangpunkte(a: ABock): readonly Fangpunkt[] {
    return baugruppenFang(a);
  }

  beiTreffer(a: ABock, teilId: string, punkt: Vec3): Fangpunkt | null {
    return aufStange(a.stangen(), teilId, punkt);
  }
}
```

`src/arten/StangeArt.ts` ganz ersetzen:

```ts
import { FUSS_TOLERANZ, MIN_STANGENLAENGE, STANDARD_DURCHMESSER, STANGEN_UEBERSTAND } from '../model/konstanten';
import type { LagerObjekt } from '../model/LagerObjekt';
import { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { aufStange, stangenEnden, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenLinie } from './ObjektArt';

export interface StangeJson extends ObjektJson {
  readonly art: 'stange';
  readonly start: V3;
  readonly ende: V3;
  readonly durchmesser: number;
}

/** Am Boden steht eine neue Stange ohne Überstand, sonst ragt sie 0,2 m über den Einrastpunkt hinaus (Spec v1). */
const ueberstand = (p: Vec3): number => (p.y <= FUSS_TOLERANZ ? 0 : STANGEN_UEBERSTAND);

/** Freie Stange (Spec v1): zwei Klicks auf Einrastpunkte. */
export class StangeArt implements ObjektArt<Stange> {
  readonly name = 'stange' as const;
  readonly label = 'Stange';
  readonly klick = 'immer' as const;
  readonly hatOesen = false;
  readonly platzieren: PlatzierenLinie = {
    modus: 'linie',
    mindestabstand: MIN_STANGENLAENGE,
    fangtOesen: false,
    erzeuge: (id, a, b) => Stange.zwischen(id, a, b, STANDARD_DURCHMESSER, ueberstand(a), ueberstand(b)),
  };

  istVon(o: LagerObjekt): o is Stange {
    return o instanceof Stange;
  }

  zuJson(s: Stange): StangeJson {
    return { art: 'stange', id: s.id, start: s.start.toArray(), ende: s.ende.toArray(), durchmesser: s.durchmesser };
  }

  ausJson(roh: Roh): Stange {
    return new Stange(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'), zahl(roh.durchmesser, 'durchmesser'));
  }

  panel(s: Stange): PanelSpec {
    return {
      felder: [{ schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 }],
      werte: { durchmesser: s.durchmesser },
      info: `Länge ${s.laenge.toFixed(2)} m`,
      extras: [],
      mit: (w) => s.mitDurchmesser(zahlWert(w, 'durchmesser')),
    };
  }

  fangpunkte(s: Stange): readonly Fangpunkt[] {
    return stangenEnden([s]);
  }

  beiTreffer(s: Stange, teilId: string, punkt: Vec3): Fangpunkt | null {
    return aufStange([s], teilId, punkt);
  }
}
```

`src/arten/SeilArt.ts` ganz ersetzen:

```ts
import { MIN_SEILLAENGE } from '../model/konstanten';
import type { LagerObjekt } from '../model/LagerObjekt';
import { Seil } from '../model/Seil';
import { type Roh, text, type V3, vektor } from '../share/lesen';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenLinie } from './ObjektArt';

export interface SeilJson extends ObjektJson {
  readonly art: 'seil';
  readonly start: V3;
  readonly ende: V3;
}

/**
 * Seil (Spec v2a): zwei Klicks; ein Ende am Boden wird ein Hering. Im Seil-Werkzeug rasten Klicks an Planen-Ösen ein.
 * Ein Seil fängt Klicks nur in der Auswahl, sonst blockiert sein Greifmantel, was dahinter liegt.
 */
export class SeilArt implements ObjektArt<Seil> {
  readonly name = 'seil' as const;
  readonly label = 'Seil';
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = false;
  readonly platzieren: PlatzierenLinie = {
    modus: 'linie',
    mindestabstand: MIN_SEILLAENGE,
    fangtOesen: true,
    erzeuge: (id, a, b) => new Seil(id, a, b),
  };

  istVon(o: LagerObjekt): o is Seil {
    return o instanceof Seil;
  }

  zuJson(s: Seil): SeilJson {
    return { art: 'seil', id: s.id, start: s.start.toArray(), ende: s.ende.toArray() };
  }

  ausJson(roh: Roh): Seil {
    return new Seil(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'));
  }

  panel(s: Seil): PanelSpec {
    return {
      felder: [],
      werte: {},
      info: `Länge ${s.laenge.toFixed(2)} m · Winkel zum Boden ${s.winkelZumBodenGrad.toFixed(0)}°`,
      extras: [],
      mit: () => s,
    };
  }

  fangpunkte(): readonly Fangpunkt[] {
    return [];
  }

  /** Ein Klick auf ein Seil rastet nirgends ein; ohne Fangpunkt in Reichweite zählt der Boden darunter (v2a). */
  beiTreffer(): Fangpunkt | null {
    return null;
  }
}
```

`src/arten/BaumArt.ts` ganz ersetzen:

```ts
import { Baum } from '../model/Baum';
import type { LagerObjekt } from '../model/LagerObjekt';
import { STANDARD_BAUM } from '../model/params';
import type { Vec3 } from '../model/Vec3';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelSpec, PlatzierenPunkt } from './ObjektArt';

export interface BaumJson extends ObjektJson {
  readonly art: 'baum';
  readonly position: V3;
  readonly durchmesser: number;
  readonly hoehe: number;
}

/** Baum auf dem Platz (Spec v2a): per Bodenklick gesetzt, gehört nicht zum Bau. */
export class BaumArt implements ObjektArt<Baum> {
  readonly name = 'baum' as const;
  readonly label = 'Baum';
  readonly klick = 'immer' as const;
  readonly hatOesen = false;
  readonly platzieren: PlatzierenPunkt = {
    modus: 'punkt',
    erzeuge: (id, position) => new Baum(id, position, STANDARD_BAUM),
  };

  istVon(o: LagerObjekt): o is Baum {
    return o instanceof Baum;
  }

  zuJson(b: Baum): BaumJson {
    return { art: 'baum', id: b.id, position: b.position.toArray(), durchmesser: b.params.durchmesser, hoehe: b.params.hoehe };
  }

  ausJson(roh: Roh): Baum {
    return new Baum(text(roh.id, 'id'), vektor(roh.position, 'position'), {
      durchmesser: zahl(roh.durchmesser, 'durchmesser'),
      hoehe: zahl(roh.hoehe, 'hoehe'),
    });
  }

  panel(b: Baum): PanelSpec {
    const { durchmesser, hoehe } = b.params;
    return {
      felder: [
        { schluessel: 'durchmesser', label: 'Stammdurchmesser (cm)', faktor: 100 },
        { schluessel: 'hoehe', label: 'Höhe (m)', faktor: 1 },
      ],
      werte: { durchmesser, hoehe },
      info: 'Steht auf dem Platz, gehört nicht zum Bau.',
      extras: [],
      mit: (w) => b.mitParams({ durchmesser: zahlWert(w, 'durchmesser'), hoehe: zahlWert(w, 'hoehe') }),
    };
  }

  fangpunkte(): readonly Fangpunkt[] {
    return [];
  }

  /** Am Stamm zählt der getroffene Oberflächenpunkt; die Verankerung erkennt ihn als „Baum“. */
  beiTreffer(_baum: Baum, _teilId: string, punkt: Vec3): Fangpunkt {
    return { punkt, art: 'baum' };
  }
}
```

`src/arten/PlaneArt.ts` ganz ersetzen:

```ts
import { FUSS_TOLERANZ, MIN_SEILLAENGE } from '../model/konstanten';
import type { LagerObjekt } from '../model/LagerObjekt';
import { type PlanenForm, STANDARD_PLANE } from '../model/params';
import { Plane } from '../model/Plane';
import type { Vec3 } from '../model/Vec3';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { textWert, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelExtra, PanelSpec, PlatzierenLinie } from './ObjektArt';

export interface PlaneJson extends ObjektJson {
  readonly art: 'plane';
  readonly start: V3;
  readonly ende: V3;
  readonly breite: number;
  readonly laenge: number;
  readonly form: PlanenForm;
  /** Grad. */
  readonly neigung: number;
  readonly seite: 1 | -1;
}

/** Beim Anlegen gibt es noch keine Plane, deren Maße man ändern könnte; die Meldung des Modells („Neigung, Breite oder Länge verringern“) passt nur zum Bearbeiten im Panel. */
const PLANE_BODEN_MODELLFEHLER = 'Plane reicht in den Boden';
const PLANE_BODEN_BEIM_ERSTELLEN = 'Plane reicht in den Boden: Aufhängelinie höher oder waagrechter spannen.';

const PLANEN_FORMEN: readonly (readonly [PlanenForm, string])[] = [
  ['eben', 'eben'],
  ['satteldach', 'Satteldach'],
];

/**
 * Startplane für „Plane spannen“ (Spec v2b, D2). Beide Enden am Boden: Bodenplane mit 0°. Sonst 30°, oder die größte ganze
 * Gradzahl darunter, bei der keine Öse im Boden liegt. Passt nicht einmal 0°, fliegt der RangeError bis zum Editor; der zeigt ihn als Meldung.
 */
function startPlane(id: string, start: Vec3, ende: Vec3): Plane {
  const amBoden = start.y <= FUSS_TOLERANZ && ende.y <= FUSS_TOLERANZ;
  for (let grad = amBoden ? 0 : STANDARD_PLANE.neigungGrad; ; grad -= 1) {
    try {
      return new Plane(id, start, ende, { ...STANDARD_PLANE, neigungGrad: grad });
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
      if (grad === 0) throw e.message.startsWith(PLANE_BODEN_MODELLFEHLER) ? new RangeError(PLANE_BODEN_BEIM_ERSTELLEN) : e;
    }
  }
}

/** Plane an einer Aufhängelinie (Spec v2b). Im JSON heißt die Neigung `neigung`, im Modell `neigungGrad`. */
export class PlaneArt implements ObjektArt<Plane> {
  readonly name = 'plane' as const;
  readonly label = 'Plane';
  /** Eine große Plane soll das Setzen eines Dreibeins darunter nicht blockieren (Spec v2b, D2). */
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = true;
  readonly platzieren: PlatzierenLinie = {
    modus: 'linie',
    mindestabstand: MIN_SEILLAENGE,
    fangtOesen: false,
    erzeuge: startPlane,
  };

  istVon(o: LagerObjekt): o is Plane {
    return o instanceof Plane;
  }

  zuJson(p: Plane): PlaneJson {
    const { breite, laenge, form, neigungGrad, seite } = p.params;
    return { art: 'plane', id: p.id, start: p.start.toArray(), ende: p.ende.toArray(), breite, laenge, form, neigung: neigungGrad, seite };
  }

  ausJson(roh: Roh): Plane {
    const form = roh.form;
    if (form !== 'eben' && form !== 'satteldach') throw new Error('form unbekannt');
    const seite = roh.seite;
    if (seite !== 1 && seite !== -1) throw new Error('seite muss 1 oder -1 sein');
    return new Plane(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'), {
      breite: zahl(roh.breite, 'breite'),
      laenge: zahl(roh.laenge, 'laenge'),
      form,
      neigungGrad: zahl(roh.neigung, 'neigung'),
      seite,
    });
  }

  panel(p: Plane): PanelSpec {
    const { breite, laenge, form, neigungGrad, seite } = p.params;
    const formAuswahl: PanelExtra = { art: 'auswahl', schluessel: 'form', label: 'Form', optionen: PLANEN_FORMEN };
    // Beim Satteldach hängt die Plane zu beiden Seiten; die Seite wird gespeichert, wirkt aber nicht.
    const seitenKnopf: PanelExtra = { art: 'knopf', text: 'Seite wechseln', aenderung: { seite: -seite } };
    return {
      felder: [
        { schluessel: 'breite', label: 'Breite (m)', faktor: 1 },
        { schluessel: 'laenge', label: 'Länge (m)', faktor: 1 },
        { schluessel: 'neigungGrad', label: 'Neigung (°)', faktor: 1, schritt: '1' },
      ],
      werte: { breite, laenge, form, neigungGrad, seite },
      info: `Aufhängelinie ${p.linienLaenge.toFixed(2)} m · zum Verschieben neu spannen`,
      extras: form === 'eben' ? [formAuswahl, seitenKnopf] : [formAuswahl],
      mit: (w) =>
        p.mitParams({
          breite: zahlWert(w, 'breite'),
          laenge: zahlWert(w, 'laenge'),
          form: textWert(w, 'form') as PlanenForm,
          neigungGrad: zahlWert(w, 'neigungGrad'),
          seite: zahlWert(w, 'seite') as 1 | -1,
        }),
    };
  }

  /** Ösen sind nur im Seil-Werkzeug Fangpunkte (Spec v2b, D2). */
  fangpunkte(p: Plane, mitOesen: boolean): readonly Fangpunkt[] {
    return mitOesen ? p.oesen.map((punkt): Fangpunkt => ({ punkt, art: 'oese' })) : [];
  }

  /** Ein Klick auf die Plane rastet im Seil-Werkzeug auf ihre nächste Öse, egal wie weit; so hängt kein Seilende in der Luft. */
  beiTreffer(p: Plane, _teilId: string, punkt: Vec3, mitOesen: boolean): Fangpunkt | null {
    return mitOesen ? { punkt: p.naechsteOese(punkt), art: 'oese' } : null;
  }
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/arten`
Expected: PASS (17 Tests in `arten.test.ts`, 16 in `verhalten.test.ts`).
Run: `npm test`
Expected: 41 Dateien, 355 Tests, alle grün; Abdeckung von `src/model/**`, `src/rules/**` und `src/arten/**` in allen vier Metriken ≥ 80 %.
Run: `npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/arten/ObjektArt.ts src/arten/ObjektRegister.ts src/arten/gemeinsam.ts src/arten/DreibeinArt.ts src/arten/ABockArt.ts src/arten/StangeArt.ts src/arten/SeilArt.ts src/arten/BaumArt.ts src/arten/PlaneArt.ts src/arten/verhalten.test.ts
git commit -m "feat: describe panel, placing and snapping per object kind"
```

---

### Task 5: Datenformat v4, alte Formate, `MAX_TEILE` 2000

**Files:**
- Modify: `src/share/BauwerkSerializer.ts` (ganze Datei), `src/share/grenzen.ts`
- Create: `src/share/AltesFormat.ts`
- Test: `src/share/share.test.ts`, `src/share/AltesFormat.test.ts` (neu)

**Interfaces:**
- Consumes: `ObjektRegister.alle/finde/artVon`, `ObjektArt.zuJson/ausJson`, `ObjektJson` (Task 4a); `standardArten()`; `Bauwerk.von`, `Bauwerk.objekte` (Task 2); `liste`, `objekt`, `text`, `type Roh` aus `src/share/lesen.ts`.
- Produces:
  - `interface BauwerkJson { readonly version: 4; readonly objekte: readonly ObjektJson[] }`;
  - `new BauwerkSerializer(arten: ObjektRegister = standardArten())` mit unveränderten `zuJson(bauwerk): BauwerkJson` und `ausJson(daten: unknown): Bauwerk`; die Typen `GruppeJson`, `StangeJson`, `SeilJson`, `BaumJson`, `PlaneJson` aus dem Serializer entfallen (sie liegen jetzt je Art in `src/arten/`);
  - `alteObjekte(o: Roh): Roh[]` in `src/share/AltesFormat.ts`;
  - `MAX_TEILE = 2000`.

**Falls der Link-Test in Step 6 rot ist** (gemessen beim Schreiben dieses Plans: 58 415 Zeichen für 2000 Stangen, also weit unter 200 000): `MAX_TEILE` in `src/share/grenzen.ts` nacheinander auf `1500` und `1000` setzen, den Wert im Test „erlaubt 2000 Teile“ mitziehen und die Tests jeweils wiederholen. Der größte Wert, bei dem alle Tests in `share.test.ts` grün sind, gilt (Spec D3). Dann den Wert im Abschnitt „Abweichungen von der Spec“ dieses Plans und in Task 11 im README nennen.

- [ ] **Step 1: Bestehende Tests auf Format v4 umstellen**

In `src/share/share.test.ts`:

1. Die Importe ergänzen:

```ts
import { Stange } from '../model/Stange';
import { STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Teilen } from '../ui/Teilen';
```

(die vorhandene Zeile `import { STANDARD_PLANE } from '../model/params';` durch die mittlere Zeile ersetzen).

2. Nach `const v3 = …;` einfügen:

```ts
const seilJson = { art: 'seil', id: 's', start: [0, 2, 0], ende: [2, 0, 0] };

/** Fester Zufall (mulberry32), damit die Größentests immer dieselben Daten haben. */
function zufall(saat: number): () => number {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

3. Den Test „speichert Gruppen als Parameter und nur freie Stangen einzeln“ ganz ersetzen durch:

```ts
  it('speichert Gruppen als Parameter und nur freie Stangen einzeln', () => {
    const json = serializer.zuJson(kochstelle());
    expect(json.version).toBe(4);
    expect(json.objekte.map((o) => `${o.art}:${o.id}`)).toEqual(['abock:abock', 'dreibein:dreibein', 'stange:first']);
    expect(json.objekte[1]).toEqual({ art: 'dreibein', id: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: STANDARD_DREIBEIN });
  });
```

4. In der Tabelle von `it.each([…])('lehnt ungültige Daten ab: %s', …)` die Zeile

```ts
    ['falsche Version', { version: 4, gruppen: [], stangen: [], seile: [], baeume: [], planen: [] }],
```

ersetzen durch

```ts
    ['falsche Version', { version: 5, objekte: [] }],
```

und nach der Zeile `['leere ID', …],` einfügen:

```ts
    ['v4 ohne Objektliste', { version: 4, gruppen: [] }],
    ['v4 mit unbekannter Art', { version: 4, objekte: [{ art: 'vierbein', id: 'v' }] }],
    ['v4-Objekt ohne Art', { version: 4, objekte: [{ id: 'x', start: [0, 2, 0], ende: [2, 0, 0] }] }],
    ['v4 mit doppelter id', { version: 4, objekte: [seilJson, seilJson] }],
```

5. Im Test „übersteht die Rundreise mit Seilen und Bäumen“ die beiden Zeilen

```ts
    expect(json.seile).toEqual([{ id: 'seil', start: [0, 2, 0], ende: [1.5, 0, 0] }]);
    expect(json.baeume).toEqual([{ id: 'baum', position: [6, 0, 0], durchmesser: 0.4, hoehe: 9 }]);
```

ersetzen durch

```ts
    expect(json.objekte.filter((o) => o.art === 'seil')).toEqual([{ art: 'seil', id: 'seil', start: [0, 2, 0], ende: [1.5, 0, 0] }]);
    expect(json.objekte.filter((o) => o.art === 'baum')).toEqual([{ art: 'baum', id: 'baum', position: [6, 0, 0], durchmesser: 0.4, hoehe: 9 }]);
```

6. Den Test „übersteht die Rundreise mit Planen (Version 3)“ ganz ersetzen durch:

```ts
  it('übersteht die Rundreise mit Planen (Version 4)', () => {
    const plane = new Plane('plane', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { ...STANDARD_PLANE, form: 'satteldach' });
    const json = serializer.zuJson(kochstelle().mitPlane(plane));
    expect(json.version).toBe(4);
    expect(json.objekte.filter((o) => o.art === 'plane')).toEqual([
      { art: 'plane', id: 'plane', start: [0, 2, 0], ende: [4, 2, 0], breite: 3, laenge: 4, form: 'satteldach', neigung: 30, seite: 1 },
    ]);
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });
```

7. Innerhalb von `describe('BauwerkSerializer', …)` nach dem Test „zählt Planen zu den Teilen“ einfügen:

```ts

  it('schreibt alle Arten in der Reihenfolge des Bauwerks und liest sie in derselben Reihenfolge zurück', () => {
    const b = Bauwerk.von([
      new Seil('seil', new Vec3(0, 2, 0), new Vec3(1.5, 0, 0)),
      ...kochstelle().objekte,
      new Plane('plane', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE),
      new Baum('baum', new Vec3(6, 0, 0), { durchmesser: 0.4, hoehe: 9 }),
    ]);
    const json = serializer.zuJson(b);
    expect(json.objekte.map((o) => o.art)).toEqual(['seil', 'abock', 'dreibein', 'stange', 'plane', 'baum']);
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(zurueck.objekte.map((o) => o.id)).toEqual(['seil', 'abock', 'dreibein', 'first', 'plane', 'baum']);
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });
```

8. Innerhalb von `describe('Größengrenzen', …)` nach dem letzten Test einfügen:

```ts

  it('erlaubt 2000 Teile (Spec v3, D3)', () => {
    expect(MAX_TEILE).toBe(2000);
  });

  it('packt MAX_TEILE Stangen mit Zufallskoordinaten im Zentimeter-Raster in einen Link unter MAX_HASH_ZEICHEN', () => {
    const r = zufall(4);
    const cm = (min: number, max: number): number => Math.round((min + r() * (max - min)) * 100) / 100;
    const hex = (): string => Math.floor(r() * 0x100000000).toString(16).padStart(8, '0');
    const b = Bauwerk.von(
      Array.from(
        { length: MAX_TEILE },
        () => new Stange(`stange-${hex()}`, new Vec3(cm(-20, 20), 0, cm(-20, 20)), new Vec3(cm(-20, 20), cm(1, 4), cm(-20, 20)), 0.08),
      ),
    );
    const hash = codec.alsHash(b);
    expect(hash.length).toBeLessThan(MAX_HASH_ZEICHEN);
    expect(codec.ausHash(hash)?.objekte).toHaveLength(MAX_TEILE);
  });

  it('lädt eine gespeicherte Datei mit MAX_TEILE Planen voller Genauigkeit und lehnt ein Teil mehr ab', async () => {
    const r = zufall(7);
    const planen = Array.from({ length: MAX_TEILE + 1 }, (_, i) => {
      const start = new Vec3(r() * 40 - 20, 2 + r(), r() * 40 - 20);
      const ende = start.add(new Vec3(3 + r(), r() - 0.5, r() - 0.5));
      return new Plane(`plane-${i.toString(16).padStart(8, '0')}`, start, ende, { ...STANDARD_PLANE, form: 'satteldach' });
    });
    // Wie Teilen.speichere: eingerücktes JSON. Planen sind die Art mit den meisten Feldern, also die größte Datei.
    const datei = (n: number): File =>
      new File([JSON.stringify(serializer.zuJson(Bauwerk.von(planen.slice(0, n))), null, 2)], 'lagerbau.json', { type: 'application/json' });
    const voll = datei(MAX_TEILE);
    expect(voll.size).toBeLessThanOrEqual(MAX_JSON_ZEICHEN);
    expect((await new Teilen().lade(voll)).objekte).toHaveLength(MAX_TEILE);
    await expect(new Teilen().lade(datei(MAX_TEILE + 1))).rejects.toThrow(`Ungültige Bauwerk-Daten: mehr als ${MAX_TEILE} Teile`);
  });
```

Die übrigen Tests in `share.test.ts` bleiben unverändert; die Größentests mit `MAX_TEILE` laufen jetzt mit 2000 Teilen.

- [ ] **Step 2: Test für die alten Formate schreiben**

Neue Datei `src/share/AltesFormat.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Platzbedarf } from '../model/Platzbedarf';
import { BauwerkSerializer } from './BauwerkSerializer';

const serializer = new BauwerkSerializer();

type V3 = [number, number, number];

// Dieselben Daten wie in e2e/smoke.spec.ts (v1), e2e/abspannung.spec.ts (v2) und e2e/planen.spec.ts (v3).
const ABOCK_SPITZE: V3 = [0, Math.sqrt(2.2 ** 2 - 0.8 ** 2), 0];
const DREIBEIN_SPITZE: V3 = [2.5, Math.sqrt(2.2 ** 2 - 0.7 ** 2), 0];
const ABOCK = { id: 'abock', typ: 'abock', position: [0, 0, 0], drehung: Math.PI / 2, params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 } };
const DREIBEIN = { id: 'dreibein', typ: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 } };
const seil = (id: string, x: number) => ({ id, start: ABOCK_SPITZE, ende: [x, 0, 0] });

/** Der First ragt wie bei Stange.zwischen an beiden Enden 0,2 m über die Spitzen hinaus. */
function first(): { id: string; start: V3; ende: V3; durchmesser: number } {
  const d = DREIBEIN_SPITZE.map((x, i) => x - ABOCK_SPITZE[i]!);
  const laenge = Math.hypot(...d);
  const r = d.map((x) => x / laenge);
  return {
    id: 'first',
    start: ABOCK_SPITZE.map((x, i) => x - r[i]! * 0.2) as V3,
    ende: DREIBEIN_SPITZE.map((x, i) => x + r[i]! * 0.2) as V3,
    durchmesser: 0.08,
  };
}

const V1 = { version: 1, gruppen: [ABOCK, DREIBEIN], stangen: [] };
const V2 = { version: 2, gruppen: [ABOCK], stangen: [], seile: [seil('l', -1.5), seil('r', 1.5)], baeume: [] };
const V3_DACH = {
  version: 3,
  gruppen: [ABOCK, DREIBEIN],
  stangen: [first()],
  seile: [],
  baeume: [],
  planen: [{ id: 'dach', start: ABOCK_SPITZE, ende: DREIBEIN_SPITZE, breite: 3, laenge: 4, form: 'satteldach', neigung: 30, seite: 1 }],
};

/** Was vom Lesen abhängt und man sieht: Reihenfolgen, Bünde, Heringe, Platzbedarf. */
function fingerabdruck(daten: unknown) {
  const b = serializer.ausJson(daten);
  const p = Platzbedarf.aus(b);
  return {
    objekte: b.objekte.map((o) => o.id),
    stangen: b.stangen().map((s) => s.id),
    buende: b.buende().map((x) => `${x.id}:${x.stangenIds.join('+')}`),
    heringe: b.heringe().map((h) => `${h.id}:${h.seilIds.join('+')}@${h.position.toArray().map((v) => v.toFixed(3)).join(',')}`),
    platz: p === null ? [] : [p.minX, p.maxX, p.minZ, p.maxZ],
  };
}

const imRahmen = (ist: readonly number[], soll: readonly number[]): void => {
  expect(ist).toHaveLength(soll.length);
  soll.forEach((w, i) => expect(ist[i]).toBeCloseTo(w, 2));
};

const ABOCK_STANGEN = ['abock-bein-0', 'abock-bein-1', 'abock-riegel'];
const DREIBEIN_STANGEN = ['dreibein-bein-0', 'dreibein-bein-1', 'dreibein-bein-2'];

// Die erwarteten Werte wurden am 05.10.2026 vor E0 (Code-Stand 6b4d36d) mit dem alten Serializer gemessen.
describe('Alte Formate 1–3 lesen wie vor E0 (Spec v3, D3)', () => {
  it('v1-Link aus e2e/smoke.spec.ts', () => {
    const f = fingerabdruck(V1);
    expect(f.objekte).toEqual(['abock', 'dreibein']);
    expect(f.stangen).toEqual([...ABOCK_STANGEN, ...DREIBEIN_STANGEN]);
    expect(f.buende).toEqual([
      'bund-0:abock-bein-0+abock-bein-1',
      'bund-1:abock-bein-0+abock-riegel',
      'bund-2:abock-bein-1+abock-riegel',
      'bund-3:dreibein-bein-0+dreibein-bein-1+dreibein-bein-2',
    ]);
    expect(f.heringe).toEqual([]);
    imRahmen(f.platz, [0, 3.2, -0.8, 0.8]);
  });

  it('v2-Link aus e2e/abspannung.spec.ts', () => {
    const f = fingerabdruck(V2);
    expect(f.objekte).toEqual(['abock', 'l', 'r']);
    expect(f.stangen).toEqual(ABOCK_STANGEN);
    expect(f.buende).toEqual(['bund-0:abock-bein-0+abock-bein-1', 'bund-1:abock-bein-0+abock-riegel', 'bund-2:abock-bein-1+abock-riegel']);
    expect(f.heringe).toEqual(['hering-0:l@-1.500,0.000,0.000', 'hering-1:r@1.500,0.000,0.000']);
    imRahmen(f.platz, [-1.5, 1.5, -0.8, 0.8]);
  });

  it('v3-Link aus e2e/planen.spec.ts', () => {
    const f = fingerabdruck(V3_DACH);
    expect(f.objekte).toEqual(['abock', 'dreibein', 'first', 'dach']);
    expect(f.stangen).toEqual([...ABOCK_STANGEN, ...DREIBEIN_STANGEN, 'first']);
    expect(f.buende).toEqual([
      'bund-0:abock-bein-0+abock-bein-1+first',
      'bund-1:abock-bein-0+abock-riegel',
      'bund-2:abock-bein-1+abock-riegel',
      'bund-3:dreibein-bein-0+dreibein-bein-1+dreibein-bein-2+first',
    ]);
    expect(f.heringe).toEqual([]);
    imRahmen(f.platz, [-0.75, 3.261, -1.299, 1.299]);
  });

  it('übersetzt die Listen in der alten Reihenfolge: Gruppen, Stangen, Bäume, Planen, Seile', () => {
    const daten = {
      version: 3,
      gruppen: [DREIBEIN],
      stangen: [{ id: 's', start: [8, 0, 0], ende: [8, 2, 0], durchmesser: 0.08 }],
      seile: [{ id: 'l', start: [8, 2, 0], ende: [9, 0, 0] }],
      baeume: [{ id: 'b', position: [20, 0, 0], durchmesser: 0.3, hoehe: 8 }],
      planen: [{ id: 'p', start: [0, 2, 5], ende: [4, 2, 5], breite: 3, laenge: 4, form: 'eben', neigung: 30, seite: 1 }],
    };
    const b = serializer.ausJson(daten);
    expect(b.objekte.map((o) => `${o.art}:${o.id}`)).toEqual(['dreibein:dreibein', 'stange:s', 'baum:b', 'plane:p', 'seil:l']);
    const v4 = serializer.zuJson(b);
    expect(v4.version).toBe(4);
    expect(v4.objekte.map((o) => o.id)).toEqual(['dreibein', 's', 'b', 'p', 'l']);
  });

  it('übergeht in v1 Seile, Bäume und Planen und in v2 Planen, auch wenn die Listen dastehen', () => {
    const plane = { id: 'p', start: [0, 2, 5], ende: [4, 2, 5], breite: 3, laenge: 4, form: 'eben', neigung: 30, seite: 1 };
    const seilDaten = { id: 'l', start: [0, 2, 0], ende: [2, 0, 0] };
    expect(serializer.ausJson({ version: 1, gruppen: [], stangen: [], seile: [seilDaten], planen: [plane] }).istLeer).toBe(true);
    const v2 = serializer.ausJson({ version: 2, gruppen: [], stangen: [], seile: [seilDaten], baeume: [], planen: [plane] });
    expect(v2.objekte.map((o) => o.id)).toEqual(['l']);
  });
});
```

- [ ] **Step 3: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/share`
Expected: FAIL. Der Serializer schreibt noch `version: 3` ohne `objekte` (die Rundreise-Tests und „speichert Gruppen …“ scheitern), „erlaubt 2000 Teile“ scheitert an `MAX_TEILE = 500`, und in `AltesFormat.test.ts` scheitert „übersetzt die Listen …“ an `v4.version`. Die neuen Ablehnungs-Zeilen sind schon grün, weil die alte Version 4 gar nicht kennt; sie sichern das neue Lesen ab.

- [ ] **Step 4: Alte Formate übersetzen**

Neue Datei `src/share/AltesFormat.ts`:

```ts
import { liste, objekt, type Roh } from './lesen';

/** Ein Eintrag einer alten Liste, mit der Art, die sich aus der Liste ergibt (bei Gruppen aus `typ`). */
const mitArt =
  (name: string, art: (roh: Roh) => unknown) =>
  (d: unknown): Roh => {
    const roh = objekt(d, name);
    return { ...roh, art: art(roh) };
  };

/**
 * Übersetzt die fünf Listen der Formate 1–3 in Objekte im Format 4, in der alten Lesereihenfolge
 * Gruppen, Stangen, Bäume, Planen, Seile (Spec v3, D3). So bleiben Reihenfolge, Bünde und Heringe wie vorher.
 * Version 1 kannte noch keine Seile und Bäume, Version 2 noch keine Planen.
 */
export function alteObjekte(o: Roh): Roh[] {
  const gruppen = liste(o.gruppen, 'gruppen');
  const stangen = liste(o.stangen, 'stangen');
  const seile = o.version === 1 ? [] : liste(o.seile, 'seile');
  const baeume = o.version === 1 ? [] : liste(o.baeume, 'baeume');
  const planen = o.version === 3 ? liste(o.planen, 'planen') : [];
  return [
    ...gruppen.map(mitArt('Baugruppe', (roh) => roh.typ)),
    ...stangen.map(mitArt('Stange', () => 'stange')),
    ...baeume.map(mitArt('Baum', () => 'baum')),
    ...planen.map(mitArt('Plane', () => 'plane')),
    ...seile.map(mitArt('Seil', () => 'seil')),
  ];
}
```

- [ ] **Step 5: Serializer auf Format v4 und die Grenze auf 2000**

`src/share/BauwerkSerializer.ts` ganz ersetzen:

```ts
import type { ObjektJson } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import { Bauwerk } from '../model/Bauwerk';
import type { LagerObjekt } from '../model/LagerObjekt';
import { alteObjekte } from './AltesFormat';
import { MAX_TEILE } from './grenzen';
import { liste, objekt, type Roh, text } from './lesen';

/** Datenformat 4 (Spec v3, D3): eine Liste aller Objekte in der Reihenfolge des Bauwerks. */
export interface BauwerkJson {
  readonly version: 4;
  readonly objekte: readonly ObjektJson[];
}

/** Bauwerk ↔ JSON. Jede Art liest und schreibt ihre Objekte selbst; Gruppen über ihre Parameter, damit Links kurz bleiben. */
export class BauwerkSerializer {
  constructor(private readonly arten: ObjektRegister = standardArten()) {}

  zuJson(bauwerk: Bauwerk): BauwerkJson {
    return { version: 4, objekte: bauwerk.objekte.map((o) => this.arten.artVon(o).zuJson(o)) };
  }

  ausJson(daten: unknown): Bauwerk {
    try {
      return this.lies(daten);
    } catch (e) {
      throw new Error(`Ungültige Bauwerk-Daten: ${(e as Error).message}`);
    }
  }

  private lies(daten: unknown): Bauwerk {
    const roh = this.rohObjekte(objekt(daten, 'Bauwerk'));
    if (roh.length > MAX_TEILE) throw new Error(`mehr als ${MAX_TEILE} Teile`);
    return Bauwerk.von(roh.map((r) => this.liesObjekt(r)));
  }

  /** Version 4 bringt die Liste mit; 1–3 werden in ihrer alten Reihenfolge übersetzt. */
  private rohObjekte(o: Roh): readonly unknown[] {
    if (o.version === 4) return liste(o.objekte, 'objekte');
    if (o.version === 1 || o.version === 2 || o.version === 3) return alteObjekte(o);
    throw new Error('unbekannte Version');
  }

  private liesObjekt(daten: unknown): LagerObjekt {
    const roh = objekt(daten, 'Objekt');
    const name = text(roh.art, 'art');
    const art = this.arten.finde(name);
    if (!art) throw new Error(`unbekannte Art ${name}`);
    return art.ausJson(roh);
  }
}
```

In `src/share/grenzen.ts` die Zeile

```ts
export const MAX_TEILE = 500;
```

ersetzen durch

```ts
/** Spec v3, D3: ganze Lager. 2000 Stangen im Zentimeter-Raster passen in einen Link unter MAX_HASH_ZEICHEN (Test in share.test.ts). */
export const MAX_TEILE = 2000;
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run src/share`
Expected: PASS (`share.test.ts` 42 Tests, `AltesFormat.test.ts` 5, `LinkBasis.test.ts` unverändert).
Run: `npx vitest run`
Expected: 42 Dateien, 368 Tests, alle grün.
Run: `npx tsc --noEmit`
Expected: Exit 0.
Run: `grep -nE "dreibein|abock|'stange'|'seil'|'baum'|'plane'|instanceof" src/share/BauwerkSerializer.ts`
Expected: keine Ausgabe (keine Fallunterscheidung je Art mehr, Spec-Verifikation).
Run: `npm run e2e`
Expected: 6 passed. Die drei Specs nutzen v1-, v2- und v3-Links; „Link kopieren“ schreibt jetzt v4.

- [ ] **Step 7: Commit**

```bash
git add src/share/BauwerkSerializer.ts src/share/AltesFormat.ts src/share/AltesFormat.test.ts src/share/grenzen.ts src/share/share.test.ts
git commit -m "feat: write data format v4 and raise the part limit to 2000"
```

---

### Task 6: Ein `Treffer` für alle Arten, Einrasten über das Register

**Files:**
- Modify: `src/editor/SnapService.ts` (ganze Datei), `src/editor/Werkzeuge.ts` (nur `SelectTool.onKlick`), `src/editor/Szene.ts` (nur Treffer und `userData`; Task 9b ersetzt die Datei)
- Test: `src/editor/SnapService.test.ts`, `src/editor/Editor.test.ts` (nur `Treffer`-Literale; dazu je ein neuer Test)

**Interfaces:**
- Consumes: `ObjektRegister.artVon/art`, `ObjektArt.fangpunkte/beiTreffer/klick`, `FangArt`, `Fangpunkt` (Task 4b); `Bauwerk.objekte/besitzer/auswahlIdFuer` (Task 2).
- Produces:
  - `export type Treffer = { readonly art: 'boden'; readonly punkt: Vec3 } | { readonly art: 'objekt'; readonly objektArt: ArtName; readonly id: string; readonly punkt: Vec3 }`;
  - `export type SnapArt = FangArt | 'boden'`; `SnapPunkt { punkt: Vec3; art: SnapArt }` (Form unverändert);
  - `new SnapService(arten: ObjektRegister = standardArten(), radius = SNAP_RADIUS, raster = BODEN_RASTER)`; `snap(treffer, bauwerk, mitOesen = false)` und `aufRaster(p)` unverändert;
  - `Szene` liefert die neuen Treffer; ihr Konstruktor nimmt optional `arten: ObjektRegister`, und `treffer(e, klickZiele: readonly ArtName[])`.

- [ ] **Step 1: Treffer-Literale umstellen und zwei Tests ergänzen**

In `src/editor/SnapService.test.ts` die `Treffer`-Literale ersetzen; die Assertions bleiben. Je Zeile alt → neu:

| Test | alt | neu |
|---|---|---|
| rastet nahe der Spitze auf die Spitze ein | `{ art: 'stange', punkt: dreibein.spitze().add(new Vec3(0.1, 0, 0)), stangeId: 'd-bein-0' }` | `{ art: 'objekt', objektArt: 'dreibein', id: 'd-bein-0', punkt: dreibein.spitze().add(new Vec3(0.1, 0, 0)) }` |
| projiziert einen Treffer mitten auf einer Stange auf ihre Achse | `{ art: 'stange', punkt: mitte.add(new Vec3(0, 0, 0.04)), stangeId: 'd-bein-0' }` | `{ art: 'objekt', objektArt: 'dreibein', id: 'd-bein-0', punkt: mitte.add(new Vec3(0, 0, 0.04)) }` |
| fällt bei einer unbekannten Stange auf das Raster zurück | `{ art: 'stange', punkt: new Vec3(5.04, 1, 5), stangeId: 'weg' }` | `{ art: 'objekt', objektArt: 'stange', id: 'weg', punkt: new Vec3(5.04, 1, 5) }` |
| rastet am Baumstamm genau am getroffenen Punkt ein | `{ art: 'baum', punkt: new Vec3(4.85, 1.7, 0), baumId: 'b' }` | `{ art: 'objekt', objektArt: 'baum', id: 'b', punkt: new Vec3(4.85, 1.7, 0) }` |
| nimmt bei einem unbekannten Baum den Boden darunter | `{ art: 'baum', punkt: new Vec3(4.87, 1.7, 0), baumId: 'weg' }` | `{ art: 'objekt', objektArt: 'baum', id: 'weg', punkt: new Vec3(4.87, 1.7, 0) }` |
| nimmt bei einem Seiltreffer fern von Einrastpunkten den Boden darunter | `{ art: 'seil', punkt: new Vec3(3, 1, 3), seilId: 's' }` | `{ art: 'objekt', objektArt: 'seil', id: 's', punkt: new Vec3(3, 1, 3) }` |
| rastet im Seil-Werkzeug auf die nächste Öse … | `{ art: 'plane', punkt: new Vec3(1.4, 2, 3.6), planeId: 'pl' }` | `{ art: 'objekt', objektArt: 'plane', id: 'pl', punkt: new Vec3(1.4, 2, 3.6) }` |
| lässt im Seil-Werkzeug eine Spitze in Reichweite … | `{ art: 'plane', punkt: spitze.add(new Vec3(0.07, 0, 0)), planeId: 'pl' }` | `{ art: 'objekt', objektArt: 'plane', id: 'pl', punkt: spitze.add(new Vec3(0.07, 0, 0)) }` |

Dann in `src/editor/SnapService.test.ts` die Importe um `import { ABock } from '../model/ABock';` ergänzen, `STANDARD_ABOCK` in den Import aus `'../model/params'` aufnehmen und nach dem letzten Test einfügen:

```ts

  it('projiziert einen Treffer auf den Riegel eines A-Bocks auf dessen Achse (Spec v3, D4)', () => {
    const abock = new ABock('a', new Vec3(6, 0, 0), 0, STANDARD_ABOCK);
    const p = snap.snap({ art: 'objekt', objektArt: 'abock', id: 'a-riegel', punkt: new Vec3(6.3, 0.45, 0.04) }, bauwerk.mitGruppe(abock));
    expect(p.art).toBe('stange');
    expect(p.punkt.equals(new Vec3(6.3, 0.4, 0), 1e-9)).toBe(true);
  });
```

In `src/editor/Editor.test.ts` ebenso, Assertions unverändert:

| Test | alt | neu |
|---|---|---|
| setzt einen A-Bock und ignoriert Stangenklicks beim Platzieren | `{ art: 'stange', punkt: Vec3.NULL, stangeId: 'x' }` | `{ art: 'objekt', objektArt: 'stange', id: 'x', punkt: Vec3.NULL }` |
| zieht eine Stange vom Boden zur Dreibein-Spitze … | `{ art: 'stange', punkt: spitze.add(new Vec3(0.05, 0, 0)), stangeId: 'd-bein-0' }` | `{ art: 'objekt', objektArt: 'dreibein', id: 'd-bein-0', punkt: spitze.add(new Vec3(0.05, 0, 0)) }` |
| wählt per Klick die ganze Gruppe, dreht sie mit R … | `{ art: 'stange', punkt: Vec3.NULL, stangeId: 'd-bein-1' }` | `{ art: 'objekt', objektArt: 'dreibein', id: 'd-bein-1', punkt: Vec3.NULL }` |
| hebt die Auswahl bei Bodenklick auf … | `{ art: 'stange', punkt: Vec3.NULL, stangeId: 'd-bein-0' }` | `{ art: 'objekt', objektArt: 'dreibein', id: 'd-bein-0', punkt: Vec3.NULL }` |
| spannt ein Seil von der Spitze zum Boden … | `{ art: 'stange', punkt: dreibein.spitze(), stangeId: dreibein.stangen()[0]!.id }` | `{ art: 'objekt', objektArt: 'dreibein', id: dreibein.stangen()[0]!.id, punkt: dreibein.spitze() }` |
| wählt Seile und Bäume per Klick aus und löscht sie | `{ art: 'seil', punkt: new Vec3(1, 1, 0), seilId: 's' }` | `{ art: 'objekt', objektArt: 'seil', id: 's', punkt: new Vec3(1, 1, 0) }` |
| (derselbe Test) | `{ art: 'baum', punkt: new Vec3(4.85, 1, 0), baumId: 'b' }` | `{ art: 'objekt', objektArt: 'baum', id: 'b', punkt: new Vec3(4.85, 1, 0) }` |
| neigt eine hängende Plane mit 30° und flacher … | `{ art: 'stange', punkt: new Vec3(0, hoehe, 0), stangeId: 'p1' }` | `{ art: 'objekt', objektArt: 'stange', id: 'p1', punkt: new Vec3(0, hoehe, 0) }` |
| (derselbe Test) | `{ art: 'stange', punkt: new Vec3(4, hoehe, 0), stangeId: 'p2' }` | `{ art: 'objekt', objektArt: 'stange', id: 'p2', punkt: new Vec3(4, hoehe, 0) }` |
| meldet eine Plane, die selbst flach in den Boden reicht … | `{ art: 'stange', punkt: new Vec3(2, 1, 0), stangeId: 'p' }` | `{ art: 'objekt', objektArt: 'stange', id: 'p', punkt: new Vec3(2, 1, 0) }` |
| meldet eine fast senkrechte Aufhängelinie … | `{ art: 'stange', punkt: new Vec3(0, 3, 0), stangeId: 'p' }` | `{ art: 'objekt', objektArt: 'stange', id: 'p', punkt: new Vec3(0, 3, 0) }` |
| hängt ein Seil per Klick auf die Plane an deren nächste Öse | `{ art: 'plane', punkt: new Vec3(3.6, 2, -0.3), planeId: 'pl' }` | `{ art: 'objekt', objektArt: 'plane', id: 'pl', punkt: new Vec3(3.6, 2, -0.3) }` |
| wählt eine Plane per Klick aus und löscht sie | `{ art: 'plane', punkt: new Vec3(2, 1.5, -1), planeId: 'pl' }` | `{ art: 'objekt', objektArt: 'plane', id: 'pl', punkt: new Vec3(2, 1.5, -1) }` |

Danach in `src/editor/Editor.test.ts` die Importe um `import { ABock } from '../model/ABock';` ergänzen, `STANDARD_ABOCK` in den Import aus `'../model/params'` aufnehmen und nach dem letzten Test einfügen:

```ts

  it('wählt per Klick auf den Riegel den ganzen A-Bock (Spec v3, D4)', () => {
    const abock = new ABock('a', new Vec3(6, 0, 0), 0, STANDARD_ABOCK);
    const e = neuerEditor(Bauwerk.leer().mitGruppe(abock));
    e.klick({ art: 'objekt', objektArt: 'abock', id: 'a-riegel', punkt: new Vec3(6.3, 0.4, 0) });
    expect(e.zustand().auswahl).toBe('a');
  });
```

Run: `grep -nE "art: '(stange|baum|seil|plane)', punkt" src/editor/SnapService.test.ts src/editor/Editor.test.ts`
Expected: keine Ausgabe (alle alten Treffer-Literale sind umgestellt; `{ art: 'plane', planeId: 'pl' }` in „hängt ein Seil … an deren nächste Öse“ ist eine `Verankerung` und bleibt).

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/editor/SnapService.test.ts src/editor/Editor.test.ts`
Expected: FAIL. Der alte `SnapService` kennt `art: 'objekt'` nicht und rastet z. B. „mitten auf einer Stange“ auf den Boden statt auf die Achse; das alte `SelectTool` wählt bei `art: 'objekt'` nichts aus.

- [ ] **Step 3: `SnapService` über das Register**

`src/editor/SnapService.ts` ganz ersetzen:

```ts
import type { FangArt, Fangpunkt } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName } from '../model/LagerObjekt';
import { Vec3 } from '../model/Vec3';
import { BODEN_RASTER, SNAP_RADIUS } from './konstanten';

/**
 * Was ein Klick getroffen hat (Spec v3, D4). Bei einem Objekt ist `id` die Teil-id (z. B. eine Stange einer Baugruppe)
 * und `objektArt` die Art des Objekts, dem der Teil gehört.
 */
export type Treffer =
  | { readonly art: 'boden'; readonly punkt: Vec3 }
  | { readonly art: 'objekt'; readonly objektArt: ArtName; readonly id: string; readonly punkt: Vec3 };

export type SnapArt = FangArt | 'boden';

export interface SnapPunkt {
  readonly punkt: Vec3;
  readonly art: SnapArt;
}

/** Vorrang bei gleichem Abstand: Spitze → Bund → Ende → Öse (Spec v1, v2b). Stange und Baum kommen nur vom getroffenen Objekt. */
const VORRANG: Readonly<Record<FangArt, number>> = { spitze: 0, bund: 1, ende: 2, oese: 3, stange: 4, baum: 5 };

/** Macht aus einem Mausklick einen eindeutigen 3D-Punkt, nie einen freien Tiefenklick. Die Fangpunkte liefern die Arten. */
export class SnapService {
  constructor(
    private readonly arten: ObjektRegister = standardArten(),
    private readonly radius = SNAP_RADIUS,
    private readonly raster = BODEN_RASTER,
  ) {}

  /** @param mitOesen nur im Seil-Werkzeug: Planen-Ösen sind dann Fangpunkte (Spec v2b, D2). */
  snap(treffer: Treffer, bauwerk: Bauwerk, mitOesen = false): SnapPunkt {
    const amObjekt = treffer.art === 'objekt' ? this.amGetroffenen(treffer, bauwerk, mitOesen) : null;
    // Eine Öse am getroffenen Objekt gilt egal wie weit, damit kein Seilende in der Luft hängt.
    // Spitze, Bund oder Ende in Reichweite gewinnen trotzdem (v2b, Review M-1).
    if (amObjekt?.art === 'oese') return this.naechsterKandidat(treffer.punkt, bauwerk, false) ?? amObjekt;
    return this.naechsterKandidat(treffer.punkt, bauwerk, mitOesen) ?? amObjekt ?? { punkt: this.aufRaster(treffer.punkt), art: 'boden' };
  }

  aufRaster(p: Vec3): Vec3 {
    const runde = (x: number): number => Math.round(x / this.raster) * this.raster;
    return new Vec3(runde(p.x), 0, runde(p.z));
  }

  /** Fangpunkt am getroffenen Objekt selbst, z. B. der Punkt auf der Achse der getroffenen Stange. Unbekannte ids: null. */
  private amGetroffenen(treffer: Extract<Treffer, { art: 'objekt' }>, bauwerk: Bauwerk, mitOesen: boolean): Fangpunkt | null {
    const besitzer = bauwerk.besitzer(treffer.id);
    return besitzer ? this.arten.artVon(besitzer).beiTreffer(besitzer, treffer.id, treffer.punkt, mitOesen) : null;
  }

  private naechsterKandidat(p: Vec3, bauwerk: Bauwerk, mitOesen: boolean): Fangpunkt | null {
    const kandidaten: Fangpunkt[] = [
      ...bauwerk.objekte.flatMap((o) => this.arten.artVon(o).fangpunkte(o, mitOesen)),
      ...bauwerk.buende().map((b): Fangpunkt => ({ punkt: b.position, art: 'bund' })),
    ];
    return kandidaten.reduce<Fangpunkt | null>((bester, k) => {
      const d = k.punkt.distanceTo(p);
      if (d > this.radius) return bester;
      if (bester === null) return k;
      const besterDist = bester.punkt.distanceTo(p);
      if (d < besterDist - 1e-9) return k;
      if (Math.abs(d - besterDist) < 1e-9 && VORRANG[k.art] < VORRANG[bester.art]) return k;
      return bester;
    }, null);
  }
}
```

- [ ] **Step 4: `SelectTool` ohne Fälle je Art**

In `src/editor/Werkzeuge.ts` den Kommentar und die Methode `onKlick` von `SelectTool` ersetzen. Alt:

```ts
/** Klick auf eine Stange wählt sie (bzw. ihre Gruppe), auf ein Seil, einen Baum oder eine Plane wählt diese, auf den Boden hebt die Auswahl auf. */
```

```ts
  onKlick(treffer: Treffer, k: EditorKontext): void {
    switch (treffer.art) {
      case 'stange':
        k.waehle(k.bauwerk.auswahlIdFuer(treffer.stangeId));
        break;
      case 'baum':
        k.waehle(treffer.baumId);
        break;
      case 'seil':
        k.waehle(treffer.seilId);
        break;
      case 'plane':
        k.waehle(treffer.planeId);
        break;
      case 'boden':
        k.waehle(null);
        break;
    }
  }
```

Neu:

```ts
/** Klick auf ein Objekt wählt es aus (bei einer Gruppenstange die ganze Gruppe), ein Klick auf den Boden hebt die Auswahl auf. */
```

```ts
  onKlick(treffer: Treffer, k: EditorKontext): void {
    k.waehle(treffer.art === 'boden' ? null : k.bauwerk.auswahlIdFuer(treffer.id));
  }
```

- [ ] **Step 5: `Szene` liefert die neuen Treffer (Zwischenstand bis Task 9b)**

In `src/editor/Szene.ts`:

1. Die Zeile `import type { KlickZiel } from './Werkzeuge';` und die Zeile `const ZIEL_SCHLUESSEL: Record<KlickZiel, string> = { seil: 'seilId', plane: 'planeId' };` löschen. Nach `import { OrbitControls } … ;` einfügen:

```ts
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
```

und nach `import type { Bauwerk } from '../model/Bauwerk';` einfügen:

```ts
import type { ArtName } from '../model/LagerObjekt';
```

2. `constructor(private readonly container: HTMLElement) {` ersetzen durch

```ts
  constructor(
    private readonly container: HTMLElement,
    private readonly arten: ObjektRegister = standardArten(),
  ) {
```

3. In `zeige` die Zeile `this.bau.add(this.stangenMesh(s, istMarkiert));` ersetzen durch

```ts
      this.bau.add(this.stangenMesh(s, istMarkiert, bauwerk.besitzer(s.id)?.art ?? 'stange'));
```

4. Die Methode `treffer` ganz ersetzen durch:

```ts
  treffer(e: PointerEvent, klickZiele: readonly ArtName[]): Treffer | null {
    const rect = this.leinwand.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kamera);
    // Arten mit Klickverhalten „immer“ fangen jeden Klick, die anderen nur, wenn das Werkzeug sie nennt (Spec v2b, D2).
    const ziele = this.bau.children.filter((k) => {
      const art = k.userData.art as ArtName | undefined;
      return art !== undefined && (this.arten.art(art).klick === 'immer' || klickZiele.includes(art));
    });
    const getroffen = this.raycaster.intersectObjects(ziele, false)[0];
    if (getroffen) {
      const daten = getroffen.object.userData;
      const punkt = new Vec3(getroffen.point.x, getroffen.point.y, getroffen.point.z);
      return { art: 'objekt', objektArt: daten.art as ArtName, id: daten.teilId as string, punkt };
    }
    const aufBoden = this.raycaster.intersectObject(this.boden, false)[0];
    return aufBoden ? { art: 'boden', punkt: new Vec3(aufBoden.point.x, 0, aufBoden.point.z) } : null;
  }
```

5. Die Methode `stangenMesh` ersetzen durch:

```ts
  private stangenMesh(s: Stange, markiert: boolean, art: ArtName): THREE.Mesh {
    const mesh = this.zylinder(s.start, s.ende, s.durchmesser / 2, markiert ? MARKIERT : HOLZ);
    mesh.userData.art = art;
    mesh.userData.teilId = s.id;
    return mesh;
  }
```

6. Die drei übrigen Zuweisungen an `userData` ersetzen:
   - in `seilMeshes`: `greifbar.userData.seilId = s.id;` → `greifbar.userData.art = 'seil';` und `greifbar.userData.teilId = s.id;`
   - in `baumMeshes`: `stamm.userData.baumId = b.id;` → `stamm.userData.art = 'baum';` und `stamm.userData.teilId = b.id;`
   - in `planenMesh`: `mesh.userData.planeId = p.id;` → `mesh.userData.art = 'plane';` und `mesh.userData.teilId = p.id;`

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run src/editor`
Expected: PASS (`SnapService.test.ts` 12 Tests, `Editor.test.ts` 25 Tests, `Verlauf.test.ts` unverändert).
Run: `npx vitest run`
Expected: 42 Dateien, 370 Tests, alle grün.
Run: `npx tsc --noEmit`
Expected: Exit 0. `main.ts` übergibt `editor.klickZiele` (noch `readonly KlickZiel[]`) an `treffer(e, klickZiele: readonly ArtName[])`; das passt, weil `KlickZiel` eine Teilmenge von `ArtName` ist.
Run: `grep -rnE "userData\.(stangeId|baumId|seilId|planeId)|treffer\.(stangeId|baumId|seilId|planeId)" src`
Expected: keine Ausgabe.

- [ ] **Step 7: Commit**

```bash
git add src/editor/SnapService.ts src/editor/SnapService.test.ts src/editor/Werkzeuge.ts src/editor/Szene.ts src/editor/Editor.test.ts
git commit -m "refactor: use one generic Treffer and snap via the registry"
```

---

### Task 7: Ein `PlatziereTool` statt fünf Werkzeugen, Klickziele aus dem Register

**Files:**
- Modify: `src/editor/Werkzeuge.ts` (ganze Datei), `src/editor/Editor.ts`, `src/main.ts`
- Test: `src/editor/Werkzeuge.test.ts` (neu); `src/editor/Editor.test.ts` bleibt unverändert und muss grün bleiben
- `index.html` bleibt unverändert: Die `data-werkzeug`-Werte der Knöpfe sind schon die Artnamen.

**Interfaces:**
- Consumes: `ObjektArt.platzieren`, `ObjektArt.name/label`, `ObjektRegister.art/wahlweise/mitOesen` (Task 4b); `SnapService.snap/aufRaster`, `Treffer`, `SnapPunkt` (Task 6); `Bauwerk.mit` (Task 2).
- Produces:
  - `export type WerkzeugName = ArtName | 'auswahl'`;
  - `Werkzeug.klickZiele: readonly ArtName[]` (der Typ `KlickZiel` entfällt);
  - `class PlatziereTool(art: ObjektArt, klickZiele: readonly ArtName[] = [])` mit `name: ArtName`, `angefangen`, `onKlick`, `abbrechen`;
  - `class SelectTool(klickZiele: readonly ArtName[])`;
  - `erzeugeWerkzeug(name: WerkzeugName, arten: ObjektRegister = standardArten()): Werkzeug`;
  - `EditorOptionen.arten?: ObjektRegister`; `Editor.klickZiele: readonly ArtName[]`.
  - `PlaceBaugruppeTool`, `PlaceBaumTool`, `DrawStangeTool`, `DrawSeilTool`, `DrawPlaneTool` und `KlickZiel` gibt es danach nicht mehr.

- [ ] **Step 1: Failing test schreiben**

Neue Datei `src/editor/Werkzeuge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import { ART_NAMEN } from '../model/LagerObjekt';
import { erzeugeWerkzeug, PlatziereTool, SelectTool } from './Werkzeuge';

describe('Werkzeuge aus dem Register (Spec v3, D4)', () => {
  it('gibt es für jede Art als Platzier-Werkzeug mit ihrem Namen, dazu die Auswahl', () => {
    for (const name of ART_NAMEN) {
      const w = erzeugeWerkzeug(name);
      expect(w).toBeInstanceOf(PlatziereTool);
      expect(w.name).toBe(name);
      expect(w.angefangen).toBeNull();
    }
    expect(erzeugeWerkzeug('auswahl')).toBeInstanceOf(SelectTool);
  });

  it('leitet die Klickziele aus dem Register ab', () => {
    const ohnePlane = new ObjektRegister(standardArten().alle.filter((a) => a.name !== 'plane'));
    expect(erzeugeWerkzeug('auswahl', ohnePlane).klickZiele).toEqual(['seil']);
    expect(erzeugeWerkzeug('seil', ohnePlane).klickZiele).toEqual([]);
    expect(erzeugeWerkzeug('seil').klickZiele).toEqual(['plane']);
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run src/editor/Werkzeuge.test.ts`
Expected: FAIL. `PlatziereTool` gibt es nicht, und `erzeugeWerkzeug` nimmt kein Register.

- [ ] **Step 3: Werkzeuge neu**

`src/editor/Werkzeuge.ts` ganz ersetzen:

```ts
import type { ObjektArt } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import type { SnapPunkt, SnapService, Treffer } from './SnapService';

export type WerkzeugName = ArtName | 'auswahl';

/** Was ein Werkzeug vom Editor sehen und ändern darf. Diese Methoden benachrichtigen nicht. */
export interface EditorKontext {
  readonly bauwerk: Bauwerk;
  readonly snap: SnapService;
  aendere(neu: Bauwerk): void;
  waehle(id: string | null): void;
  neueId(praefix: string): string;
}

export interface Werkzeug {
  readonly name: WerkzeugName;
  readonly angefangen: Vec3 | null;
  /**
   * Welche Arten mit Klickverhalten `wahlweise` (Seile, Planen) Klicks fangen (Spec v2b, D2). Sonst trifft der Strahl,
   * was dahinter liegt: Ein großes Regendach blockiert so nicht das Setzen eines Dreibeins darunter.
   */
  readonly klickZiele: readonly ArtName[];
  onKlick(treffer: Treffer, kontext: EditorKontext): void;
  abbrechen(): void;
}

/**
 * Setzt ein Objekt einer Art (Spec v3, D4): im Modus `punkt` mit einem Bodenklick aufs Raster, im Modus `linie`
 * mit zwei Klicks auf Einrastpunkte. Liegen die zwei Punkte zu nah beieinander, passiert nichts.
 */
export class PlatziereTool implements Werkzeug {
  private start: SnapPunkt | null = null;

  constructor(
    private readonly art: ObjektArt,
    readonly klickZiele: readonly ArtName[] = [],
  ) {}

  get name(): ArtName {
    return this.art.name;
  }

  get angefangen(): Vec3 | null {
    return this.start?.punkt ?? null;
  }

  onKlick(treffer: Treffer, k: EditorKontext): void {
    const platzieren = this.art.platzieren;
    if (platzieren.modus === 'punkt') {
      if (treffer.art === 'boden') this.fuegeHinzu(k, platzieren.erzeuge(k.neueId(this.art.name), k.snap.aufRaster(treffer.punkt)));
      return;
    }
    const punkt = k.snap.snap(treffer, k.bauwerk, platzieren.fangtOesen);
    if (this.start === null) {
      this.start = punkt;
      return;
    }
    const start = this.start;
    this.start = null;
    if (start.punkt.distanceTo(punkt.punkt) < platzieren.mindestabstand) return;
    this.fuegeHinzu(k, platzieren.erzeuge(k.neueId(this.art.name), start.punkt, punkt.punkt));
  }

  abbrechen(): void {
    this.start = null;
  }

  private fuegeHinzu(k: EditorKontext, objekt: LagerObjekt): void {
    k.aendere(k.bauwerk.mit(objekt));
    k.waehle(objekt.id);
  }
}

/** Klick auf ein Objekt wählt es aus (bei einer Gruppenstange die ganze Gruppe), ein Klick auf den Boden hebt die Auswahl auf. */
export class SelectTool implements Werkzeug {
  readonly name = 'auswahl' as const;
  readonly angefangen: Vec3 | null = null;

  constructor(readonly klickZiele: readonly ArtName[]) {}

  onKlick(treffer: Treffer, k: EditorKontext): void {
    k.waehle(treffer.art === 'boden' ? null : k.bauwerk.auswahlIdFuer(treffer.id));
  }

  abbrechen(): void {}
}

/**
 * Die Klickziele kommen aus dem Register: Die Auswahl nennt alle Arten mit Klickverhalten `wahlweise`,
 * ein Werkzeug, das Ösen fängt, die Arten mit Ösen, alle anderen keine.
 */
export function erzeugeWerkzeug(name: WerkzeugName, arten: ObjektRegister = standardArten()): Werkzeug {
  if (name === 'auswahl') return new SelectTool(arten.wahlweise());
  const art = arten.art(name);
  const fangtOesen = art.platzieren.modus === 'linie' && art.platzieren.fangtOesen;
  return new PlatziereTool(art, fangtOesen ? arten.mitOesen() : []);
}
```

- [ ] **Step 4: Editor mit Register**

In `src/editor/Editor.ts`:

1. Die Zeile

```ts
import { type EditorKontext, erzeugeWerkzeug, type KlickZiel, type Werkzeug, type WerkzeugName } from './Werkzeuge';
```

ersetzen durch

```ts
import { type EditorKontext, erzeugeWerkzeug, type Werkzeug, type WerkzeugName } from './Werkzeuge';
```

und vor `import type { Bauwerk } from '../model/Bauwerk';` einfügen:

```ts
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
```

sowie nach `import type { Bauwerk } from '../model/Bauwerk';`:

```ts
import type { ArtName } from '../model/LagerObjekt';
```

2. In `EditorOptionen` als erstes Feld einfügen: `  readonly arten?: ObjektRegister;`

3. Die Felder und den Konstruktor ändern. Alt:

```ts
  readonly snap: SnapService;
  private verlauf: Verlauf<Bauwerk>;
```

```ts
  private werkzeug: Werkzeug = erzeugeWerkzeug('auswahl');
```

```ts
  constructor(anfang: Bauwerk, optionen: EditorOptionen = {}) {
    this.verlauf = Verlauf.start(anfang);
    this.snap = optionen.snap ?? new SnapService();
    this.idErzeuger = optionen.neueId ?? zufallsId;
  }
```

Neu:

```ts
  readonly snap: SnapService;
  private readonly arten: ObjektRegister;
  private verlauf: Verlauf<Bauwerk>;
```

```ts
  private werkzeug: Werkzeug;
```

```ts
  constructor(anfang: Bauwerk, optionen: EditorOptionen = {}) {
    this.verlauf = Verlauf.start(anfang);
    this.arten = optionen.arten ?? standardArten();
    this.snap = optionen.snap ?? new SnapService(this.arten);
    this.idErzeuger = optionen.neueId ?? zufallsId;
    this.werkzeug = erzeugeWerkzeug('auswahl', this.arten);
  }
```

4. `get klickZiele(): readonly KlickZiel[] {` ersetzen durch `get klickZiele(): readonly ArtName[] {`.

5. In `waehleWerkzeug` die Zeile `this.werkzeug = erzeugeWerkzeug(name);` ersetzen durch `this.werkzeug = erzeugeWerkzeug(name, this.arten);`.

- [ ] **Step 5: `main.ts` anschließen**

In `src/main.ts`:

1. Nach `import './style.css';` einfügen: `import { standardArten } from './arten/standardArten';`
2. Den Kommentar `/** Was ein Zwei-Klick-Werkzeug gerade spannt, für die Statuszeile. */` und die Zeile `const ZWEI_PUNKT_TEIL: …;` löschen.
3. Die Zeilen

```ts
const editor = new Editor(Bauwerk.leer());
const szene = new Szene(element('#ansicht'));
```

ersetzen durch

```ts
const arten = standardArten();
const editor = new Editor(Bauwerk.leer(), { arten });
const szene = new Szene(element('#ansicht'), arten);
```

4. Die Zeile `const teil = ZWEI_PUNKT_TEIL[z.werkzeug] ?? 'Teil';` ersetzen durch

```ts
  // Nur Zwei-Klick-Werkzeuge haben einen Startpunkt; ihr Label ist „Stange“, „Seil“ oder „Plane“.
  const teil = z.werkzeug === 'auswahl' ? 'Teil' : arten.art(z.werkzeug).label;
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run src/editor`
Expected: PASS (`Werkzeuge.test.ts` 2 Tests; `Editor.test.ts` 25 Tests unverändert grün, auch „legt pro Werkzeug fest, welche Teile Klicks fangen“ mit `['seil', 'plane']` und `['plane']`).
Run: `npx vitest run`
Expected: 43 Dateien, 372 Tests, alle grün.
Run: `npx tsc --noEmit`
Expected: Exit 0.
Run: `grep -rnE "KlickZiel|PlaceBaugruppeTool|PlaceBaumTool|DrawStangeTool|DrawSeilTool|DrawPlaneTool|ZWEI_PUNKT_TEIL" src`
Expected: keine Ausgabe.
Run: `grep -nE "instanceof|'(dreibein|abock|stange|seil|baum|plane)'" src/editor/Werkzeuge.ts`
Expected: keine Ausgabe (Spec-Verifikation: keine Fallunterscheidung je Art).
Run: `grep -o 'data-werkzeug="[a-z]*"' index.html`
Expected: `auswahl`, `dreibein`, `abock`, `stange`, `seil`, `plane`, `baum`, also genau die Artnamen und die Auswahl.

- [ ] **Step 7: Commit**

```bash
git add src/editor/Werkzeuge.ts src/editor/Werkzeuge.test.ts src/editor/Editor.ts src/main.ts
git commit -m "refactor: replace the five placing tools with one PlatziereTool"
```

---

### Task 8: `ParameterPanel` aus der Panel-Beschreibung

**Files:**
- Modify: `src/ui/ParameterPanel.ts` (ganze Datei), `src/main.ts`
- Test: `src/ui/ParameterPanel.test.ts`

**Interfaces:**
- Consumes: `ObjektArt.label`, `ObjektArt.panel`, `PanelSpec`, `PanelFeld`, `PanelAuswahl`, `PanelKnopf`, `Werte` (Task 4b); `zahlWert` aus `src/arten/gemeinsam.ts`; `ObjektRegister.artVon`; `Bauwerk.objekt`, `Bauwerk.ersetze` (Task 2); `Editor.aendereMit`, `Editor.loescheAuswahl`, `EditorZustand.auswahl`.
- Produces: `new ParameterPanel(wurzel: HTMLElement, editor: Editor, arten: ObjektRegister = standardArten())`; `zeige(z: EditorZustand): void` unverändert. Das Formular hat dieselben Elemente in derselben Reihenfolge wie bisher: `h2` mit dem Label der Art, Zahlenfelder, Extras (Auswahlfeld, Knöpfe), Info-Zeile, „Löschen (Entf)“.

- [ ] **Step 1: Tests schreiben**

In `src/ui/ParameterPanel.test.ts` die Importe ergänzen:

```ts
import { BaumArt } from '../arten/BaumArt';
import type { PanelSpec } from '../arten/ObjektArt';
import { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import { ABock } from '../model/ABock';
```

und innerhalb von `describe('ParameterPanel', …)` nach dem letzten Test einfügen:

```ts

  it('nimmt Felder und Info aus der Panel-Beschreibung der Art im übergebenen Register (Spec v3, D4)', () => {
    class Testbaum extends BaumArt {
      override panel(b: Baum): PanelSpec {
        return { ...super.panel(b), info: 'Panel aus dem übergebenen Register' };
      }
    }
    const arten = new ObjektRegister([...standardArten().alle.filter((a) => a.name !== 'baum'), new Testbaum()]);
    const wurzel = document.createElement('section');
    const editor = new Editor(Bauwerk.leer().mitBaum(new Baum('b', Vec3.NULL, STANDARD_BAUM)), { arten });
    const panel = new ParameterPanel(wurzel, editor, arten);
    editor.waehle('b');
    panel.zeige(editor.zustand());
    expect(wurzel.textContent).toContain('Panel aus dem übergebenen Register');
    expect(feld(wurzel, 'Höhe').value).toBe('8');
  });

  it('baut das Formular des A-Bocks wie bisher', () => {
    const { wurzel, editor } = panelMit(kochstelle(), 'abock');
    expect(wurzel.querySelector('h2')?.textContent).toBe('A-Bock');
    expect([...wurzel.querySelectorAll('label')].map((l) => l.textContent)).toEqual(['Stangenlänge (m)', 'Fußabstand (m)', 'Riegelhöhe (m)', 'Ø (cm)']);
    expect(feld(wurzel, 'Ø').value).toBe('8');
    expect(wurzel.textContent).toContain('Höhe 2.05 m · Beinwinkel 21° · R dreht');
    tippe(feld(wurzel, 'Riegelhöhe'), '0.6');
    const a = editor.bauwerk.gruppe('abock');
    expect(a instanceof ABock && a.params.riegelhoehe).toBe(0.6);
  });

  it('zeigt bei der freien Stange nur den Durchmesser und setzt 0 zurück', () => {
    const { wurzel, editor } = panelMit(kochstelle(), 'first');
    expect(wurzel.querySelector('h2')?.textContent).toBe('Stange');
    expect(wurzel.querySelectorAll('input')).toHaveLength(1);
    tippe(feld(wurzel, 'Ø'), '10');
    expect(editor.bauwerk.stange('first')?.durchmesser).toBeCloseTo(0.1, 9);
    tippe(feld(wurzel, 'Ø'), '0');
    expect(editor.zustand().meldung).toBe('Durchmesser muss größer als 0 sein');
    expect(feld(wurzel, 'Ø').value).toBe('10');
  });
```

- [ ] **Step 2: Tests laufen lassen**

Run: `npx vitest run src/ui/ParameterPanel.test.ts`
Expected: FAIL nur bei „nimmt Felder und Info aus der Panel-Beschreibung …“: Das alte Panel ignoriert das Register und zeigt „Steht auf dem Platz, gehört nicht zum Bau.“. Die beiden anderen neuen Tests sind schon grün; sie halten fest, dass das neue Panel für A-Bock und Stange dasselbe zeigt wie das alte.

- [ ] **Step 3: Panel neu**

`src/ui/ParameterPanel.ts` ganz ersetzen:

```ts
import { zahlWert } from '../arten/gemeinsam';
import type { PanelAuswahl, PanelFeld, PanelKnopf, PanelSpec, Werte } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Editor, EditorZustand } from '../editor/Editor';
import { Neuaufbau } from './Neuaufbau';

/** Übernimmt neue Werte ins Modell; false, wenn der Editor sie abgelehnt hat (die Meldung steht dann im Zustand). */
type Uebernehme = (werte: Werte) => boolean;

/** Anzeige-Text eines Modellwerts: auf drei Nachkommastellen gerundet, in Anzeige-Einheit. */
const anzeige = (wert: number, faktor: number): string => String(Math.round(wert * faktor * 1000) / 1000);

/** Formular für das ausgewählte Objekt, gebaut aus der Panel-Beschreibung seiner Art (Spec v3, D4). Ungültige Werte meldet der Editor. */
export class ParameterPanel {
  private readonly neuaufbau = new Neuaufbau();

  constructor(
    private readonly wurzel: HTMLElement,
    private readonly editor: Editor,
    private readonly arten: ObjektRegister = standardArten(),
  ) {}

  zeige(z: EditorZustand): void {
    const objekt = z.auswahl === null ? undefined : z.bauwerk.objekt(z.auswahl);
    if (!this.neuaufbau.noetig(z.auswahl, objekt ?? null)) return;
    this.wurzel.replaceChildren();
    if (!objekt) return;
    const art = this.arten.artVon(objekt);
    this.formular(art.label, art.panel(objekt));
  }

  private formular(titel: string, spec: PanelSpec): void {
    // Die Änderung passiert innerhalb von aendereMit, damit der Editor einen RangeError abfängt.
    const uebernehme: Uebernehme = (werte) => this.editor.aendereMit((b) => b.ersetze(spec.mit(werte)));
    const kopf = document.createElement('h2');
    kopf.textContent = titel;
    const eingaben = spec.felder.map((feld) => this.zahlenfeld(feld, spec.werte, uebernehme));
    const extras = spec.extras.map((extra) =>
      extra.art === 'auswahl' ? this.auswahlfeld(extra, spec.werte, uebernehme) : this.knopf(extra, spec.werte, uebernehme),
    );
    const infoZeile = document.createElement('p');
    infoZeile.textContent = spec.info;
    const loeschen = document.createElement('button');
    loeschen.textContent = 'Löschen (Entf)';
    loeschen.addEventListener('click', () => this.editor.loescheAuswahl());
    this.wurzel.append(kopf, ...eingaben, ...extras, infoZeile, loeschen);
  }

  private zahlenfeld(feld: PanelFeld, werte: Werte, uebernehme: Uebernehme): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = feld.label;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = feld.schritt ?? (feld.faktor === 1 ? '0.05' : '1');
    const modellwert = anzeige(zahlWert(werte, feld.schluessel), feld.faktor);
    input.value = modellwert;
    input.addEventListener('change', () => {
      // Abgelehnt: Das Modell ist unverändert, also baut das Panel nicht neu auf. Das Feld zeigt sonst einen Wert, den es nicht gibt.
      if (!uebernehme({ ...werte, [feld.schluessel]: Number(input.value) / feld.faktor })) input.value = modellwert;
    });
    label.append(input);
    return label;
  }

  private auswahlfeld(auswahl: PanelAuswahl, werte: Werte, uebernehme: Uebernehme): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = auswahl.label;
    const select = document.createElement('select');
    for (const [wert, text] of auswahl.optionen) {
      const option = document.createElement('option');
      option.value = wert;
      option.textContent = text;
      select.append(option);
    }
    const modellwert = String(werte[auswahl.schluessel]);
    select.value = modellwert;
    select.addEventListener('change', () => {
      // Abgelehnt: Das Modell ist unverändert, also springt die Auswahl zurück, wie ein Zahlenfeld.
      if (!uebernehme({ ...werte, [auswahl.schluessel]: select.value })) select.value = modellwert;
    });
    label.append(select);
    return label;
  }

  private knopf(knopf: PanelKnopf, werte: Werte, uebernehme: Uebernehme): HTMLButtonElement {
    const element = document.createElement('button');
    element.textContent = knopf.text;
    element.addEventListener('click', () => uebernehme({ ...werte, ...knopf.aenderung }));
    return element;
  }
}
```

In `src/main.ts` die Zeile

```ts
const parameter = new ParameterPanel(element('#parameter'), editor);
```

ersetzen durch

```ts
const parameter = new ParameterPanel(element('#parameter'), editor, arten);
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/ui`
Expected: PASS (`ParameterPanel.test.ts` 11 Tests: die 8 alten unverändert, 3 neue).
Run: `npx vitest run`
Expected: 43 Dateien, 375 Tests, alle grün.
Run: `npx tsc --noEmit`
Expected: Exit 0.
Run: `grep -nE "instanceof|'(dreibein|abock|stange|seil|baum|plane)'" src/ui/ParameterPanel.ts`
Expected: keine Ausgabe (Spec-Verifikation).

- [ ] **Step 5: Commit**

```bash
git add src/ui/ParameterPanel.ts src/ui/ParameterPanel.test.ts src/main.ts
git commit -m "refactor: build the parameter panel from the kind's panel spec"
```

---

### Task 9a: Darstellung je Art (three.js)

**Files:**
- Create: `src/editor/darstellung/Darstellung.ts`, `materialien.ts`, `formen.ts`, `StangeDarstellung.ts`, `BaugruppeDarstellung.ts`, `SeilDarstellung.ts`, `BaumDarstellung.ts`, `PlaneDarstellung.ts`, `Ableitungen.ts`, `standardDarstellungen.ts` (alle in `src/editor/darstellung/`)
- Test: `src/editor/darstellung/darstellung.test.ts` (neu)
- `Szene.ts` bleibt in diesem Task unverändert; Task 9b schaltet um.

**Interfaces:**
- Consumes: `LagerObjekt`, `ArtName`, `ART_NAMEN`; `Baugruppe.stangen()`, `Stange`, `Seil`, `Baum`, `Plane.flaechen`; `Bauwerk.buende()`, `heringe()`; `Platzbedarf.aus`. Die Meshes, Maße und Materialien sind wörtlich die aus dem bisherigen `Szene.ts`.
- Produces:
  - `interface TeilDaten { objektId: string; teilId: string; art: ArtName; klickbar: boolean; normal: THREE.Material; markiert: THREE.Material | null }`;
  - `alsTeil<M extends THREE.Mesh>(mesh: M, daten: TeilDaten): M` (schreibt `mesh.userData.teil`), `teilDaten(o: THREE.Object3D): TeilDaten | undefined`;
  - `interface Darstellung<T extends LagerObjekt = LagerObjekt> { baue(o: T): THREE.Group }`, `type Darstellungen = Readonly<Record<ArtName, Darstellung>>`;
  - `standardDarstellungen(): Darstellungen` (je Art eine eigene Instanz, damit Tests `baue` je Instanz zählen können);
  - `baueAbleitungen(bauwerk: Bauwerk): THREE.Group` (Name `'ableitungen'`: Bünde, Heringe, Platzrahmen);
  - `zylinder(von, bis, radius, material)`, `kugel(p, radius, material)` in `formen.ts`; die Materialien `HOLZ`, `MARKIERT`, `SEIL`, `START`, `STAMM`, `KRONE`, `HERING`, `UNSICHTBAR`, `PLATZ`, `PLANE`, `PLANE_MARKIERT` in `materialien.ts`.

- [ ] **Step 1: Failing tests schreiben**

Neue Datei `src/editor/darstellung/darstellung.test.ts`:

```ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../../beispiele/kochstelle';
import { ABock } from '../../model/ABock';
import { Baum } from '../../model/Baum';
import { Bauwerk } from '../../model/Bauwerk';
import { ART_NAMEN } from '../../model/LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_PLANE } from '../../model/params';
import { Plane } from '../../model/Plane';
import { Seil } from '../../model/Seil';
import { Stange } from '../../model/Stange';
import { Vec3 } from '../../model/Vec3';
import { baueAbleitungen } from './Ableitungen';
import { type TeilDaten, teilDaten } from './Darstellung';
import { HOLZ, KRONE, MARKIERT, PLANE, PLANE_MARKIERT, SEIL, STAMM, UNSICHTBAR } from './materialien';
import { standardDarstellungen } from './standardDarstellungen';

const darstellungen = standardDarstellungen();
const teile = (gruppe: THREE.Group): TeilDaten[] => gruppe.children.map((k) => teilDaten(k)).filter((t): t is TeilDaten => t !== undefined);

describe('Darstellung je Art (Spec v3, D2)', () => {
  it('gibt es für jede Art', () => {
    expect(Object.keys(darstellungen).sort()).toEqual([...ART_NAMEN].sort());
  });

  it('Baugruppe: ein Holzzylinder je Stange mit Objekt-id, Teil-id und Art', () => {
    const a = new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK);
    expect(teile(darstellungen.abock.baue(a))).toEqual(
      ['a-bein-0', 'a-bein-1', 'a-riegel'].map((teilId) => ({ objektId: 'a', teilId, art: 'abock', klickbar: true, normal: HOLZ, markiert: MARKIERT })),
    );
  });

  it('Stange: ein Zylinder mit der Art stange, mittig zwischen den Enden', () => {
    const gruppe = darstellungen.stange.baue(new Stange('s', Vec3.NULL, new Vec3(0, 2, 0), 0.08));
    expect(teile(gruppe)).toEqual([{ objektId: 's', teilId: 's', art: 'stange', klickbar: true, normal: HOLZ, markiert: MARKIERT }]);
    expect(gruppe.children[0]?.position.toArray()).toEqual([0, 1, 0]);
  });

  it('Seil: sichtbar dünn, angeklickt wird der unsichtbare Mantel', () => {
    const gruppe = darstellungen.seil.baue(new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0)));
    expect(teile(gruppe).map((t) => [t.teilId, t.klickbar, t.normal, t.markiert])).toEqual([
      ['l', false, SEIL, MARKIERT],
      ['l', true, UNSICHTBAR, null],
    ]);
  });

  it('Baum: der Stamm fängt Klicks und wird hervorgehoben, die Krone nicht', () => {
    const gruppe = darstellungen.baum.baue(new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM));
    expect(teile(gruppe).map((t) => [t.klickbar, t.normal, t.markiert])).toEqual([
      [true, STAMM, MARKIERT],
      [false, KRONE, null],
    ]);
  });

  it('Plane: ein Mesh mit zwei Dreiecken je Fläche', () => {
    const eben = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);
    const gruppe = darstellungen.plane.baue(eben);
    expect(teile(gruppe)).toEqual([{ objektId: 'pl', teilId: 'pl', art: 'plane', klickbar: true, normal: PLANE, markiert: PLANE_MARKIERT }]);
    expect((gruppe.children[0] as THREE.Mesh).geometry.getAttribute('position').count).toBe(6);
    const sattel = darstellungen.plane.baue(eben.mitParams({ ...STANDARD_PLANE, form: 'satteldach' }));
    expect((sattel.children[0] as THREE.Mesh).geometry.getAttribute('position').count).toBe(12);
  });

  it('Ableitungen: Bünde, Heringe und Platzrahmen; ein leeres Bauwerk hat keine', () => {
    const gruppe = baueAbleitungen(kochstelle());
    expect(gruppe.name).toBe('ableitungen');
    expect(gruppe.children.filter((k) => k instanceof THREE.Mesh)).toHaveLength(4); // 4 Bünde, keine Heringe
    expect(gruppe.children.filter((k) => k instanceof THREE.LineLoop)).toHaveLength(1);
    expect(baueAbleitungen(Bauwerk.leer()).children).toEqual([]);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/editor/darstellung`
Expected: FAIL, weil `./Ableitungen`, `./Darstellung`, `./materialien` und `./standardDarstellungen` fehlen.

- [ ] **Step 3: Grundlagen: Teil-Daten, Materialien, Formen**

Neue Datei `src/editor/darstellung/Darstellung.ts`:

```ts
import type * as THREE from 'three';
import type { ArtName, LagerObjekt } from '../../model/LagerObjekt';

/** Was ein Mesh über sich weiß (Spec v3, D2): wem es gehört, welcher Teil es ist, ob es Klicks fängt und wie es hervorgehoben wird. */
export interface TeilDaten {
  readonly objektId: string;
  readonly teilId: string;
  readonly art: ArtName;
  /** Fängt Klicks. Nicht das dünne sichtbare Seil (dafür gibt es den Greifmantel) und nicht die Baumkrone. */
  readonly klickbar: boolean;
  readonly normal: THREE.Material;
  /** Material, wenn der Teil oder sein Objekt markiert oder ausgewählt ist; null: bleibt immer gleich. */
  readonly markiert: THREE.Material | null;
}

/** Baut alle Meshes eines Objekts im Normalzustand. Die Geometrie gehört der Gruppe, die Materialien sind geteilt. */
export interface Darstellung<T extends LagerObjekt = LagerObjekt> {
  baue(o: T): THREE.Group;
}

/** Je Art genau eine Darstellung; der Typ erzwingt, dass eine neue Art eine bekommt. */
export type Darstellungen = Readonly<Record<ArtName, Darstellung>>;

export function alsTeil<M extends THREE.Mesh>(mesh: M, daten: TeilDaten): M {
  mesh.userData.teil = daten;
  return mesh;
}

export function teilDaten(o: THREE.Object3D): TeilDaten | undefined {
  return o.userData.teil as TeilDaten | undefined;
}
```

Neue Datei `src/editor/darstellung/materialien.ts`:

```ts
import * as THREE from 'three';

// Geteilte Materialien. Die Szene gibt sie nie frei; nur die Geometrie gehört einem Objekt.
export const HOLZ = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
export const MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f });
export const SEIL = new THREE.MeshLambertMaterial({ color: 0xe8d9a0 });
export const START = new THREE.MeshLambertMaterial({ color: 0x2f6f3e });
export const STAMM = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
export const KRONE = new THREE.MeshLambertMaterial({ color: 0x3f7d3a });
export const HERING = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
export const UNSICHTBAR = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
export const PLATZ = new THREE.LineDashedMaterial({ color: 0x1d2733, dashSize: 0.2, gapSize: 0.1 });
// Beidseitig, damit man die Plane auch von unten sieht; polygonOffset verhindert Flimmern einer Bodenplane auf dem Boden.
export const PLANE = new THREE.MeshLambertMaterial({ color: 0x7d7a4f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
export const PLANE_MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
```

Neue Datei `src/editor/darstellung/formen.ts`:

```ts
import * as THREE from 'three';
import type { Vec3 } from '../../model/Vec3';

const Y_ACHSE = new THREE.Vector3(0, 1, 0);

/** Zylinder von `von` nach `bis`, z. B. eine Stange oder ein Seil. */
export function zylinder(von: Vec3, bis: Vec3, radius: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, von.distanceTo(bis), 12), material);
  const mitte = von.add(bis).scale(0.5);
  const r = bis.sub(von).normalize();
  mesh.position.set(mitte.x, mitte.y, mitte.z);
  mesh.quaternion.setFromUnitVectors(Y_ACHSE, new THREE.Vector3(r.x, r.y, r.z));
  return mesh;
}

export function kugel(p: Vec3, radius: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material);
  mesh.position.set(p.x, p.y, p.z);
  return mesh;
}
```

- [ ] **Step 4: Die Darstellungen je Art**

Neue Datei `src/editor/darstellung/StangeDarstellung.ts`:

```ts
import * as THREE from 'three';
import type { ArtName } from '../../model/LagerObjekt';
import type { Stange } from '../../model/Stange';
import { alsTeil, type Darstellung } from './Darstellung';
import { zylinder } from './formen';
import { HOLZ, MARKIERT } from './materialien';

/** Eine Stange als Holzzylinder; auch für die Stangen einer Baugruppe (dann mit deren id und Art). */
export function stangenMesh(s: Stange, objektId: string, art: ArtName): THREE.Mesh {
  return alsTeil(zylinder(s.start, s.ende, s.durchmesser / 2, HOLZ), { objektId, teilId: s.id, art, klickbar: true, normal: HOLZ, markiert: MARKIERT });
}

export class StangeDarstellung implements Darstellung<Stange> {
  baue(s: Stange): THREE.Group {
    return new THREE.Group().add(stangenMesh(s, s.id, 'stange'));
  }
}
```

Neue Datei `src/editor/darstellung/BaugruppeDarstellung.ts`:

```ts
import * as THREE from 'three';
import type { Baugruppe } from '../../model/Baugruppe';
import type { Darstellung } from './Darstellung';
import { stangenMesh } from './StangeDarstellung';

/** Dreibein und A-Bock: ein Zylinder je Stange. Jede Stange lässt sich einzeln hervorheben (Hinweise markieren einzelne Stangen). */
export class BaugruppeDarstellung implements Darstellung<Baugruppe> {
  baue(g: Baugruppe): THREE.Group {
    return new THREE.Group().add(...g.stangen().map((s) => stangenMesh(s, g.id, g.art)));
  }
}
```

Neue Datei `src/editor/darstellung/SeilDarstellung.ts`:

```ts
import * as THREE from 'three';
import type { Seil } from '../../model/Seil';
import { alsTeil, type Darstellung } from './Darstellung';
import { zylinder } from './formen';
import { MARKIERT, SEIL, UNSICHTBAR } from './materialien';

const SEIL_RADIUS = 0.005; // Ø 1 cm, nur optisch
const SEIL_GREIFRADIUS = 0.05; // unsichtbarer Mantel, damit man ein dünnes Seil anklicken kann

export class SeilDarstellung implements Darstellung<Seil> {
  baue(s: Seil): THREE.Group {
    const basis = { objektId: s.id, teilId: s.id, art: 'seil' as const };
    const sichtbar = alsTeil(zylinder(s.start, s.ende, SEIL_RADIUS, SEIL), { ...basis, klickbar: false, normal: SEIL, markiert: MARKIERT });
    const greifbar = alsTeil(zylinder(s.start, s.ende, SEIL_GREIFRADIUS, UNSICHTBAR), { ...basis, klickbar: true, normal: UNSICHTBAR, markiert: null });
    return new THREE.Group().add(sichtbar, greifbar);
  }
}
```

Neue Datei `src/editor/darstellung/BaumDarstellung.ts`:

```ts
import * as THREE from 'three';
import type { Baum } from '../../model/Baum';
import { alsTeil, type Darstellung } from './Darstellung';
import { KRONE, MARKIERT, STAMM } from './materialien';

export class BaumDarstellung implements Darstellung<Baum> {
  baue(b: Baum): THREE.Group {
    const { durchmesser, hoehe } = b.params;
    const basis = { objektId: b.id, teilId: b.id, art: 'baum' as const };
    const stamm = alsTeil(new THREE.Mesh(new THREE.CylinderGeometry(durchmesser / 2, durchmesser / 2, hoehe, 12), STAMM), {
      ...basis,
      klickbar: true,
      normal: STAMM,
      markiert: MARKIERT,
    });
    stamm.position.set(b.position.x, hoehe / 2, b.position.z);
    // Die Krone fängt wie bisher keine Klicks (offenes Minor aus v2a, docs/ki-lernlog.md) und wird nie hervorgehoben.
    const krone = alsTeil(new THREE.Mesh(new THREE.SphereGeometry(Math.max(1, hoehe * 0.25), 12, 8), KRONE), {
      ...basis,
      klickbar: false,
      normal: KRONE,
      markiert: null,
    });
    krone.position.set(b.position.x, hoehe, b.position.z);
    return new THREE.Group().add(stamm, krone);
  }
}
```

Neue Datei `src/editor/darstellung/PlaneDarstellung.ts`:

```ts
import * as THREE from 'three';
import type { Plane } from '../../model/Plane';
import { alsTeil, type Darstellung } from './Darstellung';
import { PLANE, PLANE_MARKIERT } from './materialien';

/** Jede Fläche als zwei Dreiecke. Ein Mesh pro Plane, damit ein Klick sie als Ganzes trifft. */
export class PlaneDarstellung implements Darstellung<Plane> {
  baue(p: Plane): THREE.Group {
    const ecken = p.flaechen.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]);
    const geometrie = new THREE.BufferGeometry().setFromPoints(ecken.map((v) => new THREE.Vector3(v.x, v.y, v.z)));
    geometrie.computeVertexNormals();
    const mesh = alsTeil(new THREE.Mesh(geometrie, PLANE), { objektId: p.id, teilId: p.id, art: 'plane', klickbar: true, normal: PLANE, markiert: PLANE_MARKIERT });
    return new THREE.Group().add(mesh);
  }
}
```

Neue Datei `src/editor/darstellung/Ableitungen.ts`:

```ts
import * as THREE from 'three';
import type { Bauwerk } from '../../model/Bauwerk';
import { Platzbedarf } from '../../model/Platzbedarf';
import type { Vec3 } from '../../model/Vec3';
import { kugel } from './formen';
import { HERING, PLATZ, SEIL } from './materialien';

/** Was aus dem ganzen Bauwerk abgeleitet wird: Bünde, Heringe und der Platzrahmen (Spec v3, D5). */
export function baueAbleitungen(bauwerk: Bauwerk): THREE.Group {
  const gruppe = new THREE.Group();
  gruppe.name = 'ableitungen';
  for (const b of bauwerk.buende()) gruppe.add(kugel(b.position, 0.07, SEIL));
  for (const h of bauwerk.heringe()) gruppe.add(heringMesh(h.position));
  const platz = Platzbedarf.aus(bauwerk);
  if (platz) gruppe.add(platzRahmen(platz));
  return gruppe;
}

function heringMesh(p: Vec3): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 8), HERING);
  mesh.position.set(p.x, 0.075, p.z);
  mesh.rotation.x = Math.PI; // Spitze nach unten, in den Boden
  return mesh;
}

function platzRahmen(p: Platzbedarf): THREE.LineLoop {
  const y = 0.01; // knapp über dem Boden, damit die Linie nicht flimmert
  const geometrie = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(p.minX, y, p.minZ),
    new THREE.Vector3(p.maxX, y, p.minZ),
    new THREE.Vector3(p.maxX, y, p.maxZ),
    new THREE.Vector3(p.minX, y, p.maxZ),
  ]);
  const rahmen = new THREE.LineLoop(geometrie, PLATZ);
  rahmen.computeLineDistances();
  return rahmen;
}
```

Neue Datei `src/editor/darstellung/standardDarstellungen.ts`:

```ts
import { BaugruppeDarstellung } from './BaugruppeDarstellung';
import { BaumDarstellung } from './BaumDarstellung';
import type { Darstellungen } from './Darstellung';
import { PlaneDarstellung } from './PlaneDarstellung';
import { SeilDarstellung } from './SeilDarstellung';
import { StangeDarstellung } from './StangeDarstellung';

/** Je Art eine Darstellung (Spec v3, D2). Eine neue Art braucht hier eine Zeile; der Typ meldet sie sonst als fehlend. */
export function standardDarstellungen(): Darstellungen {
  return {
    dreibein: new BaugruppeDarstellung(),
    abock: new BaugruppeDarstellung(),
    stange: new StangeDarstellung(),
    seil: new SeilDarstellung(),
    baum: new BaumDarstellung(),
    plane: new PlaneDarstellung(),
  };
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/editor/darstellung`
Expected: PASS (7 Tests; three.js baut Geometrie auch ohne WebGL).
Run: `npx vitest run`
Expected: 44 Dateien, 382 Tests, alle grün.
Run: `npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/editor/darstellung/Darstellung.ts src/editor/darstellung/materialien.ts src/editor/darstellung/formen.ts src/editor/darstellung/StangeDarstellung.ts src/editor/darstellung/BaugruppeDarstellung.ts src/editor/darstellung/SeilDarstellung.ts src/editor/darstellung/BaumDarstellung.ts src/editor/darstellung/PlaneDarstellung.ts src/editor/darstellung/Ableitungen.ts src/editor/darstellung/standardDarstellungen.ts src/editor/darstellung/darstellung.test.ts
git commit -m "feat: add a three.js Darstellung per object kind"
```

---

### Task 9b: Inkrementelle Szene

**Files:**
- Create: `src/editor/SzenenInhalt.ts`
- Modify: `src/editor/Szene.ts` (ganze Datei)
- Test: `src/editor/SzenenInhalt.test.ts` (neu)

**Interfaces:**
- Consumes: alles aus Task 9a; `ObjektRegister.art(name).klick` (Task 4b); `Treffer` (Task 6); `Bauwerk.objekte` (Task 2).
- Produces:
  - `class SzenenInhalt(darstellungen: Darstellungen = standardDarstellungen(), arten: ObjektRegister = standardArten())` mit `readonly wurzel: THREE.Group`, `zeige(bauwerk: Bauwerk, markiert: ReadonlySet<string>, stangenStart: Vec3 | null): void`, `ziele(klickZiele: readonly ArtName[]): THREE.Object3D[]` und `static treffer(objekt: THREE.Object3D, punkt: Vec3): Treffer | null`. Die Gruppe eines Objekts heißt wie seine id, die Ableitungen heißen `'ableitungen'`, die Startkugel `'start'`.
  - `Szene`: Konstruktor `(container: HTMLElement, arten: ObjektRegister = standardArten())`; `zeige(bauwerk, markiert, stangenStart)` und `treffer(e, klickZiele: readonly ArtName[])` mit unveränderter Signatur.

**Regeln (Spec D5 plus Abweichung „Startmarkierung“):**
- Je Objekt-id eine Gruppe. Hat das Objekt dieselbe Identität (`===`) wie beim letzten Mal, bleibt die Gruppe. Sonst wird sie neu gebaut, und die alte gibt ihre Geometrie frei (nie die geteilten Materialien). Objekte, die nicht mehr im Bauwerk sind, fliegen raus.
- Die Gruppe `ableitungen` (Bünde, Heringe, Platzrahmen) wird nur neu gebaut, wenn das Bauwerk (Identität) wechselt.
- Die Startkugel wird nur neu gebaut, wenn `stangenStart` (Identität) wechselt.
- Auswahl und Markierung tauschen nur Materialien: Ein Mesh mit `markiert !== null` bekommt `markiert`, wenn seine Teil-id oder seine Objekt-id im Set steht, sonst `normal`.

- [ ] **Step 1: Failing tests schreiben**

Neue Datei `src/editor/SzenenInhalt.test.ts`:

```ts
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import type { ArtName } from '../model/LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Plane } from '../model/Plane';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { teilDaten } from './darstellung/Darstellung';
import { HOLZ, MARKIERT, SEIL, UNSICHTBAR } from './darstellung/materialien';
import { standardDarstellungen } from './darstellung/standardDarstellungen';
import { SzenenInhalt } from './SzenenInhalt';

const KEINE: ReadonlySet<string> = new Set();
const d = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const l = new Seil('l', d.spitze(), new Vec3(2, 0, 0));
const b1 = Bauwerk.von([d, l]);

/** Ein SzenenInhalt, dessen baue-Aufrufe gezählt werden. Ohne WebGL: three.js baut Geometrie auch so. */
const mitZaehler = (): { inhalt: SzenenInhalt; baue: () => number } => {
  const darstellungen = standardDarstellungen();
  const spione = Object.values(darstellungen).map((x) => vi.spyOn(x, 'baue'));
  return { inhalt: new SzenenInhalt(darstellungen), baue: () => spione.reduce((n, s) => n + s.mock.calls.length, 0) };
};

const frisch = (bauwerk: Bauwerk): SzenenInhalt => {
  const inhalt = new SzenenInhalt();
  inhalt.zeige(bauwerk, KEINE, null);
  return inhalt;
};

const meshe = (inhalt: SzenenInhalt, teilId: string): THREE.Mesh[] => {
  const gefunden: THREE.Mesh[] = [];
  inhalt.wurzel.traverse((k) => {
    if (k instanceof THREE.Mesh && teilDaten(k)?.teilId === teilId) gefunden.push(k);
  });
  return gefunden;
};

/** Alle Objekt-Meshes mit Teil-id, Lage und Ausdehnung der Geometrie, sortiert. */
const fingerabdruck = (inhalt: SzenenInhalt): string[] => {
  const zeilen: string[] = [];
  inhalt.wurzel.traverse((k) => {
    const daten = teilDaten(k);
    if (!(k instanceof THREE.Mesh) || !daten) return;
    k.geometry.computeBoundingSphere();
    const kugel = k.geometry.boundingSphere;
    const zahlen = [...k.position.toArray(), ...(kugel ? [...kugel.center.toArray(), kugel.radius] : [])];
    zeilen.push(`${daten.objektId}/${daten.teilId}@${zahlen.map((z) => z.toFixed(3)).join(',')}`);
  });
  return zeilen.sort();
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SzenenInhalt (Spec v3, D5)', () => {
  it('baut bei einem Auswahlwechsel nichts, bei einem geänderten Objekt genau eines', () => {
    const { inhalt, baue } = mitZaehler();
    inhalt.zeige(b1, KEINE, null);
    expect(baue()).toBe(2);
    inhalt.zeige(b1, new Set(['d']), null);
    inhalt.zeige(b1, new Set(['l']), null);
    expect(baue()).toBe(2);
    inhalt.zeige(b1.ersetze(d.gedreht(0.2)), new Set(['d']), null);
    expect(baue()).toBe(3);
  });

  it('färbt nur um: eine einzelne Gruppenstange oder die ganze Gruppe', () => {
    const { inhalt, baue } = mitZaehler();
    inhalt.zeige(b1, new Set(['d-bein-1']), null);
    expect(meshe(inhalt, 'd-bein-1')[0]?.material).toBe(MARKIERT);
    expect(meshe(inhalt, 'd-bein-0')[0]?.material).toBe(HOLZ);
    expect(meshe(inhalt, 'd-bein-2')[0]?.material).toBe(HOLZ);
    inhalt.zeige(b1, new Set(['d']), null);
    expect(['d-bein-0', 'd-bein-1', 'd-bein-2'].every((id) => meshe(inhalt, id)[0]?.material === MARKIERT)).toBe(true);
    inhalt.zeige(b1, new Set(['l']), null);
    expect(meshe(inhalt, 'l').map((m) => m.material)).toEqual([MARKIERT, UNSICHTBAR]);
    expect(meshe(inhalt, 'd-bein-1')[0]?.material).toBe(HOLZ);
    expect(baue()).toBe(2);
  });

  it('zeigt nach Rückgängig genau den alten Stand, ohne Geister und ohne Lücken', () => {
    const { inhalt, baue } = mitZaehler();
    const b2 = b1.ersetze(d.gedreht(0.3));
    const b3 = b2.ohne('l');
    for (const b of [b1, b2, b3, b2, b1]) inhalt.zeige(b, KEINE, null);
    expect(fingerabdruck(inhalt)).toEqual(fingerabdruck(frisch(b1)));
    expect(inhalt.wurzel.children).toHaveLength(3); // d, l, ableitungen
    // b1: d, l · b2: d · b3: nichts · b2: l (war entfernt) · b1: d (das alte Dreibein ist nicht === dem gedrehten)
    expect(baue()).toBe(2 + 1 + 0 + 1 + 1);
  });

  it('entfernt beim Löschen alle Meshes des Objekts und gibt nur deren Geometrie frei', () => {
    const inhalt = frisch(b1);
    const seilMeshe = meshe(inhalt, 'l');
    expect(seilMeshe).toHaveLength(2);
    const freigaben = seilMeshe.map((m) => vi.spyOn(m.geometry, 'dispose'));
    const materialien = [SEIL, UNSICHTBAR, MARKIERT].map((m) => vi.spyOn(m, 'dispose'));
    inhalt.zeige(b1.ohne('l'), KEINE, null);
    expect(meshe(inhalt, 'l')).toEqual([]);
    expect(inhalt.wurzel.getObjectByName('l')).toBeUndefined();
    for (const f of freigaben) expect(f).toHaveBeenCalledOnce();
    for (const m of materialien) expect(m).not.toHaveBeenCalled();
  });

  it('baut die Ableitungen nur bei einem neuen Bauwerk neu', () => {
    const inhalt = frisch(b1);
    const vorher = inhalt.wurzel.getObjectByName('ableitungen');
    expect(vorher?.children).toHaveLength(3); // ein Bund an der Spitze, ein Hering, der Platzrahmen
    inhalt.zeige(b1, new Set(['d']), new Vec3(1, 0, 1));
    expect(inhalt.wurzel.getObjectByName('ableitungen')).toBe(vorher);
    inhalt.zeige(b1.ohne('l'), KEINE, null);
    const nachher = inhalt.wurzel.getObjectByName('ableitungen');
    expect(nachher).not.toBe(vorher);
    expect(nachher?.children).toHaveLength(2);
    expect(inhalt.wurzel.children.filter((k) => k.name === 'ableitungen')).toHaveLength(1);
  });

  it('zeigt den Startpunkt eines Zwei-Klick-Werkzeugs und nimmt ihn wieder weg', () => {
    const inhalt = frisch(b1);
    const start = new Vec3(1, 0, 1);
    inhalt.zeige(b1, KEINE, start);
    const kugel = inhalt.wurzel.getObjectByName('start');
    expect(kugel?.position.toArray()).toEqual([1, 0, 1]);
    inhalt.zeige(b1, KEINE, start);
    expect(inhalt.wurzel.getObjectByName('start')).toBe(kugel);
    inhalt.zeige(b1, KEINE, null);
    expect(inhalt.wurzel.getObjectByName('start')).toBeUndefined();
  });

  it('nennt Stangen und Stämme immer als Klickziele, Seile und Planen nur auf Wunsch des Werkzeugs (Spec v2b, D2)', () => {
    const a = new ABock('a', new Vec3(6, 0, 0), 0, STANDARD_ABOCK);
    const plane = new Plane('pl', new Vec3(0, 2, 5), new Vec3(4, 2, 5), STANDARD_PLANE);
    const inhalt = frisch(Bauwerk.von([a, l, plane, new Baum('b', new Vec3(9, 0, 9), STANDARD_BAUM)]));
    const ziele = (klickZiele: readonly ArtName[]): string[] => inhalt.ziele(klickZiele).map((k) => teilDaten(k)?.teilId ?? '?').sort();
    expect(ziele([])).toEqual(['a-bein-0', 'a-bein-1', 'a-riegel', 'b']);
    expect(ziele(['plane'])).toEqual(['a-bein-0', 'a-bein-1', 'a-riegel', 'b', 'pl']);
    expect(ziele(['seil', 'plane'])).toEqual(['a-bein-0', 'a-bein-1', 'a-riegel', 'b', 'l', 'pl']);
  });

  it('macht aus einem getroffenen Mesh einen Treffer mit Teil-id und Art des Objekts', () => {
    const inhalt = frisch(Bauwerk.von([new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK)]));
    const riegel = meshe(inhalt, 'a-riegel')[0];
    const punkt = new Vec3(0.3, 0.4, 0);
    expect(riegel && SzenenInhalt.treffer(riegel, punkt)).toEqual({ art: 'objekt', objektArt: 'abock', id: 'a-riegel', punkt });
    expect(SzenenInhalt.treffer(new THREE.Mesh(), punkt)).toBeNull();
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/editor/SzenenInhalt.test.ts`
Expected: FAIL, weil `./SzenenInhalt` fehlt.

- [ ] **Step 3: `SzenenInhalt`**

Neue Datei `src/editor/SzenenInhalt.ts`:

```ts
import * as THREE from 'three';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import { baueAbleitungen } from './darstellung/Ableitungen';
import { type Darstellungen, teilDaten } from './darstellung/Darstellung';
import { kugel } from './darstellung/formen';
import { START } from './darstellung/materialien';
import { standardDarstellungen } from './darstellung/standardDarstellungen';
import type { Treffer } from './SnapService';

interface Eintrag {
  readonly objekt: LagerObjekt;
  readonly gruppe: THREE.Group;
}

/**
 * Die Meshes zum Bauwerk, ohne Renderer und Kamera (Spec v3, D5). Baut nur neu, was sich geändert hat:
 * Ein Objekt, das `===` dem letzten gleicht, behält seine Gruppe; Auswahl und Markierung tauschen nur Materialien.
 */
export class SzenenInhalt {
  readonly wurzel = new THREE.Group();
  private readonly eintraege = new Map<string, Eintrag>();
  private ableitungen: { readonly bauwerk: Bauwerk; readonly gruppe: THREE.Group } | null = null;
  private start: { readonly punkt: Vec3; readonly mesh: THREE.Mesh } | null = null;

  constructor(
    private readonly darstellungen: Darstellungen = standardDarstellungen(),
    private readonly arten: ObjektRegister = standardArten(),
  ) {}

  zeige(bauwerk: Bauwerk, markiert: ReadonlySet<string>, stangenStart: Vec3 | null): void {
    this.gleicheObjekteAb(bauwerk);
    this.gleicheAbleitungenAb(bauwerk);
    this.gleicheStartAb(stangenStart);
    this.faerbe(markiert);
  }

  /** Meshes, die einen Klick fangen: Arten mit Klickverhalten `immer` stets, die anderen nur, wenn das Werkzeug sie nennt (Spec v2b, D2). */
  ziele(klickZiele: readonly ArtName[]): THREE.Object3D[] {
    const ziele: THREE.Object3D[] = [];
    for (const { gruppe } of this.eintraege.values()) {
      gruppe.traverse((k) => {
        const daten = teilDaten(k);
        if (daten?.klickbar && (this.arten.art(daten.art).klick === 'immer' || klickZiele.includes(daten.art))) ziele.push(k);
      });
    }
    return ziele;
  }

  /** Der Treffer zu einem getroffenen Mesh; null, wenn es zu keinem Objekt gehört. */
  static treffer(objekt: THREE.Object3D, punkt: Vec3): Treffer | null {
    const daten = teilDaten(objekt);
    return daten ? { art: 'objekt', objektArt: daten.art, id: daten.teilId, punkt } : null;
  }

  private gleicheObjekteAb(bauwerk: Bauwerk): void {
    const ids = new Set<string>();
    for (const o of bauwerk.objekte) {
      ids.add(o.id);
      const alt = this.eintraege.get(o.id);
      if (alt?.objekt === o) continue;
      if (alt) this.entferne(alt.gruppe);
      const gruppe = this.darstellungen[o.art].baue(o);
      gruppe.name = o.id;
      this.wurzel.add(gruppe);
      this.eintraege.set(o.id, { objekt: o, gruppe });
    }
    for (const [id, { gruppe }] of this.eintraege) {
      if (ids.has(id)) continue;
      this.entferne(gruppe);
      this.eintraege.delete(id);
    }
  }

  private gleicheAbleitungenAb(bauwerk: Bauwerk): void {
    if (this.ableitungen?.bauwerk === bauwerk) return;
    if (this.ableitungen) this.entferne(this.ableitungen.gruppe);
    const gruppe = baueAbleitungen(bauwerk);
    this.wurzel.add(gruppe);
    this.ableitungen = { bauwerk, gruppe };
  }

  /** Die Startkugel hängt nicht am Bauwerk: Beim ersten Klick eines Zwei-Klick-Werkzeugs ändert sich nur `stangenStart`. */
  private gleicheStartAb(punkt: Vec3 | null): void {
    if ((this.start?.punkt ?? null) === punkt) return;
    if (this.start) this.entferne(this.start.mesh);
    this.start = null;
    if (punkt === null) return;
    const mesh = kugel(punkt, 0.1, START);
    mesh.name = 'start';
    this.wurzel.add(mesh);
    this.start = { punkt, mesh };
  }

  private faerbe(markiert: ReadonlySet<string>): void {
    for (const { gruppe } of this.eintraege.values()) {
      gruppe.traverse((k) => {
        const daten = teilDaten(k);
        if (!(k instanceof THREE.Mesh) || !daten?.markiert) return;
        k.material = markiert.has(daten.teilId) || markiert.has(daten.objektId) ? daten.markiert : daten.normal;
      });
    }
  }

  /** Nimmt etwas aus der Szene und gibt seine Geometrie frei; die Materialien sind geteilt und bleiben. */
  private entferne(objekt: THREE.Object3D): void {
    this.wurzel.remove(objekt);
    objekt.traverse((k) => {
      if (k instanceof THREE.Mesh || k instanceof THREE.Line) k.geometry.dispose();
    });
  }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/editor/SzenenInhalt.test.ts`
Expected: PASS (8 Tests).

- [ ] **Step 5: `Szene` reicht an den `SzenenInhalt` weiter**

`src/editor/Szene.ts` ganz ersetzen:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName } from '../model/LagerObjekt';
import { Vec3 } from '../model/Vec3';
import { standardDarstellungen } from './darstellung/standardDarstellungen';
import type { Treffer } from './SnapService';
import { SzenenInhalt } from './SzenenInhalt';

/** three.js mit Renderer, Kamera und Boden. Kennt das Modell nur lesend; die Meshes hält der SzenenInhalt. */
export class Szene {
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly kamera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  private readonly szene = new THREE.Scene();
  private readonly steuerung: OrbitControls;
  private readonly inhalt: SzenenInhalt;
  private readonly boden: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();

  constructor(
    private readonly container: HTMLElement,
    arten: ObjektRegister = standardArten(),
  ) {
    this.inhalt = new SzenenInhalt(standardDarstellungen(), arten);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);
    this.kamera.position.set(5, 4, 6);
    this.steuerung = new OrbitControls(this.kamera, this.renderer.domElement);
    this.steuerung.target.set(1.2, 1, 0);
    this.szene.background = new THREE.Color(0xdfe9f3);
    const sonne = new THREE.DirectionalLight(0xffffff, 1.5);
    sonne.position.set(5, 10, 4);
    this.boden = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0x7fae5a }));
    this.boden.rotation.x = -Math.PI / 2;
    this.szene.add(
      new THREE.HemisphereLight(0xffffff, 0x556644, 1.2),
      sonne,
      this.boden,
      new THREE.GridHelper(40, 40, 0x5d8a3f, 0x6b9a4b),
      this.inhalt.wurzel,
    );
    new ResizeObserver(() => this.passeGroesseAn()).observe(container);
    this.passeGroesseAn();
    this.renderer.setAnimationLoop(() => {
      this.steuerung.update();
      this.renderer.render(this.szene, this.kamera);
    });
  }

  get leinwand(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** Baut nur neu, was sich geändert hat (Spec v3, D5). */
  zeige(bauwerk: Bauwerk, markiert: ReadonlySet<string>, stangenStart: Vec3 | null): void {
    this.inhalt.zeige(bauwerk, markiert, stangenStart);
  }

  treffer(e: PointerEvent, klickZiele: readonly ArtName[]): Treffer | null {
    const rect = this.leinwand.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kamera);
    const getroffen = this.raycaster.intersectObjects(this.inhalt.ziele(klickZiele), false)[0];
    const treffer = getroffen ? SzenenInhalt.treffer(getroffen.object, new Vec3(getroffen.point.x, getroffen.point.y, getroffen.point.z)) : null;
    if (treffer) return treffer;
    const aufBoden = this.raycaster.intersectObject(this.boden, false)[0];
    return aufBoden ? { art: 'boden', punkt: new Vec3(aufBoden.point.x, 0, aufBoden.point.z) } : null;
  }

  private passeGroesseAn(): void {
    const { clientWidth: breite, clientHeight: hoehe } = this.container;
    this.renderer.setSize(breite, hoehe, false);
    this.kamera.aspect = breite / Math.max(hoehe, 1);
    this.kamera.updateProjectionMatrix();
  }
}
```

- [ ] **Step 6: Volle Prüfung und Sichtvergleich**

Run: `npx vitest run`
Expected: 45 Dateien, 390 Tests, alle grün.
Run: `npm run build`
Expected: Exit 0.
Run: `npm run e2e`
Expected: 6 passed.
Run: `npx playwright test -c e2e-sicht/playwright.config.ts`
Expected: 5 passed; die Kochstelle, die drei alten Links und die v3-Datei sehen aus wie vor E0. Scheitert ein Bild, **nicht** `--update-snapshots` aufrufen: Das Differenzbild steht in `e2e-sicht/test-results/`. Den Unterschied melden (BLOCKED), statt die Referenz zu überschreiben. Entfällt der Sichtvergleich laut Task 1, Step 1, prüft Jakob hier per Augenschein.

- [ ] **Step 7: Commit**

```bash
git add src/editor/SzenenInhalt.ts src/editor/SzenenInhalt.test.ts src/editor/Szene.ts
git commit -m "perf: rebuild only changed objects in the scene"
```

---

### Task 10: Editor für E1 vorbereiten (Mehrfachauswahl, ein Undo-Schritt für mehrere Objekte)

**Files:**
- Modify: `src/editor/Editor.ts` (ganze Datei)
- Test: `src/editor/Editor.test.ts`

**Interfaces:**
- Consumes: `Bauwerk.objekt`, `Bauwerk.ersetze`, `Bauwerk.enthaelt` (Task 2); `LagerObjekt.verschobenUm` (Task 1); `erzeugeWerkzeug(name, arten)` (Task 7).
- Produces (Spec D6, nur Schnittstelle, keine UI):
  - `EditorZustand.ausgewaehlt: ReadonlySet<string>` (ids, die das Bauwerk nicht kennt, fallen heraus); `EditorZustand.auswahl` ist daraus abgeleitet: die eine id oder `null` (auch bei mehreren);
  - `Editor.waehleMehrere(ids: readonly string[]): void` (meldet den Zustand);
  - `Editor.aendereObjekte(ids: readonly string[], fn: (o: LagerObjekt) => LagerObjekt): boolean`: ein Undo-Schritt; unbekannte ids zählen nicht; ändert sich nichts, entsteht kein Undo-Schritt; ein `RangeError` lehnt die ganze Änderung ab (Meldung, Rückgabe `false`).
  - `dreheAuswahl` dreht weiter nur Baugruppen.

- [ ] **Step 1: Failing tests schreiben**

In `src/editor/Editor.test.ts` nach dem letzten Test einfügen (`Plane`, `Seil`, `STANDARD_PLANE` sind schon importiert):

```ts

  it('führt die Auswahl als Menge; auswahl ist die eine id oder null (Spec v3, D6)', () => {
    const seil = new Seil('l', new Vec3(5, 2, 0), new Vec3(7, 0, 0));
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein).mitSeil(seil));
    e.klick({ art: 'objekt', objektArt: 'dreibein', id: 'd-bein-2', punkt: Vec3.NULL });
    expect([...e.zustand().ausgewaehlt]).toEqual(['d']);
    expect(e.zustand().auswahl).toBe('d');
    e.waehleMehrere(['d', 'l', 'weg']);
    expect([...e.zustand().ausgewaehlt]).toEqual(['d', 'l']);
    expect(e.zustand().auswahl).toBeNull();
    e.waehleMehrere(['l', 'weg']);
    expect(e.zustand().auswahl).toBe('l');
    e.taste('r', false); // R dreht nur Baugruppen (Spec v3, D6)
    expect(e.zustand().kannRueckgaengig).toBe(false);
    e.taste('Escape', false);
    expect(e.zustand().ausgewaehlt.size).toBe(0);
  });

  it('ändert mehrere Objekte in einem Undo-Schritt (Spec v3, D6)', () => {
    const seil = new Seil('l', new Vec3(5, 2, 0), new Vec3(7, 0, 0));
    const anfang = Bauwerk.leer().mitGruppe(dreibein).mitSeil(seil);
    const e = neuerEditor(anfang);
    expect(e.aendereObjekte(['d', 'l', 'weg'], (o) => o.verschobenUm(new Vec3(1, 0, 0)))).toBe(true);
    expect(e.bauwerk.gruppe('d')?.position.equals(new Vec3(1, 0, 0), 1e-9)).toBe(true);
    expect(e.bauwerk.seil('l')?.start.equals(new Vec3(6, 2, 0), 1e-9)).toBe(true);
    e.rueckgaengig();
    expect(e.bauwerk).toBe(anfang);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('lehnt eine ungültige Mehrfachänderung ganz ab und legt ohne Änderung keinen Undo-Schritt an', () => {
    const plane = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);
    const anfang = Bauwerk.leer().mitGruppe(dreibein).mitPlane(plane);
    const e = neuerEditor(anfang);
    expect(e.aendereObjekte(['d', 'pl'], (o) => o.verschobenUm(new Vec3(0, -1, 0)))).toBe(false);
    expect(e.zustand().meldung).toBe('Plane reicht in den Boden: Neigung, Breite oder Länge verringern.');
    expect(e.bauwerk).toBe(anfang);
    expect(e.aendereObjekte(['weg'], (o) => o.verschobenUm(new Vec3(1, 0, 0)))).toBe(true);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/editor/Editor.test.ts`
Expected: FAIL. `ausgewaehlt` ist undefined; `waehleMehrere` und `aendereObjekte` sind keine Funktionen. Die 25 bisherigen Tests bleiben grün.

- [ ] **Step 3: Editor umbauen**

`src/editor/Editor.ts` ganz ersetzen:

```ts
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import { DREH_SCHRITT } from './konstanten';
import { SnapService, type Treffer } from './SnapService';
import { Verlauf } from './Verlauf';
import { type EditorKontext, erzeugeWerkzeug, type Werkzeug, type WerkzeugName } from './Werkzeuge';

export interface EditorZustand {
  readonly bauwerk: Bauwerk;
  /** Alle ausgewählten Objekte (Spec v3, D6). Ids, die das Bauwerk nicht kennt, fallen heraus. */
  readonly ausgewaehlt: ReadonlySet<string>;
  /** Die eine ausgewählte id; null, wenn nichts oder mehr als ein Objekt ausgewählt ist. */
  readonly auswahl: string | null;
  readonly markiert: ReadonlySet<string>;
  readonly werkzeug: WerkzeugName;
  readonly stangenStart: Vec3 | null;
  readonly meldung: string | null;
  readonly kannRueckgaengig: boolean;
  readonly kannWiederholen: boolean;
}

export interface EditorOptionen {
  readonly arten?: ObjektRegister;
  readonly snap?: SnapService;
  readonly neueId?: (praefix: string) => string;
}

const zufallsId = (praefix: string): string => `${praefix}-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Controller: hält Undo-Verlauf, Auswahl, Markierung und aktives Werkzeug.
 * Jede öffentliche Methode meldet den neuen Zustand genau einmal an die Beobachter.
 */
export class Editor implements EditorKontext {
  readonly snap: SnapService;
  private readonly arten: ObjektRegister;
  private verlauf: Verlauf<Bauwerk>;
  private ausgewaehltIds: ReadonlySet<string> = new Set();
  private markiertIds: ReadonlySet<string> = new Set();
  private werkzeug: Werkzeug;
  private meldung: string | null = null;
  private readonly beobachter: ((z: EditorZustand) => void)[] = [];
  private readonly idErzeuger: (praefix: string) => string;

  constructor(anfang: Bauwerk, optionen: EditorOptionen = {}) {
    this.verlauf = Verlauf.start(anfang);
    this.arten = optionen.arten ?? standardArten();
    this.snap = optionen.snap ?? new SnapService(this.arten);
    this.idErzeuger = optionen.neueId ?? zufallsId;
    this.werkzeug = erzeugeWerkzeug('auswahl', this.arten);
  }

  get bauwerk(): Bauwerk {
    return this.verlauf.aktuell;
  }

  /** Welche Seile oder Planen Klicks fangen sollen; hängt vom Werkzeug ab (Spec v2b, D2). */
  get klickZiele(): readonly ArtName[] {
    return this.werkzeug.klickZiele;
  }

  aendere(neu: Bauwerk): void {
    this.verlauf = this.verlauf.mit(neu);
    this.markiertIds = new Set();
  }

  waehle(id: string | null): void {
    this.ausgewaehltIds = id === null ? new Set() : new Set([id]);
  }

  /** Wählt mehrere Objekte auf einmal (Spec v3, D6). Die Bedienung dafür kommt mit E1. */
  waehleMehrere(ids: readonly string[]): void {
    this.ausgewaehltIds = new Set(ids);
    this.melde();
  }

  neueId(praefix: string): string {
    return this.idErzeuger(praefix);
  }

  abonniere(beobachter: (z: EditorZustand) => void): void {
    this.beobachter.push(beobachter);
    beobachter(this.zustand());
  }

  zustand(): EditorZustand {
    const ausgewaehlt: ReadonlySet<string> = new Set([...this.ausgewaehltIds].filter((id) => this.bauwerk.enthaelt(id)));
    return {
      bauwerk: this.bauwerk,
      ausgewaehlt,
      auswahl: ausgewaehlt.size === 1 ? ([...ausgewaehlt][0] ?? null) : null,
      markiert: this.markiertIds,
      werkzeug: this.werkzeug.name,
      stangenStart: this.werkzeug.angefangen,
      meldung: this.meldung,
      kannRueckgaengig: this.verlauf.kannRueckgaengig,
      kannWiederholen: this.verlauf.kannWiederholen,
    };
  }

  klick(treffer: Treffer): void {
    this.fuehreAus(() => this.werkzeug.onKlick(treffer, this));
  }

  waehleWerkzeug(name: WerkzeugName): void {
    this.werkzeug.abbrechen();
    this.werkzeug = erzeugeWerkzeug(name, this.arten);
    this.melde();
  }

  setzeBauwerk(bauwerk: Bauwerk): void {
    this.fuehreAus(() => {
      this.waehle(null);
      this.aendere(bauwerk);
    });
  }

  /**
   * Änderung aus dem Parameter-Panel. Die Änderung selbst muss innerhalb der Funktion passieren, damit ein RangeError abgefangen wird.
   * Gibt false zurück, wenn der Editor die Änderung abgelehnt hat (die Meldung steht dann im Zustand).
   */
  aendereMit(aenderung: (b: Bauwerk) => Bauwerk): boolean {
    return this.fuehreAus(() => this.aendere(aenderung(this.bauwerk)));
  }

  /**
   * Wendet `fn` auf mehrere Objekte an; das ergibt einen Undo-Schritt (Spec v3, D6). Unbekannte ids zählen nicht,
   * und ohne Änderung entsteht kein Schritt. Ein RangeError lehnt alles ab; die Meldung steht dann im Zustand.
   */
  aendereObjekte(ids: readonly string[], fn: (o: LagerObjekt) => LagerObjekt): boolean {
    return this.fuehreAus(() => {
      const neu = ids.reduce((b, id) => {
        const o = b.objekt(id);
        return o ? b.ersetze(fn(o)) : b;
      }, this.bauwerk);
      if (neu !== this.bauwerk) this.aendere(neu);
    });
  }

  loescheAuswahl(): void {
    const id = this.zustand().auswahl;
    if (id === null) return;
    this.fuehreAus(() => {
      this.waehle(null);
      this.aendere(this.bauwerk.ohne(id));
    });
  }

  /** Dreht wie bisher nur Baugruppen; das Drehen aller Arten kommt mit E1. */
  dreheAuswahl(winkel = DREH_SCHRITT): void {
    const id = this.zustand().auswahl;
    const gruppe = id === null ? undefined : this.bauwerk.gruppe(id);
    if (!gruppe) return;
    this.aendereMit((b) => b.ersetzeGruppe(gruppe.gedreht(winkel)));
  }

  rueckgaengig(): void {
    this.verlauf = this.verlauf.rueckgaengig();
    this.markiertIds = new Set();
    this.melde();
  }

  wiederholen(): void {
    this.verlauf = this.verlauf.wiederholen();
    this.markiertIds = new Set();
    this.melde();
  }

  markiere(ids: readonly string[]): void {
    this.markiertIds = new Set(ids);
    this.melde();
  }

  zeigeMeldung(text: string | null): void {
    this.meldung = text;
    this.melde();
  }

  /** Tastenkürzel. Liefert true, wenn die Taste behandelt wurde. */
  taste(taste: string, strg: boolean): boolean {
    const klein = taste.toLowerCase();
    if (strg && klein === 'z') this.rueckgaengig();
    else if (strg && klein === 'y') this.wiederholen();
    else if (!strg && (taste === 'Delete' || taste === 'Backspace')) this.loescheAuswahl();
    else if (!strg && klein === 'r') this.dreheAuswahl();
    else if (taste === 'Escape') {
      this.werkzeug.abbrechen();
      this.waehle(null);
      this.melde();
    } else return false;
    return true;
  }

  private fuehreAus(aktion: () => void): boolean {
    let uebernommen = true;
    try {
      aktion();
      this.meldung = null;
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
      this.meldung = e.message;
      uebernommen = false;
    }
    this.melde();
    return uebernommen;
  }

  private melde(): void {
    const z = this.zustand();
    this.beobachter.forEach((b) => b(z));
  }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/editor src/ui`
Expected: PASS (`Editor.test.ts` 28 Tests; `ParameterPanel.test.ts` unverändert grün, es liest weiter `auswahl`).
Run: `npx vitest run`
Expected: 45 Dateien, 393 Tests, alle grün.
Run: `npx tsc --noEmit`
Expected: Exit 0. `main.ts` liest weiter `z.auswahl` und bleibt unverändert.

- [ ] **Step 5: Commit**

```bash
git add src/editor/Editor.ts src/editor/Editor.test.ts
git commit -m "feat: prepare multi-selection and one-step multi-object changes in the editor"
```

---

### Task 10b: Regel-Einstellungen (Spec D8)

Die einzige sichtbare Neuerung in E0: Jede Regel lässt sich abschalten, ihre Werte lassen sich einstellen, und beides steht in der Plandatei (und im Link).

**Files:**
- Create: `src/rules/RegelEinstellungen.ts`, `src/share/RegelnFormat.ts`, `src/ui/RegelnPanel.ts`, `e2e/regeln.spec.ts`
- Modify: `src/rules/standardRegeln.ts` (ganze Datei), `src/rules/RuleEngine.ts` (ganze Datei), `src/model/Bauwerk.ts`, `src/share/BauwerkSerializer.ts`, `src/main.ts`, `index.html`, `src/style.css`
- Test: `src/rules/RegelEinstellungen.test.ts` (neu), `src/rules/regelEinstellungen.integration.test.ts` (neu), `src/rules/RuleEngine.test.ts`, `src/model/Bauwerk.test.ts`, `src/share/RegelnFormat.test.ts` (neu), `src/ui/RegelnPanel.test.ts` (neu)
- Die Regel-Klassen (`*Rule.ts`) und `src/rules/constants.ts` bleiben unverändert; ihre Konstruktoren nehmen die Werte schon heute als Parameter.

**Interfaces:**
- Consumes: `Bauwerk` aus Task 2 (Konstruktor, `von`, `mit`, `ersetze`, `ohne`); `BauwerkSerializer` aus Task 5; `lesen.ts` (Task 4a); `Editor.aendereMit`, `Editor.abonniere`; `AnsichtsModus.aktiv`; die Konstruktoren der Regeln: `ABockQuerRule(minWinkelGrad)`, `ViereckRule(planarToleranz)`, `StandflaecheRule(maxVerhaeltnis, minHoehe)`, `SpreizungRule(minGrad, maxGrad)`, `AbspannwinkelRule(minGrad, maxGrad)`, `StolperfalleRule(minHoehe)`; `LoseStangeRule` und `LosesSeilRule` ohne Werte.
- Produces:
  - `src/rules/RegelEinstellungen.ts`: `REGEL_NAMEN = ['R1', …, 'R8'] as const`, `type RegelName`; `WERT_SCHLUESSEL` (die neun Regel-Schwellwerte aus `constants.ts`, als Namen der Konstanten), `type WertSchluessel`, `type Regelwerte = Readonly<Partial<Record<WertSchluessel, number>>>`; `istRegelName(x): x is RegelName`, `istWertSchluessel(x): x is WertSchluessel`; `class RegelEinstellungen` mit `static standard()`, `static von(aus: Iterable<RegelName>, werte: Regelwerte)`, `readonly aus: ReadonlySet<RegelName>`, `readonly werte: Regelwerte`, `get istStandard: boolean`, `istAus(name)`, `wert(schluessel): number`, `mitAus(name, aus: boolean)`, `mitWert(schluessel, wert)`.
  - `Bauwerk.regelEinstellungen: RegelEinstellungen` (Standard: alles an, keine Werte gesetzt), `Bauwerk.mitRegelEinstellungen(e): Bauwerk`, `Bauwerk.von(liste, regelEinstellungen = RegelEinstellungen.standard())`.
  - `standardRegeln(einstellungen = RegelEinstellungen.standard()): Rule[]`; `new RuleEngine(regeln, aus: ReadonlySet<string> = new Set())`; `RuleEngine.fuer(einstellungen): RuleEngine`.
  - `BauwerkJson.regeln?: RegelnJson` mit `RegelnJson = { aus: readonly RegelName[]; werte: Regelwerte }`; `regelnZuJson(e)`, `regelnAusJson(d)` in `src/share/RegelnFormat.ts`.
  - `class RegelnPanel(knopf: HTMLButtonElement, liste: HTMLElement, zeile: HTMLElement, editor: Editor, nurLesen: () => boolean)` mit `zeige(einstellungen: RegelEinstellungen): void`; in `index.html` `#btn-regeln`, `#ausgeschaltet`, `#regeln`.

**Entscheidungen zu D8:**
- Einstellbar sind die neun Regel-Schwellwerte aus `constants.ts`. `SEIL_ZUGABE_PRO_ENDE` steht auch dort, ist aber ein Wert der Materialliste, keine Regel; er bleibt fest.
- Winkel (R1, R4, R6) müssen in (0, 90] liegen, alle anderen Werte > 0. Untergrenze < Obergrenze gilt für R4 und R6, gerechnet mit den wirksamen Werten (gesetzt oder Standard). `von` prüft erst alle Werte, dann die Paare; so lässt sich eine Datei mit R4 40–45° laden, obwohl 40 allein über dem Standard-Maximum 35 läge.
- `regeln` wird nur geschrieben, wenn etwas vom Standard abweicht; Dateien ohne Einstellungen bleiben Byte für Byte wie nach Task 5. Ein Feld `regeln` in den Versionen 1–3 wird übergangen.
- Die Liste ist ein aufklappbarer Bereich unter dem Knopf „Regeln…“ (kein Dialog). Jede Änderung läuft über `Editor.aendereMit` und ist damit ein Undo-Schritt.
- Der R2-Fix (`FesteKnoten`) lässt den Konstruktor von `ViereckRule` und `constants.ts` unverändert (geprüft auf `b39026e`); R2 bleibt mit seiner Ebenen-Toleranz einstellbar und an/aus schaltbar. Hat sich das bis zum Merge geändert (anderer erster Parameter oder neue Schwellwerte), STOP und Jakob fragen, welche Werte einstellbar sein sollen.

- [ ] **Step 1: Failing tests für Modell, Prüfung und Bauwerk schreiben**

Neue Datei `src/rules/RegelEinstellungen.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { R4_MAX_BEINWINKEL_GRAD, R7_MIN_HOEHE } from './constants';
import { REGEL_NAMEN, RegelEinstellungen, type WertSchluessel } from './RegelEinstellungen';

const standard = RegelEinstellungen.standard();

describe('RegelEinstellungen (Spec v3, D8)', () => {
  it('hat standardmäßig alle Regeln an und keine Werte gesetzt', () => {
    expect(standard.istStandard).toBe(true);
    expect(REGEL_NAMEN.filter((n) => standard.istAus(n))).toEqual([]);
    expect(standard.werte).toEqual({});
    expect(RegelEinstellungen.standard()).toBe(standard);
  });

  it('schaltet Regeln ab und wieder an, ohne sich selbst zu ändern', () => {
    const ohneR4 = standard.mitAus('R4', true);
    expect(ohneR4.istAus('R4')).toBe(true);
    expect(ohneR4.istStandard).toBe(false);
    expect(standard.istAus('R4')).toBe(false);
    expect(ohneR4.mitAus('R4', true)).toBe(ohneR4);
    expect(ohneR4.mitAus('R4', false).istStandard).toBe(true);
  });

  it('setzt Werte und liest sonst den Standard aus constants.ts', () => {
    const e = standard.mitWert('R4_MAX_BEINWINKEL_GRAD', 40);
    expect(e.wert('R4_MAX_BEINWINKEL_GRAD')).toBe(40);
    expect(e.werte).toEqual({ R4_MAX_BEINWINKEL_GRAD: 40 });
    expect(standard.wert('R4_MAX_BEINWINKEL_GRAD')).toBe(R4_MAX_BEINWINKEL_GRAD);
    expect(e.wert('R7_MIN_HOEHE')).toBe(R7_MIN_HOEHE);
  });

  it.each<[string, WertSchluessel, number, string]>([
    ['Höhe 0', 'R3_MIN_HOEHE', 0, 'Wert muss größer als 0 sein'],
    ['negative Höhe', 'R7_MIN_HOEHE', -1, 'Wert muss größer als 0 sein'],
    ['keine Zahl', 'R2_PLANAR_TOLERANZ_RELATIV', Number.NaN, 'Wert muss größer als 0 sein'],
    ['unendlich', 'R3_MAX_HOEHE_ZU_BREITE', Number.POSITIVE_INFINITY, 'Wert muss größer als 0 sein'],
    ['Winkel 0', 'R1_MIN_WINKEL_ZUR_EBENE_GRAD', 0, 'Winkel muss zwischen 0 und 90° liegen'],
    ['Winkel über 90°', 'R4_MAX_BEINWINKEL_GRAD', 95, 'Winkel muss zwischen 0 und 90° liegen'],
    ['R4 Untergrenze über der Obergrenze', 'R4_MIN_BEINWINKEL_GRAD', 40, 'Untergrenze muss kleiner als die Obergrenze sein'],
    ['R6 Untergrenze gleich der Obergrenze', 'R6_MIN_WINKEL_GRAD', 60, 'Untergrenze muss kleiner als die Obergrenze sein'],
  ])('lehnt ab: %s', (_name, schluessel, wert, meldung) => {
    expect(() => standard.mitWert(schluessel, wert)).toThrow(RangeError);
    expect(() => standard.mitWert(schluessel, wert)).toThrow(meldung);
  });

  it('prüft beim Bau in einem Schritt erst alle Werte, dann die Paare', () => {
    const e = RegelEinstellungen.von(['R2'], { R4_MIN_BEINWINKEL_GRAD: 40, R4_MAX_BEINWINKEL_GRAD: 45 });
    expect([e.wert('R4_MIN_BEINWINKEL_GRAD'), e.wert('R4_MAX_BEINWINKEL_GRAD'), e.istAus('R2')]).toEqual([40, 45, true]);
    expect(() => RegelEinstellungen.von([], { R6_MIN_WINKEL_GRAD: 50, R6_MAX_WINKEL_GRAD: 45 })).toThrow('Untergrenze muss kleiner als die Obergrenze sein');
  });
});
```

Neue Datei `src/rules/regelEinstellungen.integration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_DREIBEIN } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { RegelEinstellungen } from './RegelEinstellungen';
import type { Hinweis } from './Rule';
import { RuleEngine } from './RuleEngine';
import { standardRegeln } from './standardRegeln';

/** Ein Dreibein mit Beinwinkel asin(r ÷ 2,2): r = 1,35 m → 38°, r = 1,4 m → 40°, r = 0,2 m → 5°. */
const dreibein = (fusskreisradius: number): Bauwerk =>
  Bauwerk.leer().mitGruppe(new Dreibein('d', Vec3.NULL, 0, { ...STANDARD_DREIBEIN, fusskreisradius }));
const regeln = (hinweise: readonly Hinweis[]): string[] => hinweise.map((h) => h.regel);

describe('Regel-Einstellungen in der Prüfung (Spec v3, D8)', () => {
  it('ergibt ohne Einstellungen genau die Hinweise von heute', () => {
    const heute = new RuleEngine(standardRegeln());
    for (const b of [kochstelle(), kochstelle().ohne('first'), dreibein(1.4), dreibein(0.2), Bauwerk.leer()]) {
      expect(RuleEngine.fuer(b.regelEinstellungen).pruefe(b)).toEqual(heute.pruefe(b));
    }
    expect(regeln(heute.pruefe(dreibein(1.4)))).toEqual(['R4']);
  });

  it('überspringt eine abgeschaltete Regel', () => {
    expect(regeln(RuleEngine.fuer(RegelEinstellungen.standard().mitAus('R4', true)).pruefe(dreibein(1.4)))).toEqual([]);
  });

  it('prüft mit dem eingestellten Wert: R4 höchstens 40° → keine Warnung bei 38°', () => {
    const b = dreibein(1.35);
    expect(regeln(RuleEngine.fuer(RegelEinstellungen.standard()).pruefe(b))).toEqual(['R4']);
    expect(regeln(RuleEngine.fuer(RegelEinstellungen.standard().mitWert('R4_MAX_BEINWINKEL_GRAD', 40)).pruefe(b))).toEqual([]);
  });
});
```

In `src/rules/RuleEngine.test.ts` innerhalb von `describe('RuleEngine', …)` nach dem letzten Test einfügen:

```ts

  it('überspringt abgeschaltete Regeln (Spec v3, D8)', () => {
    const mitAus = new RuleEngine([new ZaehlRegel('A'), new ZaehlRegel('B')], new Set(['A']));
    expect(mitAus.pruefe(kochstelle()).map((x) => x.regel)).toEqual(['B']);
  });
```

In `src/model/Bauwerk.test.ts` den Import `import { RegelEinstellungen } from '../rules/RegelEinstellungen';` ergänzen und am Ende der Datei anhängen:

```ts

describe('Regel-Einstellungen im Bauwerk (Spec v3, D8)', () => {
  it('hat standardmäßig alle Regeln an und keine Werte gesetzt', () => {
    expect(Bauwerk.leer().regelEinstellungen.istStandard).toBe(true);
    expect(Bauwerk.von([dreibein]).regelEinstellungen).toBe(RegelEinstellungen.standard());
  });

  it('tauscht die Einstellungen, ohne Objekte zu ändern, und behält sie bei allen Objekt-Änderungen', () => {
    const e = RegelEinstellungen.standard().mitAus('R4', true);
    const b = Bauwerk.von([dreibein, frei]).mitRegelEinstellungen(e);
    expect(b.regelEinstellungen).toBe(e);
    expect(b.objekte[0]).toBe(dreibein);
    expect(b.mitRegelEinstellungen(e)).toBe(b);
    const geaendert = b.mit(abock).ersetze(dreibein.gedreht(0.1)).ohne('s');
    expect(geaendert.regelEinstellungen).toBe(e);
    expect(Bauwerk.von([dreibein], e).regelEinstellungen).toBe(e);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/rules src/model/Bauwerk.test.ts`
Expected: FAIL. `./RegelEinstellungen` fehlt, `RuleEngine.fuer` gibt es nicht, und die `RuleEngine` ignoriert ihren zweiten Parameter.

- [ ] **Step 3: Modell der Einstellungen**

Neue Datei `src/rules/RegelEinstellungen.ts`:

```ts
import {
  R1_MIN_WINKEL_ZUR_EBENE_GRAD,
  R2_PLANAR_TOLERANZ_RELATIV,
  R3_MAX_HOEHE_ZU_BREITE,
  R3_MIN_HOEHE,
  R4_MAX_BEINWINKEL_GRAD,
  R4_MIN_BEINWINKEL_GRAD,
  R6_MAX_WINKEL_GRAD,
  R6_MIN_WINKEL_GRAD,
  R7_MIN_HOEHE,
} from './constants';

export const REGEL_NAMEN = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'] as const;
export type RegelName = (typeof REGEL_NAMEN)[number];

/** Die einstellbaren Schwellwerte, benannt wie ihre Konstanten in constants.ts. */
export const WERT_SCHLUESSEL = [
  'R1_MIN_WINKEL_ZUR_EBENE_GRAD',
  'R2_PLANAR_TOLERANZ_RELATIV',
  'R3_MAX_HOEHE_ZU_BREITE',
  'R3_MIN_HOEHE',
  'R4_MIN_BEINWINKEL_GRAD',
  'R4_MAX_BEINWINKEL_GRAD',
  'R6_MIN_WINKEL_GRAD',
  'R6_MAX_WINKEL_GRAD',
  'R7_MIN_HOEHE',
] as const;
export type WertSchluessel = (typeof WERT_SCHLUESSEL)[number];
export type Regelwerte = Readonly<Partial<Record<WertSchluessel, number>>>;

/** Die Standardwerte bleiben in constants.ts (Startwerte, von Jakob zu bestätigen). */
const STANDARD: Readonly<Record<WertSchluessel, number>> = {
  R1_MIN_WINKEL_ZUR_EBENE_GRAD,
  R2_PLANAR_TOLERANZ_RELATIV,
  R3_MAX_HOEHE_ZU_BREITE,
  R3_MIN_HOEHE,
  R4_MIN_BEINWINKEL_GRAD,
  R4_MAX_BEINWINKEL_GRAD,
  R6_MIN_WINKEL_GRAD,
  R6_MAX_WINKEL_GRAD,
  R7_MIN_HOEHE,
};

const WINKEL: ReadonlySet<WertSchluessel> = new Set<WertSchluessel>([
  'R1_MIN_WINKEL_ZUR_EBENE_GRAD',
  'R4_MIN_BEINWINKEL_GRAD',
  'R4_MAX_BEINWINKEL_GRAD',
  'R6_MIN_WINKEL_GRAD',
  'R6_MAX_WINKEL_GRAD',
]);

/** Untergrenze und Obergrenze derselben Regel. */
const PAARE: readonly (readonly [WertSchluessel, WertSchluessel])[] = [
  ['R4_MIN_BEINWINKEL_GRAD', 'R4_MAX_BEINWINKEL_GRAD'],
  ['R6_MIN_WINKEL_GRAD', 'R6_MAX_WINKEL_GRAD'],
];

export function istRegelName(x: unknown): x is RegelName {
  return typeof x === 'string' && (REGEL_NAMEN as readonly string[]).includes(x);
}

export function istWertSchluessel(x: unknown): x is WertSchluessel {
  return typeof x === 'string' && (WERT_SCHLUESSEL as readonly string[]).includes(x);
}

/**
 * Welche Regeln aus sind und welche Werte vom Standard abweichen (Spec v3, D8). Unveränderlich;
 * sie gehören zum Bauwerk, damit eine Änderung über den Verlauf läuft und mit Datei und Link reist.
 */
export class RegelEinstellungen {
  private static readonly STANDARD_INSTANZ = new RegelEinstellungen(new Set(), {});

  private constructor(
    readonly aus: ReadonlySet<RegelName>,
    readonly werte: Regelwerte,
  ) {}

  /** Alle Regeln an, alle Werte aus constants.ts. */
  static standard(): RegelEinstellungen {
    return RegelEinstellungen.STANDARD_INSTANZ;
  }

  /** Baut Einstellungen in einem Schritt, z. B. beim Laden: erst alle Werte prüfen, dann die Paare. */
  static von(aus: Iterable<RegelName>, werte: Regelwerte): RegelEinstellungen {
    const einstellungen = new RegelEinstellungen(new Set(aus), { ...werte });
    einstellungen.pruefe();
    return einstellungen;
  }

  get istStandard(): boolean {
    return this.aus.size === 0 && Object.keys(this.werte).length === 0;
  }

  istAus(name: RegelName): boolean {
    return this.aus.has(name);
  }

  /** Der wirksame Wert: eingestellt oder Standard. */
  wert(schluessel: WertSchluessel): number {
    return this.werte[schluessel] ?? STANDARD[schluessel];
  }

  mitAus(name: RegelName, aus: boolean): RegelEinstellungen {
    if (this.aus.has(name) === aus) return this;
    const neu = aus ? [...this.aus, name] : [...this.aus].filter((n) => n !== name);
    return new RegelEinstellungen(new Set(neu), this.werte);
  }

  /** Wirft einen RangeError mit deutscher Meldung, wenn der Wert nicht passt. */
  mitWert(schluessel: WertSchluessel, wert: number): RegelEinstellungen {
    const werte: Partial<Record<WertSchluessel, number>> = { ...this.werte, [schluessel]: wert };
    return RegelEinstellungen.von(this.aus, werte);
  }

  private pruefe(): void {
    for (const schluessel of WERT_SCHLUESSEL) {
      const wert = this.werte[schluessel];
      if (wert === undefined) continue;
      if (WINKEL.has(schluessel)) {
        if (!(Number.isFinite(wert) && wert > 0 && wert <= 90)) throw new RangeError('Winkel muss zwischen 0 und 90° liegen');
      } else if (!(Number.isFinite(wert) && wert > 0)) {
        throw new RangeError('Wert muss größer als 0 sein');
      }
    }
    for (const [unten, oben] of PAARE) {
      if (!(this.wert(unten) < this.wert(oben))) throw new RangeError('Untergrenze muss kleiner als die Obergrenze sein');
    }
  }
}
```

- [ ] **Step 4: Regeln und RuleEngine**

`src/rules/standardRegeln.ts` ganz ersetzen:

```ts
import { ABockQuerRule } from './ABockQuerRule';
import { AbspannwinkelRule } from './AbspannwinkelRule';
import { LoseStangeRule } from './LoseStangeRule';
import { LosesSeilRule } from './LosesSeilRule';
import { RegelEinstellungen } from './RegelEinstellungen';
import type { Rule } from './Rule';
import { SpreizungRule } from './SpreizungRule';
import { StandflaecheRule } from './StandflaecheRule';
import { StolperfalleRule } from './StolperfalleRule';
import { ViereckRule } from './ViereckRule';

/** R1–R8 mit den eingestellten Werten; ohne Einstellungen die Schwellwerte aus constants.ts (Spec v3, D8). */
export function standardRegeln(e: RegelEinstellungen = RegelEinstellungen.standard()): Rule[] {
  return [
    new ABockQuerRule(e.wert('R1_MIN_WINKEL_ZUR_EBENE_GRAD')),
    new ViereckRule(e.wert('R2_PLANAR_TOLERANZ_RELATIV')),
    new StandflaecheRule(e.wert('R3_MAX_HOEHE_ZU_BREITE'), e.wert('R3_MIN_HOEHE')),
    new SpreizungRule(e.wert('R4_MIN_BEINWINKEL_GRAD'), e.wert('R4_MAX_BEINWINKEL_GRAD')),
    new LoseStangeRule(),
    new AbspannwinkelRule(e.wert('R6_MIN_WINKEL_GRAD'), e.wert('R6_MAX_WINKEL_GRAD')),
    new StolperfalleRule(e.wert('R7_MIN_HOEHE')),
    new LosesSeilRule(),
  ];
}
```

`src/rules/RuleEngine.ts` ganz ersetzen:

```ts
import type { Bauwerk } from '../model/Bauwerk';
import { Analyse } from './Analyse';
import type { RegelEinstellungen } from './RegelEinstellungen';
import type { Hinweis, Rule } from './Rule';
import { standardRegeln } from './standardRegeln';

export class RuleEngine {
  /** @param aus Namen abgeschalteter Regeln; sie werden übersprungen (Spec v3, D8). */
  constructor(
    private readonly regeln: readonly Rule[],
    private readonly aus: ReadonlySet<string> = new Set(),
  ) {}

  /** R1–R8 mit den Einstellungen eines Bauwerks: eingestellte Werte, abgeschaltete Regeln übersprungen. */
  static fuer(einstellungen: RegelEinstellungen): RuleEngine {
    return new RuleEngine(standardRegeln(einstellungen), einstellungen.aus);
  }

  pruefe(bauwerk: Bauwerk): Hinweis[] {
    const analyse = new Analyse(bauwerk);
    return this.regeln.filter((r) => !this.aus.has(r.name)).flatMap((r) => r.pruefe(analyse));
  }
}
```

- [ ] **Step 5: Einstellungen im Bauwerk**

In `src/model/Bauwerk.ts` (Stand nach Task 2):

1. Nach `import { Plane } from './Plane';` einfügen: `import { RegelEinstellungen } from '../rules/RegelEinstellungen';`
2. Den Konstruktor-Kopf

```ts
  private constructor(readonly objekte: readonly LagerObjekt[]) {
```

ersetzen durch

```ts
  private constructor(
    readonly objekte: readonly LagerObjekt[],
    /** Regeln an/aus und eingestellte Werte (Spec v3, D8). Gehören zum Plan, nicht zu einem Objekt. */
    readonly regelEinstellungen: RegelEinstellungen = RegelEinstellungen.standard(),
  ) {
```

3. `von` ersetzen. Alt:

```ts
  static von(liste: readonly LagerObjekt[]): Bauwerk {
    const bauwerk = new Bauwerk([...liste]);
```

Neu:

```ts
  static von(liste: readonly LagerObjekt[], regelEinstellungen: RegelEinstellungen = RegelEinstellungen.standard()): Bauwerk {
    const bauwerk = new Bauwerk([...liste], regelEinstellungen);
```

4. In `mit`, `ersetze` und `ohne` die Einstellungen weitergeben:
   - `return new Bauwerk([...this.objekte, o]);` → `return new Bauwerk([...this.objekte, o], this.regelEinstellungen);`
   - `return new Bauwerk(this.objekte.map((x) => (x === alt ? o : x)));` → `return new Bauwerk(this.objekte.map((x) => (x === alt ? o : x)), this.regelEinstellungen);`
   - `return rest.length === this.objekte.length ? this : new Bauwerk(rest);` → `return rest.length === this.objekte.length ? this : new Bauwerk(rest, this.regelEinstellungen);`
5. Nach der Methode `ohne(…)` einfügen:

```ts

  /** Neue Regel-Einstellungen; alle Objekte bleiben dieselben (`===`). Über den Editor ein Undo-Schritt. */
  mitRegelEinstellungen(e: RegelEinstellungen): Bauwerk {
    return e === this.regelEinstellungen ? this : new Bauwerk(this.objekte, e);
  }
```

Run: `npx vitest run src/rules src/model`
Expected: PASS (`RegelEinstellungen.test.ts` 12 Tests, `regelEinstellungen.integration.test.ts` 3, `RuleEngine.test.ts` 4, `Bauwerk.test.ts` 22; alle anderen Regel-Tests unverändert grün).

- [ ] **Step 6: Failing tests für das Datenformat**

Neue Datei `src/share/RegelnFormat.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { RegelEinstellungen } from '../rules/RegelEinstellungen';
import { RuleEngine } from '../rules/RuleEngine';
import { standardRegeln } from '../rules/standardRegeln';
import { BauwerkSerializer } from './BauwerkSerializer';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const einstellungen = RegelEinstellungen.standard().mitAus('R4', true).mitWert('R4_MAX_BEINWINKEL_GRAD', 40);
const objekte = serializer.zuJson(kochstelle()).objekte;

describe('Regel-Einstellungen im Datenformat v4 (Spec v3, D8)', () => {
  it('schreibt sie als regeln und liest sie zurück', () => {
    const json = serializer.zuJson(kochstelle().mitRegelEinstellungen(einstellungen));
    expect(json.regeln).toEqual({ aus: ['R4'], werte: { R4_MAX_BEINWINKEL_GRAD: 40 } });
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(zurueck.regelEinstellungen.istAus('R4')).toBe(true);
    expect(zurueck.regelEinstellungen.wert('R4_MAX_BEINWINKEL_GRAD')).toBe(40);
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });

  it('lässt das Feld weg, solange alles auf Standard steht', () => {
    const json = serializer.zuJson(kochstelle());
    expect('regeln' in json).toBe(false);
    expect(serializer.ausJson(json).regelEinstellungen.istStandard).toBe(true);
  });

  it('gibt für eine v4-Datei ohne regeln genau die Hinweise von heute', () => {
    const ohneFirst = kochstelle().ohne('first');
    const gelesen = serializer.ausJson(JSON.parse(JSON.stringify(serializer.zuJson(ohneFirst))));
    const hinweise = RuleEngine.fuer(gelesen.regelEinstellungen).pruefe(gelesen);
    expect(hinweise).toEqual(new RuleEngine(standardRegeln()).pruefe(ohneFirst));
    expect(hinweise.length).toBeGreaterThan(0);
  });

  it('reist mit dem Link', () => {
    const codec = new UrlCodec();
    const zurueck = codec.ausHash(codec.alsHash(kochstelle().mitRegelEinstellungen(einstellungen)));
    expect(zurueck?.regelEinstellungen.istAus('R4')).toBe(true);
  });

  it('übergeht ein Feld regeln in den Versionen 1–3', () => {
    const v3 = { version: 3, gruppen: [], stangen: [], seile: [], baeume: [], planen: [], regeln: { aus: ['R4'] } };
    expect(serializer.ausJson(v3).regelEinstellungen.istStandard).toBe(true);
  });

  it.each<[string, unknown, string]>([
    ['kein Objekt', 'aus', 'regeln ist kein Objekt'],
    ['aus keine Liste', { aus: 'R4' }, 'regeln.aus ist keine Liste'],
    ['unbekannte Regel', { aus: ['R9'] }, 'unbekannte Regel R9'],
    ['unbekannter Wert', { werte: { R9_X: 1 } }, 'unbekannter Regelwert R9_X'],
    ['Wert keine Zahl', { werte: { R4_MAX_BEINWINKEL_GRAD: 'flach' } }, 'R4_MAX_BEINWINKEL_GRAD ist keine Zahl'],
    ['Winkel über 90°', { werte: { R4_MAX_BEINWINKEL_GRAD: 120 } }, 'Winkel muss zwischen 0 und 90° liegen'],
    ['Untergrenze über der Obergrenze', { werte: { R6_MIN_WINKEL_GRAD: 70 } }, 'Untergrenze muss kleiner als die Obergrenze sein'],
  ])('lehnt ab: %s', (_name, regeln, meldung) => {
    expect(() => serializer.ausJson({ version: 4, objekte, regeln })).toThrow(`Ungültige Bauwerk-Daten: ${meldung}`);
  });
});
```

Run: `npx vitest run src/share/RegelnFormat.test.ts`
Expected: FAIL. Der Serializer schreibt und liest noch kein `regeln`.

- [ ] **Step 7: Datenformat**

Neue Datei `src/share/RegelnFormat.ts`:

```ts
import {
  istRegelName,
  istWertSchluessel,
  REGEL_NAMEN,
  RegelEinstellungen,
  type RegelName,
  type Regelwerte,
  type WertSchluessel,
} from '../rules/RegelEinstellungen';
import { liste, objekt, zahl } from './lesen';

/** Regel-Einstellungen im Datenformat v4 (Spec v3, D8), z. B. `{ aus: ['R4'], werte: { R4_MAX_BEINWINKEL_GRAD: 40 } }`. */
export interface RegelnJson {
  readonly aus: readonly RegelName[];
  readonly werte: Regelwerte;
}

export function regelnZuJson(e: RegelEinstellungen): RegelnJson {
  return { aus: REGEL_NAMEN.filter((n) => e.istAus(n)), werte: { ...e.werte } };
}

/** Wirft bei unbekannten Regeln oder Werten einen Error, bei unpassenden Werten den RangeError des Modells. */
export function regelnAusJson(d: unknown): RegelEinstellungen {
  const roh = objekt(d, 'regeln');
  const aus = (roh.aus === undefined ? [] : liste(roh.aus, 'regeln.aus')).map((n): RegelName => {
    if (!istRegelName(n)) throw new Error(`unbekannte Regel ${String(n)}`);
    return n;
  });
  const rohWerte = roh.werte === undefined ? {} : objekt(roh.werte, 'regeln.werte');
  const werte = Object.fromEntries(
    Object.entries(rohWerte).map(([schluessel, wert]): [WertSchluessel, number] => {
      if (!istWertSchluessel(schluessel)) throw new Error(`unbekannter Regelwert ${schluessel}`);
      return [schluessel, zahl(wert, schluessel)];
    }),
  ) as Regelwerte;
  return RegelEinstellungen.von(aus, werte);
}
```

In `src/share/BauwerkSerializer.ts` (Stand nach Task 5):

1. Nach `import type { LagerObjekt } from '../model/LagerObjekt';` einfügen:

```ts
import { RegelEinstellungen } from '../rules/RegelEinstellungen';
```

und nach `import { liste, objekt, type Roh, text } from './lesen';`:

```ts
import { type RegelnJson, regelnAusJson, regelnZuJson } from './RegelnFormat';
```

2. In `interface BauwerkJson` nach `readonly objekte: readonly ObjektJson[];` einfügen:

```ts
  /** Nur, wenn eine Regel aus ist oder ein Wert vom Standard abweicht (Spec v3, D8). */
  readonly regeln?: RegelnJson;
```

3. Die Methoden `zuJson` und `lies` ersetzen. Alt:

```ts
  zuJson(bauwerk: Bauwerk): BauwerkJson {
    return { version: 4, objekte: bauwerk.objekte.map((o) => this.arten.artVon(o).zuJson(o)) };
  }
```

```ts
  private lies(daten: unknown): Bauwerk {
    const roh = this.rohObjekte(objekt(daten, 'Bauwerk'));
    if (roh.length > MAX_TEILE) throw new Error(`mehr als ${MAX_TEILE} Teile`);
    return Bauwerk.von(roh.map((r) => this.liesObjekt(r)));
  }
```

Neu:

```ts
  zuJson(bauwerk: Bauwerk): BauwerkJson {
    const objekte = bauwerk.objekte.map((o) => this.arten.artVon(o).zuJson(o));
    const e = bauwerk.regelEinstellungen;
    return e.istStandard ? { version: 4, objekte } : { version: 4, objekte, regeln: regelnZuJson(e) };
  }
```

```ts
  private lies(daten: unknown): Bauwerk {
    const o = objekt(daten, 'Bauwerk');
    const roh = this.rohObjekte(o);
    if (roh.length > MAX_TEILE) throw new Error(`mehr als ${MAX_TEILE} Teile`);
    // Nur Version 4 kennt Regel-Einstellungen; fehlt das Feld, gelten die Standardwerte.
    const regeln = o.version === 4 && o.regeln !== undefined ? regelnAusJson(o.regeln) : RegelEinstellungen.standard();
    return Bauwerk.von(
      roh.map((r) => this.liesObjekt(r)),
      regeln,
    );
  }
```

Run: `npx vitest run src/share`
Expected: PASS (`RegelnFormat.test.ts` 12 Tests; `share.test.ts` und `AltesFormat.test.ts` unverändert grün, weil Bauten ohne Einstellungen kein `regeln` schreiben).

- [ ] **Step 8: Failing test für die Oberfläche**

Neue Datei `src/ui/RegelnPanel.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '../editor/Editor';
import { Bauwerk } from '../model/Bauwerk';
import { RegelnPanel } from './RegelnPanel';

const aufbau = (nurLesen = false): { knopf: HTMLButtonElement; liste: HTMLElement; zeile: HTMLElement; editor: Editor } => {
  const knopf = document.createElement('button');
  const liste = document.createElement('section');
  liste.hidden = true;
  const zeile = document.createElement('p');
  const editor = new Editor(Bauwerk.leer());
  const panel = new RegelnPanel(knopf, liste, zeile, editor, () => nurLesen);
  editor.abonniere((z) => panel.zeige(z.bauwerk.regelEinstellungen));
  return { knopf, liste, zeile, editor };
};

const haken = (liste: HTMLElement, regel: string): HTMLInputElement => {
  const label = [...liste.querySelectorAll('label')].find((l) => l.textContent?.trim().startsWith(`${regel}:`));
  const input = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!input) throw new Error(`Haken ${regel} fehlt`);
  return input;
};

const feld = (liste: HTMLElement, text: string): HTMLInputElement => {
  const label = [...liste.querySelectorAll('label')].find((l) => l.textContent?.startsWith(text));
  const input = label?.querySelector<HTMLInputElement>('input[type="number"]');
  if (!input) throw new Error(`Feld ${text} fehlt`);
  return input;
};

const knopfMit = (wurzel: HTMLElement, text: string): HTMLButtonElement => {
  const k = [...wurzel.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!k) throw new Error(`Knopf ${text} fehlt`);
  return k;
};

const tippe = (input: HTMLInputElement, wert: string): void => {
  input.value = wert;
  input.dispatchEvent(new Event('change'));
};

describe('RegelnPanel (Spec v3, D8)', () => {
  it('klappt mit „Regeln…“ die Liste R1–R8 auf, alle an, mit den Werten aus constants.ts', () => {
    const { knopf, liste, zeile } = aufbau();
    expect(liste.hidden).toBe(true);
    knopf.click();
    expect(liste.hidden).toBe(false);
    expect(knopf.getAttribute('aria-expanded')).toBe('true');
    expect(liste.querySelectorAll('input[type="checkbox"]')).toHaveLength(8);
    expect(haken(liste, 'R4').checked).toBe(true);
    expect(feld(liste, 'Beinwinkel höchstens').value).toBe('35');
    expect(zeile.textContent).toBe('');
  });

  it('schaltet eine Regel ab, zeigt „Ausgeschaltet: R4“ und macht das als einen Undo-Schritt', () => {
    const { liste, zeile, editor } = aufbau();
    const h = haken(liste, 'R4');
    h.checked = false;
    h.dispatchEvent(new Event('change'));
    expect(editor.bauwerk.regelEinstellungen.istAus('R4')).toBe(true);
    expect(zeile.textContent).toBe('Ausgeschaltet: R4');
    expect(haken(liste, 'R4').checked).toBe(false);
    editor.rueckgaengig();
    expect(editor.bauwerk.regelEinstellungen.istAus('R4')).toBe(false);
    expect(zeile.textContent).toBe('');
  });

  it('übernimmt gültige Werte, meldet ungültige, setzt das Feld zurück und kann alles zurücksetzen', () => {
    const { liste, editor } = aufbau();
    tippe(feld(liste, 'Beinwinkel höchstens'), '40');
    expect(editor.bauwerk.regelEinstellungen.wert('R4_MAX_BEINWINKEL_GRAD')).toBe(40);
    tippe(feld(liste, 'Beinwinkel mindestens'), '45');
    expect(editor.zustand().meldung).toBe('Untergrenze muss kleiner als die Obergrenze sein');
    expect(feld(liste, 'Beinwinkel mindestens').value).toBe('10');
    tippe(feld(liste, 'Querseil mindestens auf'), '0');
    expect(editor.zustand().meldung).toBe('Wert muss größer als 0 sein');
    expect(feld(liste, 'Querseil mindestens auf').value).toBe('2');
    knopfMit(liste, 'Auf Standard zurücksetzen').click();
    expect(editor.bauwerk.regelEinstellungen.istStandard).toBe(true);
  });

  it('ist in der Ansicht nur lesbar', () => {
    const { liste } = aufbau(true);
    expect([...liste.querySelectorAll('input')].every((i) => i.disabled)).toBe(true);
    expect(knopfMit(liste, 'Auf Standard zurücksetzen').disabled).toBe(true);
  });
});
```

Run: `npx vitest run src/ui/RegelnPanel.test.ts`
Expected: FAIL, weil `./RegelnPanel` fehlt.

- [ ] **Step 9: Oberfläche**

Neue Datei `src/ui/RegelnPanel.ts`:

```ts
import type { Editor } from '../editor/Editor';
import { REGEL_NAMEN, RegelEinstellungen, type RegelName, type WertSchluessel } from '../rules/RegelEinstellungen';

interface WertFeld {
  readonly schluessel: WertSchluessel;
  readonly label: string;
  readonly einheit: string;
  readonly schritt: string;
}

interface RegelEintrag {
  readonly name: RegelName;
  readonly text: string;
  readonly felder: readonly WertFeld[];
}

/** Kurzbeschreibung und Wertfelder je Regel (Spec v3, D8). Die Standardwerte stehen in src/rules/constants.ts. */
const KATALOG: readonly RegelEintrag[] = [
  { name: 'R1', text: 'A-Bock seitlich gesichert', felder: [{ schluessel: 'R1_MIN_WINKEL_ZUR_EBENE_GRAD', label: 'Mindestwinkel zur A-Ebene', einheit: '°', schritt: '1' }] },
  { name: 'R2', text: 'Viereck mit Diagonale', felder: [{ schluessel: 'R2_PLANAR_TOLERANZ_RELATIV', label: 'Ebenen-Toleranz (Anteil der längsten Seite)', einheit: '', schritt: '0.01' }] },
  {
    name: 'R3',
    text: 'Standfläche breit genug',
    felder: [
      { schluessel: 'R3_MAX_HOEHE_ZU_BREITE', label: 'Höhe ÷ Breite höchstens', einheit: '', schritt: '0.1' },
      { schluessel: 'R3_MIN_HOEHE', label: 'Geprüft ab Höhe', einheit: 'm', schritt: '0.1' },
    ],
  },
  {
    name: 'R4',
    text: 'Spreizung der Beine',
    felder: [
      { schluessel: 'R4_MIN_BEINWINKEL_GRAD', label: 'Beinwinkel mindestens', einheit: '°', schritt: '1' },
      { schluessel: 'R4_MAX_BEINWINKEL_GRAD', label: 'Beinwinkel höchstens', einheit: '°', schritt: '1' },
    ],
  },
  { name: 'R5', text: 'Jede Stange hält an zwei Punkten', felder: [] },
  {
    name: 'R6',
    text: 'Abspannwinkel',
    felder: [
      { schluessel: 'R6_MIN_WINKEL_GRAD', label: 'Seilwinkel mindestens', einheit: '°', schritt: '1' },
      { schluessel: 'R6_MAX_WINKEL_GRAD', label: 'Seilwinkel höchstens', einheit: '°', schritt: '1' },
    ],
  },
  { name: 'R7', text: 'Querseile hoch genug', felder: [{ schluessel: 'R7_MIN_HOEHE', label: 'Querseil mindestens auf', einheit: 'm', schritt: '0.1' }] },
  { name: 'R8', text: 'Jedes Seilende befestigt', felder: [] },
];

/** Anzeige-Text eines Werts: auf drei Nachkommastellen gerundet. */
const anzeige = (wert: number): string => String(Math.round(wert * 1000) / 1000);

/**
 * „Regeln…“: Regeln an- und abschalten und ihre Werte einstellen; gespeichert im Bauwerk (Spec v3, D8).
 * Jede Änderung ist ein Undo-Schritt; ungültige Werte meldet der Editor, und das Feld springt zurück. In der Ansicht nur lesbar.
 */
export class RegelnPanel {
  private gezeigt: { readonly einstellungen: RegelEinstellungen; readonly nurLesen: boolean } | null = null;

  constructor(
    knopf: HTMLButtonElement,
    private readonly liste: HTMLElement,
    private readonly zeile: HTMLElement,
    private readonly editor: Editor,
    private readonly nurLesen: () => boolean,
  ) {
    knopf.addEventListener('click', () => {
      const oeffnen = this.liste.hidden;
      this.liste.hidden = !oeffnen;
      knopf.setAttribute('aria-expanded', String(oeffnen));
    });
  }

  zeige(einstellungen: RegelEinstellungen): void {
    const aus = REGEL_NAMEN.filter((n) => einstellungen.istAus(n));
    this.zeile.textContent = aus.length > 0 ? `Ausgeschaltet: ${aus.join(', ')}` : '';
    const nurLesen = this.nurLesen();
    if (this.gezeigt?.einstellungen === einstellungen && this.gezeigt.nurLesen === nurLesen) return;
    this.gezeigt = { einstellungen, nurLesen };
    this.liste.replaceChildren(...KATALOG.map((r) => this.regel(r, einstellungen, nurLesen)), this.zuruecksetzen(einstellungen, nurLesen));
  }

  private regel(r: RegelEintrag, e: RegelEinstellungen, nurLesen: boolean): HTMLElement {
    const block = document.createElement('div');
    block.className = 'regel';
    const an = document.createElement('label');
    const haken = document.createElement('input');
    haken.type = 'checkbox';
    haken.checked = !e.istAus(r.name);
    haken.disabled = nurLesen;
    haken.addEventListener('change', () => this.aendere((x) => x.mitAus(r.name, !haken.checked)));
    an.append(haken, ` ${r.name}: ${r.text}`);
    block.append(an, ...r.felder.map((f) => this.wertfeld(f, e, nurLesen)));
    return block;
  }

  private wertfeld(f: WertFeld, e: RegelEinstellungen, nurLesen: boolean): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = f.einheit === '' ? f.label : `${f.label} (${f.einheit})`;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = f.schritt;
    input.disabled = nurLesen;
    const modellwert = anzeige(e.wert(f.schluessel));
    input.value = modellwert;
    input.addEventListener('change', () => {
      // Abgelehnt: Das Modell ist unverändert, also springt das Feld auf den Modellwert zurück (Muster aus v1).
      if (!this.aendere((x) => x.mitWert(f.schluessel, Number(input.value)))) input.value = modellwert;
    });
    label.append(input);
    return label;
  }

  private zuruecksetzen(e: RegelEinstellungen, nurLesen: boolean): HTMLButtonElement {
    const knopf = document.createElement('button');
    knopf.textContent = 'Auf Standard zurücksetzen';
    knopf.disabled = nurLesen || e.istStandard;
    knopf.addEventListener('click', () => this.aendere(() => RegelEinstellungen.standard()));
    return knopf;
  }

  /** Über den Editor: ein Undo-Schritt, ein RangeError wird zur Meldung. */
  private aendere(fn: (e: RegelEinstellungen) => RegelEinstellungen): boolean {
    return this.editor.aendereMit((b) => b.mitRegelEinstellungen(fn(b.regelEinstellungen)));
  }
}
```

In `index.html` die Zeile `      <ul id="hinweise"></ul>` ersetzen durch:

```html
      <ul id="hinweise"></ul>
      <p id="ausgeschaltet"></p>
      <button id="btn-regeln" aria-expanded="false">Regeln…</button>
      <section id="regeln" hidden></section>
```

In `src/style.css` nach der Zeile `#meldung:empty { display: none; }` einfügen:

```css
#ausgeschaltet { margin: 0 0 8px; color: var(--warn); }
#ausgeschaltet:empty { display: none; }
#regeln .regel { margin: 8px 0; padding-top: 6px; border-top: 1px solid var(--rand); }
```

In `src/main.ts`:

1. Die Zeile `import { standardRegeln } from './rules/standardRegeln';` löschen und nach `import { ParameterPanel } from './ui/ParameterPanel';` einfügen: `import { RegelnPanel } from './ui/RegelnPanel';`
2. Die Zeile `const regeln = new RuleEngine(standardRegeln());` ersetzen durch:

```ts
const regelnPanel = new RegelnPanel(element('#btn-regeln'), element('#regeln'), element('#ausgeschaltet'), editor, () => modus.aktiv);

/** Wechselt Editor und Ansicht; die Regel-Liste ist in der Ansicht nur lesbar und wird deshalb neu gezeigt. */
function setzeModus(ansicht: boolean): void {
  modus.setze(ansicht);
  regelnPanel.zeige(editor.bauwerk.regelEinstellungen);
}
```

3. In `pruefung` die Zeile

```ts
    geprueft = { bauwerk, hinweise: regeln.pruefe(bauwerk), liste: Materialliste.aus(bauwerk, SEIL_ZUGABE_PRO_ENDE) };
```

ersetzen durch

```ts
    const hinweise = RuleEngine.fuer(bauwerk.regelEinstellungen).pruefe(bauwerk);
    geprueft = { bauwerk, hinweise, liste: Materialliste.aus(bauwerk, SEIL_ZUGABE_PRO_ENDE) };
```

4. In `ladeAusAdresse` `modus.setze(bauwerk !== null);` durch `setzeModus(bauwerk !== null);` und `modus.setze(false);` durch `setzeModus(false);` ersetzen; ebenso in `element('#btn-bearbeiten').addEventListener('click', () => modus.setze(false));` das `modus.setze(false)` durch `setzeModus(false)`.
5. Im Beobachter `editor.abonniere((z) => { … })` nach `hinweisPanel.zeige(hinweise);` einfügen: `  regelnPanel.zeige(z.bauwerk.regelEinstellungen);`

- [ ] **Step 10: E2E schreiben**

Neue Datei `e2e/regeln.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

// Ein Dreibein mit flach gespreizten Beinen (asin(1,4 ÷ 2,2) ≈ 40°): R4 meldet es, sonst keine Regel.
const flach = {
  version: 1,
  gruppen: [{ id: 'flach', typ: 'dreibein', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 1.4, durchmesser: 0.08 } }],
  stangen: [],
};

test('R4 abschalten: der Hinweis verschwindet und bleibt nach Speichern und Laden aus (Spec v3, D8)', async ({ page }) => {
  await page.goto(`./?t=regeln#b=${LZString.compressToEncodedURIComponent(JSON.stringify(flach))}`);
  await expect(page.locator('#hinweise')).toContainText('R4: Beine sehr flach gespreizt');
  await page.getByRole('button', { name: 'Regeln…' }).click();
  const r4 = page.getByRole('checkbox', { name: /^R4:/ });
  await expect(r4).toBeDisabled(); // geteilter Link: Ansicht, nur lesbar
  await page.getByRole('button', { name: 'Bearbeiten' }).click();
  await expect(r4).toBeEnabled();
  await r4.uncheck();
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(page.locator('#ausgeschaltet')).toHaveText('Ausgeschaltet: R4');
  const herunterladen = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Speichern' }).click();
  const datei = await (await herunterladen).path();
  await page.goto('./?t=leer');
  await expect(page.locator('#ausgeschaltet')).toHaveText('');
  await page.locator('#inp-laden').setInputFiles(datei);
  await expect(page.locator('#ausgeschaltet')).toHaveText('Ausgeschaltet: R4');
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
});
```

- [ ] **Step 11: Alles laufen lassen**

Run: `npx vitest run`
Expected: 49 Dateien, 427 Tests, alle grün.
Run: `npm test`
Expected: Abdeckung von `src/model/**`, `src/rules/**`, `src/arten/**` in allen vier Metriken ≥ 80 %.
Run: `npm run build`
Expected: Exit 0.
Run: `npm run e2e`
Expected: 7 passed (die 6 bisherigen und `regeln.spec.ts`).

- [ ] **Step 12: Commit**

```bash
git add src/rules/RegelEinstellungen.ts src/rules/RegelEinstellungen.test.ts src/rules/regelEinstellungen.integration.test.ts src/rules/standardRegeln.ts src/rules/RuleEngine.ts src/rules/RuleEngine.test.ts src/model/Bauwerk.ts src/model/Bauwerk.test.ts src/share/RegelnFormat.ts src/share/RegelnFormat.test.ts src/share/BauwerkSerializer.ts src/ui/RegelnPanel.ts src/ui/RegelnPanel.test.ts src/main.ts index.html src/style.css e2e/regeln.spec.ts
git commit -m "feat: let each plan switch rules off and adjust their thresholds"
```

---

### Task 11: Abschluss: volle Prüfung, Version 1.3.0, Doku

**Files:**
- Modify: `package.json`, `package-lock.json` (Version), `README.md`, `CLAUDE.md`
- Modify nur bei Bedarf: `docs/ki-lernlog.md` (nur wenn Tests, Reviews oder der Sichtvergleich einen Fehler der KI gefunden haben)
- Löschen (nie eingecheckt): `e2e-sicht/`

**Interfaces:**
- Consumes: alles aus Task 1–10.
- Produces: `release/Lagerbau-Simulator-1.3.0.exe`; Doku zu `src/arten/`, `src/editor/darstellung/` und Format v4.

- [ ] **Step 1: Volle Prüfung**

```bash
npm test             # Expected: 49 Dateien, 427 Tests grün; Abdeckung src/model/**, src/rules/**, src/arten/** in allen vier Metriken ≥ 80 %
npm run build        # Expected: Exit 0 (tsc prüft auch alle Tests)
npm run e2e          # Expected: 7 passed (6 bisherige + regeln.spec.ts)
npx playwright test -c e2e-sicht/playwright.config.ts   # Expected: 5 passed (entfällt, wenn Task 1 den Sichtvergleich gestrichen hat)
grep -rE "from 'three'|document\.|window\." src/model src/rules src/arten          # Expected: keine Ausgabe
grep -rnE "from '\.\./(arten|share|editor|ui)" src/model                            # Expected: keine Ausgabe
grep -nE "instanceof|'(dreibein|abock|stange|seil|baum|plane)'" src/editor/Werkzeuge.ts src/ui/ParameterPanel.ts src/share/BauwerkSerializer.ts   # Expected: keine Ausgabe
grep -rnE "KlickZiel|PlaceBaugruppeTool|DrawPlaneTool|stangeId:|baumId:" src/editor src/ui src/main.ts   # Expected: keine Ausgabe
git diff --stat main -- src/rules/*Rule.ts src/rules/Analyse.ts src/rules/KnotenGraph.ts src/rules/FesteKnoten.ts src/rules/constants.ts   # Expected: keine Ausgabe (Regel-Klassen und der R2-Fix unverändert)
grep -c "CHECK MANUALLY" src/rules/constants.ts   # Expected: 10 (unverändert)
```

Scheitert etwas, ist das ein echter Fehler in einem früheren Task: BLOCKED mit der Ausgabe melden.

- [ ] **Step 2: Version 1.3.0 und Desktop-E2E**

Run: `npm version 1.3.0 --no-git-tag-version`
Expected: `package.json` und `package-lock.json` zeigen `1.3.0` (vorher 1.2.1), kein Commit, kein Tag.
Run: `npm run e2e:desktop`
Expected: 5 passed; es entsteht `release/Lagerbau-Simulator-1.3.0.exe`. Scheitert nur „Link kopieren“, zuerst mit `powershell -Command "Set-Clipboard test; Get-Clipboard"` prüfen, ob die Windows-Zwischenablage überhaupt geht (Known Issue in `CLAUDE.md`), und das Ergebnis melden. Code und Test dafür nicht ändern.

- [ ] **Step 3: Doku**

In `README.md` im Abschnitt „## Windows-Programm“ als letzte Zeile anhängen:

```markdown
Alle Links und Dateien, die mit Version 1.3 gespeichert wurden (Format-Version geändert), öffnet nur die .exe ab 1.3.0; ältere zeigen „Ungültige Bauwerk-Daten“.
```

(Hat Task 5 `MAX_TEILE` unter 2000 gesetzt, hier keinen Zahlenwert nennen; die Grenze steht im Code und in diesem Plan.)

In `CLAUDE.md` unter „## Stack & Struktur“:
1. Die Zeile für `src/model/` ersetzen durch:

```markdown
- `src/model/` — Domain (immutable), kein three.js: `LagerObjekt` (gemeinsame Schnittstelle, `ART_NAMEN`), Stange, Bund, Fuss, Baugruppen, Seil, Baum, Plane (Ösen aus der Geometrie), `Bauwerk` (eine geordnete Liste `objekte` + typisierte Hüllen), Verankerung/Hering (aus der Geometrie abgeleitet), Materialliste, Platzbedarf
```

2. An das Ende der Zeile für `src/rules/` anhängen: `; Regel-Einstellungen je Plan in \`RegelEinstellungen\` (an/aus, Werte; Spec v3, D8)`. Danach einfügen:

```markdown
- `src/arten/` — Registry je Objektart (`ObjektArt`, `ObjektRegister`, `standardArten()`): Codec, Panel, Platzieren, Fangpunkte, Klickverhalten; kein three.js
```

3. Die Zeilen für `src/editor/` und `src/share/` ersetzen durch:

```markdown
- `src/editor/` — three.js-Szene (`SzenenInhalt` baut nur Geändertes neu), Darstellung je Art in `src/editor/darstellung/`, Einrasten, Werkzeuge (`PlatziereTool`, `SelectTool`), Undo
- `src/share/` — Serializer (Datenformat v4 mit `objekte`; v1–v3 über `AltesFormat`), URL-Codec (`lz-string`)
```

Unter „## Arbeitsweise“ die Zeile mit „TDD: Test zuerst.“ ersetzen durch:

```markdown
- TDD: Test zuerst. Abdeckung `model/` + `rules/` + `arten/` ≥ 80 %.
- Neue Objektart: Modellklasse + Name in `ART_NAMEN`, `src/arten/<Art>Art.ts` + Zeile in `standardArten()`, Darstellung + Zeile in `standardDarstellungen()`, Knopf in `index.html` (Spec v3, D2).
```

Unter „## Known Issues & Failed Attempts“ jede Sackgasse aus Task 1–10 eintragen, im Format *What failed / Why / Fix / avoid* (z. B. ein instabiler Sichtvergleich aus Task 1, Step 1).

In `docs/ki-lernlog.md` unter „## Einträge“ jeden Fehler der KI eintragen, den Tests, Reviews oder der Sichtvergleich in diesem Plan gefunden haben, im Format der Datei. Gab es keinen, bleibt die Datei unverändert.

- [ ] **Step 4: Sichtvergleich aufräumen**

Run: `git status --short`
Expected: nur `package.json`, `package-lock.json`, `README.md`, `CLAUDE.md` (ggf. `docs/ki-lernlog.md`) als geändert und `?? e2e-sicht/`; nichts aus `release/`, `dist/` oder `dist-desktop/`.
Dann den nie eingecheckten Ordner löschen: `rm -rf e2e-sicht` (PowerShell: `Remove-Item -Recurse -Force e2e-sicht`).
Run: `git status --short`
Expected: `e2e-sicht/` erscheint nicht mehr.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json README.md CLAUDE.md
git commit -m "docs: document the object model and bump version to 1.3.0"
```

Wurde `docs/ki-lernlog.md` geändert, die Datei mit in denselben `git add` aufnehmen.

- [ ] **Step 6: Manuelle Prüfung (Jakob)**

1. Die Beispiel-Kochstelle laden, ein Dreibein, einen A-Bock, eine Stange, ein Seil, eine Plane und einen Baum setzen; alles verhält sich wie in 1.2 (Einrasten, Statuszeile „Stange: zweiten Punkt anklicken …“, Panel, Löschen, R dreht).
2. Rückgängig und Wiederholen mehrmals hintereinander: Es bleibt nichts stehen, was nicht da sein sollte, und es fehlt nichts.
3. Einen Hinweis anklicken, der eine einzelne Stange eines A-Bocks markiert: Nur diese Stange leuchtet.
4. Einen Bau speichern, mit der `release/Lagerbau-Simulator-1.3.0.exe` wieder laden; einen alten Link aus 1.2 öffnen.
5. Bei einem großen Bau (viele Stangen) fühlt sich ein Auswahlwechsel nicht langsamer an als vorher.
6. „Regeln…“: R4 abschalten und einen Wert ändern; „Ausgeschaltet: R4“ erscheint, Rückgängig nimmt beides zurück. Einen ungültigen Wert (z. B. R4 mindestens über höchstens) eintippen: Meldung, das Feld springt zurück. Speichern, laden: Die Einstellungen bleiben. Am Handy (geteilter Link) ist die Liste nur lesbar.

---

## Abschluss

- Abschluss-Review über den ganzen Branch (`main..feat/objektmodell`), mit Blick auf die Review Focus oben.
- `finishing-a-development-branch`: Push und PR gegen `main`. **Jakob merged selbst**; der Merge deployt die Web-Version neu.
- Danach: E1 „Editor-Grundlagen“ nach `docs/superpowers/specs/2026-10-05-lagerplatz-e1-editor-design.md`.
