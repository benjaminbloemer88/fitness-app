/**
 * Abgleich mit dem Doc (ohne Oberfläche, gut testbar):
 * - Plan laden (JSON, sonst Tabelle) und lokal speichern
 * - Log-Zeilen für den Verlauf übernehmen (tolerant geparst)
 * - Nachkontrolle: fehlen Zeilen, die die App schon geschrieben hatte?
 * - Plan-Daten einmalig ins Doc schreiben
 */
import type { FitnessDB } from '../db/db';
import { plusTage } from '../domain/dates';
import { findeLogTabelle, type DocSnapshot } from '../domain/docSnapshot';
import { parseLogZeile, type GeparsteLogZeile } from '../domain/logParse';
import { planAusSnapshot, type PlanLadeErgebnis } from '../domain/planLaden';
import { planAlsJson, type Plan } from '../domain/planSchema';
import type { LogBridge } from './syncQueue';

/** Alles, was der Abgleich von der Brücke braucht. */
export interface DocBridge extends LogBridge {
  lesen(): Promise<DocSnapshot>;
  planDatenAnlegen(json: string): Promise<void>;
}

export interface AbgleichErgebnis extends PlanLadeErgebnis {
  /** Anzahl übernommener Log-Zeilen (für den Verlauf). */
  logZeilen: number;
  /** IDs von Einheiten, die als synchronisiert gelten, aber nicht mehr im Doc stehen. */
  vermisst: string[];
}

/**
 * Liest eine Log-Zeile. Fehlt im Datum das Jahr, nehmen wir das aktuelle –
 * liegt das Ergebnis dann deutlich in der Zukunft (z. B. „28.12.“ im Januar), das Vorjahr.
 */
function leseZeile(zellen: string[], heute: string): GeparsteLogZeile | null {
  const jahr = Number(heute.slice(0, 4));
  const z = parseLogZeile(zellen, jahr);
  if (z?.datum && z.datum > plusTage(heute, 7)) return parseLogZeile(zellen, jahr - 1);
  return z;
}

/** Übernimmt alle Log-Zeilen in die lokale Tabelle „logImport“ und prüft die eigenen Zeilen. */
export async function logUebernehmen(db: FitnessDB, doc: DocSnapshot, leseStart: string): Promise<{ logZeilen: number; vermisst: string[] }> {
  const heute = leseStart.slice(0, 10);
  const tabelle = findeLogTabelle(doc) ?? [];
  const zeilen = tabelle
    .slice(1)
    .map((zellen) => ({ zellen, geparst: leseZeile(zellen, heute) }))
    .filter((z): z is { zellen: string[]; geparst: GeparsteLogZeile } => z.geparst !== null);
  const idsImDoc = new Set(zeilen.map((z) => z.geparst.appId).filter((id): id is string => id !== null));
  const vermisst: string[] = [];

  await db.transaction('rw', db.logImport, db.einheiten, async () => {
    await db.logImport.clear();
    await db.logImport.bulkAdd(zeilen.map((z) => ({ datum: z.geparst.datum, zellen: z.zellen, appId: z.geparst.appId, importiertAm: leseStart })));

    // Nachkontrolle: nur Einheiten prüfen, die VOR dem Lesen synchronisiert wurden.
    const synchron = await db.einheiten.where('sync').equals('synchronisiert').toArray();
    for (const e of synchron) {
      if (idsImDoc.has(e.id) || (e.synchronisiertAm ?? '') >= leseStart) continue;
      vermisst.push(e.id);
      await db.einheiten.update(e.id, {
        sync: 'fehler',
        syncFehler: 'Die Zeile steht nicht mehr im Doc. Mit „Erneut senden“ wird sie wieder angehängt.',
      });
    }
  });
  return { logZeilen: zeilen.length, vermisst };
}

/** Plan und Log aus dem Doc laden. */
export async function planUndLogLaden(db: FitnessDB, bridge: DocBridge): Promise<AbgleichErgebnis> {
  const leseStart = new Date().toISOString();
  const doc = await bridge.lesen();
  const ergebnis = planAusSnapshot(doc);
  if (ergebnis.plan && ergebnis.quelle) {
    await db.plaene.put({
      wocheVon: ergebnis.plan.woche_von,
      plan: ergebnis.plan,
      quelle: ergebnis.quelle,
      geladenAm: leseStart,
      hinweise: ergebnis.hinweise,
      jsonStatus: ergebnis.jsonStatus,
    });
  }
  const log = await logUebernehmen(db, doc, leseStart);
  return { ...ergebnis, ...log };
}

/** Plan-Daten (JSON) einmalig ins Doc schreiben und danach neu laden. */
export async function planDatenSchreiben(db: FitnessDB, bridge: DocBridge, plan: Plan): Promise<AbgleichErgebnis> {
  await bridge.planDatenAnlegen(planAlsJson(plan));
  return planUndLogLaden(db, bridge);
}
