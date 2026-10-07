import { describe, expect, it } from 'vitest';
import { Luftbild, MAX_BILD_SEITE_PX, MAX_DATA_URL_ZEICHEN } from './Luftbild';
import { massstabAusPunkten, MIN_PUNKTABSTAND_PX, pixelAbstand } from './Massstab';
import { Vec3 } from './Vec3';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('Luftbild', () => {
  it('leitet Maße in Metern ab und liegt mittig auf dem Ursprung (Norden = -z)', () => {
    const l = new Luftbild(PNG, 2000, 1500, 0.1225, 0.5);
    expect(l.breiteM).toBeCloseTo(245);
    expect(l.hoeheM).toBeCloseTo(183.75);
    const [nw, no, so, sw] = l.ecken();
    expect([nw?.x, nw?.z]).toEqual([-l.breiteM / 2, -l.hoeheM / 2]);
    expect([no?.x, no?.z]).toEqual([l.breiteM / 2, -l.hoeheM / 2]);
    expect([so?.x, so?.z]).toEqual([l.breiteM / 2, l.hoeheM / 2]);
    expect([sw?.x, sw?.z]).toEqual([-l.breiteM / 2, l.hoeheM / 2]);
    expect(l.ecken().every((e) => e.y === 0)).toBe(true);
  });

  it('akzeptiert PNG und JPEG, nichts anderes', () => {
    expect(() => new Luftbild('data:image/jpeg;base64,/9j/4AAQ', 10, 10, 1, 1)).not.toThrow();
    for (const schlecht of ['data:image/gif;base64,R0lGOD', 'data:image/png;base64,####', 'https://x.test/a.png', 'data:image/png,abc', '']) {
      expect(() => new Luftbild(schlecht, 10, 10, 1, 1)).toThrow(new RangeError('Ungültiges Bildformat (nur PNG oder JPEG)'));
    }
  });

  it('prüft Maßstab, Deckkraft und Pixelmaße', () => {
    for (const m of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new Luftbild(PNG, 10, 10, m, 1)).toThrow(new RangeError('Maßstab muss größer als 0 sein'));
    }
    for (const d of [-0.01, 1.01, Number.NaN]) {
      expect(() => new Luftbild(PNG, 10, 10, 1, d)).toThrow(new RangeError('Deckkraft muss zwischen 0 und 100 % liegen'));
    }
    for (const [b, h] of [[0, 10], [10, 0], [1.5, 10], [-3, 10]] as const) {
      expect(() => new Luftbild(PNG, b, h, 1, 1)).toThrow(RangeError);
    }
    expect(() => new Luftbild(PNG, 10, 10, 1, 0)).not.toThrow();
  });

  it('lehnt eine zu lange Data-URL ab', () => {
    const lang = `data:image/png;base64,${'A'.repeat(MAX_DATA_URL_ZEICHEN)}`;
    expect(() => new Luftbild(lang, 10, 10, 1, 1)).toThrow(new RangeError('Bild zu groß'));
    const grenze = `data:image/png;base64,${'A'.repeat(MAX_DATA_URL_ZEICHEN - 'data:image/png;base64,'.length)}`;
    expect(() => new Luftbild(grenze, 10, 10, 1, 1)).not.toThrow();
  });

  it('mitMassstab und mitDeckkraft liefern neue Objekte, sonst dasselbe', () => {
    const l = new Luftbild(PNG, 200, 100, 0.5, 1);
    const m = l.mitMassstab(0.1);
    expect(m).not.toBe(l);
    expect([m.breiteM, m.hoeheM]).toEqual([20, 10]);
    expect(m.daten).toBe(l.daten);
    expect(l.mitMassstab(0.5)).toBe(l);
    expect(l.mitDeckkraft(0.4).deckkraft).toBe(0.4);
    expect(l.mitDeckkraft(1)).toBe(l);
    expect(() => l.mitMassstab(0)).toThrow(RangeError);
    expect(() => l.mitDeckkraft(2)).toThrow(RangeError);
  });

  it('startet mit 100 m für die längere Seite', () => {
    const quer = Luftbild.vorlaeufig(PNG, 200, 100);
    expect([quer.breiteM, quer.hoeheM, quer.deckkraft]).toEqual([100, 50, 1]);
    const hoch = Luftbild.vorlaeufig(PNG, 100, 400);
    expect(hoch.hoeheM).toBeCloseTo(100);
  });

  it('rechnet die Zielgröße beim Verkleinern: Grenze 4096 px, Seitenverhältnis bleibt', () => {
    expect(Luftbild.zielgroesse(4096, 100)).toEqual({ breitePx: 4096, hoehePx: 100, verkleinert: false });
    expect(Luftbild.zielgroesse(200, 100)).toEqual({ breitePx: 200, hoehePx: 100, verkleinert: false });
    expect(Luftbild.zielgroesse(8192, 4096)).toEqual({ breitePx: MAX_BILD_SEITE_PX, hoehePx: 2048, verkleinert: true });
    expect(Luftbild.zielgroesse(3000, 6000)).toEqual({ breitePx: 2048, hoehePx: 4096, verkleinert: true });
    expect(Luftbild.zielgroesse(100_000, 10)).toEqual({ breitePx: 4096, hoehePx: 1, verkleinert: true });
  });
});

describe('Maßstab aus zwei Punkten', () => {
  it('rechnet Meter durch Pixelabstand', () => {
    // 50 m auf dem Boden bei 0,5 m/px sind 100 px; 10 m dafür ergeben 0,1 m/px.
    const a = new Vec3(-25, 0, 0);
    const b = new Vec3(25, 0, 0);
    expect(pixelAbstand(a, b, 0.5)).toBeCloseTo(100);
    expect(massstabAusPunkten(a, b, 10, 0.5)).toBeCloseTo(0.1);
  });

  it('zählt auch schräge Abstände in der Bodenebene (y wird ignoriert)', () => {
    expect(pixelAbstand(new Vec3(0, 3, 0), new Vec3(3, 0, 4), 0.5)).toBeCloseTo(10);
  });

  it('meldet Punkte unter 10 px als zu nah beieinander', () => {
    const nah = new Vec3(0.5 * (MIN_PUNKTABSTAND_PX - 0.1), 0, 0);
    expect(() => massstabAusPunkten(Vec3.NULL, nah, 10, 0.5)).toThrow(new RangeError('Punkte zu nah beieinander'));
    expect(() => massstabAusPunkten(Vec3.NULL, new Vec3(0.5 * MIN_PUNKTABSTAND_PX, 0, 0), 10, 0.5)).not.toThrow();
  });

  it('lehnt Meter ≤ 0 ab', () => {
    expect(() => massstabAusPunkten(Vec3.NULL, new Vec3(50, 0, 0), 0, 0.5)).toThrow(new RangeError('Maßstab muss größer als 0 sein'));
    expect(() => massstabAusPunkten(Vec3.NULL, new Vec3(50, 0, 0), Number.NaN, 0.5)).toThrow(RangeError);
  });
});
