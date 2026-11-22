/**
 * Übungen tauschen: speichern, Regel „immer“ verwalten, laufende Einheit nachziehen.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { uebungsSchluessel } from '../domain/einheit';
import { ersetzungsId, type Ersetzung } from '../domain/ersetzungen';
import { istKoerpergewichtsUebung } from '../domain/uebungsKatalog';
import { db as standardDb, type FitnessDB } from './db';
import { letzteLeistung } from './einheiten';

/** Speichert den Tausch für einen Plantag (und optional als Regel „immer“). */
export async function ersetzungSpeichern(
  planDatum: string | null,
  original: string,
  ersatz: string,
  immer: boolean,
  db: FitnessDB = standardDb,
): Promise<void> {
  const jetzt = new Date().toISOString();
  await db.transaction('rw', db.ersetzungen, async () => {
    if (planDatum) await db.ersetzungen.put({ id: ersetzungsId(planDatum, original), planDatum, original, ersatz, erstelltAm: jetzt });
    if (immer && uebungsSchluessel(ersatz) !== uebungsSchluessel(original)) {
      await db.ersetzungen.put({ id: ersetzungsId(null, original), planDatum: null, original, ersatz, erstelltAm: jetzt });
    }
  });
}

/**
 * Tausch aus der Planansicht (vor oder während des Trainings):
 * speichert den Tausch und zieht eine schon laufende Einheit dieses Tages nach,
 * sofern bei der Übung noch kein Satz abgehakt ist.
 */
export async function uebungTauschen(planDatum: string, original: string, ersatz: string, immer: boolean, db: FitnessDB = standardDb): Promise<void> {
  await ersetzungSpeichern(planDatum, original, ersatz, immer, db);
  const laufend = await db.einheiten.where('planDatum').equals(planDatum).filter((e) => e.status === 'laeuft').first();
  if (!laufend) return;
  const index = laufend.uebungen.findIndex((u) => u.planName && uebungsSchluessel(u.planName) === uebungsSchluessel(original));
  const u = laufend.uebungen[index];
  if (!u || u.saetze.some((s) => s.erledigt)) return;
  const letzte = await letzteLeistung(ersatz, laufend.id, db);
  const zurueck = uebungsSchluessel(ersatz) === uebungsSchluessel(original);
  const kg = zurueck ? (u.ziel?.gewichtKg ?? letzte?.saetze.at(-1)?.kg ?? null) : (letzte?.saetze.at(-1)?.kg ?? null);
  laufend.uebungen[index] = {
    ...u,
    name: ersatz,
    koerpergewicht: istKoerpergewichtsUebung(ersatz) || (zurueck && /körpergewicht/i.test(u.ziel?.hinweis ?? '')),
    saetze: u.saetze.map((s) => ({ ...s, kg })),
  };
  await db.einheiten.update(laufend.id, { uebungen: laufend.uebungen });
}

/** Entfernt die Regel „immer ersetzen“ für eine Übung. */
export async function regelEntfernen(original: string, db: FitnessDB = standardDb): Promise<void> {
  await db.ersetzungen.delete(ersetzungsId(null, original));
}

/** React-Hook: alle Ersetzungen, live. */
export function useErsetzungen(): Ersetzung[] {
  return useLiveQuery(() => standardDb.ersetzungen.toArray(), [], []);
}
