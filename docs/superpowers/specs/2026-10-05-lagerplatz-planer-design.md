# Lagerbau-Simulator — Design-Spec v3: Lagerplatz-Planer (Etappen + E0 Fundament)

Baut auf der v1-Spec (`2026-09-30-lagerbau-simulator-design.md`), der v2a-Spec (`2026-10-01-lagerbau-abspannungen-design.md`) und der v2b-Spec (`2026-10-02-lagerbau-planen-design.md`) auf. Alles dort gilt weiter, insbesondere: **keine Statik-Rechnung**, Schwellwerte kommen von Jakob, die Fußzeile bleibt immer sichtbar.

## Context

Bisher ist der Simulator ein reiner **Bauwerk-Editor**:
- sechs Objektarten (Stange, Dreibein, A-Bock, Seil, Baum, Plane);
- ein fester, flacher Boden von 40 × 40 m;
- weder Verschieben noch Kopieren noch Mehrfachauswahl;
- keine Draufsicht.

Die Leiterteams sollen damit künftig **ganze Lagerplätze** planen können: wo Zelte, Kochstelle, Feuerstelle und Lagerbauten auf dem echten Platz stehen, wie die Bauten in ihrer Umgebung aussehen und welches Material das ganze Lager braucht.

Diese Spec legt zweierlei fest:
- die **Etappen E0–E6** mit Reihenfolge und Abgrenzung. Jede Etappe ab E1 bekommt eine eigene Spec;
- das Design von **E0 „Fundament“** im Detail.

Im Code stellt E0 zwei Dinge ab: Eine neue Objektart berührt heute rund zehn Dateien, und die Szene baut bei jedem Klick alles neu.

## Getroffene Entscheidungen (Brainstorming 05.10.2026)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Zweck | Lager-Layout planen, Bauten im Kontext sehen, Materialliste fürs ganze Lager. Präsentieren ist kein eigenes Ziel; der Teilen-Link bleibt, wie er ist |
| 2 | Gelände | **Luftbild als Boden:** Bild laden, Maßstab mit zwei Klicks setzen. Der Boden bleibt flach (y = 0). Verworfen: flache Wiese ohne Bild (der echte Platz müsste nachgebaut werden); Gelände mit Höhen (alle Bauten, Füße, Heringe und Regeln setzen y = 0 voraus) |
| 3 | Umfang | alle Etappen E0–E6, nacheinander |
| 4 | Zelte | **ganze Zelte nach Typ:** **Jurte** (5er, 6er, 8er; jeweils Komplettdach + 3 Seitenwände, jede Wand einzeln weglassbar), **Hanger** und **Doppelkegler** (beide gekaufte Gruppenzelte). Startwerte aus einer Online-Recherche, Jakob bestätigt oder misst nach. Ursprünglich war zusätzlich ein Bahnen-Baukasten geplant (E7); er wurde am 05.10.2026 gestrichen, weil die Gruppen keine Kohten- oder Jurtenbahnen verwenden |
| 5 | Platzregeln | **ja, Abstandsregeln.** Welche Regeln mit welchen Abständen gelten, legt Jakob fest; bis dahin `CHECK MANUALLY` |
| 6 | Architektur | **Eine Welt:** Alles liegt in einem Koordinatensystem. Ein „Bau“ ist eine automatisch erkannte Gruppe verbundener Stangen. Vorher kommt der Umbau auf ein gemeinsames Objekt-Modell (E0). Verworfen: zwei Ebenen (Platz mit Bau-Blöcken plus eigener Bau-Editor), weil Seile vom Bau zu einem Baum am Platz dann über zwei Ebenen laufen würden; ohne Umbau weitermachen (rund 10 Dateien je Art bei etwa 12 neuen Arten) |
| 7 | Einstellbarkeit (nachgetragen 05.10.2026) | **So einstellbar wie möglich:** Maße, Formen, Namen, Farben und Materialwerte sind Felder im Panel. Feste Objekttypen werden zu **Vorlagen**, die die Felder vorbelegen, plus jeweils „Eigenes“. Zelttypen (E4) sind Vorlagen mit recherchierten, von Jakob bestätigten Startwerten und je Zelt änderbar. Die Abstände der Platzregeln (E6) lassen sich im Programm einstellen und auf den Standard zurücksetzen |

## Etappen

| # | Etappe | Inhalt | Zulieferung von Jakob |
|---|---|---|---|
| E0 | Fundament | gemeinsames Objekt-Modell, Registry je Art, Datenformat v4, Szene baut nur Geändertes neu. **Keine sichtbare Änderung** | — |
| E1 | Editor-Grundlagen | Verschieben per Ziehen (Objekt oder ganzer Bau; angehängte Seile und Planen wandern mit), Mehrfachauswahl, Kopieren/Einfügen/Duplizieren, Drehen für alle Objekte, Draufsicht + „Alles zeigen“, Messwerkzeug + Maßstabsleiste | — |
| E2 | Luftbild als Boden | Bild laden (PNG/JPG, verkleinert), Maßstab mit zwei Klicks + Meterangabe, Nordpfeil, Deckkraft; die Bodenfläche richtet sich nach dem Bild. Das Bild steckt in der Datei, **nicht im Teilen-Link** (zu groß) | ein echtes Luftbild eines Lagerplatzes zum Testen |
| E3 | Platz-Objekte | Punkt-Objekte (Feuerstelle, Fahnenmast, Latrine, Wasserstelle, Holzlager), Text-Beschriftungen, Zonen als Polygon (Name, Farbe), Wege und Zäune als Linienzug | Bestätigung der Objektliste |
| E4 | Zelte als Ganzes | Zelt-Objekt mit Typ (Jurte 5er/6er/8er, Hanger, Doppelkegler) als Vorlage, Maße je Zelt einstellbar, Drehung; bei der Jurte jede der 3 Seitenwände einzeln an/aus (z. B. offenes Küchenzelt); vereinfachter 3D-Körper; Heringe und Abspannung abgeleitet | Bestätigung der recherchierten Startwerte; Maße des Hangers |
| E5 | Gesamt-Materialliste | gruppiert nach Bau (benennbar), Zelttyp und Platz-Objekten, mit Gesamtsumme; Druckansicht. Dazu der Typ `Bau` und die Regeln R1–R8 je Bau | — |
| E6 | Platzregeln | Abstandsregeln (z. B. Feuer ↔ Zelt, Latrine ↔ Küche/Wasser, Zelt unter Baum) neben R1–R8 | Regelliste + Abstände |
| ~~E7~~ | ~~Bahnen-Baukasten~~ | **gestrichen (05.10.2026):** Die Gruppen verwenden keine Kohten- oder Jurtenbahnen. Weglassbare Jurtenwände kommen stattdessen in E4 | — |

**Reihenfolge:**
- **E0 zuerst:** Sonst kostet jede der rund zwölf neuen Arten etwa zehn Dateien.
- **E1 vor den Platz-Objekten:** Ohne Verschieben lässt sich kein Layout planen.
- **E2 früh:** Das Luftbild ist die Arbeitsfläche für alles Weitere.
- **E6 nach den Objekten:** Die Regeln brauchen Objekte, auf die sie sich beziehen.
- **E7 gestrichen:** Der Bahnen-Baukasten entfällt (siehe Entscheidung 4).

**Nicht geplant** (kann später als eigene Etappe kommen): Gelände mit Höhen, Bearbeiten am Handy oder Tablet, Sonnenstand und Schatten, Bild-Export, Vorlagen-Bibliothek (das Duplizieren aus E1 deckt das Meiste ab).

## E0 Fundament

**Ziel:**
- Eine neue Objektart braucht künftig eine Modellklasse, eine Art-Datei, eine Darstellung und eine Zeile im Register.
- Die Szene baut nur noch, was sich geändert hat.

**Was der Nutzer sieht, ändert sich nicht.** Die bestehenden Unit- und e2e-Tests sind das Sicherheitsnetz.

### D1 Objekt-Modell (`src/model/`, ohne three.js und DOM)

- **`LagerObjekt`** (neu, `src/model/LagerObjekt.ts`):
  ```ts
  export interface LagerObjekt {
    readonly id: string;
    readonly art: ArtName;                       // 'dreibein' | 'abock' | 'stange' | 'seil' | 'baum' | 'plane'
    ids(): readonly string[];                    // eigene id + Unter-ids (die Stangen einer Baugruppe)
    verschobenUm(dv: Vec3): LagerObjekt;
    gedreht(winkelRad: number, um?: Vec3): LagerObjekt;  // um die senkrechte Achse durch `um`
    platzPunkte(): readonly Vec3[];              // Punkte, die der Platzbedarf umfasst
  }
  ```
- **Wer implementiert was:** `Stange`, `Dreibein`, `ABock`, `Seil`, `Baum` und `Plane`.
  - **Drehpunkt ohne `um`:** Baugruppe und Baum drehen um ihre Position; Stange, Seil und Plane um die Mitte zwischen Start und Ende.
  - **`platzPunkte()` liefert:**
    - die Füße für Baugruppen und freie Stangen;
    - die Ösen für Planen;
    - nichts für Seile und Bäume.
  - `Platzbedarf.aus` nimmt die `platzPunkte()` aller Objekte plus wie bisher `Bauwerk.heringe()`. Die Heringe bleiben aus den Seilen abgeleitet und zusammengefasst. Das Ergebnis ist für jedes Bauwerk dasselbe wie heute; die bestehenden Tests prüfen das.
- **Bestehende Methoden bleiben:** `Baugruppe.verschoben(position)` (absolut) und `Baugruppe.gedreht(delta)` behalten ihre Bedeutung. `gedreht` erhält nur den optionalen zweiten Parameter.
- **`Bauwerk`** hält statt fünf Listen **eine geordnete Liste `objekte`**:
  - Neue Methoden: `mit(o)`, `ersetze(o)`, `ohne(id)`, `objekt(id)`, `besitzer(teilId)` (das Objekt, zu dem eine id gehört, also bei der Stange einer Baugruppe die Baugruppe), `static von(liste)` (baut in einem Schritt und prüft doppelte ids).
  - Die bisherigen typisierten Methoden und Felder bleiben als dünne Hüllen: `gruppen`, `freieStangen`, `seile`, `baeume`, `planen`, `stangen()`, `mitGruppe`, `mitSeil`, `ersetzeGruppe`, `auswahlIdFuer` usw. Regeln und Tests rufen sie weiter unverändert auf.
  - **Unberührte Objekte behalten ihre Identität:** `ersetze` und `ohne` klonen sie nie. Darauf baut D5 auf.
  - Indizes wie id → Objekt oder die Liste aller Stangen werden pro Instanz einmal berechnet. Das ist sicher, weil `Bauwerk` unveränderlich ist.

### D2 Registry je Art

- **`ObjektArt`** (neu, `src/arten/ObjektArt.ts`, ohne three.js) beschreibt alles Editor-Seitige einer Art:
  - `name`, `label`;
  - `istVon(o)`;
  - `zuJson(o)` / `ausJson(roh)`;
  - `panel(o)` (Felder, Info-Zeilen, `mit(werte)`; Extras wie „Seite wechseln“ und das Form-Auswahlfeld);
  - `platzieren` (Modus `punkt` mit `erzeuge(id, pos)` oder Modus `linie` mit `erzeuge(id, a, b)` und Mindestabstand);
  - `fangpunkte(o, mitOesen)`;
  - `beiTreffer(o, punkt)` (z. B. Plane → nächste Öse);
  - Klickverhalten (`immer` oder `wahlweise`, ersetzt `KlickZiel`).
- **`ObjektRegister`** (neu, `src/arten/ObjektRegister.ts`): eine Instanz mit allen Arten, gebaut von `standardArten()` (`src/arten/standardArten.ts`), so wie `standardRegeln()`.
  - Serializer, `SnapService`, Werkzeuge, `ParameterPanel` und `Szene` bekommen es übergeben und nehmen ohne Angabe `standardArten()`. So bleiben `new SnapService()` und `new BauwerkSerializer()` in den Tests gültig.
- **Darstellung** (neu, `src/editor/darstellung/<Art>Darstellung.ts`, three.js): `baue(o): THREE.Group`. Jedes Mesh trägt in `userData` die Objekt-id, die Teil-id und die Art.
- **Eine neue Art braucht damit:**
  - die Modellklasse;
  - `src/arten/<Art>Art.ts`;
  - die Darstellung;
  - eine Zeile in `standardArten()`;
  - einen Knopf in `index.html`.

### D3 Datenformat v4

- **Geschrieben** wird immer `{ "version": 4, "objekte": [ { "art": "…", "id": "…", … }, … ] }`. Die Felder je Art sind dieselben wie in v3; die Reihenfolge folgt `Bauwerk.objekte`.
- **Gelesen** werden die Versionen 1, 2, 3 und 4.
  - v1–v3 werden in ihrer bisherigen Reihenfolge (Gruppen, Stangen, Bäume, Planen, Seile) in Objekte übersetzt, damit sich nichts am Verhalten ändert.
  - Eine unbekannte Art oder Version ergibt wie bisher „Ungültige Bauwerk-Daten“.
- Die Lese-Hilfen (`zahl`, `vec3` …) ziehen nach `src/share/lesen.ts`, damit die Art-Dateien sie nutzen können.
- **`MAX_TEILE` steigt von 500 auf 2000.**
  - Ein Test baut 2000 Stangen mit zufälligen Koordinaten im Zentimeter-Raster und prüft, dass der Link unter `MAX_HASH_ZEICHEN` (200 000) bleibt.
  - Scheitert der Test, gilt der größte runde Wert, der noch passt.
  - Für ganze Lager ist die Datei der Normalweg. Sehr lange Links funktionieren technisch, sind aber in Messengern unhandlich. Die App muss dazu nichts tun.

### D4 Werkzeuge, Einrasten, Panel

- **`Treffer`** wird `{ art: 'boden'; punkt } | { art: 'objekt'; objektArt: ArtName; id: string; punkt }`. `id` ist die Teil-id, z. B. eine Stange einer Baugruppe.
- **`SnapService`** holt Fangpunkte über das Register.
  - Die Prioritäten bleiben: Spitze → Bund → Ende → Öse → Stange/Baum → Boden.
  - Die Regel aus v2b-Review M-1 bleibt: Spitze/Bund/Ende vor der Öse einer getroffenen Plane.
- **Ein `PlatziereTool`** (Punkt oder Linie, aus `platzieren` der Art) ersetzt `PlaceBaugruppeTool`, `PlaceBaumTool`, `DrawStangeTool`, `DrawSeilTool` und `DrawPlaneTool`.
  - Das Sonderverhalten der Plane (Startneigung, Abflachen, eigene Bodenmeldung) liegt in der Art.
  - `SelectTool` braucht keine Fälle je Art mehr.
  - `WerkzeugName` = `ArtName | 'auswahl'`.
- **`ParameterPanel`** baut sein Formular aus `panel(o)`. Feldnamen, Texte, Meldungen und das Zurückspringen ungültiger Werte bleiben gleich (bestehende Tests).

### D5 Szene inkrementell

Die Signatur von `Szene.zeige(…)` bleibt; `main.ts` ändert sich nicht.

- **Mesh-Gruppen:** Die Szene hält eine Map Objekt-id → Mesh-Gruppe.
  - Bei jedem Aufruf bleibt die Gruppe, wenn das Objekt dieselbe Identität (`===`) hat.
  - Ein geändertes oder neues Objekt wird neu gebaut. Die alte Geometrie wird dabei freigegeben, die geteilten Materialien nicht.
  - Ein entferntes Objekt fliegt raus.
- **„Ableitungen“-Gruppe:** Bünde, Heringe, Platzrahmen und die Startmarkierung liegen dort. Sie wird nur neu gebaut, wenn sich das `Bauwerk` (Identität) ändert.
- **Auswahl und Markierung** tauschen nur Materialien und bauen keine Geometrie.

### D6 Editor-Vorbereitung für E1 (nur Schnittstelle, keine UI)

- `ausgewaehlt: ReadonlySet<string>` im Editor-Zustand. Das bisherige `auswahl` wird daraus abgeleitet (die eine id oder `null`).
- `aendereObjekte(ids, fn)`: wendet `fn` auf mehrere Objekte an und ergibt **einen** Undo-Schritt.
- `dreheAuswahl` dreht wie bisher nur Baugruppen. Das Drehen aller Arten kommt mit E1.

### D7 Tests

- **Neu (TDD):**
  - je Klasse `verschobenUm`, `gedreht` mit und ohne Drehpunkt, `ids`, `platzPunkte`;
  - `Bauwerk.mit`/`ersetze`/`ohne`/`besitzer`/`von` einschließlich doppelter ids;
  - **Identität:** `ersetze` lässt alle anderen Objekte `===` gleich;
  - v4-Rundlauf je Art; v1/v2/v3 → v4 mit gleicher Reihenfolge; unbekannte Art; 2000-Teile-Link (D3);
  - Register: jede Art ist genau einmal registriert;
  - Szene ohne WebGL: Ein Auswahlwechsel ruft keinen `baue` auf, ein geändertes Objekt genau einen.
- **Angepasst:**
  - `share.test.ts`: `version: 3` → `4`; der Test „falsche Version“ nimmt jetzt 5.
  - `SnapService.test.ts` und `Editor.test.ts`: die `Treffer`-Literale auf die neue Form. Die Assertions bleiben.
- **Unverändert grün:** alle übrigen Unit-Tests, `npm run e2e` (die drei Specs nutzen v1/v2-Links), `npm run e2e:desktop`, `npm run build`.
- **Abdeckung:** ≥ 80 % für `src/model/**` und `src/rules/**`; `src/arten/**` kommt dazu.

### Nicht in E0

- sichtbare neue Funktionen;
- Regeln oder Materialliste je Bau (kommen mit E5);
- ein Materialbeitrag je Art (E5);
- Ziehen, Kopieren, Draufsicht (E1);
- variable Bodengröße (E2).

## Verifikation

- Die bestehende Suite ist grün mit den in D7 genannten Anpassungen, ebenso Build, Web-e2e und Desktop-e2e.
- Ein gespeicherter v3-Bau und alte v1/v2-Links öffnen und sehen aus wie vorher (Screenshot-Vergleich der Beispiel-Kochstelle).
- Der Szenen-Test aus D7 belegt, dass ein Auswahlwechsel keine Geometrie baut.
- Eine Code-Durchsicht zeigt, dass `Werkzeuge.ts`, `ParameterPanel.ts` und `BauwerkSerializer.ts` keine Fallunterscheidung je Art mehr enthalten.
