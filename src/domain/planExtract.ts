/**
 * Liest die Plan-Daten (JSON) aus dem Doc.
 *
 * Der Coach schreibt das JSON zwischen eine Zeile „PLAN-JSON-START“ und eine
 * Zeile „PLAN-JSON-END“. Im Doc kann es auf mehrere Absätze verteilt sein und
 * Spuren der Textverarbeitung enthalten (typografische Anführungszeichen,
 * Markdown-Escapes wie „woche\_von“). Diese Spuren räumen wir vor dem Parsen weg.
 */
import { normalisiereZeichen } from './docSnapshot';
import { PlanSchema, pruefePlanRegeln, type Plan } from './planSchema';

export const MARKER_START = 'PLAN-JSON-START';
export const MARKER_ENDE = 'PLAN-JSON-END';

export type PlanJsonErgebnis =
  | { status: 'ok'; plan: Plan; warnungen: string[] }
  | { status: 'fehlt' }
  | { status: 'ungueltig'; fehler: string[] };

/**
 * Sucht die Absätze zwischen den Markern. Gibt null zurück, wenn ein Marker fehlt.
 * `absaetze` sind die Absatztexte des Docs in Reihenfolge.
 */
export function findeJsonAbsaetze(absaetze: string[]): string[] | null {
  const gesamt = normalisiereZeichen(absaetze.join('\n'));
  // Marker können selbst Markdown-Escapes enthalten („PLAN\-JSON\-START“), daher \\? vor jedem Bindestrich.
  // Der Inhalt darf auch im selben Absatz wie die Marker stehen (weiche Zeilenumbrüche).
  const treffer = gesamt.match(/PLAN\\?-JSON\\?-START([\s\S]*?)PLAN\\?-JSON\\?-END/);
  if (!treffer) return null;
  return (treffer[1] ?? '').split('\n');
}

/**
 * Repariert typische Spuren aus Google Docs/Markdown im JSON-Text:
 * - Backslash vor Zeichen, die in JSON gar nicht escaped werden dürfen („\_“ → „_“)
 * - Fettdruck-Sternchen, Code-Zäune (```)
 * - Kommas vor schließenden Klammern
 */
export function repariereJsonText(text: string): string {
  let s = normalisiereZeichen(text)
    .replace(/^\s*```[a-z]*\s*$/gim, '')
    .replace(/\*\*/g, '')
    // Gültige JSON-Escapes sind \" \\ \/ \b \f \n \r \t \uXXXX – alles andere ist ein Markdown-Rest.
    .replace(/\\([^"\\/bfnrtu])/g, '$1');
  const erste = s.indexOf('{');
  const letzte = s.lastIndexOf('}');
  if (erste >= 0 && letzte > erste) s = s.slice(erste, letzte + 1);
  return s.replace(/,\s*([}\]])/g, '$1');
}

/** Zod-Fehler in lesbare deutsche Zeilen umwandeln. */
function fehlerTexte(issues: { path: PropertyKey[]; message: string }[]): string[] {
  return issues.slice(0, 8).map((i) => `${i.path.map(String).join('.') || '(Wurzel)'}: ${i.message}`);
}

/** Parst und validiert einen JSON-Text (ohne Marker). */
export function parsePlanJson(text: string): PlanJsonErgebnis {
  let roh: unknown;
  try {
    roh = JSON.parse(repariereJsonText(text));
  } catch (e) {
    return { status: 'ungueltig', fehler: [`Kein gültiges JSON: ${(e as Error).message}`] };
  }
  const ergebnis = PlanSchema.safeParse(roh);
  if (!ergebnis.success) return { status: 'ungueltig', fehler: fehlerTexte(ergebnis.error.issues) };
  return { status: 'ok', plan: ergebnis.data, warnungen: pruefePlanRegeln(ergebnis.data) };
}

/**
 * Sucht die Marker in den Absätzen, setzt das JSON zusammen und validiert es.
 * Wir versuchen zuerst, die Absätze mit Zeilenumbruch zu verbinden, und falls
 * das scheitert (Umbruch mitten in einem Text), ohne Trennzeichen.
 */
export function planAusAbsaetzen(absaetze: string[]): PlanJsonErgebnis {
  const zeilen = findeJsonAbsaetze(absaetze);
  if (zeilen === null) return { status: 'fehlt' };
  const mitUmbruch = parsePlanJson(zeilen.join('\n'));
  if (mitUmbruch.status === 'ok') return mitUmbruch;
  const ohneUmbruch = parsePlanJson(zeilen.join(''));
  return ohneUmbruch.status === 'ok' ? ohneUmbruch : mitUmbruch;
}
