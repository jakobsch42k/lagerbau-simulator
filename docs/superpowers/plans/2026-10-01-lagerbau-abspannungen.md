# Lagerbau-Simulator v2a: Abspannungen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seile (Abspannungen) und Bäume im Planer: einrastend zeichnen, in 3D zeigen, in Regeln, Materialliste und Platzbedarf berücksichtigen.

**Architecture:**
- Neue unveränderliche Domänen-Klassen `Seil` und `Baum` kommen in `src/model/`. Woran ein Seilende hängt (Haring, Baum, Bau, frei), leitet ein `VerankerungsFinder` aus der Geometrie ab, wie heute der `BundFinder` die Bünde.
- Die Regeln bekommen die Verankerungen über `Analyse`.
- Editor, Panel und Szene nutzen die bestehenden Muster: Zwei-Klick-Werkzeug, Einrasten, Parameter-Formular und three.js-Zylinder.

**Tech Stack:** TypeScript, Vite, three.js, Vitest (+ happy-dom), Playwright. Nichts Neues.

**Spec:** `docs/superpowers/specs/2026-10-01-lagerbau-abspannungen-design.md` (v2a). Die v1-Spec `docs/superpowers/specs/2026-09-30-lagerbau-simulator-design.md` gilt weiter.

Branch: `feat/abspannungen`, abgezweigt von `feat/desktop` @ `366f428`. PR #2 ist noch offen. Nach dessen Merge wird der Branch auf `main` rebased.

## Global Constraints

- UI-Texte und Domänen-Bezeichner auf Deutsch. Einheiten: Meter. y zeigt nach oben, der Boden ist y = 0.
- **Keine Statik-Rechnung.** Seile sind gerade Strecken, ohne Durchhang und ohne Kräfte. Kein Text im Tool behauptet, ein Bau „hält“. Die Fußzeile bleibt immer sichtbar.
- `src/model/` und `src/rules/` importieren weder `three` noch DOM-APIs.
- Regel-Schwellwerte stehen nur in `src/rules/constants.ts`, jeder mit `// CHECK MANUALLY`.
- Unveränderliche Domänenobjekte: Methoden geben neue Objekte zurück.
- Abdeckung ≥ 80 % (alle vier Metriken) für `src/model/**` und `src/rules/**`.
- **Seile erzeugen keine Bünde** (der `BundFinder` sieht nur Stangen) und verbinden für `Analyse.komponenten` keine Bauten.
- **Verankerung eines Seilendes**, in dieser Reihenfolge:
  1. **Haring**, wenn y ≤ `FUSS_TOLERANZ`.
  2. **Baum**, wenn der Abstand zur Stammoberfläche ≤ `BUND_TOLERANZ` ist und der Punkt zwischen Boden und Baumhöhe liegt.
  3. **Bau**, wenn der Abstand zur Stangenachse ≤ `BUND_TOLERANZ` ist; bei mehreren Stangen zählt die nächste.
  4. Sonst **frei**.

  Seilenden am Boden teilen sich einen Haring, wenn sie ≤ `BUND_CLUSTER_RADIUS` auseinander liegen.
- **Datenformat:**
  - geschrieben wird immer `version: 2`, also `gruppen`, `stangen`, `seile: [{ id, start, ende }]` und `baeume: [{ id, position, durchmesser, hoehe }]`;
  - gelesen werden `version: 1` und `version: 2`;
  - `MAX_TEILE` zählt Gruppen + Stangen + Seile + Bäume.
- **Hinweistexte (exakt):**
  - R6 flach: „Seil sehr flach: braucht viel Platz.“
  - R6 steil: „Seil sehr steil: hält seitlich kaum.“
  - R7: „Seil hängt tief: Stolper- oder Halsgefahr. Höher spannen oder gut sichtbar markieren.“
  - R8: „Seil hängt in der Luft: ein Ende ist nirgends befestigt.“
- **Materialliste:**
  - Seillänge = `Math.ceil(laenge + 2 × SEIL_ZUGABE_PRO_ENDE)` ganze Meter, gruppiert nach Länge;
  - Anzahl Haringe, geteilte nur einmal gezählt.
- **Platzbedarf:**
  - achsparalleles Rechteck in x/z über alle Füße und Haringe; Bäume zählen nicht;
  - Text „Platzbedarf: L × B m“ mit `toFixed(1)`, L ≥ B;
  - ohne Füße und Haringe entfällt die Zeile.
- Der Web-Build bleibt `base: '/lagerbau-simulator/'`. `npm run e2e:desktop` bleibt grün (5 Tests).
- Commits im Format `<type>: <beschreibung>`. Immer einzelne Dateien stagen, nie `git add -A`. Kein `Co-Authored-By`-Trailer.

## Abweichungen von der Spec (bewusst)

- `Bauwerk.ersetzeSeil` entfällt. Seile haben keine änderbaren Werte, das Panel zeigt nur Länge und Winkel (YAGNI).
- „Seil hängt in der Luft“ läuft als Regel **R8**.
- R1 zählt ein Seil nur, wenn sein anderes Ende **verankert** ist (nicht „frei“). Ein frei hängendes Ende sichert nichts.
- `Baum` hält seine Maße als `params: { durchmesser, hoehe }`, wie die Baugruppen; das passt zum Parameter-Formular. Im JSON stehen sie flach, wie in Spec D5.
- Die Tabelle behält die DOM-Id `#stangenliste`, nur die Überschrift heißt „Materialliste“. So bleiben die bestehenden E2E-Tests stabil.
- Ein dünnes Seil bekommt in der Szene einen unsichtbaren Greifmantel (Ø 10 cm), sonst trifft man es mit der Maus kaum.
- Die App-Version steigt auf `1.1.0` (Task 10). So unterscheiden die Leiterteams die neue `.exe` von der alten, die v2-Links nicht lesen kann.

## Review Focus

1. **Bau verschoben oder Baum gelöscht, nachdem Seile daran hängen.** Das Seilende hängt dann in der Luft. Erwartet: R8 meldet das Seil, R1 meldet den A-Bock wieder, nichts stürzt ab → Test in Task 6 (`abspannung.integration.test.ts`).
2. **Alte v1-Links und -Dateien**, darunter der Link im Web-E2E-Smoke-Test. Erwartet: Sie öffnen weiter, mit leeren Seil- und Baumlisten → Test in Task 4.
3. **Unsinnige Baumwerte im Panel** (0, negativ, leer). Erwartet: deutsche Meldung, das Feld springt auf den Modellwert zurück → Test in Task 8.
4. **Mehrere Seile zum selben Haring.** Erwartet: Die Materialliste zählt einen Haring, und der Platzbedarf nutzt dessen Position → Tests in Task 3 und Task 7.
5. **Ein angefangenes Seil abbrechen** (Esc oder Werkzeugwechsel). Erwartet: kein halbes Seil, die Startmarkierung verschwindet → Test in Task 8.

## Dateistruktur

| Datei | Verantwortung | Task |
|---|---|---|
| `src/share/LinkBasis.ts`, `desktop/main.mjs`, `electron-builder.yml` | Desktop-Reste (Kopier-Hinweis, Fenster-Icon) | 1 |
| `src/model/Seil.ts`, `src/model/Baum.ts` (neu) | Seil und Baum | 2 |
| `src/model/Bauwerk.ts` | Listen `seile`, `baeume`; Haringe, Verankerung | 2, 3 |
| `src/model/Verankerung.ts` (neu) | `Verankerung`, `Haring`, `VerankerungsFinder` | 3 |
| `src/share/BauwerkSerializer.ts` | Format v2 | 4 |
| `src/rules/Analyse.ts`, `ABockQuerRule.ts`, `StandflaecheRule.ts` | Seile in R1/R3 | 5 |
| `src/rules/AbspannwinkelRule.ts`, `StolperfalleRule.ts`, `LosesSeilRule.ts` (neu) | R6, R7, R8 | 6 |
| `src/model/Platzbedarf.ts`, `src/model/Materialliste.ts` (neu), `src/ui/MateriallistePanel.ts` (umbenannt) | Materialliste + Platzbedarf | 7 |
| `src/editor/SnapService.ts`, `src/editor/Werkzeuge.ts`, `src/ui/ParameterPanel.ts`, `index.html` | Werkzeuge „Seil spannen“, „Baum setzen“; Panel | 8 |
| `src/editor/Szene.ts` | Darstellung Seil, Haring, Baum, Platzbedarf; Treffer | 9 |
| `e2e/abspannung.spec.ts` (neu), Doku | E2E, Doku, Version | 10 |

---

### Task 1: Desktop-Reste aus dem Abschluss-Review

Zwei aufgeschobene Kleinigkeiten aus dem Desktop-Review:
- Der Hinweis „Der Link steht in der Adresszeile“ ist im Programm falsch, es hat keine Adresszeile.
- Beim Entwicklerstart fehlt das Fenster-Icon.

**Files:**
- Modify: `src/share/LinkBasis.ts`, `src/share/LinkBasis.test.ts`, `src/main.ts` (catch im Handler von `#btn-teilen`)
- Modify: `desktop/main.mjs`, `electron-builder.yml`

**Interfaces:**
- Consumes: `Ort` und `LinkBasis` aus `src/share/LinkBasis.ts`.
- Produces: `LinkBasis.kopierFehlerText(ort: Ort): string`.

- [ ] **Step 1: Failing test schreiben**

In `src/share/LinkBasis.test.ts`:
1. Den Testtitel `'nimmt im Browser die aktuelle Adresse ohne Query und Hash'` ändern in `'nimmt im Browser origin + pathname der aktuellen Adresse'`.
2. Im `describe` als letzten Test anhängen:

```ts
  it('nennt beim Kopierfehler die Adresszeile nur im Browser', () => {
    expect(LinkBasis.kopierFehlerText({ protocol: 'file:', origin: 'null', pathname: '/x/index.html' })).toBe('Kopieren nicht möglich.');
    expect(LinkBasis.kopierFehlerText({ protocol: 'https:', origin: 'https://jakobsch42k.github.io', pathname: '/lagerbau-simulator/' })).toBe(
      'Kopieren nicht möglich. Der Link steht in der Adresszeile.',
    );
  });
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run src/share/LinkBasis.test.ts`
Expected: FAIL mit `LinkBasis.kopierFehlerText is not a function`.

- [ ] **Step 3: Implementieren**

In `src/share/LinkBasis.ts` in der Klasse `LinkBasis` unter `aus` ergänzen:

```ts
  /** Meldung, wenn das Kopieren in die Zwischenablage scheitert. Das Windows-Programm hat keine Adresszeile. */
  static kopierFehlerText(ort: Ort): string {
    return ort.protocol === 'file:' ? 'Kopieren nicht möglich.' : 'Kopieren nicht möglich. Der Link steht in der Adresszeile.';
  }
```

In `src/main.ts`:
1. Import ergänzen: `import { LinkBasis } from './share/LinkBasis';`
2. Im Handler von `#btn-teilen` die Zeile `editor.zeigeMeldung('Kopieren nicht möglich. Der Link steht in der Adresszeile.');` ersetzen durch:

```ts
    editor.zeigeMeldung(LinkBasis.kopierFehlerText(location));
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/share/LinkBasis.test.ts`
Expected: PASS (3 Tests).

- [ ] **Step 5: Fenster-Icon**

In `desktop/main.mjs` in den Optionen von `new BrowserWindow({ … })` nach `title: TITEL,` ergänzen:

```js
      icon: join(app.getAppPath(), 'build', 'icon.png'),
```

In `electron-builder.yml` unter `files:` nach `- dist-desktop/**` ergänzen:

```yaml
  - build/icon.png
```

- [ ] **Step 6: Prüfen**

Run: `npm test`
Expected: alle grün, Coverage ≥ 80 %.
Run: `npm run e2e:desktop`
Expected: 5 passed.
Run: `npx @electron/asar list release/win-unpacked/resources/app.asar`
Expected: Die Liste enthält `\build\icon.png`.

- [ ] **Step 7: Commits**

```bash
git add src/share/LinkBasis.ts src/share/LinkBasis.test.ts src/main.ts
git commit -m "fix: show the right copy-failure hint in the desktop app"
git add desktop/main.mjs electron-builder.yml
git commit -m "feat: show the app icon in the window"
```

---

### Task 2: Seil, Baum und Bauwerk

**Files:**
- Create: `src/model/Seil.ts`, `src/model/Seil.test.ts`, `src/model/Baum.ts`, `src/model/Baum.test.ts`
- Modify: `src/model/konstanten.ts`, `src/model/params.ts`, `src/model/Bauwerk.ts`, `src/model/Bauwerk.test.ts`

**Interfaces:**
- Consumes: `Vec3`, `Stange`, `Baugruppe`, `BundFinder`, `Fuss`.
- Produces:
  - `MIN_SEILLAENGE = 0.3` in `konstanten.ts`;
  - `interface BaumParams { durchmesser; hoehe }` und `STANDARD_BAUM` in `params.ts`;
  - `class Seil { id; start; ende; laenge; winkelZumBodenGrad; tiefsteHoehe; endpunkte() }`;
  - `class Baum { id; position; params; mitParams(p); abstandZumStamm(p): number }`;
  - `Bauwerk.seile`, `Bauwerk.baeume`, `seil(id)`, `baum(id)`, `mitSeil(s)`, `mitBaum(b)`, `ersetzeBaum(b)`;
  - `ohne`, `enthaelt` und `istLeer` kennen Seile und Bäume.

- [ ] **Step 1: Konstanten**

In `src/model/konstanten.ts` am Ende anhängen:

```ts
export const MIN_SEILLAENGE = 0.3; // kürzere Seile ergeben keinen Sinn, wie bei Stangen
```

In `src/model/params.ts` am Ende anhängen:

```ts
export interface BaumParams {
  readonly durchmesser: number;
  readonly hoehe: number;
}

/** Startmaße für „Baum setzen“. Nur Darstellung und Einrasten, keine Regel-Schwellwerte. */
export const STANDARD_BAUM: BaumParams = { durchmesser: 0.3, hoehe: 8 };
```

- [ ] **Step 2: Failing tests schreiben**

Neue Datei `src/model/Seil.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';

describe('Seil', () => {
  it('misst Länge, Winkel zum Boden und tiefsten Punkt', () => {
    const s = new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
    expect(s.laenge).toBeCloseTo(2 * Math.SQRT2, 9);
    expect(s.winkelZumBodenGrad).toBeCloseTo(45, 9);
    expect(s.tiefsteHoehe).toBe(0);
    expect(s.endpunkte()).toEqual([s.start, s.ende]);
  });

  it('hat waagrecht 0° und senkrecht 90°', () => {
    expect(new Seil('w', new Vec3(0, 1, 0), new Vec3(3, 1, 0)).winkelZumBodenGrad).toBeCloseTo(0, 9);
    expect(new Seil('v', Vec3.NULL, new Vec3(0, 2, 0)).winkelZumBodenGrad).toBeCloseTo(90, 9);
  });

  it('lehnt zu kurze und nicht endliche Seile ab', () => {
    expect(() => new Seil('k', Vec3.NULL, new Vec3(0.2, 0, 0))).toThrow('Ein Seil muss mindestens 0.3 m lang sein');
    expect(() => new Seil('n', Vec3.NULL, new Vec3(Number.NaN, 0, 0))).toThrow(RangeError);
    expect(() => new Seil('i', Vec3.NULL, new Vec3(Infinity, 0, 0))).toThrow(RangeError);
  });
});
```

Neue Datei `src/model/Baum.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Baum } from './Baum';
import { STANDARD_BAUM } from './params';
import { Vec3 } from './Vec3';

const baum = new Baum('b', new Vec3(1, 0, 1), { durchmesser: 0.4, hoehe: 10 });

describe('Baum', () => {
  it('steht immer auf dem Boden', () => {
    expect(new Baum('x', new Vec3(1, 3, 1), STANDARD_BAUM).position.y).toBe(0);
  });

  it('misst den Abstand zur Stammoberfläche, über der Krone ist er unendlich', () => {
    expect(baum.abstandZumStamm(new Vec3(1.2, 1.5, 1))).toBeCloseTo(0, 9);
    expect(baum.abstandZumStamm(new Vec3(2, 1.5, 1))).toBeCloseTo(0.8, 9);
    expect(baum.abstandZumStamm(new Vec3(1, 1.5, 1))).toBeCloseTo(0.2, 9);
    expect(baum.abstandZumStamm(new Vec3(1.2, 11, 1))).toBe(Infinity);
  });

  it('lehnt unsinnige Maße ab', () => {
    expect(() => new Baum('x', Vec3.NULL, { durchmesser: 0, hoehe: 8 })).toThrow('Stammdurchmesser muss größer als 0 sein');
    expect(() => new Baum('x', Vec3.NULL, { durchmesser: 0.3, hoehe: -1 })).toThrow('Baumhöhe muss größer als 0 sein');
    expect(() => new Baum('x', Vec3.NULL, { durchmesser: 0.3, hoehe: Number.NaN })).toThrow(RangeError);
    expect(() => new Baum('x', new Vec3(Infinity, 0, 0), STANDARD_BAUM)).toThrow(RangeError);
  });

  it('ändert Maße, ohne sich selbst zu verändern', () => {
    const neu = baum.mitParams({ durchmesser: 0.5, hoehe: 12 });
    expect(neu).not.toBe(baum);
    expect(baum.params.durchmesser).toBe(0.4);
    expect(neu.params.hoehe).toBe(12);
    expect(neu.position.equals(baum.position)).toBe(true);
  });
});
```

In `src/model/Bauwerk.test.ts`:
1. Imports ergänzen: `import { Baum } from './Baum';`, `import { Seil } from './Seil';`. `STANDARD_BAUM` kommt in die bestehende Zeile `import { STANDARD_ABOCK, STANDARD_DREIBEIN } from './params';`.
2. Als letzte Tests im `describe('Bauwerk', …)` anhängen:

```ts
  it('nimmt Seile und Bäume auf, findet und entfernt sie', () => {
    const seil = new Seil('seil', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
    const baum = new Baum('baum', new Vec3(5, 0, 5), STANDARD_BAUM);
    const b = Bauwerk.leer().mitSeil(seil).mitBaum(baum);
    expect(b.istLeer).toBe(false);
    expect(b.seil('seil')).toBe(seil);
    expect(b.baum('baum')).toBe(baum);
    expect(b.enthaelt('seil') && b.enthaelt('baum')).toBe(true);
    expect(b.ohne('seil').ohne('baum').istLeer).toBe(true);
    expect(b.seile).toHaveLength(1);
  });

  it('ersetzt Bäume und lehnt doppelte IDs über alle Teile ab', () => {
    const baum = new Baum('x', Vec3.NULL, STANDARD_BAUM);
    const b = Bauwerk.leer().mitBaum(baum);
    expect(b.ersetzeBaum(baum.mitParams({ durchmesser: 0.5, hoehe: 9 })).baum('x')?.params.hoehe).toBe(9);
    expect(() => b.mitSeil(new Seil('x', Vec3.NULL, new Vec3(1, 0, 0)))).toThrow('ID x ist schon vergeben');
    expect(() => b.ersetzeBaum(new Baum('y', Vec3.NULL, STANDARD_BAUM))).toThrow('Baum y gibt es nicht');
  });

  it('behält Seile und Bäume bei allen anderen Änderungen', () => {
    const mitPlatz = voll.mitBaum(new Baum('baum', new Vec3(20, 0, 0), STANDARD_BAUM)).mitSeil(new Seil('seil', new Vec3(8, 2, 0), new Vec3(10, 0, 0)));
    const geaendert = mitPlatz
      .ersetzeGruppe(dreibein.gedreht(0.1))
      .ersetzeStange(frei.mitDurchmesser(0.1))
      .ohne('a')
      .mitStange(new Stange('s2', new Vec3(12, 0, 0), new Vec3(12, 2, 0), 0.08));
    expect(geaendert.seile.map((s) => s.id)).toEqual(['seil']);
    expect(geaendert.baeume.map((b) => b.id)).toEqual(['baum']);
  });
```

- [ ] **Step 3: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/model/Seil.test.ts src/model/Baum.test.ts src/model/Bauwerk.test.ts`
Expected: FAIL. `Seil.test.ts` und `Baum.test.ts` scheitern mit `Failed to resolve import "./Seil"` bzw. `"./Baum"`; die Bauwerk-Tests aus demselben Grund.

- [ ] **Step 4: Seil und Baum implementieren**

Neue Datei `src/model/Seil.ts`:

```ts
import { MIN_SEILLAENGE } from './konstanten';
import type { Vec3 } from './Vec3';

/** Ein gespanntes Seil als gerade Strecke start–ende. Kein Durchhang, keine Kräfte (Spec v2a, D1). */
export class Seil {
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
}
```

Neue Datei `src/model/Baum.ts`:

```ts
import type { BaumParams } from './params';
import { Vec3 } from './Vec3';

/** Ein Baum auf dem Lagerplatz: senkrechter Stamm ab dem Boden. Teil des Platzes, nicht des Baus. */
export class Baum {
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
}
```

- [ ] **Step 5: Bauwerk erweitern**

`src/model/Bauwerk.ts` vollständig ersetzen durch:

```ts
import type { Baugruppe } from './Baugruppe';
import type { Baum } from './Baum';
import { type Bund, BundFinder } from './Bund';
import { Fuss } from './Fuss';
import type { Seil } from './Seil';
import type { Stange } from './Stange';

/** Unveränderliches Aggregat aus Baugruppen, freien Stangen, Seilen und Bäumen. Bünde und Füße werden abgeleitet. */
export class Bauwerk {
  private constructor(
    readonly gruppen: readonly Baugruppe[],
    readonly freieStangen: readonly Stange[],
    readonly seile: readonly Seil[],
    readonly baeume: readonly Baum[],
  ) {}

  static leer(): Bauwerk {
    return new Bauwerk([], [], [], []);
  }

  get istLeer(): boolean {
    return this.gruppen.length === 0 && this.freieStangen.length === 0 && this.seile.length === 0 && this.baeume.length === 0;
  }

  stangen(): readonly Stange[] {
    return [...this.gruppen.flatMap((g) => g.stangen()), ...this.freieStangen];
  }

  gruppe(id: string): Baugruppe | undefined {
    return this.gruppen.find((g) => g.id === id);
  }

  stange(id: string): Stange | undefined {
    return this.stangen().find((s) => s.id === id);
  }

  seil(id: string): Seil | undefined {
    return this.seile.find((s) => s.id === id);
  }

  baum(id: string): Baum | undefined {
    return this.baeume.find((b) => b.id === id);
  }

  enthaelt(id: string): boolean {
    return this.gruppe(id) !== undefined || this.stange(id) !== undefined || this.seil(id) !== undefined || this.baum(id) !== undefined;
  }

  /** Klickt man eine Gruppenstange an, wird die ganze Gruppe ausgewählt. */
  auswahlIdFuer(stangeId: string): string {
    return this.stange(stangeId)?.gruppeId ?? stangeId;
  }

  mitGruppe(gruppe: Baugruppe): Bauwerk {
    this.pruefeNeu([gruppe.id, ...gruppe.stangen().map((s) => s.id)]);
    return new Bauwerk([...this.gruppen, gruppe], this.freieStangen, this.seile, this.baeume);
  }

  ersetzeGruppe(gruppe: Baugruppe): Bauwerk {
    if (!this.gruppe(gruppe.id)) throw new Error(`Baugruppe ${gruppe.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen.map((g) => (g.id === gruppe.id ? gruppe : g)),
      this.freieStangen,
      this.seile,
      this.baeume,
    );
  }

  mitStange(stange: Stange): Bauwerk {
    if (stange.gruppeId !== null) throw new Error('Nur freie Stangen können direkt hinzugefügt werden');
    this.pruefeNeu([stange.id]);
    return new Bauwerk(this.gruppen, [...this.freieStangen, stange], this.seile, this.baeume);
  }

  ersetzeStange(stange: Stange): Bauwerk {
    if (!this.freieStangen.some((s) => s.id === stange.id)) throw new Error(`Freie Stange ${stange.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen.map((s) => (s.id === stange.id ? stange : s)),
      this.seile,
      this.baeume,
    );
  }

  mitSeil(seil: Seil): Bauwerk {
    this.pruefeNeu([seil.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, [...this.seile, seil], this.baeume);
  }

  mitBaum(baum: Baum): Bauwerk {
    this.pruefeNeu([baum.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, this.seile, [...this.baeume, baum]);
  }

  ersetzeBaum(baum: Baum): Bauwerk {
    if (!this.baum(baum.id)) throw new Error(`Baum ${baum.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen,
      this.seile,
      this.baeume.map((b) => (b.id === baum.id ? baum : b)),
    );
  }

  ohne(id: string): Bauwerk {
    return new Bauwerk(
      this.gruppen.filter((g) => g.id !== id),
      this.freieStangen.filter((s) => s.id !== id),
      this.seile.filter((s) => s.id !== id),
      this.baeume.filter((b) => b.id !== id),
    );
  }

  buende(): readonly Bund[] {
    return new BundFinder().finde(this.stangen());
  }

  fuesse(): readonly Fuss[] {
    return this.stangen().flatMap((s) => Fuss.von(s));
  }

  private pruefeNeu(ids: readonly string[]): void {
    for (const id of ids) {
      if (this.enthaelt(id)) throw new Error(`ID ${id} ist schon vergeben`);
    }
  }
}
```

- [ ] **Step 6: Tests laufen lassen, sie müssen bestehen**

Run: `npx vitest run src/model`
Expected: PASS, alle Tests, auch die bestehenden.

- [ ] **Step 7: Volle Prüfung**

Run: `npm test`
Expected: alle grün, Coverage ≥ 80 %.
Run: `npm run build`
Expected: Exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/model/konstanten.ts src/model/params.ts src/model/Seil.ts src/model/Seil.test.ts src/model/Baum.ts src/model/Baum.test.ts src/model/Bauwerk.ts src/model/Bauwerk.test.ts
git commit -m "feat: add ropes and trees to the model"
```

---

### Task 3: Verankerung und Haringe

**Files:**
- Create: `src/model/Verankerung.ts`, `src/model/Verankerung.test.ts`
- Modify: `src/model/Bauwerk.ts` (zwei Methoden, zwei Imports)

**Interfaces:**
- Consumes:
  - `Seil.endpunkte()` und `Baum.abstandZumStamm(p)` aus Task 2;
  - `Stange.naechsterPunkt(p)`;
  - `clustereNachNaehe` und `mittelpunkt` aus `src/model/Bund.ts`;
  - `BUND_TOLERANZ`, `FUSS_TOLERANZ`, `BUND_CLUSTER_RADIUS`.
- Produces:
  - `type Verankerung = { art: 'haring' } | { art: 'baum'; baumId } | { art: 'bau'; stangeId } | { art: 'frei' }`;
  - `class Haring { id; position; seilIds }`;
  - `class VerankerungsFinder { finde(punkt, stangen, baeume): Verankerung; haringe(seile): Haring[] }`;
  - `Bauwerk.haringe(): readonly Haring[]`;
  - `Bauwerk.verankerung(punkt: Vec3): Verankerung`.

- [ ] **Step 1: Failing test schreiben**

Neue Datei `src/model/Verankerung.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { Seil } from './Seil';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';
import { VerankerungsFinder } from './Verankerung';

const stange = new Stange('st', Vec3.NULL, new Vec3(0, 3, 0), 0.08);
const baum = new Baum('b', new Vec3(5, 0, 0), { durchmesser: 0.4, hoehe: 10 });
const finder = new VerankerungsFinder();

describe('VerankerungsFinder', () => {
  it('erkennt einen Haring am Boden', () => {
    expect(finder.finde(new Vec3(1, 0, 1), [stange], [baum])).toEqual({ art: 'haring' });
  });

  it('erkennt einen Baum an der Stammoberfläche', () => {
    expect(finder.finde(new Vec3(4.8, 2, 0), [stange], [baum])).toEqual({ art: 'baum', baumId: 'b' });
  });

  it('erkennt einen Bau an der Stangenachse', () => {
    expect(finder.finde(new Vec3(0.03, 2, 0), [stange], [baum])).toEqual({ art: 'bau', stangeId: 'st' });
  });

  it('nimmt bei mehreren Stangen in Reichweite die nächste', () => {
    const nah = new Stange('nah', new Vec3(0.04, 0, 0), new Vec3(0.04, 3, 0), 0.08);
    expect(finder.finde(new Vec3(0.035, 1, 0), [stange, nah], [])).toEqual({ art: 'bau', stangeId: 'nah' });
  });

  it('meldet frei, wenn nichts in Reichweite ist', () => {
    expect(finder.finde(new Vec3(2, 2, 2), [stange], [baum])).toEqual({ art: 'frei' });
  });

  it('der Boden geht vor der Stange', () => {
    expect(finder.finde(new Vec3(0, 0.02, 0), [stange], [])).toEqual({ art: 'haring' });
  });

  it('Seilenden nah beieinander teilen sich einen Haring', () => {
    const a = new Seil('a', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
    const b = new Seil('b', new Vec3(0, 2, 1), new Vec3(2.1, 0, 0));
    const c = new Seil('c', new Vec3(0, 2, 0), new Vec3(-2, 0, 0));
    const haringe = finder.haringe([a, b, c]);
    expect(haringe).toHaveLength(2);
    const geteilt = haringe.find((h) => h.seilIds.includes('a'));
    expect(geteilt?.seilIds).toEqual(['a', 'b']);
    expect(geteilt?.position.equals(new Vec3(2.05, 0, 0), 1e-9)).toBe(true);
  });

  it('ein Seil zwischen zwei Bauten hat keinen Haring', () => {
    expect(finder.haringe([new Seil('q', new Vec3(0, 2, 0), new Vec3(4, 2, 0))])).toEqual([]);
  });
});

describe('Bauwerk mit Seilen', () => {
  it('liefert Haringe und die Verankerung eines Punkts', () => {
    const b = Bauwerk.leer().mitStange(stange).mitBaum(baum).mitSeil(new Seil('s', new Vec3(0, 2, 0), new Vec3(4.8, 2, 0)));
    expect(b.haringe()).toEqual([]);
    expect(b.verankerung(new Vec3(0, 2, 0))).toEqual({ art: 'bau', stangeId: 'st' });
    expect(b.verankerung(new Vec3(4.8, 2, 0))).toEqual({ art: 'baum', baumId: 'b' });
  });

  it('ein Seil zwischen zwei Stangen erzeugt keinen Bund', () => {
    const zweite = new Stange('st2', new Vec3(4, 0, 0), new Vec3(4, 3, 0), 0.08);
    const b = Bauwerk.leer().mitStange(stange).mitStange(zweite).mitSeil(new Seil('q', new Vec3(0, 2, 0), new Vec3(4, 2, 0)));
    expect(b.buende()).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run src/model/Verankerung.test.ts`
Expected: FAIL mit `Failed to resolve import "./Verankerung"`.

- [ ] **Step 3: Implementieren**

Neue Datei `src/model/Verankerung.ts`:

```ts
import type { Baum } from './Baum';
import { clustereNachNaehe, mittelpunkt } from './Bund';
import { BUND_CLUSTER_RADIUS, BUND_TOLERANZ, FUSS_TOLERANZ } from './konstanten';
import type { Seil } from './Seil';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

/** Woran ein Seilende hängt. Wird aus der Geometrie abgeleitet, nie gespeichert. */
export type Verankerung =
  | { readonly art: 'haring' }
  | { readonly art: 'baum'; readonly baumId: string }
  | { readonly art: 'bau'; readonly stangeId: string }
  | { readonly art: 'frei' };

/** Ein Haring oder Pflock am Boden. Seilenden, die nah beieinander am Boden enden, teilen sich einen. */
export class Haring {
  constructor(
    readonly id: string,
    readonly position: Vec3,
    readonly seilIds: readonly string[],
  ) {}
}

interface Bodenende {
  readonly punkt: Vec3;
  readonly seilId: string;
}

/** Leitet ab, woran Seilenden hängen (Spec v2a, D1). */
export class VerankerungsFinder {
  constructor(
    private readonly toleranz = BUND_TOLERANZ,
    private readonly bodenToleranz = FUSS_TOLERANZ,
    private readonly clusterRadius = BUND_CLUSTER_RADIUS,
  ) {}

  /** Reihenfolge: Boden vor Baum vor Stange. Bei mehreren Stangen in Reichweite zählt die nächste. */
  finde(punkt: Vec3, stangen: readonly Stange[], baeume: readonly Baum[]): Verankerung {
    if (punkt.y <= this.bodenToleranz) return { art: 'haring' };
    const baum = baeume.find((b) => b.abstandZumStamm(punkt) <= this.toleranz);
    if (baum) return { art: 'baum', baumId: baum.id };
    let naechste: { readonly id: string; readonly abstand: number } | null = null;
    for (const s of stangen) {
      const abstand = s.naechsterPunkt(punkt).distanceTo(punkt);
      if (abstand <= this.toleranz && (naechste === null || abstand < naechste.abstand)) naechste = { id: s.id, abstand };
    }
    return naechste ? { art: 'bau', stangeId: naechste.id } : { art: 'frei' };
  }

  haringe(seile: readonly Seil[]): Haring[] {
    const enden: Bodenende[] = seile.flatMap((s) =>
      s
        .endpunkte()
        .filter((p) => p.y <= this.bodenToleranz)
        .map((punkt) => ({ punkt, seilId: s.id })),
    );
    return clustereNachNaehe(enden, (e) => e.punkt, this.clusterRadius).map(
      (gruppe, i) => new Haring(`haring-${i}`, mittelpunkt(gruppe.map((e) => e.punkt)), [...new Set(gruppe.map((e) => e.seilId))]),
    );
  }
}
```

In `src/model/Bauwerk.ts`:
1. Imports ergänzen: `import type { Vec3 } from './Vec3';` und `import { type Haring, type Verankerung, VerankerungsFinder } from './Verankerung';`.
2. Nach `fuesse()` zwei Methoden ergänzen:

```ts
  haringe(): readonly Haring[] {
    return new VerankerungsFinder().haringe(this.seile);
  }

  /** Woran ein Punkt hängt (Haring, Baum, Stange oder frei), z. B. ein Seilende. */
  verankerung(punkt: Vec3): Verankerung {
    return new VerankerungsFinder().finde(punkt, this.stangen(), this.baeume);
  }
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/model/Verankerung.test.ts`
Expected: PASS (10 Tests).

- [ ] **Step 5: Volle Prüfung und Commit**

Run: `npm test`
Expected: alle grün, Coverage ≥ 80 %.

```bash
git add src/model/Verankerung.ts src/model/Verankerung.test.ts src/model/Bauwerk.ts
git commit -m "feat: derive rope anchors and pegs from geometry"
```

---

### Task 4: Datenformat Version 2

**Files:**
- Modify: `src/share/BauwerkSerializer.ts`, `src/share/share.test.ts`

**Interfaces:**
- Consumes: `Bauwerk.seile`, `Bauwerk.baeume`, `mitSeil`, `mitBaum` (Task 2), `Seil`, `Baum`, `MAX_TEILE`.
- Produces:
  - `BauwerkJson` mit `version: 2`, `seile: SeilJson[]`, `baeume: BaumJson[]`;
  - `interface SeilJson { id; start; ende }`;
  - `interface BaumJson { id; position; durchmesser; hoehe }`.

- [ ] **Step 1: Failing tests schreiben**

In `src/share/share.test.ts`:
1. Imports ergänzen: `import { Baum } from '../model/Baum';`, `import { Seil } from '../model/Seil';`, `import { Vec3 } from '../model/Vec3';`. Die Imports alphabetisch nach Pfad einsortieren, Fremdpakete zuerst.
2. Im Test `'speichert Gruppen als Parameter und nur freie Stangen einzeln'` die Zeile `expect(json.version).toBe(1);` ersetzen durch `expect(json.version).toBe(2);`.
3. In der `it.each`-Liste den Eintrag `['falsche Version', { version: 2, gruppen: [], stangen: [] }],` ersetzen durch:

```ts
    ['falsche Version', { version: 3, gruppen: [], stangen: [], seile: [], baeume: [] }],
    ['v2 ohne Seil-Liste', { version: 2, gruppen: [], stangen: [], baeume: [] }],
    ['zu kurzes Seil', { version: 2, gruppen: [], stangen: [], seile: [{ id: 's', start: [0, 0, 0], ende: [0.1, 0, 0] }], baeume: [] }],
    ['Baum ohne Höhe', { version: 2, gruppen: [], stangen: [], seile: [], baeume: [{ id: 'b', position: [0, 0, 0], durchmesser: 0.3, hoehe: 0 }] }],
```

4. Im `describe('BauwerkSerializer', …)` als letzte Tests anhängen:

```ts
  it('übersteht die Rundreise mit Seilen und Bäumen', () => {
    const b = kochstelle()
      .mitBaum(new Baum('baum', new Vec3(6, 0, 0), { durchmesser: 0.4, hoehe: 9 }))
      .mitSeil(new Seil('seil', new Vec3(0, 2, 0), new Vec3(1.5, 0, 0)));
    const json = serializer.zuJson(b);
    expect(json.seile).toEqual([{ id: 'seil', start: [0, 2, 0], ende: [1.5, 0, 0] }]);
    expect(json.baeume).toEqual([{ id: 'baum', position: [6, 0, 0], durchmesser: 0.4, hoehe: 9 }]);
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });

  it('liest alte v1-Daten ohne Seile und Bäume', () => {
    const v1 = { version: 1, gruppen: [], stangen: [{ id: 's', start: [0, 0, 0], ende: [0, 2, 0], durchmesser: 0.08 }] };
    const b = serializer.ausJson(v1);
    expect(b.freieStangen).toHaveLength(1);
    expect(b.seile).toEqual([]);
    expect(b.baeume).toEqual([]);
  });
```

5. Im `describe('Größengrenzen', …)` als letzten Test anhängen:

```ts
  it('zählt Seile und Bäume zu den Teilen', () => {
    const seile = Array.from({ length: MAX_TEILE }, (_, i) => ({ id: `seil${i}`, start: [i, 2, 0], ende: [i, 0, 1] }));
    const baum = { id: 'baum', position: [0, 0, 50], durchmesser: 0.3, hoehe: 8 };
    expect(serializer.ausJson({ version: 2, gruppen: [], stangen: [], seile, baeume: [] }).seile).toHaveLength(MAX_TEILE);
    expect(() => serializer.ausJson({ version: 2, gruppen: [], stangen: [], seile, baeume: [baum] })).toThrow(/^Ungültige Bauwerk-Daten: /);
  });
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/share/share.test.ts`
Expected: FAIL. Es scheitern:
- `expected 1 to be 2`;
- die Rundreise (`json.seile` ist `undefined`);
- die v2-Fälle, die mit dem alten Serializer nicht zum erwarteten Fehler führen;
- die Grenze mit Seilen.

- [ ] **Step 3: Implementieren**

In `src/share/BauwerkSerializer.ts`:
1. Imports ergänzen: `import { Baum } from '../model/Baum';` und `import { Seil } from '../model/Seil';`.
2. Unter `StangeJson` ergänzen und `BauwerkJson` ersetzen:

```ts
export interface SeilJson {
  readonly id: string;
  readonly start: V3;
  readonly ende: V3;
}

export interface BaumJson {
  readonly id: string;
  readonly position: V3;
  readonly durchmesser: number;
  readonly hoehe: number;
}

export interface BauwerkJson {
  readonly version: 2;
  readonly gruppen: readonly GruppeJson[];
  readonly stangen: readonly StangeJson[];
  readonly seile: readonly SeilJson[];
  readonly baeume: readonly BaumJson[];
}
```

3. `zuJson` ersetzen durch:

```ts
  zuJson(bauwerk: Bauwerk): BauwerkJson {
    return {
      version: 2,
      gruppen: bauwerk.gruppen.map((g) => this.gruppeZuJson(g)),
      stangen: bauwerk.freieStangen.map((s) => ({
        id: s.id,
        start: s.start.toArray(),
        ende: s.ende.toArray(),
        durchmesser: s.durchmesser,
      })),
      seile: bauwerk.seile.map((s) => ({ id: s.id, start: s.start.toArray(), ende: s.ende.toArray() })),
      baeume: bauwerk.baeume.map((b) => ({
        id: b.id,
        position: b.position.toArray(),
        durchmesser: b.params.durchmesser,
        hoehe: b.params.hoehe,
      })),
    };
  }
```

4. `lies` ersetzen durch:

```ts
  private lies(daten: unknown): Bauwerk {
    const o = objekt(daten, 'Bauwerk');
    if (o.version !== 1 && o.version !== 2) throw new Error('unbekannte Version');
    const rohGruppen = liste(o.gruppen, 'gruppen');
    const rohStangen = liste(o.stangen, 'stangen');
    // Version 1 kannte noch keine Seile und Bäume.
    const rohSeile = o.version === 2 ? liste(o.seile, 'seile') : [];
    const rohBaeume = o.version === 2 ? liste(o.baeume, 'baeume') : [];
    if (rohGruppen.length + rohStangen.length + rohSeile.length + rohBaeume.length > MAX_TEILE) {
      throw new Error(`mehr als ${MAX_TEILE} Teile`);
    }
    const mitGruppen = rohGruppen.map((g) => this.liesGruppe(g)).reduce((b, g) => b.mitGruppe(g), Bauwerk.leer());
    const mitStangen = rohStangen.map((s) => this.liesStange(s)).reduce((b, s) => b.mitStange(s), mitGruppen);
    const mitBaeumen = rohBaeume.map((b) => this.liesBaum(b)).reduce((bw, b) => bw.mitBaum(b), mitStangen);
    return rohSeile.map((s) => this.liesSeil(s)).reduce((b, s) => b.mitSeil(s), mitBaeumen);
  }
```

5. Nach `liesStange` ergänzen:

```ts
  private liesSeil(daten: unknown): Seil {
    const o = objekt(daten, 'Seil');
    return new Seil(text(o.id, 'id'), vektor(o.start, 'start'), vektor(o.ende, 'ende'));
  }

  private liesBaum(daten: unknown): Baum {
    const o = objekt(daten, 'Baum');
    return new Baum(text(o.id, 'id'), vektor(o.position, 'position'), {
      durchmesser: zahl(o.durchmesser, 'durchmesser'),
      hoehe: zahl(o.hoehe, 'hoehe'),
    });
  }
```

- [ ] **Step 4: Tests laufen lassen, sie müssen bestehen**

Run: `npx vitest run src/share/share.test.ts`
Expected: PASS.

- [ ] **Step 5: Volle Prüfung und Commit**

Run: `npm test`
Expected: alle grün.
Run: `npm run e2e`
Expected: 3 passed. Der Smoke-Test nutzt einen v1-Link, das deckt Review Focus 2 ab.

```bash
git add src/share/BauwerkSerializer.ts src/share/share.test.ts
git commit -m "feat: store ropes and trees in data format version 2"
```

---

### Task 5: Seile in der Analyse, R1 und R3

**Files:**
- Modify: `src/rules/Analyse.ts`, `src/rules/Analyse.test.ts`
- Modify: `src/rules/ABockQuerRule.ts`, `src/rules/ABockQuerRule.test.ts`
- Modify: `src/rules/StandflaecheRule.ts`, `src/rules/StandflaecheRule.test.ts`

**Interfaces:**
- Consumes: `Bauwerk.seile`, `Bauwerk.haringe()`, `Bauwerk.verankerung(p)` (Task 2/3), `ABock.ebenenNormale()`, `ABock.position`, `BUND_TOLERANZ`.
- Produces:
  - `interface SeilAnschluss { seil: Seil; anderesEnde: Vec3; anderes: Verankerung }`;
  - `Analyse.seile`, `Analyse.haringe`;
  - `Analyse.verankerungVon(seilId): readonly [Verankerung, Verankerung]`;
  - `Analyse.seileAn(stangenIds: ReadonlySet<string>): SeilAnschluss[]`.

- [ ] **Step 1: Failing tests schreiben**

In `src/rules/Analyse.test.ts`:
1. Imports ergänzen: `ABock` (`../model/ABock`), `Bauwerk` (`../model/Bauwerk`), `STANDARD_ABOCK` (`../model/params`), `Seil` (`../model/Seil`) und `Vec3` (`../model/Vec3`).
2. Als letzten Test im `describe('Analyse', …)` anhängen:

```ts
  it('ordnet Seilenden ihre Verankerung zu und findet Seile an Stangen', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const seil = new Seil('s', abock.spitze(), new Vec3(1.5, 0, 0));
    const an = new Analyse(Bauwerk.leer().mitGruppe(abock).mitSeil(seil));
    const [oben, unten] = an.verankerungVon('s');
    expect(oben.art).toBe('bau');
    expect(unten).toEqual({ art: 'haring' });
    const anschluesse = an.seileAn(new Set(abock.stangen().map((x) => x.id)));
    expect(anschluesse).toHaveLength(1);
    expect(anschluesse[0]?.anderesEnde.equals(new Vec3(1.5, 0, 0), 1e-9)).toBe(true);
    expect(anschluesse[0]?.anderes).toEqual({ art: 'haring' });
    expect(an.seileAn(new Set(['gibtsnicht']))).toEqual([]);
    expect(an.haringe).toHaveLength(1);
    expect(() => an.verankerungVon('gibtsnicht')).toThrow(/fehlt/);
  });

  it('ein Seil verbindet zwei Bauten nicht zu einem', () => {
    const links = new ABock('l', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const rechts = new ABock('r', new Vec3(4, 0, 0), Math.PI / 2, STANDARD_ABOCK);
    const b = Bauwerk.leer().mitGruppe(links).mitGruppe(rechts).mitSeil(new Seil('q', links.spitze(), rechts.spitze()));
    expect(new Analyse(b).komponenten()).toHaveLength(2);
  });
```

In `src/rules/ABockQuerRule.test.ts`:
1. Import ergänzen: `import { Seil } from '../model/Seil';`
2. Unter `const pruefe = …` ergänzen:

```ts
const seil = (id: string, x: number, z = 0) => new Seil(id, abock.spitze(), new Vec3(x, 0, z));
const mitSeilen = (...seile: Seil[]) => seile.reduce((b, s) => b.mitSeil(s), Bauwerk.leer().mitGruppe(abock));
```

3. Als letzte Tests im `describe` anhängen:

```ts
  it('schweigt, wenn auf beiden Seiten der Ebene ein Seil hängt', () => {
    expect(pruefe(mitSeilen(seil('l', -1.5), seil('r', 1.5)))).toEqual([]);
  });

  it('meldet weiter bei nur einseitiger Abspannung', () => {
    expect(pruefe(mitSeilen(seil('r', 1.5)))).toHaveLength(1);
  });

  it('meldet weiter bei zwei Seilen auf derselben Seite', () => {
    expect(pruefe(mitSeilen(seil('r1', 1.5), seil('r2', 1.5, 0.5)))).toHaveLength(1);
  });

  it('zählt ein Seilende in der A-Ebene für keine Seite', () => {
    expect(pruefe(mitSeilen(seil('l', -1.5), seil('e', 0, 2)))).toHaveLength(1);
  });

  it('zählt ein Seil mit frei hängendem anderem Ende nicht', () => {
    const frei = new Seil('f', abock.spitze(), new Vec3(1.5, 1, 0));
    expect(pruefe(mitSeilen(seil('l', -1.5), frei))).toHaveLength(1);
  });
```

In `src/rules/StandflaecheRule.test.ts`:
1. Import ergänzen: `import { Seil } from '../model/Seil';`
2. Als letzte Tests im `describe` anhängen:

```ts
  it('zählt die Haringe angebundener Seile zur Standfläche', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const allein = Bauwerk.leer().mitGruppe(abock);
    expect(pruefe(allein)).toHaveLength(1);
    const abgespannt = allein
      .mitSeil(new Seil('l', abock.spitze(), new Vec3(-1.5, 0, 0)))
      .mitSeil(new Seil('r', abock.spitze(), new Vec3(1.5, 0, 0)));
    expect(pruefe(abgespannt)).toEqual([]);
  });

  it('zählt Haringe von Seilen, die nicht am Bau hängen, nicht', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const fremd = new Seil('x', new Vec3(5, 2, 0), new Vec3(5, 0, 3));
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitSeil(fremd))).toHaveLength(1);
  });
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/rules/Analyse.test.ts src/rules/ABockQuerRule.test.ts src/rules/StandflaecheRule.test.ts`
Expected: FAIL.
- Analyse: `an.verankerungVon is not a function`.
- R1: `'schweigt, wenn auf beiden Seiten …'` erwartet `[]`, bekommt 1 Hinweis.
- R3: `'zählt die Haringe …'` erwartet `[]`, bekommt 1 Hinweis.

Die übrigen neuen Tests bestehen schon, weil sie einen Hinweis erwarten.

- [ ] **Step 3: Analyse erweitern**

`src/rules/Analyse.ts` vollständig ersetzen durch:

```ts
import type { Bauwerk } from '../model/Bauwerk';
import type { Bund } from '../model/Bund';
import type { Fuss } from '../model/Fuss';
import type { Seil } from '../model/Seil';
import type { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import type { Haring, Verankerung } from '../model/Verankerung';

/** Ein Seil, das an einer Stange hängt, gesehen von dieser Stange aus. */
export interface SeilAnschluss {
  readonly seil: Seil;
  /** Das andere Ende des Seils … */
  readonly anderesEnde: Vec3;
  /** … und woran es hängt. */
  readonly anderes: Verankerung;
}

/** Einmal pro Prüfung abgeleitete Daten, die alle Regeln teilen. */
export class Analyse {
  readonly stangen: readonly Stange[];
  readonly buende: readonly Bund[];
  readonly fuesse: readonly Fuss[];
  readonly seile: readonly Seil[];
  readonly haringe: readonly Haring[];
  private readonly verankerungen: ReadonlyMap<string, readonly [Verankerung, Verankerung]>;

  constructor(readonly bauwerk: Bauwerk) {
    this.stangen = bauwerk.stangen();
    this.buende = bauwerk.buende();
    this.fuesse = bauwerk.fuesse();
    this.seile = bauwerk.seile;
    this.haringe = bauwerk.haringe();
    this.verankerungen = new Map(
      this.seile.map((s): [string, readonly [Verankerung, Verankerung]] => [
        s.id,
        [bauwerk.verankerung(s.start), bauwerk.verankerung(s.ende)],
      ]),
    );
  }

  stange(id: string): Stange {
    const s = this.stangen.find((x) => x.id === id);
    if (!s) throw new Error(`Stange ${id} fehlt`);
    return s;
  }

  buendeVon(stangeId: string): Bund[] {
    return this.buende.filter((b) => b.enthaelt(stangeId));
  }

  fuesseVon(stangeId: string): Fuss[] {
    return this.fuesse.filter((f) => f.stangeId === stangeId);
  }

  /** Verankerung von Start und Ende eines Seils. */
  verankerungVon(seilId: string): readonly [Verankerung, Verankerung] {
    const v = this.verankerungen.get(seilId);
    if (!v) throw new Error(`Seil ${seilId} fehlt`);
    return v;
  }

  /** Seile, die mit einem Ende an einer der Stangen hängen, jeweils mit ihrem anderen Ende. */
  seileAn(stangenIds: ReadonlySet<string>): SeilAnschluss[] {
    return this.seile.flatMap((seil) => {
      const [anfang, schluss] = this.verankerungVon(seil.id);
      const anschluesse: SeilAnschluss[] = [];
      if (anfang.art === 'bau' && stangenIds.has(anfang.stangeId)) anschluesse.push({ seil, anderesEnde: seil.ende, anderes: schluss });
      if (schluss.art === 'bau' && stangenIds.has(schluss.stangeId)) anschluesse.push({ seil, anderesEnde: seil.start, anderes: anfang });
      return anschluesse;
    });
  }

  /** Stangen-IDs je zusammenhängendem Bau (über Bünde verbunden), per Union-Find. Seile verbinden nichts. */
  komponenten(): string[][] {
    const eltern = new Map(this.stangen.map((s) => [s.id, s.id]));
    const wurzel = (id: string): string => {
      let w = id;
      while (eltern.get(w) !== w) w = eltern.get(w) as string;
      return w;
    };
    for (const b of this.buende) {
      const [erste, ...rest] = b.stangenIds;
      for (const id of rest) eltern.set(wurzel(id), wurzel(erste as string));
    }
    const gruppen = new Map<string, string[]>();
    for (const s of this.stangen) {
      const w = wurzel(s.id);
      gruppen.set(w, [...(gruppen.get(w) ?? []), s.id]);
    }
    return [...gruppen.values()];
  }
}
```

- [ ] **Step 4: R1 erweitern**

In `src/rules/ABockQuerRule.ts`:
1. Import ergänzen: `import { BUND_TOLERANZ } from '../model/konstanten';`
2. In `pruefe` die Zeile `.filter((abock) => !this.istQuerGehalten(abock, a))` ersetzen durch:

```ts
      .filter((abock) => !this.istQuerGehalten(abock, a) && !this.istBeidseitigAbgespannt(abock, a))
```

3. Nach `istQuerGehalten` ergänzen:

```ts
  /** Spec v2a, D3: je mindestens ein verankertes Seil auf beiden Seiten der A-Ebene. Enden in der Ebene zählen nicht. */
  private istBeidseitigAbgespannt(abock: ABock, a: Analyse): boolean {
    const eigene = new Set(abock.stangen().map((s) => s.id));
    const normale = abock.ebenenNormale();
    const seiten = a
      .seileAn(eigene)
      .filter((x) => x.anderes.art !== 'frei')
      .map((x) => x.anderesEnde.sub(abock.position).dot(normale))
      .filter((abstand) => Math.abs(abstand) >= BUND_TOLERANZ)
      .map((abstand) => Math.sign(abstand));
    return seiten.includes(1) && seiten.includes(-1);
  }
```

- [ ] **Step 5: R3 erweitern**

In `src/rules/StandflaecheRule.ts` die Methode `kippgefaehrdet` ersetzen durch:

```ts
  private kippgefaehrdet(a: Analyse, ids: readonly string[]): boolean {
    const fuesse = ids.flatMap((id) => a.fuesseVon(id));
    if (fuesse.length === 0) return false;
    const hoehe = this.hoehe(a, ids);
    if (hoehe < this.minHoehe) return false;
    // Spec v2a, D3: Haringe der Seile, die an diesem Bau hängen, gehören zur Standfläche.
    const haringe = a
      .seileAn(new Set(ids))
      .filter((x) => x.anderes.art === 'haring')
      .map((x) => x.anderesEnde);
    const punkte = [...fuesse.map((f) => f.position), ...haringe];
    const breite = minimaleBreite(punkte.map((p) => [p.x, p.z] as const));
    return hoehe > this.maxVerhaeltnis * breite;
  }
```

- [ ] **Step 6: Tests laufen lassen, sie müssen bestehen**

Run: `npx vitest run src/rules`
Expected: PASS, alle Tests einschließlich `kochstelle.integration.test.ts`.

- [ ] **Step 7: Volle Prüfung und Commit**

Run: `npm test`
Expected: alle grün, Coverage ≥ 80 %.

```bash
git add src/rules/Analyse.ts src/rules/Analyse.test.ts src/rules/ABockQuerRule.ts src/rules/ABockQuerRule.test.ts src/rules/StandflaecheRule.ts src/rules/StandflaecheRule.test.ts
git commit -m "feat: let guy lines secure an A-Bock (R1) and widen the base (R3)"
```

---

### Task 6: Neue Regeln R6, R7, R8

**Files:**
- Create: `src/rules/AbspannwinkelRule.ts` (+ `.test.ts`), `src/rules/StolperfalleRule.ts` (+ `.test.ts`), `src/rules/LosesSeilRule.ts` (+ `.test.ts`)
- Create: `src/rules/abspannung.integration.test.ts`
- Modify: `src/rules/constants.ts`, `src/rules/standardRegeln.ts`

**Interfaces:**
- Consumes: `Analyse.seile` und `Analyse.verankerungVon(id)` (Task 5), `Seil.winkelZumBodenGrad` und `Seil.tiefsteHoehe` (Task 2), `hinweis(...)`.
- Produces:
  - `R6_MIN_WINKEL_GRAD`, `R6_MAX_WINKEL_GRAD`, `R7_MIN_HOEHE`, `SEIL_ZUGABE_PRO_ENDE` in `constants.ts`;
  - die Regeln `AbspannwinkelRule` (`'R6'`), `StolperfalleRule` (`'R7'`) und `LosesSeilRule` (`'R8'`);
  - `standardRegeln()` liefert R1–R8.

- [ ] **Step 1: Schwellwerte**

In `src/rules/constants.ts` am Ende anhängen:

```ts
export const R6_MIN_WINKEL_GRAD = 30; // CHECK MANUALLY: flachere Abspannungen brauchen viel Platz
export const R6_MAX_WINKEL_GRAD = 60; // CHECK MANUALLY: steilere Abspannungen halten seitlich kaum
export const R7_MIN_HOEHE = 2; // m, CHECK MANUALLY: tiefer hängende Querseile sind Stolper- oder Halsfallen
export const SEIL_ZUGABE_PRO_ENDE = 0.5; // m, CHECK MANUALLY: Seil für den Knoten je Ende (Materialliste)
```

- [ ] **Step 2: Failing tests schreiben**

Neue Datei `src/rules/AbspannwinkelRule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { AbspannwinkelRule } from './AbspannwinkelRule';
import { Analyse } from './Analyse';

const pfosten = new Stange('p', Vec3.NULL, new Vec3(0, 4, 0), 0.08);
/** Seil vom Pfosten in 2 m Höhe zum Boden, mit dem gewünschten Winkel zur Waagrechten. */
const seilMitWinkel = (grad: number): Seil => new Seil('s', new Vec3(0, 2, 0), new Vec3(2 / Math.tan((grad * Math.PI) / 180), 0, 0));
const pruefe = (regel: AbspannwinkelRule, ...seile: Seil[]) =>
  regel.pruefe(new Analyse(seile.reduce((b, s) => b.mitSeil(s), Bauwerk.leer().mitStange(pfosten))));
const regel = new AbspannwinkelRule(30, 60);

describe('AbspannwinkelRule (R6)', () => {
  it('meldet ein sehr flaches Seil zum Haring', () => {
    const h = pruefe(regel, seilMitWinkel(20));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R6', schwere: 'warnung', betroffeneTeile: ['s'] });
    expect(h[0]?.text).toBe('Seil sehr flach: braucht viel Platz.');
  });

  it('meldet ein sehr steiles Seil zum Haring', () => {
    expect(pruefe(regel, seilMitWinkel(75))[0]?.text).toBe('Seil sehr steil: hält seitlich kaum.');
  });

  it('schweigt im erlaubten Bereich und genau an beiden Grenzen', () => {
    expect(pruefe(regel, seilMitWinkel(45))).toEqual([]);
    const s = seilMitWinkel(40);
    expect(pruefe(new AbspannwinkelRule(s.winkelZumBodenGrad, 80), s)).toEqual([]);
    expect(pruefe(new AbspannwinkelRule(10, s.winkelZumBodenGrad), s)).toEqual([]);
  });

  it('meldet knapp jenseits der Grenzen', () => {
    const s = seilMitWinkel(40);
    expect(pruefe(new AbspannwinkelRule(s.winkelZumBodenGrad + 0.1, 80), s)).toHaveLength(1);
    expect(pruefe(new AbspannwinkelRule(10, s.winkelZumBodenGrad - 0.1), s)).toHaveLength(1);
  });

  it('prüft nur Seile vom Bau zum Haring', () => {
    const baum = new Baum('b', new Vec3(5, 0, 0), { durchmesser: 0.4, hoehe: 10 });
    const vomBaum = new Seil('vb', new Vec3(4.8, 1, 0), new Vec3(1, 0, 0));
    const quer = new Seil('q', new Vec3(0, 3, 0), new Vec3(4.8, 3, 0));
    const b = Bauwerk.leer().mitStange(pfosten).mitBaum(baum).mitSeil(vomBaum).mitSeil(quer);
    expect(regel.pruefe(new Analyse(b))).toEqual([]);
  });
});
```

Neue Datei `src/rules/StolperfalleRule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { StolperfalleRule } from './StolperfalleRule';

const links = new Stange('p1', Vec3.NULL, new Vec3(0, 3, 0), 0.08);
const rechts = new Stange('p2', new Vec3(4, 0, 0), new Vec3(4, 3, 0), 0.08);
const baum = new Baum('b', new Vec3(0, 0, 6), { durchmesser: 0.4, hoehe: 10 });
const basis = Bauwerk.leer().mitStange(links).mitStange(rechts).mitBaum(baum);
const regel = new StolperfalleRule(2);
const pruefe = (s: Seil) => regel.pruefe(new Analyse(basis.mitSeil(s)));

describe('StolperfalleRule (R7)', () => {
  it('meldet ein tiefes Querseil zwischen zwei Bauten', () => {
    const h = pruefe(new Seil('q', new Vec3(0, 1, 0), new Vec3(4, 1, 0)));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R7', betroffeneTeile: ['q'] });
    expect(h[0]?.text).toBe('Seil hängt tief: Stolper- oder Halsgefahr. Höher spannen oder gut sichtbar markieren.');
  });

  it('meldet ein tiefes Seil vom Bau zum Baum', () => {
    expect(pruefe(new Seil('zb', new Vec3(0, 1.5, 0), new Vec3(0, 1.5, 5.8)))).toHaveLength(1);
  });

  it('schweigt bei hohen Querseilen und genau an der Grenze', () => {
    expect(pruefe(new Seil('hoch', new Vec3(0, 2.5, 0), new Vec3(4, 2.5, 0)))).toEqual([]);
    expect(pruefe(new Seil('grenze', new Vec3(0, 2, 0), new Vec3(4, 2, 0)))).toEqual([]);
  });

  it('meldet Seile zum Haring nie', () => {
    expect(pruefe(new Seil('h', new Vec3(0, 1, 0), new Vec3(2, 0, 0)))).toEqual([]);
  });

  it('überlässt Seile mit freiem Ende R8', () => {
    expect(pruefe(new Seil('f', new Vec3(0, 1, 0), new Vec3(2, 1, 2)))).toEqual([]);
  });
});
```

Neue Datei `src/rules/LosesSeilRule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../model/Bauwerk';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { LosesSeilRule } from './LosesSeilRule';

const pfosten = new Stange('p', Vec3.NULL, new Vec3(0, 3, 0), 0.08);
const pruefe = (s: Seil) => new LosesSeilRule().pruefe(new Analyse(Bauwerk.leer().mitStange(pfosten).mitSeil(s)));

describe('LosesSeilRule (R8)', () => {
  it('meldet ein Seil mit einem Ende in der Luft', () => {
    const h = pruefe(new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 1, 0)));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R8', betroffeneTeile: ['s'] });
    expect(h[0]?.text).toBe('Seil hängt in der Luft: ein Ende ist nirgends befestigt.');
  });

  it('schweigt, wenn beide Enden verankert sind', () => {
    expect(pruefe(new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 0, 0)))).toEqual([]);
  });
});
```

Neue Datei `src/rules/abspannung.integration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { RuleEngine } from './RuleEngine';
import { standardRegeln } from './standardRegeln';

// Läuft mit den Schwellwerten aus constants.ts (R6 30°–60°: die Seile hier haben ca. 54°).
const engine = new RuleEngine(standardRegeln());
const abock = new ABock('abock', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK); // A-Ebene ist x = 0
const seil = (id: string, x: number) => new Seil(id, abock.spitze(), new Vec3(x, 0, 0));
const abgespannt = Bauwerk.leer().mitGruppe(abock).mitSeil(seil('l', -1.5)).mitSeil(seil('r', 1.5));
const regeln = (b: Bauwerk) => engine.pruefe(b).map((h) => h.regel);

describe('Abgespannter A-Bock mit allen Regeln', () => {
  it('beidseitig abgespannt: keine Hinweise', () => {
    expect(engine.pruefe(abgespannt)).toEqual([]);
  });

  it('nur einseitig abgespannt: nur R1', () => {
    expect(regeln(Bauwerk.leer().mitGruppe(abock).mitSeil(seil('r', 1.5)))).toEqual(['R1']);
  });

  it('A-Bock nach dem Abspannen verschoben: Seile hängen in der Luft, R1 meldet wieder', () => {
    const verschoben = abgespannt.ersetzeGruppe(abock.verschoben(new Vec3(1, 0, 0)));
    const r = regeln(verschoben);
    expect(r).toContain('R1');
    expect(r.filter((x) => x === 'R8')).toHaveLength(2);
  });

  it('Baum gelöscht, an dem ein Seil hing: R8 meldet das Seil', () => {
    const baum = new Baum('baum', new Vec3(0, 0, 6), { durchmesser: 0.4, hoehe: 10 });
    const zumBaum = new Seil('zb', abock.spitze(), new Vec3(0, abock.spitze().y, 5.8));
    const mitBaum = abgespannt.mitBaum(baum).mitSeil(zumBaum);
    expect(regeln(mitBaum)).not.toContain('R8');
    expect(regeln(mitBaum.ohne('baum'))).toContain('R8');
  });
});
```

- [ ] **Step 3: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/rules`
Expected: FAIL.
- Die drei neuen Regel-Tests scheitern mit `Failed to resolve import`.
- Im Integrationstest scheitern die Tests mit R8, weil die Regel noch fehlt.

- [ ] **Step 4: Regeln implementieren**

Neue Datei `src/rules/AbspannwinkelRule.ts`:

```ts
import type { Analyse } from './Analyse';
import { R6_MAX_WINKEL_GRAD, R6_MIN_WINKEL_GRAD } from './constants';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R6: Ein Seil vom Bau zum Haring soll weder sehr flach noch sehr steil sein. */
export class AbspannwinkelRule implements Rule {
  readonly name = 'R6';

  constructor(
    private readonly minGrad = R6_MIN_WINKEL_GRAD,
    private readonly maxGrad = R6_MAX_WINKEL_GRAD,
  ) {}

  pruefe(a: Analyse): Hinweis[] {
    return a.seile.flatMap((s): Hinweis[] => {
      const arten = a
        .verankerungVon(s.id)
        .map((v) => v.art)
        .sort()
        .join('+');
      if (arten !== 'bau+haring') return [];
      const winkel = s.winkelZumBodenGrad;
      if (winkel < this.minGrad) return [hinweis(this.name, 'Seil sehr flach: braucht viel Platz.', [s.id])];
      if (winkel > this.maxGrad) return [hinweis(this.name, 'Seil sehr steil: hält seitlich kaum.', [s.id])];
      return [];
    });
  }
}
```

Neue Datei `src/rules/StolperfalleRule.ts`:

```ts
import type { Analyse } from './Analyse';
import { R7_MIN_HOEHE } from './constants';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R7: Ein Querseil (Bau↔Bau, Bau↔Baum, Baum↔Baum) darf nicht tief hängen. Seile zum Haring sind normal. */
export class StolperfalleRule implements Rule {
  readonly name = 'R7';

  constructor(private readonly minHoehe = R7_MIN_HOEHE) {}

  pruefe(a: Analyse): Hinweis[] {
    return a.seile.flatMap((s): Hinweis[] => {
      const istQuerseil = a.verankerungVon(s.id).every((v) => v.art === 'bau' || v.art === 'baum');
      if (!istQuerseil || s.tiefsteHoehe >= this.minHoehe) return [];
      return [hinweis(this.name, 'Seil hängt tief: Stolper- oder Halsgefahr. Höher spannen oder gut sichtbar markieren.', [s.id])];
    });
  }
}
```

Neue Datei `src/rules/LosesSeilRule.ts`:

```ts
import type { Analyse } from './Analyse';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R8: Jedes Seilende muss an einem Haring, Baum oder einer Stange hängen. */
export class LosesSeilRule implements Rule {
  readonly name = 'R8';

  pruefe(a: Analyse): Hinweis[] {
    return a.seile
      .filter((s) => a.verankerungVon(s.id).some((v) => v.art === 'frei'))
      .map((s) => hinweis(this.name, 'Seil hängt in der Luft: ein Ende ist nirgends befestigt.', [s.id]));
  }
}
```

`src/rules/standardRegeln.ts` vollständig ersetzen durch:

```ts
import { ABockQuerRule } from './ABockQuerRule';
import { AbspannwinkelRule } from './AbspannwinkelRule';
import { LoseStangeRule } from './LoseStangeRule';
import { LosesSeilRule } from './LosesSeilRule';
import type { Rule } from './Rule';
import { SpreizungRule } from './SpreizungRule';
import { StandflaecheRule } from './StandflaecheRule';
import { StolperfalleRule } from './StolperfalleRule';
import { ViereckRule } from './ViereckRule';

/** R1–R8 mit den Schwellwerten aus constants.ts. */
export function standardRegeln(): Rule[] {
  return [
    new ABockQuerRule(),
    new ViereckRule(),
    new StandflaecheRule(),
    new SpreizungRule(),
    new LoseStangeRule(),
    new AbspannwinkelRule(),
    new StolperfalleRule(),
    new LosesSeilRule(),
  ];
}
```

- [ ] **Step 5: Tests laufen lassen, sie müssen bestehen**

Run: `npx vitest run src/rules`
Expected: PASS, alle Tests einschließlich `kochstelle.integration.test.ts`.

- [ ] **Step 6: Volle Prüfung und Commit**

Run: `npm test`
Expected: alle grün, Coverage ≥ 80 %.
Run: `npm run build`
Expected: Exit 0.

```bash
git add src/rules/constants.ts src/rules/standardRegeln.ts src/rules/AbspannwinkelRule.ts src/rules/AbspannwinkelRule.test.ts src/rules/StolperfalleRule.ts src/rules/StolperfalleRule.test.ts src/rules/LosesSeilRule.ts src/rules/LosesSeilRule.test.ts src/rules/abspannung.integration.test.ts
git commit -m "feat: add rules for guy-line angle, low cross ropes and loose ropes"
```

---

### Task 7: Materialliste und Platzbedarf

**Files:**
- Create: `src/model/Platzbedarf.ts`, `src/model/Platzbedarf.test.ts`, `src/model/Materialliste.ts`, `src/model/Materialliste.test.ts`
- Rename + rewrite: `src/ui/StangenlistePanel.ts` → `src/ui/MateriallistePanel.ts`; Create `src/ui/MateriallistePanel.test.ts`
- Modify: `src/main.ts`, `index.html`, `src/style.css`

**Interfaces:**
- Consumes: `Bauwerk.fuesse()`, `Bauwerk.haringe()`, `Bauwerk.seile`, `Stangenliste.aus(bauwerk)`, `SEIL_ZUGABE_PRO_ENDE` (Task 6).
- Produces:
  - `class Platzbedarf { minX; maxX; minZ; maxZ; laenge; breite; static aus(bauwerk): Platzbedarf | null }`;
  - `interface SeilZeile { laenge; anzahl }`;
  - `class Materialliste { stangen: Stangenliste; seile: SeilZeile[]; anzahlHaringe; platzbedarf; static aus(bauwerk, zugabeProEnde) }`;
  - `class MateriallistePanel(tabelle, platz) { zeige(liste) }`;
  - DOM-Id `#platzbedarf`.

- [ ] **Step 1: Failing tests schreiben**

Neue Datei `src/model/Platzbedarf.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ABock } from './ABock';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { STANDARD_ABOCK, STANDARD_BAUM } from './params';
import { Platzbedarf } from './Platzbedarf';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';

describe('Platzbedarf', () => {
  it('umschließt alle Füße, längere Seite zuerst', () => {
    const p = Platzbedarf.aus(kochstelle());
    expect(p?.laenge).toBeCloseTo(3.2, 9);
    expect(p?.breite).toBeCloseTo(1.6, 9);
  });

  it('zählt Haringe mit und Bäume nicht', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const b = Bauwerk.leer()
      .mitGruppe(abock)
      .mitSeil(new Seil('l', abock.spitze(), new Vec3(-1.5, 0, 0)))
      .mitSeil(new Seil('r', abock.spitze(), new Vec3(1.5, 0, 0)))
      .mitBaum(new Baum('baum', new Vec3(20, 0, 20), STANDARD_BAUM));
    const p = Platzbedarf.aus(b);
    expect(p?.laenge).toBeCloseTo(3, 9);
    expect(p?.breite).toBeCloseTo(1.6, 9);
  });

  it('gibt es ohne Füße und Haringe nicht', () => {
    expect(Platzbedarf.aus(Bauwerk.leer())).toBeNull();
    expect(Platzbedarf.aus(Bauwerk.leer().mitBaum(new Baum('b', Vec3.NULL, STANDARD_BAUM)))).toBeNull();
  });
});
```

Neue Datei `src/model/Materialliste.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from './Bauwerk';
import { Materialliste } from './Materialliste';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';

describe('Materialliste', () => {
  it('rundet Seile samt Zugabe auf ganze Meter und gruppiert sie', () => {
    const b = Bauwerk.leer()
      .mitSeil(new Seil('a', new Vec3(0, 2, 0), new Vec3(1.5, 0, 0))) // 2,5 m + 1 m → 4 m
      .mitSeil(new Seil('b', new Vec3(0, 2, 0), new Vec3(-1.5, 0, 0))) // 2,5 m + 1 m → 4 m
      .mitSeil(new Seil('c', new Vec3(0, 3, 0), new Vec3(0, 3, 3))); // genau 3 m + 1 m → 4 m, nicht 5 m
    expect(Materialliste.aus(b, 0.5).seile).toEqual([{ laenge: 4, anzahl: 3 }]);
    // 1 m Zugabe je Ende: 2,5 m → 4,5 m → 5 m und 3 m → 5,0 m → 5 m, also alle drei in einer Zeile.
    expect(Materialliste.aus(b, 1).seile).toEqual([{ laenge: 5, anzahl: 3 }]);
  });

  it('sortiert Seillängen absteigend', () => {
    const b = Bauwerk.leer()
      .mitSeil(new Seil('kurz', new Vec3(0, 1, 0), new Vec3(0, 1, 1)))
      .mitSeil(new Seil('lang', new Vec3(0, 1, 0), new Vec3(0, 1, 6)));
    expect(Materialliste.aus(b, 0.5).seile).toEqual([
      { laenge: 7, anzahl: 1 },
      { laenge: 2, anzahl: 1 },
    ]);
  });

  it('zählt geteilte Haringe nur einmal', () => {
    const b = Bauwerk.leer()
      .mitSeil(new Seil('a', new Vec3(0, 2, 0), new Vec3(2, 0, 0)))
      .mitSeil(new Seil('b', new Vec3(0, 2, 1), new Vec3(2.1, 0, 0)));
    expect(Materialliste.aus(b, 0.5).anzahlHaringe).toBe(1);
  });

  it('enthält Stangenliste und Platzbedarf', () => {
    const m = Materialliste.aus(kochstelle(), 0.5);
    expect(m.stangen.zeilen.length).toBeGreaterThan(0);
    expect(m.seile).toEqual([]);
    expect(m.anzahlHaringe).toBe(0);
    expect(m.platzbedarf?.laenge).toBeCloseTo(3.2, 9);
  });
});
```

Neue Datei `src/ui/MateriallistePanel.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Materialliste } from '../model/Materialliste';
import { STANDARD_ABOCK } from '../model/params';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { MateriallistePanel } from './MateriallistePanel';

const zeige = (b: Bauwerk): { tabelle: HTMLTableElement; platz: HTMLElement } => {
  const tabelle = document.createElement('table');
  const platz = document.createElement('p');
  new MateriallistePanel(tabelle, platz).zeige(Materialliste.aus(b, 0.5));
  return { tabelle, platz };
};

describe('MateriallistePanel', () => {
  it('zeigt Stangen, Seile, Haringe und den Platzbedarf', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const b = Bauwerk.leer()
      .mitGruppe(abock)
      .mitSeil(new Seil('l', abock.spitze(), new Vec3(-1.5, 0, 0)))
      .mitSeil(new Seil('r', abock.spitze(), new Vec3(1.5, 0, 0)));
    const { tabelle, platz } = zeige(b);
    const zellen = [...tabelle.querySelectorAll('td')].map((td) => td.textContent);
    expect(zellen).toContain('2.4 m');
    expect(zellen).toContain('4 m');
    expect(zellen).toContain('Haringe');
    expect(platz.textContent).toBe('Platzbedarf: 3.0 × 1.6 m');
  });

  it('lässt Seile, Haringe und Platzbedarf weg, wenn es keine gibt', () => {
    const { tabelle, platz } = zeige(Bauwerk.leer());
    expect(tabelle.textContent).not.toContain('Seil');
    expect(tabelle.textContent).not.toContain('Haringe');
    expect(platz.textContent).toBe('');
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/model/Platzbedarf.test.ts src/model/Materialliste.test.ts src/ui/MateriallistePanel.test.ts`
Expected: FAIL mit `Failed to resolve import` für `./Platzbedarf`, `./Materialliste` und `./MateriallistePanel`.

- [ ] **Step 3: Platzbedarf und Materialliste implementieren**

Neue Datei `src/model/Platzbedarf.ts`:

```ts
import type { Bauwerk } from './Bauwerk';

/** Achsparalleles Rechteck am Boden über alle Füße und Haringe (Spec v2a, D4). Bäume zählen nicht. */
export class Platzbedarf {
  private constructor(
    readonly minX: number,
    readonly maxX: number,
    readonly minZ: number,
    readonly maxZ: number,
  ) {}

  static aus(bauwerk: Bauwerk): Platzbedarf | null {
    const punkte = [...bauwerk.fuesse().map((f) => f.position), ...bauwerk.haringe().map((h) => h.position)];
    if (punkte.length === 0) return null;
    const xs = punkte.map((p) => p.x);
    const zs = punkte.map((p) => p.z);
    return new Platzbedarf(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
  }

  /** Längere Seite in m. */
  get laenge(): number {
    return Math.max(this.maxX - this.minX, this.maxZ - this.minZ);
  }

  /** Kürzere Seite in m. */
  get breite(): number {
    return Math.min(this.maxX - this.minX, this.maxZ - this.minZ);
  }
}
```

Neue Datei `src/model/Materialliste.ts`:

```ts
import type { Bauwerk } from './Bauwerk';
import { Platzbedarf } from './Platzbedarf';
import { Stangenliste } from './Stangenliste';

export interface SeilZeile {
  readonly laenge: number;
  readonly anzahl: number;
}

/** Alles, was man zum Aufbauen holen muss: Stangen, Seile, Haringe, dazu der Platzbedarf. */
export class Materialliste {
  private constructor(
    readonly stangen: Stangenliste,
    readonly seile: readonly SeilZeile[],
    readonly anzahlHaringe: number,
    readonly platzbedarf: Platzbedarf | null,
  ) {}

  /** @param zugabeProEnde Seil für den Knoten je Ende in m (SEIL_ZUGABE_PRO_ENDE aus src/rules/constants.ts). */
  static aus(bauwerk: Bauwerk, zugabeProEnde: number): Materialliste {
    const zaehler = new Map<number, number>();
    for (const s of bauwerk.seile) {
      const laenge = Math.ceil(s.laenge + 2 * zugabeProEnde - 1e-6);
      zaehler.set(laenge, (zaehler.get(laenge) ?? 0) + 1);
    }
    const seile = [...zaehler.entries()].map(([laenge, anzahl]) => ({ laenge, anzahl })).sort((a, b) => b.laenge - a.laenge);
    return new Materialliste(Stangenliste.aus(bauwerk), seile, bauwerk.haringe().length, Platzbedarf.aus(bauwerk));
  }
}
```

- [ ] **Step 4: Panel umbauen**

Run: `git mv src/ui/StangenlistePanel.ts src/ui/MateriallistePanel.ts`

`src/ui/MateriallistePanel.ts` vollständig ersetzen durch:

```ts
import type { Materialliste } from '../model/Materialliste';

function zeile(tag: 'th' | 'td', zellen: readonly string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const text of zellen) {
    const zelle = document.createElement(tag);
    zelle.textContent = text;
    tr.append(zelle);
  }
  return tr;
}

/** Zeigt die Materialliste als Tabelle und den Platzbedarf als Zeile darunter. */
export class MateriallistePanel {
  constructor(
    private readonly tabelle: HTMLTableElement,
    private readonly platz: HTMLElement,
  ) {}

  zeige(liste: Materialliste): void {
    const { stangen, seile, anzahlHaringe, platzbedarf } = liste;
    this.tabelle.replaceChildren(
      zeile('th', ['Länge', 'Ø', 'Anzahl']),
      ...stangen.zeilen.map((z) => zeile('td', [`${z.laenge.toFixed(1)} m`, `${z.durchmesserCm} cm`, String(z.anzahl)])),
      zeile('td', ['Bünde', '', String(stangen.anzahlBuende)]),
      ...(seile.length > 0 ? [zeile('th', ['Seil', '', 'Anzahl']), ...seile.map((s) => zeile('td', [`${s.laenge} m`, '', String(s.anzahl)]))] : []),
      ...(anzahlHaringe > 0 ? [zeile('td', ['Haringe', '', String(anzahlHaringe)])] : []),
    );
    this.platz.textContent = platzbedarf ? `Platzbedarf: ${platzbedarf.laenge.toFixed(1)} × ${platzbedarf.breite.toFixed(1)} m` : '';
  }
}
```

- [ ] **Step 5: main.ts, index.html, style.css**

In `src/main.ts`:
1. `import { Stangenliste } from './model/Stangenliste';` ersetzen durch `import { Materialliste } from './model/Materialliste';`
2. `import { StangenlistePanel } from './ui/StangenlistePanel';` ersetzen durch `import { MateriallistePanel } from './ui/MateriallistePanel';`
3. Nach `import { RuleEngine } from './rules/RuleEngine';` ergänzen: `import { SEIL_ZUGABE_PRO_ENDE } from './rules/constants';`
4. `const stangenlistePanel = new StangenlistePanel(element('#stangenliste'));` ersetzen durch:

```ts
const materialPanel = new MateriallistePanel(element('#stangenliste'), element('#platzbedarf'));
```

5. Den Cache-Block ersetzen:

```ts
let geprueft: { bauwerk: Bauwerk; hinweise: readonly Hinweis[]; liste: Materialliste } | null = null;
function pruefung(bauwerk: Bauwerk): { hinweise: readonly Hinweis[]; liste: Materialliste } {
  if (geprueft?.bauwerk !== bauwerk) {
    geprueft = { bauwerk, hinweise: regeln.pruefe(bauwerk), liste: Materialliste.aus(bauwerk, SEIL_ZUGABE_PRO_ENDE) };
  }
  return geprueft;
}
```

6. `stangenlistePanel.zeige(liste);` ersetzen durch `materialPanel.zeige(liste);`.

In `index.html` die Zeilen

```html
      <h2>Stangenliste</h2>
      <table id="stangenliste"></table>
```

ersetzen durch:

```html
      <h2>Materialliste</h2>
      <table id="stangenliste"></table>
      <p id="platzbedarf"></p>
```

In `src/style.css` nach der Regel für `#stangenliste th, #stangenliste td` ergänzen:

```css
#platzbedarf { margin: 6px 0 0; font-size: 0.9rem; }
#platzbedarf:empty { display: none; }
```

- [ ] **Step 6: Tests laufen lassen, sie müssen bestehen**

Run: `npx vitest run src/model src/ui`
Expected: PASS.

- [ ] **Step 7: Volle Prüfung und Commit**

Run: `npm test`
Expected: alle grün, Coverage ≥ 80 %.
Run: `npm run build`
Expected: Exit 0.
Run: `npm run e2e`
Expected: 3 passed.

```bash
git add src/model/Platzbedarf.ts src/model/Platzbedarf.test.ts src/model/Materialliste.ts src/model/Materialliste.test.ts src/ui/MateriallistePanel.ts src/ui/MateriallistePanel.test.ts src/ui/StangenlistePanel.ts src/main.ts index.html src/style.css
git commit -m "feat: show ropes, pegs and space required in the material list"
```

(`src/ui/StangenlistePanel.ts` steht in der Liste, damit die Umbenennung vollständig im Commit landet.)

---

### Task 8: Werkzeuge, Einrasten am Baum, Panel

**Files:**
- Modify: `src/editor/SnapService.ts`, `src/editor/SnapService.test.ts`
- Modify: `src/editor/Werkzeuge.ts`, `src/editor/Editor.test.ts`
- Modify: `src/ui/ParameterPanel.ts`, `src/ui/ParameterPanel.test.ts`
- Modify: `index.html` (Palette), `src/main.ts` (Statuszeile)

**Interfaces:**
- Consumes: `Seil`, `Baum`, `STANDARD_BAUM`, `MIN_SEILLAENGE`, `Bauwerk.mitSeil`, `mitBaum`, `ersetzeBaum`, `baum(id)`, `seil(id)`, `haringe()` (Task 2/3).
- Produces:
  - `Treffer` zusätzlich `{ art: 'baum'; punkt; baumId }` und `{ art: 'seil'; punkt; seilId }`;
  - `SnapArt` zusätzlich `'baum'`;
  - `WerkzeugName` zusätzlich `'seil'` und `'baum'`;
  - die Klassen `DrawSeilTool` und `PlaceBaumTool`.

  Task 9 (Szene) liefert die neuen Treffer-Arten.

- [ ] **Step 1: Failing tests schreiben**

In `src/editor/SnapService.test.ts`:
1. Imports ergänzen: `import { Baum } from '../model/Baum';` und `STANDARD_BAUM` in die Zeile mit `STANDARD_DREIBEIN`.
2. Als letzte Tests im `describe` anhängen:

```ts
  it('rastet am Baumstamm genau am getroffenen Punkt ein', () => {
    const mitBaum = bauwerk.mitBaum(new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM));
    const p = snap.snap({ art: 'baum', punkt: new Vec3(4.85, 1.7, 0), baumId: 'b' }, mitBaum);
    expect(p.art).toBe('baum');
    expect(p.punkt.equals(new Vec3(4.85, 1.7, 0), 1e-9)).toBe(true);
  });

  it('nimmt bei einem unbekannten Baum den Boden darunter', () => {
    const p = snap.snap({ art: 'baum', punkt: new Vec3(4.87, 1.7, 0), baumId: 'weg' }, bauwerk);
    expect(p.art).toBe('boden');
    expect(p.punkt.equals(new Vec3(4.9, 0, 0), 1e-9)).toBe(true);
  });

  it('nimmt bei einem Seiltreffer fern von Einrastpunkten den Boden darunter', () => {
    const p = snap.snap({ art: 'seil', punkt: new Vec3(3, 1, 3), seilId: 's' }, bauwerk);
    expect(p.art).toBe('boden');
    expect(p.punkt.equals(new Vec3(3, 0, 3), 1e-9)).toBe(true);
  });
```

In `src/editor/Editor.test.ts`:
1. Imports ergänzen: `import { Baum } from '../model/Baum';`, `import { Seil } from '../model/Seil';` und `STANDARD_BAUM` in die Zeile `import { STANDARD_DREIBEIN } from '../model/params';`.
2. Als letzte Tests im `describe('Editor', …)` anhängen:

```ts
  it('setzt einen Baum per Bodenklick aufs Raster und wählt ihn aus', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('baum');
    e.klick(boden(3.04, 1.02));
    expect(e.zustand().auswahl).toBe('baum-1');
    expect(e.bauwerk.baum('baum-1')?.position.equals(new Vec3(3, 0, 1), 1e-9)).toBe(true);
  });

  it('spannt ein Seil von der Spitze zum Boden; das Bodenende wird ein Haring', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.waehleWerkzeug('seil');
    e.klick({ art: 'stange', punkt: dreibein.spitze(), stangeId: dreibein.stangen()[0]!.id });
    expect(e.zustand().stangenStart).not.toBeNull();
    e.klick(boden(3, 0));
    const seil = e.bauwerk.seil('seil-1');
    expect(seil?.start.equals(dreibein.spitze(), 1e-9)).toBe(true);
    expect(seil?.ende.equals(new Vec3(3, 0, 0), 1e-9)).toBe(true);
    expect(e.bauwerk.haringe()).toHaveLength(1);
    expect(e.zustand().auswahl).toBe('seil-1');
  });

  it('ignoriert ein Seil mit zweimal demselben Punkt', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('seil');
    e.klick(boden(1, 1));
    e.klick(boden(1, 1));
    expect(e.bauwerk.istLeer).toBe(true);
  });

  it('bricht ein angefangenes Seil mit Esc oder Werkzeugwechsel ab', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('seil');
    e.klick(boden(1, 1));
    e.taste('Escape', false);
    expect(e.zustand().stangenStart).toBeNull();
    e.klick(boden(1, 1));
    e.waehleWerkzeug('auswahl');
    expect(e.zustand().stangenStart).toBeNull();
    expect(e.bauwerk.istLeer).toBe(true);
  });

  it('wählt Seile und Bäume per Klick aus und löscht sie', () => {
    const seil = new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
    const baum = new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM);
    const e = neuerEditor(Bauwerk.leer().mitSeil(seil).mitBaum(baum));
    e.klick({ art: 'seil', punkt: new Vec3(1, 1, 0), seilId: 's' });
    expect(e.zustand().auswahl).toBe('s');
    e.loescheAuswahl();
    e.klick({ art: 'baum', punkt: new Vec3(4.85, 1, 0), baumId: 'b' });
    expect(e.zustand().auswahl).toBe('b');
    e.loescheAuswahl();
    expect(e.bauwerk.istLeer).toBe(true);
  });
```

In `src/ui/ParameterPanel.test.ts`:
1. Imports ergänzen: `import { Bauwerk } from '../model/Bauwerk';`, `import { Baum } from '../model/Baum';`, `import { STANDARD_BAUM } from '../model/params';`, `import { Seil } from '../model/Seil';` und `import { Vec3 } from '../model/Vec3';`.
2. Unter `tippe` ergänzen:

```ts
const panelMit = (bauwerk: Bauwerk, id: string): { wurzel: HTMLElement; editor: Editor } => {
  const wurzel = document.createElement('section');
  const editor = new Editor(bauwerk);
  const panel = new ParameterPanel(wurzel, editor);
  editor.abonniere((z) => panel.zeige(z));
  editor.waehle(id);
  panel.zeige(editor.zustand());
  return { wurzel, editor };
};
```

3. Als letzte Tests im `describe('ParameterPanel', …)` anhängen:

```ts
  it('zeigt beim Baum Stammdurchmesser und Höhe und setzt unsinnige Werte zurück', () => {
    const { wurzel, editor } = panelMit(Bauwerk.leer().mitBaum(new Baum('b', Vec3.NULL, STANDARD_BAUM)), 'b');
    tippe(feld(wurzel, 'Höhe'), '0');
    expect(editor.zustand().meldung).toBe('Baumhöhe muss größer als 0 sein');
    expect(feld(wurzel, 'Höhe').value).toBe('8');
    tippe(feld(wurzel, 'Höhe'), '');
    expect(feld(wurzel, 'Höhe').value).toBe('8');
    tippe(feld(wurzel, 'Höhe'), '12');
    expect(editor.bauwerk.baum('b')?.params.hoehe).toBe(12);
    expect(feld(wurzel, 'Stammdurchmesser').value).toBe('30');
  });

  it('zeigt beim Seil Länge und Winkel ohne Eingabefelder', () => {
    const { wurzel } = panelMit(Bauwerk.leer().mitSeil(new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 0, 0))), 's');
    expect(wurzel.querySelectorAll('input')).toHaveLength(0);
    expect(wurzel.textContent).toContain('Länge 2.83 m · Winkel zum Boden 45°');
    expect(wurzel.textContent).toContain('Löschen');
  });
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/editor src/ui`
Expected: FAIL.
- SnapService: Der Baum-Treffer liefert `art: 'boden'`.
- Editor: `waehleWerkzeug('baum')` setzt keinen Baum, `e.bauwerk.baum('baum-1')` ist `undefined`.
- Panel: kein Feld „Höhe“ (`Feld Höhe fehlt`).

- [ ] **Step 3: SnapService**

In `src/editor/SnapService.ts`:
1. `Treffer` und `SnapArt` ersetzen durch:

```ts
export type Treffer =
  | { readonly art: 'boden'; readonly punkt: Vec3 }
  | { readonly art: 'stange'; readonly punkt: Vec3; readonly stangeId: string }
  | { readonly art: 'baum'; readonly punkt: Vec3; readonly baumId: string }
  | { readonly art: 'seil'; readonly punkt: Vec3; readonly seilId: string };

export type SnapArt = 'spitze' | 'bund' | 'ende' | 'stange' | 'baum' | 'boden';
```

2. In `snap` vor `return { punkt: this.aufRaster(treffer.punkt), art: 'boden' };` ergänzen:

```ts
    // Am Stamm zählt der getroffene Oberflächenpunkt; die Verankerung erkennt ihn als „Baum“.
    if (treffer.art === 'baum' && bauwerk.baum(treffer.baumId)) return { punkt: treffer.punkt, art: 'baum' };
```

- [ ] **Step 4: Werkzeuge**

`src/editor/Werkzeuge.ts` vollständig ersetzen durch:

```ts
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import type { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { FUSS_TOLERANZ, MIN_SEILLAENGE, MIN_STANGENLAENGE, STANDARD_DURCHMESSER, STANGEN_UEBERSTAND } from '../model/konstanten';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN } from '../model/params';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import type { SnapPunkt, SnapService, Treffer } from './SnapService';

export type WerkzeugName = 'dreibein' | 'abock' | 'stange' | 'seil' | 'baum' | 'auswahl';

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
  onKlick(treffer: Treffer, kontext: EditorKontext): void;
  abbrechen(): void;
}

/** Setzt eine Baugruppe mit Standardmaßen auf den angeklickten Bodenpunkt. */
export class PlaceBaugruppeTool implements Werkzeug {
  readonly angefangen: Vec3 | null = null;

  constructor(readonly name: 'dreibein' | 'abock') {}

  onKlick(treffer: Treffer, k: EditorKontext): void {
    if (treffer.art !== 'boden') return;
    const position = k.snap.aufRaster(treffer.punkt);
    const id = k.neueId(this.name);
    const gruppe =
      this.name === 'dreibein' ? new Dreibein(id, position, 0, STANDARD_DREIBEIN) : new ABock(id, position, 0, STANDARD_ABOCK);
    k.aendere(k.bauwerk.mitGruppe(gruppe));
    k.waehle(id);
  }

  abbrechen(): void {}
}

/** Setzt einen Baum mit Startmaßen auf den angeklickten Bodenpunkt. */
export class PlaceBaumTool implements Werkzeug {
  readonly name = 'baum' as const;
  readonly angefangen: Vec3 | null = null;

  onKlick(treffer: Treffer, k: EditorKontext): void {
    if (treffer.art !== 'boden') return;
    const baum = new Baum(k.neueId('baum'), k.snap.aufRaster(treffer.punkt), STANDARD_BAUM);
    k.aendere(k.bauwerk.mitBaum(baum));
    k.waehle(baum.id);
  }

  abbrechen(): void {}
}

/** Zwei Klicks auf Einrastpunkte; liegen sie zu nah beieinander, passiert nichts. Unterklassen erzeugen daraus ein Teil. */
abstract class ZweiPunktWerkzeug implements Werkzeug {
  abstract readonly name: WerkzeugName;
  private start: SnapPunkt | null = null;

  constructor(private readonly mindestabstand: number) {}

  get angefangen(): Vec3 | null {
    return this.start?.punkt ?? null;
  }

  onKlick(treffer: Treffer, k: EditorKontext): void {
    const punkt = k.snap.snap(treffer, k.bauwerk);
    if (this.start === null) {
      this.start = punkt;
      return;
    }
    const start = this.start;
    this.start = null;
    if (start.punkt.distanceTo(punkt.punkt) < this.mindestabstand) return;
    this.erzeuge(start, punkt, k);
  }

  abbrechen(): void {
    this.start = null;
  }

  protected abstract erzeuge(start: SnapPunkt, ende: SnapPunkt, k: EditorKontext): void;
}

/** Zwei Klicks auf Einrastpunkte ergeben eine freie Stange; am Boden ohne Überstand. */
export class DrawStangeTool extends ZweiPunktWerkzeug {
  readonly name = 'stange' as const;

  constructor() {
    super(MIN_STANGENLAENGE);
  }

  protected erzeuge(start: SnapPunkt, ende: SnapPunkt, k: EditorKontext): void {
    const stange = Stange.zwischen(
      k.neueId('stange'),
      start.punkt,
      ende.punkt,
      STANDARD_DURCHMESSER,
      this.ueberstand(start),
      this.ueberstand(ende),
    );
    k.aendere(k.bauwerk.mitStange(stange));
    k.waehle(stange.id);
  }

  private ueberstand(p: SnapPunkt): number {
    return p.punkt.y <= FUSS_TOLERANZ ? 0 : STANGEN_UEBERSTAND;
  }
}

/** Zwei Klicks ergeben ein gerades Seil. Ein Ende am Boden wird automatisch ein Haring (Spec v2a, D1). */
export class DrawSeilTool extends ZweiPunktWerkzeug {
  readonly name = 'seil' as const;

  constructor() {
    super(MIN_SEILLAENGE);
  }

  protected erzeuge(start: SnapPunkt, ende: SnapPunkt, k: EditorKontext): void {
    const seil = new Seil(k.neueId('seil'), start.punkt, ende.punkt);
    k.aendere(k.bauwerk.mitSeil(seil));
    k.waehle(seil.id);
  }
}

/** Klick auf eine Stange wählt sie (bzw. ihre Gruppe), auf ein Seil oder einen Baum wählt diesen, auf den Boden hebt die Auswahl auf. */
export class SelectTool implements Werkzeug {
  readonly name = 'auswahl' as const;
  readonly angefangen: Vec3 | null = null;

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
      case 'boden':
        k.waehle(null);
        break;
    }
  }

  abbrechen(): void {}
}

export function erzeugeWerkzeug(name: WerkzeugName): Werkzeug {
  switch (name) {
    case 'dreibein':
    case 'abock':
      return new PlaceBaugruppeTool(name);
    case 'stange':
      return new DrawStangeTool();
    case 'seil':
      return new DrawSeilTool();
    case 'baum':
      return new PlaceBaumTool();
    case 'auswahl':
      return new SelectTool();
  }
}
```

- [ ] **Step 5: ParameterPanel**

`src/ui/ParameterPanel.ts` vollständig ersetzen durch:

```ts
import type { Editor, EditorZustand } from '../editor/Editor';
import { ABock } from '../model/ABock';
import type { Baum } from '../model/Baum';
import { Dreibein } from '../model/Dreibein';
import type { Seil } from '../model/Seil';
import type { Stange } from '../model/Stange';
import { Neuaufbau } from './Neuaufbau';

interface Feld<P> {
  readonly schluessel: keyof P & string;
  readonly label: string;
  readonly faktor: number; // Anzeige = Modellwert × faktor (Ø in cm, Rest in m)
}

/** Anzeige-Text eines Modellwerts: auf drei Nachkommastellen gerundet, in Anzeige-Einheit. */
const anzeige = (wert: number, faktor: number): string => String(Math.round(wert * faktor * 1000) / 1000);

/** Formular für die ausgewählte Baugruppe, freie Stange, den Baum oder das Seil. Ungültige Werte meldet der Editor. */
export class ParameterPanel {
  private readonly neuaufbau = new Neuaufbau();

  constructor(
    private readonly wurzel: HTMLElement,
    private readonly editor: Editor,
  ) {}

  zeige(z: EditorZustand): void {
    const id = z.auswahl;
    const bauwerk = z.bauwerk;
    const gruppe = id === null ? undefined : bauwerk.gruppe(id);
    const freieStange = id === null || gruppe ? undefined : bauwerk.stange(id);
    const baum = id === null ? undefined : bauwerk.baum(id);
    const seil = id === null ? undefined : bauwerk.seil(id);
    if (!this.neuaufbau.noetig(id, gruppe ?? freieStange ?? baum ?? seil ?? null)) return;
    this.wurzel.replaceChildren();
    if (gruppe instanceof Dreibein) this.dreibeinFormular(gruppe);
    else if (gruppe instanceof ABock) this.aBockFormular(gruppe);
    else if (freieStange) this.stangenFormular(freieStange);
    else if (baum) this.baumFormular(baum);
    else if (seil) this.seilInfo(seil);
  }

  private dreibeinFormular(g: Dreibein): void {
    this.formular(
      'Dreibein',
      [
        { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
        { schluessel: 'fusskreisradius', label: 'Fußkreisradius (m)', faktor: 1 },
        { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
      ],
      g.params,
      (p) => this.editor.aendereMit((b) => b.ersetzeGruppe(g.mitParams(p))),
      `Höhe ${g.hoehe().toFixed(2)} m · Beinwinkel ${g.beinwinkelGrad().toFixed(0)}° · R dreht`,
    );
  }

  private aBockFormular(g: ABock): void {
    this.formular(
      'A-Bock',
      [
        { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
        { schluessel: 'fussabstand', label: 'Fußabstand (m)', faktor: 1 },
        { schluessel: 'riegelhoehe', label: 'Riegelhöhe (m)', faktor: 1 },
        { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
      ],
      g.params,
      (p) => this.editor.aendereMit((b) => b.ersetzeGruppe(g.mitParams(p))),
      `Höhe ${g.hoehe().toFixed(2)} m · Beinwinkel ${g.beinwinkelGrad().toFixed(0)}° · R dreht`,
    );
  }

  private stangenFormular(s: Stange): void {
    this.formular(
      'Stange',
      [{ schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 }],
      { durchmesser: s.durchmesser },
      (p) => this.editor.aendereMit((b) => b.ersetzeStange(s.mitDurchmesser(p.durchmesser))),
      `Länge ${s.laenge.toFixed(2)} m`,
    );
  }

  private baumFormular(baum: Baum): void {
    this.formular(
      'Baum',
      [
        { schluessel: 'durchmesser', label: 'Stammdurchmesser (cm)', faktor: 100 },
        { schluessel: 'hoehe', label: 'Höhe (m)', faktor: 1 },
      ],
      baum.params,
      (p) => this.editor.aendereMit((b) => b.ersetzeBaum(baum.mitParams(p))),
      'Steht auf dem Platz, gehört nicht zum Bau.',
    );
  }

  private seilInfo(s: Seil): void {
    this.formular('Seil', [], {}, () => true, `Länge ${s.laenge.toFixed(2)} m · Winkel zum Boden ${s.winkelZumBodenGrad.toFixed(0)}°`);
  }

  private formular<P extends object>(
    titel: string,
    felder: readonly Feld<P>[],
    werte: P,
    uebernehme: (neu: P) => boolean,
    info: string,
  ): void {
    const kopf = document.createElement('h2');
    kopf.textContent = titel;
    const eingaben = felder.map((feld) => {
      const label = document.createElement('label');
      label.className = 'feld';
      label.textContent = feld.label;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = feld.faktor === 1 ? '0.05' : '1';
      input.value = anzeige(werte[feld.schluessel] as number, feld.faktor);
      input.addEventListener('change', () => {
        const uebernommen = uebernehme({ ...werte, [feld.schluessel]: Number(input.value) / feld.faktor });
        // Abgelehnt: Das Modell ist unverändert, also baut das Panel nicht neu auf. Das Feld zeigt sonst einen Wert, den es nicht gibt.
        if (!uebernommen) input.value = anzeige(werte[feld.schluessel] as number, feld.faktor);
      });
      label.append(input);
      return label;
    });
    const infoZeile = document.createElement('p');
    infoZeile.textContent = info;
    const loeschen = document.createElement('button');
    loeschen.textContent = 'Löschen (Entf)';
    loeschen.addEventListener('click', () => this.editor.loescheAuswahl());
    this.wurzel.append(kopf, ...eingaben, infoZeile, loeschen);
  }
}
```

Ein leeres Feld liefert `Number('') = 0`, also „Baumhöhe muss größer als 0 sein“, und das Feld springt zurück. Das deckt Review Focus 3 ab.

- [ ] **Step 6: Palette und Statuszeile**

In `index.html` nach `<button data-werkzeug="stange">Stange ziehen</button>` ergänzen:

```html
      <button data-werkzeug="seil">Seil spannen</button>
      <button data-werkzeug="baum">Baum setzen</button>
```

In `src/main.ts` die Zeile
`meldung.textContent = z.meldung ?? (z.stangenStart ? 'Stange: zweiten Punkt anklicken (Esc bricht ab)' : '');`
ersetzen durch:

```ts
  const teil = z.werkzeug === 'seil' ? 'Seil' : 'Stange';
  meldung.textContent = z.meldung ?? (z.stangenStart ? `${teil}: zweiten Punkt anklicken (Esc bricht ab)` : '');
```

- [ ] **Step 7: Tests laufen lassen, sie müssen bestehen**

Run: `npx vitest run src/editor src/ui`
Expected: PASS, alle Tests, auch die bestehenden Stangen-Tests im Editor (Refactoring über `ZweiPunktWerkzeug`).

- [ ] **Step 8: Volle Prüfung und Commit**

Run: `npm test`
Expected: alle grün, Coverage ≥ 80 %.
Run: `npm run build`
Expected: Exit 0. `tsc` prüft dabei auch, dass `Szene.treffer` weiter zum erweiterten `Treffer` passt.

```bash
git add src/editor/SnapService.ts src/editor/SnapService.test.ts src/editor/Werkzeuge.ts src/editor/Editor.test.ts src/ui/ParameterPanel.ts src/ui/ParameterPanel.test.ts index.html src/main.ts
git commit -m "feat: add tools to rig ropes and place trees"
```

---

### Task 9: Darstellung in der Szene

**Files:**
- Modify: `src/editor/Szene.ts` (vollständig ersetzen)

**Interfaces:**
- Consumes:
  - `Bauwerk.seile`, `Bauwerk.baeume`, `Bauwerk.haringe()` und `Platzbedarf.aus(bauwerk)` (Task 2, 3, 7);
  - die neuen `Treffer`-Arten (Task 8);
  - `userData.stangeId`, `userData.baumId`, `userData.seilId`.
- Produces: `Szene.zeige(bauwerk, markiert, stangenStart)` zeichnet Seile, Haringe, Bäume und den Rahmen des Platzbedarfs; `Szene.treffer(e)` liefert `'stange' | 'baum' | 'seil' | 'boden'`.

three.js lässt sich nicht unit-testen (WebGL). Dieser Task prüft deshalb über `npm run build`, die E2E-Tests (keine Laufzeitfehler, Task 10) und eine Sichtprüfung.

- [ ] **Step 1: Szene ersetzen**

`src/editor/Szene.ts` vollständig ersetzen durch:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Baum } from '../model/Baum';
import type { Bauwerk } from '../model/Bauwerk';
import { Platzbedarf } from '../model/Platzbedarf';
import type { Seil } from '../model/Seil';
import type { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import type { Treffer } from './SnapService';

const HOLZ = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
const MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f });
const SEIL = new THREE.MeshLambertMaterial({ color: 0xe8d9a0 });
const START = new THREE.MeshLambertMaterial({ color: 0x2f6f3e });
const STAMM = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
const KRONE = new THREE.MeshLambertMaterial({ color: 0x3f7d3a });
const HARING = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
const UNSICHTBAR = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const PLATZ = new THREE.LineDashedMaterial({ color: 0x1d2733, dashSize: 0.2, gapSize: 0.1 });
const Y_ACHSE = new THREE.Vector3(0, 1, 0);
const SEIL_RADIUS = 0.005; // Ø 1 cm, nur optisch
const SEIL_GREIFRADIUS = 0.05; // unsichtbarer Mantel, damit man ein dünnes Seil anklicken kann

/** three.js-Darstellung. Kennt das Modell nur lesend und liefert Klick-Treffer zurück. */
export class Szene {
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly kamera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  private readonly szene = new THREE.Scene();
  private readonly steuerung: OrbitControls;
  private readonly bau = new THREE.Group();
  private readonly boden: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();

  constructor(private readonly container: HTMLElement) {
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
    this.szene.add(new THREE.HemisphereLight(0xffffff, 0x556644, 1.2), sonne, this.boden, new THREE.GridHelper(40, 40, 0x5d8a3f, 0x6b9a4b), this.bau);
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

  zeige(bauwerk: Bauwerk, markiert: ReadonlySet<string>, stangenStart: Vec3 | null): void {
    for (const kind of this.bau.children) (kind as THREE.Mesh).geometry.dispose();
    this.bau.clear();
    for (const s of bauwerk.stangen()) {
      const istMarkiert = markiert.has(s.id) || (s.gruppeId !== null && markiert.has(s.gruppeId));
      this.bau.add(this.stangenMesh(s, istMarkiert));
    }
    for (const b of bauwerk.buende()) this.bau.add(this.kugel(b.position, 0.07, SEIL));
    for (const s of bauwerk.seile) this.bau.add(...this.seilMeshes(s, markiert.has(s.id)));
    for (const h of bauwerk.haringe()) this.bau.add(this.haringMesh(h.position));
    for (const b of bauwerk.baeume) this.bau.add(...this.baumMeshes(b, markiert.has(b.id)));
    const platz = Platzbedarf.aus(bauwerk);
    if (platz) this.bau.add(this.platzRahmen(platz));
    if (stangenStart) this.bau.add(this.kugel(stangenStart, 0.1, START));
  }

  treffer(e: PointerEvent): Treffer | null {
    const rect = this.leinwand.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kamera);
    const ziele = this.bau.children.filter((k) => ['stangeId', 'baumId', 'seilId'].some((schluessel) => typeof k.userData[schluessel] === 'string'));
    const getroffen = this.raycaster.intersectObjects(ziele, false)[0];
    if (getroffen) {
      const punkt = new Vec3(getroffen.point.x, getroffen.point.y, getroffen.point.z);
      const daten = getroffen.object.userData;
      if (typeof daten.stangeId === 'string') return { art: 'stange', punkt, stangeId: daten.stangeId };
      if (typeof daten.baumId === 'string') return { art: 'baum', punkt, baumId: daten.baumId };
      return { art: 'seil', punkt, seilId: daten.seilId as string };
    }
    const aufBoden = this.raycaster.intersectObject(this.boden, false)[0];
    return aufBoden ? { art: 'boden', punkt: new Vec3(aufBoden.point.x, 0, aufBoden.point.z) } : null;
  }

  private zylinder(von: Vec3, bis: Vec3, radius: number, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, von.distanceTo(bis), 12), material);
    const mitte = von.add(bis).scale(0.5);
    const r = bis.sub(von).normalize();
    mesh.position.set(mitte.x, mitte.y, mitte.z);
    mesh.quaternion.setFromUnitVectors(Y_ACHSE, new THREE.Vector3(r.x, r.y, r.z));
    return mesh;
  }

  private stangenMesh(s: Stange, markiert: boolean): THREE.Mesh {
    const mesh = this.zylinder(s.start, s.ende, s.durchmesser / 2, markiert ? MARKIERT : HOLZ);
    mesh.userData.stangeId = s.id;
    return mesh;
  }

  private seilMeshes(s: Seil, markiert: boolean): THREE.Mesh[] {
    const sichtbar = this.zylinder(s.start, s.ende, SEIL_RADIUS, markiert ? MARKIERT : SEIL);
    const greifbar = this.zylinder(s.start, s.ende, SEIL_GREIFRADIUS, UNSICHTBAR);
    greifbar.userData.seilId = s.id;
    return [sichtbar, greifbar];
  }

  private haringMesh(p: Vec3): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 8), HARING);
    mesh.position.set(p.x, 0.075, p.z);
    mesh.rotation.x = Math.PI; // Spitze nach unten, in den Boden
    return mesh;
  }

  private baumMeshes(b: Baum, markiert: boolean): THREE.Mesh[] {
    const { durchmesser, hoehe } = b.params;
    const stamm = new THREE.Mesh(new THREE.CylinderGeometry(durchmesser / 2, durchmesser / 2, hoehe, 12), markiert ? MARKIERT : STAMM);
    stamm.position.set(b.position.x, hoehe / 2, b.position.z);
    stamm.userData.baumId = b.id;
    const krone = new THREE.Mesh(new THREE.SphereGeometry(Math.max(1, hoehe * 0.25), 12, 8), KRONE);
    krone.position.set(b.position.x, hoehe, b.position.z);
    return [stamm, krone];
  }

  private platzRahmen(p: Platzbedarf): THREE.LineLoop {
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

  private kugel(p: Vec3, radius: number, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material);
    mesh.position.set(p.x, p.y, p.z);
    return mesh;
  }

  private passeGroesseAn(): void {
    const { clientWidth: breite, clientHeight: hoehe } = this.container;
    this.renderer.setSize(breite, hoehe, false);
    this.kamera.aspect = breite / Math.max(hoehe, 1);
    this.kamera.updateProjectionMatrix();
  }
}
```

- [ ] **Step 2: Prüfen**

Run: `npm run build`
Expected: Exit 0.
Run: `npm run e2e`
Expected: 3 passed.
Run: `npm run e2e:desktop`
Expected: 5 passed.

- [ ] **Step 3: Sichtprüfung (Controller bzw. Jakob)**

`npm run dev` starten, http://localhost:5173/lagerbau-simulator/ öffnen und prüfen:
1. **„Baum setzen“** und auf den Boden klicken → ein brauner Stamm mit grüner Krone erscheint, das Panel zeigt „Baum“.
2. **„Beispiel laden“**, dann **„Seil spannen“**: zuerst die A-Bock-Spitze anklicken, dann daneben auf den Boden → ein helles Seil, unten ein dunkler Haring. Die Materialliste zeigt Seil und Haring, darunter „Platzbedarf: …“.
3. Dazu erscheint am Boden ein gestricheltes Rechteck um Füße und Haring.
4. **„Auswählen“** und das Seil anklicken → das Seil wird orange, das Panel zeigt Länge und Winkel. Mit Entf löschen.
5. Einen Hinweis anklicken (z. B. R1) → die betroffenen Teile werden orange.

Was nicht stimmt, kommt in den Report. Größere Abweichungen landen im Fix-Loop.

- [ ] **Step 4: Commit**

```bash
git add src/editor/Szene.ts
git commit -m "feat: draw ropes, pegs, trees and the space outline"
```

---

### Task 10: E2E, Version, Doku

**Files:**
- Create: `e2e/abspannung.spec.ts`
- Modify: `package.json` (`"version": "1.1.0"`), `package-lock.json` (Version)
- Modify: `README.md`, `CLAUDE.md`, `docs/ki-lernlog.md`

**Interfaces:**
- Consumes:
  - Link-Format v2 (Task 4);
  - Hinweis-Panel `#hinweise`;
  - Materialliste `#stangenliste` und `#platzbedarf` (Task 7);
  - R1-Text „A-Bock kann seitlich umkippen, er braucht eine Querverbindung.“
- Produces: `npm run e2e` mit 5 Tests; `release/Lagerbau-Simulator-1.1.0.exe`.

- [ ] **Step 1: E2E-Test schreiben**

Neue Datei `e2e/abspannung.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

const SPITZE_Y = Math.sqrt(2.2 ** 2 - 0.8 ** 2); // A-Bock 2,4 m, Überstand 0,2 m, Fußabstand 1,6 m
const aBock = {
  id: 'abock',
  typ: 'abock',
  position: [0, 0, 0],
  drehung: Math.PI / 2,
  params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 },
};
const seil = (id: string, x: number) => ({ id, start: [0, SPITZE_Y, 0], ende: [x, 0, 0] });
const link = (seile: readonly object[]) =>
  `#b=${LZString.compressToEncodedURIComponent(JSON.stringify({ version: 2, gruppen: [aBock], stangen: [], seile, baeume: [] }))}`;

test('beidseitig abgespannter A-Bock braucht keine Querverbindung', async ({ page }) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto(`./?t=beidseitig${link([seil('l', -1.5), seil('r', 1.5)])}`);
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(page.locator('#stangenliste td').filter({ hasText: /^4 m$/ })).toHaveCount(1);
  await expect(page.locator('#stangenliste tr').filter({ hasText: 'Haringe' })).toContainText('2');
  await expect(page.locator('#platzbedarf')).toHaveText('Platzbedarf: 3.0 × 1.6 m');
  expect(fehler).toEqual([]);
});

test('einseitig abgespannter A-Bock meldet R1', async ({ page }) => {
  await page.goto(`./?t=einseitig${link([seil('r', 1.5)])}`);
  await expect(page.locator('#hinweise')).toContainText('A-Bock kann seitlich umkippen');
});
```

- [ ] **Step 2: E2E laufen lassen**

Run: `npm run e2e`
Expected: 5 passed. Der Test ist kein RED-Schritt: Die Funktion kommt aus Task 2–9. Scheitert er hier, ist das ein echter Fehler in einem früheren Task, also BLOCKED mit der Ausgabe melden.

- [ ] **Step 3: Version 1.1.0**

Run: `npm version 1.1.0 --no-git-tag-version`
Expected: `package.json` und `package-lock.json` zeigen `1.1.0`, kein Commit, kein Tag.
Run: `npm run e2e:desktop`
Expected: 5 passed. Es entsteht `release/Lagerbau-Simulator-1.1.0.exe`.

- [ ] **Step 4: Doku**

In `README.md`:
1. Die zweite Zeile `3D-Planer für Pfadfinder-Lagerbauten (Dreibein, A-Bock, freie Stangen) mit Faustregel-Hinweisen.` ersetzen durch:
   `3D-Planer für Pfadfinder-Lagerbauten (Dreibein, A-Bock, freie Stangen, Abspannungen, Bäume) mit Faustregel-Hinweisen, Materialliste und Platzbedarf.`
2. Im Abschnitt „## Windows-Programm“ als letzte Zeile ergänzen:
   `Links und Dateien aus Version 1.1 (mit Seilen und Bäumen) öffnet nur die neue .exe ab 1.1.0; ältere zeigen „Ungültige Bauwerk-Daten“.`

In `CLAUDE.md` unter „## Stack & Struktur“ die Zeilen für `src/model/` und `src/rules/` ersetzen durch:

```markdown
- `src/model/` — Domain (immutable), kein three.js: Stange, Bund, Fuss, Baugruppen, Seil, Baum, Verankerung/Haring (aus der Geometrie abgeleitet), Materialliste, Platzbedarf
- `src/rules/` — `Rule`-Klassen R1–R8 + `RuleEngine`, kein three.js (R6–R8: Seile; Spec v2a)
```

Unter „## Known Issues & Failed Attempts“ jede Sackgasse aus Task 2–10 eintragen, im Format *What failed / Why / Fix / avoid*.

In `docs/ki-lernlog.md` unter „## Einträge“ jeden Fehler der KI eintragen, den Tests, Reviews oder die Sichtprüfung in diesem Plan gefunden haben (im Format der Datei). Der Controller nennt sie in der Dispatch-Nachricht.

- [ ] **Step 5: Volle Abschluss-Prüfung**

```bash
npm test            # Expected: alle grün, Coverage model/ + rules/ ≥ 80 %
npm run build       # Expected: Exit 0
npm run e2e         # Expected: 5 passed
npm run e2e:desktop # Expected: 5 passed
grep -rE "from 'three'|document\.|window\." src/model src/rules   # Expected: keine Ausgabe
grep -n "CHECK MANUALLY" src/rules/constants.ts                   # Expected: 10 Zeilen (R1–R5 + R6 ×2, R7, Seilzugabe)
git status --short  # Expected: nur die geänderten Doku-Dateien, nichts aus release/ oder dist-desktop/
```

- [ ] **Step 6: Commits**

```bash
git add e2e/abspannung.spec.ts
git commit -m "test: add browser test for a guyed A-Bock"
git add package.json package-lock.json README.md CLAUDE.md docs/ki-lernlog.md
git commit -m "docs: document guy lines and bump version to 1.1.0"
```

- [ ] **Step 7: Manuelle Prüfung (Jakob)**

1. Einen A-Bock nur mit Seilen auf beiden Seiten sichern: R1 verschwindet. Mit einem Seil weniger kommt er zurück.
2. Ein tiefes Firstseil zwischen zwei Dreibeinen spannen → R7.
3. Die Materialliste nennt Seillängen und die Anzahl Haringe.
4. Das Rechteck für den Platzbedarf passt zum gemessenen Platz.
5. Die `release/Lagerbau-Simulator-1.1.0.exe` lädt einen gespeicherten v2-Bau über „Laden“.
6. **Gemeinheitsbau** (Spec D6), mit dem Versuch, die Regeln auszutricksen. Jeder Treffer kommt in `docs/ki-lernlog.md`:
   - ein Seil, das knapp neben dem A-Bock endet;
   - zwei Seile auf derselben Seite;
   - ein Seil, das quer über einen anderen Bau läuft;
   - ein Querseil knapp über `R7_MIN_HOEHE`.

---

## Abschluss

- Abschluss-Review über den ganzen Branch (`feat/desktop..feat/abspannungen`, bzw. nach dem Merge von PR #2 `main..feat/abspannungen`).
- `finishing-a-development-branch`: Push und PR gegen `main`, wenn PR #2 gemergt ist.
- Jakob bestätigt `R6_MIN/MAX_WINKEL_GRAD`, `R7_MIN_HOEHE` und `SEIL_ZUGABE_PRO_ENDE` zusammen mit R1–R5.
