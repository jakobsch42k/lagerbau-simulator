/** Unveränderlicher 3D-Vektor in Metern. y zeigt nach oben. */
export class Vec3 {
  static readonly NULL = new Vec3(0, 0, 0);
  static readonly OBEN = new Vec3(0, 1, 0);

  constructor(
    readonly x: number,
    readonly y: number,
    readonly z: number,
  ) {}

  static fromArray(a: readonly number[]): Vec3 {
    return new Vec3(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
  }

  add(o: Vec3): Vec3 {
    return new Vec3(this.x + o.x, this.y + o.y, this.z + o.z);
  }

  sub(o: Vec3): Vec3 {
    return new Vec3(this.x - o.x, this.y - o.y, this.z - o.z);
  }

  scale(f: number): Vec3 {
    return new Vec3(this.x * f, this.y * f, this.z * f);
  }

  dot(o: Vec3): number {
    return this.x * o.x + this.y * o.y + this.z * o.z;
  }

  cross(o: Vec3): Vec3 {
    return new Vec3(
      this.y * o.z - this.z * o.y,
      this.z * o.x - this.x * o.z,
      this.x * o.y - this.y * o.x,
    );
  }

  length(): number {
    return Math.sqrt(this.dot(this));
  }

  normalize(): Vec3 {
    const l = this.length();
    if (l === 0) throw new RangeError('Nullvektor kann nicht normiert werden');
    return this.scale(1 / l);
  }

  distanceTo(o: Vec3): number {
    return this.sub(o).length();
  }

  equals(o: Vec3, eps = 1e-9): boolean {
    return this.distanceTo(o) <= eps;
  }

  /** Um die senkrechte Achse durch `um` gedreht; positiv wie `Baugruppe.drehung` (x dreht nach z). Die Höhe bleibt. */
  gedrehtUmY(winkelRad: number, um: Vec3 = Vec3.NULL): Vec3 {
    const c = Math.cos(winkelRad);
    const s = Math.sin(winkelRad);
    const dx = this.x - um.x;
    const dz = this.z - um.z;
    return new Vec3(um.x + dx * c - dz * s, this.y, um.z + dx * s + dz * c);
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }
}
