/**
 * Plan aus einem Doc-Snapshot holen: zuerst die Plan-Daten (JSON),
 * sonst die lesbare Tabelle als Fallback – jeweils mit Hinweisen für die Anzeige.
 */
import { absatzTexte, abschnittsBloecke, findeUeberschrift, type DocSnapshot } from './docSnapshot';
import { planAusAbsaetzen } from './planExtract';
import { parsePlanTabelle } from './planTableParser';
import type { Plan } from './planSchema';

export type PlanQuelle = 'json' | 'tabelle' | 'testdaten';

export interface PlanLadeErgebnis {
  plan: Plan | null;
  quelle: PlanQuelle | null;
  /** Status des JSON-Blocks – „fehlt“ heißt: einmalige Erzeugung anbieten. */
  jsonStatus: 'ok' | 'fehlt' | 'ungueltig';
  hinweise: string[];
}

/** Findet Überschrift und Tabelle des Abschnitts „Aktueller Wochenplan“. */
export function findePlanTabelle(doc: DocSnapshot): { ueberschrift: string; zeilen: string[][] } | null {
  const index = findeUeberschrift(doc, /^Aktueller Wochenplan/i);
  if (index < 0) return null;
  const kopf = doc.bloecke[index]!;
  const tabelle = abschnittsBloecke(doc, index).find((b) => b.typ === 'tabelle');
  if (!tabelle || tabelle.typ !== 'tabelle' || kopf.typ !== 'ueberschrift') return null;
  return { ueberschrift: kopf.text, zeilen: tabelle.zeilen };
}

export function planAusSnapshot(doc: DocSnapshot): PlanLadeErgebnis {
  const json = planAusAbsaetzen(absatzTexte(doc));
  const tabelle = findePlanTabelle(doc);
  const ausTabelle = tabelle ? parsePlanTabelle(tabelle.ueberschrift, tabelle.zeilen) : null;

  if (json.status === 'ok') {
    const hinweise = [...json.warnungen];
    // Plausibilitätsprüfung: JSON und lesbare Tabelle sollten dieselbe Woche zeigen.
    if (ausTabelle?.plan && ausTabelle.plan.woche_von !== json.plan.woche_von) {
      hinweise.push(
        `Plan-Daten (${json.plan.woche_von}) und Tabelle (${ausTabelle.plan.woche_von}) zeigen verschiedene Wochen – es gelten die Plan-Daten.`,
      );
    }
    return { plan: json.plan, quelle: 'json', jsonStatus: 'ok', hinweise };
  }

  const grund =
    json.status === 'fehlt'
      ? 'Im Doc fehlen die Plan-Daten (JSON). Der Plan wurde aus der Tabelle gelesen – bitte kurz prüfen.'
      : `Die Plan-Daten (JSON) sind ungültig: ${json.fehler.join('; ')}. Der Plan wurde aus der Tabelle gelesen.`;

  if (!ausTabelle?.plan) {
    return {
      plan: null,
      quelle: null,
      jsonStatus: json.status,
      hinweise: [grund, 'Die Plantabelle konnte auch nicht gelesen werden.', ...(ausTabelle?.warnungen ?? [])],
    };
  }
  return { plan: ausTabelle.plan, quelle: 'tabelle', jsonStatus: json.status, hinweise: [grund, ...ausTabelle.warnungen] };
}
