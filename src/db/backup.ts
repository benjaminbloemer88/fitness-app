/**
 * Backup: alle lokalen Daten als JSON exportieren und wieder importieren.
 */
import { z } from 'zod';
import type { FitnessDB } from './db';

const BackupSchema = z.object({
  app: z.literal('fitness-pwa'),
  version: z.literal(1),
  exportiertAm: z.string(),
  daten: z.object({
    plaene: z.array(z.any()),
    einheiten: z.array(z.any()),
    syncQueue: z.array(z.any()),
    einstellungen: z.array(z.any()),
    logImport: z.array(z.any()).default([]),
    koerpergewicht: z.array(z.any()).default([]),
    protein: z.array(z.any()).default([]),
  }),
});

export type Backup = z.infer<typeof BackupSchema>;

export async function erstelleBackup(db: FitnessDB): Promise<Backup> {
  return {
    app: 'fitness-pwa',
    version: 1,
    exportiertAm: new Date().toISOString(),
    daten: {
      plaene: await db.plaene.toArray(),
      einheiten: await db.einheiten.toArray(),
      syncQueue: await db.syncQueue.toArray(),
      einstellungen: await db.einstellungen.toArray(),
      logImport: await db.logImport.toArray(),
      koerpergewicht: await db.koerpergewicht.toArray(),
      protein: await db.protein.toArray(),
    },
  };
}

/** Prüft eine Backup-Datei. Wirft einen verständlichen Fehler, wenn sie nicht passt. */
export function pruefeBackup(roh: unknown): Backup {
  const ergebnis = BackupSchema.safeParse(roh);
  if (!ergebnis.success) throw new Error('Das ist keine gültige Backup-Datei dieser App.');
  return ergebnis.data;
}

/** Ersetzt ALLE lokalen Daten durch das Backup. */
export async function spieleBackupEin(db: FitnessDB, backup: Backup): Promise<void> {
  const d = backup.daten;
  await db.transaction('rw', [db.plaene, db.einheiten, db.syncQueue, db.einstellungen, db.logImport, db.koerpergewicht, db.protein], async () => {
    await Promise.all([
      db.plaene.clear(),
      db.einheiten.clear(),
      db.syncQueue.clear(),
      db.einstellungen.clear(),
      db.logImport.clear(),
      db.koerpergewicht.clear(),
      db.protein.clear(),
    ]);
    await db.plaene.bulkPut(d.plaene);
    await db.einheiten.bulkPut(d.einheiten);
    await db.syncQueue.bulkPut(d.syncQueue);
    await db.einstellungen.bulkPut(d.einstellungen);
    await db.logImport.bulkPut(d.logImport);
    await db.koerpergewicht.bulkPut(d.koerpergewicht);
    await db.protein.bulkPut(d.protein);
  });
}

/** Löscht alle lokalen Daten (außer den Einstellungen, wenn gewünscht). */
export async function loescheAlles(db: FitnessDB, einstellungenBehalten = true): Promise<void> {
  await db.transaction('rw', [db.plaene, db.einheiten, db.syncQueue, db.einstellungen, db.logImport, db.koerpergewicht, db.protein], async () => {
    await Promise.all([db.plaene.clear(), db.einheiten.clear(), db.syncQueue.clear(), db.logImport.clear(), db.koerpergewicht.clear(), db.protein.clear()]);
    if (!einstellungenBehalten) await db.einstellungen.clear();
  });
}
