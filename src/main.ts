import './style.css';
import { VorlagenWahl } from './arten/platz/vorlagen';
import { standardArten } from './arten/standardArten';
import { kochstelle } from './beispiele/kochstelle';
import { Editor } from './editor/Editor';
import { Szene } from './editor/Szene';
import { Zeigersteuerung } from './editor/Zeigersteuerung';
import type { WerkzeugName } from './editor/Werkzeuge';
import { Bauwerk } from './model/Bauwerk';
import type { Luftbild } from './model/Luftbild';
import { Materialliste } from './model/Materialliste';
import type { Hinweis } from './rules/Rule';
import { RuleEngine } from './rules/RuleEngine';
import { SEIL_ZUGABE_PRO_ENDE } from './rules/constants';
import { LinkBasis } from './share/LinkBasis';
import { AnsichtsModus } from './ui/AnsichtsModus';
import { BildLader } from './ui/BildLader';
import { HinweisPanel } from './ui/HinweisPanel';
import { LuftbildPanel } from './ui/LuftbildPanel';
import { ParameterPanel } from './ui/ParameterPanel';
import { RegelnPanel } from './ui/RegelnPanel';
import { MateriallistePanel } from './ui/MateriallistePanel';
import { Teilen } from './ui/Teilen';
import { VorlagenAuswahl } from './ui/VorlagenAuswahl';

const MELDUNG_DAUER_MS = 4000;
const MASSSTAB_HINWEIS = 'Klicke zwei Punkte, deren Abstand du kennst.';
const LUFTBILD_NUR_IN_DATEI = 'Das Luftbild ist nur in der gespeicherten Datei enthalten.';


function element<T extends HTMLElement>(selektor: string): T {
  const el = document.querySelector<T>(selektor);
  if (!el) throw new Error(`Element ${selektor} fehlt in index.html`);
  return el;
}

const vorlagenWahl = new VorlagenWahl();
const arten = standardArten(vorlagenWahl);
const editor = new Editor(Bauwerk.leer(), { arten });
const szene = new Szene(element('#ansicht'), arten);
const modus = new AnsichtsModus(document.body);
const teilen = new Teilen();
const regelnPanel = new RegelnPanel(element('#btn-regeln'), element('#regeln'), element('#ausgeschaltet'), editor, () => modus.aktiv);

/** Wechselt Editor und Ansicht; die Regel-Liste ist in der Ansicht nur lesbar und wird deshalb neu gezeigt. */
function setzeModus(ansicht: boolean): void {
  modus.setze(ansicht);
  regelnPanel.zeige(editor.bauwerk.regelEinstellungen);
}
const parameter = new ParameterPanel(element('#parameter'), editor, arten);
const luftbildPanel = new LuftbildPanel(element('#luftbild'), element('#btn-luftbild'), editor, szene);
const bildLader = new BildLader();
const hinweisPanel = new HinweisPanel(element('#hinweise'), (h) => editor.markiere(h.betroffeneTeile));
const materialPanel = new MateriallistePanel(element('#stangenliste'), element('#platzbedarf'));
const meldung = element<HTMLParagraphElement>('#meldung');
const werkzeugKnoepfe = [...document.querySelectorAll<HTMLButtonElement>('[data-werkzeug]')];

// Regeln nur neu prüfen, wenn sich das Bauwerk wirklich geändert hat (nicht bei Auswahl oder Meldung).
let geprueft: { bauwerk: Bauwerk; hinweise: readonly Hinweis[]; liste: Materialliste } | null = null;
function pruefung(bauwerk: Bauwerk): { hinweise: readonly Hinweis[]; liste: Materialliste } {
  if (geprueft?.bauwerk !== bauwerk) {
    const hinweise = RuleEngine.fuer(bauwerk.regelEinstellungen).pruefe(bauwerk);
    geprueft = { bauwerk, hinweise, liste: Materialliste.aus(bauwerk, SEIL_ZUGABE_PRO_ENDE, arten.zaehltZumPlatzbedarf) };
  }
  return geprueft;
}

/** Ein geladener Link oder eine geladene Datei wird eingepasst (Spec E1, D5); das Beispiel lässt die Kamera, wo sie ist. */
function ladeUndZeigeAlles(bauwerk: Bauwerk): void {
  editor.setzeBauwerk(bauwerk);
  szene.zeigeAlles(bauwerk);
}

/** Ein neues Luftbild wird eingepasst: „Alles zeigen“ auf ein Bauwerk, das nur das Bild enthält. */
function ladeLuftbild(bild: Luftbild): void {
  editor.ladeLuftbild(bild);
  szene.zeigeAlles(Bauwerk.leer().mitLuftbild(bild));
}

function ladeAusAdresse(): void {
  try {
    const gelesen = teilen.ausAdresseMitHinweis();
    if (gelesen) ladeUndZeigeAlles(gelesen.bauwerk);
    setzeModus(gelesen !== null);
    // Das Bild steckt nicht im Link (Spec E2, D4); die Meldung kommt nach dem Laden, das sie sonst löschen würde.
    if (gelesen?.luftbildEntfernt) editor.zeigeMeldung(LUFTBILD_NUR_IN_DATEI);
  } catch (e) {
    setzeModus(false);
    editor.zeigeMeldung((e as Error).message);
  }
}

new Zeigersteuerung(szene, editor, () => !modus.aktiv);

for (const knopf of werkzeugKnoepfe) {
  knopf.addEventListener('click', () => editor.waehleWerkzeug(knopf.dataset.werkzeug as WerkzeugName));
}
element('#btn-beispiel').addEventListener('click', () => editor.setzeBauwerk(kochstelle()));
element('#btn-rueck').addEventListener('click', () => editor.rueckgaengig());
const ansichtKnopf = element<HTMLButtonElement>('#btn-ansicht');

/** Plan / 3D (Taste P). Die Pfeiltasten richten sich danach: in der Planansicht zeigt „oben“ nach Norden. */
function schalteAnsicht(): void {
  szene.setzeAnsicht(szene.ansicht === 'plan' ? 'drei-d' : 'plan');
  editor.setzeBlickrichtung(szene.blickrichtung());
  ansichtKnopf.setAttribute('aria-pressed', String(szene.ansicht === 'plan'));
}
ansichtKnopf.addEventListener('click', schalteAnsicht);
element('#btn-alles').addEventListener('click', () => szene.zeigeAlles(editor.bauwerk));
const beschriftungenKnopf = element<HTMLButtonElement>('#btn-beschriftungen');
beschriftungenKnopf.addEventListener('click', () => {
  szene.setzeBeschriftungen(!szene.beschriftungenSichtbar);
  beschriftungenKnopf.setAttribute('aria-pressed', String(szene.beschriftungenSichtbar));
});
new VorlagenAuswahl(element('#sel-vorlage'), vorlagenWahl, () => editor.waehleWerkzeug('platzobjekt'));
element('#btn-wieder').addEventListener('click', () => editor.wiederholen());
element('#btn-bearbeiten').addEventListener('click', () => setzeModus(false));
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
    ladeUndZeigeAlles(await teilen.lade(datei));
  } catch (fehler) {
    editor.zeigeMeldung((fehler as Error).message);
  }
});
element<HTMLInputElement>('#inp-luftbild').addEventListener('change', async (e) => {
  const input = e.currentTarget as HTMLInputElement;
  const datei = input.files?.[0];
  input.value = '';
  if (!datei) return;
  try {
    ladeLuftbild(await bildLader.lade(datei));
  } catch (fehler) {
    editor.zeigeMeldung((fehler as Error).message);
  }
});
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  const ansichtstaste = e.ctrlKey || e.metaKey || e.altKey ? '' : e.key.toLowerCase();
  if (ansichtstaste === 'p') return schalteAnsicht();
  if (ansichtstaste === 'f') return szene.zeigeAlles(editor.bauwerk);
  if (modus.aktiv) return;
  if (e.key.startsWith('Arrow')) editor.setzeBlickrichtung(szene.blickrichtung());
  if (editor.taste(e.key, e.ctrlKey || e.metaKey, e.shiftKey)) e.preventDefault();
});
window.addEventListener('hashchange', ladeAusAdresse);

let meldungsTimer: number | undefined;
editor.abonniere((z) => {
  const { hinweise, liste } = pruefung(z.bauwerk);
  const markiert = new Set(z.markiert);
  z.ausgewaehlt.forEach((id) => markiert.add(id));
  szene.zeige(z.vorschau ?? z.bauwerk, markiert, z.stangenStart);
  szene.zeigeMessung(z.messung);
  parameter.zeige(z);
  hinweisPanel.zeige(hinweise);
  regelnPanel.zeige(z.bauwerk.regelEinstellungen);
  luftbildPanel.zeige(z);
  materialPanel.zeige(liste);
  for (const knopf of werkzeugKnoepfe) knopf.setAttribute('aria-pressed', String(knopf.dataset.werkzeug === z.werkzeug));
  element<HTMLButtonElement>('#btn-rueck').disabled = !z.kannRueckgaengig;
  element<HTMLButtonElement>('#btn-wieder').disabled = !z.kannWiederholen;
  // Nur Zwei-Klick-Werkzeuge haben einen Startpunkt; ihr Label ist „Stange“, „Seil“ oder „Plane“.
  const teil = z.werkzeug === 'auswahl' ? 'Teil' : z.werkzeug === 'messen' ? 'Messen' : z.werkzeug === 'massstab' ? '' : arten.art(z.werkzeug).label;
  const massstab = z.werkzeug === 'massstab' && !z.messung?.bis ? MASSSTAB_HINWEIS : '';
  meldung.textContent = z.meldung ?? (z.stangenStart ? `${teil}: zweiten Punkt anklicken (Esc bricht ab)` : massstab);
  if (z.meldung) {
    clearTimeout(meldungsTimer);
    meldungsTimer = window.setTimeout(() => editor.zeigeMeldung(null), MELDUNG_DAUER_MS);
  }
});

ladeAusAdresse();
