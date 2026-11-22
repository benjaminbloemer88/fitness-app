/**
 * Trainingstage verschieben – nur lokal in der App.
 * Ins Log kommt bei der Einheit später der Hinweis „geplant für …“.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { effektiveEinheiten, verschiebe, type EffektiveEinheit, type Verschiebung } from '../domain/wochenplan';
import { db as standardDb, type FitnessDB, type GespeicherterPlan } from './db';

/** Alle Plantage aller gespeicherten Pläne. */
function alleTage(plaene: GespeicherterPlan[]) {
  return plaene.flatMap((p) => p.plan.tage);
}

/** Verschiebt die Einheit vom Plandatum auf ein anderes Datum (optional mit Tauschen). */
export async function einheitVerschieben(planDatum: string, zielDatum: string, tauschen = false, db: FitnessDB = standardDb): Promise<void> {
  await db.transaction('rw', db.verschiebungen, db.plaene, async () => {
    const plaene = await db.plaene.toArray();
    const bisher: Verschiebung[] = await db.verschiebungen.toArray();
    const neu = verschiebe(effektiveEinheiten(alleTage(plaene), bisher), bisher, planDatum, zielDatum, tauschen);
    await db.verschiebungen.clear();
    const jetzt = new Date().toISOString();
    await db.verschiebungen.bulkPut(neu.map((v) => ({ ...v, erstelltAm: jetzt })));
  });
}

/** Hebt die Verschiebung auf: die Einheit liegt wieder an ihrem Plandatum. */
export async function verschiebungAufheben(planDatum: string, db: FitnessDB = standardDb): Promise<void> {
  await db.verschiebungen.delete(planDatum);
}

export interface Planung {
  plaene: GespeicherterPlan[];
  verschiebungen: Verschiebung[];
  /** Alle Trainingseinheiten aller Pläne mit effektivem Datum. */
  effektiv: EffektiveEinheit[];
  /** Plandaten mit abgeschlossener oder ausgelassener Einheit. */
  fertig: Set<string>;
}

/** React-Hook: Pläne, Verschiebungen und erledigte Tage – live aktualisiert. undefined = lädt. */
export function usePlanung(): Planung | undefined {
  return useLiveQuery(async () => {
    const [plaene, verschiebungen, fertigeEinheiten] = await Promise.all([
      standardDb.plaene.toArray(),
      standardDb.verschiebungen.toArray(),
      standardDb.einheiten.where('status').anyOf('abgeschlossen', 'ausgelassen').toArray(),
    ]);
    return {
      plaene,
      verschiebungen,
      effektiv: effektiveEinheiten(alleTage(plaene), verschiebungen),
      fertig: new Set(fertigeEinheiten.flatMap((e) => (e.planDatum ? [e.planDatum] : []))),
    };
  }, []);
}
