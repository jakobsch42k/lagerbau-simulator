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
