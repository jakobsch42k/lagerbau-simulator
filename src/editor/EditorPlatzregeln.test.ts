import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Baum } from '../model/Baum';
import { STANDARD_BAUM } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { Editor } from './Editor';

describe('Platzregel-Einstellungen im Bauwerk (Spec E6, D4)', () => {
  it('eine Änderung ist ein Undo-Schritt, Undo stellt den Standard wieder her', () => {
    const e = new Editor(kochstelle());
    e.aendereMit((b) => b.mitPlatzregelEinstellungen(b.platzregelEinstellungen.mitAus('P3', true)));
    expect(e.bauwerk.platzregelEinstellungen.istAus('P3')).toBe(true);
    expect(e.zustand().kannRueckgaengig).toBe(true);
    e.rueckgaengig();
    expect(e.bauwerk.platzregelEinstellungen.istStandard).toBe(true);
  });

  it('dieselben Einstellungen sind kein Undo-Schritt', () => {
    const e = new Editor(kochstelle());
    e.aendereMit((b) => b.mitPlatzregelEinstellungen(b.platzregelEinstellungen));
    expect(e.zustand().kannRueckgaengig).toBe(false);
  });

  it('bleiben beim Ändern des Bauwerks erhalten', () => {
    const einst = kochstelle().platzregelEinstellungen.mitAus('P1', true).mitWert('P4_MIN_ABSTAND_LATRINE_WASSER_M', 50);
    const b = kochstelle().mitPlatzregelEinstellungen(einst);
    const baum = new Baum('neu', new Vec3(9, 0, 9), STANDARD_BAUM);
    expect(b.mit(baum).platzregelEinstellungen).toBe(einst);
    expect(b.mit(baum).ersetze(baum.mitParams({ ...STANDARD_BAUM, hoehe: 7 })).platzregelEinstellungen).toBe(einst);
    expect(b.mit(baum).ohne('neu').platzregelEinstellungen).toBe(einst);
    expect(b.mitRegelEinstellungen(b.regelEinstellungen.mitAus('R1', true)).platzregelEinstellungen).toBe(einst);
    expect(b.mitPlatzregelEinstellungen(einst)).toBe(b);
  });
});
