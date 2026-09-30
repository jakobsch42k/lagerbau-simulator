/** Unveränderlicher Undo/Redo-Verlauf. */
export class Verlauf<T> {
  private constructor(
    private readonly vorher: readonly T[],
    readonly aktuell: T,
    private readonly nachher: readonly T[],
    private readonly max: number,
  ) {}

  static start<T>(anfang: T, max = 100): Verlauf<T> {
    return new Verlauf<T>([], anfang, [], max);
  }

  get kannRueckgaengig(): boolean {
    return this.vorher.length > 0;
  }

  get kannWiederholen(): boolean {
    return this.nachher.length > 0;
  }

  mit(neu: T): Verlauf<T> {
    return new Verlauf([...this.vorher, this.aktuell].slice(-this.max), neu, [], this.max);
  }

  rueckgaengig(): Verlauf<T> {
    if (!this.kannRueckgaengig) return this;
    const letzter = this.vorher[this.vorher.length - 1] as T;
    return new Verlauf(this.vorher.slice(0, -1), letzter, [this.aktuell, ...this.nachher], this.max);
  }

  wiederholen(): Verlauf<T> {
    if (!this.kannWiederholen) return this;
    const [naechster, ...rest] = this.nachher;
    return new Verlauf([...this.vorher, this.aktuell], naechster as T, rest, this.max);
  }
}
