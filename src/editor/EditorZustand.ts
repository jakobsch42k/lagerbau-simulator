import type { ObjektRegister } from '../arten/ObjektRegister';
import type { Bauwerk } from '../model/Bauwerk';
import type { Vec3 } from '../model/Vec3';
import type { Messung } from './Messung';
import type { SnapService } from './SnapService';
import type { WerkzeugName } from './Werkzeuge';

export interface EditorZustand {
  readonly bauwerk: Bauwerk;
  /** Beim Ziehen der Zwischenstand, den die Szene zeigt (kein Verlaufseintrag, die Hinweise rechnen am `bauwerk`); sonst null. */
  readonly vorschau: Bauwerk | null;
  /** Alle ausgewählten Objekte (Spec v3, D6). Ids, die das Bauwerk nicht kennt, fallen heraus. */
  readonly ausgewaehlt: ReadonlySet<string>;
  /** Die eine ausgewählte id; null, wenn nichts oder mehr als ein Objekt ausgewählt ist. */
  readonly auswahl: string | null;
  readonly markiert: ReadonlySet<string>;
  readonly werkzeug: WerkzeugName;
  readonly stangenStart: Vec3 | null;
  /** Die angezeigte Messung (nicht im Bauwerk, nicht gespeichert); sonst null. */
  readonly messung: Messung | null;
  readonly meldung: string | null;
  readonly kannRueckgaengig: boolean;
  readonly kannWiederholen: boolean;
}

export interface EditorOptionen {
  readonly arten?: ObjektRegister;
  readonly snap?: SnapService;
  readonly neueId?: (praefix: string) => string;
}
