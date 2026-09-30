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
