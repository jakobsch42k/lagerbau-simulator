import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { kochstelle } from '../beispiele/kochstelle';
import { Analyse } from './Analyse';

describe('Analyse', () => {
  const a = new Analyse(kochstelle());

  it('stellt Stangen, Bünde und Füße bereit', () => {
    expect(a.stangen).toHaveLength(7);
    expect(a.buendeVon('first')).toHaveLength(2);
    expect(a.fuesseVon('dreibein-bein-0')).toHaveLength(1);
    expect(a.stange('first').id).toBe('first');
    expect(() => a.stange('gibtsnicht')).toThrow(/fehlt/);
  });

  it('fasst über Bünde verbundene Stangen zu einem Bau zusammen', () => {
    expect(a.komponenten()).toHaveLength(1);
    const getrennt = new Analyse(kochstelle().ohne('first')).komponenten();
    expect(getrennt.map((k) => k.length).sort()).toEqual([3, 3]);
  });

  it('ordnet Seilenden ihre Verankerung zu und findet Seile an Stangen', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const seil = new Seil('s', abock.spitze(), new Vec3(1.5, 0, 0));
    const an = new Analyse(Bauwerk.leer().mitGruppe(abock).mitSeil(seil));
    const [oben, unten] = an.verankerungVon('s');
    expect(oben.art).toBe('bau');
    expect(unten).toEqual({ art: 'haring' });
    const anschluesse = an.seileAn(new Set(abock.stangen().map((x) => x.id)));
    expect(anschluesse).toHaveLength(1);
    expect(anschluesse[0]?.anderesEnde.equals(new Vec3(1.5, 0, 0), 1e-9)).toBe(true);
    expect(anschluesse[0]?.anderes).toEqual({ art: 'haring' });
    expect(an.seileAn(new Set(['gibtsnicht']))).toEqual([]);
    expect(an.haringe).toHaveLength(1);
    expect(() => an.verankerungVon('gibtsnicht')).toThrow(/fehlt/);
  });

  it('ein Seil verbindet zwei Bauten nicht zu einem', () => {
    const links = new ABock('l', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const rechts = new ABock('r', new Vec3(4, 0, 0), Math.PI / 2, STANDARD_ABOCK);
    const b = Bauwerk.leer().mitGruppe(links).mitGruppe(rechts).mitSeil(new Seil('q', links.spitze(), rechts.spitze()));
    expect(new Analyse(b).komponenten()).toHaveLength(2);
  });
});
