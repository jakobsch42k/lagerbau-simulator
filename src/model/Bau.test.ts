import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ABock } from './ABock';
import { Bau } from './Bau';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { Dreibein } from './Dreibein';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from './params';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';

const abock = new ABock('abock', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
const dreibein = new Dreibein('dreibein', new Vec3(2.5, 0, 0), 0, STANDARD_DREIBEIN);

/** Kochstelle mit zwei Abspannseilen, einem Seil zum Baum, einem fremden Seil, einem fremden Baum und je einer Plane am Bau und daneben. */
function platz(): Bauwerk {
  const baum = new Baum('baum', new Vec3(-4, 0, 0), STANDARD_BAUM);
  return kochstelle()
    .mitSeil(new Seil('s-a', abock.spitze(), new Vec3(-1.5, 0, 1)))
    .mitSeil(new Seil('s-b', dreibein.spitze(), new Vec3(4, 0, 2)))
    .mitBaum(baum)
    .mitSeil(new Seil('s-baum', abock.spitze(), new Vec3(-3.85, 3, 0)))
    .mitSeil(new Seil('s-fremd', new Vec3(10, 0, 10), new Vec3(12, 0, 10)))
    .mitPlane(new Plane('p-bau', abock.spitze(), dreibein.spitze(), STANDARD_PLANE))
    .mitPlane(new Plane('p-fremd', new Vec3(10, 3, 20), new Vec3(14, 3, 20), STANDARD_PLANE));
}

describe('Bau', () => {
  it('fasst über Bünde verbundene Stangen zu Gruppen zusammen, auch einzelne', () => {
    const b = kochstelle();
    expect(Bau.stangenGruppen(b.stangen(), b.buende())).toHaveLength(1);
    const getrennt = kochstelle().ohne('first');
    expect(Bau.stangenGruppen(getrennt.stangen(), getrennt.buende()).map((g) => g.length).sort()).toEqual([3, 3]);
  });

  it('Doppelklick auf das A-Bock-Bein liefert A-Bock, Dreibein, Firststange und alle Abspannseile', () => {
    const bau = Bau.von(platz(), 'abock-bein-0');
    expect(new Set(bau.objektIds)).toEqual(new Set(['abock', 'dreibein', 'first', 's-a', 's-b', 's-baum', 'p-bau']));
  });

  it('nimmt weder fremde Seile, Bäume noch fremde Planen auf', () => {
    const ids = Bau.von(platz(), 'first').objektIds;
    for (const fremd of ['s-fremd', 'baum', 'p-fremd']) expect(ids).not.toContain(fremd);
  });

  it('liefert die Stangen-ids des Baus', () => {
    expect(Bau.von(kochstelle(), 'dreibein').stangenIds).toHaveLength(7);
  });

  it('wählt bei einem getrennten Bau nur dessen Teil', () => {
    const getrennt = platz().ohne('first');
    const ids = Bau.von(getrennt, 'dreibein').objektIds;
    expect(ids).toContain('dreibein');
    expect(ids).toContain('s-b');
    expect(ids).not.toContain('abock');
    expect(ids).not.toContain('s-a');
  });

  it('gibt für ein Seil am Bau den ganzen Bau zurück, für ein freies Seil nur das Seil', () => {
    expect(Bau.von(platz(), 's-a').objektIds).toContain('dreibein');
    expect(Bau.von(platz(), 's-fremd').objektIds).toEqual(['s-fremd']);
  });

  it('gibt für eine Plane am Bau den ganzen Bau zurück, für eine freie Plane nur die Plane', () => {
    expect(Bau.von(platz(), 'p-bau').objektIds).toContain('abock');
    expect(Bau.von(platz(), 'p-fremd').objektIds).toEqual(['p-fremd']);
  });

  it('gibt für einen Baum nur den Baum zurück', () => {
    expect(Bau.von(platz(), 'baum').objektIds).toEqual(['baum']);
  });

  it('gibt für eine unbekannte id einen leeren Bau zurück', () => {
    expect(Bau.von(platz(), 'gibtsnicht').objektIds).toEqual([]);
  });
});
