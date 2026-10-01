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
import { LinkBasis } from './share/LinkBasis';
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
  // Nur den Hash setzen: Im Programm zeigt der Link auf eine andere Origin, und replaceState würde dann werfen.
  history.replaceState(null, '', teilen.hash(bauwerk));
  try {
    await teilen.kopiereLink(bauwerk);
    editor.zeigeMeldung('Link kopiert.');
  } catch {
    editor.zeigeMeldung(LinkBasis.kopierFehlerText(location));
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
