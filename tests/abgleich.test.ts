/**
 * End-to-End: App → Sync-Warteschlange → Apps-Script-Brücke (Sandbox) → nachgebautes Doc → zurück in die App.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { beispielDoc } from '../src/data/beispielDoc';
import { FitnessDB } from '../src/db/db';
import { markiereAusgelassen, planFuerDatum, schliesseAb, starteEinheit, testplanLaden } from '../src/db/einheiten';
import { planDatenSchreiben, planUndLogLaden } from '../src/sync/abgleich';
import { syncAusfuehren } from '../src/sync/syncQueue';
import { fuehreZusammen } from '../src/domain/verlauf';
import { baueDoc, ladeSkript, sandboxBridge, Tabelle, type FakeDoc } from './helpers/appsScriptFake';

const SCHLUESSEL = 'test-schluessel-test-schluessel-1234';
let db: FitnessDB;
let doc: FakeDoc;
let bridge: ReturnType<typeof sandboxBridge>;
let nr = 0;

function logZeilen(): string[][] {
  const t = doc.body.kinder.filter((k): k is Tabelle => k instanceof Tabelle).at(-1)!;
  return t.zeilen.map((z) => z.zellen.map((c) => c.text));
}

beforeEach(async () => {
  db = new FitnessDB(`abgleich-${nr++}`);
  doc = baueDoc(structuredClone(beispielDoc));
  bridge = sandboxBridge(ladeSkript(doc, { SCHLUESSEL }), SCHLUESSEL);
  await testplanLaden(db);
});

async function gymA(): Promise<string> {
  const plan = (await planFuerDatum('2026-11-23', db))!.plan;
  const id = await starteEinheit(plan.tage[0]!, '2026-11-23', db);
  const e = (await db.einheiten.get(id))!;
  e.uebungen.forEach((u) => u.saetze.forEach((s) => (s.erledigt = true)));
  e.uebungen[0]!.saetze[2]!.wdh = 7;
  e.uebungen[3]!.saetze.forEach((s) => (s.kg = 35)); // Beinbeuger kalibriert
  e.uebungen[5]!.saetze.forEach((s) => (s.kg = 20)); // Kabel-Crunch kalibriert
  e.uebungen[4]!.saetze.forEach((s) => (s.kg = 8)); // Seitheben „leicht“
  await db.einheiten.update(id, { uebungen: e.uebungen });
  await schliesseAb(id, { datum: '2026-11-23', gefuehl: 7, anmerkungen: 'gut geschlafen' }, db);
  return id;
}

describe('Abgleich mit dem Doc', () => {
  it('Plan laden: echter Plan ersetzt die Testdaten (aus der Tabelle, mit Hinweis)', async () => {
    const ergebnis = await planUndLogLaden(db, bridge);
    expect(ergebnis.quelle).toBe('tabelle');
    expect(ergebnis.jsonStatus).toBe('fehlt');
    const p = await planFuerDatum('2026-11-23', db);
    expect(p?.quelle).toBe('tabelle');
    expect(p?.hinweise[0]).toContain('Plan-Daten');
    expect(ergebnis.logZeilen).toBe(0); // Vorlage und leere Zeilen zählen nicht
  });

  it('Gym-Einheit und Lauf landen korrekt formatiert im Log – sonst ändert sich nichts', async () => {
    const vorher = JSON.stringify(doc.body.kinder.slice(0, -3)); // alles vor dem Log-Abschnitt
    const gymId = await gymA();
    const plan = (await planFuerDatum('2026-11-23', db))!.plan;
    const laufId = await starteEinheit(plan.tage[5]!, '2026-11-28', db);
    await db.einheiten.update(laufId, { lauf: { art: 'locker', distanzKm: 5, dauerSek: 1880 } });
    await schliesseAb(laufId, { datum: '2026-11-28', gefuehl: 5, anmerkungen: '' }, db);

    const bericht = await syncAusfuehren(db, bridge);
    expect(bericht).toEqual({ gesendet: 2, erfolgreich: 2, fehler: null });

    const log = logZeilen();
    expect(log[2]).toEqual([
      '23.11.2026',
      'Gym A – Ganzkörper',
      'Kniebeuge 3×8×57,5 kg (8/8/7); Bankdrücken 3×8×55 kg; Langhantelrudern 3×10×50 kg; Beinbeuger (Maschine) 3×12×35 kg; Seitheben KH 3×15×8 kg; Kabel-Crunch 3×12×20 kg',
      '7',
      `gut geschlafen [app:${gymId}]`,
    ]);
    expect(log[3]).toEqual(['28.11.2026', 'Lauf – locker', '5 km, 31:20, 6:16/km (locker)', '5', `[app:${laufId}]`]);
    expect(log[1]![0]).toBe('*Vorlage: 23.11.*');
    expect(JSON.stringify(doc.body.kinder.slice(0, -3))).toBe(vorher);

    // Doppelter Sync schreibt nichts doppelt
    await db.syncQueue.add({ einheitId: gymId, aktion: 'anhaengen', erstelltAm: '', versuche: 0, letzterFehler: null });
    await syncAusfuehren(db, bridge);
    expect(logZeilen().filter((z) => z[4]!.includes(`[app:${gymId}]`))).toHaveLength(1);
  });

  it('Verlauf: geladene Log-Zeilen und lokale Einheiten ergeben keine Doppelten', async () => {
    await gymA();
    await syncAusfuehren(db, bridge);
    // eine eigene, frei formulierte Zeile im Doc
    const t = doc.body.kinder.filter((k): k is Tabelle => k instanceof Tabelle).at(-1)!;
    t.zeilen[3]!.zellen[0]!.text = '20.11.';
    t.zeilen[3]!.zellen[2]!.text = 'Kniebeuge 3x8 55kg';
    t.zeilen[3]!.zellen[3]!.text = '6';

    const ergebnis = await planUndLogLaden(db, bridge);
    expect(ergebnis.logZeilen).toBe(2);
    const eintraege = fuehreZusammen(await db.einheiten.toArray(), await db.logImport.toArray(), 2026);
    expect(eintraege.map((e) => [e.datum, e.quelle])).toEqual([
      ['2026-11-20', 'import'],
      ['2026-11-23', 'app'],
    ]);
  });

  it('Nachkontrolle: fehlt eine schon gesendete Zeile im Doc, wird die Einheit markiert', async () => {
    const id = await gymA();
    await syncAusfuehren(db, bridge);
    // Zeile im Doc „verschwindet“ (z. B. vom Coach beim Umschreiben verloren)
    const t = doc.body.kinder.filter((k): k is Tabelle => k instanceof Tabelle).at(-1)!;
    t.zeilen[2]!.zellen.forEach((z) => (z.text = ''));
    await new Promise((r) => setTimeout(r, 5)); // Lesezeitpunkt nach dem Sync
    const ergebnis = await planUndLogLaden(db, bridge);
    expect(ergebnis.vermisst).toEqual([id]);
    expect((await db.einheiten.get(id))!.sync).toBe('fehler');
  });

  it('ausgelassene Einheit: „ausgelassen“, Gefühl „–“, Grund in den Anmerkungen', async () => {
    const plan = (await planFuerDatum('2026-11-23', db))!.plan;
    const id = await markiereAusgelassen(plan.tage[2]!, { datum: '2026-11-25', grund: 'erkältet', anmerkungen: '' }, db);
    await syncAusfuehren(db, bridge);
    expect(logZeilen()[2]).toEqual(['25.11.2026', 'Gym B – Ganzkörper', 'ausgelassen', '–', `erkältet [app:${id}]`]);
  });

  it('Plan-Daten einmalig schreiben: danach kommt der Plan aus dem JSON', async () => {
    await planUndLogLaden(db, bridge);
    const plan = (await planFuerDatum('2026-11-23', db))!.plan;
    const ergebnis = await planDatenSchreiben(db, bridge, plan);
    expect(ergebnis.quelle).toBe('json');
    expect(ergebnis.jsonStatus).toBe('ok');
    expect((await planFuerDatum('2026-11-23', db))!.plan).toEqual(plan);
    await expect(planDatenSchreiben(db, bridge, plan)).rejects.toThrow('schon Plan-Daten');
  });
});
