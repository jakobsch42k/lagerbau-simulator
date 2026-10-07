import { describe, expect, it } from 'vitest';
import { standardArten } from '../arten/standardArten';
import { ZeltVorlagenWahl } from '../arten/zelt/vorlagen';
import { VorlagenWahl } from '../arten/platz/vorlagen';
import { Bauwerk } from '../model/Bauwerk';
import { Vec3 } from '../model/Vec3';
import type { Zelt } from '../model/Zelt';
import { Editor } from './Editor';
import type { Treffer } from './SnapService';

const boden = (x: number, z: number): Treffer => ({ art: 'boden', punkt: new Vec3(x, 0, z) });

describe('Werkzeug „Zelt“ im Editor (Spec E4, D5)', () => {
  it('setzt Zelte der gewählten Vorlage, die Vorlage bleibt aktiv, Statuszeile nennt den Namen', () => {
    const zelte = new ZeltVorlagenWahl();
    const arten = standardArten(new VorlagenWahl(), zelte);
    let n = 0;
    const e = new Editor(Bauwerk.leer(), { arten, neueId: (p) => `${p}-${++n}` });
    zelte.setze('jurte6');
    e.waehleWerkzeug('zelt');
    e.klick(boden(10, 5));
    expect(e.zustand().meldung).toBe('Zelt gesetzt: Jurte 6er');
    e.klick(boden(30, 5));
    const objekte = e.bauwerk.objekte as readonly Zelt[];
    expect(objekte.map((o) => [o.id, o.params.vorlage, o.position.x])).toEqual([
      ['zelt-1', 'jurte6', 10],
      ['zelt-2', 'jurte6', 30],
    ]);
    expect(e.zustand().werkzeug).toBe('zelt');
    expect(e.zustand().auswahl).toBe('zelt-2');
  });
});
