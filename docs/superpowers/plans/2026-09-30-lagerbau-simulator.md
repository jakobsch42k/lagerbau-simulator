# Lagerbau-Simulator v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein statischer Browser-3D-Planer, in dem Leiter einen Lagerbau aus Dreibein, A-Bock und freien Stangen zusammenklicken, ihn per Link teilen und Faustregel-Hinweise (R1–R5) sehen.

**Architecture:** Das Domänenmodell (`src/model/`) und die Regeln (`src/rules/`) sind reine, unveränderliche TypeScript-Klassen ohne three.js und ohne DOM und damit vollständig unit-testbar. Bünde werden nicht gespeichert, sondern aus der Geometrie abgeleitet: Wo sich zwei Stangenachsen berühren, ist ein Bund. Ein Editor-Controller (`src/editor/Editor.ts`) hält einen Undo-Verlauf von `Bauwerk`-Zuständen. Die three.js-Szene und die DOM-Panels zeigen nur an.

**Tech Stack:** TypeScript (strict), Vite, three.js, lz-string, Vitest (+ @vitest/coverage-v8), Playwright, GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-30-lagerbau-simulator-design.md`

## Global Constraints

- UI-Texte auf Deutsch. Domänen-Bezeichner auf Deutsch (`Stange`, `Bund`, `Fuss`, `Bauwerk`, `Dreibein`, `ABock`).
- Einheiten: Meter. Koordinaten: y zeigt nach oben, der Boden ist y = 0.
- **Keine Statik-Rechnung.** Kein Text im Tool behauptet, dass ein Bau „hält“. Die Fußzeile *„Planungshilfe. Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.“* ist immer sichtbar, auch im Ansichtsmodus.
- `src/model/` und `src/rules/` importieren weder `three` noch DOM-APIs.
- Die Schwellwerte der Regeln stehen nur in `src/rules/constants.ts`, jeder mit `// CHECK MANUALLY`. Jakob bestätigt sie bis 11.10.2026.
- Unveränderliche Domänenobjekte: Methoden geben neue Objekte zurück und verändern nie `this`.
- Abdeckung ≥ 80 % (lines/functions/branches/statements) für `src/model/**` und `src/rules/**`.
- Bauen am Laptop mit Maus. Bildschirme unter 768 px Breite und geteilte Links öffnen den Ansichtsmodus (nur Drehen, Hinweise, Stangenliste).
- Kein Backend, keine Konten. Vite `base: '/lagerbau-simulator/'` für GitHub Pages.
- Commits im Format `<type>: <beschreibung>` (feat, fix, test, chore, docs, ci). Immer einzelne Dateien stagen, nie `git add -A`.
- Standardmaße: Überstand 0,20 m, Ø 0,08 m, Dreibein 2,4 m / Fußkreis 0,7 m, A-Bock 2,4 m / Fußabstand 1,6 m / Riegel 0,4 m.

## Abweichungen von der Spec (bewusst)

- Statt `DreibeinFactory`/`ABockFactory` gibt es die Klassen `Dreibein` und `ABock extends Baugruppe` (Polymorphie): Jede Baugruppe erzeugt ihre Stangen selbst.
- Bünde werden aus der Geometrie abgeleitet (`BundFinder`), nicht gespeichert. Damit ist „Bund entsteht automatisch“ gratis erfüllt, und ein Bund verschwindet, wenn eine Stange nicht mehr berührt.
- Playwright-Test 10 löscht den First nicht per Canvas-Klick (Pixel-Treffer sind fragil), sondern lädt die Kochstelle ohne First über einen geteilten Link.
- R2 wird als Heuristik umgesetzt (4er-Zyklus, eben, ohne Diagonale, gegenüberliegende Seiten nicht anderweitig verbunden). Sie ist kein vollständiger Steifigkeitsnachweis. Genau hier soll der „Gemeinheitsbau“ in M2 ansetzen.

## Review Focus

1. **Unsinnige Parameter** (Fußkreis ≥ Stangenlänge, Riegel über der Spitze, 0 oder negativ): Es erscheint eine deutsche Meldung, das Bauwerk bleibt unverändert, nichts stürzt ab → Test in Task 7.
2. **Kaputter oder fremder Link bzw. fremde JSON-Datei:** Es erscheint eine Meldung „Link ist beschädigt“ oder „Ungültige Bauwerk-Daten“, die App startet leer → Tests in Task 5.
3. **Zweimal derselbe Punkt oder eine zu kurze Stange beim Stange-Ziehen:** Das wird ignoriert, es gibt keine Exception → Test in Task 7.
4. **Undo nimmt die gerade ausgewählte Gruppe weg:** Die Auswahl wird `null`, das Parameter-Panel ist leer → Test in Task 7.
5. **Zwei getrennte Bauten nebeneinander:** R3 wird je zusammenhängendem Bau bewertet, nicht über die gemeinsame Hülle aller Füße → Test in Task 14.

## Dateistruktur

```
index.html                     Layout (Kopf, Palette, 3D, Hinweise, Fußzeile)
vite.config.ts                 base + Vitest + Coverage-Schwellen
playwright.config.ts           Smoke-Test gegen vite preview
.github/workflows/deploy.yml   Test → Build → GitHub Pages
src/main.ts                    Verdrahtung (einzige Stelle, die alles kennt)
src/style.css                  Layout, Ansichtsmodus
src/model/Vec3.ts              unveränderlicher 3D-Vektor
src/model/konstanten.ts        Modell-Konstanten (Überstand, Toleranzen)
src/model/params.ts            DreibeinParams, ABockParams, Standardwerte
src/model/geometrie.ts         naechstePunkte (Segment–Segment), clamp
src/model/Stange.ts            Stange (Segment + Ø + Rolle + Gruppe)
src/model/Fuss.ts              Fuss (Stangenende am Boden)
src/model/Bund.ts              Bund + BundFinder
src/model/Baugruppe.ts         abstrakte Baugruppe
src/model/Dreibein.ts          Dreibein
src/model/ABock.ts             A-Bock mit Riegel
src/model/Bauwerk.ts           Aggregat: Gruppen + freie Stangen
src/model/Stangenliste.ts      Materialliste (M2)
src/beispiele/kochstelle.ts    Referenzbau
src/share/BauwerkSerializer.ts JSON ↔ Bauwerk mit Validierung
src/share/UrlCodec.ts          Bauwerk ↔ URL-Hash (lz-string)
src/editor/konstanten.ts       Snap-Radius, Raster, Drehschritt, Klicktoleranz
src/editor/Verlauf.ts          Undo/Redo-Verlauf
src/editor/SnapService.ts      Einrasten (rein, ohne three.js)
src/editor/Werkzeuge.ts        Werkzeug-Interface, Place/DrawStange/Select
src/editor/Editor.ts           Controller (Zustand, Tasten, Beobachter)
src/editor/Szene.ts            three.js-Darstellung + Raycast
src/ui/ParameterPanel.ts       Formular der Auswahl
src/ui/Teilen.ts               Link kopieren, JSON speichern/laden
src/ui/AnsichtsModus.ts        Editor- vs. Ansichtsmodus
src/ui/HinweisPanel.ts         Hinweisliste (M2)
src/ui/StangenlistePanel.ts    Stangenliste (M2)
src/rules/Rule.ts              Rule-Interface, Hinweis, hinweis()
src/rules/Analyse.ts           vorberechnete Bünde/Füße/Komponenten
src/rules/constants.ts         Schwellwerte (CHECK MANUALLY)
src/rules/geometrie2d.ts       konvexe Hülle, minimale Breite
src/rules/KnotenGraph.ts       Knoten aus Bünden + Füßen (für R2)
src/rules/ABockQuerRule.ts     R1
src/rules/ViereckRule.ts       R2
src/rules/StandflaecheRule.ts  R3
src/rules/SpreizungRule.ts     R4
src/rules/LoseStangeRule.ts    R5
src/rules/RuleEngine.ts        führt Regeln aus
src/rules/standardRegeln.ts    R1–R5 mit Standard-Schwellwerten
e2e/smoke.spec.ts              Playwright-Test 10
```
Tests liegen jeweils als `*.test.ts` neben der Datei.

---

# Meilenstein 1 (bis 16.10.2026)

### Task 1: Projektgerüst + Vec3

**Files:**
- Create: `package.json` (via `npm init`), `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `src/model/Vec3.ts`
- Test: `src/model/Vec3.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `class Vec3 { x; y; z; add(o); sub(o); scale(f); dot(o); cross(o); length(); normalize(); distanceTo(o); equals(o, eps?); toArray(): [number, number, number]; static fromArray(a); static NULL; static OBEN }`; npm-Skripte `dev`, `build`, `preview`, `test`, `test:watch`, `e2e`.

- [ ] **Step 1: npm-Projekt anlegen und Abhängigkeiten installieren**

Im Repo-Wurzelordner `C:\Users\Jakob\Lagerbau-Simulator` (Bash):

```bash
npm init -y
npm pkg set name=lagerbau-simulator type=module
npm pkg set private=true --json
npm pkg set scripts.dev="vite" scripts.build="tsc --noEmit && vite build" scripts.preview="vite preview" scripts.test="vitest run --coverage" scripts.test:watch="vitest" scripts.e2e="playwright test"
npm pkg delete main
npm install three lz-string
npm install -D typescript vite vitest @vitest/coverage-v8 @types/three @playwright/test
```

Erwartet: `package.json` enthält die Skripte und die Abhängigkeiten, `node_modules/` existiert (steht schon in `.gitignore`).

- [ ] **Step 2: `tsconfig.json` schreiben**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

Hinweis: **Nicht** `erasableSyntaxOnly` setzen (neuere Vite-Vorlagen tun das). Das Flag verbietet Parameter-Properties (`constructor(readonly x: number)`), und der ganze Plan nutzt sie.

- [ ] **Step 3: `vite.config.ts` schreiben**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/lagerbau-simulator/',
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/model/**', 'src/rules/**'],
      exclude: ['**/*.test.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
```

- [ ] **Step 4: Minimal-Seite anlegen, damit `vite build` etwas zu bauen hat**

`index.html`:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lagerbau-Simulator</title>
  </head>
  <body>
    <main id="ansicht"></main>
    <footer>Planungshilfe. Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.</footer>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:

```ts
import './style.css';
```

`src/style.css`:

```css
body { margin: 0; font-family: system-ui, sans-serif; }
```

- [ ] **Step 5: Failing test für Vec3 schreiben**

`src/model/Vec3.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Vec3 } from './Vec3';

describe('Vec3', () => {
  it('addiert, subtrahiert und skaliert ohne sich selbst zu ändern', () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(4, 5, 6);
    expect(a.add(b).toArray()).toEqual([5, 7, 9]);
    expect(b.sub(a).toArray()).toEqual([3, 3, 3]);
    expect(a.scale(2).toArray()).toEqual([2, 4, 6]);
    expect(a.toArray()).toEqual([1, 2, 3]);
  });

  it('berechnet Skalar- und Kreuzprodukt', () => {
    const x = new Vec3(1, 0, 0);
    const y = new Vec3(0, 1, 0);
    expect(x.dot(y)).toBe(0);
    expect(x.cross(y).toArray()).toEqual([0, 0, 1]);
  });

  it('normiert und misst Abstände', () => {
    expect(new Vec3(3, 4, 0).length()).toBe(5);
    expect(new Vec3(0, 0, 2).normalize().toArray()).toEqual([0, 0, 1]);
    expect(new Vec3(1, 1, 1).distanceTo(new Vec3(1, 1, 3))).toBe(2);
  });

  it('wirft beim Normieren des Nullvektors', () => {
    expect(() => Vec3.NULL.normalize()).toThrow(RangeError);
  });

  it('vergleicht mit Toleranz und baut aus Arrays', () => {
    expect(new Vec3(1, 2, 3).equals(new Vec3(1, 2, 3 + 1e-12))).toBe(true);
    expect(Vec3.fromArray([7, 8, 9]).toArray()).toEqual([7, 8, 9]);
    expect(Vec3.OBEN.toArray()).toEqual([0, 1, 0]);
  });
});
```

- [ ] **Step 6: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/model/Vec3.test.ts`
Expected: FAIL, „Failed to resolve import "./Vec3"“.

- [ ] **Step 7: Vec3 implementieren**

`src/model/Vec3.ts`:

```ts
/** Unveränderlicher 3D-Vektor in Metern. y zeigt nach oben. */
export class Vec3 {
  static readonly NULL = new Vec3(0, 0, 0);
  static readonly OBEN = new Vec3(0, 1, 0);

  constructor(
    readonly x: number,
    readonly y: number,
    readonly z: number,
  ) {}

  static fromArray(a: readonly number[]): Vec3 {
    return new Vec3(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
  }

  add(o: Vec3): Vec3 {
    return new Vec3(this.x + o.x, this.y + o.y, this.z + o.z);
  }

  sub(o: Vec3): Vec3 {
    return new Vec3(this.x - o.x, this.y - o.y, this.z - o.z);
  }

  scale(f: number): Vec3 {
    return new Vec3(this.x * f, this.y * f, this.z * f);
  }

  dot(o: Vec3): number {
    return this.x * o.x + this.y * o.y + this.z * o.z;
  }

  cross(o: Vec3): Vec3 {
    return new Vec3(
      this.y * o.z - this.z * o.y,
      this.z * o.x - this.x * o.z,
      this.x * o.y - this.y * o.x,
    );
  }

  length(): number {
    return Math.sqrt(this.dot(this));
  }

  normalize(): Vec3 {
    const l = this.length();
    if (l === 0) throw new RangeError('Nullvektor kann nicht normiert werden');
    return this.scale(1 / l);
  }

  distanceTo(o: Vec3): number {
    return this.sub(o).length();
  }

  equals(o: Vec3, eps = 1e-9): boolean {
    return this.distanceTo(o) <= eps;
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }
}
```

- [ ] **Step 8: Tests und Build laufen lassen**

Run: `npx vitest run src/model/Vec3.test.ts` → Expected: PASS (5 Tests).
Run: `npm run build` → Expected: exit 0, `dist/index.html` existiert.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts src/style.css src/model/Vec3.ts src/model/Vec3.test.ts
git commit -m "chore: scaffold Vite + TypeScript + Vitest with Vec3"
```

### Task 2: Stange, Geometrie, Fuß, Konstanten

**Files:**
- Create: `src/model/konstanten.ts`, `src/model/params.ts`, `src/model/geometrie.ts`, `src/model/Stange.ts`, `src/model/Fuss.ts`
- Test: `src/model/geometrie.test.ts`, `src/model/Stange.test.ts`

**Interfaces:**
- Consumes: `Vec3` (Task 1)
- Produces:
  - `konstanten.ts`: `STANGEN_UEBERSTAND = 0.2`, `MIN_STANGENLAENGE = 0.3`, `STANDARD_DURCHMESSER = 0.08`, `FUSS_TOLERANZ = 0.05`, `BUND_TOLERANZ = 0.05`, `BUND_CLUSTER_RADIUS = 0.15`
  - `params.ts`: `interface DreibeinParams { stangenlaenge; fusskreisradius; durchmesser }`, `interface ABockParams { stangenlaenge; fussabstand; riegelhoehe; durchmesser }`, `STANDARD_DREIBEIN`, `STANDARD_ABOCK`
  - `geometrie.ts`: `clamp(x, min, max): number`, `naechstePunkte(p1, q1, p2, q2): { a: Vec3; b: Vec3; abstand: number }`
  - `Stange.ts`: `type StangenRolle = 'bein' | 'riegel' | 'frei'`; `class Stange { id; start; ende; durchmesser; rolle; gruppeId: string | null; static zwischen(id, a, b, durchmesser, ueberstandStart?, ueberstandEnde?); get laenge; get richtung; naechsterPunkt(p); mitDurchmesser(d); endpunkte() }`
  - `Fuss.ts`: `class Fuss { stangeId; position; static von(stange): Fuss[] }`

- [ ] **Step 1: Konstanten und Parameter anlegen (keine Logik, kein eigener Test)**

`src/model/konstanten.ts`:

```ts
/** Modell-Konstanten in Metern. Regel-Schwellwerte stehen in src/rules/constants.ts. */
export const STANGEN_UEBERSTAND = 0.2; // so weit ragt eine Stange über ihren Bund hinaus
export const MIN_STANGENLAENGE = 0.3;
export const STANDARD_DURCHMESSER = 0.08;
export const FUSS_TOLERANZ = 0.05; // Stangenende bis zu dieser Höhe gilt als Fuß am Boden
export const BUND_TOLERANZ = 0.05; // Achsabstand, ab dem zwei Stangen als gebunden gelten
export const BUND_CLUSTER_RADIUS = 0.15; // Kontakte näher als das bilden einen Bund
```

`src/model/params.ts`:

```ts
export interface DreibeinParams {
  readonly stangenlaenge: number;
  readonly fusskreisradius: number;
  readonly durchmesser: number;
}

export interface ABockParams {
  readonly stangenlaenge: number;
  readonly fussabstand: number;
  readonly riegelhoehe: number;
  readonly durchmesser: number;
}

export const STANDARD_DREIBEIN: DreibeinParams = { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 };
export const STANDARD_ABOCK: ABockParams = { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 };
```

- [ ] **Step 2: Failing tests schreiben**

`src/model/geometrie.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clamp, naechstePunkte } from './geometrie';
import { Vec3 } from './Vec3';

describe('clamp', () => {
  it('begrenzt auf das Intervall', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(3, 0, 1)).toBe(1);
  });
});

describe('naechstePunkte', () => {
  it('findet den Schnittpunkt sich kreuzender Strecken', () => {
    const r = naechstePunkte(new Vec3(-1, 0, 0), new Vec3(1, 0, 0), new Vec3(0, -1, 0), new Vec3(0, 1, 0));
    expect(r.abstand).toBeCloseTo(0, 12);
    expect(r.a.equals(Vec3.NULL)).toBe(true);
  });

  it('misst windschiefe Strecken', () => {
    const r = naechstePunkte(new Vec3(-1, 0, 0), new Vec3(1, 0, 0), new Vec3(0, 1, -1), new Vec3(0, 1, 1));
    expect(r.abstand).toBeCloseTo(1, 12);
    expect(r.a.equals(new Vec3(0, 0, 0))).toBe(true);
    expect(r.b.equals(new Vec3(0, 1, 0))).toBe(true);
  });

  it('misst parallele Strecken', () => {
    const r = naechstePunkte(new Vec3(0, 0, 0), new Vec3(2, 0, 0), new Vec3(0, 0.1, 0), new Vec3(2, 0.1, 0));
    expect(r.abstand).toBeCloseTo(0.1, 12);
  });

  it('klemmt auf die Streckenenden', () => {
    const r = naechstePunkte(new Vec3(0, 0, 0), new Vec3(1, 0, 0), new Vec3(2, 1, 0), new Vec3(3, 1, 0));
    expect(r.a.equals(new Vec3(1, 0, 0))).toBe(true);
    expect(r.b.equals(new Vec3(2, 1, 0))).toBe(true);
    expect(r.abstand).toBeCloseTo(Math.SQRT2, 12);
  });

  it('klemmt t nach oben, wenn die zweite Strecke vor der ersten endet', () => {
    const r = naechstePunkte(new Vec3(0, 0, 0), new Vec3(1, 0, 0), new Vec3(-3, 1, 0), new Vec3(-2, 1, 0));
    expect(r.a.equals(new Vec3(0, 0, 0))).toBe(true);
    expect(r.b.equals(new Vec3(-2, 1, 0))).toBe(true);
  });
});
```

`src/model/Stange.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Fuss } from './Fuss';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

describe('Stange', () => {
  const s = new Stange('s', new Vec3(0, 0, 0), new Vec3(0, 2, 0), 0.08);

  it('kennt Länge, Richtung und Standardwerte', () => {
    expect(s.laenge).toBe(2);
    expect(s.richtung.toArray()).toEqual([0, 1, 0]);
    expect(s.rolle).toBe('frei');
    expect(s.gruppeId).toBeNull();
    expect(s.endpunkte()).toEqual([s.start, s.ende]);
  });

  it('projiziert Punkte auf die Achse und klemmt an den Enden', () => {
    expect(s.naechsterPunkt(new Vec3(1, 1, 0)).toArray()).toEqual([0, 1, 0]);
    expect(s.naechsterPunkt(new Vec3(0, 5, 0)).toArray()).toEqual([0, 2, 0]);
  });

  it('lehnt zu kurze Stangen und nicht-positive Durchmesser ab', () => {
    expect(() => new Stange('k', Vec3.NULL, new Vec3(0, 0.1, 0), 0.08)).toThrow(RangeError);
    expect(() => new Stange('d', Vec3.NULL, new Vec3(0, 1, 0), 0)).toThrow(RangeError);
    expect(() => new Stange('n', Vec3.NULL, new Vec3(0, 1, 0), Number.NaN)).toThrow(RangeError);
  });

  it('baut eine Stange zwischen zwei Punkten mit Überstand an beiden Enden', () => {
    const z = Stange.zwischen('z', new Vec3(0, 1, 0), new Vec3(2, 1, 0), 0.08);
    expect(z.start.equals(new Vec3(-0.2, 1, 0))).toBe(true);
    expect(z.ende.equals(new Vec3(2.2, 1, 0))).toBe(true);
  });

  it('lässt den Überstand an einem Bodenende weg', () => {
    const z = Stange.zwischen('z', new Vec3(0, 0, 0), new Vec3(0, 2, 0), 0.08, 0, 0.2);
    expect(z.start.equals(Vec3.NULL)).toBe(true);
    expect(z.ende.equals(new Vec3(0, 2.2, 0))).toBe(true);
  });

  it('lehnt zu nahe Punkte ab', () => {
    expect(() => Stange.zwischen('z', Vec3.NULL, new Vec3(0.1, 0, 0), 0.08)).toThrow(RangeError);
  });

  it('ändert den Durchmesser ohne sich selbst zu ändern', () => {
    expect(s.mitDurchmesser(0.1).durchmesser).toBe(0.1);
    expect(s.durchmesser).toBe(0.08);
  });
});

describe('Fuss', () => {
  it('erkennt Stangenenden am Boden', () => {
    expect(Fuss.von(new Stange('a', Vec3.NULL, new Vec3(0, 2, 0), 0.08))).toHaveLength(1);
    expect(Fuss.von(new Stange('b', Vec3.NULL, new Vec3(2, 0, 0), 0.08))).toHaveLength(2);
    expect(Fuss.von(new Stange('c', new Vec3(0, 1, 0), new Vec3(0, 2, 0), 0.08))).toHaveLength(0);
  });

  it('merkt sich die Stange und die Position', () => {
    const [f] = Fuss.von(new Stange('a', new Vec3(1, 0.04, 0), new Vec3(1, 2, 0), 0.08));
    expect(f?.stangeId).toBe('a');
    expect(f?.position.equals(new Vec3(1, 0.04, 0))).toBe(true);
  });
});
```

- [ ] **Step 3: Tests laufen lassen, sie müssen fehlschlagen**

Run: `npx vitest run src/model/geometrie.test.ts src/model/Stange.test.ts`
Expected: FAIL, Importe `./geometrie`, `./Stange`, `./Fuss` fehlen.

- [ ] **Step 4: Implementieren**

`src/model/geometrie.ts`:

```ts
import type { Vec3 } from './Vec3';

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

export interface NaechstePunkte {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly abstand: number;
}

/**
 * Nächste Punkte der Strecken p1–q1 und p2–q2 (Ericson, Real-Time Collision Detection, 5.1.9).
 * Beide Strecken haben Länge > 0; Stange garantiert das.
 */
export function naechstePunkte(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): NaechstePunkte {
  const d1 = q1.sub(p1);
  const d2 = q2.sub(p2);
  const r = p1.sub(p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  const c = d1.dot(r);
  const b = d1.dot(d2);
  const nenner = a * e - b * b;
  let s = nenner > 1e-12 ? clamp((b * f - c * e) / nenner, 0, 1) : 0;
  let t = (b * s + f) / e;
  if (t < 0) {
    t = 0;
    s = clamp(-c / a, 0, 1);
  } else if (t > 1) {
    t = 1;
    s = clamp((b - c) / a, 0, 1);
  }
  const pa = p1.add(d1.scale(s));
  const pb = p2.add(d2.scale(t));
  return { a: pa, b: pb, abstand: pa.distanceTo(pb) };
}
```

`src/model/Stange.ts`:

```ts
import { clamp } from './geometrie';
import { MIN_STANGENLAENGE, STANGEN_UEBERSTAND } from './konstanten';
import type { Vec3 } from './Vec3';

export type StangenRolle = 'bein' | 'riegel' | 'frei';

/** Eine Rundholzstange als Strecke start–ende mit Durchmesser. */
export class Stange {
  constructor(
    readonly id: string,
    readonly start: Vec3,
    readonly ende: Vec3,
    readonly durchmesser: number,
    readonly rolle: StangenRolle = 'frei',
    readonly gruppeId: string | null = null,
  ) {
    if (start.distanceTo(ende) < MIN_STANGENLAENGE) {
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
    if (a.distanceTo(b) < MIN_STANGENLAENGE) {
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
}
```

`src/model/Fuss.ts`:

```ts
import { FUSS_TOLERANZ } from './konstanten';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

/** Ein Stangenende, das auf dem Boden steht. */
export class Fuss {
  constructor(
    readonly stangeId: string,
    readonly position: Vec3,
  ) {}

  static von(stange: Stange): Fuss[] {
    return stange
      .endpunkte()
      .filter((p) => p.y <= FUSS_TOLERANZ)
      .map((p) => new Fuss(stange.id, p));
  }
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/model`
Expected: PASS (alle Tests in `Vec3`, `geometrie`, `Stange`).

- [ ] **Step 6: Commit**

```bash
git add src/model/konstanten.ts src/model/params.ts src/model/geometrie.ts src/model/geometrie.test.ts src/model/Stange.ts src/model/Stange.test.ts src/model/Fuss.ts
git commit -m "feat: add Stange, Fuss and segment geometry"
```

### Task 3: Baugruppen Dreibein und A-Bock (Test 8)

**Files:**
- Create: `src/model/Baugruppe.ts`, `src/model/Dreibein.ts`, `src/model/ABock.ts`
- Test: `src/model/Baugruppe.test.ts`

**Interfaces:**
- Consumes: `Vec3`, `Stange`, `STANGEN_UEBERSTAND`, `DreibeinParams`, `ABockParams`, `STANDARD_DREIBEIN`, `STANDARD_ABOCK`
- Produces:
  - `type BaugruppenTyp = 'dreibein' | 'abock'`
  - `abstract class Baugruppe { abstract typ; id; position; drehung; abstract stangen(): readonly Stange[]; abstract spitze(): Vec3; abstract hoehe(): number; abstract beinwinkelGrad(): number; abstract gedreht(delta): Baugruppe; abstract verschoben(position): Baugruppe; protected static pruefePositiv(wert, name) }`
  - `class Dreibein extends Baugruppe { typ: 'dreibein'; params: DreibeinParams; fuesse(): readonly Vec3[]; mitParams(p): Dreibein }`. Stangen-IDs `${id}-bein-0..2`.
  - `class ABock extends Baugruppe { typ: 'abock'; params: ABockParams; achse(): Vec3; ebenenNormale(): Vec3; fuesse(): readonly [Vec3, Vec3]; mitParams(p): ABock }`. Stangen-IDs `${id}-bein-0`, `${id}-bein-1`, `${id}-riegel`.
  - Geometrie: Die Bundstelle an der Spitze liegt `STANGEN_UEBERSTAND` unter dem Stangenende, also gilt Höhe = √((L − Ü)² − r²). Beim Dreibein ist r der Fußkreisradius, beim A-Bock der halbe Fußabstand. Die Füße liegen auf y = 0. Der Dreibeinfuß i liegt im Winkel `drehung + i·120°`, gemessen als (cos, 0, sin). Die A-Bock-Achse ist (cos δ, 0, sin δ), die Ebenennormale (−sin δ, 0, cos δ).

- [ ] **Step 1: Failing test schreiben**

`src/model/Baugruppe.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from './ABock';
import { Dreibein } from './Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from './params';
import { Vec3 } from './Vec3';

const grad = (rad: number): number => (rad * 180) / Math.PI;

describe('Dreibein', () => {
  const d = new Dreibein('d', new Vec3(1, 0, 2), 0, STANDARD_DREIBEIN);

  it('berechnet die Höhe aus Stangenlänge, Überstand und Fußkreis', () => {
    expect(d.hoehe()).toBeCloseTo(Math.sqrt(2.2 ** 2 - 0.7 ** 2), 9);
    expect(d.spitze().equals(new Vec3(1, d.hoehe(), 2))).toBe(true);
  });

  it('erzeugt drei Beine voller Länge mit Füßen auf dem Fußkreis, die durch die Spitze laufen', () => {
    const beine = d.stangen();
    expect(beine.map((b) => b.id)).toEqual(['d-bein-0', 'd-bein-1', 'd-bein-2']);
    for (const b of beine) {
      expect(b.laenge).toBeCloseTo(2.4, 9);
      expect(b.start.y).toBe(0);
      expect(Math.hypot(b.start.x - 1, b.start.z - 2)).toBeCloseTo(0.7, 9);
      expect(b.naechsterPunkt(d.spitze()).distanceTo(d.spitze())).toBeCloseTo(0, 9);
      expect(b.gruppeId).toBe('d');
      expect(b.rolle).toBe('bein');
    }
  });

  it('liefert den Beinwinkel zur Senkrechten', () => {
    expect(d.beinwinkelGrad()).toBeCloseTo(grad(Math.asin(0.7 / 2.2)), 9);
  });

  it('lehnt unpassende oder nicht-positive Parameter ab', () => {
    expect(() => d.mitParams({ ...STANDARD_DREIBEIN, fusskreisradius: 2.2 })).toThrow(RangeError);
    expect(() => d.mitParams({ ...STANDARD_DREIBEIN, durchmesser: 0 })).toThrow(RangeError);
    expect(() => d.mitParams({ ...STANDARD_DREIBEIN, stangenlaenge: -1 })).toThrow(RangeError);
  });

  it('dreht, verschiebt und ändert Parameter ohne sich selbst zu ändern', () => {
    const g = d.gedreht(Math.PI / 2).verschoben(Vec3.NULL).mitParams({ ...STANDARD_DREIBEIN, fusskreisradius: 0.8 });
    expect(g.drehung).toBeCloseTo(Math.PI / 2);
    expect(g.position.equals(Vec3.NULL)).toBe(true);
    expect(g.params.fusskreisradius).toBe(0.8);
    expect(g.id).toBe('d');
    expect(d.drehung).toBe(0);
    expect(d.params.fusskreisradius).toBe(0.7);
  });
});

describe('ABock', () => {
  const a = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
  const h = Math.sqrt(2.2 ** 2 - 0.8 ** 2);

  it('berechnet die Höhe aus Stangenlänge und Fußabstand', () => {
    expect(a.hoehe()).toBeCloseTo(h, 9);
    expect(a.spitze().y).toBeCloseTo(h, 9);
  });

  it('setzt die Füße im Fußabstand entlang der Achse', () => {
    const [f0, f1] = a.fuesse();
    expect(f0.distanceTo(f1)).toBeCloseTo(1.6, 9);
    expect(f0.z).toBeCloseTo(-0.8, 9);
    expect(f1.z).toBeCloseTo(0.8, 9);
    expect(f0.x).toBeCloseTo(0, 9);
  });

  it('erzeugt zwei Beine und einen waagrechten Riegel auf Riegelhöhe', () => {
    const [b0, b1, riegel] = a.stangen();
    expect(b0.laenge).toBeCloseTo(2.4, 9);
    expect(b1.laenge).toBeCloseTo(2.4, 9);
    expect(riegel.id).toBe('a-riegel');
    expect(riegel.rolle).toBe('riegel');
    expect(riegel.start.y).toBeCloseTo(0.4, 9);
    expect(riegel.ende.y).toBeCloseTo(0.4, 9);
    expect(riegel.laenge).toBeCloseTo(1.6 * (1 - 0.4 / h) + 0.4, 9);
  });

  it('hat eine waagrechte Ebenennormale senkrecht zur Fußachse', () => {
    const n = a.ebenenNormale();
    const [f0, f1] = a.fuesse();
    expect(n.dot(f1.sub(f0))).toBeCloseTo(0, 9);
    expect(n.y).toBe(0);
    expect(n.length()).toBeCloseTo(1, 9);
  });

  it('liefert den Beinwinkel zur Senkrechten', () => {
    expect(a.beinwinkelGrad()).toBeCloseTo(grad(Math.asin(0.8 / 2.2)), 9);
  });

  it('lehnt Riegel über der Spitze, zu großen Fußabstand und Null-Werte ab', () => {
    expect(() => a.mitParams({ ...STANDARD_ABOCK, riegelhoehe: 3 })).toThrow(RangeError);
    expect(() => a.mitParams({ ...STANDARD_ABOCK, fussabstand: 5 })).toThrow(RangeError);
    expect(() => a.mitParams({ ...STANDARD_ABOCK, riegelhoehe: 0 })).toThrow(RangeError);
  });

  it('dreht und verschiebt ohne sich selbst zu ändern', () => {
    const g = a.gedreht(-Math.PI / 2).verschoben(new Vec3(3, 0, 0));
    expect(g.drehung).toBeCloseTo(0);
    expect(g.position.x).toBe(3);
    expect(a.drehung).toBeCloseTo(Math.PI / 2);
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/model/Baugruppe.test.ts`
Expected: FAIL, `./ABock` und `./Dreibein` fehlen.

- [ ] **Step 3: Implementieren**

`src/model/Baugruppe.ts`:

```ts
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

export type BaugruppenTyp = 'dreibein' | 'abock';

/** Parametrische Baugruppe, die ihre Stangen selbst erzeugt. */
export abstract class Baugruppe {
  abstract readonly typ: BaugruppenTyp;

  constructor(
    readonly id: string,
    readonly position: Vec3,
    readonly drehung: number,
  ) {}

  protected static pruefePositiv(wert: number, name: string): void {
    if (!(wert > 0)) throw new RangeError(`${name} muss größer als 0 sein`);
  }

  abstract stangen(): readonly Stange[];
  abstract spitze(): Vec3;
  abstract hoehe(): number;
  abstract beinwinkelGrad(): number;
  abstract gedreht(delta: number): Baugruppe;
  abstract verschoben(position: Vec3): Baugruppe;
}
```

`src/model/Dreibein.ts`:

```ts
import { Baugruppe } from './Baugruppe';
import { STANGEN_UEBERSTAND } from './konstanten';
import type { DreibeinParams } from './params';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

export class Dreibein extends Baugruppe {
  readonly typ = 'dreibein' as const;

  constructor(
    id: string,
    position: Vec3,
    drehung: number,
    readonly params: DreibeinParams,
  ) {
    super(id, position, drehung);
    Baugruppe.pruefePositiv(params.stangenlaenge, 'Stangenlänge');
    Baugruppe.pruefePositiv(params.fusskreisradius, 'Fußkreisradius');
    Baugruppe.pruefePositiv(params.durchmesser, 'Durchmesser');
    if (params.fusskreisradius >= this.nutzlaenge()) {
      throw new RangeError('Fußkreisradius muss kleiner als Stangenlänge minus Überstand sein');
    }
  }

  private nutzlaenge(): number {
    return this.params.stangenlaenge - STANGEN_UEBERSTAND;
  }

  hoehe(): number {
    const n = this.nutzlaenge();
    const r = this.params.fusskreisradius;
    return Math.sqrt(n * n - r * r);
  }

  spitze(): Vec3 {
    return this.position.add(new Vec3(0, this.hoehe(), 0));
  }

  fuesse(): readonly Vec3[] {
    const r = this.params.fusskreisradius;
    return [0, 1, 2].map((i) => {
      const w = this.drehung + (i * 2 * Math.PI) / 3;
      return this.position.add(new Vec3(r * Math.cos(w), 0, r * Math.sin(w)));
    });
  }

  stangen(): readonly Stange[] {
    const spitze = this.spitze();
    const verlaengerung = this.params.stangenlaenge / this.nutzlaenge();
    return this.fuesse().map(
      (fuss, i) =>
        new Stange(`${this.id}-bein-${i}`, fuss, fuss.add(spitze.sub(fuss).scale(verlaengerung)), this.params.durchmesser, 'bein', this.id),
    );
  }

  beinwinkelGrad(): number {
    return (Math.asin(this.params.fusskreisradius / this.nutzlaenge()) * 180) / Math.PI;
  }

  mitParams(params: DreibeinParams): Dreibein {
    return new Dreibein(this.id, this.position, this.drehung, params);
  }

  gedreht(delta: number): Dreibein {
    return new Dreibein(this.id, this.position, this.drehung + delta, this.params);
  }

  verschoben(position: Vec3): Dreibein {
    return new Dreibein(this.id, position, this.drehung, this.params);
  }
}
```

`src/model/ABock.ts`:

```ts
import { Baugruppe } from './Baugruppe';
import { STANGEN_UEBERSTAND } from './konstanten';
import type { ABockParams } from './params';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

export class ABock extends Baugruppe {
  readonly typ = 'abock' as const;

  constructor(
    id: string,
    position: Vec3,
    drehung: number,
    readonly params: ABockParams,
  ) {
    super(id, position, drehung);
    Baugruppe.pruefePositiv(params.stangenlaenge, 'Stangenlänge');
    Baugruppe.pruefePositiv(params.fussabstand, 'Fußabstand');
    Baugruppe.pruefePositiv(params.riegelhoehe, 'Riegelhöhe');
    Baugruppe.pruefePositiv(params.durchmesser, 'Durchmesser');
    if (params.fussabstand / 2 >= this.nutzlaenge()) {
      throw new RangeError('Fußabstand ist zu groß für diese Stangenlänge');
    }
    if (params.riegelhoehe >= this.hoehe()) throw new RangeError('Der Riegel muss unter der Spitze liegen');
  }

  private nutzlaenge(): number {
    return this.params.stangenlaenge - STANGEN_UEBERSTAND;
  }

  achse(): Vec3 {
    return new Vec3(Math.cos(this.drehung), 0, Math.sin(this.drehung));
  }

  ebenenNormale(): Vec3 {
    return new Vec3(-Math.sin(this.drehung), 0, Math.cos(this.drehung));
  }

  hoehe(): number {
    const n = this.nutzlaenge();
    const halb = this.params.fussabstand / 2;
    return Math.sqrt(n * n - halb * halb);
  }

  spitze(): Vec3 {
    return this.position.add(new Vec3(0, this.hoehe(), 0));
  }

  fuesse(): readonly [Vec3, Vec3] {
    const v = this.achse().scale(this.params.fussabstand / 2);
    return [this.position.sub(v), this.position.add(v)];
  }

  stangen(): readonly Stange[] {
    const spitze = this.spitze();
    const { stangenlaenge, durchmesser, riegelhoehe } = this.params;
    const verlaengerung = stangenlaenge / this.nutzlaenge();
    const [a, b] = this.fuesse();
    const beine = [a, b].map(
      (fuss, i) => new Stange(`${this.id}-bein-${i}`, fuss, fuss.add(spitze.sub(fuss).scale(verlaengerung)), durchmesser, 'bein', this.id),
    );
    const t = riegelhoehe / this.hoehe();
    const ra = a.add(spitze.sub(a).scale(t));
    const rb = b.add(spitze.sub(b).scale(t));
    const r = rb.sub(ra).normalize();
    const riegel = new Stange(
      `${this.id}-riegel`,
      ra.sub(r.scale(STANGEN_UEBERSTAND)),
      rb.add(r.scale(STANGEN_UEBERSTAND)),
      durchmesser,
      'riegel',
      this.id,
    );
    return [...beine, riegel];
  }

  beinwinkelGrad(): number {
    return (Math.asin(this.params.fussabstand / 2 / this.nutzlaenge()) * 180) / Math.PI;
  }

  mitParams(params: ABockParams): ABock {
    return new ABock(this.id, this.position, this.drehung, params);
  }

  gedreht(delta: number): ABock {
    return new ABock(this.id, this.position, this.drehung + delta, this.params);
  }

  verschoben(position: Vec3): ABock {
    return new ABock(this.id, position, this.drehung, this.params);
  }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/model`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/model/Baugruppe.ts src/model/Dreibein.ts src/model/ABock.ts src/model/Baugruppe.test.ts
git commit -m "feat: add parametric Dreibein and A-Bock"
```

### Task 4: Bünde, Bauwerk und Kochstelle-Beispiel

**Files:**
- Create: `src/model/Bund.ts`, `src/model/Bauwerk.ts`, `src/beispiele/kochstelle.ts`
- Test: `src/model/Bund.test.ts`, `src/model/Bauwerk.test.ts`, `src/beispiele/kochstelle.test.ts`

**Interfaces:**
- Consumes: `Vec3`, `Stange`, `Fuss`, `naechstePunkte`, `Baugruppe`, `Dreibein`, `ABock`, Konstanten, Standardparameter
- Produces:
  - `class Bund { id; position: Vec3; stangenIds: readonly string[]; enthaelt(stangeId): boolean }`
  - `class BundFinder { constructor(toleranz?, clusterRadius?); finde(stangen): Bund[] }`, `mittelpunkt(punkte): Vec3`
  - `class Bauwerk { static leer(); gruppen; freieStangen; get istLeer; stangen(); gruppe(id); stange(id); enthaelt(id); auswahlIdFuer(stangeId); mitGruppe(g); ersetzeGruppe(g); mitStange(s); ersetzeStange(s); ohne(id); buende(); fuesse() }`
  - `kochstelle(): Bauwerk` mit den IDs `abock` (A-Bock bei (0,0,0), Drehung 90°), `dreibein` (bei (2,5, 0, 0), Drehung 0) und `first` (frei, Spitze ↔ Spitze, 0,2 m Überstand)

- [ ] **Step 1: Failing tests schreiben**

`src/model/Bund.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BundFinder, mittelpunkt } from './Bund';
import { Dreibein } from './Dreibein';
import { STANDARD_DREIBEIN } from './params';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

const stange = (id: string, a: [number, number, number], b: [number, number, number]): Stange =>
  new Stange(id, Vec3.fromArray(a), Vec3.fromArray(b), 0.08);

describe('BundFinder', () => {
  const finder = new BundFinder();

  it('setzt einen Bund, wo sich zwei Stangen kreuzen', () => {
    const buende = finder.finde([stange('a', [-1, 1, 0], [1, 1, 0]), stange('b', [0, 0, 0], [0, 2, 0])]);
    expect(buende).toHaveLength(1);
    expect(buende[0]?.stangenIds).toEqual(['a', 'b']);
    expect(buende[0]?.position.equals(new Vec3(0, 1, 0))).toBe(true);
    expect(buende[0]?.enthaelt('a')).toBe(true);
    expect(buende[0]?.enthaelt('x')).toBe(false);
  });

  it('setzt keinen Bund zwischen Stangen, die sich nicht berühren', () => {
    expect(finder.finde([stange('a', [0, 0, 0], [0, 2, 0]), stange('b', [1, 0, 0], [1, 2, 0])])).toHaveLength(0);
  });

  it('respektiert die Toleranz', () => {
    const a = stange('a', [-1, 1, 0], [1, 1, 0]);
    expect(finder.finde([a, stange('b', [0, 0, 0.04], [0, 2, 0.04])])).toHaveLength(1);
    expect(finder.finde([a, stange('b', [0, 0, 0.06], [0, 2, 0.06])])).toHaveLength(0);
  });

  it('fasst die drei Beine eines Dreibeins an der Spitze zu einem Bund zusammen', () => {
    const d = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
    const buende = finder.finde(d.stangen());
    expect(buende).toHaveLength(1);
    expect(buende[0]?.stangenIds).toEqual(['d-bein-0', 'd-bein-1', 'd-bein-2']);
    expect(buende[0]?.position.distanceTo(d.spitze())).toBeLessThan(1e-9);
  });

  it('trennt weit auseinanderliegende Kreuzungen', () => {
    const buende = finder.finde([
      stange('a', [-1, 1, 0], [5, 1, 0]),
      stange('b', [0, 0, 0], [0, 2, 0]),
      stange('c', [4, 0, 0], [4, 2, 0]),
    ]);
    expect(buende).toHaveLength(2);
  });
});

describe('mittelpunkt', () => {
  it('mittelt Punkte', () => {
    expect(mittelpunkt([new Vec3(0, 0, 0), new Vec3(2, 4, 6)]).toArray()).toEqual([1, 2, 3]);
  });
});
```

`src/model/Bauwerk.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from './ABock';
import { Bauwerk } from './Bauwerk';
import { Dreibein } from './Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from './params';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

const dreibein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const abock = new ABock('a', new Vec3(4, 0, 0), 0, STANDARD_ABOCK);
const frei = new Stange('s', new Vec3(8, 0, 0), new Vec3(8, 2, 0), 0.08);
const voll = Bauwerk.leer().mitGruppe(dreibein).mitGruppe(abock).mitStange(frei);

describe('Bauwerk', () => {
  it('ist anfangs leer', () => {
    expect(Bauwerk.leer().istLeer).toBe(true);
    expect(Bauwerk.leer().stangen()).toHaveLength(0);
  });

  it('sammelt die Stangen aller Gruppen und die freien Stangen', () => {
    expect(voll.istLeer).toBe(false);
    expect(voll.stangen()).toHaveLength(3 + 3 + 1);
    expect(voll.gruppe('a')).toBe(abock);
    expect(voll.stange('d-bein-1')?.gruppeId).toBe('d');
    expect(voll.stange('gibtsnicht')).toBeUndefined();
  });

  it('bleibt beim Hinzufügen unverändert', () => {
    const basis = Bauwerk.leer();
    basis.mitGruppe(dreibein);
    expect(basis.istLeer).toBe(true);
  });

  it('lehnt doppelte IDs und Gruppenstangen als freie Stangen ab', () => {
    expect(() => voll.mitGruppe(dreibein)).toThrow(/schon vergeben/);
    expect(() => voll.mitStange(frei)).toThrow(/schon vergeben/);
    expect(() => Bauwerk.leer().mitStange(dreibein.stangen()[0] as Stange)).toThrow(/freie Stangen/);
  });

  it('ersetzt Gruppen und freie Stangen', () => {
    const neu = voll.ersetzeGruppe(dreibein.mitParams({ ...STANDARD_DREIBEIN, fusskreisradius: 0.9 }));
    expect((neu.gruppe('d') as Dreibein).params.fusskreisradius).toBe(0.9);
    expect(voll.ersetzeStange(frei.mitDurchmesser(0.12)).stange('s')?.durchmesser).toBe(0.12);
    expect(() => voll.ersetzeGruppe(new Dreibein('x', Vec3.NULL, 0, STANDARD_DREIBEIN))).toThrow(/gibt es nicht/);
    expect(() => voll.ersetzeStange(new Stange('x', Vec3.NULL, new Vec3(0, 1, 0), 0.08))).toThrow(/gibt es nicht/);
  });

  it('entfernt Gruppen und freie Stangen per ID', () => {
    expect(voll.ohne('d').stangen()).toHaveLength(4);
    expect(voll.ohne('s').stangen()).toHaveLength(6);
    expect(voll.ohne('unbekannt').stangen()).toHaveLength(7);
  });

  it('findet die Auswahl-ID einer Stange', () => {
    expect(voll.auswahlIdFuer('d-bein-2')).toBe('d');
    expect(voll.auswahlIdFuer('s')).toBe('s');
    expect(voll.enthaelt('a')).toBe(true);
    expect(voll.enthaelt('a-riegel')).toBe(true);
    expect(voll.enthaelt('nix')).toBe(false);
  });

  it('leitet Füße und Bünde aus der Geometrie ab', () => {
    const nurDreibein = Bauwerk.leer().mitGruppe(dreibein);
    expect(nurDreibein.fuesse()).toHaveLength(3);
    expect(nurDreibein.buende()).toHaveLength(1);
  });
});
```

`src/beispiele/kochstelle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from './kochstelle';

describe('Kochstelle', () => {
  const k = kochstelle();

  it('besteht aus A-Bock, Dreibein und First', () => {
    expect(k.gruppen.map((g) => g.id)).toEqual(['abock', 'dreibein']);
    expect(k.freieStangen.map((s) => s.id)).toEqual(['first']);
    expect(k.stangen()).toHaveLength(7);
  });

  it('hat vier Bünde: zwei Spitzen mit First und zwei Riegelbünde', () => {
    const buende = k.buende();
    expect(buende).toHaveLength(4);
    const mitFirst = buende.filter((b) => b.enthaelt('first'));
    expect(mitFirst).toHaveLength(2);
    expect(mitFirst.some((b) => b.enthaelt('abock-bein-0') && b.enthaelt('abock-bein-1'))).toBe(true);
    expect(mitFirst.some((b) => ['dreibein-bein-0', 'dreibein-bein-1', 'dreibein-bein-2'].every((id) => b.enthaelt(id)))).toBe(true);
  });

  it('steht auf fünf Füßen', () => {
    expect(k.fuesse()).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen fehlschlagen**

Run: `npx vitest run src/model/Bund.test.ts src/model/Bauwerk.test.ts src/beispiele`
Expected: FAIL, `./Bund`, `./Bauwerk` und `./kochstelle` fehlen.

- [ ] **Step 3: Implementieren**

`src/model/Bund.ts`:

```ts
import { naechstePunkte } from './geometrie';
import { BUND_CLUSTER_RADIUS, BUND_TOLERANZ } from './konstanten';
import type { Stange } from './Stange';
import { Vec3 } from './Vec3';

/** Stelle, an der zwei oder mehr Stangen zusammengebunden sind. Wird aus der Geometrie abgeleitet. */
export class Bund {
  constructor(
    readonly id: string,
    readonly position: Vec3,
    readonly stangenIds: readonly string[],
  ) {}

  enthaelt(stangeId: string): boolean {
    return this.stangenIds.includes(stangeId);
  }
}

export function mittelpunkt(punkte: readonly Vec3[]): Vec3 {
  return punkte.reduce((summe, p) => summe.add(p), Vec3.NULL).scale(1 / punkte.length);
}

interface Kontakt {
  readonly punkt: Vec3;
  readonly ids: readonly [string, string];
}

interface Cluster {
  readonly punkte: Vec3[];
  readonly ids: Set<string>;
}

/** Findet Bünde: Stangenpaare mit Achsabstand ≤ Toleranz, nahe Kontakte zu einem Bund zusammengefasst. */
export class BundFinder {
  constructor(
    private readonly toleranz = BUND_TOLERANZ,
    private readonly clusterRadius = BUND_CLUSTER_RADIUS,
  ) {}

  finde(stangen: readonly Stange[]): Bund[] {
    return this.gruppiere(this.kontakte(stangen)).map(
      (c, i) => new Bund(`bund-${i}`, mittelpunkt(c.punkte), [...c.ids].sort()),
    );
  }

  private kontakte(stangen: readonly Stange[]): Kontakt[] {
    const kontakte: Kontakt[] = [];
    for (let i = 0; i < stangen.length; i++) {
      for (let j = i + 1; j < stangen.length; j++) {
        const a = stangen[i] as Stange;
        const b = stangen[j] as Stange;
        const r = naechstePunkte(a.start, a.ende, b.start, b.ende);
        if (r.abstand <= this.toleranz) kontakte.push({ punkt: r.a.add(r.b).scale(0.5), ids: [a.id, b.id] });
      }
    }
    return kontakte;
  }

  private gruppiere(kontakte: readonly Kontakt[]): Cluster[] {
    const cluster: Cluster[] = [];
    for (const k of kontakte) {
      const passend = cluster.find((c) => mittelpunkt(c.punkte).distanceTo(k.punkt) <= this.clusterRadius);
      if (passend) {
        passend.punkte.push(k.punkt);
        k.ids.forEach((id) => passend.ids.add(id));
      } else {
        cluster.push({ punkte: [k.punkt], ids: new Set(k.ids) });
      }
    }
    return cluster;
  }
}
```

`src/model/Bauwerk.ts`:

```ts
import type { Baugruppe } from './Baugruppe';
import { type Bund, BundFinder } from './Bund';
import { Fuss } from './Fuss';
import type { Stange } from './Stange';

/** Unveränderliches Aggregat aus Baugruppen und freien Stangen. Bünde und Füße werden abgeleitet. */
export class Bauwerk {
  private constructor(
    readonly gruppen: readonly Baugruppe[],
    readonly freieStangen: readonly Stange[],
  ) {}

  static leer(): Bauwerk {
    return new Bauwerk([], []);
  }

  get istLeer(): boolean {
    return this.gruppen.length === 0 && this.freieStangen.length === 0;
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

  enthaelt(id: string): boolean {
    return this.gruppe(id) !== undefined || this.stange(id) !== undefined;
  }

  /** Klickt man eine Gruppenstange an, wird die ganze Gruppe ausgewählt. */
  auswahlIdFuer(stangeId: string): string {
    return this.stange(stangeId)?.gruppeId ?? stangeId;
  }

  mitGruppe(gruppe: Baugruppe): Bauwerk {
    this.pruefeNeu([gruppe.id, ...gruppe.stangen().map((s) => s.id)]);
    return new Bauwerk([...this.gruppen, gruppe], this.freieStangen);
  }

  ersetzeGruppe(gruppe: Baugruppe): Bauwerk {
    if (!this.gruppe(gruppe.id)) throw new Error(`Baugruppe ${gruppe.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen.map((g) => (g.id === gruppe.id ? gruppe : g)),
      this.freieStangen,
    );
  }

  mitStange(stange: Stange): Bauwerk {
    if (stange.gruppeId !== null) throw new Error('Nur freie Stangen können direkt hinzugefügt werden');
    this.pruefeNeu([stange.id]);
    return new Bauwerk(this.gruppen, [...this.freieStangen, stange]);
  }

  ersetzeStange(stange: Stange): Bauwerk {
    if (!this.freieStangen.some((s) => s.id === stange.id)) throw new Error(`Freie Stange ${stange.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen.map((s) => (s.id === stange.id ? stange : s)),
    );
  }

  ohne(id: string): Bauwerk {
    return new Bauwerk(
      this.gruppen.filter((g) => g.id !== id),
      this.freieStangen.filter((s) => s.id !== id),
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

`src/beispiele/kochstelle.ts`:

```ts
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_DURCHMESSER } from '../model/konstanten';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';

/** Referenzbau aus der Spec: A-Bock + Dreibein, dazwischen ein First von Spitze zu Spitze. */
export function kochstelle(): Bauwerk {
  const abock = new ABock('abock', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
  const dreibein = new Dreibein('dreibein', new Vec3(2.5, 0, 0), 0, STANDARD_DREIBEIN);
  const first = Stange.zwischen('first', abock.spitze(), dreibein.spitze(), STANDARD_DURCHMESSER);
  return Bauwerk.leer().mitGruppe(abock).mitGruppe(dreibein).mitStange(first);
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run`
Expected: PASS, alle Model- und Beispiel-Tests.

- [ ] **Step 5: Commit**

```bash
git add src/model/Bund.ts src/model/Bund.test.ts src/model/Bauwerk.ts src/model/Bauwerk.test.ts src/beispiele/kochstelle.ts src/beispiele/kochstelle.test.ts
git commit -m "feat: derive lashings from geometry and add Bauwerk aggregate"
```

### Task 5: Teilen: Serializer und URL-Codec (Test 9)

**Files:**
- Create: `src/share/BauwerkSerializer.ts`, `src/share/UrlCodec.ts`
- Test: `src/share/share.test.ts`

**Interfaces:**
- Consumes: `Bauwerk`, `Baugruppe`, `Dreibein`, `ABock`, `Stange`, `Vec3`, `kochstelle()`
- Produces:
  - `interface BauwerkJson { version: 1; gruppen: GruppeJson[]; stangen: StangeJson[] }`. Gruppen speichern nur Typ, Position, Drehung und Parameter, ihre Stangen werden beim Laden neu erzeugt. `stangen` enthält nur die freien Stangen.
  - `class BauwerkSerializer { zuJson(b): BauwerkJson; ausJson(daten: unknown): Bauwerk }`. Wirft `Error('Ungültige Bauwerk-Daten: …')`.
  - `class UrlCodec { static PRAEFIX = '#b='; kodiere(b): string; dekodiere(text): Bauwerk; alsHash(b): string; ausHash(hash): Bauwerk | null }`. Wirft `Error('Link ist beschädigt')` oder den Serializer-Fehler.

- [ ] **Step 1: Failing test schreiben**

`src/share/share.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { BauwerkSerializer } from './BauwerkSerializer';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const codec = new UrlCodec();

describe('BauwerkSerializer', () => {
  it('speichert Gruppen als Parameter und nur freie Stangen einzeln', () => {
    const json = serializer.zuJson(kochstelle());
    expect(json.version).toBe(1);
    expect(json.gruppen.map((g) => g.typ)).toEqual(['abock', 'dreibein']);
    expect(json.stangen.map((s) => s.id)).toEqual(['first']);
  });

  it('übersteht die Rundreise über JSON-Text unverändert', () => {
    const json = serializer.zuJson(kochstelle());
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(serializer.zuJson(zurueck)).toEqual(json);
    expect(zurueck.stangen()).toHaveLength(7);
  });

  it.each([
    ['kein Objekt', 'hallo'],
    ['falsche Version', { version: 2, gruppen: [], stangen: [] }],
    ['gruppen keine Liste', { version: 1, gruppen: 'x', stangen: [] }],
    ['unbekannter Typ', { version: 1, gruppen: [{ id: 'g', typ: 'vierbein', position: [0, 0, 0], drehung: 0, params: {} }], stangen: [] }],
    ['Zahl fehlt', { version: 1, gruppen: [{ id: 'g', typ: 'dreibein', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 2.4 } }], stangen: [] }],
    ['unmögliche Maße', { version: 1, gruppen: [{ id: 'g', typ: 'dreibein', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 5, durchmesser: 0.08 } }], stangen: [] }],
    ['Vektor zu kurz', { version: 1, gruppen: [], stangen: [{ id: 's', start: [0, 0], ende: [0, 2, 0], durchmesser: 0.08 }] }],
    ['leere ID', { version: 1, gruppen: [], stangen: [{ id: '', start: [0, 0, 0], ende: [0, 2, 0], durchmesser: 0.08 }] }],
  ])('lehnt ungültige Daten ab: %s', (_name, daten) => {
    expect(() => serializer.ausJson(daten)).toThrow(/^Ungültige Bauwerk-Daten: /);
  });
});

describe('UrlCodec', () => {
  it('übersteht die Rundreise über den Link-Hash', () => {
    const hash = codec.alsHash(kochstelle());
    expect(hash.startsWith('#b=')).toBe(true);
    const zurueck = codec.ausHash(hash);
    expect(zurueck && serializer.zuJson(zurueck)).toEqual(serializer.zuJson(kochstelle()));
  });

  it('liefert null, wenn der Link kein Bauwerk enthält', () => {
    expect(codec.ausHash('')).toBeNull();
    expect(codec.ausHash('#irgendwas')).toBeNull();
  });

  it('meldet einen beschädigten Link', () => {
    expect(() => codec.ausHash('#b=%%%kaputt')).toThrow(/Link ist beschädigt|Ungültige Bauwerk-Daten/);
    expect(() => codec.dekodiere('')).toThrow('Link ist beschädigt');
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/share`
Expected: FAIL, `./BauwerkSerializer` und `./UrlCodec` fehlen.

- [ ] **Step 3: Implementieren**

`src/share/BauwerkSerializer.ts`:

```ts
import { ABock } from '../model/ABock';
import type { Baugruppe } from '../model/Baugruppe';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import type { ABockParams, DreibeinParams } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';

type V3 = readonly [number, number, number];

export type GruppeJson =
  | { readonly id: string; readonly typ: 'dreibein'; readonly position: V3; readonly drehung: number; readonly params: DreibeinParams }
  | { readonly id: string; readonly typ: 'abock'; readonly position: V3; readonly drehung: number; readonly params: ABockParams };

export interface StangeJson {
  readonly id: string;
  readonly start: V3;
  readonly ende: V3;
  readonly durchmesser: number;
}

export interface BauwerkJson {
  readonly version: 1;
  readonly gruppen: readonly GruppeJson[];
  readonly stangen: readonly StangeJson[];
}

type Roh = Record<string, unknown>;

function objekt(d: unknown, name: string): Roh {
  if (typeof d !== 'object' || d === null || Array.isArray(d)) throw new Error(`${name} ist kein Objekt`);
  return d as Roh;
}

function liste(d: unknown, name: string): unknown[] {
  if (!Array.isArray(d)) throw new Error(`${name} ist keine Liste`);
  return d;
}

function zahl(d: unknown, name: string): number {
  if (typeof d !== 'number' || !Number.isFinite(d)) throw new Error(`${name} ist keine Zahl`);
  return d;
}

function text(d: unknown, name: string): string {
  if (typeof d !== 'string' || d.length === 0) throw new Error(`${name} fehlt`);
  return d;
}

function vektor(d: unknown, name: string): Vec3 {
  const l = liste(d, name);
  if (l.length !== 3) throw new Error(`${name} braucht drei Koordinaten`);
  return new Vec3(zahl(l[0], name), zahl(l[1], name), zahl(l[2], name));
}

/** Bauwerk ↔ JSON. Gruppen werden über ihre Parameter gespeichert, damit Links kurz bleiben. */
export class BauwerkSerializer {
  zuJson(bauwerk: Bauwerk): BauwerkJson {
    return {
      version: 1,
      gruppen: bauwerk.gruppen.map((g) => this.gruppeZuJson(g)),
      stangen: bauwerk.freieStangen.map((s) => ({
        id: s.id,
        start: s.start.toArray(),
        ende: s.ende.toArray(),
        durchmesser: s.durchmesser,
      })),
    };
  }

  ausJson(daten: unknown): Bauwerk {
    try {
      return this.lies(daten);
    } catch (e) {
      throw new Error(`Ungültige Bauwerk-Daten: ${(e as Error).message}`);
    }
  }

  private gruppeZuJson(g: Baugruppe): GruppeJson {
    const basis = { id: g.id, position: g.position.toArray(), drehung: g.drehung };
    if (g instanceof Dreibein) return { ...basis, typ: 'dreibein', params: g.params };
    if (g instanceof ABock) return { ...basis, typ: 'abock', params: g.params };
    throw new Error(`Unbekannte Baugruppe ${g.typ}`);
  }

  private lies(daten: unknown): Bauwerk {
    const o = objekt(daten, 'Bauwerk');
    if (o.version !== 1) throw new Error('unbekannte Version');
    const gruppen = liste(o.gruppen, 'gruppen').map((g) => this.liesGruppe(g));
    const stangen = liste(o.stangen, 'stangen').map((s) => this.liesStange(s));
    const mitGruppen = gruppen.reduce((b, g) => b.mitGruppe(g), Bauwerk.leer());
    return stangen.reduce((b, s) => b.mitStange(s), mitGruppen);
  }

  private liesGruppe(daten: unknown): Baugruppe {
    const o = objekt(daten, 'Baugruppe');
    const id = text(o.id, 'id');
    const position = vektor(o.position, 'position');
    const drehung = zahl(o.drehung, 'drehung');
    const p = objekt(o.params, 'params');
    if (o.typ === 'dreibein') {
      return new Dreibein(id, position, drehung, {
        stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
        fusskreisradius: zahl(p.fusskreisradius, 'fusskreisradius'),
        durchmesser: zahl(p.durchmesser, 'durchmesser'),
      });
    }
    if (o.typ === 'abock') {
      return new ABock(id, position, drehung, {
        stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
        fussabstand: zahl(p.fussabstand, 'fussabstand'),
        riegelhoehe: zahl(p.riegelhoehe, 'riegelhoehe'),
        durchmesser: zahl(p.durchmesser, 'durchmesser'),
      });
    }
    throw new Error(`unbekannter Baugruppen-Typ ${String(o.typ)}`);
  }

  private liesStange(daten: unknown): Stange {
    const o = objekt(daten, 'Stange');
    return new Stange(text(o.id, 'id'), vektor(o.start, 'start'), vektor(o.ende, 'ende'), zahl(o.durchmesser, 'durchmesser'));
  }
}
```

`src/share/UrlCodec.ts`:

```ts
import LZString from 'lz-string';
import type { Bauwerk } from '../model/Bauwerk';
import { BauwerkSerializer } from './BauwerkSerializer';

/** Packt ein Bauwerk komprimiert in den URL-Hash (#b=…) und wieder heraus. */
export class UrlCodec {
  static readonly PRAEFIX = '#b=';

  constructor(private readonly serializer = new BauwerkSerializer()) {}

  kodiere(bauwerk: Bauwerk): string {
    return LZString.compressToEncodedURIComponent(JSON.stringify(this.serializer.zuJson(bauwerk)));
  }

  dekodiere(text: string): Bauwerk {
    let daten: unknown;
    try {
      const json = LZString.decompressFromEncodedURIComponent(text);
      if (!json) throw new Error('leer');
      daten = JSON.parse(json);
    } catch {
      throw new Error('Link ist beschädigt');
    }
    return this.serializer.ausJson(daten);
  }

  alsHash(bauwerk: Bauwerk): string {
    return UrlCodec.PRAEFIX + this.kodiere(bauwerk);
  }

  ausHash(hash: string): Bauwerk | null {
    return hash.startsWith(UrlCodec.PRAEFIX) ? this.dekodiere(hash.slice(UrlCodec.PRAEFIX.length)) : null;
  }
}
```

Hinweis: `lz-string` wird bewusst per Default-Import geladen. Benannte Importe aus diesem CommonJS-Paket scheitern unter Node-ESM, also in Vitest und Playwright. Tritt trotzdem ein Import-Fehler auf, gehört er in `CLAUDE.md` → Known Issues.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/share`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/share/BauwerkSerializer.ts src/share/UrlCodec.ts src/share/share.test.ts
git commit -m "feat: serialize Bauwerk to JSON and share links"
```

### Task 6: Undo-Verlauf und Einrasten

**Files:**
- Create: `src/editor/konstanten.ts`, `src/editor/Verlauf.ts`, `src/editor/SnapService.ts`
- Test: `src/editor/Verlauf.test.ts`, `src/editor/SnapService.test.ts`

**Interfaces:**
- Consumes: `Bauwerk`, `Vec3`, `Dreibein`, `STANDARD_DREIBEIN`
- Produces:
  - `konstanten.ts`: `SNAP_RADIUS = 0.25`, `BODEN_RASTER = 0.1`, `DREH_SCHRITT = Math.PI / 12`, `KLICK_TOLERANZ_PX = 5`
  - `class Verlauf<T> { static start<T>(anfang, max = 100); aktuell: T; get kannRueckgaengig; get kannWiederholen; mit(neu); rueckgaengig(); wiederholen() }`
  - `type Treffer = { art: 'boden'; punkt: Vec3 } | { art: 'stange'; punkt: Vec3; stangeId: string }`
  - `type SnapArt = 'spitze' | 'bund' | 'ende' | 'stange' | 'boden'`, `interface SnapPunkt { punkt: Vec3; art: SnapArt }`
  - `class SnapService { constructor(radius?, raster?); snap(treffer, bauwerk): SnapPunkt; aufRaster(p): Vec3 }`. Reihenfolge: der nächste Kandidat (Spitze, Bund, Stangenende) im Snap-Radius gewinnt, bei Gleichstand der frühere. Sonst wird ein Stangentreffer auf die Achse projiziert, sonst der Bodenpunkt aufs Raster gerundet (y = 0).

- [ ] **Step 1: Konstanten anlegen**

`src/editor/konstanten.ts`:

```ts
export const SNAP_RADIUS = 0.25; // m, so nah rastet ein Klick auf Spitze, Bund oder Stangenende ein
export const BODEN_RASTER = 0.1; // m
export const DREH_SCHRITT = Math.PI / 12; // 15° je Tastendruck R
export const KLICK_TOLERANZ_PX = 5; // mehr Mausweg zählt als Drehen der Ansicht, nicht als Klick
```

- [ ] **Step 2: Failing tests schreiben**

`src/editor/Verlauf.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Verlauf } from './Verlauf';

describe('Verlauf', () => {
  it('geht zurück und wieder vor', () => {
    const v = Verlauf.start('a').mit('b').mit('c');
    expect(v.aktuell).toBe('c');
    const r = v.rueckgaengig();
    expect(r.aktuell).toBe('b');
    expect(r.kannWiederholen).toBe(true);
    expect(r.wiederholen().aktuell).toBe('c');
  });

  it('bleibt am Anfang und am Ende stehen', () => {
    const v = Verlauf.start('a');
    expect(v.kannRueckgaengig).toBe(false);
    expect(v.rueckgaengig()).toBe(v);
    expect(v.wiederholen()).toBe(v);
  });

  it('verwirft die Wiederholen-Liste bei einer neuen Änderung', () => {
    const r = Verlauf.start('a').mit('b').rueckgaengig().mit('x');
    expect(r.aktuell).toBe('x');
    expect(r.kannWiederholen).toBe(false);
  });

  it('merkt sich höchstens max Schritte', () => {
    const v = Verlauf.start(0, 2).mit(1).mit(2).mit(3);
    const zurueck = v.rueckgaengig().rueckgaengig();
    expect(zurueck.aktuell).toBe(1);
    expect(zurueck.kannRueckgaengig).toBe(false);
  });
});
```

`src/editor/SnapService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_DREIBEIN } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { SnapService } from './SnapService';

const dreibein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const bauwerk = Bauwerk.leer().mitGruppe(dreibein);
const snap = new SnapService();

describe('SnapService', () => {
  it('rundet freie Bodenpunkte aufs 10-cm-Raster', () => {
    const p = snap.snap({ art: 'boden', punkt: new Vec3(3.234, 0, 2.071) }, bauwerk);
    expect(p.art).toBe('boden');
    expect(p.punkt.equals(new Vec3(3.2, 0, 2.1), 1e-9)).toBe(true);
  });

  it('rastet nahe der Spitze auf die Spitze ein', () => {
    const p = snap.snap({ art: 'stange', punkt: dreibein.spitze().add(new Vec3(0.1, 0, 0)), stangeId: 'd-bein-0' }, bauwerk);
    expect(p.art).toBe('spitze');
    expect(p.punkt.equals(dreibein.spitze())).toBe(true);
  });

  it('rastet nahe eines Fußes auf das Stangenende ein', () => {
    const p = snap.snap({ art: 'boden', punkt: new Vec3(0.8, 0, 0.05) }, bauwerk);
    expect(p.art).toBe('ende');
    expect(p.punkt.equals(new Vec3(0.7, 0, 0), 1e-9)).toBe(true);
  });

  it('projiziert einen Treffer mitten auf einer Stange auf ihre Achse', () => {
    const bein = dreibein.stangen()[0];
    const mitte = bein!.start.add(bein!.ende).scale(0.5);
    const p = snap.snap({ art: 'stange', punkt: mitte.add(new Vec3(0, 0, 0.04)), stangeId: 'd-bein-0' }, bauwerk);
    expect(p.art).toBe('stange');
    expect(bein!.naechsterPunkt(p.punkt).distanceTo(p.punkt)).toBeLessThan(1e-9);
  });

  it('fällt bei einer unbekannten Stange auf das Raster zurück', () => {
    const p = snap.snap({ art: 'stange', punkt: new Vec3(5.04, 1, 5), stangeId: 'weg' }, bauwerk);
    expect(p.art).toBe('boden');
    expect(p.punkt.equals(new Vec3(5, 0, 5), 1e-9)).toBe(true);
  });
});
```

- [ ] **Step 3: Tests laufen lassen, sie müssen fehlschlagen**

Run: `npx vitest run src/editor`
Expected: FAIL, `./Verlauf` und `./SnapService` fehlen.

- [ ] **Step 4: Implementieren**

`src/editor/Verlauf.ts`:

```ts
/** Unveränderlicher Undo/Redo-Verlauf. */
export class Verlauf<T> {
  private constructor(
    private readonly vorher: readonly T[],
    readonly aktuell: T,
    private readonly nachher: readonly T[],
    private readonly max: number,
  ) {}

  static start<T>(anfang: T, max = 100): Verlauf<T> {
    return new Verlauf<T>([], anfang, [], max);
  }

  get kannRueckgaengig(): boolean {
    return this.vorher.length > 0;
  }

  get kannWiederholen(): boolean {
    return this.nachher.length > 0;
  }

  mit(neu: T): Verlauf<T> {
    return new Verlauf([...this.vorher, this.aktuell].slice(-this.max), neu, [], this.max);
  }

  rueckgaengig(): Verlauf<T> {
    if (!this.kannRueckgaengig) return this;
    const letzter = this.vorher[this.vorher.length - 1] as T;
    return new Verlauf(this.vorher.slice(0, -1), letzter, [this.aktuell, ...this.nachher], this.max);
  }

  wiederholen(): Verlauf<T> {
    if (!this.kannWiederholen) return this;
    const [naechster, ...rest] = this.nachher;
    return new Verlauf([...this.vorher, this.aktuell], naechster as T, rest, this.max);
  }
}
```

`src/editor/SnapService.ts`:

```ts
import type { Bauwerk } from '../model/Bauwerk';
import { Vec3 } from '../model/Vec3';
import { BODEN_RASTER, SNAP_RADIUS } from './konstanten';

export type Treffer =
  | { readonly art: 'boden'; readonly punkt: Vec3 }
  | { readonly art: 'stange'; readonly punkt: Vec3; readonly stangeId: string };

export type SnapArt = 'spitze' | 'bund' | 'ende' | 'stange' | 'boden';

export interface SnapPunkt {
  readonly punkt: Vec3;
  readonly art: SnapArt;
}

/** Macht aus einem Mausklick einen eindeutigen 3D-Punkt, nie einen freien Tiefenklick. */
export class SnapService {
  constructor(
    private readonly radius = SNAP_RADIUS,
    private readonly raster = BODEN_RASTER,
  ) {}

  snap(treffer: Treffer, bauwerk: Bauwerk): SnapPunkt {
    const kandidat = this.naechsterKandidat(treffer.punkt, bauwerk);
    if (kandidat) return kandidat;
    if (treffer.art === 'stange') {
      const stange = bauwerk.stange(treffer.stangeId);
      if (stange) return { punkt: stange.naechsterPunkt(treffer.punkt), art: 'stange' };
    }
    return { punkt: this.aufRaster(treffer.punkt), art: 'boden' };
  }

  aufRaster(p: Vec3): Vec3 {
    const runde = (x: number): number => Math.round(x / this.raster) * this.raster;
    return new Vec3(runde(p.x), 0, runde(p.z));
  }

  private naechsterKandidat(p: Vec3, bauwerk: Bauwerk): SnapPunkt | null {
    const kandidaten: SnapPunkt[] = [
      ...bauwerk.gruppen.map((g) => ({ punkt: g.spitze(), art: 'spitze' as const })),
      ...bauwerk.buende().map((b) => ({ punkt: b.position, art: 'bund' as const })),
      ...bauwerk.stangen().flatMap((s) => s.endpunkte().map((e) => ({ punkt: e, art: 'ende' as const }))),
    ];
    return kandidaten.reduce<SnapPunkt | null>((bester, k) => {
      const d = k.punkt.distanceTo(p);
      if (d > this.radius) return bester;
      return bester === null || d < bester.punkt.distanceTo(p) ? k : bester;
    }, null);
  }
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/editor`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/editor/konstanten.ts src/editor/Verlauf.ts src/editor/Verlauf.test.ts src/editor/SnapService.ts src/editor/SnapService.test.ts
git commit -m "feat: add undo history and click snapping"
```

### Task 7: Werkzeuge und Editor-Controller

**Files:**
- Create: `src/editor/Werkzeuge.ts`, `src/editor/Editor.ts`
- Test: `src/editor/Editor.test.ts`

**Interfaces:**
- Consumes: `Bauwerk`, `Baugruppe`, `Dreibein`, `ABock`, `Stange`, Konstanten, `SnapService`, `Treffer`, `SnapPunkt`, `Verlauf`, `DREH_SCHRITT`
- Produces:
  - `type WerkzeugName = 'dreibein' | 'abock' | 'stange' | 'auswahl'`
  - `interface EditorKontext { bauwerk; snap; aendere(neu); waehle(id | null); neueId(praefix) }`. Diese Methoden benachrichtigen **nicht**.
  - `interface Werkzeug { name; angefangen: Vec3 | null; onKlick(treffer, kontext); abbrechen() }`, `erzeugeWerkzeug(name): Werkzeug`
  - `interface EditorZustand { bauwerk; auswahl: string | null; markiert: ReadonlySet<string>; werkzeug: WerkzeugName; stangenStart: Vec3 | null; meldung: string | null; kannRueckgaengig; kannWiederholen }`
  - `class Editor implements EditorKontext { constructor(anfang, optionen?: { snap?; neueId? }); abonniere(fn); zustand(); klick(treffer); waehleWerkzeug(name); setzeBauwerk(b); aendereMit(fn); loescheAuswahl(); dreheAuswahl(winkel?); rueckgaengig(); wiederholen(); markiere(ids); zeigeMeldung(text); taste(taste, strg): boolean }`. Jede öffentliche Methode benachrichtigt die Beobachter genau einmal. Ein `RangeError` bei einer Änderung wird zur `meldung`, das Bauwerk bleibt unverändert.

- [ ] **Step 1: Failing test schreiben**

`src/editor/Editor.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_DREIBEIN } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { Editor, type EditorZustand } from './Editor';
import type { Treffer } from './SnapService';

const zaehler = (): ((p: string) => string) => {
  let n = 0;
  return (p) => `${p}-${++n}`;
};
const boden = (x: number, z: number): Treffer => ({ art: 'boden', punkt: new Vec3(x, 0, z) });
const neuerEditor = (anfang = Bauwerk.leer()): Editor => new Editor(anfang, { neueId: zaehler() });
const dreibein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);

describe('Editor', () => {
  it('setzt ein Dreibein per Bodenklick aufs Raster und wählt es aus', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('dreibein');
    e.klick(boden(1.03, 2.04));
    const z = e.zustand();
    expect(z.bauwerk.gruppen).toHaveLength(1);
    expect(z.auswahl).toBe('dreibein-1');
    expect(z.bauwerk.gruppe('dreibein-1')?.position.equals(new Vec3(1, 0, 2), 1e-9)).toBe(true);
  });

  it('setzt einen A-Bock und ignoriert Stangenklicks beim Platzieren', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('abock');
    e.klick({ art: 'stange', punkt: Vec3.NULL, stangeId: 'x' });
    expect(e.bauwerk.istLeer).toBe(true);
    e.klick(boden(0, 0));
    expect(e.bauwerk.gruppe('abock-1')?.typ).toBe('abock');
  });

  it('macht Änderungen rückgängig und wiederholt sie; die Auswahl verschwindet mit der Gruppe', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('dreibein');
    e.klick(boden(0, 0));
    expect(e.taste('z', true)).toBe(true);
    expect(e.bauwerk.istLeer).toBe(true);
    expect(e.zustand().auswahl).toBeNull();
    expect(e.zustand().kannWiederholen).toBe(true);
    expect(e.taste('Y', true)).toBe(true);
    expect(e.bauwerk.gruppen).toHaveLength(1);
  });

  it('zieht eine Stange vom Boden zur Dreibein-Spitze und bindet sie dort an', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    const spitze = dreibein.spitze();
    e.waehleWerkzeug('stange');
    e.klick(boden(3, 0));
    expect(e.zustand().stangenStart?.equals(new Vec3(3, 0, 0), 1e-9)).toBe(true);
    e.klick({ art: 'stange', punkt: spitze.add(new Vec3(0.05, 0, 0)), stangeId: 'd-bein-0' });
    const s = e.bauwerk.stange('stange-1');
    expect(s?.start.equals(new Vec3(3, 0, 0), 1e-9)).toBe(true);
    expect(s?.naechsterPunkt(spitze).distanceTo(spitze)).toBeLessThan(1e-9);
    expect(s?.laenge).toBeCloseTo(new Vec3(3, 0, 0).distanceTo(spitze) + 0.2, 9);
    expect(e.bauwerk.buende().some((b) => b.enthaelt('stange-1'))).toBe(true);
    expect(e.zustand().auswahl).toBe('stange-1');
  });

  it('ignoriert eine Stange, deren zwei Klicks fast auf denselben Punkt fallen', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('stange');
    e.klick(boden(1, 1));
    e.klick(boden(1.02, 1.01));
    expect(e.bauwerk.istLeer).toBe(true);
    expect(e.zustand().stangenStart).toBeNull();
    expect(e.zustand().meldung).toBeNull();
  });

  it('meldet unsinnige Parameter und lässt das Bauwerk unverändert', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.aendereMit((b) => b.ersetzeGruppe(dreibein.mitParams({ ...STANDARD_DREIBEIN, fusskreisradius: 9 })));
    expect(e.zustand().meldung).toMatch(/Fußkreisradius/);
    expect((e.bauwerk.gruppe('d') as Dreibein).params.fusskreisradius).toBe(0.7);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('wählt per Klick die ganze Gruppe, dreht sie mit R und löscht sie mit Entf', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.klick({ art: 'stange', punkt: Vec3.NULL, stangeId: 'd-bein-1' });
    expect(e.zustand().auswahl).toBe('d');
    expect(e.taste('r', false)).toBe(true);
    expect(e.bauwerk.gruppe('d')?.drehung).toBeCloseTo(Math.PI / 12, 9);
    expect(e.taste('Delete', false)).toBe(true);
    expect(e.bauwerk.istLeer).toBe(true);
    expect(e.zustand().auswahl).toBeNull();
  });

  it('hebt die Auswahl bei Bodenklick auf und tut ohne Auswahl bei Entf und R nichts', () => {
    const e = neuerEditor(Bauwerk.leer().mitGruppe(dreibein));
    e.klick({ art: 'stange', punkt: Vec3.NULL, stangeId: 'd-bein-0' });
    e.klick(boden(5, 5));
    expect(e.zustand().auswahl).toBeNull();
    e.taste('Delete', false);
    e.taste('r', false);
    expect(e.bauwerk.gruppen).toHaveLength(1);
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('bricht mit Escape das Stange-Ziehen ab und lässt fremde Tasten durch', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('stange');
    e.klick(boden(1, 1));
    expect(e.taste('Escape', false)).toBe(true);
    expect(e.zustand().stangenStart).toBeNull();
    expect(e.taste('q', false)).toBe(false);
  });

  it('benachrichtigt Beobachter, markiert Teile und zeigt Meldungen', () => {
    const e = neuerEditor();
    const zustaende: EditorZustand[] = [];
    e.abonniere((z) => zustaende.push(z));
    e.markiere(['x']);
    e.zeigeMeldung('Hallo');
    expect(zustaende).toHaveLength(3);
    expect(zustaende[1]?.markiert.has('x')).toBe(true);
    expect(zustaende[2]?.meldung).toBe('Hallo');
  });

  it('ersetzt das Bauwerk rückgängig machbar', () => {
    const e = neuerEditor();
    e.setzeBauwerk(Bauwerk.leer().mitGruppe(dreibein));
    expect(e.bauwerk.gruppen).toHaveLength(1);
    e.rueckgaengig();
    expect(e.bauwerk.istLeer).toBe(true);
    e.wiederholen();
    expect(e.bauwerk.gruppen).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/editor/Editor.test.ts`
Expected: FAIL, `./Editor` fehlt.

- [ ] **Step 3: Werkzeuge implementieren**

`src/editor/Werkzeuge.ts`:

```ts
import { ABock } from '../model/ABock';
import type { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { FUSS_TOLERANZ, MIN_STANGENLAENGE, STANDARD_DURCHMESSER, STANGEN_UEBERSTAND } from '../model/konstanten';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import type { SnapPunkt, SnapService, Treffer } from './SnapService';

export type WerkzeugName = 'dreibein' | 'abock' | 'stange' | 'auswahl';

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

/** Zwei Klicks auf Einrastpunkte ergeben eine freie Stange; am Boden ohne Überstand. */
export class DrawStangeTool implements Werkzeug {
  readonly name = 'stange' as const;
  private start: SnapPunkt | null = null;

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
    if (start.punkt.distanceTo(punkt.punkt) < MIN_STANGENLAENGE) return;
    const stange = Stange.zwischen(
      k.neueId('stange'),
      start.punkt,
      punkt.punkt,
      STANDARD_DURCHMESSER,
      this.ueberstand(start),
      this.ueberstand(punkt),
    );
    k.aendere(k.bauwerk.mitStange(stange));
    k.waehle(stange.id);
  }

  abbrechen(): void {
    this.start = null;
  }

  private ueberstand(p: SnapPunkt): number {
    return p.punkt.y <= FUSS_TOLERANZ ? 0 : STANGEN_UEBERSTAND;
  }
}

/** Klick auf eine Stange wählt sie (bzw. ihre Gruppe), Klick auf den Boden hebt die Auswahl auf. */
export class SelectTool implements Werkzeug {
  readonly name = 'auswahl' as const;
  readonly angefangen: Vec3 | null = null;

  onKlick(treffer: Treffer, k: EditorKontext): void {
    k.waehle(treffer.art === 'stange' ? k.bauwerk.auswahlIdFuer(treffer.stangeId) : null);
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
    case 'auswahl':
      return new SelectTool();
  }
}
```

- [ ] **Step 4: Editor implementieren**

`src/editor/Editor.ts`:

```ts
import type { Bauwerk } from '../model/Bauwerk';
import type { Vec3 } from '../model/Vec3';
import { DREH_SCHRITT } from './konstanten';
import { SnapService, type Treffer } from './SnapService';
import { Verlauf } from './Verlauf';
import { type EditorKontext, erzeugeWerkzeug, type Werkzeug, type WerkzeugName } from './Werkzeuge';

export interface EditorZustand {
  readonly bauwerk: Bauwerk;
  readonly auswahl: string | null;
  readonly markiert: ReadonlySet<string>;
  readonly werkzeug: WerkzeugName;
  readonly stangenStart: Vec3 | null;
  readonly meldung: string | null;
  readonly kannRueckgaengig: boolean;
  readonly kannWiederholen: boolean;
}

export interface EditorOptionen {
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
  private verlauf: Verlauf<Bauwerk>;
  private auswahlId: string | null = null;
  private markiertIds: ReadonlySet<string> = new Set();
  private werkzeug: Werkzeug = erzeugeWerkzeug('auswahl');
  private meldung: string | null = null;
  private readonly beobachter: ((z: EditorZustand) => void)[] = [];
  private readonly idErzeuger: (praefix: string) => string;

  constructor(anfang: Bauwerk, optionen: EditorOptionen = {}) {
    this.verlauf = Verlauf.start(anfang);
    this.snap = optionen.snap ?? new SnapService();
    this.idErzeuger = optionen.neueId ?? zufallsId;
  }

  get bauwerk(): Bauwerk {
    return this.verlauf.aktuell;
  }

  aendere(neu: Bauwerk): void {
    this.verlauf = this.verlauf.mit(neu);
    this.markiertIds = new Set();
  }

  waehle(id: string | null): void {
    this.auswahlId = id;
  }

  neueId(praefix: string): string {
    return this.idErzeuger(praefix);
  }

  abonniere(beobachter: (z: EditorZustand) => void): void {
    this.beobachter.push(beobachter);
    beobachter(this.zustand());
  }

  zustand(): EditorZustand {
    const auswahl = this.auswahlId !== null && this.bauwerk.enthaelt(this.auswahlId) ? this.auswahlId : null;
    return {
      bauwerk: this.bauwerk,
      auswahl,
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
    this.werkzeug = erzeugeWerkzeug(name);
    this.melde();
  }

  setzeBauwerk(bauwerk: Bauwerk): void {
    this.fuehreAus(() => {
      this.auswahlId = null;
      this.aendere(bauwerk);
    });
  }

  /** Änderung aus dem Parameter-Panel. Die Änderung selbst muss innerhalb der Funktion passieren, damit ein RangeError abgefangen wird. */
  aendereMit(aenderung: (b: Bauwerk) => Bauwerk): void {
    this.fuehreAus(() => this.aendere(aenderung(this.bauwerk)));
  }

  loescheAuswahl(): void {
    const id = this.zustand().auswahl;
    if (id === null) return;
    this.fuehreAus(() => {
      this.auswahlId = null;
      this.aendere(this.bauwerk.ohne(id));
    });
  }

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
      this.auswahlId = null;
      this.melde();
    } else return false;
    return true;
  }

  private fuehreAus(aktion: () => void): void {
    try {
      aktion();
      this.meldung = null;
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
      this.meldung = e.message;
    }
    this.melde();
  }

  private melde(): void {
    const z = this.zustand();
    this.beobachter.forEach((b) => b(z));
  }
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/editor`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/editor/Werkzeuge.ts src/editor/Editor.ts src/editor/Editor.test.ts
git commit -m "feat: add editor controller with place, draw and select tools"
```

### Task 8: 3D-Szene, Layout und Grundverdrahtung

**Files:**
- Modify: `index.html` (ganz ersetzen), `src/style.css` (ganz ersetzen), `src/main.ts` (ganz ersetzen)
- Create: `src/editor/Szene.ts`
- Test: manuell im Browser (three.js/WebGL wird nicht unit-getestet)

**Interfaces:**
- Consumes: `Editor`, `EditorZustand`, `WerkzeugName`, `Treffer`, `KLICK_TOLERANZ_PX`, `Bauwerk`, `Stange`, `Bund`, `Vec3`, `kochstelle()`
- Produces:
  - `class Szene { constructor(container: HTMLElement); get leinwand(): HTMLCanvasElement; zeige(bauwerk, markiert: ReadonlySet<string>, stangenStart: Vec3 | null): void; treffer(e: PointerEvent): Treffer | null }`. Eine Stange ist markiert, wenn ihre ID oder ihre `gruppeId` in `markiert` steht.
  - DOM-IDs, die spätere Tasks verwenden: `#ansicht`, `#parameter`, `#hinweise`, `#stangenliste`, `#meldung`, `#btn-beispiel`, `#btn-rueck`, `#btn-wieder`, `#btn-teilen`, `#btn-speichern`, `#inp-laden`, `#btn-bearbeiten`, Knöpfe `[data-werkzeug]`. Die CSS-Klassen `nur-editor` und `nur-ansicht` sowie `body.ansicht` schalten den Modus.

- [ ] **Step 1: `index.html` ersetzen**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lagerbau-Simulator</title>
  </head>
  <body>
    <header class="kopf">
      <h1>Lagerbau-Simulator</h1>
      <nav class="nur-editor">
        <button id="btn-beispiel">Beispiel laden</button>
        <button id="btn-rueck" title="Strg+Z">Rückgängig</button>
        <button id="btn-wieder" title="Strg+Y">Wiederholen</button>
        <button id="btn-teilen">Link kopieren</button>
        <button id="btn-speichern">Speichern</button>
        <label class="datei">Laden<input id="inp-laden" type="file" accept="application/json,.json" hidden /></label>
      </nav>
      <button id="btn-bearbeiten" class="nur-ansicht">Bearbeiten</button>
    </header>
    <aside class="links nur-editor">
      <h2>Bauteile</h2>
      <button data-werkzeug="auswahl">Auswählen</button>
      <button data-werkzeug="dreibein">Dreibein setzen</button>
      <button data-werkzeug="abock">A-Bock setzen</button>
      <button data-werkzeug="stange">Stange ziehen</button>
      <section id="parameter"></section>
    </aside>
    <main id="ansicht"></main>
    <aside class="rechts">
      <h2>Hinweise</h2>
      <ul id="hinweise"></ul>
      <h2>Stangenliste</h2>
      <table id="stangenliste"></table>
    </aside>
    <footer>Planungshilfe. Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.</footer>
    <p id="meldung" role="status"></p>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: `src/style.css` ersetzen**

```css
:root {
  --text: #1d2733;
  --hinter: #f4f6f8;
  --rand: #c9d3dc;
  --warn: #b45309;
  --akzent: #2f6f3e;
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  font-family: system-ui, sans-serif;
  color: var(--text);
  background: var(--hinter);
  display: grid;
  grid-template-columns: 220px 1fr 280px;
  grid-template-rows: auto 1fr auto;
  grid-template-areas: 'kopf kopf kopf' 'links ansicht rechts' 'fuss fuss fuss';
}
.kopf { grid-area: kopf; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 16px; background: #fff; border-bottom: 1px solid var(--rand); }
.kopf h1 { font-size: 1.1rem; margin: 0 16px 0 0; }
.kopf nav { display: flex; flex-wrap: wrap; gap: 8px; }
.links { grid-area: links; padding: 12px; background: #fff; border-right: 1px solid var(--rand); overflow-y: auto; }
.rechts { grid-area: rechts; padding: 12px; background: #fff; border-left: 1px solid var(--rand); overflow-y: auto; }
#ansicht { grid-area: ansicht; position: relative; min-height: 0; min-width: 0; }
#ansicht canvas { display: block; width: 100%; height: 100%; }
footer { grid-area: fuss; padding: 6px 16px; font-size: 0.85rem; background: #fff7e6; border-top: 1px solid #f0d9a8; }
h2 { font-size: 0.95rem; margin: 12px 0 6px; }
button, .datei { font: inherit; padding: 4px 10px; border: 1px solid var(--rand); border-radius: 4px; background: #fff; cursor: pointer; }
button[aria-pressed='true'] { background: var(--akzent); color: #fff; border-color: var(--akzent); }
button:disabled { opacity: 0.5; cursor: default; }
.links button { display: block; width: 100%; margin-bottom: 6px; text-align: left; }
label.feld { display: block; margin-bottom: 8px; font-size: 0.9rem; }
label.feld input { display: block; width: 100%; }
#hinweise { list-style: none; padding: 0; margin: 0; }
#hinweise li { padding: 6px 8px; margin-bottom: 6px; border-left: 4px solid var(--rand); background: var(--hinter); cursor: pointer; }
#hinweise li.warnung { border-left-color: var(--warn); }
#stangenliste { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
#stangenliste th, #stangenliste td { padding: 2px 4px; text-align: right; border-bottom: 1px solid var(--rand); }
#meldung { position: fixed; left: 50%; bottom: 48px; transform: translateX(-50%); margin: 0; padding: 6px 12px; background: var(--text); color: #fff; border-radius: 4px; }
#meldung:empty { display: none; }
body.ansicht { grid-template-columns: 1fr 280px; grid-template-areas: 'kopf kopf' 'ansicht rechts' 'fuss fuss'; }
body.ansicht .nur-editor, body:not(.ansicht) .nur-ansicht { display: none; }
@media (max-width: 767px) {
  body, body.ansicht { grid-template-columns: 1fr; grid-template-rows: auto 60vh auto auto; grid-template-areas: 'kopf' 'ansicht' 'rechts' 'fuss'; }
  #btn-bearbeiten { display: none; }
}
```

- [ ] **Step 3: `src/editor/Szene.ts` anlegen**

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Bauwerk } from '../model/Bauwerk';
import type { Bund } from '../model/Bund';
import type { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import type { Treffer } from './SnapService';

const HOLZ = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
const MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f });
const SEIL = new THREE.MeshLambertMaterial({ color: 0xe8d9a0 });
const START = new THREE.MeshLambertMaterial({ color: 0x2f6f3e });
const Y_ACHSE = new THREE.Vector3(0, 1, 0);

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
    if (stangenStart) this.bau.add(this.kugel(stangenStart, 0.1, START));
  }

  treffer(e: PointerEvent): Treffer | null {
    const rect = this.leinwand.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kamera);
    const stangen = this.bau.children.filter((k) => typeof k.userData.stangeId === 'string');
    const aufStange = this.raycaster.intersectObjects(stangen, false)[0];
    if (aufStange) {
      const p = aufStange.point;
      return { art: 'stange', punkt: new Vec3(p.x, p.y, p.z), stangeId: aufStange.object.userData.stangeId as string };
    }
    const aufBoden = this.raycaster.intersectObject(this.boden, false)[0];
    return aufBoden ? { art: 'boden', punkt: new Vec3(aufBoden.point.x, 0, aufBoden.point.z) } : null;
  }

  private stangenMesh(s: Stange, markiert: boolean): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(s.durchmesser / 2, s.durchmesser / 2, s.laenge, 12), markiert ? MARKIERT : HOLZ);
    const mitte = s.start.add(s.ende).scale(0.5);
    const r = s.richtung;
    mesh.position.set(mitte.x, mitte.y, mitte.z);
    mesh.quaternion.setFromUnitVectors(Y_ACHSE, new THREE.Vector3(r.x, r.y, r.z));
    mesh.userData.stangeId = s.id;
    return mesh;
  }

  private kugel(p: Bund['position'], radius: number, material: THREE.Material): THREE.Mesh {
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

- [ ] **Step 4: `src/main.ts` ersetzen (Grundverdrahtung)**

```ts
import './style.css';
import { kochstelle } from './beispiele/kochstelle';
import { Editor } from './editor/Editor';
import { KLICK_TOLERANZ_PX } from './editor/konstanten';
import { Szene } from './editor/Szene';
import type { WerkzeugName } from './editor/Werkzeuge';
import { Bauwerk } from './model/Bauwerk';

function element<T extends HTMLElement>(selektor: string): T {
  const el = document.querySelector<T>(selektor);
  if (!el) throw new Error(`Element ${selektor} fehlt in index.html`);
  return el;
}

const editor = new Editor(Bauwerk.leer());
const szene = new Szene(element('#ansicht'));
const meldung = element<HTMLParagraphElement>('#meldung');
const werkzeugKnoepfe = [...document.querySelectorAll<HTMLButtonElement>('[data-werkzeug]')];

// Ein Klick ist ein Drücken und Loslassen ohne nennenswerte Mausbewegung; alles andere dreht die Ansicht.
let druck: { x: number; y: number } | null = null;
szene.leinwand.addEventListener('pointerdown', (e) => {
  druck = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
});
szene.leinwand.addEventListener('pointerup', (e) => {
  if (druck && Math.hypot(e.clientX - druck.x, e.clientY - druck.y) < KLICK_TOLERANZ_PX) {
    const treffer = szene.treffer(e);
    if (treffer) editor.klick(treffer);
  }
  druck = null;
});

for (const knopf of werkzeugKnoepfe) {
  knopf.addEventListener('click', () => editor.waehleWerkzeug(knopf.dataset.werkzeug as WerkzeugName));
}
element('#btn-beispiel').addEventListener('click', () => editor.setzeBauwerk(kochstelle()));
element('#btn-rueck').addEventListener('click', () => editor.rueckgaengig());
element('#btn-wieder').addEventListener('click', () => editor.wiederholen());
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (editor.taste(e.key, e.ctrlKey || e.metaKey)) e.preventDefault();
});

editor.abonniere((z) => {
  const markiert = new Set(z.markiert);
  if (z.auswahl) markiert.add(z.auswahl);
  szene.zeige(z.bauwerk, markiert, z.stangenStart);
  for (const knopf of werkzeugKnoepfe) knopf.setAttribute('aria-pressed', String(knopf.dataset.werkzeug === z.werkzeug));
  element<HTMLButtonElement>('#btn-rueck').disabled = !z.kannRueckgaengig;
  element<HTMLButtonElement>('#btn-wieder').disabled = !z.kannWiederholen;
  meldung.textContent = z.meldung ?? (z.stangenStart ? 'Stange: zweiten Punkt anklicken (Esc bricht ab)' : '');
});
```

- [ ] **Step 5: Typprüfung und Build**

Run: `npm run build`
Expected: exit 0 (tsc ohne Fehler, `dist/` erzeugt).

- [ ] **Step 6: Manuell prüfen**

Run: `npm run dev` und `http://localhost:5173/lagerbau-simulator/` öffnen. Prüfen:
1. „Beispiel laden“ zeigt A-Bock, Dreibein und First mit hellen Bund-Kugeln an beiden Spitzen und am Riegel.
2. Ziehen mit der Maus dreht die Ansicht, das Mausrad zoomt, und dabei wird nichts ausgewählt.
3. „Auswählen“ + Klick auf ein Dreibein-Bein färbt alle drei Beine orange. R dreht, Entf löscht, Strg+Z holt es zurück.
4. „Dreibein setzen“ + Bodenklick setzt ein Dreibein. „Stange ziehen“: Klick auf den Boden zeigt eine grüne Startkugel, Klick auf eine Spitze erzeugt die Stange und eine Bund-Kugel.
5. Fußzeile sichtbar.

Weicht etwas ab: den Fehler beheben, bevor es weitergeht. Eine technische Sackgasse gehört in `CLAUDE.md` → Known Issues.

- [ ] **Step 7: Commit**

```bash
git add index.html src/style.css src/main.ts src/editor/Szene.ts
git commit -m "feat: add 3D scene, layout and editor wiring"
```

### Task 9: Parameter-Panel, Teilen, Ansichtsmodus

**Files:**
- Create: `src/ui/ParameterPanel.ts`, `src/ui/Teilen.ts`, `src/ui/AnsichtsModus.ts`
- Modify: `src/main.ts` (ganz ersetzen)
- Test: manuell im Browser (reines DOM-Verdrahten; die Logik dahinter ist in Task 5 und 7 getestet)

**Interfaces:**
- Consumes: `Editor`, `EditorZustand`, `Dreibein`, `ABock`, `Bauwerk`, `BauwerkSerializer`, `UrlCodec`, `Szene`, `kochstelle()`
- Produces:
  - `class ParameterPanel { constructor(wurzel, editor); zeige(z: EditorZustand): void }`
  - `class Teilen { link(b): string; kopiereLink(b): Promise<void>; speichere(b): void; lade(datei: File): Promise<Bauwerk>; ausAdresse(): Bauwerk | null }`
  - `const SCHMAL_PX = 768`; `class AnsichtsModus { constructor(body); get istSchmal; get aktiv; setze(ansicht: boolean) }`. Auf schmalen Bildschirmen ist der Modus immer „Ansicht“.

- [ ] **Step 1: `src/ui/ParameterPanel.ts` anlegen**

```ts
import type { Editor, EditorZustand } from '../editor/Editor';
import { ABock } from '../model/ABock';
import { Dreibein } from '../model/Dreibein';

interface Feld<P> {
  readonly schluessel: keyof P & string;
  readonly label: string;
  readonly faktor: number; // Anzeige = Modellwert × faktor (Ø in cm, Rest in m)
}

/** Formular für die ausgewählte Baugruppe oder freie Stange. Ungültige Werte meldet der Editor. */
export class ParameterPanel {
  constructor(
    private readonly wurzel: HTMLElement,
    private readonly editor: Editor,
  ) {}

  zeige(z: EditorZustand): void {
    this.wurzel.replaceChildren();
    if (z.auswahl === null) return;
    const gruppe = z.bauwerk.gruppe(z.auswahl);
    if (gruppe instanceof Dreibein) {
      this.formular(
        'Dreibein',
        [
          { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
          { schluessel: 'fusskreisradius', label: 'Fußkreisradius (m)', faktor: 1 },
          { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
        ],
        gruppe.params,
        (p) => this.editor.aendereMit((b) => b.ersetzeGruppe(gruppe.mitParams(p))),
        `Höhe ${gruppe.hoehe().toFixed(2)} m · Beinwinkel ${gruppe.beinwinkelGrad().toFixed(0)}° · R dreht`,
      );
    } else if (gruppe instanceof ABock) {
      this.formular(
        'A-Bock',
        [
          { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
          { schluessel: 'fussabstand', label: 'Fußabstand (m)', faktor: 1 },
          { schluessel: 'riegelhoehe', label: 'Riegelhöhe (m)', faktor: 1 },
          { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
        ],
        gruppe.params,
        (p) => this.editor.aendereMit((b) => b.ersetzeGruppe(gruppe.mitParams(p))),
        `Höhe ${gruppe.hoehe().toFixed(2)} m · Beinwinkel ${gruppe.beinwinkelGrad().toFixed(0)}° · R dreht`,
      );
    } else {
      const stange = z.bauwerk.stange(z.auswahl);
      if (!stange) return;
      this.formular(
        'Stange',
        [{ schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 }],
        { durchmesser: stange.durchmesser },
        (p) => this.editor.aendereMit((b) => b.ersetzeStange(stange.mitDurchmesser(p.durchmesser))),
        `Länge ${stange.laenge.toFixed(2)} m`,
      );
    }
  }

  private formular<P extends object>(
    titel: string,
    felder: readonly Feld<P>[],
    werte: P,
    uebernehme: (neu: P) => void,
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
      input.value = String(Math.round((werte[feld.schluessel] as number) * feld.faktor * 1000) / 1000);
      input.addEventListener('change', () => uebernehme({ ...werte, [feld.schluessel]: Number(input.value) / feld.faktor }));
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

- [ ] **Step 2: `src/ui/Teilen.ts` anlegen**

```ts
import type { Bauwerk } from '../model/Bauwerk';
import { BauwerkSerializer } from '../share/BauwerkSerializer';
import { UrlCodec } from '../share/UrlCodec';

/** Link kopieren, als Datei speichern und laden. */
export class Teilen {
  constructor(
    private readonly codec = new UrlCodec(),
    private readonly serializer = new BauwerkSerializer(),
  ) {}

  link(bauwerk: Bauwerk): string {
    return `${location.origin}${location.pathname}${this.codec.alsHash(bauwerk)}`;
  }

  async kopiereLink(bauwerk: Bauwerk): Promise<void> {
    await navigator.clipboard.writeText(this.link(bauwerk));
  }

  speichere(bauwerk: Bauwerk): void {
    const blob = new Blob([JSON.stringify(this.serializer.zuJson(bauwerk), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lagerbau.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async lade(datei: File): Promise<Bauwerk> {
    let daten: unknown;
    try {
      daten = JSON.parse(await datei.text());
    } catch {
      throw new Error('Die Datei ist kein gültiges JSON');
    }
    return this.serializer.ausJson(daten);
  }

  /** Bauwerk aus dem aktuellen Adress-Hash, null wenn keiner da ist. Wirft bei kaputtem Link. */
  ausAdresse(): Bauwerk | null {
    return this.codec.ausHash(location.hash);
  }
}
```

- [ ] **Step 3: `src/ui/AnsichtsModus.ts` anlegen**

```ts
export const SCHMAL_PX = 768;

/** Schaltet zwischen Editor und reiner Ansicht (geteilter Link, Handy). */
export class AnsichtsModus {
  constructor(private readonly body: HTMLElement) {}

  get istSchmal(): boolean {
    return window.matchMedia(`(max-width: ${SCHMAL_PX - 1}px)`).matches;
  }

  get aktiv(): boolean {
    return this.body.classList.contains('ansicht');
  }

  setze(ansicht: boolean): void {
    this.body.classList.toggle('ansicht', ansicht || this.istSchmal);
  }
}
```

- [ ] **Step 4: `src/main.ts` ersetzen**

```ts
import './style.css';
import { kochstelle } from './beispiele/kochstelle';
import { Editor } from './editor/Editor';
import { KLICK_TOLERANZ_PX } from './editor/konstanten';
import { Szene } from './editor/Szene';
import type { WerkzeugName } from './editor/Werkzeuge';
import { Bauwerk } from './model/Bauwerk';
import { AnsichtsModus } from './ui/AnsichtsModus';
import { ParameterPanel } from './ui/ParameterPanel';
import { Teilen } from './ui/Teilen';

const MELDUNG_DAUER_MS = 4000;

function element<T extends HTMLElement>(selektor: string): T {
  const el = document.querySelector<T>(selektor);
  if (!el) throw new Error(`Element ${selektor} fehlt in index.html`);
  return el;
}

const editor = new Editor(Bauwerk.leer());
const szene = new Szene(element('#ansicht'));
const modus = new AnsichtsModus(document.body);
const teilen = new Teilen();
const parameter = new ParameterPanel(element('#parameter'), editor);
const meldung = element<HTMLParagraphElement>('#meldung');
const werkzeugKnoepfe = [...document.querySelectorAll<HTMLButtonElement>('[data-werkzeug]')];

function ladeAusAdresse(): void {
  try {
    const bauwerk = teilen.ausAdresse();
    if (bauwerk) editor.setzeBauwerk(bauwerk);
    modus.setze(bauwerk !== null);
  } catch (e) {
    modus.setze(false);
    editor.zeigeMeldung((e as Error).message);
  }
}

// Ein Klick ist ein Drücken und Loslassen ohne nennenswerte Mausbewegung; alles andere dreht die Ansicht.
let druck: { x: number; y: number } | null = null;
szene.leinwand.addEventListener('pointerdown', (e) => {
  druck = e.button === 0 && !modus.aktiv ? { x: e.clientX, y: e.clientY } : null;
});
szene.leinwand.addEventListener('pointerup', (e) => {
  if (druck && Math.hypot(e.clientX - druck.x, e.clientY - druck.y) < KLICK_TOLERANZ_PX) {
    const treffer = szene.treffer(e);
    if (treffer) editor.klick(treffer);
  }
  druck = null;
});

for (const knopf of werkzeugKnoepfe) {
  knopf.addEventListener('click', () => editor.waehleWerkzeug(knopf.dataset.werkzeug as WerkzeugName));
}
element('#btn-beispiel').addEventListener('click', () => editor.setzeBauwerk(kochstelle()));
element('#btn-rueck').addEventListener('click', () => editor.rueckgaengig());
element('#btn-wieder').addEventListener('click', () => editor.wiederholen());
element('#btn-bearbeiten').addEventListener('click', () => modus.setze(false));
element('#btn-speichern').addEventListener('click', () => teilen.speichere(editor.bauwerk));
element('#btn-teilen').addEventListener('click', async () => {
  const bauwerk = editor.bauwerk;
  history.replaceState(null, '', teilen.link(bauwerk));
  try {
    await teilen.kopiereLink(bauwerk);
    editor.zeigeMeldung('Link kopiert.');
  } catch {
    editor.zeigeMeldung('Kopieren nicht möglich. Der Link steht in der Adresszeile.');
  }
});
element<HTMLInputElement>('#inp-laden').addEventListener('change', async (e) => {
  const input = e.currentTarget as HTMLInputElement;
  const datei = input.files?.[0];
  input.value = '';
  if (!datei) return;
  try {
    editor.setzeBauwerk(await teilen.lade(datei));
  } catch (fehler) {
    editor.zeigeMeldung((fehler as Error).message);
  }
});
window.addEventListener('keydown', (e) => {
  if (modus.aktiv || e.target instanceof HTMLInputElement) return;
  if (editor.taste(e.key, e.ctrlKey || e.metaKey)) e.preventDefault();
});
window.addEventListener('hashchange', ladeAusAdresse);

let meldungsTimer: number | undefined;
editor.abonniere((z) => {
  const markiert = new Set(z.markiert);
  if (z.auswahl) markiert.add(z.auswahl);
  szene.zeige(z.bauwerk, markiert, z.stangenStart);
  parameter.zeige(z);
  for (const knopf of werkzeugKnoepfe) knopf.setAttribute('aria-pressed', String(knopf.dataset.werkzeug === z.werkzeug));
  element<HTMLButtonElement>('#btn-rueck').disabled = !z.kannRueckgaengig;
  element<HTMLButtonElement>('#btn-wieder').disabled = !z.kannWiederholen;
  meldung.textContent = z.meldung ?? (z.stangenStart ? 'Stange: zweiten Punkt anklicken (Esc bricht ab)' : '');
  if (z.meldung) {
    clearTimeout(meldungsTimer);
    meldungsTimer = window.setTimeout(() => editor.zeigeMeldung(null), MELDUNG_DAUER_MS);
  }
});

ladeAusAdresse();
```

- [ ] **Step 5: Typprüfung, Tests, Build**

Run: `npm test && npm run build`
Expected: Alle Unit-Tests grün, Abdeckung ≥ 80 %, Build exit 0.

- [ ] **Step 6: Manuell prüfen**

Run: `npm run dev`, dann prüfen:
1. Dreibein auswählen, im Panel „Fußkreisradius“ auf 3 setzen: Es erscheint eine Meldung mit „Fußkreisradius …“, das Dreibein bleibt unverändert. Mit 0,9 wird es breiter.
2. „Link kopieren“: Die Meldung „Link kopiert.“ erscheint und verschwindet nach 4 s. Der Link in einem neuen Tab öffnet denselben Bau **im Ansichtsmodus** (keine Palette, ein Knopf „Bearbeiten“). „Bearbeiten“ schaltet zum Editor.
3. Im Ansichtsmodus ändern Klicks und Entf nichts.
4. „Speichern“ lädt `lagerbau.json` herunter, „Laden“ derselben Datei stellt den Bau wieder her. Eine beliebige andere Datei löst die Meldung „Die Datei ist kein gültiges JSON“ bzw. „Ungültige Bauwerk-Daten: …“ aus.
5. Ein Link mit abgeschnittenem Hash (`#b=abc`) zeigt die Meldung „Link ist beschädigt“ und eine leere Szene.
6. Mit den DevTools auf 400 px Breite: Die Ansicht wird gestapelt, es gibt keine Palette, die Fußzeile ist sichtbar.

- [ ] **Step 7: Commit**

```bash
git add src/ui/ParameterPanel.ts src/ui/Teilen.ts src/ui/AnsichtsModus.ts src/main.ts
git commit -m "feat: add parameter panel, share link, file save/load and view mode"
```

### Task 10: Deploy über GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: npm-Skripte `test` und `build` (Task 1)
- Produces: Bei jedem Push auf `main` gilt: Test → Build → Pages. Die URL ist `https://jakobsch42k.github.io/lagerbau-simulator/`.

- [ ] **Step 1: Workflow anlegen**

`.github/workflows/deploy.yml`:

```yaml
name: Test und Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Die Action-Versionen sind die zum Planungszeitpunkt aktuellen Hauptversionen. Meldet GitHub eine veraltete Version, auf die angezeigte neue Hauptversion anheben.

- [ ] **Step 2: README anlegen**

`README.md`:

```markdown
# Lagerbau-Simulator

3D-Planer für Pfadfinder-Lagerbauten (Dreibein, A-Bock, freie Stangen) mit Faustregel-Hinweisen.
**Planungshilfe. Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.**

Online: https://jakobsch42k.github.io/lagerbau-simulator/

## Entwickeln

    npm install
    npm run dev        # http://localhost:5173/lagerbau-simulator/
    npm test           # Unit-Tests + Abdeckung
    npm run e2e        # Browser-Smoke-Test (vorher einmal: npx playwright install chromium)
```

- [ ] **Step 3: Workflow-Syntax lokal plausibilisieren und committen**

Run: `npm test && npm run build`
Expected: grün (dieselben Schritte wie im Workflow).

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: test, build and deploy to GitHub Pages"
```

- [ ] **Step 4: Veröffentlichen (NUR nach ausdrücklicher Freigabe durch Jakob)**

Das Repo ist öffentlich und nach außen sichtbar. Vorher Jakob fragen. Nach seinem Ja:

```bash
gh repo create jakobsch42k/lagerbau-simulator --public --source . --remote origin --push
gh api -X POST repos/jakobsch42k/lagerbau-simulator/pages -f build_type=workflow
gh run watch --exit-status
```

Expected: Der Workflow-Lauf ist grün, und `https://jakobsch42k.github.io/lagerbau-simulator/` lädt die App. Anschließend am Handy den geteilten Link der Kochstelle öffnen: Die Ansicht muss sich drehen lassen und die Fußzeile zeigen.

**Ende Meilenstein 1 → Walkthrough 1 mit Jakob:** Datenmodell (`src/model`), Editor-Controller und Teilen erklären. Jakob reviewt den Diff (`git log --oneline`, `git diff <M0-commit>..HEAD -- src/model src/editor`). Jeder gefundene KI-Fehler kommt in `docs/ki-lernlog.md`.

---

# Meilenstein 2 (bis 08.11.2026)

> Voraussetzung: Jakob hat die Faustregeln R1–R5 bestätigt oder geändert und die Schwellwerte geliefert (Termin 11.10.2026). Seine Werte ersetzen die Startwerte in `src/rules/constants.ts`. Weicht eine Regel inhaltlich von der Spec ab, wird zuerst die Spec angepasst und dann dieser Plan.

### Task 11: Regel-Grundlage: Hinweis, Analyse, Schwellwerte, 2D-Geometrie, RuleEngine

**Files:**
- Create: `src/rules/Rule.ts`, `src/rules/Analyse.ts`, `src/rules/constants.ts`, `src/rules/geometrie2d.ts`, `src/rules/RuleEngine.ts`
- Test: `src/rules/Analyse.test.ts`, `src/rules/geometrie2d.test.ts`, `src/rules/RuleEngine.test.ts`

**Interfaces:**
- Consumes: `Bauwerk`, `Bund`, `Fuss`, `Stange`, `kochstelle()`
- Produces:
  - `type Schwere = 'info' | 'warnung'`; `interface Hinweis { regel: string; schwere: Schwere; text: string; betroffeneTeile: readonly string[] }`. `betroffeneTeile` sind Stangen- oder Gruppen-IDs; die Szene markiert beides.
  - `interface Rule { name: string; pruefe(analyse: Analyse): readonly Hinweis[] }`; `hinweis(regel, text, teile, schwere = 'warnung'): Hinweis`
  - `class Analyse { bauwerk; stangen; buende; fuesse; stange(id): Stange; buendeVon(stangeId): Bund[]; fuesseVon(stangeId): Fuss[]; komponenten(): string[][] }`
  - `type P2 = readonly [number, number]`; `konvexeHuelle(punkte): P2[]`; `minimaleBreite(punkte): number` (0 bei weniger als 3 Hüllpunkten)
  - `class RuleEngine { constructor(regeln: readonly Rule[]); pruefe(bauwerk): Hinweis[] }`
  - `constants.ts`: `R1_MIN_WINKEL_ZUR_EBENE_GRAD`, `R2_PLANAR_TOLERANZ_RELATIV`, `R3_MAX_HOEHE_ZU_BREITE`, `R3_MIN_HOEHE`, `R4_MIN_BEINWINKEL_GRAD`, `R4_MAX_BEINWINKEL_GRAD`

- [ ] **Step 1: Schwellwerte eintragen**

`src/rules/constants.ts`. Wo Jakob bis 11.10. andere Werte geliefert hat, **seine** Werte eintragen und im Kommentar „CHECK MANUALLY“ durch „bestätigt Jakob <Datum>, Quelle …“ ersetzen:

```ts
/**
 * Schwellwerte der Faustregeln. Startwerte von Claude, jeder einzeln von Jakob zu bestätigen
 * (eigene Erfahrung + PPÖ-Infopedia). Nie ohne seine Rückmeldung als gesichert behandeln.
 */
export const R1_MIN_WINKEL_ZUR_EBENE_GRAD = 30; // CHECK MANUALLY: ab diesem Winkel zur A-Ebene hält eine Querverbindung den A-Bock seitlich
export const R2_PLANAR_TOLERANZ_RELATIV = 0.05; // CHECK MANUALLY: erlaubte Abweichung von der Ebene, relativ zur längsten Viereckseite
export const R3_MAX_HOEHE_ZU_BREITE = 2.5; // CHECK MANUALLY: Höhe ÷ kleinste Breite der Standfläche, darüber Kippgefahr
export const R3_MIN_HOEHE = 0.5; // m, CHECK MANUALLY: niedrigere Bauten werden nicht auf Kippen geprüft
export const R4_MIN_BEINWINKEL_GRAD = 10; // CHECK MANUALLY: steilere Beine → kippt leicht
export const R4_MAX_BEINWINKEL_GRAD = 35; // CHECK MANUALLY: flachere Beine → rutschen weg
```

- [ ] **Step 2: Failing tests schreiben**

`src/rules/geometrie2d.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { konvexeHuelle, minimaleBreite, type P2 } from './geometrie2d';

describe('konvexeHuelle', () => {
  it('lässt innere Punkte weg', () => {
    const huelle = konvexeHuelle([[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]]);
    expect(huelle).toHaveLength(4);
    expect(huelle).not.toContainEqual([0.5, 0.5]);
  });

  it('liefert bei weniger als drei Punkten die Punkte selbst', () => {
    expect(konvexeHuelle([[1, 2]])).toEqual([[1, 2]]);
  });
});

describe('minimaleBreite', () => {
  it('ist beim Einheitsquadrat 1', () => {
    expect(minimaleBreite([[0, 0], [1, 0], [1, 1], [0, 1]])).toBeCloseTo(1, 12);
  });

  it('ist beim gleichseitigen Dreieck 1,5 × Umkreisradius', () => {
    const r = 0.7;
    const ecken: P2[] = [0, 1, 2].map((i) => [r * Math.cos((i * 2 * Math.PI) / 3), r * Math.sin((i * 2 * Math.PI) / 3)] as const);
    expect(minimaleBreite(ecken)).toBeCloseTo(1.5 * r, 12);
  });

  it('ist 0 für Punkte auf einer Linie oder zwei Punkte', () => {
    expect(minimaleBreite([[0, 0], [1, 1], [2, 2]])).toBe(0);
    expect(minimaleBreite([[0, 0], [0, 1.6]])).toBe(0);
  });
});
```

`src/rules/Analyse.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Analyse } from './Analyse';

describe('Analyse', () => {
  const a = new Analyse(kochstelle());

  it('stellt Stangen, Bünde und Füße bereit', () => {
    expect(a.stangen).toHaveLength(7);
    expect(a.buendeVon('first')).toHaveLength(2);
    expect(a.fuesseVon('dreibein-bein-0')).toHaveLength(1);
    expect(a.stange('first').id).toBe('first');
    expect(() => a.stange('gibtsnicht')).toThrow(/fehlt/);
  });

  it('fasst über Bünde verbundene Stangen zu einem Bau zusammen', () => {
    expect(a.komponenten()).toHaveLength(1);
    const getrennt = new Analyse(kochstelle().ohne('first')).komponenten();
    expect(getrennt.map((k) => k.length).sort()).toEqual([3, 3]);
  });
});
```

`src/rules/RuleEngine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import type { Analyse } from './Analyse';
import { hinweis, type Rule } from './Rule';
import { RuleEngine } from './RuleEngine';

class ZaehlRegel implements Rule {
  constructor(readonly name: string) {}
  pruefe(a: Analyse) {
    return a.stangen.length > 0 ? [hinweis(this.name, `${a.stangen.length} Stangen`, [], 'info')] : [];
  }
}

describe('RuleEngine', () => {
  const engine = new RuleEngine([new ZaehlRegel('A'), new ZaehlRegel('B')]);

  it('sammelt die Hinweise aller Regeln in Reihenfolge', () => {
    const h = engine.pruefe(kochstelle());
    expect(h.map((x) => x.regel)).toEqual(['A', 'B']);
    expect(h[0]).toEqual({ regel: 'A', schwere: 'info', text: '7 Stangen', betroffeneTeile: [] });
  });

  it('liefert für ein leeres Bauwerk nichts', () => {
    expect(engine.pruefe(Bauwerk.leer())).toEqual([]);
  });

  it('setzt „warnung“ als Standard-Schwere', () => {
    expect(hinweis('X', 't', ['a']).schwere).toBe('warnung');
  });
});
```

- [ ] **Step 3: Tests laufen lassen, sie müssen fehlschlagen**

Run: `npx vitest run src/rules`
Expected: FAIL, `./geometrie2d`, `./Analyse`, `./Rule` und `./RuleEngine` fehlen.

- [ ] **Step 4: Implementieren**

`src/rules/Rule.ts`:

```ts
import type { Analyse } from './Analyse';

export type Schwere = 'info' | 'warnung';

export interface Hinweis {
  readonly regel: string;
  readonly schwere: Schwere;
  readonly text: string;
  /** Stangen- oder Gruppen-IDs, die in der 3D-Ansicht markiert werden. */
  readonly betroffeneTeile: readonly string[];
}

/** Eine Faustregel. Rechnet nichts aus, sondern erkennt typische Planungsfehler an der Geometrie. */
export interface Rule {
  readonly name: string;
  pruefe(analyse: Analyse): readonly Hinweis[];
}

export function hinweis(regel: string, text: string, betroffeneTeile: readonly string[], schwere: Schwere = 'warnung'): Hinweis {
  return { regel, schwere, text, betroffeneTeile };
}
```

`src/rules/Analyse.ts`:

```ts
import type { Bauwerk } from '../model/Bauwerk';
import type { Bund } from '../model/Bund';
import type { Fuss } from '../model/Fuss';
import type { Stange } from '../model/Stange';

/** Einmal pro Prüfung abgeleitete Daten, die alle Regeln teilen. */
export class Analyse {
  readonly stangen: readonly Stange[];
  readonly buende: readonly Bund[];
  readonly fuesse: readonly Fuss[];

  constructor(readonly bauwerk: Bauwerk) {
    this.stangen = bauwerk.stangen();
    this.buende = bauwerk.buende();
    this.fuesse = bauwerk.fuesse();
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

  /** Stangen-IDs je zusammenhängendem Bau (über Bünde verbunden), per Union-Find. */
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

`src/rules/geometrie2d.ts`:

```ts
export type P2 = readonly [number, number];

const kreuz = (o: P2, a: P2, b: P2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Konvexe Hülle (Andrew's Monotone Chain), gegen den Uhrzeigersinn, ohne kollineare Punkte. */
export function konvexeHuelle(punkte: readonly P2[]): P2[] {
  const p = [...punkte].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const halbe = (folge: readonly P2[]): P2[] => {
    const kette: P2[] = [];
    for (const q of folge) {
      while (kette.length >= 2 && kreuz(kette[kette.length - 2] as P2, kette[kette.length - 1] as P2, q) <= 0) kette.pop();
      kette.push(q);
    }
    return kette.slice(0, -1);
  };
  return [...halbe(p), ...halbe([...p].reverse())];
}

/** Kleinste Breite der Punktwolke (Abstand zweier paralleler Stützgeraden). 0, wenn alles auf einer Linie liegt. */
export function minimaleBreite(punkte: readonly P2[]): number {
  const h = konvexeHuelle(punkte);
  if (h.length < 3) return 0;
  return Math.min(
    ...h.map((a, i) => {
      const b = h[(i + 1) % h.length] as P2;
      const lx = b[0] - a[0];
      const lz = b[1] - a[1];
      const laenge = Math.hypot(lx, lz);
      return Math.max(...h.map((q) => Math.abs((q[0] - a[0]) * lz - (q[1] - a[1]) * lx) / laenge));
    }),
  );
}
```

`src/rules/RuleEngine.ts`:

```ts
import type { Bauwerk } from '../model/Bauwerk';
import { Analyse } from './Analyse';
import type { Hinweis, Rule } from './Rule';

export class RuleEngine {
  constructor(private readonly regeln: readonly Rule[]) {}

  pruefe(bauwerk: Bauwerk): Hinweis[] {
    const analyse = new Analyse(bauwerk);
    return this.regeln.flatMap((r) => r.pruefe(analyse));
  }
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/rules`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/rules/Rule.ts src/rules/Analyse.ts src/rules/Analyse.test.ts src/rules/constants.ts src/rules/geometrie2d.ts src/rules/geometrie2d.test.ts src/rules/RuleEngine.ts src/rules/RuleEngine.test.ts
git commit -m "feat: add rule engine foundation and thresholds"
```

### Task 12: R1 „A-Bock quer“ und R5 „Lose Stange“ (Tests 1 und 7)

**Files:**
- Create: `src/rules/ABockQuerRule.ts`, `src/rules/LoseStangeRule.ts`
- Test: `src/rules/ABockQuerRule.test.ts`, `src/rules/LoseStangeRule.test.ts`

**Interfaces:**
- Consumes: `Analyse`, `Rule`, `hinweis`, `ABock`, `R1_MIN_WINKEL_ZUR_EBENE_GRAD`
- Produces:
  - `class ABockQuerRule implements Rule { name = 'R1'; constructor(minWinkelGrad = R1_MIN_WINKEL_ZUR_EBENE_GRAD) }`. Sie meldet jeden A-Bock, an dem keine fremde Stange hängt, deren Winkel zur A-Ebene ≥ Schwelle ist. Text: `'A-Bock kann seitlich umkippen, er braucht eine Querverbindung.'`, Teile: `[abock.id]`.
  - `class LoseStangeRule implements Rule { name = 'R5' }`. Sie meldet jede Stange mit Bünde + Füße ≤ 1. Texte: 1 Bund → `'Diese Stange hängt nur an einem Bund.'`, 1 Fuß → `'Diese Stange steht frei, ohne Bund.'`, nichts → `'Diese Stange ist mit nichts verbunden.'`

- [ ] **Step 1: Failing tests schreiben**

`src/rules/ABockQuerRule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { ABockQuerRule } from './ABockQuerRule';
import { Analyse } from './Analyse';

const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK); // A-Ebene ist x = 0
const regel = new ABockQuerRule(30);
const pruefe = (b: Bauwerk) => regel.pruefe(new Analyse(b));

describe('ABockQuerRule (R1)', () => {
  it('Test 1: meldet einen A-Bock ohne Querverbindung', () => {
    const h = pruefe(Bauwerk.leer().mitGruppe(abock));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R1', schwere: 'warnung', betroffeneTeile: ['a'] });
    expect(h[0]?.text).toBe('A-Bock kann seitlich umkippen, er braucht eine Querverbindung.');
  });

  it('schweigt, wenn eine Stütze quer zur A-Ebene an der Spitze hängt', () => {
    const stuetze = Stange.zwischen('s', abock.spitze(), new Vec3(1.5, 0, 0), 0.08, 0.2, 0);
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitStange(stuetze))).toEqual([]);
  });

  it('meldet weiter, wenn die angebundene Stange in der A-Ebene liegt', () => {
    const inEbene = Stange.zwischen('s', abock.spitze(), new Vec3(0, 0, 2), 0.08, 0.2, 0);
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitStange(inEbene))).toHaveLength(1);
  });
});
```

`src/rules/LoseStangeRule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { LoseStangeRule } from './LoseStangeRule';

const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
const pruefe = (b: Bauwerk) => new LoseStangeRule().pruefe(new Analyse(b));

describe('LoseStangeRule (R5)', () => {
  it('Test 7: meldet eine Stange, die nur an einem Bund hängt', () => {
    const ast = Stange.zwischen('ast', abock.spitze(), abock.spitze().add(new Vec3(1.5, 0, 0)), 0.08, 0.2, 0);
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitStange(ast))).toEqual([
      { regel: 'R5', schwere: 'warnung', text: 'Diese Stange hängt nur an einem Bund.', betroffeneTeile: ['ast'] },
    ]);
  });

  it('meldet eine frei stehende und eine schwebende Stange mit eigenem Text', () => {
    const steht = new Stange('steht', new Vec3(5, 0, 0), new Vec3(5, 2, 0), 0.08);
    const schwebt = new Stange('schwebt', new Vec3(8, 1, 0), new Vec3(8, 2, 0), 0.08);
    const texte = pruefe(Bauwerk.leer().mitStange(steht).mitStange(schwebt)).map((h) => h.text);
    expect(texte).toEqual(['Diese Stange steht frei, ohne Bund.', 'Diese Stange ist mit nichts verbunden.']);
  });

  it('schweigt bei A-Bock und liegender Stange', () => {
    const liegt = new Stange('liegt', new Vec3(5, 0, 0), new Vec3(7, 0, 0), 0.08);
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitStange(liegt))).toEqual([]);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen fehlschlagen**

Run: `npx vitest run src/rules/ABockQuerRule.test.ts src/rules/LoseStangeRule.test.ts`
Expected: FAIL, die Regelklassen fehlen.

- [ ] **Step 3: Implementieren**

`src/rules/ABockQuerRule.ts`:

```ts
import { ABock } from '../model/ABock';
import type { Analyse } from './Analyse';
import { R1_MIN_WINKEL_ZUR_EBENE_GRAD } from './constants';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R1: Ein A-Bock ist nur in seiner Ebene steif. Er braucht eine Stange, die aus dieser Ebene herausführt. */
export class ABockQuerRule implements Rule {
  readonly name = 'R1';
  private readonly minSinus: number;

  constructor(minWinkelGrad = R1_MIN_WINKEL_ZUR_EBENE_GRAD) {
    this.minSinus = Math.sin((minWinkelGrad * Math.PI) / 180);
  }

  pruefe(a: Analyse): Hinweis[] {
    return a.bauwerk.gruppen
      .filter((g): g is ABock => g instanceof ABock)
      .filter((abock) => !this.istQuerGehalten(abock, a))
      .map((abock) => hinweis(this.name, 'A-Bock kann seitlich umkippen, er braucht eine Querverbindung.', [abock.id]));
  }

  private istQuerGehalten(abock: ABock, a: Analyse): boolean {
    const eigene = new Set(abock.stangen().map((s) => s.id));
    const normale = abock.ebenenNormale();
    return a.buende
      .filter((b) => b.stangenIds.some((id) => eigene.has(id)))
      .flatMap((b) => b.stangenIds.filter((id) => !eigene.has(id)))
      .some((id) => Math.abs(a.stange(id).richtung.dot(normale)) >= this.minSinus);
  }
}
```

`src/rules/LoseStangeRule.ts`:

```ts
import type { Analyse } from './Analyse';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R5: Eine Stange braucht mindestens zwei Halte-Punkte (Bünde oder Füße). */
export class LoseStangeRule implements Rule {
  readonly name = 'R5';

  pruefe(a: Analyse): Hinweis[] {
    return a.stangen.flatMap((s) => {
      const buende = a.buendeVon(s.id).length;
      const fuesse = a.fuesseVon(s.id).length;
      if (buende + fuesse > 1) return [];
      const text =
        buende === 1
          ? 'Diese Stange hängt nur an einem Bund.'
          : fuesse === 1
            ? 'Diese Stange steht frei, ohne Bund.'
            : 'Diese Stange ist mit nichts verbunden.';
      return [hinweis(this.name, text, [s.id])];
    });
  }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/rules`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rules/ABockQuerRule.ts src/rules/ABockQuerRule.test.ts src/rules/LoseStangeRule.ts src/rules/LoseStangeRule.test.ts
git commit -m "feat: add rules R1 (A-Bock cross bracing) and R5 (loose pole)"
```

### Task 13: R2 „Viereck ohne Diagonale“ (Test 4)

**Files:**
- Modify: `src/model/Bund.ts`: die Cluster-Logik als `clustereNachNaehe` herausziehen (wird jetzt zweimal gebraucht)
- Create: `src/rules/KnotenGraph.ts`, `src/rules/ViereckRule.ts`
- Test: `src/model/Bund.test.ts` (ergänzen), `src/rules/ViereckRule.test.ts`

**Interfaces:**
- Consumes: `Analyse`, `Rule`, `hinweis`, `mittelpunkt`, `BUND_CLUSTER_RADIUS`, `R2_PLANAR_TOLERANZ_RELATIV`
- Produces:
  - `clustereNachNaehe<T>(elemente, position: (e: T) => Vec3, radius): T[][]` (in `src/model/Bund.ts`)
  - `const BODEN = 'boden'`; `interface Knoten { id; position; seiten: ReadonlySet<string> }` (Stangen-IDs + ggf. `BODEN`); `interface Kante { nach: Knoten; seite: string }`
  - `class KnotenGraph { constructor(analyse, clusterRadius?); knoten; nachbarn(k): readonly Kante[]; verbunden(a, b): boolean; knotenAuf(seite): Knoten[] }`
  - `class ViereckRule implements Rule { name = 'R2'; constructor(planarToleranz = R2_PLANAR_TOLERANZ_RELATIV) }`. Text: `'Dieses Viereck kann sich verziehen, eine Diagonale fehlt.'`, Teile: die Stangen der vier Seiten ohne Boden.
- Heuristik: Knoten sind die Bünde und Füße, im Bund-Radius zusammengefasst. Seiten sind Stangen oder der Boden (alle Füße liegen auf „Boden“). Ein Viereck besteht aus vier verschiedenen Knoten und vier verschiedenen Seiten. Es wird gemeldet, wenn es **eben** ist (jeder Eckpunkt liegt höchstens Toleranz × längste Seite von der Ebene der anderen drei entfernt), **keine Diagonale** hat (k0–k2 oder k1–k3 verbunden) und **keine zwei gegenüberliegenden Seiten einen Knoten teilen** (wie die A-Bock-Beine an der Spitze). Liefern mehrere Seitenkombinationen dieselben vier Knoten, genügt eine ausgesteifte, damit nicht gemeldet wird.

- [ ] **Step 1: Refactor-Test für `clustereNachNaehe` ergänzen**

An `src/model/Bund.test.ts` anhängen und den Import oben auf `import { BundFinder, clustereNachNaehe, mittelpunkt } from './Bund';` ändern:

```ts
describe('clustereNachNaehe', () => {
  it('fasst nahe Elemente in Eingabereihenfolge zusammen', () => {
    const punkte = [new Vec3(0, 0, 0), new Vec3(5, 0, 0), new Vec3(0.1, 0, 0), new Vec3(5.05, 0, 0)];
    const cluster = clustereNachNaehe(punkte, (p) => p, 0.15);
    expect(cluster).toHaveLength(2);
    expect(cluster[0]).toHaveLength(2);
    expect(cluster[1]).toHaveLength(2);
  });
});
```

Run: `npx vitest run src/model/Bund.test.ts` → Expected: FAIL (`clustereNachNaehe` ist kein Export).

- [ ] **Step 2: `clustereNachNaehe` einführen und `BundFinder` darauf umstellen**

In `src/model/Bund.ts` die Schnittstelle `Cluster` und die Methode `gruppiere` löschen, `clustereNachNaehe` hinzufügen und `finde` ersetzen. Die Datei sieht danach so aus:

```ts
import { naechstePunkte } from './geometrie';
import { BUND_CLUSTER_RADIUS, BUND_TOLERANZ } from './konstanten';
import type { Stange } from './Stange';
import { Vec3 } from './Vec3';

/** Stelle, an der zwei oder mehr Stangen zusammengebunden sind. Wird aus der Geometrie abgeleitet. */
export class Bund {
  constructor(
    readonly id: string,
    readonly position: Vec3,
    readonly stangenIds: readonly string[],
  ) {}

  enthaelt(stangeId: string): boolean {
    return this.stangenIds.includes(stangeId);
  }
}

export function mittelpunkt(punkte: readonly Vec3[]): Vec3 {
  return punkte.reduce((summe, p) => summe.add(p), Vec3.NULL).scale(1 / punkte.length);
}

/** Gierige Gruppierung: ein Element kommt zum ersten Cluster, dessen Mittelpunkt höchstens `radius` entfernt ist. */
export function clustereNachNaehe<T>(elemente: readonly T[], position: (e: T) => Vec3, radius: number): T[][] {
  const cluster: { mitte: Vec3; mitglieder: T[] }[] = [];
  for (const e of elemente) {
    const p = position(e);
    const passend = cluster.find((c) => c.mitte.distanceTo(p) <= radius);
    if (passend) {
      passend.mitglieder.push(e);
      passend.mitte = mittelpunkt(passend.mitglieder.map(position));
    } else {
      cluster.push({ mitte: p, mitglieder: [e] });
    }
  }
  return cluster.map((c) => c.mitglieder);
}

interface Kontakt {
  readonly punkt: Vec3;
  readonly ids: readonly [string, string];
}

/** Findet Bünde: Stangenpaare mit Achsabstand ≤ Toleranz, nahe Kontakte zu einem Bund zusammengefasst. */
export class BundFinder {
  constructor(
    private readonly toleranz = BUND_TOLERANZ,
    private readonly clusterRadius = BUND_CLUSTER_RADIUS,
  ) {}

  finde(stangen: readonly Stange[]): Bund[] {
    return clustereNachNaehe(this.kontakte(stangen), (k) => k.punkt, this.clusterRadius).map(
      (gruppe, i) =>
        new Bund(`bund-${i}`, mittelpunkt(gruppe.map((k) => k.punkt)), [...new Set(gruppe.flatMap((k) => k.ids))].sort()),
    );
  }

  private kontakte(stangen: readonly Stange[]): Kontakt[] {
    const kontakte: Kontakt[] = [];
    for (let i = 0; i < stangen.length; i++) {
      for (let j = i + 1; j < stangen.length; j++) {
        const a = stangen[i] as Stange;
        const b = stangen[j] as Stange;
        const r = naechstePunkte(a.start, a.ende, b.start, b.ende);
        if (r.abstand <= this.toleranz) kontakte.push({ punkt: r.a.add(r.b).scale(0.5), ids: [a.id, b.id] });
      }
    }
    return kontakte;
  }
}
```

Run: `npx vitest run` → Expected: PASS, alle bisherigen Tests (Regression) plus der neue.

- [ ] **Step 3: Failing test für R2 schreiben**

`src/rules/ViereckRule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { ViereckRule } from './ViereckRule';

const regel = new ViereckRule(0.05);
const pruefe = (b: Bauwerk) => regel.pruefe(new Analyse(b));

// Lagertor: zwei senkrechte Pfosten, oben ein Riegel, unten der Boden.
const pfosten0 = new Stange('p0', Vec3.NULL, new Vec3(0, 2.2, 0), 0.08);
const pfosten1 = new Stange('p1', new Vec3(2, 0, 0), new Vec3(2, 2.2, 0), 0.08);
const riegel = Stange.zwischen('r', new Vec3(0, 2, 0), new Vec3(2, 2, 0), 0.08);
const tor = Bauwerk.leer().mitStange(pfosten0).mitStange(pfosten1).mitStange(riegel);

describe('ViereckRule (R2)', () => {
  it('Test 4a: meldet ein Tor ohne Diagonale', () => {
    const h = pruefe(tor);
    expect(h).toHaveLength(1);
    expect(h[0]?.regel).toBe('R2');
    expect(h[0]?.text).toBe('Dieses Viereck kann sich verziehen, eine Diagonale fehlt.');
    expect([...(h[0]?.betroffeneTeile ?? [])].sort()).toEqual(['p0', 'p1', 'r']);
  });

  it('Test 4b: schweigt, sobald eine Diagonale drin ist', () => {
    const diagonale = Stange.zwischen('d', Vec3.NULL, new Vec3(2, 2, 0), 0.08, 0, 0.2);
    expect(pruefe(tor.mitStange(diagonale))).toEqual([]);
  });

  it('erkennt den A-Bock als ausgesteift (Beine treffen sich an der Spitze)', () => {
    expect(pruefe(Bauwerk.leer().mitGruppe(new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK)))).toEqual([]);
  });

  it('findet am Dreibein kein Viereck', () => {
    expect(pruefe(Bauwerk.leer().mitGruppe(new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN)))).toEqual([]);
  });

  it('bekannte Grenze: ein verwundenes Viereck wird nicht gemeldet', () => {
    const schief = new Stange('p1', new Vec3(2, 0, 1), new Vec3(2, 2.2, 0), 0.08);
    const punktAufSchief = schief.naechsterPunkt(new Vec3(2, 2, 0.09));
    const riegelSchief = Stange.zwischen('r', new Vec3(0, 2, 0), punktAufSchief, 0.08);
    const verwunden = Bauwerk.leer().mitStange(pfosten0).mitStange(schief).mitStange(riegelSchief);
    expect(pruefe(verwunden)).toEqual([]);
  });
});
```

- [ ] **Step 4: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/rules/ViereckRule.test.ts`
Expected: FAIL, `./ViereckRule` fehlt.

- [ ] **Step 5: KnotenGraph und ViereckRule implementieren**

`src/rules/KnotenGraph.ts`:

```ts
import { clustereNachNaehe, mittelpunkt } from '../model/Bund';
import { BUND_CLUSTER_RADIUS } from '../model/konstanten';
import type { Vec3 } from '../model/Vec3';
import type { Analyse } from './Analyse';

export const BODEN = 'boden';

export interface Knoten {
  readonly id: string;
  readonly position: Vec3;
  /** Stangen-IDs, auf denen der Knoten liegt, dazu BODEN bei Füßen. */
  readonly seiten: ReadonlySet<string>;
}

export interface Kante {
  readonly nach: Knoten;
  readonly seite: string;
}

/** Knoten = Bünde und Füße (nahe zusammengefasst). Zwei Knoten sind über jede gemeinsame Seite verbunden. */
export class KnotenGraph {
  readonly knoten: readonly Knoten[];
  private readonly kanten: ReadonlyMap<string, readonly Kante[]>;

  constructor(analyse: Analyse, clusterRadius = BUND_CLUSTER_RADIUS) {
    this.knoten = KnotenGraph.bilde(analyse, clusterRadius);
    this.kanten = new Map(this.knoten.map((k) => [k.id, this.kantenVon(k)]));
  }

  nachbarn(k: Knoten): readonly Kante[] {
    return this.kanten.get(k.id) ?? [];
  }

  verbunden(a: Knoten, b: Knoten): boolean {
    return this.nachbarn(a).some((kante) => kante.nach === b);
  }

  knotenAuf(seite: string): Knoten[] {
    return this.knoten.filter((k) => k.seiten.has(seite));
  }

  private kantenVon(k: Knoten): Kante[] {
    return this.knoten
      .filter((n) => n !== k)
      .flatMap((n) => [...k.seiten].filter((s) => n.seiten.has(s)).map((seite) => ({ nach: n, seite })));
  }

  private static bilde(analyse: Analyse, radius: number): Knoten[] {
    const roh = [
      ...analyse.buende.map((b) => ({ position: b.position, seiten: b.stangenIds })),
      ...analyse.fuesse.map((f) => ({ position: f.position, seiten: [f.stangeId, BODEN] })),
    ];
    return clustereNachNaehe(roh, (r) => r.position, radius).map((gruppe, i) => ({
      id: `k${i}`,
      position: mittelpunkt(gruppe.map((r) => r.position)),
      seiten: new Set(gruppe.flatMap((r) => [...r.seiten])),
    }));
  }
}
```

`src/rules/ViereckRule.ts`:

```ts
import type { Vec3 } from '../model/Vec3';
import type { Analyse } from './Analyse';
import { R2_PLANAR_TOLERANZ_RELATIV } from './constants';
import { BODEN, type Kante, type Knoten, KnotenGraph } from './KnotenGraph';
import { type Hinweis, hinweis, type Rule } from './Rule';

interface Viereck {
  readonly knoten: readonly [Knoten, Knoten, Knoten, Knoten];
  readonly seiten: readonly [string, string, string, string];
}

/** R2: Ein ebenes Viereck aus Stangen (und Boden) ohne Diagonale kann sich zum Parallelogramm verziehen. */
export class ViereckRule implements Rule {
  readonly name = 'R2';

  constructor(private readonly planarToleranz = R2_PLANAR_TOLERANZ_RELATIV) {}

  pruefe(a: Analyse): Hinweis[] {
    const graph = new KnotenGraph(a);
    const nachEcken = new Map<string, { viereck: Viereck; ausgesteift: boolean }>();
    for (const v of this.vierecke(graph)) {
      if (!this.istEben(v)) continue;
      const schluessel = v.knoten.map((k) => k.id).sort().join('|');
      const bisher = nachEcken.get(schluessel);
      nachEcken.set(schluessel, {
        viereck: bisher?.viereck ?? v,
        ausgesteift: (bisher?.ausgesteift ?? false) || this.istAusgesteift(graph, v),
      });
    }
    return [...nachEcken.values()]
      .filter((e) => !e.ausgesteift)
      .map((e) => hinweis(this.name, 'Dieses Viereck kann sich verziehen, eine Diagonale fehlt.', e.viereck.seiten.filter((s) => s !== BODEN)));
  }

  private *vierecke(g: KnotenGraph): Generator<Viereck> {
    for (const k0 of g.knoten) {
      for (const [e01, e12, e23] of this.wege(g, k0, 3)) {
        for (const e30 of g.nachbarn(e23.nach)) {
          if (e30.nach !== k0 || [e01.seite, e12.seite, e23.seite].includes(e30.seite)) continue;
          yield { knoten: [k0, e01.nach, e12.nach, e23.nach], seiten: [e01.seite, e12.seite, e23.seite, e30.seite] };
        }
      }
    }
  }

  /** Alle Wege ab start mit `laenge` Kanten, ohne Knoten oder Seite doppelt zu benutzen. */
  private *wege(g: KnotenGraph, start: Knoten, laenge: number, bisher: readonly Kante[] = []): Generator<readonly Kante[]> {
    if (bisher.length === laenge) {
      yield bisher;
      return;
    }
    const aktuell = bisher.at(-1)?.nach ?? start;
    for (const kante of g.nachbarn(aktuell)) {
      const benutzt = kante.nach === start || bisher.some((k) => k.nach === kante.nach || k.seite === kante.seite);
      if (!benutzt) yield* this.wege(g, start, laenge, [...bisher, kante]);
    }
  }

  private istEben({ knoten }: Viereck): boolean {
    const p = knoten.map((k) => k.position);
    const laengsteSeite = Math.max(...p.map((q, i) => q.distanceTo(p[(i + 1) % 4] as Vec3)));
    return p.every((_, i) => this.abstandZurEbene(p, i) <= this.planarToleranz * laengsteSeite);
  }

  /** Abstand von Punkt i zur Ebene der anderen drei; unendlich, wenn diese auf einer Geraden liegen. */
  private abstandZurEbene(p: readonly Vec3[], i: number): number {
    const [a, b, c] = p.filter((_, j) => j !== i) as [Vec3, Vec3, Vec3];
    const n = b.sub(a).cross(c.sub(a));
    const laenge = n.length();
    return laenge < 1e-9 ? Infinity : Math.abs((p[i] as Vec3).sub(a).dot(n)) / laenge;
  }

  private istAusgesteift(g: KnotenGraph, { knoten: [k0, k1, k2, k3], seiten: [s01, s12, s23, s30] }: Viereck): boolean {
    if (g.verbunden(k0, k2) || g.verbunden(k1, k3)) return true;
    return this.teilenKnoten(g, s01, s23) || this.teilenKnoten(g, s12, s30);
  }

  private teilenKnoten(g: KnotenGraph, s: string, t: string): boolean {
    const aufT = g.knotenAuf(t);
    return g.knotenAuf(s).some((k) => aufT.includes(k));
  }
}
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run`
Expected: PASS, alle Tests.

- [ ] **Step 7: Commit**

```bash
git add src/model/Bund.ts src/model/Bund.test.ts src/rules/KnotenGraph.ts src/rules/ViereckRule.ts src/rules/ViereckRule.test.ts
git commit -m "feat: add rule R2 (quadrilateral without diagonal)"
```

### Task 14: R3 „Standfläche“ und R4 „Spreizung“ (Tests 5 und 6)

**Files:**
- Create: `src/rules/StandflaecheRule.ts`, `src/rules/SpreizungRule.ts`
- Test: `src/rules/StandflaecheRule.test.ts`, `src/rules/SpreizungRule.test.ts`

**Interfaces:**
- Consumes: `Analyse` (`komponenten`, `fuesseVon`, `buende`, `stange`), `minimaleBreite`, `Rule`, `hinweis`, `R3_*`, `R4_*`
- Produces:
  - `class StandflaecheRule implements Rule { name = 'R3'; constructor(maxVerhaeltnis = R3_MAX_HOEHE_ZU_BREITE, minHoehe = R3_MIN_HOEHE) }`. Sie wird **je zusammenhängendem Bau** geprüft. Höhe = höchster Bund (ohne Bund: höchstes Stangenende), Breite = `minimaleBreite` der Füße im Grundriss (x, z). Gemeldet wird, wenn Höhe ≥ minHoehe und Höhe > maxVerhaeltnis × Breite. Text: `'Hoch und schmal, Kippgefahr. Füße weiter auseinander oder abspannen.'`, Teile: alle Stangen des Baus.
  - `class SpreizungRule implements Rule { name = 'R4'; constructor(minGrad = R4_MIN_BEINWINKEL_GRAD, maxGrad = R4_MAX_BEINWINKEL_GRAD) }`. Sie prüft den Beinwinkel jeder Baugruppe zur Senkrechten. Texte: zu steil → `'Beine sehr steil (NN°), der Bau kippt leicht. Füße weiter auseinander.'`, zu flach → `'Beine sehr flach gespreizt (NN°), sie können wegrutschen.'`, Teile: `[gruppe.id]`.

- [ ] **Step 1: Failing tests schreiben**

`src/rules/StandflaecheRule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { StandflaecheRule } from './StandflaecheRule';

const regel = new StandflaecheRule(2.5, 0.5);
const pruefe = (b: Bauwerk) => regel.pruefe(new Analyse(b));
const schmal = new Dreibein('s', Vec3.NULL, 0, { stangenlaenge: 4, fusskreisradius: 0.5, durchmesser: 0.08 });

describe('StandflaecheRule (R3)', () => {
  it('Test 5: meldet ein hohes, schmales Dreibein', () => {
    const h = pruefe(Bauwerk.leer().mitGruppe(schmal));
    expect(h).toHaveLength(1);
    expect(h[0]?.regel).toBe('R3');
    expect(h[0]?.text).toBe('Hoch und schmal, Kippgefahr. Füße weiter auseinander oder abspannen.');
    expect([...(h[0]?.betroffeneTeile ?? [])].sort()).toEqual(['s-bein-0', 's-bein-1', 's-bein-2']);
  });

  it('schweigt beim Standard-Dreibein', () => {
    expect(pruefe(Bauwerk.leer().mitGruppe(new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN)))).toEqual([]);
  });

  it('meldet einen A-Bock, der nur auf einer Linie steht', () => {
    expect(pruefe(Bauwerk.leer().mitGruppe(new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK)))).toHaveLength(1);
  });

  it('prüft liegende, niedrige und schwebende Stangen nicht', () => {
    const liegt = new Stange('liegt', Vec3.NULL, new Vec3(2, 0, 0), 0.08);
    const schwebt = new Stange('schwebt', new Vec3(5, 1, 0), new Vec3(5, 2, 0), 0.08);
    expect(pruefe(Bauwerk.leer().mitStange(liegt).mitStange(schwebt))).toEqual([]);
  });

  it('bewertet zwei getrennte Bauten einzeln statt über die gemeinsame Hülle', () => {
    const breit = new Dreibein('b', new Vec3(10, 0, 0), 0, STANDARD_DREIBEIN);
    const h = pruefe(Bauwerk.leer().mitGruppe(schmal).mitGruppe(breit));
    expect(h).toHaveLength(1);
    expect(h[0]?.betroffeneTeile).toContain('s-bein-0');
    expect(h[0]?.betroffeneTeile).not.toContain('b-bein-0');
  });
});
```

`src/rules/SpreizungRule.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { SpreizungRule } from './SpreizungRule';

const regel = new SpreizungRule(10, 35);
const pruefe = (b: Bauwerk) => regel.pruefe(new Analyse(b));

describe('SpreizungRule (R4)', () => {
  it('Test 5: meldet sehr steile Beine', () => {
    const d = new Dreibein('d', Vec3.NULL, 0, { stangenlaenge: 4, fusskreisradius: 0.5, durchmesser: 0.08 });
    const h = pruefe(Bauwerk.leer().mitGruppe(d));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R4', betroffeneTeile: ['d'] });
    expect(h[0]?.text).toMatch(/^Beine sehr steil \(8°\)/);
  });

  it('Test 6: meldet sehr flach gespreizte Beine', () => {
    const d = new Dreibein('d', Vec3.NULL, 0, { stangenlaenge: 2.4, fusskreisradius: 2.0, durchmesser: 0.08 });
    expect(pruefe(Bauwerk.leer().mitGruppe(d))[0]?.text).toMatch(/^Beine sehr flach gespreizt \(65°\)/);
  });

  it('schweigt bei Standard-Dreibein und Standard-A-Bock', () => {
    const b = Bauwerk.leer()
      .mitGruppe(new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN))
      .mitGruppe(new ABock('a', new Vec3(4, 0, 0), 0, STANDARD_ABOCK));
    expect(pruefe(b)).toEqual([]);
  });
});
```

Zur Kontrolle der erwarteten Gradzahlen: asin(0,5 / 3,8) = 7,56°, gerundet 8°; asin(2,0 / 2,2) = 65,4°, gerundet 65°.

- [ ] **Step 2: Tests laufen lassen, sie müssen fehlschlagen**

Run: `npx vitest run src/rules/StandflaecheRule.test.ts src/rules/SpreizungRule.test.ts`
Expected: FAIL, die Regelklassen fehlen.

- [ ] **Step 3: Implementieren**

`src/rules/StandflaecheRule.ts`:

```ts
import type { Analyse } from './Analyse';
import { R3_MAX_HOEHE_ZU_BREITE, R3_MIN_HOEHE } from './constants';
import { minimaleBreite } from './geometrie2d';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R3: Ein Bau, der im Verhältnis zu seiner schmalsten Standbreite zu hoch ist, kippt leicht. */
export class StandflaecheRule implements Rule {
  readonly name = 'R3';

  constructor(
    private readonly maxVerhaeltnis = R3_MAX_HOEHE_ZU_BREITE,
    private readonly minHoehe = R3_MIN_HOEHE,
  ) {}

  pruefe(a: Analyse): Hinweis[] {
    return a
      .komponenten()
      .filter((ids) => this.kippgefaehrdet(a, ids))
      .map((ids) => hinweis(this.name, 'Hoch und schmal, Kippgefahr. Füße weiter auseinander oder abspannen.', ids));
  }

  private kippgefaehrdet(a: Analyse, ids: readonly string[]): boolean {
    const fuesse = ids.flatMap((id) => a.fuesseVon(id));
    if (fuesse.length === 0) return false;
    const hoehe = this.hoehe(a, ids);
    if (hoehe < this.minHoehe) return false;
    const breite = minimaleBreite(fuesse.map((f) => [f.position.x, f.position.z] as const));
    return hoehe > this.maxVerhaeltnis * breite;
  }

  private hoehe(a: Analyse, ids: readonly string[]): number {
    const buende = a.buende.filter((b) => b.stangenIds.some((id) => ids.includes(id)));
    const punkte = buende.length > 0 ? buende.map((b) => b.position) : ids.flatMap((id) => a.stange(id).endpunkte());
    return Math.max(...punkte.map((p) => p.y));
  }
}
```

`src/rules/SpreizungRule.ts`:

```ts
import type { Analyse } from './Analyse';
import { R4_MAX_BEINWINKEL_GRAD, R4_MIN_BEINWINKEL_GRAD } from './constants';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R4: Der Beinwinkel zur Senkrechten muss in einem vernünftigen Bereich liegen. */
export class SpreizungRule implements Rule {
  readonly name = 'R4';

  constructor(
    private readonly minGrad = R4_MIN_BEINWINKEL_GRAD,
    private readonly maxGrad = R4_MAX_BEINWINKEL_GRAD,
  ) {}

  pruefe(a: Analyse): Hinweis[] {
    return a.bauwerk.gruppen.flatMap((g): Hinweis[] => {
      const winkel = g.beinwinkelGrad();
      const grad = winkel.toFixed(0);
      if (winkel < this.minGrad) {
        return [hinweis(this.name, `Beine sehr steil (${grad}°), der Bau kippt leicht. Füße weiter auseinander.`, [g.id])];
      }
      if (winkel > this.maxGrad) {
        return [hinweis(this.name, `Beine sehr flach gespreizt (${grad}°), sie können wegrutschen.`, [g.id])];
      }
      return [];
    });
  }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/rules`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rules/StandflaecheRule.ts src/rules/StandflaecheRule.test.ts src/rules/SpreizungRule.ts src/rules/SpreizungRule.test.ts
git commit -m "feat: add rules R3 (base width) and R4 (leg spread)"
```

### Task 15: Regeln einbauen: Kochstelle-Integration (Tests 2, 3), Hinweis-Panel, Stangenliste

**Files:**
- Create: `src/rules/standardRegeln.ts`, `src/model/Stangenliste.ts`, `src/ui/HinweisPanel.ts`, `src/ui/StangenlistePanel.ts`
- Modify: `src/main.ts` (ganz ersetzen)
- Test: `src/rules/kochstelle.integration.test.ts`, `src/model/Stangenliste.test.ts`

**Interfaces:**
- Consumes: alle Regeln aus Task 12–14, `RuleEngine`, `kochstelle()`, `Bauwerk`, `Editor`, `Szene`, UI aus Task 9
- Produces:
  - `standardRegeln(): Rule[]`, also R1–R5 mit den Werten aus `constants.ts`
  - `interface StangenlistenZeile { laenge: number; durchmesserCm: number; anzahl: number }`; `class Stangenliste { static aus(bauwerk); zeilen; anzahlBuende }`. Die Länge wird auf 0,1 m **auf**gerundet (man braucht eine Stange, die mindestens so lang ist), der Ø auf ganze cm gerundet. Sortiert nach Länge absteigend, dann nach Ø absteigend.
  - `class HinweisPanel { constructor(liste: HTMLUListElement, beiKlick: (h: Hinweis) => void); zeige(hinweise) }`. Ohne Hinweise zeigt es genau `Keine Hinweise.`
  - `class StangenlistePanel { constructor(tabelle: HTMLTableElement); zeige(liste: Stangenliste) }`

- [ ] **Step 1: Failing tests schreiben**

`src/rules/kochstelle.integration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { RuleEngine } from './RuleEngine';
import { standardRegeln } from './standardRegeln';

// Läuft mit den Schwellwerten aus constants.ts. Schlägt Test 2 fehl, nachdem Jakob Werte geändert hat,
// ist das eine echte Aussage: Entweder ist die Referenz-Kochstelle nach seinen Regeln nicht in Ordnung
// oder ein Schwellwert ist zu streng. Mit Jakob klären, nicht den Test anpassen.
const engine = new RuleEngine(standardRegeln());

describe('Kochstelle mit allen Regeln', () => {
  it('Test 2: die komplette Kochstelle erzeugt keine Hinweise', () => {
    expect(engine.pruefe(kochstelle())).toEqual([]);
  });

  it('Test 3: ohne First meldet R1 den A-Bock', () => {
    const h = engine.pruefe(kochstelle().ohne('first'));
    expect(h.some((x) => x.regel === 'R1' && x.betroffeneTeile.includes('abock'))).toBe(true);
  });

  it('ein leeres Bauwerk erzeugt keine Hinweise', () => {
    expect(engine.pruefe(Bauwerk.leer())).toEqual([]);
  });

  it('enthält die fünf Regeln R1–R5', () => {
    expect(standardRegeln().map((r) => r.name)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
  });
});
```

`src/model/Stangenliste.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from './Bauwerk';
import { Stange } from './Stange';
import { Stangenliste } from './Stangenliste';
import { Vec3 } from './Vec3';

describe('Stangenliste', () => {
  it('zählt Stangen je aufgerundeter Länge und Ø', () => {
    const b = Bauwerk.leer()
      .mitStange(new Stange('a', Vec3.NULL, new Vec3(0, 2.4, 0), 0.08))
      .mitStange(new Stange('b', new Vec3(1, 0, 0), new Vec3(1, 2.4, 0), 0.08))
      .mitStange(new Stange('c', new Vec3(3, 0, 0), new Vec3(3, 1.65, 0), 0.08))
      .mitStange(new Stange('d', new Vec3(5, 0, 0), new Vec3(5, 2.4, 0), 0.1));
    expect(Stangenliste.aus(b).zeilen).toEqual([
      { laenge: 2.4, durchmesserCm: 10, anzahl: 1 },
      { laenge: 2.4, durchmesserCm: 8, anzahl: 2 },
      { laenge: 1.7, durchmesserCm: 8, anzahl: 1 },
    ]);
    expect(Stangenliste.aus(b).anzahlBuende).toBe(0);
  });

  it('listet alle sieben Stangen und vier Bünde der Kochstelle', () => {
    const liste = Stangenliste.aus(kochstelle());
    expect(liste.zeilen.reduce((summe, z) => summe + z.anzahl, 0)).toBe(7);
    expect(liste.anzahlBuende).toBe(4);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen fehlschlagen**

Run: `npx vitest run src/rules/kochstelle.integration.test.ts src/model/Stangenliste.test.ts`
Expected: FAIL, `./standardRegeln` und `./Stangenliste` fehlen.

- [ ] **Step 3: Implementieren**

`src/rules/standardRegeln.ts`:

```ts
import { ABockQuerRule } from './ABockQuerRule';
import { LoseStangeRule } from './LoseStangeRule';
import type { Rule } from './Rule';
import { SpreizungRule } from './SpreizungRule';
import { StandflaecheRule } from './StandflaecheRule';
import { ViereckRule } from './ViereckRule';

/** R1–R5 mit den Schwellwerten aus constants.ts. */
export function standardRegeln(): Rule[] {
  return [new ABockQuerRule(), new ViereckRule(), new StandflaecheRule(), new SpreizungRule(), new LoseStangeRule()];
}
```

`src/model/Stangenliste.ts`:

```ts
import type { Bauwerk } from './Bauwerk';

export interface StangenlistenZeile {
  readonly laenge: number;
  readonly durchmesserCm: number;
  readonly anzahl: number;
}

/** Materialliste: wie viele Stangen welcher Mindestlänge und Stärke gebraucht werden. */
export class Stangenliste {
  private constructor(
    readonly zeilen: readonly StangenlistenZeile[],
    readonly anzahlBuende: number,
  ) {}

  static aus(bauwerk: Bauwerk): Stangenliste {
    const zaehler = new Map<string, StangenlistenZeile>();
    for (const s of bauwerk.stangen()) {
      const laenge = Math.ceil(s.laenge * 10 - 1e-6) / 10;
      const durchmesserCm = Math.round(s.durchmesser * 100);
      const schluessel = `${laenge}|${durchmesserCm}`;
      const bisher = zaehler.get(schluessel)?.anzahl ?? 0;
      zaehler.set(schluessel, { laenge, durchmesserCm, anzahl: bisher + 1 });
    }
    const zeilen = [...zaehler.values()].sort((a, b) => b.laenge - a.laenge || b.durchmesserCm - a.durchmesserCm);
    return new Stangenliste(zeilen, bauwerk.buende().length);
  }
}
```

`src/ui/HinweisPanel.ts`:

```ts
import type { Hinweis } from '../rules/Rule';

export class HinweisPanel {
  constructor(
    private readonly liste: HTMLUListElement,
    private readonly beiKlick: (h: Hinweis) => void,
  ) {}

  zeige(hinweise: readonly Hinweis[]): void {
    if (hinweise.length === 0) {
      const leer = document.createElement('li');
      leer.textContent = 'Keine Hinweise.';
      this.liste.replaceChildren(leer);
      return;
    }
    this.liste.replaceChildren(
      ...hinweise.map((h) => {
        const eintrag = document.createElement('li');
        eintrag.className = h.schwere;
        eintrag.textContent = `${h.regel}: ${h.text}`;
        eintrag.title = 'Klicken markiert die betroffenen Teile';
        eintrag.addEventListener('click', () => this.beiKlick(h));
        return eintrag;
      }),
    );
  }
}
```

`src/ui/StangenlistePanel.ts`:

```ts
import type { Stangenliste } from '../model/Stangenliste';

function zeile(tag: 'th' | 'td', zellen: readonly string[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const text of zellen) {
    const zelle = document.createElement(tag);
    zelle.textContent = text;
    tr.append(zelle);
  }
  return tr;
}

export class StangenlistePanel {
  constructor(private readonly tabelle: HTMLTableElement) {}

  zeige(liste: Stangenliste): void {
    this.tabelle.replaceChildren(
      zeile('th', ['Länge', 'Ø', 'Anzahl']),
      ...liste.zeilen.map((z) => zeile('td', [`${z.laenge.toFixed(1)} m`, `${z.durchmesserCm} cm`, String(z.anzahl)])),
      zeile('td', ['Bünde', '', String(liste.anzahlBuende)]),
    );
  }
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run`
Expected: PASS. Schlägt Test 2 fehl: **nicht** den Test anpassen. Zuerst `npx vitest run src/rules/kochstelle.integration.test.ts` laufen lassen und nachsehen, welche Regel feuert. Dann mit Jakob klären und den Fund in `docs/ki-lernlog.md` eintragen.

- [ ] **Step 5: `src/main.ts` ersetzen (Regeln und Stangenliste verdrahten)**

```ts
import './style.css';
import { kochstelle } from './beispiele/kochstelle';
import { Editor } from './editor/Editor';
import { KLICK_TOLERANZ_PX } from './editor/konstanten';
import { Szene } from './editor/Szene';
import type { WerkzeugName } from './editor/Werkzeuge';
import { Bauwerk } from './model/Bauwerk';
import { Stangenliste } from './model/Stangenliste';
import type { Hinweis } from './rules/Rule';
import { RuleEngine } from './rules/RuleEngine';
import { standardRegeln } from './rules/standardRegeln';
import { AnsichtsModus } from './ui/AnsichtsModus';
import { HinweisPanel } from './ui/HinweisPanel';
import { ParameterPanel } from './ui/ParameterPanel';
import { StangenlistePanel } from './ui/StangenlistePanel';
import { Teilen } from './ui/Teilen';

const MELDUNG_DAUER_MS = 4000;

function element<T extends HTMLElement>(selektor: string): T {
  const el = document.querySelector<T>(selektor);
  if (!el) throw new Error(`Element ${selektor} fehlt in index.html`);
  return el;
}

const editor = new Editor(Bauwerk.leer());
const szene = new Szene(element('#ansicht'));
const modus = new AnsichtsModus(document.body);
const teilen = new Teilen();
const regeln = new RuleEngine(standardRegeln());
const parameter = new ParameterPanel(element('#parameter'), editor);
const hinweisPanel = new HinweisPanel(element('#hinweise'), (h) => editor.markiere(h.betroffeneTeile));
const stangenlistePanel = new StangenlistePanel(element('#stangenliste'));
const meldung = element<HTMLParagraphElement>('#meldung');
const werkzeugKnoepfe = [...document.querySelectorAll<HTMLButtonElement>('[data-werkzeug]')];

// Regeln nur neu prüfen, wenn sich das Bauwerk wirklich geändert hat (nicht bei Auswahl oder Meldung).
let geprueft: { bauwerk: Bauwerk; hinweise: readonly Hinweis[]; liste: Stangenliste } | null = null;
function pruefung(bauwerk: Bauwerk): { hinweise: readonly Hinweis[]; liste: Stangenliste } {
  if (geprueft?.bauwerk !== bauwerk) {
    geprueft = { bauwerk, hinweise: regeln.pruefe(bauwerk), liste: Stangenliste.aus(bauwerk) };
  }
  return geprueft;
}

function ladeAusAdresse(): void {
  try {
    const bauwerk = teilen.ausAdresse();
    if (bauwerk) editor.setzeBauwerk(bauwerk);
    modus.setze(bauwerk !== null);
  } catch (e) {
    modus.setze(false);
    editor.zeigeMeldung((e as Error).message);
  }
}

// Ein Klick ist ein Drücken und Loslassen ohne nennenswerte Mausbewegung; alles andere dreht die Ansicht.
let druck: { x: number; y: number } | null = null;
szene.leinwand.addEventListener('pointerdown', (e) => {
  druck = e.button === 0 && !modus.aktiv ? { x: e.clientX, y: e.clientY } : null;
});
szene.leinwand.addEventListener('pointerup', (e) => {
  if (druck && Math.hypot(e.clientX - druck.x, e.clientY - druck.y) < KLICK_TOLERANZ_PX) {
    const treffer = szene.treffer(e);
    if (treffer) editor.klick(treffer);
  }
  druck = null;
});

for (const knopf of werkzeugKnoepfe) {
  knopf.addEventListener('click', () => editor.waehleWerkzeug(knopf.dataset.werkzeug as WerkzeugName));
}
element('#btn-beispiel').addEventListener('click', () => editor.setzeBauwerk(kochstelle()));
element('#btn-rueck').addEventListener('click', () => editor.rueckgaengig());
element('#btn-wieder').addEventListener('click', () => editor.wiederholen());
element('#btn-bearbeiten').addEventListener('click', () => modus.setze(false));
element('#btn-speichern').addEventListener('click', () => teilen.speichere(editor.bauwerk));
element('#btn-teilen').addEventListener('click', async () => {
  const bauwerk = editor.bauwerk;
  history.replaceState(null, '', teilen.link(bauwerk));
  try {
    await teilen.kopiereLink(bauwerk);
    editor.zeigeMeldung('Link kopiert.');
  } catch {
    editor.zeigeMeldung('Kopieren nicht möglich. Der Link steht in der Adresszeile.');
  }
});
element<HTMLInputElement>('#inp-laden').addEventListener('change', async (e) => {
  const input = e.currentTarget as HTMLInputElement;
  const datei = input.files?.[0];
  input.value = '';
  if (!datei) return;
  try {
    editor.setzeBauwerk(await teilen.lade(datei));
  } catch (fehler) {
    editor.zeigeMeldung((fehler as Error).message);
  }
});
window.addEventListener('keydown', (e) => {
  if (modus.aktiv || e.target instanceof HTMLInputElement) return;
  if (editor.taste(e.key, e.ctrlKey || e.metaKey)) e.preventDefault();
});
window.addEventListener('hashchange', ladeAusAdresse);

let meldungsTimer: number | undefined;
editor.abonniere((z) => {
  const { hinweise, liste } = pruefung(z.bauwerk);
  const markiert = new Set(z.markiert);
  if (z.auswahl) markiert.add(z.auswahl);
  szene.zeige(z.bauwerk, markiert, z.stangenStart);
  parameter.zeige(z);
  hinweisPanel.zeige(hinweise);
  stangenlistePanel.zeige(liste);
  for (const knopf of werkzeugKnoepfe) knopf.setAttribute('aria-pressed', String(knopf.dataset.werkzeug === z.werkzeug));
  element<HTMLButtonElement>('#btn-rueck').disabled = !z.kannRueckgaengig;
  element<HTMLButtonElement>('#btn-wieder').disabled = !z.kannWiederholen;
  meldung.textContent = z.meldung ?? (z.stangenStart ? 'Stange: zweiten Punkt anklicken (Esc bricht ab)' : '');
  if (z.meldung) {
    clearTimeout(meldungsTimer);
    meldungsTimer = window.setTimeout(() => editor.zeigeMeldung(null), MELDUNG_DAUER_MS);
  }
});

ladeAusAdresse();
```

- [ ] **Step 6: Tests, Build, manuell**

Run: `npm test && npm run build`
Expected: grün, Abdeckung `model/` + `rules/` ≥ 80 %.

Manuell (`npm run dev`):
1. „Beispiel laden“ → „Keine Hinweise.“ Die Stangenliste zeigt 2,4 m × 5, 3,0 m × 1 (First), 1,7 m × 1 (Riegel) und „Bünde 4“.
2. Den First auswählen und mit Entf löschen → „R1: A-Bock kann seitlich umkippen …“ und „R3: Hoch und schmal …“. Ein Klick auf den R1-Hinweis färbt den A-Bock orange.
3. Strg+Z → wieder „Keine Hinweise.“

- [ ] **Step 7: Commit**

```bash
git add src/rules/standardRegeln.ts src/rules/kochstelle.integration.test.ts src/model/Stangenliste.ts src/model/Stangenliste.test.ts src/ui/HinweisPanel.ts src/ui/StangenlistePanel.ts src/main.ts
git commit -m "feat: show rule hints and pole list in the UI"
```

### Task 16: Browser-Smoke-Test (Test 10), Abschluss-Prüfung, Doku

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `CLAUDE.md` (Known Issues, falls welche aufgetreten sind), `docs/ki-lernlog.md`

**Interfaces:**
- Consumes: gebaute App (`npm run build`, `vite preview`), DOM-IDs aus Task 8, Hinweistexte aus Task 12/15
- Produces: `npm run e2e` grün

- [ ] **Step 1: Playwright-Konfiguration und Test schreiben**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const BASIS = 'http://localhost:4173/lagerbau-simulator/';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: BASIS },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: BASIS,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

`e2e/smoke.spec.ts`. Der Test ist bewusst Black-Box: Das Bauwerk ohne First wird als JSON-Literal gebaut, ohne Import aus `src/`, damit der Test auch einen Serializer-Fehler fängt:

```ts
import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

const kochstelleOhneFirst = {
  version: 1,
  gruppen: [
    { id: 'abock', typ: 'abock', position: [0, 0, 0], drehung: Math.PI / 2, params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 } },
    { id: 'dreibein', typ: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 } },
  ],
  stangen: [],
};

test('Test 10: Kochstelle ohne Hinweise, ohne First meldet R1', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('footer')).toContainText('Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.');
  await page.getByRole('button', { name: 'Beispiel laden' }).click();
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');

  const hash = `#b=${LZString.compressToEncodedURIComponent(JSON.stringify(kochstelleOhneFirst))}`;
  await page.goto(`./?t=ohne-first${hash}`);
  await expect(page.locator('#hinweise')).toContainText('A-Bock kann seitlich umkippen');
  await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
});

test('kaputter Link zeigt eine Meldung statt abzustürzen', async ({ page }) => {
  await page.goto('./?t=kaputt#b=abc');
  await expect(page.locator('#meldung')).toContainText(/Link ist beschädigt|Ungültige Bauwerk-Daten/);
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
});
```

Der `?t=…`-Query-Teil erzwingt ein echtes Neuladen. Ein reiner Hash-Wechsel würde über `hashchange` laufen und nicht den Start-Pfad testen.

- [ ] **Step 2: Browser installieren und Test laufen lassen**

Run: `npx playwright install chromium`, danach `npm run e2e`
Expected: 2 passed.

Scheitert der Test an WebGL im Headless-Chromium (`Error creating WebGL context`), hilft `launchOptions: { args: ['--use-gl=swiftshader'] }` im `use`-Block des chromium-Projekts. Das kommt dann auch in `CLAUDE.md` → Known Issues.

- [ ] **Step 3: Vollständige Abschluss-Prüfung (frisch, alles)**

Run nacheinander und jede Ausgabe lesen:

```bash
npm test          # Expected: alle Tests grün, Coverage model/ + rules/ ≥ 80 % in allen vier Metriken
npm run build     # Expected: exit 0
npm run e2e       # Expected: 2 passed
```

Gegen die Spec abhaken:
- [ ] Tests 1–10 der Spec existieren und sind grün (1: ABockQuerRule, 2+3: Integration, 4: ViereckRule, 5: StandflaecheRule + SpreizungRule, 6: SpreizungRule, 7: LoseStangeRule, 8: Baugruppe, 9: share, 10: e2e).
- [ ] Die Fußzeile ist in Editor- und Ansichtsmodus sichtbar.
- [ ] `src/model/` und `src/rules/` importieren kein `three` und nutzen kein `document`/`window`: `grep -rE "from 'three'|document\.|window\." src/model src/rules` findet nichts.
- [ ] Jede Konstante in `src/rules/constants.ts` ist von Jakob bestätigt oder trägt noch `CHECK MANUALLY`. Die offenen bei der Übergabe ausdrücklich nennen.

- [ ] **Step 4: Doku nachziehen**

- `CLAUDE.md`: Jede Sackgasse aus der Umsetzung kommt unter „Known Issues & Failed Attempts“ im Format *What failed / Why / Fix*. Gab es keine, bleibt „_Noch keine._“ stehen.
- `docs/ki-lernlog.md`: jeder Fehler der KI, den Tests, Review oder Jakob gefunden haben.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/smoke.spec.ts CLAUDE.md docs/ki-lernlog.md
git commit -m "test: add browser smoke test for the Kochstelle"
```

- [ ] **Step 6: Push (nur nach Rückfrage bei Jakob)**

```bash
git push
gh run watch --exit-status
```

Expected: Der Pages-Deploy ist grün. Die Live-URL zeigt die Hinweise.

**Ende Meilenstein 2 → Walkthrough 2 + „Gemeinheitsbau“:** Claude erklärt die Regeln, besonders die Grenzen der R2-Heuristik. Jakob baut Konstruktionen, die die Regeln austricksen sollen, zum Beispiel ein verwundenes Viereck, eine Diagonale, die knapp neben dem Bund endet, oder zwei Bauten, die sich nur berühren. Jeder Treffer kommt in `docs/ki-lernlog.md` und wird, wenn er in den v1-Umfang fällt, als neuer Test plus Fix umgesetzt.
