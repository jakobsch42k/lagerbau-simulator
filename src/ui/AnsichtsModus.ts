export const SCHMAL_PX = 768;

/** Schaltet zwischen Editor und reiner Ansicht (geteilter Link, Handy). */
export class AnsichtsModus {
  constructor(private readonly body: HTMLElement) {}

  get istSchmal(): boolean {
    return window.matchMedia(`(max-width: ${SCHMAL_PX - 1}px)`).matches;
  }

  get aktiv(): boolean {
    return this.body.classList.contains('ansicht');
  }

  setze(ansicht: boolean): void {
    this.body.classList.toggle('ansicht', ansicht || this.istSchmal);
  }
}
