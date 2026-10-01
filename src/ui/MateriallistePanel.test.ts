// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Materialliste } from '../model/Materialliste';
import { STANDARD_ABOCK } from '../model/params';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { MateriallistePanel } from './MateriallistePanel';

const zeige = (b: Bauwerk): { tabelle: HTMLTableElement; platz: HTMLElement } => {
  const tabelle = document.createElement('table');
  const platz = document.createElement('p');
  new MateriallistePanel(tabelle, platz).zeige(Materialliste.aus(b, 0.5));
  return { tabelle, platz };
};

describe('MateriallistePanel', () => {
  it('zeigt Stangen, Seile, Heringe und den Platzbedarf', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const b = Bauwerk.leer()
      .mitGruppe(abock)
      .mitSeil(new Seil('l', abock.spitze(), new Vec3(-1.5, 0, 0)))
      .mitSeil(new Seil('r', abock.spitze(), new Vec3(1.5, 0, 0)));
    const { tabelle, platz } = zeige(b);
    const zellen = [...tabelle.querySelectorAll('td')].map((td) => td.textContent);
    expect(zellen).toContain('2.4 m');
    expect(zellen).toContain('4 m');
    expect(zellen).toContain('Heringe');
    expect(platz.textContent).toBe('Platzbedarf: 3.0 × 1.6 m');
  });

  it('lässt Seile, Heringe und Platzbedarf weg, wenn es keine gibt', () => {
    const { tabelle, platz } = zeige(Bauwerk.leer());
    expect(tabelle.textContent).not.toContain('Seil');
    expect(tabelle.textContent).not.toContain('Heringe');
    expect(platz.textContent).toBe('');
  });
});
