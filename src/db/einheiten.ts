/**
 * Alles rund ums Anlegen, Speichern und Abfragen von Einheiten und Plänen.
 */
import { beispielDoc } from '../data/beispielDoc';
import { montagDerWoche } from '../domain/dates';
import {
  neueAppId,
  uebungsSchluessel,
  zerlegeWdh,
  type Einheit,
  type SatzErgebnis,
  type UebungErgebnis,
} from '../domain/einheit';
import { ersetzungFuer } from '../domain/ersetzungen';
import { formatUebung } from '../domain/logFormat';
import { istKoerpergewichtsUebung } from '../domain/uebungsKatalog';
import { planAusSnapshot } from '../domain/planLaden';
import type { Plan, PlanTag, Uebung } from '../domain/planSchema';
import { einreihen } from '../sync/syncQueue';
import { db as standardDb, type FitnessDB, type GespeicherterPlan } from './db';

const jetzt = () => new Date().toISOString();

// ───────────────────────── Pläne ─────────────────────────

/** Plan der Woche, in der das Datum liegt. */
export async function planFuerDatum(iso: string, db: FitnessDB = standardDb): Promise<GespeicherterPlan | undefined> {
  return db.plaene.get(montagDerWoche(iso));
}

/** Neuester gespeicherter Plan (falls die aktuelle Woche noch keinen hat). */
export async function neuesterPlan(db: FitnessDB = standardDb): Promise<GespeicherterPlan | undefined> {
  return db.plaene.orderBy('wocheVon').last();
}

export function planTag(plan: Plan, iso: string): PlanTag | undefined {
  return plan.tage.find((t) => t.datum === iso);
}

/** Speichert einen Plan (überschreibt dieselbe Woche). */
export async function speicherePlan(eintrag: GespeicherterPlan, db: FitnessDB = standardDb): Promise<void> {
  await db.plaene.put(eintrag);
}

/**
 * Lädt beim allerersten Start den Testplan (23.–29.11.2026) aus dem Doc-Auszug,
 * damit die App sofort ohne Google-Verbindung nutzbar ist.
 */
export async function testplanLaden(db: FitnessDB = standardDb, erzwingen = false): Promise<void> {
  if (!erzwingen && (await db.plaene.count()) > 0) return;
  const ergebnis = planAusSnapshot(beispielDoc);
  if (!ergebnis.plan) return;
  await speicherePlan(
    {
      wocheVon: ergebnis.plan.woche_von,
      plan: ergebnis.plan,
      quelle: 'testdaten',
      geladenAm: jetzt(),
      hinweise: ['Testdaten aus dem Doc-Stand vom 22.11.2026 – die App ist noch nicht mit dem Doc verbunden.'],
      jsonStatus: ergebnis.jsonStatus,
    },
    db,
  );
}

// ───────────────────────── Letzte Werte ─────────────────────────

export interface LetzteLeistung {
  datum: string;
  text: string;
  saetze: SatzErgebnis[];
}

/** Letzte abgeschlossene Leistung einer Übung (vor einem Datum, ohne die aktuelle Einheit). */
export async function letzteLeistung(
  name: string,
  ausser: string | null = null,
  db: FitnessDB = standardDb,
): Promise<LetzteLeistung | null> {
  const schluessel = uebungsSchluessel(name);
  const fertige = await db.einheiten.where('status').equals('abgeschlossen').reverse().sortBy('datum');
  for (const e of fertige) {
    if (e.id === ausser) continue;
    const u = e.uebungen.find((x) => uebungsSchluessel(x.name) === schluessel);
    const text = u ? formatUebung(u) : null;
    if (u && text) {
      return { datum: e.datum, text: text.slice(u.name.trim().length + 1), saetze: u.saetze.filter((s) => s.erledigt) };
    }
  }
  return null;
}

// ───────────────────────── Einheiten anlegen ─────────────────────────

/** Sätze für eine Planübung vorbelegen: Zielgewicht, sonst (außer bei „kalibrieren“) das letzte Gewicht. */
export function saetzeVorbelegen(u: Uebung, letzte: LetzteLeistung | null, ersetzt = false): SatzErgebnis[] {
  const { zahl } = zerlegeWdh(u.wdh);
  const kalibrieren = /kalibrieren/i.test(u.hinweis ?? '');
  const letztesGewicht = letzte?.saetze.at(-1)?.kg ?? null;
  // Bei einer getauschten Übung passt das Zielgewicht des Plans nicht – dann das letzte eigene Gewicht.
  const kg = ersetzt ? letztesGewicht : (u.gewicht_kg ?? (kalibrieren ? null : letztesGewicht));
  return Array.from({ length: u.saetze }, () => ({ kg, wdh: zahl, erledigt: false }));
}

export function istKoerpergewicht(u: Uebung): boolean {
  return /körpergewicht/i.test(u.hinweis ?? '');
}

export async function vergebeneIds(db: FitnessDB = standardDb): Promise<Set<string>> {
  return new Set((await db.einheiten.toCollection().primaryKeys()) as string[]);
}

/**
 * Startet (oder öffnet) die Einheit zu einem Plantag.
 * Läuft für den Tag schon eine Einheit, wird diese zurückgegeben.
 */
export async function starteEinheit(tag: PlanTag, datum: string, db: FitnessDB = standardDb): Promise<string> {
  const laufend = await db.einheiten.where('planDatum').equals(tag.datum).filter((e) => e.status === 'laeuft').first();
  if (laufend) return laufend.id;

  // Getauschte Übungen (Tages-Tausch oder Regel „immer“) gleich berücksichtigen
  const ersetzungen = await db.ersetzungen.toArray();
  const uebungen: UebungErgebnis[] = [];
  for (const u of tag.uebungen) {
    const ersetzung = ersetzungFuer(ersetzungen, tag.datum, u.name);
    const name = ersetzung?.ersatz ?? u.name;
    const letzte = await letzteLeistung(name, null, db);
    uebungen.push({
      name,
      planName: u.name,
      ziel: { saetze: u.saetze, wdh: u.wdh, gewichtKg: u.gewicht_kg, hinweis: u.hinweis },
      koerpergewicht: ersetzung ? istKoerpergewichtsUebung(name) : istKoerpergewicht(u),
      saetze: saetzeVorbelegen(u, letzte, ersetzung !== null),
    });
  }

  const einheit: Einheit = {
    id: neueAppId(await vergebeneIds(db)),
    datum,
    planDatum: tag.datum,
    titel: tag.titel,
    typ: tag.typ === 'lauf' ? 'lauf' : 'gym',
    status: 'laeuft',
    uebungen,
    lauf: tag.typ === 'lauf' ? { art: tag.lauf?.art ?? 'locker', distanzKm: tag.lauf?.distanz_km ?? null, dauerSek: null } : null,
    gefuehl: null,
    anmerkungen: '',
    grund: null,
    gestartetAm: jetzt(),
    abgeschlossenAm: null,
    sync: null,
    syncFehler: null,
    logZeile: null,
  };
  await db.einheiten.add(einheit);
  return einheit.id;
}

/** Freie Einheit ohne Plantag (z. B. Extra-Lauf). */
export async function starteFreieEinheit(typ: 'gym' | 'lauf', titel: string, datum: string, db: FitnessDB = standardDb): Promise<string> {
  const einheit: Einheit = {
    id: neueAppId(await vergebeneIds(db)),
    datum,
    planDatum: null,
    titel,
    typ,
    status: 'laeuft',
    uebungen: [],
    lauf: typ === 'lauf' ? { art: 'locker', distanzKm: null, dauerSek: null } : null,
    gefuehl: null,
    anmerkungen: '',
    grund: null,
    gestartetAm: jetzt(),
    abgeschlossenAm: null,
    sync: null,
    syncFehler: null,
    logZeile: null,
  };
  await db.einheiten.add(einheit);
  return einheit.id;
}

/** Speichert Änderungen während des Trainings (wird bei jeder Eingabe aufgerufen). */
export async function aktualisiereEinheit(id: string, teil: Partial<Einheit>, db: FitnessDB = standardDb): Promise<void> {
  await db.einheiten.update(id, teil);
}

/** Abschließen: lokal speichern, dann in die Sync-Warteschlange. */
export async function schliesseAb(
  id: string,
  werte: { datum: string; gefuehl: number; anmerkungen: string },
  db: FitnessDB = standardDb,
): Promise<void> {
  const vorher = await db.einheiten.get(id);
  if (!vorher) throw new Error('Einheit nicht gefunden');
  await db.einheiten.update(id, { ...werte, status: 'abgeschlossen', abgeschlossenAm: jetzt() });
  // War die Einheit schon im Doc, wird die Zeile korrigiert statt neu angehängt.
  await einreihen(db, id, vorher.sync === 'synchronisiert' ? 'korrigieren' : 'anhaengen');
}

/** Einheit als ausgelassen speichern (mit Grund) und einreihen. */
export async function markiereAusgelassen(
  tag: PlanTag,
  werte: { datum: string; grund: string; anmerkungen: string },
  db: FitnessDB = standardDb,
): Promise<string> {
  const laufend = await db.einheiten.where('planDatum').equals(tag.datum).filter((e) => e.status === 'laeuft').first();
  const id = laufend?.id ?? neueAppId(await vergebeneIds(db));
  const einheit: Einheit = {
    id,
    datum: werte.datum,
    planDatum: tag.datum,
    titel: tag.titel,
    typ: tag.typ === 'lauf' ? 'lauf' : 'gym',
    status: 'ausgelassen',
    uebungen: [],
    lauf: null,
    gefuehl: null,
    anmerkungen: werte.anmerkungen,
    grund: werte.grund,
    gestartetAm: laufend?.gestartetAm ?? jetzt(),
    abgeschlossenAm: jetzt(),
    sync: null,
    syncFehler: null,
    logZeile: null,
  };
  await db.einheiten.put(einheit);
  await einreihen(db, id);
  return id;
}

/** Löscht eine Einheit, die noch nicht im Doc steht. */
export async function loescheEinheit(id: string, db: FitnessDB = standardDb): Promise<void> {
  const e = await db.einheiten.get(id);
  if (e?.sync === 'synchronisiert') throw new Error('Diese Einheit steht schon im Doc und wird dort nicht gelöscht.');
  await db.transaction('rw', db.einheiten, db.syncQueue, async () => {
    await db.syncQueue.where('einheitId').equals(id).delete();
    await db.einheiten.delete(id);
  });
}

/** Alle Einheiten zu einem Plantag (für den Status in der Wochenansicht). */
export async function einheitenZumTag(planDatum: string, db: FitnessDB = standardDb): Promise<Einheit[]> {
  return db.einheiten.where('planDatum').equals(planDatum).toArray();
}
