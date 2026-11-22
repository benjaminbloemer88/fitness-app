import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { FitnessDB } from '../src/db/db';
import { markiereAusgelassen, planFuerDatum, schliesseAb, starteEinheit, testplanLaden } from '../src/db/einheiten';
import { einreihen, offeneAuftraege, syncAusfuehren, type LogBridge } from '../src/sync/syncQueue';

/** Attrappe der Brücke: merkt sich die Zeilen wie die Log-Tabelle im Doc. */
class BridgeAttrappe implements LogBridge {
  zeilen: { id: string; zellen: string[] }[] = [];
  fehler: Error | null = null;
  async anhaengen(neu: { id: string; zellen: string[] }[]) {
    if (this.fehler) throw this.fehler;
    const angehaengt: string[] = [];
    const schonVorhanden: string[] = [];
    for (const z of neu) {
      if (this.zeilen.some((x) => x.id === z.id)) schonVorhanden.push(z.id);
      else {
        this.zeilen.push(z);
        angehaengt.push(z.id);
      }
    }
    return { angehaengt, schonVorhanden };
  }
  async korrigieren(id: string, zellen: string[]) {
    const z = this.zeilen.find((x) => x.id === id);
    if (z) z.zellen = zellen;
    return { korrigiert: !!z };
  }
}

let db: FitnessDB;
let zaehler = 0;

beforeEach(async () => {
  db = new FitnessDB(`test-${zaehler++}`);
  await testplanLaden(db);
});

async function gymAErledigt(): Promise<string> {
  const plan = (await planFuerDatum('2026-11-23', db))!.plan;
  const id = await starteEinheit(plan.tage[0]!, '2026-11-23', db);
  const e = (await db.einheiten.get(id))!;
  // Kniebeuge: alle Sätze abhaken, letzter Satz nur 7 Wdh.
  const kniebeuge = e.uebungen[0]!;
  kniebeuge.saetze.forEach((s) => (s.erledigt = true));
  kniebeuge.saetze[2]!.wdh = 7;
  await db.einheiten.update(id, { uebungen: e.uebungen });
  await schliesseAb(id, { datum: '2026-11-23', gefuehl: 7, anmerkungen: 'gut geschlafen' }, db);
  return id;
}

describe('Sync-Warteschlange', () => {
  it('Testplan wird beim ersten Start geladen', async () => {
    const p = await planFuerDatum('2026-11-25', db);
    expect(p?.quelle).toBe('testdaten');
    expect(p?.plan.tage[0]!.titel).toBe('Gym A – Ganzkörper');
  });

  it('abgeschlossene Einheit landet einmal in der Warteschlange', async () => {
    const id = await gymAErledigt();
    await einreihen(db, id); // doppelt einreihen schadet nicht
    expect(await offeneAuftraege(db)).toBe(1);
    expect((await db.einheiten.get(id))!.sync).toBe('wartet');
  });

  it('Sync schreibt die Zeile im Coach-Format und leert die Warteschlange', async () => {
    const id = await gymAErledigt();
    const bridge = new BridgeAttrappe();
    const bericht = await syncAusfuehren(db, bridge);
    expect(bericht).toEqual({ gesendet: 1, erfolgreich: 1, fehler: null });
    expect(bridge.zeilen[0]!.zellen).toEqual([
      '23.11.2026',
      'Gym A – Ganzkörper',
      'Kniebeuge 3×8×57,5 kg (8/8/7)',
      '7',
      `gut geschlafen; ausgelassen: Bankdrücken, Langhantelrudern, Beinbeuger (Maschine), Seitheben KH, Kabel-Crunch [app:${id}]`,
    ]);
    expect(await offeneAuftraege(db)).toBe(0);
    expect((await db.einheiten.get(id))!.sync).toBe('synchronisiert');
  });

  it('keine Doppelten: schon vorhandene Kennung gilt als erledigt', async () => {
    const id = await gymAErledigt();
    const bridge = new BridgeAttrappe();
    bridge.zeilen.push({ id, zellen: ['alt'] }); // z. B. abgebrochener Sync – Zeile ist schon im Doc
    const bericht = await syncAusfuehren(db, bridge);
    expect(bericht.erfolgreich).toBe(1);
    expect(bridge.zeilen).toHaveLength(1);
    expect(await offeneAuftraege(db)).toBe(0);
  });

  it('bei Fehler bleibt der Auftrag erhalten und wird später nachgeholt', async () => {
    const id = await gymAErledigt();
    const bridge = new BridgeAttrappe();
    bridge.fehler = new Error('offline');
    const bericht = await syncAusfuehren(db, bridge);
    expect(bericht.fehler).toBe('offline');
    expect(await offeneAuftraege(db)).toBe(1);
    expect((await db.einheiten.get(id))!).toMatchObject({ sync: 'fehler', syncFehler: 'offline' });
    expect((await db.syncQueue.toArray())[0]!.versuche).toBe(1);

    bridge.fehler = null;
    const zweiter = await syncAusfuehren(db, bridge);
    expect(zweiter.erfolgreich).toBe(1);
    expect(bridge.zeilen).toHaveLength(1);
  });

  it('mehrere Einheiten in Reihenfolge, inkl. ausgelassen', async () => {
    const plan = (await planFuerDatum('2026-11-23', db))!.plan;
    await gymAErledigt();
    await markiereAusgelassen(plan.tage[2]!, { datum: '2026-11-25', grund: 'erkältet', anmerkungen: '' }, db);
    const bridge = new BridgeAttrappe();
    await syncAusfuehren(db, bridge);
    expect(bridge.zeilen.map((z) => z.zellen[2])).toEqual(['Kniebeuge 3×8×57,5 kg (8/8/7)', 'ausgelassen']);
    expect(bridge.zeilen[1]!.zellen[3]).toBe('–');
    expect(bridge.zeilen[1]!.zellen[4]).toMatch(/^erkältet \[app:[a-z0-9]{4}\]$/);
  });

  it('Änderung an einer synchronisierten Einheit wird als Korrektur gesendet', async () => {
    const id = await gymAErledigt();
    const bridge = new BridgeAttrappe();
    await syncAusfuehren(db, bridge);
    await schliesseAb(id, { datum: '2026-11-23', gefuehl: 8, anmerkungen: 'gut geschlafen' }, db);
    expect((await db.syncQueue.toArray())[0]!.aktion).toBe('korrigieren');
    await syncAusfuehren(db, bridge);
    expect(bridge.zeilen).toHaveLength(1);
    expect(bridge.zeilen[0]!.zellen[3]).toBe('8');
  });

  it('„Letztes Mal“ wird beim nächsten Start vorbelegt', async () => {
    await gymAErledigt();
    const plan = (await planFuerDatum('2026-11-23', db))!.plan;
    // Gym C enthält Bankdrücken mit 50 kg Ziel – Kniebeuge kommt dort nicht vor, also neuer Plantag mit Kniebeuge simulieren:
    const tag = { ...plan.tage[0]!, datum: '2026-11-30' };
    const id = await starteEinheit(tag, '2026-11-30', db);
    const e = (await db.einheiten.get(id))!;
    expect(e.uebungen[0]!.saetze[0]!.kg).toBe(57.5); // Zielgewicht aus dem Plan hat Vorrang
    expect(e.uebungen[3]!.saetze[0]!.kg).toBeNull(); // „kalibrieren“ bleibt leer
  });
});
