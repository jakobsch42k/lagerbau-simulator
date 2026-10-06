import { Baugruppe } from './Baugruppe';
import { STANGEN_UEBERSTAND } from './konstanten';
import type { DreibeinParams } from './params';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

export class Dreibein extends Baugruppe {
  readonly typ = 'dreibein' as const;

  constructor(
    id: string,
    position: Vec3,
    drehung: number,
    readonly params: DreibeinParams,
  ) {
    super(id, position, drehung);
    Baugruppe.pruefePositiv(params.stangenlaenge, 'Stangenlänge');
    Baugruppe.pruefePositiv(params.fusskreisradius, 'Fußkreisradius');
    Baugruppe.pruefePositiv(params.durchmesser, 'Durchmesser');
    if (params.fusskreisradius >= this.nutzlaenge()) {
      throw new RangeError('Fußkreisradius muss kleiner als Stangenlänge minus Überstand sein');
    }
    if (!Number.isFinite(this.hoehe())) throw new RangeError('Die Maße sind zu groß');
  }

  private nutzlaenge(): number {
    return this.params.stangenlaenge - STANGEN_UEBERSTAND;
  }

  hoehe(): number {
    const n = this.nutzlaenge();
    const r = this.params.fusskreisradius;
    return Math.sqrt(n * n - r * r);
  }

  spitze(): Vec3 {
    return this.position.add(new Vec3(0, this.hoehe(), 0));
  }

  fuesse(): readonly Vec3[] {
    const r = this.params.fusskreisradius;
    return [0, 1, 2].map((i) => {
      const w = this.drehung + (i * 2 * Math.PI) / 3;
      return this.position.add(new Vec3(r * Math.cos(w), 0, r * Math.sin(w)));
    });
  }

  stangen(): readonly Stange[] {
    const spitze = this.spitze();
    const verlaengerung = this.params.stangenlaenge / this.nutzlaenge();
    return this.fuesse().map(
      (fuss, i) =>
        new Stange(`${this.id}-bein-${i}`, fuss, fuss.add(spitze.sub(fuss).scale(verlaengerung)), this.params.durchmesser, 'bein', this.id),
    );
  }

  beinwinkelGrad(): number {
    return (Math.asin(this.params.fusskreisradius / this.nutzlaenge()) * 180) / Math.PI;
  }

  mitParams(params: DreibeinParams): Dreibein {
    return new Dreibein(this.id, this.position, this.drehung, params);
  }

  gedreht(delta: number, um?: Vec3): Dreibein {
    const position = um === undefined ? this.position : this.position.gedrehtUmY(delta, um);
    return new Dreibein(this.id, position, this.drehung + delta, this.params);
  }

  verschoben(position: Vec3): Dreibein {
    return new Dreibein(this.id, position, this.drehung, this.params);
  }
}
