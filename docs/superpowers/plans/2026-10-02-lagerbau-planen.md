# Lagerbau-Simulator v2b: Planen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rechteckige Planen im Planer: an einer Aufhängelinie spannen (eben oder als Satteldach), in 3D zeigen, Seile an ihre Ösen hängen, in Materialliste, Platzbedarf und Datenformat v3 berücksichtigen.

**Architecture:**
- Eine neue unveränderliche Domänen-Klasse `Plane` in `src/model/` berechnet aus Aufhängelinie und Parametern ihre Flächen und 8 Ösen.
- `Bauwerk` bekommt die Liste `planen`. Der `VerankerungsFinder` erkennt Seilenden an Ösen als neue Art `plane`.
- Editor, Panel und Szene nutzen die bestehenden Muster: Zwei-Klick-Werkzeug, Einrasten, Parameter-Formular, three.js-Mesh. Das v2a-Flag `trifftSeile` wird zu einer Liste von Klickzielen pro Werkzeug.

**Tech Stack:** TypeScript, Vite, three.js, Vitest (+ happy-dom), Playwright. Nichts Neues.

**Spec:** `docs/superpowers/specs/2026-10-02-lagerbau-planen-design.md` (v2b). Die v1-Spec und die v2a-Spec (`2026-10-01-lagerbau-abspannungen-design.md`) gelten weiter.

Branch: `feat/planen`, abgezweigt von `main` @ `29323e9` (nach dem Merge von PR #3). Die Spec liegt dort als Commit `a00de51`.

## Global Constraints

- UI-Texte und Domänen-Bezeichner auf Deutsch. Einheiten: Meter, Winkel im Modell in Grad (`neigungGrad`). y zeigt nach oben, der Boden ist y = 0.
- **Keine Statik-Rechnung**, keine Hinweise (Regeln) für Planen selbst. Das Tool prüft nicht, ob eine Plane trägt oder richtig hängt. Die Fußzeile bleibt immer sichtbar.
- `src/model/` und `src/rules/` importieren weder `three` noch DOM-APIs.
- Unveränderliche Domänenobjekte: Methoden geben neue Objekte zurück.
- Abdeckung ≥ 80 % (alle vier Metriken) für `src/model/**` und `src/rules/**`.
- **Plane** (Spec D1):
  - Länge entlang der Linie, mittig zu deren Mittelpunkt;
  - `eben`: die Linie ist die Oberkante, die Breite läuft zur Seite `seite`;
  - `satteldach`: die Linie ist der First, je `breite / 2` zu beiden Seiten; `seite` wird gespeichert, aber ignoriert;
  - Neigung 0° = waagrecht, 90° = senkrecht nach unten;
  - immer genau 8 Ösen (4 Ecken + 4 Kantenmitten der ausgebreiteten Plane).
- **Fehlertexte der Plane (exakt, alle `RangeError`):**
  - „Planenbreite muss größer als 0 sein“
  - „Planenlänge muss größer als 0 sein“
  - „Neigung muss zwischen 0 und 90° liegen“
  - „Unbekannte Planenform“
  - „Seite muss +1 oder -1 sein“
  - „Aufhängelinie zu kurz.“
  - „Aufhängelinie zu steil.“
  - „Plane reicht in den Boden: Neigung, Breite oder Länge verringern.“
- **Verankerung eines Seilendes**, in dieser Reihenfolge: **Haring** (y ≤ `FUSS_TOLERANZ`) → **Plane** (Abstand zur nächsten Öse ≤ `BUND_TOLERANZ`) → **Baum** → **Bau** → **frei**. Bei mehreren Teilen in Reichweite zählt das nächste.
- **Regeln:** R1 zählt nur Seile, deren anderes Ende an Haring, Baum oder Bau hängt. R7 gilt für Seile, deren Enden beide an Bau, Baum oder Plane hängen. R6 und R8 bleiben unverändert.
- **Datenformat:**
  - geschrieben wird immer `version: 3` mit `planen: [{ id, start, ende, breite, laenge, form, neigung, seite }]` (`neigung` in Grad);
  - gelesen werden `version: 1`, `2` und `3`;
  - `MAX_TEILE` zählt Gruppen + Stangen + Seile + Bäume + Planen.
- **Materialliste:** Block „Plane | Anzahl“, Größe als kleinere × größere Seite, beide auf 0,1 m gerundet, Anzeige `3.0 × 4.0 m`, sortiert nach größerer Seite absteigend, dann kleinerer Seite absteigend.
- **Platzbedarf:** achsparalleles Rechteck über alle Füße, Haringe und Planen-Ösen; Bäume zählen nicht.
- **Werkzeug „Plane spannen“** (`'plane'`): Startwerte `STANDARD_PLANE` = 3 × 4 m, `eben`, Seite +1. Beide Enden am Boden → 0°, sonst 30° oder die größte ganze Gradzahl darunter ohne Öse im Boden.
- **Klickziele pro Werkzeug:** Auswahl → `['seil', 'plane']`, Seil spannen → `['plane']`, alle anderen → `[]`.
- Der Web-Build bleibt `base: '/lagerbau-simulator/'`. `npm run e2e:desktop` bleibt grün (5 Tests).
- Commits im Format `<type>: <beschreibung>`. Immer einzelne Dateien stagen, nie `git add -A`. Kein `Co-Authored-By`-Trailer.
- Öffentliches Repo: keine persönlichen Termine, Gruppennamen oder Vault-Interna in Code, Doku oder Commits.

## Abweichungen von der Spec (bewusst)

- **Boden-Meldung nennt auch die Länge:** „Plane reicht in den Boden: Neigung, Breite oder Länge verringern.“ Auf einer schrägen Linie kann der Überstand in den Boden reichen; dann hilft nur eine kürzere Plane.
- `Plane` hält ihre Maße als `params: PlanenParams` (wie `Baum` und die Baugruppen); im JSON heißt das Feld `neigung`, im Modell `neigungGrad`.
- Der `VerankerungsFinder` nimmt jetzt für Planen, Bäume **und** Stangen das nächste Teil in Reichweite. Das schließt das offene Minor „Uneinheitliche Suche in der Verankerung“ aus `docs/ki-lernlog.md`.
- Ösen sind im Seil-Werkzeug zusätzlich nahe Fangpunkte (innerhalb `SNAP_RADIUS`, niedrigste Priorität nach Spitze, Bund, Stangenende). Ein Klick auf eine Plane selbst rastet wie in der Spec auf ihre nächste Öse ein, egal wie weit.
- Seite und Form können nur scheitern, wenn ein Satteldach zu `eben` wird (die volle Breite hängt tiefer). Der Code behandelt jede Ablehnung gleich: Meldung, Auswahl springt zurück.
- Das Neigungsfeld hat die Schrittweite 1 (Grad), nicht 0,05.

## Review Focus

1. **Seil an einer Öse, danach die Plane ändern** (breiter, Seite wechseln). Das alte Seilende hängt dann in der Luft. Erwartet: R8 meldet das Seil, nichts stürzt ab → Test in Task 3 (`planen.integration.test.ts`).
2. **Alte v1- und v2-Links und -Dateien**, darunter die Links in `e2e/smoke.spec.ts` und `e2e/abspannung.spec.ts`. Erwartet: Sie öffnen weiter, mit leerer Planen-Liste → Test in Task 4.
3. **Plane auf einer schrägen Linie, deren Überstand selbst bei 0° in den Boden reicht** (z. B. vom Boden zur Spitze). Erwartet: Meldung, keine Plane, das Werkzeug hängt nicht → Test in Task 6.
4. **Unsinnige Panelwerte** (Breite zu groß, Neigung 120, leeres Feld). Erwartet: deutsche Meldung, das Feld springt auf den Modellwert zurück → Test in Task 7.
5. **Seil zu einer Öse einer Bodenplane.** Erwartet: Das Ende ist ein Haring (wie beim Abstecken), nicht `plane` → Test in Task 2.

## Dateistruktur

| Datei | Verantwortung | Task |
|---|---|---|
| `src/model/params.ts`, `src/model/Plane.ts` (neu) | `PlanenParams`, `STANDARD_PLANE`, Geometrie und Ösen | 1 |
| `src/model/Bauwerk.ts`, `src/model/Verankerung.ts` | Liste `planen`; Verankerungsart `plane` | 2 |
| `src/rules/ABockQuerRule.ts`, `src/rules/StolperfalleRule.ts` | R1/R7 mit Planen | 3 |
| `src/share/BauwerkSerializer.ts` | Format v3 | 4 |
| `src/model/Materialliste.ts`, `src/model/Platzbedarf.ts`, `src/ui/MateriallistePanel.ts` | Planen in Materialliste und Platzbedarf | 5 |
| `src/editor/SnapService.ts`, `src/editor/Werkzeuge.ts`, `src/editor/Editor.ts`, `src/editor/Szene.ts` (nur `treffer`), `src/main.ts`, `index.html` | Werkzeug „Plane spannen“, Ösen-Fang, Klickziele | 6 |
| `src/ui/ParameterPanel.ts` | Panel für die Plane | 7 |
| `src/editor/Szene.ts` | Darstellung der Plane; Sichtprüfung | 8 |
| `e2e/planen.spec.ts` (neu), `package.json`, `README.md`, `CLAUDE.md`, `docs/ki-lernlog.md` | E2E, Version 1.2.0, Doku | 9 |

---

### Task 1: Plane

**Files:**
- Modify: `src/model/params.ts`
- Create: `src/model/Plane.ts`
- Test: `src/model/Plane.test.ts` (neu)

**Interfaces:**
- Consumes: `Vec3` (`add`, `sub`, `scale`, `cross`, `normalize`, `length`, `distanceTo`, `equals`, `Vec3.OBEN`), `MIN_SEILLAENGE`, `FUSS_TOLERANZ` aus `src/model/konstanten.ts`.
- Produces:
  - `type PlanenForm = 'eben' | 'satteldach'`;
  - `interface PlanenParams { breite; laenge; form: PlanenForm; neigungGrad; seite: 1 | -1 }`;
  - `const STANDARD_PLANE: PlanenParams = { breite: 3, laenge: 4, form: 'eben', neigungGrad: 30, seite: 1 }`;
  - `type Viereck = readonly [Vec3, Vec3, Vec3, Vec3]`;
  - `class Plane(id, start, ende, params)` mit `flaechen: readonly Viereck[]`, `oesen: readonly Vec3[]`, `linienLaenge: number`, `mitParams(p): Plane`, `naechsteOese(p: Vec3): Vec3`, `abstandZurOese(p: Vec3): number`.

- [ ] **Step 1: Failing test schreiben**

Neue Datei `src/model/Plane.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type PlanenForm, type PlanenParams, STANDARD_PLANE } from './params';
import { Plane } from './Plane';
import { Vec3 } from './Vec3';

const params = (p: Partial<PlanenParams> = {}): PlanenParams => ({ ...STANDARD_PLANE, ...p });
const plane = (start: Vec3, ende: Vec3, p: Partial<PlanenParams> = {}): Plane => new Plane('pl', start, ende, params(p));
const istBei = (p: Vec3 | undefined, x: number, y: number, z: number): void => {
  expect(p?.equals(new Vec3(x, y, z), 1e-9), `${p?.toArray().join(', ')} ≠ ${x}, ${y}, ${z}`).toBe(true);
};
const enthaelt = (punkte: readonly Vec3[], x: number, y: number, z: number): boolean =>
  punkte.some((q) => q.equals(new Vec3(x, y, z), 1e-9));
const C30 = Math.cos(Math.PI / 6);

describe('Plane', () => {
  it('liegt bei 0° flach: Oberkante an der Linie, die Breite zur Seite +1 (bei einer Linie in +x nach −z)', () => {
    const p = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: 0 });
    expect(p.flaechen).toHaveLength(1);
    const [a, b, c, d] = p.flaechen[0]!;
    istBei(a, 0, 2, 0);
    istBei(b, 4, 2, 0);
    istBei(c, 4, 2, -3);
    istBei(d, 0, 2, -3);
  });

  it('hängt bei 30° die Unterkante um Breite × sin 30° tiefer', () => {
    const [, , c, d] = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0)).flaechen[0]!;
    istBei(c, 4, 0.5, -3 * C30);
    istBei(d, 0, 0.5, -3 * C30);
  });

  it('hängt bei 90° als Wand senkrecht unter der Linie', () => {
    const [, , c, d] = plane(new Vec3(0, 3, 0), new Vec3(4, 3, 0), { neigungGrad: 90 }).flaechen[0]!;
    istBei(c, 4, 0, 0);
    istBei(d, 0, 0, 0);
  });

  it('wechselt mit Seite −1 auf die andere Seite der Linie', () => {
    const [, , c] = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: 0, seite: -1 }).flaechen[0]!;
    istBei(c, 4, 2, 3);
  });

  it('legt die Länge mittig auf die Linie und lässt sie überstehen', () => {
    const [a, b] = plane(new Vec3(0, 2, 0), new Vec3(3, 2, 0)).flaechen[0]!;
    istBei(a, -0.5, 2, 0);
    istBei(b, 3.5, 2, 0);
  });

  it('hat eben immer 8 Ösen: 4 Ecken und 4 Kantenmitten', () => {
    const { oesen } = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: 0 });
    expect(oesen).toHaveLength(8);
    for (const [x, y, z] of [[0, 2, 0], [4, 2, 0], [4, 2, -3], [0, 2, -3], [2, 2, 0], [4, 2, -1.5], [2, 2, -3], [0, 2, -1.5]] as const) {
      expect(enthaelt(oesen, x, y, z), `Öse ${x}, ${y}, ${z}`).toBe(true);
    }
  });

  it('hängt als Satteldach je die halbe Breite zu beiden Seiten; zwei Ösen liegen auf den Firstenden', () => {
    const p = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'satteldach' });
    expect(p.flaechen).toHaveLength(2);
    expect(p.oesen).toHaveLength(8);
    const z = 1.5 * C30;
    for (const [x, y, zz] of [[0, 2, 0], [4, 2, 0], [0, 1.25, -z], [4, 1.25, -z], [0, 1.25, z], [4, 1.25, z], [2, 1.25, -z], [2, 1.25, z]] as const) {
      expect(enthaelt(p.oesen, x, y, zz), `Öse ${x}, ${y}, ${zz}`).toBe(true);
    }
  });

  it('ignoriert beim Satteldach die Seite', () => {
    const plus = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'satteldach', seite: 1 });
    const minus = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'satteldach', seite: -1 });
    for (const o of plus.oesen) expect(enthaelt(minus.oesen, o.x, o.y, o.z)).toBe(true);
  });

  it('bleibt auf einer schrägen Linie ein echtes Rechteck', () => {
    const [a, b, c, d] = plane(new Vec3(0, 1, 0), new Vec3(4, 3, 0), { breite: 2 }).flaechen[0]!;
    expect(b.distanceTo(a)).toBeCloseTo(4, 9);
    expect(d.distanceTo(a)).toBeCloseTo(2, 9);
    expect(b.sub(a).dot(d.sub(a))).toBeCloseTo(0, 9);
    expect(c.sub(b).equals(d.sub(a), 1e-9)).toBe(true);
  });

  it('erlaubt eine Bodenplane genau auf dem Boden und Ösen knapp darunter bis FUSS_TOLERANZ', () => {
    expect(plane(new Vec3(0, 0, 0), new Vec3(4, 0, 0), { neigungGrad: 0 }).oesen.every((o) => Math.abs(o.y) < 1e-9)).toBe(true);
    expect(() => plane(new Vec3(0, 2.96, 0), new Vec3(4, 2.96, 0), { neigungGrad: 90 })).not.toThrow();
    expect(() => plane(new Vec3(0, 2.94, 0), new Vec3(4, 2.94, 0), { neigungGrad: 90 })).toThrow('Plane reicht in den Boden');
  });

  it.each<[string, Vec3, Vec3, Partial<PlanenParams>, string]>([
    ['Breite 0', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { breite: 0 }, 'Planenbreite muss größer als 0 sein'],
    ['Länge negativ', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { laenge: -1 }, 'Planenlänge muss größer als 0 sein'],
    ['Neigung über 90°', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: 91 }, 'Neigung muss zwischen 0 und 90° liegen'],
    ['Neigung keine Zahl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { neigungGrad: Number.NaN }, 'Neigung muss zwischen 0 und 90° liegen'],
    ['unbekannte Form', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'schief' as unknown as PlanenForm }, 'Unbekannte Planenform'],
    ['Seite 0', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { seite: 0 as unknown as 1 }, 'Seite muss +1 oder -1 sein'],
    ['Linie zu kurz', new Vec3(0, 1, 0), new Vec3(0.2, 1, 0), {}, 'Aufhängelinie zu kurz.'],
    ['Linie unendlich', new Vec3(0, 1, 0), new Vec3(Number.POSITIVE_INFINITY, 1, 0), {}, 'Aufhängelinie zu kurz.'],
    ['Linie fast senkrecht', new Vec3(0, 0.5, 0), new Vec3(0.1, 3, 0), {}, 'Aufhängelinie zu steil.'],
    ['Plane im Boden', new Vec3(0, 1, 0), new Vec3(4, 1, 0), {}, 'Plane reicht in den Boden: Neigung, Breite oder Länge verringern.'],
    ['Überstand im Boden', new Vec3(0, 0, 0), new Vec3(2, 1, 0), { neigungGrad: 0 }, 'Plane reicht in den Boden: Neigung, Breite oder Länge verringern.'],
  ])('lehnt ab: %s', (_name, start, ende, p, meldung) => {
    expect(() => plane(start, ende, p)).toThrow(RangeError);
    expect(() => plane(start, ende, p)).toThrow(meldung);
  });

  it('prüft bei mitParams alles neu und behält Id und Linie', () => {
    const p = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0));
    const flach = p.mitParams(params({ neigungGrad: 0 }));
    expect(flach).not.toBe(p);
    expect(flach.id).toBe('pl');
    expect(flach.start).toBe(p.start);
    expect(p.params.neigungGrad).toBe(30);
    expect(() => p.mitParams(params({ breite: 10 }))).toThrow('Plane reicht in den Boden');
  });

  it('findet die nächste Öse und ihren Abstand, und kennt die Linienlänge', () => {
    const p = plane(new Vec3(0, 2, 0), new Vec3(4, 2, 0), { form: 'satteldach' });
    istBei(p.naechsteOese(new Vec3(1.9, 1.3, -1.2)), 2, 1.25, -1.5 * C30);
    expect(p.abstandZurOese(new Vec3(4, 2.03, 0))).toBeCloseTo(0.03, 9);
    expect(p.linienLaenge).toBeCloseTo(4, 9);
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run src/model/Plane.test.ts`
Expected: FAIL, weil `./Plane` und `STANDARD_PLANE` fehlen.

- [ ] **Step 3: Parameter ergänzen**

In `src/model/params.ts` nach `interface BaumParams { … }` einfügen:

```ts
export type PlanenForm = 'eben' | 'satteldach';

export interface PlanenParams {
  readonly breite: number;
  readonly laenge: number;
  readonly form: PlanenForm;
  /** Neigung unter die Waagrechte in Grad: 0 flach, 90 senkrecht. */
  readonly neigungGrad: number;
  /** Zu welcher Seite der Linie eine ebene Plane hängt. Beim Satteldach ohne Wirkung. */
  readonly seite: 1 | -1;
}
```

und am Dateiende anhängen:

```ts

/** Startmaße für „Plane spannen“ (Spec v2b, D2). Keine Regel-Schwellwerte. */
export const STANDARD_PLANE: PlanenParams = { breite: 3, laenge: 4, form: 'eben', neigungGrad: 30, seite: 1 };
```

- [ ] **Step 4: Plane implementieren**

Neue Datei `src/model/Plane.ts`:

```ts
import { FUSS_TOLERANZ, MIN_SEILLAENGE } from './konstanten';
import type { PlanenParams } from './params';
import { Vec3 } from './Vec3';

/** Ein ebenes Viereck im Umlauf: zwei Punkte an der Aufhängelinie, dann zwei an der Außenkante. */
export type Viereck = readonly [Vec3, Vec3, Vec3, Vec3];

const GRAD = Math.PI / 180;
const mitteVon = (p: Vec3, q: Vec3): Vec3 => p.add(q).scale(0.5);

/**
 * Rechteckige Plane an einer Aufhängelinie (Spec v2b, D1). Die Länge läuft mittig entlang der Linie,
 * die Breite quer dazu, um die Neigung unter die Waagrechte gekippt. Kein Durchhang, keine Kräfte.
 */
export class Plane {
  /** Eine Fläche bei `eben`, zwei (je Dachseite) beim Satteldach. */
  readonly flaechen: readonly Viereck[];
  /** Die 8 Ösen: 4 Ecken und 4 Kantenmitten der ausgebreiteten Plane. */
  readonly oesen: readonly Vec3[];

  constructor(
    readonly id: string,
    readonly start: Vec3,
    readonly ende: Vec3,
    readonly params: PlanenParams,
  ) {
    Plane.pruefeParams(params);
    const linie = ende.sub(start);
    const linienLaenge = linie.length();
    if (!Number.isFinite(linienLaenge) || linienLaenge < MIN_SEILLAENGE) throw new RangeError('Aufhängelinie zu kurz.');
    // Ohne waagrechten Anteil gibt es keine Richtung „quer zur Linie“.
    if (Math.hypot(linie.x, linie.z) < MIN_SEILLAENGE) throw new RangeError('Aufhängelinie zu steil.');
    const u = linie.normalize();
    const mitte = mitteVon(start, ende);
    const a = mitte.sub(u.scale(params.laenge / 2));
    const b = mitte.add(u.scale(params.laenge / 2));
    if (params.form === 'eben') {
      const d = Plane.hangrichtung(u, params.seite, params.neigungGrad).scale(params.breite);
      const flaeche: Viereck = [a, b, b.add(d), a.add(d)];
      this.flaechen = [flaeche];
      this.oesen = [...flaeche, mitteVon(a, b), mitteVon(b, b.add(d)), mitteVon(a.add(d), b.add(d)), mitteVon(a, a.add(d))];
    } else {
      const links = Plane.hangrichtung(u, 1, params.neigungGrad).scale(params.breite / 2);
      const rechts = Plane.hangrichtung(u, -1, params.neigungGrad).scale(params.breite / 2);
      this.flaechen = [
        [a, b, b.add(links), a.add(links)],
        [a, b, b.add(rechts), a.add(rechts)],
      ];
      // Die Mitten der kurzen Kanten liegen gefaltet genau auf den Firstenden.
      this.oesen = [a.add(links), b.add(links), b.add(rechts), a.add(rechts), mitte.add(links), mitte.add(rechts), a, b];
    }
    if (this.oesen.some((p) => p.y < -FUSS_TOLERANZ)) {
      throw new RangeError('Plane reicht in den Boden: Neigung, Breite oder Länge verringern.');
    }
  }

  get linienLaenge(): number {
    return this.start.distanceTo(this.ende);
  }

  mitParams(params: PlanenParams): Plane {
    return new Plane(this.id, this.start, this.ende, params);
  }

  naechsteOese(p: Vec3): Vec3 {
    return this.oesen.reduce((beste, o) => (o.distanceTo(p) < beste.distanceTo(p) ? o : beste));
  }

  abstandZurOese(p: Vec3): number {
    return this.naechsteOese(p).distanceTo(p);
  }

  /** Richtung von der Linie weg, quer zu ihr und um die Neigung nach unten gekippt. Steht immer senkrecht auf u. */
  private static hangrichtung(u: Vec3, seite: 1 | -1, neigungGrad: number): Vec3 {
    const quer = Vec3.OBEN.cross(u).normalize().scale(seite);
    const senkrecht = quer.cross(u).normalize();
    const runter = senkrecht.y > 0 ? senkrecht.scale(-1) : senkrecht;
    const w = neigungGrad * GRAD;
    return quer.scale(Math.cos(w)).add(runter.scale(Math.sin(w)));
  }

  private static pruefeParams(p: PlanenParams): void {
    if (!(Number.isFinite(p.breite) && p.breite > 0)) throw new RangeError('Planenbreite muss größer als 0 sein');
    if (!(Number.isFinite(p.laenge) && p.laenge > 0)) throw new RangeError('Planenlänge muss größer als 0 sein');
    if (!(Number.isFinite(p.neigungGrad) && p.neigungGrad >= 0 && p.neigungGrad <= 90)) {
      throw new RangeError('Neigung muss zwischen 0 und 90° liegen');
    }
    if (p.form !== 'eben' && p.form !== 'satteldach') throw new RangeError('Unbekannte Planenform');
    if (p.seite !== 1 && p.seite !== -1) throw new RangeError('Seite muss +1 oder -1 sein');
  }
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/model/Plane.test.ts`
Expected: PASS (alle Tests, darunter 11 Ablehnungsfälle).
Run: `npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/model/params.ts src/model/Plane.ts src/model/Plane.test.ts
git commit -m "feat: add the Plane model with eyelets and ground check"
```

---

### Task 2: Bauwerk und Verankerung

**Files:**
- Modify: `src/model/Bauwerk.ts` (ganze Datei ersetzen), `src/model/Verankerung.ts`
- Test: `src/model/Bauwerk.test.ts`, `src/model/Verankerung.test.ts`

**Interfaces:**
- Consumes: `Plane` (`id`, `oesen`, `abstandZurOese`, `mitParams`), `STANDARD_PLANE` (Task 1).
- Produces:
  - `Bauwerk.planen: readonly Plane[]`, `mitPlane(p)`, `ersetzePlane(p)`, `plane(id)`; `ohne`, `enthaelt`, `istLeer` kennen Planen; `verankerung(punkt)` berücksichtigt Planen;
  - `Verankerung` zusätzlich `{ art: 'plane'; planeId: string }`;
  - `VerankerungsFinder.finde(punkt, stangen, baeume, planen = [])`.

- [ ] **Step 1: Failing tests schreiben**

In `src/model/Bauwerk.test.ts`:
1. Imports ergänzen: `import { Plane } from './Plane';` und `STANDARD_PLANE` in die Zeile `import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN } from './params';`.
2. Als letzten Test im `describe('Bauwerk', …)` anhängen:

```ts
  it('nimmt Planen auf, ersetzt und entfernt sie, ohne sich selbst zu ändern', () => {
    const plane = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);
    const b = Bauwerk.leer().mitPlane(plane);
    expect(b.istLeer).toBe(false);
    expect(b.plane('pl')).toBe(plane);
    expect(b.enthaelt('pl')).toBe(true);
    const flach = plane.mitParams({ ...STANDARD_PLANE, neigungGrad: 0 });
    expect(b.ersetzePlane(flach).plane('pl')).toBe(flach);
    expect(b.plane('pl')).toBe(plane);
    expect(b.ohne('pl').istLeer).toBe(true);
    expect(() => b.mitPlane(plane)).toThrow('ID pl ist schon vergeben');
    expect(() => Bauwerk.leer().ersetzePlane(plane)).toThrow('Plane pl gibt es nicht');
  });

  it('kennt Planen in der Verankerung', () => {
    const plane = new Plane('pl', new Vec3(2, 1, -2), new Vec3(2, 1, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    expect(Bauwerk.leer().mitPlane(plane).verankerung(new Vec3(2, 1, 0))).toEqual({ art: 'plane', planeId: 'pl' });
  });
```

In `src/model/Verankerung.test.ts`:
1. Imports ergänzen: `import { Plane } from './Plane';` und `import { STANDARD_PLANE } from './params';`.
2. Nach `const finder = new VerankerungsFinder();` einfügen:

```ts
// Linie entlang z bei x = 2; die Plane liegt flach Richtung +x. Ösen u. a. bei (2, 1, 0) und (3, 1, 0).
const plane = new Plane('pl', new Vec3(2, 1, -2), new Vec3(2, 1, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
```

3. Als letzte Tests im `describe('VerankerungsFinder', …)` anhängen:

```ts
  it('erkennt eine Plane an einer Öse', () => {
    expect(finder.finde(new Vec3(2.03, 1, 0), [stange], [baum], [plane])).toEqual({ art: 'plane', planeId: 'pl' });
  });

  it('nimmt eine Öse vor einem Baum an derselben Stelle', () => {
    const amStamm = new Plane('st', new Vec3(4.8, 2, -2), new Vec3(4.8, 2, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    expect(finder.finde(new Vec3(4.8, 2, 0), [stange], [baum], [amStamm])).toEqual({ art: 'plane', planeId: 'st' });
  });

  it('macht ein Seilende an der Öse einer Bodenplane zum Haring', () => {
    const bodenplane = new Plane('bp', new Vec3(0, 0, 5), new Vec3(4, 0, 5), { ...STANDARD_PLANE, neigungGrad: 0 });
    expect(finder.finde(new Vec3(2, 0, 5), [stange], [baum], [bodenplane])).toEqual({ art: 'haring' });
  });

  it('nimmt bei zwei Planen in Reichweite die mit der näheren Öse', () => {
    const daneben = new Plane('pl2', new Vec3(2.04, 1, -2), new Vec3(2.04, 1, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    expect(finder.finde(new Vec3(2.03, 1, 0), [], [], [plane, daneben])).toEqual({ art: 'plane', planeId: 'pl2' });
  });

  it('nimmt bei zwei Bäumen in Reichweite den näheren', () => {
    const nah = new Baum('nah', new Vec3(5.03, 0, 0), { durchmesser: 0.4, hoehe: 10 });
    expect(finder.finde(new Vec3(4.83, 2, 0), [], [baum, nah], [])).toEqual({ art: 'baum', baumId: 'nah' });
  });
```

Zum letzten Test: Der Punkt (4,83 | 2 | 0) liegt 0,03 m von der Stammoberfläche von `baum` (Mitte x = 5, Radius 0,2) und 0 m von der von `nah` (Mitte x = 5,03). Heute liefert der Finder den ersten Baum in der Liste, also `b`.

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/model/Bauwerk.test.ts src/model/Verankerung.test.ts`
Expected: FAIL. `mitPlane` fehlt, der Finder kennt keine Planen, und der Baum-Test liefert `b` statt `nah`.

- [ ] **Step 3: Verankerung erweitern**

In `src/model/Verankerung.ts`:
1. Import ergänzen: `import type { Plane } from './Plane';`
2. Den Typ `Verankerung` ersetzen durch:

```ts
/** Woran ein Seilende hängt. Wird aus der Geometrie abgeleitet, nie gespeichert. */
export type Verankerung =
  | { readonly art: 'haring' }
  | { readonly art: 'plane'; readonly planeId: string }
  | { readonly art: 'baum'; readonly baumId: string }
  | { readonly art: 'bau'; readonly stangeId: string }
  | { readonly art: 'frei' };
```

3. Die Methode `finde` samt Kommentar ersetzen durch:

```ts
  /**
   * Reihenfolge: Boden vor Plane vor Baum vor Stange (Spec v2b, D1). Bei mehreren Teilen in Reichweite zählt das nächste.
   * Ein Ende an der Öse einer Bodenplane ist ein Haring, wie beim Abstecken.
   */
  finde(punkt: Vec3, stangen: readonly Stange[], baeume: readonly Baum[], planen: readonly Plane[] = []): Verankerung {
    if (punkt.y <= this.bodenToleranz) return { art: 'haring' };
    const plane = this.naechstes(planen, (p) => p.abstandZurOese(punkt));
    if (plane) return { art: 'plane', planeId: plane.id };
    const baum = this.naechstes(baeume, (b) => b.abstandZumStamm(punkt));
    if (baum) return { art: 'baum', baumId: baum.id };
    const stange = this.naechstes(stangen, (s) => s.naechsterPunkt(punkt).distanceTo(punkt));
    return stange ? { art: 'bau', stangeId: stange.id } : { art: 'frei' };
  }

  /** Das nächste Teil innerhalb der Toleranz, sonst null. Gleiche Frage, gleiche Antwort für Planen, Bäume und Stangen. */
  private naechstes<T>(teile: readonly T[], abstand: (teil: T) => number): T | null {
    let bestes: { readonly teil: T; readonly abstand: number } | null = null;
    for (const teil of teile) {
      const a = abstand(teil);
      if (a <= this.toleranz && (bestes === null || a < bestes.abstand)) bestes = { teil, abstand: a };
    }
    return bestes?.teil ?? null;
  }
```

- [ ] **Step 4: Bauwerk ersetzen**

`src/model/Bauwerk.ts` komplett ersetzen durch:

```ts
import type { Baugruppe } from './Baugruppe';
import type { Baum } from './Baum';
import { type Bund, BundFinder } from './Bund';
import { Fuss } from './Fuss';
import type { Plane } from './Plane';
import type { Seil } from './Seil';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';
import { type Haring, type Verankerung, VerankerungsFinder } from './Verankerung';

/** Unveränderliches Aggregat aus Baugruppen, freien Stangen, Seilen, Bäumen und Planen. Bünde und Füße werden abgeleitet. */
export class Bauwerk {
  private constructor(
    readonly gruppen: readonly Baugruppe[],
    readonly freieStangen: readonly Stange[],
    readonly seile: readonly Seil[],
    readonly baeume: readonly Baum[],
    readonly planen: readonly Plane[],
  ) {}

  static leer(): Bauwerk {
    return new Bauwerk([], [], [], [], []);
  }

  get istLeer(): boolean {
    return (
      this.gruppen.length === 0 &&
      this.freieStangen.length === 0 &&
      this.seile.length === 0 &&
      this.baeume.length === 0 &&
      this.planen.length === 0
    );
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

  plane(id: string): Plane | undefined {
    return this.planen.find((p) => p.id === id);
  }

  enthaelt(id: string): boolean {
    return (
      this.gruppe(id) !== undefined ||
      this.stange(id) !== undefined ||
      this.seil(id) !== undefined ||
      this.baum(id) !== undefined ||
      this.plane(id) !== undefined
    );
  }

  /** Klickt man eine Gruppenstange an, wird die ganze Gruppe ausgewählt. */
  auswahlIdFuer(stangeId: string): string {
    return this.stange(stangeId)?.gruppeId ?? stangeId;
  }

  mitGruppe(gruppe: Baugruppe): Bauwerk {
    this.pruefeNeu([gruppe.id, ...gruppe.stangen().map((s) => s.id)]);
    return new Bauwerk([...this.gruppen, gruppe], this.freieStangen, this.seile, this.baeume, this.planen);
  }

  ersetzeGruppe(gruppe: Baugruppe): Bauwerk {
    if (!this.gruppe(gruppe.id)) throw new Error(`Baugruppe ${gruppe.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen.map((g) => (g.id === gruppe.id ? gruppe : g)),
      this.freieStangen,
      this.seile,
      this.baeume,
      this.planen,
    );
  }

  mitStange(stange: Stange): Bauwerk {
    if (stange.gruppeId !== null) throw new Error('Nur freie Stangen können direkt hinzugefügt werden');
    this.pruefeNeu([stange.id]);
    return new Bauwerk(this.gruppen, [...this.freieStangen, stange], this.seile, this.baeume, this.planen);
  }

  ersetzeStange(stange: Stange): Bauwerk {
    if (!this.freieStangen.some((s) => s.id === stange.id)) throw new Error(`Freie Stange ${stange.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen.map((s) => (s.id === stange.id ? stange : s)),
      this.seile,
      this.baeume,
      this.planen,
    );
  }

  mitSeil(seil: Seil): Bauwerk {
    this.pruefeNeu([seil.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, [...this.seile, seil], this.baeume, this.planen);
  }

  mitBaum(baum: Baum): Bauwerk {
    this.pruefeNeu([baum.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, this.seile, [...this.baeume, baum], this.planen);
  }

  ersetzeBaum(baum: Baum): Bauwerk {
    if (!this.baum(baum.id)) throw new Error(`Baum ${baum.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen,
      this.seile,
      this.baeume.map((b) => (b.id === baum.id ? baum : b)),
      this.planen,
    );
  }

  mitPlane(plane: Plane): Bauwerk {
    this.pruefeNeu([plane.id]);
    return new Bauwerk(this.gruppen, this.freieStangen, this.seile, this.baeume, [...this.planen, plane]);
  }

  ersetzePlane(plane: Plane): Bauwerk {
    if (!this.plane(plane.id)) throw new Error(`Plane ${plane.id} gibt es nicht`);
    return new Bauwerk(
      this.gruppen,
      this.freieStangen,
      this.seile,
      this.baeume,
      this.planen.map((p) => (p.id === plane.id ? plane : p)),
    );
  }

  ohne(id: string): Bauwerk {
    return new Bauwerk(
      this.gruppen.filter((g) => g.id !== id),
      this.freieStangen.filter((s) => s.id !== id),
      this.seile.filter((s) => s.id !== id),
      this.baeume.filter((b) => b.id !== id),
      this.planen.filter((p) => p.id !== id),
    );
  }

  buende(): readonly Bund[] {
    return new BundFinder().finde(this.stangen());
  }

  fuesse(): readonly Fuss[] {
    return this.stangen().flatMap((s) => Fuss.von(s));
  }

  haringe(): readonly Haring[] {
    return new VerankerungsFinder().haringe(this.seile);
  }

  /** Woran ein Punkt hängt (Haring, Plane, Baum, Stange oder frei), z. B. ein Seilende. */
  verankerung(punkt: Vec3): Verankerung {
    return new VerankerungsFinder().finde(punkt, this.stangen(), this.baeume, this.planen);
  }

  private pruefeNeu(ids: readonly string[]): void {
    for (const id of ids) {
      if (this.enthaelt(id)) throw new Error(`ID ${id} ist schon vergeben`);
    }
  }
}
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/model`
Expected: PASS, alle Modell-Tests inklusive der neuen.
Run: `npx tsc --noEmit`
Expected: Exit 0. Die Regeln vergleichen `art` nur mit Literalen, eine neue Art bricht dort nichts.

- [ ] **Step 6: Commit**

```bash
git add src/model/Bauwerk.ts src/model/Verankerung.ts src/model/Bauwerk.test.ts src/model/Verankerung.test.ts
git commit -m "feat: add tarps to Bauwerk and anchor rope ends at eyelets"
```

---

### Task 3: Planen in den Regeln (R1, R7)

**Files:**
- Modify: `src/rules/ABockQuerRule.ts`, `src/rules/StolperfalleRule.ts`
- Test: `src/rules/ABockQuerRule.test.ts`, `src/rules/StolperfalleRule.test.ts`, `src/rules/LosesSeilRule.test.ts`, `src/rules/planen.integration.test.ts` (neu)

**Interfaces:**
- Consumes: `Plane`, `STANDARD_PLANE` (Task 1), `Bauwerk.mitPlane`, `ersetzePlane`, Verankerungsart `plane` (Task 2), `RuleEngine`, `standardRegeln`.
- Produces: R1 zählt nur Seile mit anderem Ende an Haring, Baum oder Bau; R7 zählt `plane` wie Bau und Baum.

- [ ] **Step 1: Failing tests schreiben**

In `src/rules/ABockQuerRule.test.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';` und `STANDARD_PLANE` in die Zeile `import { STANDARD_ABOCK } from '../model/params';`.
2. Als letzten Test im `describe` anhängen:

```ts
  it('zählt Seile zu Planen nicht als Sicherung (Spec v2b, D3)', () => {
    // Ösen bei (−2 | 1 | 3) und (2 | 1 | 3), also auf beiden Seiten der A-Ebene x = 0.
    const plane = new Plane('pl', new Vec3(-2, 1, 3), new Vec3(2, 1, 3), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    const b = Bauwerk.leer()
      .mitGruppe(abock)
      .mitPlane(plane)
      .mitSeil(new Seil('l', abock.spitze(), new Vec3(-2, 1, 3)))
      .mitSeil(new Seil('r', abock.spitze(), new Vec3(2, 1, 3)));
    expect(pruefe(b)).toHaveLength(1);
  });
```

In `src/rules/StolperfalleRule.test.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';` und `import { STANDARD_PLANE } from '../model/params';`.
2. Als letzten Test im `describe` anhängen:

```ts
  it('meldet ein tiefes Seil von einer Planen-Öse zum Baum (Spec v2b, D3)', () => {
    // Linie entlang z bei x = 4, Öse in der Mitte bei (4 | 1 | 6); der Baumstamm hat seine Oberfläche bei (0,2 | y | 6).
    const plane = new Plane('pl', new Vec3(4, 1, 4), new Vec3(4, 1, 8), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    const seil = new Seil('ob', new Vec3(4, 1, 6), new Vec3(0.2, 1, 6));
    expect(regel.pruefe(new Analyse(basis.mitPlane(plane).mitSeil(seil)))).toHaveLength(1);
  });
```

In `src/rules/LosesSeilRule.test.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';` und `import { STANDARD_PLANE } from '../model/params';`.
2. Als letzten Test im `describe` anhängen:

```ts
  it('zählt ein Seilende an einer Planen-Öse als befestigt (Spec v2b, D3)', () => {
    const plane = new Plane('pl', new Vec3(2, 1, -2), new Vec3(2, 1, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    const b = Bauwerk.leer().mitStange(pfosten).mitPlane(plane).mitSeil(new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 1, 0)));
    expect(new LosesSeilRule().pruefe(new Analyse(b))).toEqual([]);
  });
```

Neue Datei `src/rules/planen.integration.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Plane } from '../model/Plane';
import { STANDARD_PLANE } from '../model/params';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { RuleEngine } from './RuleEngine';
import { standardRegeln } from './standardRegeln';

const regeln = new RuleEngine(standardRegeln());
const regelnVon = (b: Bauwerk): string[] => regeln.pruefe(b).map((h) => h.regel);

describe('Planen in den Regeln (Spec v2b, D3)', () => {
  it('bringt in der Kochstelle mit Satteldach keinen Hinweis', () => {
    const k = kochstelle();
    const dach = new Plane('dach', k.gruppe('abock')!.spitze(), k.gruppe('dreibein')!.spitze(), { ...STANDARD_PLANE, form: 'satteldach' });
    expect(regelnVon(k.mitPlane(dach))).toEqual([]);
  });

  it('meldet ein Seil per R8, wenn die Plane danach ihre Breite oder Seite ändert', () => {
    // Linie entlang z bei x = 0, flach Richtung +x; Öse in der Mitte der Außenkante bei (3 | 2,5 | 0).
    const plane = new Plane('pl', new Vec3(0, 2.5, -2), new Vec3(0, 2.5, 2), { ...STANDARD_PLANE, neigungGrad: 0 });
    const vorher = Bauwerk.leer().mitPlane(plane).mitSeil(new Seil('s', new Vec3(3, 2.5, 0), new Vec3(5, 0, 0)));
    expect(regelnVon(vorher)).toEqual([]);
    const schmaler = vorher.ersetzePlane(plane.mitParams({ ...plane.params, breite: 2 }));
    expect(regelnVon(schmaler)).toEqual(['R8']);
    const gewechselt = vorher.ersetzePlane(plane.mitParams({ ...plane.params, seite: -1 }));
    expect(regelnVon(gewechselt)).toEqual(['R8']);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/rules`
Expected: FAIL in genau zwei Tests:
- R1: Bekommt `[]` statt 1 Hinweis, weil `plane` heute als verankert zählt;
- R7: Bekommt `[]` statt 1 Hinweis, weil `plane` nicht als Querseil-Ende zählt.

R8 und der Integrationstest laufen schon grün; sie sichern die neue Verankerung aus Task 2 ab.

- [ ] **Step 3: R1 anpassen**

In `src/rules/ABockQuerRule.ts`:
1. Import ergänzen: `import type { Verankerung } from '../model/Verankerung';`
2. Unter den Imports einfügen:

```ts
/** Nur diese Enden halten einen A-Bock seitlich. Eine Plane hält ihn nicht, ein freies Ende auch nicht (Spec v2b, D3). */
const HAELT_SEITLICH: ReadonlySet<Verankerung['art']> = new Set(['haring', 'baum', 'bau']);
```

3. In `istBeidseitigAbgespannt` den Kommentar und die Zeile `.filter((x) => x.anderes.art !== 'frei')` ersetzen:

```ts
  /** Spec v2a, D3: je mindestens ein verankertes Seil auf beiden Seiten der A-Ebene. Enden in der Ebene zählen nicht. */
```
wird zu
```ts
  /** Spec v2a/v2b, D3: je mindestens ein Seil zu Haring, Baum oder Bau auf beiden Seiten der A-Ebene. Enden in der Ebene zählen nicht. */
```
und
```ts
      .filter((x) => x.anderes.art !== 'frei')
```
wird zu
```ts
      .filter((x) => HAELT_SEITLICH.has(x.anderes.art))
```

- [ ] **Step 4: R7 anpassen**

In `src/rules/StolperfalleRule.ts` den Klassenkommentar und die Zeile mit `istQuerseil` ersetzen:

```ts
/** R7: Ein Querseil (Bau↔Bau, Bau↔Baum, Baum↔Baum) darf nicht tief hängen. Seile zum Haring sind normal. */
```
wird zu
```ts
/** R7: Ein Querseil (beide Enden an Bau, Baum oder Plane) darf nicht tief hängen. Seile zum Haring sind normal, freie Enden meldet R8. */
```
und
```ts
      const istQuerseil = a.verankerungVon(s.id).every((v) => v.art === 'bau' || v.art === 'baum');
```
wird zu
```ts
      const istQuerseil = a.verankerungVon(s.id).every((v) => v.art === 'bau' || v.art === 'baum' || v.art === 'plane');
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run src/rules`
Expected: PASS, alle Regel-Tests.

- [ ] **Step 6: Commit**

```bash
git add src/rules/ABockQuerRule.ts src/rules/StolperfalleRule.ts src/rules/ABockQuerRule.test.ts src/rules/StolperfalleRule.test.ts src/rules/LosesSeilRule.test.ts src/rules/planen.integration.test.ts
git commit -m "feat: let R1 ignore ropes to tarps and R7 check them"
```

---

### Task 4: Datenformat Version 3

**Files:**
- Modify: `src/share/BauwerkSerializer.ts`
- Test: `src/share/share.test.ts`

**Interfaces:**
- Consumes: `Plane`, `PlanenForm` (Task 1), `Bauwerk.planen`, `mitPlane` (Task 2).
- Produces: `PlaneJson`; `BauwerkJson` mit `version: 3` und `planen`; `ausJson` liest v1, v2 und v3.

- [ ] **Step 1: Failing tests schreiben**

In `src/share/share.test.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';` und `import { STANDARD_PLANE } from '../model/params';`.
2. Direkt über `describe('BauwerkSerializer', …)` einfügen:

```ts
const planeJson = { id: 'p', start: [0, 2, 0], ende: [4, 2, 0], breite: 3, laenge: 4, form: 'eben', neigung: 30, seite: 1 };
const v3 = (planen: readonly object[]) => ({ version: 3, gruppen: [], stangen: [], seile: [], baeume: [], planen });
```

3. Im Test „speichert Gruppen als Parameter …“ die Zeile `expect(json.version).toBe(2);` ersetzen durch `expect(json.version).toBe(3);`.
4. In der `it.each`-Liste die Zeile
   `['falsche Version', { version: 3, gruppen: [], stangen: [], seile: [], baeume: [] }],`
   ersetzen durch
   `['falsche Version', { version: 4, gruppen: [], stangen: [], seile: [], baeume: [], planen: [] }],`
   und direkt darunter einfügen:

```ts
    ['v3 ohne Planen-Liste', { version: 3, gruppen: [], stangen: [], seile: [], baeume: [] }],
    ['Plane mit unbekannter Form', v3([{ ...planeJson, form: 'schief' }])],
    ['Plane mit Seite 0', v3([{ ...planeJson, seite: 0 }])],
    ['Plane ohne Neigung', v3([{ ...planeJson, neigung: undefined }])],
    ['Plane im Boden', v3([{ ...planeJson, start: [0, 0.5, 0], ende: [4, 0.5, 0], neigung: 90 }])],
```

5. Als letzte Tests im `describe('BauwerkSerializer', …)` anhängen:

```ts
  it('übersteht die Rundreise mit Planen (Version 3)', () => {
    const plane = new Plane('plane', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { ...STANDARD_PLANE, form: 'satteldach' });
    const json = serializer.zuJson(kochstelle().mitPlane(plane));
    expect(json.version).toBe(3);
    expect(json.planen).toEqual([
      { id: 'plane', start: [0, 2, 0], ende: [4, 2, 0], breite: 3, laenge: 4, form: 'satteldach', neigung: 30, seite: 1 },
    ]);
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });

  it('liest v2-Daten ohne Planen', () => {
    const b = serializer.ausJson({ version: 2, gruppen: [], stangen: [], seile: [], baeume: [] });
    expect(b.planen).toEqual([]);
  });

  it('zählt Planen zu den Teilen', () => {
    const planen = Array.from({ length: MAX_TEILE }, (_, i) => ({ ...planeJson, id: `plane${i}` }));
    expect(serializer.ausJson(v3(planen)).planen).toHaveLength(MAX_TEILE);
    expect(() => serializer.ausJson(v3([...planen, { ...planeJson, id: 'zuviel' }]))).toThrow(/^Ungültige Bauwerk-Daten: /);
  });
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/share`
Expected: FAIL. `version` ist noch 2, `json.planen` ist `undefined`, v3-Daten gelten als „unbekannte Version“.

- [ ] **Step 3: Serializer erweitern**

In `src/share/BauwerkSerializer.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';` und `PlanenForm` in die Zeile `import type { ABockParams, DreibeinParams } from '../model/params';` (wird zu `import type { ABockParams, DreibeinParams, PlanenForm } from '../model/params';`).
2. Nach `interface BaumJson { … }` einfügen:

```ts
export interface PlaneJson {
  readonly id: string;
  readonly start: V3;
  readonly ende: V3;
  readonly breite: number;
  readonly laenge: number;
  readonly form: PlanenForm;
  /** Grad. */
  readonly neigung: number;
  readonly seite: 1 | -1;
}
```

3. `interface BauwerkJson` ersetzen durch:

```ts
export interface BauwerkJson {
  readonly version: 3;
  readonly gruppen: readonly GruppeJson[];
  readonly stangen: readonly StangeJson[];
  readonly seile: readonly SeilJson[];
  readonly baeume: readonly BaumJson[];
  readonly planen: readonly PlaneJson[];
}
```

4. In `zuJson`: `version: 2,` wird zu `version: 3,`. Nach dem Block `baeume: bauwerk.baeume.map(…),` einfügen:

```ts
      planen: bauwerk.planen.map((p) => ({
        id: p.id,
        start: p.start.toArray(),
        ende: p.ende.toArray(),
        breite: p.params.breite,
        laenge: p.params.laenge,
        form: p.params.form,
        neigung: p.params.neigungGrad,
        seite: p.params.seite,
      })),
```

5. In `lies` alles ab `if (o.version !== 1 && o.version !== 2)` bis zum Ende der Methode ersetzen durch:

```ts
    if (o.version !== 1 && o.version !== 2 && o.version !== 3) throw new Error('unbekannte Version');
    const rohGruppen = liste(o.gruppen, 'gruppen');
    const rohStangen = liste(o.stangen, 'stangen');
    // Version 1 kannte noch keine Seile und Bäume, Version 2 noch keine Planen.
    const rohSeile = o.version === 1 ? [] : liste(o.seile, 'seile');
    const rohBaeume = o.version === 1 ? [] : liste(o.baeume, 'baeume');
    const rohPlanen = o.version === 3 ? liste(o.planen, 'planen') : [];
    const anzahl = rohGruppen.length + rohStangen.length + rohSeile.length + rohBaeume.length + rohPlanen.length;
    if (anzahl > MAX_TEILE) throw new Error(`mehr als ${MAX_TEILE} Teile`);
    const mitGruppen = rohGruppen.map((g) => this.liesGruppe(g)).reduce((b, g) => b.mitGruppe(g), Bauwerk.leer());
    const mitStangen = rohStangen.map((s) => this.liesStange(s)).reduce((b, s) => b.mitStange(s), mitGruppen);
    const mitBaeumen = rohBaeume.map((b) => this.liesBaum(b)).reduce((bw, b) => bw.mitBaum(b), mitStangen);
    const mitPlanen = rohPlanen.map((p) => this.liesPlane(p)).reduce((b, p) => b.mitPlane(p), mitBaeumen);
    return rohSeile.map((s) => this.liesSeil(s)).reduce((b, s) => b.mitSeil(s), mitPlanen);
  }
```

(Der ersetzte Block beginnt mit der Versionsprüfung und umfasst die bisherigen Zeilen `const rohGruppen …` und `const rohStangen …`; im neuen Block stehen sie wieder, also nur einmal.)

6. Nach `liesBaum` als letzte Methode der Klasse einfügen:

```ts
  private liesPlane(daten: unknown): Plane {
    const o = objekt(daten, 'Plane');
    const form = o.form;
    if (form !== 'eben' && form !== 'satteldach') throw new Error('form unbekannt');
    const seite = o.seite;
    if (seite !== 1 && seite !== -1) throw new Error('seite muss 1 oder -1 sein');
    return new Plane(text(o.id, 'id'), vektor(o.start, 'start'), vektor(o.ende, 'ende'), {
      breite: zahl(o.breite, 'breite'),
      laenge: zahl(o.laenge, 'laenge'),
      form,
      neigungGrad: zahl(o.neigung, 'neigung'),
      seite,
    });
  }
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/share`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/share/BauwerkSerializer.ts src/share/share.test.ts
git commit -m "feat: save tarps in data format version 3"
```

---

### Task 5: Planen in Materialliste und Platzbedarf

**Files:**
- Modify: `src/model/Materialliste.ts`, `src/model/Platzbedarf.ts`, `src/ui/MateriallistePanel.ts`
- Test: `src/model/Materialliste.test.ts`, `src/model/Platzbedarf.test.ts`, `src/ui/MateriallistePanel.test.ts`

**Interfaces:**
- Consumes: `Plane` (`params`, `oesen`), `STANDARD_PLANE` (Task 1), `Bauwerk.planen` (Task 2).
- Produces: `PlanenZeile { breite; laenge; anzahl }`, `Materialliste.planen: readonly PlanenZeile[]`; `Platzbedarf.aus` zählt Ösen.

- [ ] **Step 1: Failing tests schreiben**

In `src/model/Materialliste.test.ts`:
1. Imports ergänzen: `import { Plane } from './Plane';` und `import { STANDARD_PLANE } from './params';`.
2. Als letzten Test im `describe('Materialliste', …)` anhängen:

```ts
  it('gruppiert Planen nach Größe, kleinere Seite zuerst, auf 0,1 m gerundet', () => {
    const bodenplane = (id: string, breite: number, laenge: number): Plane =>
      new Plane(id, Vec3.NULL, new Vec3(4, 0, 0), { ...STANDARD_PLANE, neigungGrad: 0, breite, laenge });
    const b = [bodenplane('a', 3, 4), bodenplane('b', 4, 3), bodenplane('c', 3.04, 4), bodenplane('d', 2, 2), bodenplane('e', 2, 5)].reduce(
      (bw, p) => bw.mitPlane(p),
      Bauwerk.leer(),
    );
    expect(Materialliste.aus(b, 0.5).planen).toEqual([
      { breite: 2, laenge: 5, anzahl: 1 },
      { breite: 3, laenge: 4, anzahl: 3 },
      { breite: 2, laenge: 2, anzahl: 1 },
    ]);
    expect(Materialliste.aus(Bauwerk.leer(), 0.5).planen).toEqual([]);
  });
```

In `src/model/Platzbedarf.test.ts`:
1. Imports ergänzen: `import { Plane } from './Plane';` und `STANDARD_PLANE` in die Zeile `import { STANDARD_ABOCK, STANDARD_BAUM } from './params';`.
2. Als letzte Tests im `describe('Platzbedarf', …)` anhängen:

```ts
  it('zählt alle Ösen einer Plane mit, auch den Überstand eines Regendachs', () => {
    const regendach = new Plane('dach', new Vec3(0, 2, 0), new Vec3(3, 2, 0), STANDARD_PLANE); // 30°, 3 × 4 m
    const p = Platzbedarf.aus(kochstelle().mitPlane(regendach));
    expect(p?.laenge).toBeCloseTo(4, 9); // x von −0,5 bis 3,5
    expect(p?.breite).toBeCloseTo(0.8 + 3 * Math.cos(Math.PI / 6), 9); // z von −2,6 bis 0,8
  });

  it('gibt auch einer Plane allein einen Platzbedarf', () => {
    const plane = new Plane('pl', new Vec3(0, 1, 0), new Vec3(4, 1, 0), { ...STANDARD_PLANE, neigungGrad: 0 });
    const p = Platzbedarf.aus(Bauwerk.leer().mitPlane(plane));
    expect(p?.laenge).toBeCloseTo(4, 9);
    expect(p?.breite).toBeCloseTo(3, 9);
  });
```

In `src/ui/MateriallistePanel.test.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';` und `STANDARD_PLANE` in die Zeile `import { STANDARD_ABOCK } from '../model/params';`.
2. Im Test „lässt Seile, Haringe und Platzbedarf weg …“ nach `expect(tabelle.textContent).not.toContain('Haringe');` einfügen:
   `expect(tabelle.textContent).not.toContain('Plane');`
3. Als letzten Test im `describe` anhängen:

```ts
  it('zeigt Planen nach Größe mit der kleineren Seite zuerst', () => {
    const bodenplane = (id: string, breite: number, laenge: number): Plane =>
      new Plane(id, Vec3.NULL, new Vec3(4, 0, 0), { ...STANDARD_PLANE, neigungGrad: 0, breite, laenge });
    const { tabelle } = zeige(Bauwerk.leer().mitPlane(bodenplane('a', 3, 4)).mitPlane(bodenplane('b', 4, 3)));
    const zeilen = [...tabelle.querySelectorAll('tr')].map((tr) => [...tr.children].map((zelle) => zelle.textContent));
    expect(zeilen).toContainEqual(['Plane', '', 'Anzahl']);
    expect(zeilen).toContainEqual(['3.0 × 4.0 m', '', '2']);
  });
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/model/Materialliste.test.ts src/model/Platzbedarf.test.ts src/ui/MateriallistePanel.test.ts`
Expected: FAIL. `planen` ist `undefined`, der Platzbedarf kennt keine Ösen, die Tabelle hat keine Planen-Zeilen.

- [ ] **Step 3: Materialliste erweitern**

`src/model/Materialliste.ts` komplett ersetzen durch:

```ts
import type { Bauwerk } from './Bauwerk';
import { Platzbedarf } from './Platzbedarf';
import { Stangenliste } from './Stangenliste';

export interface SeilZeile {
  readonly laenge: number;
  readonly anzahl: number;
}

export interface PlanenZeile {
  /** Kürzere Seite in m, auf 0,1 m gerundet. */
  readonly breite: number;
  /** Längere Seite in m, auf 0,1 m gerundet. */
  readonly laenge: number;
  readonly anzahl: number;
}

const aufZehntel = (x: number): number => Math.round(x * 10) / 10;

/** Alles, was man zum Aufbauen holen muss: Stangen, Seile, Haringe, Planen, dazu der Platzbedarf. */
export class Materialliste {
  private constructor(
    readonly stangen: Stangenliste,
    readonly seile: readonly SeilZeile[],
    readonly anzahlHaringe: number,
    readonly planen: readonly PlanenZeile[],
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
    return new Materialliste(
      Stangenliste.aus(bauwerk),
      seile,
      bauwerk.haringe().length,
      Materialliste.planen(bauwerk),
      Platzbedarf.aus(bauwerk),
    );
  }

  /** Planen nach Größe gruppiert; 4 × 3 zählt als 3 × 4 (Spec v2b, D4). */
  private static planen(bauwerk: Bauwerk): PlanenZeile[] {
    const zeilen = new Map<string, PlanenZeile>();
    for (const p of bauwerk.planen) {
      const a = aufZehntel(p.params.breite);
      const b = aufZehntel(p.params.laenge);
      const breite = Math.min(a, b);
      const laenge = Math.max(a, b);
      const schluessel = `${breite}×${laenge}`;
      zeilen.set(schluessel, { breite, laenge, anzahl: (zeilen.get(schluessel)?.anzahl ?? 0) + 1 });
    }
    return [...zeilen.values()].sort((x, y) => y.laenge - x.laenge || y.breite - x.breite);
  }
}
```

- [ ] **Step 4: Platzbedarf erweitern**

In `src/model/Platzbedarf.ts` den Kommentar über der Klasse und die erste Zeile von `aus` ersetzen:

```ts
/** Achsparalleles Rechteck am Boden über alle Füße und Haringe (Spec v2a, D4). Bäume zählen nicht. */
```
wird zu
```ts
/** Achsparalleles Rechteck am Boden über alle Füße, Haringe und Planen-Ösen (Spec v2a/v2b, D4). Bäume zählen nicht. */
```
und
```ts
    const punkte = [...bauwerk.fuesse().map((f) => f.position), ...bauwerk.haringe().map((h) => h.position)];
```
wird zu
```ts
    const punkte = [
      ...bauwerk.fuesse().map((f) => f.position),
      ...bauwerk.haringe().map((h) => h.position),
      ...bauwerk.planen.flatMap((p) => p.oesen),
    ];
```

- [ ] **Step 5: Panel erweitern**

In `src/ui/MateriallistePanel.ts`:
1. In `zeige` die erste Zeile ersetzen:
   `const { stangen, seile, anzahlHaringe, platzbedarf } = liste;`
   wird zu
   `const { stangen, seile, anzahlHaringe, planen, platzbedarf } = liste;`
2. Nach der Zeile `...(anzahlHaringe > 0 ? [zeile('td', ['Haringe', '', String(anzahlHaringe)])] : []),` einfügen:

```ts
      ...(planen.length > 0
        ? [
            zeile('th', ['Plane', '', 'Anzahl']),
            ...planen.map((p) => zeile('td', [`${p.breite.toFixed(1)} × ${p.laenge.toFixed(1)} m`, '', String(p.anzahl)])),
          ]
        : []),
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run src/model src/ui/MateriallistePanel.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/model/Materialliste.ts src/model/Platzbedarf.ts src/ui/MateriallistePanel.ts src/model/Materialliste.test.ts src/model/Platzbedarf.test.ts src/ui/MateriallistePanel.test.ts
git commit -m "feat: list tarps by size and count their eyelets in the space required"
```

---

### Task 6: Werkzeug „Plane spannen“, Ösen-Fang, Klickziele

**Files:**
- Modify: `src/editor/SnapService.ts`, `src/editor/Werkzeuge.ts`, `src/editor/Editor.ts`, `src/editor/Szene.ts` (nur `treffer`), `src/main.ts`, `index.html`
- Test: `src/editor/SnapService.test.ts`, `src/editor/Editor.test.ts`

**Interfaces:**
- Consumes: `Plane` (`naechsteOese`, `oesen`), `STANDARD_PLANE` (Task 1), `Bauwerk.mitPlane`, `plane(id)`, `planen` (Task 2), `MIN_SEILLAENGE`, `FUSS_TOLERANZ`.
- Produces:
  - `Treffer` zusätzlich `{ art: 'plane'; punkt; planeId }`;
  - `SnapArt` zusätzlich `'oese'`; `SnapService.snap(treffer, bauwerk, mitOesen = false)`;
  - `type KlickZiel = 'seil' | 'plane'`; `Werkzeug.klickZiele: readonly KlickZiel[]` ersetzt `trifftSeile`;
  - `Editor.klickZiele` ersetzt `Editor.trifftSeile`;
  - `WerkzeugName` zusätzlich `'plane'`; Klasse `DrawPlaneTool` mit `static startPlane(id, start, ende): Plane`;
  - `Szene.treffer(e, klickZiele)`; Task 8 hängt die Planen-Meshes mit `userData.planeId` daran.

- [ ] **Step 1: Failing tests schreiben**

In `src/editor/SnapService.test.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';` und `STANDARD_PLANE` in die Zeile mit `STANDARD_DREIBEIN`. Den Import `import { SnapService } from './SnapService';` ersetzen durch `import { SnapService, type Treffer } from './SnapService';`.
2. Als letzte Tests im `describe` anhängen:

```ts
  it('rastet im Seil-Werkzeug auf die nächste Öse einer getroffenen Plane ein, egal wie weit', () => {
    // Flach bei z = 5, Richtung −z; Ösen u. a. bei (0 | 2 | 3,5) und (2 | 2 | 5).
    const plane = new Plane('pl', new Vec3(0, 2, 5), new Vec3(4, 2, 5), { ...STANDARD_PLANE, neigungGrad: 0 });
    const mitPlane = bauwerk.mitPlane(plane);
    const treffer: Treffer = { art: 'plane', punkt: new Vec3(1.4, 2, 3.6), planeId: 'pl' };
    const p = snap.snap(treffer, mitPlane, true);
    expect(p.art).toBe('oese');
    expect(p.punkt.equals(new Vec3(0, 2, 3.5), 1e-9)).toBe(true);
    expect(snap.snap(treffer, mitPlane).art).toBe('boden');
  });

  it('nimmt Ösen nur im Seil-Werkzeug als nahe Fangpunkte', () => {
    const bodenplane = new Plane('bp', new Vec3(0, 0, 5), new Vec3(4, 0, 5), { ...STANDARD_PLANE, neigungGrad: 0 });
    const mitPlane = bauwerk.mitPlane(bodenplane);
    const klick: Treffer = { art: 'boden', punkt: new Vec3(2.1, 0, 4.9) };
    const mit = snap.snap(klick, mitPlane, true);
    expect(mit.art).toBe('oese');
    expect(mit.punkt.equals(new Vec3(2, 0, 5), 1e-9)).toBe(true);
    expect(snap.snap(klick, mitPlane).art).toBe('boden');
  });
```

In `src/editor/Editor.test.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';`, `import { Stange } from '../model/Stange';` und `STANDARD_PLANE` in die Zeile `import { STANDARD_BAUM, STANDARD_DREIBEIN } from '../model/params';`.
2. Den Test „lässt Seile nur im Auswahl-Werkzeug Klicks fangen“ komplett ersetzen durch:

```ts
  it('legt pro Werkzeug fest, welche Teile Klicks fangen (Spec v2b, D2)', () => {
    const e = neuerEditor();
    expect(e.klickZiele).toEqual(['seil', 'plane']);
    e.waehleWerkzeug('seil');
    expect(e.klickZiele).toEqual(['plane']);
    for (const name of ['dreibein', 'abock', 'stange', 'baum', 'plane'] as const) {
      e.waehleWerkzeug(name);
      expect(e.klickZiele, name).toEqual([]);
    }
  });
```

3. Als letzte Tests im `describe('Editor', …)` anhängen:

```ts
  it('spannt eine Bodenplane, wenn beide Punkte am Boden liegen', () => {
    const e = neuerEditor();
    e.waehleWerkzeug('plane');
    e.klick(boden(0, 0));
    expect(e.zustand().stangenStart).not.toBeNull();
    e.klick(boden(4, 0));
    expect(e.bauwerk.plane('plane-1')?.params).toEqual({ ...STANDARD_PLANE, neigungGrad: 0 });
    expect(e.zustand().auswahl).toBe('plane-1');
  });

  it('neigt eine hängende Plane mit 30° und flacher, wenn sie sonst in den Boden reicht', () => {
    const spanne = (hoehe: number): number | undefined => {
      const pfosten = (id: string, x: number) => new Stange(id, new Vec3(x, 0, 0), new Vec3(x, hoehe, 0), 0.08);
      const e = neuerEditor(Bauwerk.leer().mitStange(pfosten('p1', 0)).mitStange(pfosten('p2', 4)));
      e.waehleWerkzeug('plane');
      e.klick({ art: 'stange', punkt: new Vec3(0, hoehe, 0), stangeId: 'p1' });
      e.klick({ art: 'stange', punkt: new Vec3(4, hoehe, 0), stangeId: 'p2' });
      return e.bauwerk.plane('plane-1')?.params.neigungGrad;
    };
    expect(spanne(2)).toBe(30); // Unterkante bei 2 − 3 · sin 30° = 0,5 m
    expect(spanne(1)).toBe(20); // 1 − 3 · sin 20° ≈ −0,03 m liegt noch in FUSS_TOLERANZ, 21° nicht mehr
  });

  it('meldet eine Plane, die selbst flach in den Boden reicht, und legt keine an', () => {
    const e = neuerEditor(Bauwerk.leer().mitStange(new Stange('p', new Vec3(2, 0, 0), new Vec3(2, 1, 0), 0.08)));
    e.waehleWerkzeug('plane');
    e.klick(boden(0, 0));
    e.klick({ art: 'stange', punkt: new Vec3(2, 1, 0), stangeId: 'p' });
    expect(e.bauwerk.planen).toHaveLength(0);
    expect(e.zustand().meldung).toBe('Plane reicht in den Boden: Neigung, Breite oder Länge verringern.');
    expect(e.zustand().stangenStart).toBeNull();
  });

  it('meldet eine fast senkrechte Aufhängelinie und ignoriert zweimal denselben Punkt ohne Meldung', () => {
    const e = neuerEditor(Bauwerk.leer().mitStange(new Stange('p', Vec3.NULL, new Vec3(0, 3, 0), 0.08)));
    e.waehleWerkzeug('plane');
    e.klick({ art: 'stange', punkt: new Vec3(0, 3, 0), stangeId: 'p' });
    e.klick(boden(0.1, 0));
    expect(e.zustand().meldung).toBe('Aufhängelinie zu steil.');
    e.zeigeMeldung(null);
    e.klick(boden(2, 2));
    e.klick(boden(2, 2));
    expect(e.bauwerk.planen).toHaveLength(0);
    expect(e.zustand().meldung).toBeNull();
  });

  it('hängt ein Seil per Klick auf die Plane an deren nächste Öse', () => {
    const plane = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { ...STANDARD_PLANE, neigungGrad: 0 });
    const e = neuerEditor(Bauwerk.leer().mitPlane(plane));
    e.waehleWerkzeug('seil');
    e.klick({ art: 'plane', punkt: new Vec3(3.6, 2, -0.3), planeId: 'pl' });
    e.klick(boden(6, 0));
    expect(e.bauwerk.seil('seil-1')?.start.equals(new Vec3(4, 2, 0), 1e-9)).toBe(true);
    expect(e.bauwerk.verankerung(new Vec3(4, 2, 0))).toEqual({ art: 'plane', planeId: 'pl' });
  });

  it('wählt eine Plane per Klick aus und löscht sie', () => {
    const plane = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);
    const e = neuerEditor(Bauwerk.leer().mitPlane(plane));
    e.klick({ art: 'plane', punkt: new Vec3(2, 1.5, -1), planeId: 'pl' });
    expect(e.zustand().auswahl).toBe('pl');
    e.taste('Delete', false);
    expect(e.bauwerk.istLeer).toBe(true);
  });
```

Zum Test mit `boden(0.1, 0)`: Der Klick rastet auf das Stangenende (0 | 0 | 0) ein (0,1 m < `SNAP_RADIUS`). Die Linie steht dann senkrecht, also „zu steil“. Das ist gewollt.

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/editor`
Expected: FAIL. `klickZiele` ist `undefined`, das Werkzeug `'plane'` fehlt, `snap` kennt keine Ösen.

- [ ] **Step 3: SnapService erweitern**

In `src/editor/SnapService.ts`:
1. `Treffer` und `SnapArt` ersetzen durch:

```ts
export type Treffer =
  | { readonly art: 'boden'; readonly punkt: Vec3 }
  | { readonly art: 'stange'; readonly punkt: Vec3; readonly stangeId: string }
  | { readonly art: 'baum'; readonly punkt: Vec3; readonly baumId: string }
  | { readonly art: 'seil'; readonly punkt: Vec3; readonly seilId: string }
  | { readonly art: 'plane'; readonly punkt: Vec3; readonly planeId: string };

export type SnapArt = 'spitze' | 'bund' | 'ende' | 'oese' | 'stange' | 'baum' | 'boden';
```

2. Die Methoden `snap` und `naechsterKandidat` ersetzen durch:

```ts
  /** @param mitOesen nur im Seil-Werkzeug: Planen-Ösen sind dann Fangpunkte (Spec v2b, D2). */
  snap(treffer: Treffer, bauwerk: Bauwerk, mitOesen = false): SnapPunkt {
    // Ein Klick auf eine Plane rastet auf ihre nächste Öse ein, egal wie weit; so hängt kein Seilende in der Luft.
    if (mitOesen && treffer.art === 'plane') {
      const plane = bauwerk.plane(treffer.planeId);
      if (plane) return { punkt: plane.naechsteOese(treffer.punkt), art: 'oese' };
    }
    const kandidat = this.naechsterKandidat(treffer.punkt, bauwerk, mitOesen);
    if (kandidat) return kandidat;
    if (treffer.art === 'stange') {
      const stange = bauwerk.stange(treffer.stangeId);
      if (stange) return { punkt: stange.naechsterPunkt(treffer.punkt), art: 'stange' };
    }
    // Am Stamm zählt der getroffene Oberflächenpunkt; die Verankerung erkennt ihn als „Baum“.
    if (treffer.art === 'baum' && bauwerk.baum(treffer.baumId)) return { punkt: treffer.punkt, art: 'baum' };
    return { punkt: this.aufRaster(treffer.punkt), art: 'boden' };
  }
```

```ts
  private naechsterKandidat(p: Vec3, bauwerk: Bauwerk, mitOesen: boolean): SnapPunkt | null {
    const kandidaten: SnapPunkt[] = [
      ...bauwerk.gruppen.map((g) => ({ punkt: g.spitze(), art: 'spitze' as const })),
      ...bauwerk.buende().map((b) => ({ punkt: b.position, art: 'bund' as const })),
      ...bauwerk.stangen().flatMap((s) => s.endpunkte().map((e) => ({ punkt: e, art: 'ende' as const }))),
      ...(mitOesen ? bauwerk.planen.flatMap((pl) => pl.oesen.map((o) => ({ punkt: o, art: 'oese' as const }))) : []),
    ];
    const priority: Record<string, number> = { spitze: 0, bund: 1, ende: 2, oese: 3 };
```

(Der Rest von `naechsterKandidat` ab `return kandidaten.reduce…` bleibt unverändert.)

- [ ] **Step 4: Werkzeuge erweitern**

In `src/editor/Werkzeuge.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';` und `STANDARD_PLANE` in die Zeile `import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN } from '../model/params';`.
2. `WerkzeugName` und das Interface `Werkzeug` ersetzen durch:

```ts
export type WerkzeugName = 'dreibein' | 'abock' | 'stange' | 'seil' | 'plane' | 'baum' | 'auswahl';

/** Teile, die einen Klick fangen können, obwohl sie nicht immer sollen. Stangen und Bäume fangen immer. */
export type KlickZiel = 'seil' | 'plane';
```

```ts
export interface Werkzeug {
  readonly name: WerkzeugName;
  readonly angefangen: Vec3 | null;
  /**
   * Welche Seile oder Planen Klicks fangen (Spec v2b, D2). Sonst trifft der Strahl, was dahinter liegt:
   * Ein großes Regendach blockiert so nicht das Setzen eines Dreibeins darunter.
   */
  readonly klickZiele: readonly KlickZiel[];
  onKlick(treffer: Treffer, kontext: EditorKontext): void;
  abbrechen(): void;
}
```

3. In `PlaceBaugruppeTool`, `PlaceBaumTool` und `ZweiPunktWerkzeug` jeweils die Zeile
   `readonly trifftSeile = false;`
   ersetzen durch
   `readonly klickZiele: readonly KlickZiel[] = [];`
4. In `ZweiPunktWerkzeug` direkt unter dieser Zeile einfügen:

```ts
  /** Nur das Seil-Werkzeug rastet an Planen-Ösen ein. */
  protected readonly fangtOesen: boolean = false;
```

   und in `onKlick` die Zeile
   `const punkt = k.snap.snap(treffer, k.bauwerk);`
   ersetzen durch
   `const punkt = k.snap.snap(treffer, k.bauwerk, this.fangtOesen);`
5. In `DrawSeilTool` direkt unter `readonly name = 'seil' as const;` einfügen:

```ts
  override readonly klickZiele: readonly KlickZiel[] = ['plane'];
  protected override readonly fangtOesen = true;
```

6. Nach der Klasse `DrawSeilTool` einfügen:

```ts
/** Zwei Klicks ergeben die Aufhängelinie einer Plane mit Startmaßen (Spec v2b, D2). */
export class DrawPlaneTool extends ZweiPunktWerkzeug {
  readonly name = 'plane' as const;

  constructor() {
    super(MIN_SEILLAENGE);
  }

  /**
   * Beide Enden am Boden: Bodenplane mit 0°. Sonst 30°, oder die größte ganze Gradzahl darunter, bei der keine Öse im Boden liegt.
   * Passt nicht einmal 0°, fliegt der RangeError der Plane bis zum Editor; der zeigt ihn als Meldung.
   */
  static startPlane(id: string, start: Vec3, ende: Vec3): Plane {
    const amBoden = start.y <= FUSS_TOLERANZ && ende.y <= FUSS_TOLERANZ;
    for (let grad = amBoden ? 0 : STANDARD_PLANE.neigungGrad; ; grad -= 1) {
      try {
        return new Plane(id, start, ende, { ...STANDARD_PLANE, neigungGrad: grad });
      } catch (e) {
        if (!(e instanceof RangeError) || grad === 0) throw e;
      }
    }
  }

  protected erzeuge(start: SnapPunkt, ende: SnapPunkt, k: EditorKontext): void {
    const plane = DrawPlaneTool.startPlane(k.neueId('plane'), start.punkt, ende.punkt);
    k.aendere(k.bauwerk.mitPlane(plane));
    k.waehle(plane.id);
  }
}
```

7. In `SelectTool`:
   - den Klassenkommentar ersetzen durch `/** Klick auf eine Stange wählt sie (bzw. ihre Gruppe), auf ein Seil, einen Baum oder eine Plane wählt diese, auf den Boden hebt die Auswahl auf. */`;
   - `readonly trifftSeile = true;` ersetzen durch `readonly klickZiele: readonly KlickZiel[] = ['seil', 'plane'];`;
   - im `switch` nach dem Fall `'seil'` einfügen:

```ts
      case 'plane':
        k.waehle(treffer.planeId);
        break;
```

8. In `erzeugeWerkzeug` nach `case 'seil': return new DrawSeilTool();` einfügen:

```ts
    case 'plane':
      return new DrawPlaneTool();
```

- [ ] **Step 5: Editor, Szene-Treffer, main und Palette anpassen**

In `src/editor/Editor.ts`:
1. Import ändern: `import { type EditorKontext, erzeugeWerkzeug, type Werkzeug, type WerkzeugName } from './Werkzeuge';` wird zu `import { type EditorKontext, erzeugeWerkzeug, type KlickZiel, type Werkzeug, type WerkzeugName } from './Werkzeuge';`.
2. Den Getter `trifftSeile` samt Kommentar ersetzen durch:

```ts
  /** Welche Seile oder Planen Klicks fangen sollen; hängt vom Werkzeug ab (Spec v2b, D2). */
  get klickZiele(): readonly KlickZiel[] {
    return this.werkzeug.klickZiele;
  }
```

In `src/editor/Szene.ts`:
1. Import ergänzen: `import type { KlickZiel } from './Werkzeuge';`
2. Unter `const SEIL_GREIFRADIUS = …;` einfügen:

```ts
const ZIEL_SCHLUESSEL: Record<KlickZiel, string> = { seil: 'seilId', plane: 'planeId' };
```

3. Die Methode `treffer` ersetzen durch:

```ts
  treffer(e: PointerEvent, klickZiele: readonly KlickZiel[]): Treffer | null {
    const rect = this.leinwand.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kamera);
    const schluessel = ['stangeId', 'baumId', ...klickZiele.map((z) => ZIEL_SCHLUESSEL[z])];
    const ziele = this.bau.children.filter((k) => schluessel.some((name) => typeof k.userData[name] === 'string'));
    const getroffen = this.raycaster.intersectObjects(ziele, false)[0];
    if (getroffen) {
      const punkt = new Vec3(getroffen.point.x, getroffen.point.y, getroffen.point.z);
      const daten = getroffen.object.userData;
      if (typeof daten.stangeId === 'string') return { art: 'stange', punkt, stangeId: daten.stangeId };
      if (typeof daten.baumId === 'string') return { art: 'baum', punkt, baumId: daten.baumId };
      if (typeof daten.planeId === 'string') return { art: 'plane', punkt, planeId: daten.planeId };
      return { art: 'seil', punkt, seilId: daten.seilId as string };
    }
    const aufBoden = this.raycaster.intersectObject(this.boden, false)[0];
    return aufBoden ? { art: 'boden', punkt: new Vec3(aufBoden.point.x, 0, aufBoden.point.z) } : null;
  }
```

In `src/main.ts`:
1. Unter `const MELDUNG_DAUER_MS = 4000;` einfügen:

```ts
/** Was ein Zwei-Klick-Werkzeug gerade spannt, für die Statuszeile. */
const ZWEI_PUNKT_TEIL: Partial<Record<WerkzeugName, string>> = { stange: 'Stange', seil: 'Seil', plane: 'Plane' };
```

2. `const treffer = szene.treffer(e, editor.trifftSeile);` wird zu `const treffer = szene.treffer(e, editor.klickZiele);`.
3. `const teil = z.werkzeug === 'seil' ? 'Seil' : 'Stange';` wird zu `const teil = ZWEI_PUNKT_TEIL[z.werkzeug] ?? 'Teil';`.

In `index.html` nach `<button data-werkzeug="seil">Seil spannen</button>` einfügen:

```html
      <button data-werkzeug="plane">Plane spannen</button>
```

(Einrückung wie die Nachbarzeilen.)

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run src/editor`
Expected: PASS.
Run: `npm run build`
Expected: Exit 0 (`tsc --noEmit` findet keine Reste von `trifftSeile`).
Run: `grep -rn "trifftSeile" src`
Expected: keine Ausgabe.

- [ ] **Step 7: Commit**

```bash
git add src/editor/SnapService.ts src/editor/Werkzeuge.ts src/editor/Editor.ts src/editor/Szene.ts src/main.ts index.html src/editor/SnapService.test.ts src/editor/Editor.test.ts
git commit -m "feat: add the tarp tool, eyelet snapping and per-tool click targets"
```

---

### Task 7: Parameter-Panel für die Plane

**Files:**
- Modify: `src/ui/ParameterPanel.ts`
- Test: `src/ui/ParameterPanel.test.ts`

**Interfaces:**
- Consumes: `Plane` (`params`, `mitParams`, `linienLaenge`), `PlanenForm`, `PlanenParams`, `STANDARD_PLANE` (Task 1), `Bauwerk.plane`, `ersetzePlane` (Task 2), `Editor.aendereMit`.
- Produces: Panel „Plane“ mit Feldern Breite (m), Länge (m), Neigung (°), Auswahl „Form“, Knopf „Seite wechseln“ (nur bei `eben`), „Löschen (Entf)“.

- [ ] **Step 1: Failing tests schreiben**

In `src/ui/ParameterPanel.test.ts`:
1. Imports ergänzen: `import { Plane } from '../model/Plane';` und `STANDARD_PLANE` in die Zeile `import { STANDARD_BAUM } from '../model/params';`.
2. Nach der Funktion `panelMit` einfügen:

```ts
const form = (wurzel: HTMLElement): HTMLSelectElement => {
  const auswahl = wurzel.querySelector('select');
  if (!auswahl) throw new Error('Form-Auswahl fehlt');
  return auswahl;
};

const waehleForm = (wurzel: HTMLElement, wert: string): void => {
  const auswahl = form(wurzel);
  auswahl.value = wert;
  auswahl.dispatchEvent(new Event('change'));
};

const knopftexte = (wurzel: HTMLElement): string[] => [...wurzel.querySelectorAll('button')].map((b) => b.textContent ?? '');

const knopf = (wurzel: HTMLElement, text: string): HTMLButtonElement => {
  const k = [...wurzel.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!k) throw new Error(`Knopf ${text} fehlt`);
  return k;
};

const dach = (y: number, art: 'eben' | 'satteldach' = 'eben'): Plane =>
  new Plane('pl', new Vec3(0, y, 0), new Vec3(4, y, 0), { ...STANDARD_PLANE, form: art });
```

3. Als letzte Tests im `describe('ParameterPanel', …)` anhängen:

```ts
  it('zeigt bei der Plane Breite, Länge und Neigung und setzt unsinnige Werte zurück', () => {
    const { wurzel, editor } = panelMit(Bauwerk.leer().mitPlane(dach(2)), 'pl');
    expect(feld(wurzel, 'Breite').value).toBe('3');
    expect(feld(wurzel, 'Länge').value).toBe('4');
    expect(feld(wurzel, 'Neigung').value).toBe('30');
    expect(feld(wurzel, 'Neigung').step).toBe('1');
    expect(wurzel.textContent).toContain('Aufhängelinie 4.00 m');
    tippe(feld(wurzel, 'Breite'), '5'); // 2 − 5 · sin 30° = −0,5 m
    expect(editor.zustand().meldung).toBe('Plane reicht in den Boden: Neigung, Breite oder Länge verringern.');
    expect(feld(wurzel, 'Breite').value).toBe('3');
    tippe(feld(wurzel, 'Neigung'), '120');
    expect(editor.zustand().meldung).toBe('Neigung muss zwischen 0 und 90° liegen');
    expect(feld(wurzel, 'Neigung').value).toBe('30');
    tippe(feld(wurzel, 'Länge'), '');
    expect(feld(wurzel, 'Länge').value).toBe('4');
    tippe(feld(wurzel, 'Neigung'), '10');
    expect(editor.bauwerk.plane('pl')?.params.neigungGrad).toBe(10);
  });

  it('wechselt Seite und Form; „Seite wechseln“ gibt es nur bei eben', () => {
    const { wurzel, editor } = panelMit(Bauwerk.leer().mitPlane(dach(2)), 'pl');
    expect(form(wurzel).value).toBe('eben');
    knopf(wurzel, 'Seite wechseln').click();
    expect(editor.bauwerk.plane('pl')?.params.seite).toBe(-1);
    waehleForm(wurzel, 'satteldach');
    expect(editor.bauwerk.plane('pl')?.params.form).toBe('satteldach');
    expect(knopftexte(wurzel)).not.toContain('Seite wechseln');
    expect(knopftexte(wurzel)).toContain('Löschen (Entf)');
  });

  it('setzt die Form zurück, wenn die Plane damit in den Boden reicht', () => {
    // Satteldach auf 1 m: Hälften 1,5 m, Unterkante 0,25 m. Eben hinge die volle Breite 1,5 m tief.
    const { wurzel, editor } = panelMit(Bauwerk.leer().mitPlane(dach(1, 'satteldach')), 'pl');
    waehleForm(wurzel, 'eben');
    expect(editor.zustand().meldung).toBe('Plane reicht in den Boden: Neigung, Breite oder Länge verringern.');
    expect(form(wurzel).value).toBe('satteldach');
    expect(editor.bauwerk.plane('pl')?.params.form).toBe('satteldach');
  });
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/ui/ParameterPanel.test.ts`
Expected: FAIL mit „Feld Breite fehlt“; das Panel kennt keine Planen.

- [ ] **Step 3: Panel erweitern**

In `src/ui/ParameterPanel.ts`:
1. Imports ergänzen: `import type { Plane } from '../model/Plane';` und `import type { PlanenForm, PlanenParams } from '../model/params';`.
2. Das Interface `Feld` ersetzen durch:

```ts
interface Feld<P> {
  readonly schluessel: keyof P & string;
  readonly label: string;
  readonly faktor: number; // Anzeige = Modellwert × faktor (Ø in cm, Rest in m)
  readonly schritt?: string; // Standard: 0.05 bei Metern, 1 bei Zentimetern
}

const PLANEN_FORMEN: readonly (readonly [PlanenForm, string])[] = [
  ['eben', 'eben'],
  ['satteldach', 'Satteldach'],
];
```

3. Klassenkommentar ersetzen durch `/** Formular für die ausgewählte Baugruppe, freie Stange, den Baum, das Seil oder die Plane. Ungültige Werte meldet der Editor. */`.
4. In `zeige` nach `const seil = …;` einfügen:
   `const plane = id === null ? undefined : bauwerk.plane(id);`
   die Zeile mit `noetig` ersetzen durch
   `if (!this.neuaufbau.noetig(id, gruppe ?? freieStange ?? baum ?? seil ?? plane ?? null)) return;`
   und nach `else if (seil) this.seilInfo(seil);` einfügen:
   `else if (plane) this.planeFormular(plane);`
5. Nach der Methode `seilInfo` einfügen:

```ts
  private planeFormular(plane: Plane): void {
    const aendere = (p: PlanenParams): boolean => this.editor.aendereMit((b) => b.ersetzePlane(plane.mitParams(p)));
    this.formular(
      'Plane',
      [
        { schluessel: 'breite', label: 'Breite (m)', faktor: 1 },
        { schluessel: 'laenge', label: 'Länge (m)', faktor: 1 },
        { schluessel: 'neigungGrad', label: 'Neigung (°)', faktor: 1, schritt: '1' },
      ],
      plane.params,
      aendere,
      `Aufhängelinie ${plane.linienLaenge.toFixed(2)} m · zum Verschieben neu spannen`,
      [this.formAuswahl(plane, aendere), ...(plane.params.form === 'eben' ? [this.seitenKnopf(plane, aendere)] : [])],
    );
  }

  private formAuswahl(plane: Plane, aendere: (p: PlanenParams) => boolean): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = 'Form';
    const auswahl = document.createElement('select');
    for (const [wert, text] of PLANEN_FORMEN) {
      const option = document.createElement('option');
      option.value = wert;
      option.textContent = text;
      auswahl.append(option);
    }
    auswahl.value = plane.params.form;
    auswahl.addEventListener('change', () => {
      // Abgelehnt: Das Modell ist unverändert, also springt die Auswahl zurück, wie ein Zahlenfeld.
      if (!aendere({ ...plane.params, form: auswahl.value as PlanenForm })) auswahl.value = plane.params.form;
    });
    label.append(auswahl);
    return label;
  }

  private seitenKnopf(plane: Plane, aendere: (p: PlanenParams) => boolean): HTMLButtonElement {
    const knopf = document.createElement('button');
    knopf.textContent = 'Seite wechseln';
    knopf.addEventListener('click', () => aendere({ ...plane.params, seite: plane.params.seite === 1 ? -1 : 1 }));
    return knopf;
  }
```

6. In `formular`:
   - die Signatur um einen letzten Parameter ergänzen: `extras: readonly HTMLElement[] = [],` (nach `info: string,`);
   - `input.step = feld.faktor === 1 ? '0.05' : '1';` wird zu `input.step = feld.schritt ?? (feld.faktor === 1 ? '0.05' : '1');`;
   - `this.wurzel.append(kopf, ...eingaben, infoZeile, loeschen);` wird zu `this.wurzel.append(kopf, ...eingaben, ...extras, infoZeile, loeschen);`.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/ui`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: Exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ParameterPanel.ts src/ui/ParameterPanel.test.ts
git commit -m "feat: edit tarp size, inclination, form and side in the panel"
```

---

### Task 8: Darstellung in der Szene, Sichtprüfung

**Files:**
- Modify: `src/editor/Szene.ts`

**Interfaces:**
- Consumes: `Plane.flaechen`, `Plane.id` (Task 1), `Bauwerk.planen` (Task 2), `ZIEL_SCHLUESSEL` und der `'plane'`-Zweig in `treffer` (Task 6).
- Produces: Jede Plane wird als beidseitige Fläche mit `userData.planeId` gezeichnet; ausgewählt orange.

Kein Unit-Test: Die Szene braucht WebGL, das in Vitest fehlt (so auch in v2a). Abgesichert wird durch `npm run build`, die E2E-Tests in Task 9 und die Sichtprüfung unten.

- [ ] **Step 1: Planen zeichnen**

In `src/editor/Szene.ts`:
1. Import ergänzen: `import type { Plane } from '../model/Plane';`
2. Unter `const PLATZ = …;` einfügen:

```ts
// Beidseitig, damit man die Plane auch von unten sieht; polygonOffset verhindert Flimmern einer Bodenplane auf dem Boden.
const PLANE = new THREE.MeshLambertMaterial({ color: 0x7d7a4f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const PLANE_MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
```

3. In `zeige` nach `for (const b of bauwerk.baeume) …;` einfügen:

```ts
    for (const p of bauwerk.planen) this.bau.add(this.planenMesh(p, markiert.has(p.id)));
```

4. Nach der Methode `baumMeshes` einfügen:

```ts
  /** Jede Fläche als zwei Dreiecke. Ein Mesh pro Plane, damit ein Klick sie als Ganzes trifft. */
  private planenMesh(p: Plane, markiert: boolean): THREE.Mesh {
    const ecken = p.flaechen.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]);
    const geometrie = new THREE.BufferGeometry().setFromPoints(ecken.map((v) => new THREE.Vector3(v.x, v.y, v.z)));
    geometrie.computeVertexNormals();
    const mesh = new THREE.Mesh(geometrie, markiert ? PLANE_MARKIERT : PLANE);
    mesh.userData.planeId = p.id;
    return mesh;
  }
```

- [ ] **Step 2: Build und Tests**

Run: `npm run build`
Expected: Exit 0.
Run: `npm test`
Expected: alle grün, Abdeckung `model/` + `rules/` ≥ 80 %.
Run: `npm run e2e`
Expected: 5 passed (die bestehenden Tests; der neue kommt in Task 9).

- [ ] **Step 3: Sichtprüfung per Screenshot**

1. Vorschau im Hintergrund starten (nach `npm run build` aus Step 2):
   Run (Hintergrund): `npx vite preview --port 4173 --strictPort`
2. Den Link für vier Planen erzeugen:

```bash
node -e "
const L = require('lz-string');
const abock = { id: 'abock', typ: 'abock', position: [0, 0, 0], drehung: Math.PI / 2, params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 } };
const dreibein = { id: 'dreibein', typ: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 } };
const baum = (id, x) => ({ id, position: [x, 0, -3], durchmesser: 0.3, hoehe: 8 });
const plane = (id, start, ende, breite, laenge, form, neigung, seite) => ({ id, start, ende, breite, laenge, form, neigung, seite });
const daten = { version: 3, gruppen: [abock, dreibein], stangen: [], seile: [], baeume: [baum('b1', -2), baum('b2', 2)], planen: [
  plane('dach', [0, 2.049, 0], [2.5, 2.086, 0], 3, 4, 'satteldach', 30, 1),
  plane('regen', [-1.85, 2.5, -3], [1.85, 2.5, -3], 3, 4, 'eben', 20, 1),
  plane('wand', [-1, 1.5, 3], [3, 1.5, 3], 1.5, 4, 'eben', 90, 1),
  plane('boden', [4, 0, -1], [4, 0, 2], 2, 3, 'eben', 0, 1),
] };
console.log('http://localhost:4173/lagerbau-simulator/#b=' + L.compressToEncodedURIComponent(JSON.stringify(daten)));
"
```

3. Screenshot außerhalb des Repos ablegen (z. B. im Scratchpad der Sitzung):
   Run: `npx playwright screenshot --viewport-size=1280,800 --wait-for-timeout=2000 "<URL aus 2.>" <scratchpad>/planen-sicht.png`
4. Das Bild ansehen und prüfen:
   - alle vier Planen sichtbar, olivgrün/khaki und deckend;
   - das Satteldach liegt symmetrisch über der Linie zwischen den Spitzen von A-Bock und Dreibein;
   - das Regendach hängt zwischen den Bäumen und neigt sich von ihnen weg;
   - die Wand steht senkrecht und endet am Boden;
   - die Bodenplane liegt auf dem Boden, ohne Flimmern oder Streifen;
   - Planen, die man von unten sieht, sind ebenfalls gefärbt (nicht unsichtbar);
   - das gestrichelte Platzbedarf-Rechteck umfasst alle Planen.
5. Die Vorschau beenden.

Weicht etwas ab, ist das ein Fehler in Task 1 oder Task 8: beheben, Step 2–4 wiederholen, und den Fehler in der Dispatch-Nachricht für Task 9 nennen (kommt in `docs/ki-lernlog.md`).

- [ ] **Step 4: Commit**

```bash
git add src/editor/Szene.ts
git commit -m "feat: draw tarps as double-sided surfaces in the scene"
```

---

### Task 9: E2E, Version 1.2.0, Doku

**Files:**
- Create: `e2e/planen.spec.ts`
- Modify: `package.json`, `package-lock.json` (Version)
- Modify: `README.md`, `CLAUDE.md`, `docs/ki-lernlog.md`

**Interfaces:**
- Consumes:
  - Link-Format v3 (Task 4);
  - Hinweis-Panel `#hinweise`, Materialliste `#stangenliste`, `#platzbedarf` (Task 5).
- Produces: `npm run e2e` mit 6 Tests; `release/Lagerbau-Simulator-1.2.0.exe`.

- [ ] **Step 1: E2E-Test schreiben**

Neue Datei `e2e/planen.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

type V3 = [number, number, number];

// Kochstelle wie im Beispiel: A-Bock und Dreibein mit 2,4-m-Stangen und 0,2 m Überstand, dazwischen der First.
const ABOCK_SPITZE: V3 = [0, Math.sqrt(2.2 ** 2 - 0.8 ** 2), 0];
const DREIBEIN_SPITZE: V3 = [2.5, Math.sqrt(2.2 ** 2 - 0.7 ** 2), 0];
const UEBERSTAND = 0.2;

/** Der First ragt wie bei Stange.zwischen an beiden Enden 0,2 m über die Spitzen hinaus. */
function first(): { id: string; start: V3; ende: V3; durchmesser: number } {
  const d = DREIBEIN_SPITZE.map((x, i) => x - ABOCK_SPITZE[i]!);
  const laenge = Math.hypot(...d);
  const r = d.map((x) => x / laenge);
  return {
    id: 'first',
    start: ABOCK_SPITZE.map((x, i) => x - r[i]! * UEBERSTAND) as V3,
    ende: DREIBEIN_SPITZE.map((x, i) => x + r[i]! * UEBERSTAND) as V3,
    durchmesser: 0.08,
  };
}

const kochstelleMitDach = {
  version: 3,
  gruppen: [
    { id: 'abock', typ: 'abock', position: [0, 0, 0], drehung: Math.PI / 2, params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 } },
    { id: 'dreibein', typ: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 } },
  ],
  stangen: [first()],
  seile: [],
  baeume: [],
  planen: [{ id: 'dach', start: ABOCK_SPITZE, ende: DREIBEIN_SPITZE, breite: 3, laenge: 4, form: 'satteldach', neigung: 30, seite: 1 }],
};

test('Satteldach über der Kochstelle: Materialliste und Platzbedarf', async ({ page }) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto(`./?t=satteldach#b=${LZString.compressToEncodedURIComponent(JSON.stringify(kochstelleMitDach))}`);
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(page.locator('#stangenliste th').filter({ hasText: /^Plane$/ })).toHaveCount(1);
  await expect(page.locator('#stangenliste tr').filter({ hasText: '3.0 × 4.0 m' })).toContainText('1');
  // x: Firstende −0,75 bis Außenecke 3,26 → 4,0 m; z: ± 1,5 · cos 30° → 2,6 m.
  await expect(page.locator('#platzbedarf')).toHaveText('Platzbedarf: 4.0 × 2.6 m');
  expect(fehler).toEqual([]);
});
```

- [ ] **Step 2: E2E laufen lassen**

Run: `npm run e2e`
Expected: 6 passed. Der Test ist kein RED-Schritt: Die Funktion kommt aus Task 1–8. Scheitert er hier, ist das ein echter Fehler in einem früheren Task, also BLOCKED mit der Ausgabe melden.

- [ ] **Step 3: Version 1.2.0**

Run: `npm version 1.2.0 --no-git-tag-version`
Expected: `package.json` und `package-lock.json` zeigen `1.2.0`, kein Commit, kein Tag.
Run: `npm run e2e:desktop`
Expected: 5 passed. Es entsteht `release/Lagerbau-Simulator-1.2.0.exe`. Scheitert nur „Link kopieren“, zuerst mit `powershell -Command "Set-Clipboard test; Get-Clipboard"` prüfen, ob die Windows-Zwischenablage überhaupt geht (siehe Known Issues in `CLAUDE.md`), und das Ergebnis melden. Code und Test dafür nicht ändern.

- [ ] **Step 4: Doku**

In `README.md`:
1. Die zweite Zeile
   `3D-Planer für Pfadfinder-Lagerbauten (Dreibein, A-Bock, freie Stangen, Abspannungen, Bäume) mit Faustregel-Hinweisen, Materialliste und Platzbedarf.`
   ersetzen durch
   `3D-Planer für Pfadfinder-Lagerbauten (Dreibein, A-Bock, freie Stangen, Abspannungen, Bäume, Planen) mit Faustregel-Hinweisen, Materialliste und Platzbedarf.`
2. Im Abschnitt „## Windows-Programm“ als letzte Zeile ergänzen:
   `Links und Dateien aus Version 1.2 (mit Planen) öffnet nur die neue .exe ab 1.2.0; ältere zeigen „Ungültige Bauwerk-Daten“.`

In `CLAUDE.md` unter „## Stack & Struktur“ die Zeilen für `src/model/` und `src/rules/` ersetzen durch:

```markdown
- `src/model/` — Domain (immutable), kein three.js: Stange, Bund, Fuss, Baugruppen, Seil, Baum, Plane (Ösen aus der Geometrie), Verankerung/Haring (aus der Geometrie abgeleitet), Materialliste, Platzbedarf
- `src/rules/` — `Rule`-Klassen R1–R8 + `RuleEngine`, kein three.js (R6–R8: Seile; Spec v2a). Planen haben bewusst keine Regeln (Spec v2b)
```

Unter „## Known Issues & Failed Attempts“ jede Sackgasse aus Task 1–9 eintragen, im Format *What failed / Why / Fix / avoid*.

In `docs/ki-lernlog.md` unter „## Einträge“ jeden Fehler der KI eintragen, den Tests, Reviews oder die Sichtprüfung in diesem Plan gefunden haben (im Format der Datei). Der Controller nennt sie in der Dispatch-Nachricht. Der Eintrag „Uneinheitliche Suche in der Verankerung“ bekommt den Zusatz, dass Task 2 von v2b ihn behoben hat.

- [ ] **Step 5: Volle Abschluss-Prüfung**

```bash
npm test            # Expected: alle grün, Coverage model/ + rules/ ≥ 80 %
npm run build       # Expected: Exit 0
npm run e2e         # Expected: 6 passed
npm run e2e:desktop # Expected: 5 passed
grep -rE "from 'three'|document\.|window\." src/model src/rules   # Expected: keine Ausgabe
grep -rn "trifftSeile" src                                        # Expected: keine Ausgabe
grep -c "CHECK MANUALLY" src/rules/constants.ts                   # Expected: 10 (unverändert)
git status --short  # Expected: nur die geänderten Doku-Dateien, nichts aus release/ oder dist-desktop/
```

- [ ] **Step 6: Commits**

```bash
git add e2e/planen.spec.ts
git commit -m "test: add browser test for a Satteldach over the Kochstelle"
git add package.json package-lock.json README.md CLAUDE.md docs/ki-lernlog.md
git commit -m "docs: document tarps and bump version to 1.2.0"
```

- [ ] **Step 7: Manuelle Prüfung (Jakob)**

1. Ein Satteldach über die Firststange der Kochstelle spannen; die Neigung ändern, die Form auf „eben“ stellen und die Seite wechseln.
2. Zwischen zwei Bäumen eine Bodenplane, eine Wand und ein Regendach spannen.
3. Ein Seil von einer Öse zu einem Haring spannen; danach die Plane ändern → R8 meldet das Seil.
4. Die Materialliste nennt die Planengrößen, der Platzbedarf umfasst den Überstand.
5. Die `release/Lagerbau-Simulator-1.2.0.exe` lädt einen gespeicherten v3-Bau über „Laden“.
6. **Gemeinheitsbau** (Spec D6). Jeder Treffer kommt in `docs/ki-lernlog.md`:
   - eine Plane auf einer schrägen Linie mit großem Überstand;
   - ein Seil an einer Öse, danach die Plane breiter machen;
   - ein Satteldach, dessen Hälfte knapp über dem Boden endet;
   - ein Seil, das von einem A-Bock nur zu Planen läuft.

---

## Abschluss

- Abschluss-Review über den ganzen Branch (`main..feat/planen`).
- `finishing-a-development-branch`: Push und PR gegen `main`. **Jakob merged selbst**; der Merge deployt die Web-Version neu.
- Danach: v2c Kohten-/Jurtenbahnen als eigene Etappe.
