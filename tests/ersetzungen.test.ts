import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { FitnessDB } from '../src/db/db';
import { planFuerDatum, schliesseAb, starteEinheit, testplanLaden } from '../src/db/einheiten';
import { ersetzungSpeichern, regelEntfernen, uebungTauschen } from '../src/db/ersetzungen';
import { ersetzungFuer, ersetzungsId, uebungenMitErsetzungen, type Ersetzung } from '../src/domain/ersetzungen';
import { erzeugeLogZeile } from '../src/domain/logFormat';

const regel = (original: string, ersatz: string): Ersetzung => ({ id: ersetzungsId(null, original), planDatum: null, original, ersatz });
const tagTausch = (planDatum: string, original: string, ersatz: string): Ersetzung => ({ id: ersetzungsId(planDatum, original), planDatum, original, ersatz });

describe('Ersetzungen (Logik)', () => {
  it('Tages-Tausch gilt nur an dem Tag', () => {
    const liste = [tagTausch('2026-11-25', 'Bulgarian Split Squat', 'Ausfallschritte')];
    expect(ersetzungFuer(liste, '2026-11-25', 'Bulgarian Split Squat')?.ersatz).toBe('Ausfallschritte');
    expect(ersetzungFuer(liste, '2026-12-02', 'Bulgarian Split Squat')).toBeNull();
  });
  it('Regel „immer“ gilt überall, Tages-Eintrag geht vor', () => {
    const liste = [regel('Bulgarian Split Squat', 'Ausfallschritte'), tagTausch('2026-11-25', 'Bulgarian Split Squat', 'Step-ups')];
    expect(ersetzungFuer(liste, '2026-12-02', 'bulgarian split squat')?.ersatz).toBe('Ausfallschritte');
    expect(ersetzungFuer(liste, '2026-11-25', 'Bulgarian Split Squat')?.ersatz).toBe('Step-ups');
  });
  it('Tages-Eintrag mit dem Original hebt die Regel für diesen Tag auf', () => {
    const liste = [regel('Klimmzüge', 'Latzug'), tagTausch('2026-11-25', 'Klimmzüge', 'Klimmzüge')];
    expect(ersetzungFuer(liste, '2026-11-25', 'Klimmzüge')).toBeNull();
    expect(ersetzungFuer(liste, '2026-11-26', 'Klimmzüge')?.ersatz).toBe('Latzug');
  });
});

describe('Ersetzungen (App)', () => {
  let db: FitnessDB;
  let nr = 0;
  beforeEach(async () => {
    db = new FitnessDB(`ersetzungen-${nr++}`);
    await testplanLaden(db);
  });

  it('getauschte Übung wird beim Start übernommen – ohne das Zielgewicht des Plans', async () => {
    const gymB = (await planFuerDatum('2026-11-25', db))!.plan.tage[2]!;
    await ersetzungSpeichern('2026-11-25', 'Klimmzüge', 'Latzug', false, db);
    const angezeigt = uebungenMitErsetzungen(gymB, await db.ersetzungen.toArray());
    expect(angezeigt[2]).toMatchObject({ name: 'Latzug', original: { name: 'Klimmzüge' } });

    const id = await starteEinheit(gymB, '2026-11-25', db);
    const u = (await db.einheiten.get(id))!.uebungen[2]!;
    expect(u).toMatchObject({ name: 'Latzug', planName: 'Klimmzüge', koerpergewicht: false });
    expect(u.saetze[0]).toEqual({ kg: null, wdh: 6, erledigt: false });
  });

  it('Regel „immer“ greift auch in anderen Wochen, und lässt sich entfernen', async () => {
    const gymA = (await planFuerDatum('2026-11-23', db))!.plan.tage[0]!;
    await ersetzungSpeichern('2026-11-23', 'Kniebeuge', 'Beinpresse', true, db);
    const naechsteWoche = { ...gymA, datum: '2026-11-30' };
    expect(uebungenMitErsetzungen(naechsteWoche, await db.ersetzungen.toArray())[0]!.name).toBe('Beinpresse');
    await regelEntfernen('Kniebeuge', db);
    expect(uebungenMitErsetzungen(naechsteWoche, await db.ersetzungen.toArray())[0]!.name).toBe('Kniebeuge');
  });

  it('Tausch während eine Einheit läuft: Übung wird nachgezogen, solange kein Satz abgehakt ist', async () => {
    const gymB = (await planFuerDatum('2026-11-25', db))!.plan.tage[2]!;
    const id = await starteEinheit(gymB, '2026-11-25', db);
    await uebungTauschen('2026-11-25', 'Bulgarian Split Squat', 'Ausfallschritte', false, db);
    expect((await db.einheiten.get(id))!.uebungen[3]!.name).toBe('Ausfallschritte');

    // Satz abgehakt → kein Nachziehen mehr
    const e = (await db.einheiten.get(id))!;
    e.uebungen[3]!.saetze[0]!.erledigt = true;
    await db.einheiten.update(id, { uebungen: e.uebungen });
    await uebungTauschen('2026-11-25', 'Bulgarian Split Squat', 'Step-ups', false, db);
    expect((await db.einheiten.get(id))!.uebungen[3]!.name).toBe('Ausfallschritte');
  });

  it('im Log steht „getauscht: Original → Ersatz“', async () => {
    const gymB = (await planFuerDatum('2026-11-25', db))!.plan.tage[2]!;
    await ersetzungSpeichern('2026-11-25', 'Bulgarian Split Squat', 'Ausfallschritte', false, db);
    const id = await starteEinheit(gymB, '2026-11-25', db);
    const e = (await db.einheiten.get(id))!;
    e.uebungen[3]!.saetze.forEach((s) => {
      s.kg = 12.5;
      s.erledigt = true;
    });
    await db.einheiten.update(id, { uebungen: e.uebungen });
    await schliesseAb(id, { datum: '2026-11-25', gefuehl: 7, anmerkungen: '' }, db);
    const zeile = erzeugeLogZeile((await db.einheiten.get(id))!);
    expect(zeile.wasGemacht).toBe('Ausfallschritte 3×10 je Bein×12,5 kg');
    expect(zeile.anmerkungen).toContain('getauscht: Bulgarian Split Squat → Ausfallschritte');
  });
});
