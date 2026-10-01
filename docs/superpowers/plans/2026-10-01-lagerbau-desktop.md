# Lagerbau-Simulator: Windows-Programm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus derselben Web-App eine portable Windows-`.exe` bauen, die offline läuft. Vorher zwei Restfehler aus dem v1-Review beheben.

**Architecture:** Die Web-App bleibt unverändert und wird zusätzlich ein zweites Mal gebaut, mit relativen Pfaden nach `dist-desktop/`. Ein kleiner Electron-Hauptprozess (`desktop/main.mjs`) lädt diesen Build von der Platte in ein gehärtetes Fenster. `electron-builder` packt daraus eine portable `.exe`. „Link kopieren“ zeigt im Programm auf die Pages-Adresse.

**Tech Stack:** TypeScript, Vite, three.js, Vitest (+ happy-dom für einen UI-Test), Playwright (Browser + `_electron`), Electron 44, electron-builder 26.

**Spec:** `docs/superpowers/specs/2026-09-30-lagerbau-simulator-design.md`, Abschnitt **D5 Windows-Programm**. Entscheidungen 3, 4 und 9 gelten weiter.

Branch: `feat/desktop`, abgezweigt von `main` @ `31a2c83`.

## Global Constraints

- UI-Texte auf Deutsch. Domänen-Bezeichner auf Deutsch.
- Nur Windows x64. Electron + `electron-builder`, Ziel `portable`. Ergebnis `release/Lagerbau-Simulator-<version>.exe`, entpackt unter `release/win-unpacked/Lagerbau-Simulator.exe`.
- Fenster: Titel „Lagerbau-Simulator“, Mindestgröße 1024 × 700 (nie unter 768 px → immer Editor-Modus).
- Härtung: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, kein Preload. Navigation weg von der App und neue Fenster werden blockiert.
- Desktop-Build: `vite build --base=./ --outDir dist-desktop`. Der Web-Build bleibt `base: '/lagerbau-simulator/'` und unverändert.
- Link-Basis im Programm (Protokoll `file:`): genau `https://jakobsch42k.github.io/lagerbau-simulator/`. Im Browser wie bisher `origin + pathname`.
- `dist-desktop/` und `release/` sind in `.gitignore`.
- Nicht bauen: Auto-Update, Installer/Startmenü, `.json` per Doppelklick, Code-Signing, macOS, `.exe`-Build in CI.
- Die Fußzeile *„Planungshilfe. Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.“* ist immer sichtbar, auch im Programm.
- `src/model/` und `src/rules/` importieren weder `three` noch DOM-APIs. Abdeckung ≥ 80 % für `src/model/**` und `src/rules/**`.
- Commits im Format `<type>: <beschreibung>`. Immer einzelne Dateien stagen, nie `git add -A`. Kein `Co-Authored-By`-Trailer.

## Review Focus

1. **„Link kopieren“ im Programm.** `main.ts` ruft `history.replaceState` mit dem ganzen Link auf. Im Programm zeigt der Link auf die Pages-Adresse (andere Origin), und `replaceState` wirft dann einen `SecurityError`. Erwartet: Der Pages-Link landet in der Zwischenablage, Meldung „Link kopiert.“ → Fix in Task 2, Test in Task 3.
2. **Weißes Fenster, weil Skripte oder Assets von `file://` nicht laden** (falscher Base-Pfad). Erwartet: Palette und Fußzeile sind sichtbar → Test in Task 3.
3. **Zwischenablage und `crypto.randomUUID` brauchen einen sicheren Kontext.** Erwartet: `window.isSecureContext === true` im Programm → Test in Task 3.
4. **Eine Seite navigiert weg** (Link, `location.href`, `window.open`). Das Programm hat keinen Zurück-Knopf und keine Adresszeile. Erwartet: Die App bleibt geladen, es öffnet sich kein zweites Fenster → Test in Task 3.
5. **Laptop ohne Internet am Lager.** Erwartet: Jede Anfrage geht nur an `file:`, `blob:` oder `data:` → Test in Task 3.

Zusätzlich manuell, weil Playwright native Dialoge nicht bedienen kann (Task 4, Step 10): Programmdateien fehlen → Fehlerdialog statt weißem Fenster; Speichern → Windows-„Speichern unter“; Laden → Windows-„Öffnen“.

## Dateistruktur

| Datei | Verantwortung | Task |
|---|---|---|
| `src/editor/Editor.ts` | `aendereMit` meldet per Rückgabewert, ob die Änderung übernommen wurde | 1 |
| `src/ui/ParameterPanel.ts` | setzt ein abgelehntes Feld auf den Modellwert zurück | 1 |
| `src/ui/ParameterPanel.test.ts` (neu) | erster DOM-Test (happy-dom) | 1 |
| `src/share/share.test.ts` | Hash-Grenze wirklich prüfen | 1 |
| `src/share/LinkBasis.ts` (neu) | Basis-Adresse für geteilte Links (Browser vs. Programm) | 2 |
| `src/ui/Teilen.ts`, `src/main.ts` | Link über `LinkBasis`, Adresszeile nur per Hash | 2 |
| `e2e/smoke.spec.ts` | Web-Test „Link kopieren“ | 2 |
| `desktop/main.mjs` (neu) | Electron-Hauptprozess | 3 |
| `playwright.desktop.config.ts`, `e2e-desktop/desktop.spec.ts` (neu) | E2E gegen das Programm | 3, 4 |
| `build/icon.svg`, `build/icon.png`, `scripts/render-icon.mjs` (neu) | Programm-Icon | 4 |
| `electron-builder.yml` (neu) | Packen als portable `.exe` | 4 |

---

### Task 1: Restfehler aus dem v1-Review

Zwei geparkte Funde aus dem v1-Abschluss-Review:
- Nach einer ungültigen Eingabe bleibt der abgelehnte Wert im Feld stehen, das Modell hat aber noch den alten.
- Der Test für die Hash-Grenze besteht auch ohne die Grenze.

**Files:**
- Modify: `src/editor/Editor.ts` (`aendereMit`, `fuehreAus`), `src/editor/Editor.test.ts`
- Modify: `src/ui/ParameterPanel.ts`
- Create: `src/ui/ParameterPanel.test.ts`
- Modify: `src/share/share.test.ts`
- Modify: `package.json`, `package-lock.json` (devDependency `happy-dom`)
- Modify: `docs/ki-lernlog.md`

**Interfaces:**
- Consumes: `Editor` (`waehle`, `abonniere`, `zustand`, `zeigeMeldung`, `bauwerk`), `kochstelle()` mit den Ids `abock`, `dreibein`, `first`, `Dreibein.params`/`mitParams`, `UrlCodec.ausHash`/`dekodiere`/`PRAEFIX`, `MAX_HASH_ZEICHEN`.
- Produces: `Editor.aendereMit(aenderung: (b: Bauwerk) => Bauwerk): boolean`. `true` heißt übernommen, `false` heißt abgelehnt (RangeError → Meldung).

- [ ] **Step 1: happy-dom installieren**

Run: `npm install -D happy-dom@^20.14.5`
Expected: `package.json` hat `happy-dom` unter `devDependencies`.

- [ ] **Step 2: Failing tests schreiben**

In `src/editor/Editor.test.ts` den Import ergänzen und einen Test anhängen. Den Import `import { kochstelle } from '../beispiele/kochstelle';` zu den anderen Imports oben setzen. Den Test als letzten `it` in den `describe('Editor', …)`-Block:

```ts
  it('meldet über den Rückgabewert, ob aendereMit die Änderung übernommen hat', () => {
    const e = neuerEditor(kochstelle());
    const d = e.bauwerk.gruppe('dreibein') as Dreibein;
    expect(e.aendereMit((b) => b.ersetzeGruppe(d.mitParams({ ...d.params, stangenlaenge: 3 })))).toBe(true);
    expect(e.aendereMit((b) => b.ersetzeGruppe(d.mitParams({ ...d.params, stangenlaenge: 0.5 })))).toBe(false);
    expect(e.zustand().meldung).toBe('Fußkreisradius muss kleiner als Stangenlänge minus Überstand sein');
  });
```

Neue Datei `src/ui/ParameterPanel.test.ts` (die erste Zeile muss genau so bleiben, sie schaltet happy-dom nur für diese Datei ein):

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Editor } from '../editor/Editor';
import { Dreibein } from '../model/Dreibein';
import { ParameterPanel } from './ParameterPanel';

const aufbau = (): { wurzel: HTMLElement; editor: Editor } => {
  const wurzel = document.createElement('section');
  const editor = new Editor(kochstelle());
  const panel = new ParameterPanel(wurzel, editor);
  editor.abonniere((z) => panel.zeige(z));
  editor.waehle('dreibein');
  panel.zeige(editor.zustand());
  return { wurzel, editor };
};

const feld = (wurzel: HTMLElement, label: string): HTMLInputElement => {
  const treffer = [...wurzel.querySelectorAll('label')].find((l) => l.textContent?.startsWith(label));
  const input = treffer?.querySelector('input');
  if (!input) throw new Error(`Feld ${label} fehlt`);
  return input;
};

const tippe = (input: HTMLInputElement, wert: string): void => {
  input.value = wert;
  input.dispatchEvent(new Event('change'));
};

describe('ParameterPanel', () => {
  it('setzt ein abgelehntes Feld auf den Modellwert zurück und zeigt die Meldung', () => {
    const { wurzel, editor } = aufbau();
    tippe(feld(wurzel, 'Stangenlänge'), '0.5');
    expect(editor.zustand().meldung).toBe('Fußkreisradius muss kleiner als Stangenlänge minus Überstand sein');
    expect(feld(wurzel, 'Stangenlänge').value).toBe('2.4');
  });

  it('übernimmt einen gültigen Wert ins Modell', () => {
    const { wurzel, editor } = aufbau();
    tippe(feld(wurzel, 'Stangenlänge'), '3');
    const d = editor.bauwerk.gruppe('dreibein');
    expect(d instanceof Dreibein && d.params.stangenlaenge).toBe(3);
    expect(feld(wurzel, 'Stangenlänge').value).toBe('3');
  });

  it('baut das Formular bei einer reinen Meldung nicht neu auf', () => {
    const { wurzel, editor } = aufbau();
    const vorher = feld(wurzel, 'Stangenlänge');
    editor.zeigeMeldung('Link kopiert.');
    expect(feld(wurzel, 'Stangenlänge')).toBe(vorher);
  });
});
```

- [ ] **Step 3: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run src/editor/Editor.test.ts src/ui/ParameterPanel.test.ts`
Expected:
- Der Editor-Test scheitert mit `expected undefined to be true`.
- Der Panel-Test „setzt ein abgelehntes Feld…“ scheitert mit `expected '0.5' to be '2.4'`.
- Die anderen zwei Panel-Tests bestehen bereits. Sie sichern Verhalten ab, das bleiben muss.

- [ ] **Step 4: Editor implementieren**

In `src/editor/Editor.ts` `aendereMit` und `fuehreAus` ersetzen:

```ts
  /**
   * Änderung aus dem Parameter-Panel. Die Änderung selbst muss innerhalb der Funktion passieren, damit ein RangeError abgefangen wird.
   * Gibt false zurück, wenn der Editor die Änderung abgelehnt hat (die Meldung steht dann im Zustand).
   */
  aendereMit(aenderung: (b: Bauwerk) => Bauwerk): boolean {
    return this.fuehreAus(() => this.aendere(aenderung(this.bauwerk)));
  }
```

```ts
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
```

Die anderen Aufrufer von `fuehreAus` (`klick`, `setzeBauwerk`, `loescheAuswahl`) ignorieren den Rückgabewert. Sie bleiben unverändert.

- [ ] **Step 5: ParameterPanel implementieren**

In `src/ui/ParameterPanel.ts`:

1. Unter dem `interface Feld<P>` eine Funktion für den Anzeigewert ergänzen:

```ts
/** Anzeige-Text eines Modellwerts: auf drei Nachkommastellen gerundet, in Anzeige-Einheit. */
const anzeige = (wert: number, faktor: number): string => String(Math.round(wert * faktor * 1000) / 1000);
```

2. In `formular` den Parameter `uebernehme` auf `(neu: P) => boolean` ändern.
3. Die zwei Zeilen für `input.value` und den `change`-Listener ersetzen durch:

```ts
      input.value = anzeige(werte[feld.schluessel] as number, feld.faktor);
      input.addEventListener('change', () => {
        const uebernommen = uebernehme({ ...werte, [feld.schluessel]: Number(input.value) / feld.faktor });
        // Abgelehnt: Das Modell ist unverändert, also baut das Panel nicht neu auf. Das Feld zeigt sonst einen Wert, den es nicht gibt.
        if (!uebernommen) input.value = anzeige(werte[feld.schluessel] as number, feld.faktor);
      });
```

Die drei Aufrufer in `zeige` (`(p) => this.editor.aendereMit(…)`) geben jetzt den `boolean` von `aendereMit` zurück. An ihnen ändert sich nichts.

- [ ] **Step 6: Tests laufen lassen, sie müssen bestehen**

Run: `npx vitest run src/editor/Editor.test.ts src/ui/ParameterPanel.test.ts`
Expected: PASS, alle Tests.

- [ ] **Step 7: Hash-Grenzen-Test schärfen**

In `src/share/share.test.ts`:

1. Die Imports oben so ordnen (Fremdpakete zuerst, `vi` und `Bauwerk` neu):

```ts
import LZString from 'lz-string';
import { describe, expect, it, vi } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { BauwerkSerializer } from './BauwerkSerializer';
import { MAX_HASH_ZEICHEN, MAX_JSON_ZEICHEN, MAX_TEILE, pruefeDateigroesse } from './grenzen';
import { UrlCodec } from './UrlCodec';
```

2. Den Test `'lehnt einen zu langen Hash als beschädigten Link ab'` durch diese zwei Tests ersetzen:

```ts
  it('lehnt einen zu langen Hash ab, ohne ihn zu entpacken', () => {
    const c = new UrlCodec();
    // Gemockt: Ohne Grenze würde sonst wirklich entpackt, und lz-string kann Müll auf ein Vielfaches aufblähen.
    const entpacke = vi.spyOn(c, 'dekodiere').mockReturnValue(Bauwerk.leer());
    expect(() => c.ausHash(UrlCodec.PRAEFIX + 'A'.repeat(MAX_HASH_ZEICHEN))).toThrow('Link ist beschädigt');
    expect(entpacke).not.toHaveBeenCalled();
  });

  it('entpackt einen Hash, der genau an der Grenze liegt', () => {
    const c = new UrlCodec();
    const entpacke = vi.spyOn(c, 'dekodiere').mockReturnValue(Bauwerk.leer());
    c.ausHash(UrlCodec.PRAEFIX + 'A'.repeat(MAX_HASH_ZEICHEN - UrlCodec.PRAEFIX.length));
    expect(entpacke).toHaveBeenCalledOnce();
  });
```

- [ ] **Step 8: Gegenprobe: Der Test muss die Grenze wirklich bewachen**

1. In `src/share/UrlCodec.ts` die Zeile `if (hash.length > MAX_HASH_ZEICHEN) throw new Error('Link ist beschädigt');` vorübergehend auskommentieren.
2. Run: `npx vitest run src/share/share.test.ts`
   Expected: FAIL in `'lehnt einen zu langen Hash ab, ohne ihn zu entpacken'`. Ohne Grenze gibt der gemockte `dekodiere` ein Bauwerk zurück, also wirft `ausHash` nicht.
3. Die Zeile wiederherstellen. Prüfen mit `git diff src/share/UrlCodec.ts`: keine Ausgabe.
4. Run: `npx vitest run src/share/share.test.ts`
   Expected: PASS.

- [ ] **Step 9: KI-Lernlog**

In `docs/ki-lernlog.md` unter „## Einträge“ ans Ende anhängen:

```markdown
### 2026-10-01 — Reviewer erfand falsche Zeilennummern
**Was die KI gemacht hat:** Der Task-Reviewer für Task 16 meldete als „Important“, die e2e-Ausgabe im Report passe nicht zur Datei (Tests stünden in Zeile 18 und 29 statt 13 und 25).
**Gefunden durch:** Review-Gegenprobe: frischer Testlauf durch den Controller, `grep -n` auf die Datei.
**Richtig ist:** Die Tests stehen in Zeile 13 und 25, der Report stimmte.
**Lehre:** Auch Reviewer-Befunde sind Behauptungen. Vor einem Fix-Durchlauf den Befund selbst nachprüfen.

### 2026-10-01 — Fix für den Fokus erzeugte einen neuen Fehler
**Was die KI gemacht hat:** Das Parameter-Panel baute nach dem Fix nur noch bei einem neuen Objekt neu auf. Damit blieb ein abgelehnter Wert im Feld stehen, während das Modell den alten Wert behielt.
**Gefunden durch:** Review (der Implementer nannte es selbst als Bedenken, der Re-Review bestätigte es).
**Richtig ist:** Bei einer abgelehnten Änderung setzt das Panel das Feld auf den Modellwert zurück (Task 1, desktop-Plan).
**Lehre:** Wenn ein Fix eine Neuaufbau- oder Cache-Bedingung ändert, alle Wege durchspielen, die bisher nebenbei vom Neuaufbau profitiert haben.
```

- [ ] **Step 10: Volle Prüfung**

Run: `npm test`
Expected: Alle Tests grün. Coverage für `model/` + `rules/` ≥ 80 % in allen vier Metriken.
Run: `npm run build`
Expected: Exit 0.

- [ ] **Step 11: Commits**

```bash
git add src/editor/Editor.ts src/editor/Editor.test.ts src/ui/ParameterPanel.ts src/ui/ParameterPanel.test.ts package.json package-lock.json
git commit -m "fix: reset a rejected parameter field to the model value"
git add src/share/share.test.ts
git commit -m "test: make the hash cap test fail without the cap"
git add docs/ki-lernlog.md
git commit -m "docs: log reviewer and fix-regression mistakes"
```

---

### Task 2: Link-Basis für geteilte Links

Im Programm (`file:`) zeigt „Link kopieren“ auf die Web-Version. Die Adresszeile wird nur noch per Hash aktualisiert, weil `replaceState` mit einer fremden Origin wirft.

**Files:**
- Create: `src/share/LinkBasis.ts`, `src/share/LinkBasis.test.ts`
- Modify: `src/ui/Teilen.ts` (`link`, neue Methode `hash`)
- Modify: `src/main.ts` (Handler von `#btn-teilen`)
- Modify: `e2e/smoke.spec.ts` (neuer Test)

**Interfaces:**
- Consumes: `UrlCodec.alsHash(bauwerk): string` (liefert `#b=…`).
- Produces:
  - `OEFFENTLICHE_ADRESSE = 'https://jakobsch42k.github.io/lagerbau-simulator/'`
  - `interface Ort { protocol; origin; pathname }` (alle `readonly string`)
  - `LinkBasis.aus(ort: Ort): string`
  - `Teilen.hash(bauwerk: Bauwerk): string`

- [ ] **Step 1: Failing test schreiben**

Neue Datei `src/share/LinkBasis.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LinkBasis } from './LinkBasis';

describe('LinkBasis', () => {
  it('nimmt im Windows-Programm (file:) die Adresse der Web-Version', () => {
    const ort = { protocol: 'file:', origin: 'null', pathname: '/C:/Users/x/AppData/Local/Temp/app/dist-desktop/index.html' };
    expect(LinkBasis.aus(ort)).toBe('https://jakobsch42k.github.io/lagerbau-simulator/');
  });

  it('nimmt im Browser die aktuelle Adresse ohne Query und Hash', () => {
    expect(LinkBasis.aus({ protocol: 'https:', origin: 'https://jakobsch42k.github.io', pathname: '/lagerbau-simulator/' })).toBe(
      'https://jakobsch42k.github.io/lagerbau-simulator/',
    );
    expect(LinkBasis.aus({ protocol: 'http:', origin: 'http://localhost:5173', pathname: '/lagerbau-simulator/' })).toBe(
      'http://localhost:5173/lagerbau-simulator/',
    );
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run src/share/LinkBasis.test.ts`
Expected: FAIL mit `Failed to resolve import "./LinkBasis"`.

- [ ] **Step 3: LinkBasis implementieren**

Neue Datei `src/share/LinkBasis.ts`:

```ts
/** Adresse der Web-Version. Geteilte Links aus dem Windows-Programm zeigen hierhin (Spec D5). */
export const OEFFENTLICHE_ADRESSE = 'https://jakobsch42k.github.io/lagerbau-simulator/';

/** Der Teil von `location`, den die Link-Basis braucht. Ohne DOM, damit sie testbar bleibt. */
export interface Ort {
  readonly protocol: string;
  readonly origin: string;
  readonly pathname: string;
}

/** Basis-Adresse, an die ein geteilter Link den Hash (#b=…) hängt. */
export class LinkBasis {
  static aus(ort: Ort): string {
    return ort.protocol === 'file:' ? OEFFENTLICHE_ADRESSE : `${ort.origin}${ort.pathname}`;
  }
}
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/share/LinkBasis.test.ts`
Expected: PASS (2 Tests).

- [ ] **Step 5: Teilen und main.ts umstellen**

In `src/ui/Teilen.ts`:
1. Import ergänzen: `import { LinkBasis } from '../share/LinkBasis';`
2. `link` ersetzen und `hash` darunter ergänzen:

```ts
  link(bauwerk: Bauwerk): string {
    return `${LinkBasis.aus(location)}${this.codec.alsHash(bauwerk)}`;
  }

  /** Nur der Hash-Teil (#b=…). Er passt in jede Adresse, auch in die des Windows-Programms. */
  hash(bauwerk: Bauwerk): string {
    return this.codec.alsHash(bauwerk);
  }
```

In `src/main.ts`, im Handler von `#btn-teilen`, die Zeile
`history.replaceState(null, '', teilen.link(bauwerk));`
ersetzen durch:

```ts
  // Nur den Hash setzen: Im Programm zeigt der Link auf eine andere Origin, und replaceState würde dann werfen.
  history.replaceState(null, '', teilen.hash(bauwerk));
```

- [ ] **Step 6: Web-E2E-Test für „Link kopieren“ schreiben**

In `e2e/smoke.spec.ts` ans Ende anhängen:

```ts
test('Link kopieren legt einen Link mit dem Bauwerk in die Zwischenablage', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await page.getByRole('button', { name: 'Beispiel laden' }).click();
  await page.getByRole('button', { name: 'Link kopieren' }).click();
  await expect(page.locator('#meldung')).toHaveText('Link kopiert.');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link.startsWith('http://localhost:4173/lagerbau-simulator/#b=')).toBe(true);
  expect(page.url()).toContain('#b=');
});
```

- [ ] **Step 7: Prüfen**

Run: `npm test`
Expected: Alle Tests grün, Coverage ≥ 80 %.
Run: `npm run build`
Expected: Exit 0.
Run: `npm run e2e`
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add src/share/LinkBasis.ts src/share/LinkBasis.test.ts src/ui/Teilen.ts src/main.ts e2e/smoke.spec.ts
git commit -m "feat: point shared links from the desktop app to the web version"
```

---

### Task 3: Electron-Hauptprozess und E2E gegen das Programm

**Files:**
- Create: `desktop/main.mjs`, `playwright.desktop.config.ts`, `e2e-desktop/desktop.spec.ts`
- Modify: `package.json` (`main`, Skripte, devDependency `electron`), `package-lock.json`
- Modify: `.gitignore`, `tsconfig.json` (`include`), `.github/workflows/deploy.yml` (Electron-Download in CI überspringen)

**Interfaces:**
- Consumes:
  - DOM-IDs und Texte aus `index.html`: `footer`, `#hinweise`, `#stangenliste`, `#meldung`, Knöpfe „Beispiel laden“, „Link kopieren“, „Dreibein setzen“, „Bearbeiten“.
  - Meldung „Link kopiert.“ aus `main.ts`.
  - Link-Basis `https://jakobsch42k.github.io/lagerbau-simulator/` aus Task 2.
- Produces:
  - `npm run build:desktop` → `dist-desktop/index.html`
  - `npm run desktop` startet das Programm.
  - `npm run e2e:desktop` ist grün. Task 4 stellt den Start auf die gebaute `.exe` um.

- [ ] **Step 1: Electron installieren**

Run: `npm install -D electron@^44.5.1`
Expected: `package.json` hat `electron` unter `devDependencies`. Der Postinstall lädt die Electron-Binärdatei (~100 MB).

- [ ] **Step 2: package.json, .gitignore, tsconfig**

In `package.json` nach `"type": "module",` die Zeile `"main": "desktop/main.mjs",` einfügen. Unter `"scripts"` ergänzen:

```json
    "build:desktop": "tsc --noEmit && vite build --base=./ --outDir dist-desktop",
    "desktop": "npm run build:desktop && electron .",
    "e2e:desktop": "npm run build:desktop && playwright test -c playwright.desktop.config.ts"
```

In `.gitignore` nach `dist/` zwei Zeilen ergänzen:

```
dist-desktop/
release/
```

In `tsconfig.json` die `include`-Liste ersetzen durch:

```json
  "include": ["src", "e2e", "e2e-desktop", "vite.config.ts", "playwright.config.ts", "playwright.desktop.config.ts"]
```

- [ ] **Step 3: Failing E2E-Test schreiben**

Neue Datei `playwright.desktop.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

/** E2E gegen das Windows-Programm (Spec D5). Kein Webserver: Electron lädt die App von der Platte. */
export default defineConfig({
  testDir: 'e2e-desktop',
  workers: 1,
  timeout: 60_000,
});
```

Neue Datei `e2e-desktop/desktop.spec.ts`:

```ts
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

const PAGES = 'https://jakobsch42k.github.io/lagerbau-simulator/';
const NUR_LOKAL = /^(file|blob|data):/;

let programm: ElectronApplication;
let fenster: Page;

test.beforeEach(async () => {
  programm = await electron.launch({ args: ['.'] });
  fenster = await programm.firstWindow();
  await fenster.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  await programm.close();
});

test('öffnet ein Fenster im Editor-Modus mit Fußzeile', async () => {
  const titel = await programm.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle());
  expect(titel).toBe('Lagerbau-Simulator');
  await expect(fenster.locator('footer')).toContainText('Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.');
  await expect(fenster.getByRole('button', { name: 'Dreibein setzen' })).toBeVisible();
  await expect(fenster.getByRole('button', { name: 'Bearbeiten' })).toBeHidden();
  expect(await fenster.evaluate(() => window.isSecureContext)).toBe(true);
});

test('Beispiel laden zeigt keine Hinweise und die Stangenliste', async () => {
  await fenster.getByRole('button', { name: 'Beispiel laden' }).click();
  await expect(fenster.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(fenster.locator('#stangenliste')).toContainText('2.4 m');
});

test('Link kopieren legt einen Link auf die Web-Version in die Zwischenablage', async () => {
  await programm.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].focus());
  await fenster.getByRole('button', { name: 'Beispiel laden' }).click();
  await fenster.getByRole('button', { name: 'Link kopieren' }).click();
  await expect(fenster.locator('#meldung')).toHaveText('Link kopiert.');
  const link = await programm.evaluate(({ clipboard }) => clipboard.readText());
  expect(link.startsWith(`${PAGES}#b=`)).toBe(true);
});

test('lädt nichts aus dem Netz', async () => {
  const anfragen: string[] = [];
  fenster.on('request', (anfrage) => anfragen.push(anfrage.url()));
  await Promise.all([
    fenster.waitForEvent('load'),
    programm.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.reload()),
  ]);
  await fenster.getByRole('button', { name: 'Beispiel laden' }).click();
  await expect(fenster.locator('#hinweise')).toHaveText('Keine Hinweise.');
  expect(anfragen.some((url) => url.startsWith('file:'))).toBe(true);
  expect(anfragen.filter((url) => !NUR_LOKAL.test(url))).toEqual([]);
});

test('bleibt in der App, wenn eine Seite wegnavigieren will', async () => {
  expect(await fenster.evaluate(() => window.open('https://example.com/') === null)).toBe(true);
  await fenster.evaluate(() => {
    location.href = 'https://example.com/';
  });
  await fenster.waitForTimeout(1000);
  expect(fenster.url().startsWith('file:')).toBe(true);
  await expect(fenster.locator('footer')).toBeVisible();
  expect(programm.windows()).toHaveLength(1);
});
```

- [ ] **Step 4: Test laufen lassen, er muss scheitern**

Run: `npm run e2e:desktop`
Expected: Der Build läuft durch und schreibt `dist-desktop/`. Danach scheitern alle 5 Tests in `beforeEach`, weil Electron `desktop/main.mjs` nicht findet (Meldung etwa `Cannot find module` oder `Process failed to launch`).

- [ ] **Step 5: Hauptprozess implementieren**

Neue Datei `desktop/main.mjs`:

```js
// Electron-Hauptprozess des Windows-Programms (Spec D5): ein gehärtetes Fenster, das die gebaute App von der Platte lädt.
import { app, BrowserWindow, Menu, dialog } from 'electron';
import { join } from 'node:path';

const TITEL = 'Lagerbau-Simulator';

class Hauptfenster {
  /** Öffnet das Fenster und lädt dist-desktop/index.html. Fehlt die Datei, erscheint ein Fehlerdialog statt eines weißen Fensters. */
  static oeffne() {
    const fenster = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024, // nie unter 768 px → die App öffnet immer im Editor-Modus
      minHeight: 700,
      title: TITEL,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    Hauptfenster.sperreNavigation(fenster);
    const index = join(app.getAppPath(), 'dist-desktop', 'index.html');
    fenster.loadFile(index).catch((fehler) => {
      dialog.showErrorBox(TITEL, `Die Programmdateien fehlen oder sind beschädigt.\n${index}\n${fehler.message}`);
      app.quit();
    });
    return fenster;
  }

  /** Ohne Adresszeile und Zurück-Knopf gäbe es keinen Weg zurück: Navigation und neue Fenster sind gesperrt. */
  static sperreNavigation(fenster) {
    fenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    fenster.webContents.on('will-navigate', (ereignis) => ereignis.preventDefault());
  }
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => Hauptfenster.oeffne());
app.on('window-all-closed', () => app.quit());
```

- [ ] **Step 6: Test laufen lassen, er muss bestehen**

Run: `npm run e2e:desktop`
Expected: 5 passed.

Falls „Link kopieren“ scheitert und die Meldung „Kopieren nicht möglich…“ lautet, hat das Fenster keinen Fokus. Dann vor dem Klick zusätzlich `await fenster.bringToFront();` aufrufen. Das kommt dann auch in `CLAUDE.md` → Known Issues.

- [ ] **Step 7: CI: Electron-Download überspringen**

CI baut nur die Web-Version. In `.github/workflows/deploy.yml` den Schritt `- run: npm ci` ersetzen durch:

```yaml
      - run: npm ci
        env:
          ELECTRON_SKIP_BINARY_DOWNLOAD: '1'
```

- [ ] **Step 8: Volle Prüfung**

Run nacheinander und jede Ausgabe lesen:

```bash
npm test            # Expected: alle grün, Coverage ≥ 80 %
npm run build       # Expected: Exit 0, dist/ unverändert mit Base /lagerbau-simulator/
npm run e2e         # Expected: 3 passed
npm run e2e:desktop # Expected: 5 passed
git status --short  # Expected: dist-desktop/ taucht nicht auf
```

- [ ] **Step 9: Commit**

```bash
git add desktop/main.mjs playwright.desktop.config.ts e2e-desktop/desktop.spec.ts package.json package-lock.json .gitignore tsconfig.json .github/workflows/deploy.yml
git commit -m "feat: add Electron main process for the desktop app"
```

---

### Task 4: Portable `.exe` packen, Icon, Doku

**Files:**
- Create: `electron-builder.yml`, `build/icon.svg`, `build/icon.png`, `scripts/render-icon.mjs`
- Modify: `package.json` (devDependency `electron-builder`, `three` und `lz-string` nach `devDependencies`, `author`, Skripte `icon`, `dist`, `e2e:desktop`), `package-lock.json`
- Modify: `e2e-desktop/desktop.spec.ts` (Start der gebauten `.exe`)
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: `npm run build:desktop`, `desktop/main.mjs` (lädt `<appPath>/dist-desktop/index.html`), die 5 Desktop-Tests aus Task 3.
- Produces:
  - `npm run dist` → `release/Lagerbau-Simulator-1.0.0.exe` und `release/win-unpacked/Lagerbau-Simulator.exe`
  - `npm run e2e:desktop` testet die gebaute `.exe`.

- [ ] **Step 1: electron-builder installieren**

Run: `npm install -D electron-builder@^26.15.3`

- [ ] **Step 2: Laufzeit-Pakete zu devDependencies verschieben**

Vite bündelt `three` und `lz-string` schon in den Build. electron-builder würde `dependencies` zusätzlich als `node_modules` in die `.exe` packen (~30 MB umsonst).

In `package.json` den Block `"dependencies"` entfernen und die zwei Einträge unverändert unter `"devDependencies"` setzen:

```json
    "lz-string": "^1.5.0",
    "three": "^0.186.1",
```

Außerdem `"author": ""` ersetzen durch `"author": "jakobsch42k"`.

Run: `npm install`
Expected: Exit 0, `package-lock.json` aktualisiert.
Run: `npm run build`
Expected: Exit 0.

- [ ] **Step 3: Icon**

Neue Datei `build/icon.svg` (Dreibein mit Bund):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="16" y="16" width="480" height="480" rx="96" fill="#2f5d3a"/>
  <g stroke="#c8954f" stroke-width="30" stroke-linecap="round">
    <line x1="112" y1="424" x2="300" y2="70"/>
    <line x1="400" y1="424" x2="212" y2="70"/>
    <line x1="256" y1="440" x2="256" y2="64"/>
  </g>
  <rect x="222" y="134" width="68" height="38" rx="10" fill="#f2e6c9"/>
  <line x1="80" y1="448" x2="432" y2="448" stroke="#1d3b25" stroke-width="12" stroke-linecap="round"/>
</svg>
```

Neue Datei `scripts/render-icon.mjs`:

```js
// Rendert build/icon.svg mit Playwright-Chromium zu build/icon.png (512 × 512) für electron-builder.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const svg = await readFile('build/icon.svg', 'utf8');
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 512, height: 512 } });
await seite.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await seite.locator('svg').screenshot({ path: 'build/icon.png', omitBackground: true });
await browser.close();
```

In `package.json` unter `"scripts"` ergänzen: `"icon": "node scripts/render-icon.mjs",`

Run: `npm run icon`
Run: `node -e "const b=require('fs').readFileSync('build/icon.png');console.log(b.readUInt32BE(16),b.readUInt32BE(20))"`
Expected: `512 512`

- [ ] **Step 4: electron-builder konfigurieren**

Neue Datei `electron-builder.yml`:

```yaml
# Packt das Windows-Programm als portable .exe (Spec D5). Aufruf über `npm run dist`.
appId: io.github.jakobsch42k.lagerbau-simulator
productName: Lagerbau-Simulator
directories:
  output: release
  buildResources: build
files:
  - desktop/main.mjs
  - dist-desktop/**
  - package.json
win:
  target:
    - target: portable
      arch: x64
  icon: build/icon.png
portable:
  artifactName: Lagerbau-Simulator-${version}.exe
```

In `package.json` unter `"scripts"` ergänzen bzw. ersetzen:

```json
    "dist": "npm run build:desktop && electron-builder --win",
    "e2e:desktop": "npm run dist && playwright test -c playwright.desktop.config.ts"
```

- [ ] **Step 5: E2E auf die gebaute `.exe` umstellen (Test zuerst)**

In `e2e-desktop/desktop.spec.ts`:
1. Unter `NUR_LOKAL` ergänzen (relativ zum Repo-Wurzelordner; kein `node:path`, weil `tsconfig` nur `vite/client`-Typen lädt): `const PROGRAMM = 'release/win-unpacked/Lagerbau-Simulator.exe';`
2. In `beforeEach` die Zeile `programm = await electron.launch({ args: ['.'] });` ersetzen durch:

```ts
  programm = await electron.launch({ executablePath: PROGRAMM });
```

Run: `npx playwright test -c playwright.desktop.config.ts`
Expected: FAIL in `beforeEach`, weil `release/win-unpacked/Lagerbau-Simulator.exe` noch nicht existiert.

- [ ] **Step 6: Packen**

Run: `npm run dist`
Expected: Exit 0. Es entstehen `release/Lagerbau-Simulator-1.0.0.exe` und `release/win-unpacked/Lagerbau-Simulator.exe`. Beim ersten Lauf lädt electron-builder Electron, NSIS und winCodeSign herunter.

Falls die Meldung `Cannot create symbolic link : A required privilege is not held by the client` erscheint: Das ist bekannt. electron-builder entpackt winCodeSign samt macOS-Symlinks, und Windows erlaubt Symlinks nur im Entwicklermodus. Fix: Jakob schaltet einmal *Einstellungen → System → Für Entwickler → Entwicklermodus* ein, danach `npm run dist` erneut. Nicht `signAndEditExecutable: false` setzen, sonst fehlt das Icon in der `.exe`. Eintrag in `CLAUDE.md` → Known Issues.

- [ ] **Step 7: Inhalt und Größe prüfen**

Run: `npx @electron/asar list release/win-unpacked/resources/app.asar`
Expected: Nur `\package.json`, `\desktop\main.mjs` und Dateien unter `\dist-desktop\`. **Kein** `node_modules`.
Run: `ls -l release/*.exe`
Expected: eine Datei, etwa 70–110 MB.

- [ ] **Step 8: E2E gegen das gebaute Programm**

Run: `npm run e2e:desktop`
Expected: 5 passed.

- [ ] **Step 9: Doku**

In `README.md` nach dem Abschnitt „## Entwickeln“ anhängen:

```markdown
    npm run desktop    # Windows-Programm aus dem Quellcode starten

## Windows-Programm

    npm run dist         # erzeugt release/Lagerbau-Simulator-<version>.exe (portabel, ~85 MB)
    npm run e2e:desktop  # packt neu und testet die gebaute .exe

Die `.exe` per Doppelklick starten, ohne Installation. Sie braucht kein Internet.
Das Programm ist nicht signiert, deshalb zeigt Windows beim ersten Start „Der Computer wurde durch Windows geschützt“:
„Weitere Informationen“ → „Trotzdem ausführen“.
„Link kopieren“ erzeugt einen Link auf die Web-Version, den man z. B. am Handy öffnet.
```

In `CLAUDE.md`:
1. Die Zeile, die mit `- Am Ende zusätzlich **portable Windows-` beginnt, ersetzen durch:
   `- Windows-Programm (Spec D5): portable `.exe` per Electron, offline. `npm run dist` → `release/`. Die Web-Version auf Pages bleibt für die Handy-Ansicht.`
2. Unter „## Stack & Struktur“ die erste Zeile ersetzen durch:
   `TypeScript + Vite + three.js, Vitest (+ happy-dom für DOM-Tests), Playwright (Browser + Electron). Statisch, kein Backend. Deploy: GitHub Pages via Actions. Windows-Programm: Electron + electron-builder. Repo `jakobsch42k/lagerbau-simulator` (öffentlich, MIT).`
3. In der Struktur-Liste nach `src/ui/` ergänzen:

```markdown
- `desktop/main.mjs` — Electron-Hauptprozess (ein gehärtetes Fenster, lädt `dist-desktop/`)
- `e2e-desktop/` — E2E gegen die gebaute `.exe` (`npm run e2e:desktop`)
- `build/` — Icon (`icon.svg` → `npm run icon` → `icon.png`)
```

4. Unter „## Known Issues & Failed Attempts“ jede Sackgasse aus Task 3 und 4 im Format *What failed / Why / Fix / avoid* eintragen. Gab es keine, bleibt „_Noch keine._“ stehen.

- [ ] **Step 10: Manuelle Prüfung (Controller bzw. Jakob)**

Diese Schritte kann Playwright nicht abdecken. Ergebnis in den Report:
1. `release/Lagerbau-Simulator-1.0.0.exe` per Doppelklick starten. SmartScreen einmal mit „Trotzdem ausführen“ bestätigen. Startzeit notieren.
2. Beispiel laden, dann „Speichern“. Es erscheint der Windows-Dialog „Speichern unter“. Die Datei speichern, dann über „Laden“ wieder öffnen. Die Kochstelle ist wieder da.
3. WLAN aus, Programm neu starten. Es lädt normal.
4. Fehlerdialog: `dist-desktop/` vorübergehend umbenennen und `npx electron .` starten. Es erscheint der Dialog „Die Programmdateien fehlen oder sind beschädigt.“, danach beendet sich das Programm. Ordner zurückbenennen.

- [ ] **Step 11: Volle Prüfung**

```bash
npm test            # Expected: alle grün, Coverage ≥ 80 %
npm run build       # Expected: Exit 0
npm run e2e         # Expected: 3 passed
npm run e2e:desktop # Expected: 5 passed
git status --short  # Expected: release/ und dist-desktop/ tauchen nicht auf
```

- [ ] **Step 12: Commits**

```bash
git add build/icon.svg build/icon.png scripts/render-icon.mjs
git commit -m "feat: add app icon"
git add electron-builder.yml package.json package-lock.json e2e-desktop/desktop.spec.ts
git commit -m "feat: package the desktop app as a portable Windows exe"
git add README.md CLAUDE.md
git commit -m "docs: document the Windows desktop app"
```

---

## Abschluss

- Abschluss-Review über den ganzen Branch (`main..feat/desktop`).
- Danach `finishing-a-development-branch`: Push und PR #2 gegen `main`. Das Mergen deployt die Web-Version neu, die sich nur durch Task 2 ändert.
- Die `.exe` selbst kommt nicht ins Repo. Jakob verteilt sie über OneDrive oder einen USB-Stick an die Leiterteams.
