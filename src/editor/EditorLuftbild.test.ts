import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Luftbild } from '../model/Luftbild';
import { Vec3 } from '../model/Vec3';
import { Editor } from './Editor';
import type { Treffer } from './SnapService';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const boden = (x: number, z: number): Treffer => ({ art: 'boden', punkt: new Vec3(x, 0, z) });
/** Ein 200 × 100 px großes Bild mit dem vorläufigen Maßstab (0,5 m/px). */
const bild = (): Luftbild => Luftbild.vorlaeufig(PNG, 200, 100);

describe('Luftbild im Editor (Spec E2, D1/D2)', () => {
  it('Laden, Maßstab, Deckkraft, Entfernen: je ein Undo-Schritt, und jeweils zurück', () => {
    const e = new Editor(Bauwerk.leer());
    const b0 = e.bauwerk;
    e.ladeLuftbild(bild());
    const b1 = e.bauwerk;
    expect(b1.luftbild?.breiteM).toBe(100);

    e.waehleWerkzeug('massstab');
    e.klick(boden(-25, 0));
    e.klick(boden(25, 0));
    expect(e.setzeMassstab(10)).toBe(true);
    const b2 = e.bauwerk;
    expect([b2.luftbild?.breiteM, b2.luftbild?.hoeheM]).toEqual([20, 10]);

    expect(e.setzeDeckkraft(0.4)).toBe(true);
    const b3 = e.bauwerk;
    expect(b3.luftbild?.deckkraft).toBe(0.4);

    e.entferneLuftbild();
    expect(e.bauwerk.luftbild).toBeNull();

    e.rueckgaengig();
    expect(e.bauwerk).toBe(b3);
    e.rueckgaengig();
    expect(e.bauwerk).toBe(b2);
    e.rueckgaengig();
    expect(e.bauwerk).toBe(b1);
    e.rueckgaengig();
    expect(e.bauwerk).toBe(b0);
    expect(e.zustand().kannRueckgaengig).toBe(false);
    e.wiederholen();
    e.wiederholen();
    expect(e.bauwerk).toBe(b2);
  });

  it('startet nach dem Laden sofort das Werkzeug „Maßstab setzen“', () => {
    const e = new Editor(Bauwerk.leer());
    e.ladeLuftbild(bild());
    expect(e.zustand().werkzeug).toBe('massstab');
  });

  it('lässt die Objekte beim Laden, Maßstab und Entfernen unverändert', () => {
    const k = kochstelle();
    const e = new Editor(k);
    e.ladeLuftbild(bild());
    expect(e.bauwerk.objekte).toEqual(k.objekte);
    expect(e.bauwerk.objekte.every((o, i) => o === k.objekte[i])).toBe(true);
    expect(e.bauwerk.istLeer).toBe(false);
    expect(e.bauwerk.objekte.some((o) => o.id.includes('luftbild'))).toBe(false);
  });

  it('Maßstab setzen: Punkte unter 10 px sind „zu nah beieinander“, das Werkzeug bleibt aktiv', () => {
    const e = new Editor(Bauwerk.leer());
    e.ladeLuftbild(bild());
    e.klick(boden(0, 0));
    e.klick(boden(4, 0)); // 8 px
    expect(e.zustand().meldung).toBe('Punkte zu nah beieinander');
    expect(e.zustand().werkzeug).toBe('massstab');
    expect(e.zustand().messung).toBeNull();
    e.klick(boden(0, 0));
    e.klick(boden(5, 0)); // genau 10 px
    expect(e.zustand().meldung).toBeNull();
    expect(e.zustand().messung?.bis).not.toBeNull();
  });

  it('der dritte Klick beginnt eine neue Strecke, der Maßstab bleibt dabei unberührt', () => {
    const e = new Editor(Bauwerk.leer());
    e.ladeLuftbild(bild());
    const vorher = e.bauwerk;
    e.klick(boden(0, 0));
    e.klick(boden(20, 0));
    e.klick(boden(1, 1));
    expect(e.zustand().messung?.bis).toBeNull();
    expect(e.bauwerk).toBe(vorher);
  });

  it('„Übernehmen“ ohne zwei Punkte oder mit Meter ≤ 0 ändert nichts und meldet', () => {
    const e = new Editor(Bauwerk.leer());
    e.ladeLuftbild(bild());
    const vorher = e.bauwerk;
    expect(e.setzeMassstab(10)).toBe(false);
    e.klick(boden(0, 0));
    e.klick(boden(50, 0));
    expect(e.setzeMassstab(0)).toBe(false);
    expect(e.zustand().meldung).toBe('Maßstab muss größer als 0 sein');
    expect(e.setzeMassstab(Number.NaN)).toBe(false);
    expect(e.bauwerk).toBe(vorher);
    expect(e.zustand().werkzeug).toBe('massstab');
  });

  it('nach dem Übernehmen ist das Auswahl-Werkzeug aktiv und die Strecke weg', () => {
    const e = new Editor(Bauwerk.leer());
    e.ladeLuftbild(bild());
    e.klick(boden(0, 0));
    e.klick(boden(50, 0));
    e.setzeMassstab(10);
    expect(e.zustand().werkzeug).toBe('auswahl');
    expect(e.zustand().messung).toBeNull();
  });

  it('ohne Luftbild meldet das Werkzeug „Maßstab setzen“ und Deckkraft einen Fehler', () => {
    const e = new Editor(Bauwerk.leer());
    e.waehleWerkzeug('massstab');
    e.klick(boden(0, 0));
    expect(e.zustand().meldung).toBe('Kein Luftbild geladen');
    expect(e.setzeDeckkraft(0.5)).toBe(false);
  });

  it('eine Deckkraft außerhalb von 0–1 wird abgelehnt', () => {
    const e = new Editor(Bauwerk.leer());
    e.ladeLuftbild(bild());
    expect(e.setzeDeckkraft(1.5)).toBe(false);
    expect(e.zustand().meldung).toBe('Deckkraft muss zwischen 0 und 100 % liegen');
    expect(e.bauwerk.luftbild?.deckkraft).toBe(1);
  });

  it('Entfernen beendet auch das Werkzeug „Maßstab setzen“', () => {
    const e = new Editor(Bauwerk.leer());
    e.ladeLuftbild(bild());
    e.entferneLuftbild();
    expect(e.zustand().werkzeug).toBe('auswahl');
    e.entferneLuftbild();
    expect(e.zustand().kannRueckgaengig).toBe(true);
  });

  it('Strg+A, Auswahl und Ziehen berühren das Luftbild nicht', () => {
    const e = new Editor(kochstelle());
    e.ladeLuftbild(bild());
    e.waehleWerkzeug('auswahl');
    e.waehleAlle();
    expect(e.zustand().ausgewaehlt.size).toBe(kochstelle().objekte.length);
    expect(e.verschiebeAuswahl(new Vec3(3, 0, 0))).toBe(true);
    expect(e.bauwerk.luftbild?.breiteM).toBe(100);
  });
});
