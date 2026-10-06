# Lagerbau-Simulator — Design-Spec E6: Platzregeln

Teil der Spec v3 (`2026-10-05-lagerplatz-planer-design.md`), Etappe E6. Setzt voraus:
- **E0:** Registry je Art, `RegelEinstellungen` und `RegelnPanel` (D8 ist das Muster für schaltbare, einstellbare Regeln), `Hinweis`;
- **E3:** Platz-Objekte mit Vorlagen (`src/arten/platz/vorlagen.ts`);
- **E4:** `Zelt.umriss()`;
- **E5:** `BauHinweis`, Hinweis-Panel mit Bau-Namen, Datenformat v7.

Alles aus v1–v3 gilt weiter, insbesondere: **keine Statik-Rechnung**, Schwellwerte kommen von Jakob, die Fußzeile bleibt sichtbar. Quelle der Startwerte: Recherche `Pfadfinder/reports/Lagerplatz Zelte und Abstandsregeln.md`, Tabelle B.

## Context

Das Programm soll auf dem Plan typische Lagerplatz-Fehler anzeigen: Feuer zu nah am Zelt, Latrine zu nah am Wasser. Die Recherche zeigt: **In Österreich und Salzburg gibt es keinen Rechtstext mit Meterwert** für Feuer, Zelt, Wald, Latrine oder Küche. Verbindlich ist nur der Gefährdungsbereich nach § 40 Forstgesetz bzw. die Waldbrandverordnung, ohne Zahl. Alle Meterwerte sind Faustregeln aus Pfadi-Seiten, Deutschland und der Schweiz. Das Programm muss sie deshalb als **Faustregeln** kennzeichnen, nie als „verboten“ oder „Gesetz verletzt“.

## Getroffene Entscheidungen (Jakob 06.10.2026, Rest Claude)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Startliste | P1 Feuer ↔ Zelt, P2 Feuer ↔ Holzlager, P3 Zelt ↔ Zelt, P4 Latrine ↔ Wasserstelle, P5 Latrine ↔ Küche/Feuerstelle, P6 Zelt unter Baumkrone |
| 2 | Schaltbar und einstellbar | Jede Regel einzeln an/aus, jeder Abstand einstellbar, **wie D8**: gespeichert in der Plandatei, „Auf Standard zurücksetzen“, Undo |
| 3 | Werte | Alle Startwerte `// CHECK MANUALLY: <Quelle>`; fehlt in der Recherche eine Zahl, steht ein vorsichtiger Startwert mit dem Vermerk „keine Quelle“ |
| 4 | Wortlaut | Jeder Hinweistext beginnt mit „Faustregel (<Quellenart>): …“ und nennt die Art der Quelle. Kein Text sagt „verboten“, „Verstoß“ oder „Gesetz“, außer in der festen Zeile zum Forstgesetz (D5) |
| 5 | Wald und Feuer | Es gibt **keine Regel Feuer ↔ Wald** (das Programm kennt keinen Wald). Eine feste Zeile in der Regelliste verweist auf § 40 ForstG und die Waldbrandverordnung |
| 6 | Wer ist „Feuer“, „Latrine“ …? | Die **Rolle** folgt aus dem **Vorlagen-Schlüssel** des Platz-Objekts (D2). Kein neues Feld im Objekt *(Entscheidung Claude, Jakob kann umdrehen: ein Feld `rolle` hätte „Eigenes“ mit Rolle erlaubt, aber das Datenformat von E3 und jedes Panel geändert)* |
| 7 | Küche | Neue Vorlage „Küche“ (Platz-Objekt) in `vorlagen.ts`, weil E3 nur eine Zone kennt und ein Zonenname zu fragil ist *(Entscheidung Claude, Jakob kann umdrehen)* |
| 8 | Abstand | **Von Kante zu Kante** der Grundrisse (nicht Mitte zu Mitte); Abspannseile und Haringe zählen nicht |
| 9 | Einstellungen | Eine **eigene Klasse** `PlatzregelEinstellungen` mit demselben Muster wie `RegelEinstellungen`, damit E0 unberührt bleibt *(Entscheidung Claude, Jakob kann umdrehen)* |
| 10 | Schwere | `warnung` für P1, P4, P6 (Brand, Trinkwasser, Blitz/Astbruch); `info` für P2, P3, P5 (schwache oder fehlende Quelle) *(Entscheidung Claude, Jakob kann umdrehen)* |

## D1 Regeln und Startwerte (`src/rules/platz/constants.ts`)

| Regel | Wert (Schlüssel) | Startwert | Quelle und Konfidenz (aus Tabelle B) |
|---|---|---|---|
| P1 Feuer ↔ Zelt | `P1_MIN_ABSTAND_FEUER_ZELT_M` | 5 m | „3 min., 5 üblich, 5–10 ideal“, Camping-Blogs, Konfidenz niedrig. Gewählt: 5 |
| P2 Feuer ↔ Holzlager | `P2_MIN_ABSTAND_FEUER_HOLZ_M` | 5 m | **keine Quelle.** Vorsichtiger Wert über dem freigeräumten Radius von 3 m (Scout-o-Wiki, mittel) |
| P3 Zelt ↔ Zelt | `P3_MIN_ABSTAND_ZELT_ZELT_M` | 3 m | VDE „mindestens 3 m“, Empfehlung DE, mittel |
| P4 Latrine ↔ Wasserstelle | `P4_MIN_ABSTAND_LATRINE_WASSER_M` | 30 m | Schweizer Pfadihandbuch: 30 m Sickergrube (50 m Biwak-Toilette), mittel. Andere Quellen: 60 m (LNT), 100 m (Belgien, Snippet), 10 m (Survival, Snippet). Jakob entscheidet |
| P5 Latrine ↔ Küche und Feuerstelle | `P5_MIN_ABSTAND_LATRINE_KUECHE_M` | 20 m | **keine Quelle** (nur qualitativ: nicht oberhalb, nicht in Windrichtung). Vorsichtiger Startwert |
| P6 Zelt unter Baumkrone | `P6_KRONENRADIUS_FAKTOR` | 0,3 | **keine Quelle.** Das Modell kennt nur Höhe und Stammdurchmesser eines Baums; Kronenradius = Faktor × Höhe (geschätzt). VDE rät allgemein, einzelne Bäume und den Waldrand zu meiden (Empfehlung, mittel) |

- Jede Konstante trägt `// CHECK MANUALLY: <Quelle>` oder `// CHECK MANUALLY: keine Quelle, Startwert von Claude`.
- **Nicht aufgenommen:** Feuer ↔ Wald (Entscheidung 5), Kocher ↔ Zeltwand (0,5 m, nur Snippet), Zelt ↔ Gewässer, Hang, Rettungszufahrt, Fahne, Parkplatz (Recherche: nichts Belastbares).
- **Hinweistexte** (Zahlen mit Komma, eine Nachkommastelle, Namen aus dem Objekt):
  - P1: „Faustregel (Camping-Blogs, keine gesetzliche Vorgabe): ‚Feuerstelle‘ ist nur 3,2 m von ‚Jurte 6er‘ entfernt, üblich sind mindestens 5 m.“
  - P2: „Faustregel (ohne Quelle, vorsichtiger Startwert): Holzlager ‚…‘ liegt nur … m von ‚…‘, Funkenflug beachten, Richtwert 5 m.“
  - P3: „Faustregel (Empfehlung VDE, Deutschland, keine Pflicht): ‚…‘ und ‚…‘ stehen nur … m auseinander, empfohlen sind mindestens 3 m.“ Bei Überlappung: „… überlappen sich.“
  - P4: „Faustregel (Richtlinie Schweizer Pfadi, kein österreichisches Recht): Latrine ‚…‘ liegt nur … m von Wasserstelle ‚…‘, Richtwert 30 m. Möglichst unterhalb der Wasserentnahme; das Programm kennt kein Gefälle.“
  - P5: „Faustregel (ohne Zahlenquelle, nur qualitativ in Schweizer Pfadi-Hinweisen): Latrine ‚…‘ liegt nur … m von ‚…‘, Richtwert 20 m.“
  - P6: „Faustregel (Empfehlung VDE, Blitz und Astbruch; Kronengröße geschätzt): ‚…‘ steht unter der Krone eines Baums (Höhe … m).“
- `Hinweis.regel` = `'P1'` … `'P6'`; `betroffeneTeile` = die beiden Objekt-ids (bei P6 Zelt und Baum). Einen Namen, den ein Objekt nicht hat (Baum), ersetzt „Baum (Höhe 12 m)“.

## D2 Rollen und Grundrisse (über das Register)

- **`Rolle`** (`src/arten/platz/rollen.ts`): `'feuer' | 'holzlager' | 'latrine' | 'wasser' | 'kueche' | 'zelt' | 'baum'`.
- **`ObjektArt`** bekommt drei optionale Methoden, damit die Regeln **keine Fallunterscheidung je Art** enthalten:
  ```ts
  rolle?(o: T): Rolle | null;
  grundriss?(o: T): Grundriss | null;
  anzeigeName?(o: T): string;
  ```
  - `ZeltArt`: Rolle `zelt`, Grundriss aus `Zelt.umriss()`, Name aus `params.name`.
  - `BaumArt`: Rolle `baum`; der Grundriss ist der Kronenkreis, wird aber von P6 mit dem eingestellten Faktor selbst gebaut (die Art kennt die Einstellungen nicht).
  - `PlatzobjektArt` (E3): Rolle aus `VORLAGE_ROLLE[params.vorlage] ?? null`, Grundriss aus Form, Maßen und Drehung.
- **`VORLAGE_ROLLE`** (`src/arten/platz/rollen.ts`): `feuerstelle → feuer`, `holzlager → holzlager`, `latrine → latrine`, `wasserstelle → wasser`, `kueche → kueche`. Fahnenmast und „Eigenes“ haben keine Rolle. Die Schlüssel sind die aus E3 `vorlagen.ts`; weichen sie ab, gilt die Datei.
- **Neue Vorlage „Küche“** (`kueche`, `vorlagen.ts`): Rechteck 4 × 3 m, Höhe 0,1 m, Farbe `#c9a227`, alles `// CHECK MANUALLY: keine Quelle, Startwert von Claude`.
- **Robustheit:**
  - Ein Platz-Objekt behält seine Rolle, wenn man Maße oder Namen ändert; nur ein Vorlagenwechsel ändert sie.
  - Das Panel eines Platz-Objekts zeigt in der Info „Zählt als: Feuer (Platzregeln)“, damit sichtbar ist, was die Regeln sehen.
  - Ein Grill oder zweites Feuer als „Eigenes“ hat **keine** Rolle (Grenze); als Feuerstelle-Vorlage setzen und umfärben genügt.
  - Ein Küchenzelt (Jurte mit offener Wand) zählt als **Zelt**, nicht als Küche (Grenze).
- **`Grundriss`** (neu, `src/model/Grundriss.ts`, unveränderlich, ohne three.js): ein Vieleck in der Bodenebene (x, z).
  - `static vieleck(punkte)`, `static kreis(mitte, radius)` (24 Ecken), `static rechteck(mitte, breite, laenge, drehungRad)`.
  - `abstand(anderer): number` = kürzester Abstand der Ränder, 0 bei Berührung oder Überlappung (auch wenn eines im anderen liegt).
  - `ueberlappt(anderer): boolean`.

## D3 Engine (`src/rules/platz/`)

- **`PlatzRegel`**: `{ name: PlatzRegelName; pruefe(k: PlatzKontext): readonly Hinweis[] }`.
- **`PlatzKontext`**: aus Bauwerk und Register einmal gebaut; liefert `mit(rolle): readonly { objekt: LagerObjekt; name: string; grundriss: Grundriss | null }[]`. Objekte ohne Grundriss fehlen.
- **`AbstandsRegel`**: eine Klasse für P1–P5 (`name`, `rolleA`, `rolleB` oder eine Liste von Rollen für B, `schluessel`, `schwere`, Textvorlage). Gleiche Rolle (P3) prüft jedes Paar einmal. Ein Hinweis je Paar unter dem Wert, sortiert nach Abstand aufsteigend.
- **`KronenRegel`** (P6): für jedes Paar Zelt und Baum ein Hinweis, wenn der Zelt-Grundriss den Kronenkreis (Radius = `P6_KRONENRADIUS_FAKTOR` × Baumhöhe) überlappt.
- **`PlatzRegelEngine`**: `static fuer(e: PlatzregelEinstellungen, register): PlatzRegelEngine`, `pruefe(bauwerk): Hinweis[]`. Überspringt abgeschaltete Regeln. Ohne Platz-Objekte und Zelte ergibt sie `[]` (kein Einfluss auf alte Dateien).
- **Anbindung:** `main.ts` hängt die Platz-Hinweise an die Hinweise aus E5 an (als `BauHinweis` mit `bau = null`, ohne Bau-Präfix). Der Klick markiert beide `betroffeneTeile`; die Szene markiert Objekt-ids (Test).

## D4 Einstellungen (`src/rules/platz/PlatzregelEinstellungen.ts`)

Gleiches Muster wie `RegelEinstellungen` (E0 D8), unveränderlich.
- `PLATZREGEL_NAMEN = ['P1', …, 'P6']`, `PLATZ_WERT_SCHLUESSEL` (die sechs Schlüssel aus D1), `aus: ReadonlySet<PlatzRegelName>`, `werte`.
- Methoden: `standard()`, `von(aus, werte)`, `istAus`, `wert(schluessel)`, `mitAus`, `mitWert`, `istStandard`.
- **Prüfung** (`RangeError`, deutsch): Abstand endlich und > 0 („Wert muss größer als 0 sein“), höchstens 500 m („Abstand darf höchstens 500 m betragen“); Kronenfaktor > 0 und ≤ 1 („Faktor muss zwischen 0 und 1 liegen“).
- **Bauwerk:** `platzregelEinstellungen` (Standard: alles an) und `mitPlatzregelEinstellungen(e)`; eine Änderung ist ein Undo-Schritt und reist mit Datei und Link.
- **Datenformat:** optional `platzregeln: { aus: ['P3'], werte: { P1_MIN_ABSTAND_FEUER_ZELT_M: 4 } }`.
  - Fehlt das Feld, gelten die Standardwerte. Ein unbekannter Regelname oder Schlüssel ergibt „Ungültige Bauwerk-Daten“ (wie bei `regeln`).
  - **Keine neue Version:** Wie `regeln` in E0 (D8) und `bauNamen` in E5 ist es ein optionales Feld, das v7 weiter liest; ein älteres exe ignoriert es und prüft ohne Platzregeln. Ist der Serializer strenger, gilt v8 (Zeile in die README).

## D5 Oberfläche (`src/ui/PlatzregelnPanel.ts`)

- **Knopf „Platzregeln…“** neben „Regeln…“ im Hinweis-Panel. Die Liste hat dasselbe Aussehen wie `RegelnPanel`: je Regel ein Haken, die Kurzbeschreibung, das Wertfeld mit Einheit („m“, beim Kronenfaktor „× Höhe“, Schritt 0,5 bzw. 0,05), und „Auf Standard zurücksetzen“.
  - Ungültige Werte zeigen die Meldung, und das Feld springt zurück (Muster aus v1).
  - Unter dem Katalog steht fest: „Feuer im Wald und im Gefährdungsbereich ist nach § 40 Forstgesetz nur mit Erlaubnis erlaubt (Waldbrandverordnung beachten). Dafür gibt es hier keine Meterregel.“
  - Jede Regel zeigt ihre **Quellenart** als Kleintext („Camping-Blogs“, „keine Quelle“, „VDE“, „Schweizer Pfadi“).
- **Zeile „Ausgeschaltet: R4, P1“:** Eine kleine Klasse `AusgeschaltetZeile` baut den Text aus beiden Einstellungen; `RegelnPanel` und `PlatzregelnPanel` nutzen sie (statt dass jedes Panel die Zeile für sich schreibt).
- `RegelnPanel` und das neue Platzregel-Panel teilen sich den Aufbau (Liste mit Haken, Wertfeldern samt Einheit, Zurückspringen ungültiger Werte, „Auf Standard zurücksetzen“) über eine gemeinsame Klasse in `src/ui/`; keine kopierte Panel-Logik *(Entscheidung Claude, Jakob kann umdrehen)*.
- In der Handy-Ansicht ist die Liste nur lesbar.

## D6 Tests

- **Unit (TDD):**
  - `Grundriss`: Abstand zweier Rechtecke (achsparallel und gedreht), Kreis–Rechteck, Berührung, Überlappung, eines im anderen;
  - `PlatzregelEinstellungen`: alle Fehlertexte, Paare, `mitAus`, `mitWert`, `standard`;
  - je Regel P1–P6: ein Fall unter dem Wert (Hinweis), einer genau auf dem Wert und einer darüber (kein Hinweis), Text beginnt mit „Faustregel (“, Schwere wie in Entscheidung 10, `betroffeneTeile` mit beiden ids;
  - kein Hinweistext enthält „verboten“, „Verstoß“ oder „Gesetz“ (Test über alle Regeln und beide Fälle);
  - Rollen: Feuerstelle bleibt Feuer nach geänderter Größe und geändertem Namen; Wechsel auf „Eigenes“ entfernt die Rolle; Küche, Latrine, Wasserstelle, Holzlager zugeordnet; Fahnenmast ohne Rolle;
  - Abstand von Kante zu Kante mit einem gedrehten Zelt und einer Feuerstelle (Zelt-`umriss()`);
  - abgeschaltete Regel erzeugt keinen Hinweis; eingestellter Wert ändert das Ergebnis (P1 auf 2 m: bei 3,2 m kein Hinweis); P6 mit Faktor 0,1 statt 0,3;
  - `PlatzRegelEngine` auf einem Bauwerk ohne Zelte und Platz-Objekte ergibt `[]`;
  - keine Fallunterscheidung je Art: Test registriert eine Testart mit `rolle` und `grundriss` und bekommt Hinweise;
  - Serializer: Rundlauf mit und ohne `platzregeln`, unbekannter Name, Version und Undo; v1–v7 laden weiter.
- **UI (happy-dom):** `PlatzregelnPanel` zeigt alle Regeln und die feste Forstgesetz-Zeile; ungültiger Wert springt zurück; Ansichtsmodus ohne Eingabefelder; `AusgeschaltetZeile` mit R- und P-Namen.
- **e2e:** Feuerstelle und Jurte 6er in 3 m Abstand setzen → Hinweis „Faustregel (Camping-Blogs …“; Wert auf 2 m stellen → Hinweis weg; Regel ausschalten, speichern, laden → „Ausgeschaltet: P1“ bleibt.
- **Unverändert grün:** alle bestehenden Tests, Build, Web-e2e, Desktop-e2e.

## Nicht in E6

- Feuer ↔ Wald, Waldrand, Gewässer, Hang und Gefälle (Latrine „unterhalb“ der Wasserentnahme), Windrichtung;
- „1 Latrine pro 20 Personen“ und Grubentiefe (keine Personenzahl im Modell);
- Kocher ↔ Zeltwand, Feuerstellen-Sockel von 20 cm (Hausregel Zellhof, ein Baumaß statt eines Abstands);
- Rettungszufahrt, Fahne, Parkplatz, Eventzelt-Abstände (keine belastbaren Werte);
- eigene Rollen für „Eigenes“-Objekte;
- Regeln je Bau oder je Zone;
- Rechtsberatung: Das Programm ersetzt weder die Platzordnung noch die Waldbrandverordnung.

## Verifikation

- Die Tests aus D6 sind grün, ebenso Build und beide e2e-Läufe.
- **Manuell (Jakob):**
  - Die sechs Startwerte prüfen und ersetzen, besonders P4 (30, 50, 60 oder 100 m), P1 (3 oder 5 m) und die drei Werte ohne Quelle (P2, P5, Kronenfaktor).
  - Beim Lagerplatz oder Lager-Referat die echten Abstände erfragen und in `constants.ts` eintragen; auf RIS den Wortlaut von § 40 ForstG prüfen.
  - Auf dem Luftbild eines echten Platzes Feuer, Zelte, Latrine und Wasserstelle auslegen und prüfen, ob die Hinweise sinnvoll sind und der Wortlaut nirgends nach „Gesetz“ klingt.
  - Eine Regel abschalten und einen Wert ändern, speichern und in der exe laden.
