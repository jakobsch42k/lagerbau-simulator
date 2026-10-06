import { describe, expect, it } from 'vitest';
import { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import { ART_NAMEN } from '../model/LagerObjekt';
import { erzeugeWerkzeug, PlatziereTool, SelectTool } from './Werkzeuge';
import { ZeichenTool } from './ZeichenTool';

describe('Werkzeuge aus dem Register (Spec v3, D4)', () => {
  it('gibt es für jede Art als Platzier-Werkzeug mit ihrem Namen, dazu die Auswahl', () => {
    for (const name of ART_NAMEN) {
      const w = erzeugeWerkzeug(name);
      expect(w).toBeInstanceOf(name === 'zone' || name === 'linie' ? ZeichenTool : PlatziereTool);
      expect(w.name).toBe(name);
      expect(w.angefangen).toBeNull();
    }
    expect(erzeugeWerkzeug('auswahl')).toBeInstanceOf(SelectTool);
  });

  it('leitet die Klickziele aus dem Register ab', () => {
    const ohnePlane = new ObjektRegister(standardArten().alle.filter((a) => a.name !== 'plane'));
    expect(erzeugeWerkzeug('auswahl', ohnePlane).klickZiele).toEqual(['seil', 'platzobjekt', 'beschriftung', 'zone', 'linie']);
    expect(erzeugeWerkzeug('seil', ohnePlane).klickZiele).toEqual([]);
    expect(erzeugeWerkzeug('seil').klickZiele).toEqual(['plane']);
  });
});
