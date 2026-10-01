import { Baugruppe } from './Baugruppe';
import { STANGEN_UEBERSTAND } from './konstanten';
import type { ABockParams } from './params';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

export class ABock extends Baugruppe {
  readonly typ = 'abock' as const;

  constructor(
    id: string,
    position: Vec3,
    drehung: number,
    readonly params: ABockParams,
  ) {
    super(id, position, drehung);
    Baugruppe.pruefePositiv(params.stangenlaenge, 'Stangenlänge');
    Baugruppe.pruefePositiv(params.fussabstand, 'Fußabstand');
    Baugruppe.pruefePositiv(params.riegelhoehe, 'Riegelhöhe');
    Baugruppe.pruefePositiv(params.durchmesser, 'Durchmesser');
    if (params.fussabstand / 2 >= this.nutzlaenge()) {
      throw new RangeError('Fußabstand ist zu groß für diese Stangenlänge');
    }
    if (!Number.isFinite(this.hoehe())) throw new RangeError('Die Maße sind zu groß');
    if (params.riegelhoehe >= this.hoehe()) throw new RangeError('Der Riegel muss unter der Spitze liegen');
  }

  private nutzlaenge(): number {
    return this.params.stangenlaenge - STANGEN_UEBERSTAND;
  }

  achse(): Vec3 {
    return new Vec3(Math.cos(this.drehung), 0, Math.sin(this.drehung));
  }

  ebenenNormale(): Vec3 {
    return new Vec3(-Math.sin(this.drehung), 0, Math.cos(this.drehung));
  }

  hoehe(): number {
    const n = this.nutzlaenge();
    const halb = this.params.fussabstand / 2;
    return Math.sqrt(n * n - halb * halb);
  }

  spitze(): Vec3 {
    return this.position.add(new Vec3(0, this.hoehe(), 0));
  }

  fuesse(): readonly [Vec3, Vec3] {
    const v = this.achse().scale(this.params.fussabstand / 2);
    return [this.position.sub(v), this.position.add(v)];
  }

  stangen(): readonly Stange[] {
    const spitze = this.spitze();
    const { stangenlaenge, durchmesser, riegelhoehe } = this.params;
    const verlaengerung = stangenlaenge / this.nutzlaenge();
    const [a, b] = this.fuesse();
    const beine = [a, b].map(
      (fuss, i) => new Stange(`${this.id}-bein-${i}`, fuss, fuss.add(spitze.sub(fuss).scale(verlaengerung)), durchmesser, 'bein', this.id),
    );
    const t = riegelhoehe / this.hoehe();
    const ra = a.add(spitze.sub(a).scale(t));
    const rb = b.add(spitze.sub(b).scale(t));
    const r = rb.sub(ra).normalize();
    const riegel = new Stange(
      `${this.id}-riegel`,
      ra.sub(r.scale(STANGEN_UEBERSTAND)),
      rb.add(r.scale(STANGEN_UEBERSTAND)),
      durchmesser,
      'riegel',
      this.id,
    );
    return [...beine, riegel];
  }

  beinwinkelGrad(): number {
    return (Math.asin(this.params.fussabstand / 2 / this.nutzlaenge()) * 180) / Math.PI;
  }

  mitParams(params: ABockParams): ABock {
    return new ABock(this.id, this.position, this.drehung, params);
  }

  gedreht(delta: number): ABock {
    return new ABock(this.id, this.position, this.drehung + delta, this.params);
  }

  verschoben(position: Vec3): ABock {
    return new ABock(this.id, position, this.drehung, this.params);
  }
}
