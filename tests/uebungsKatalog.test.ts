import { describe, expect, it } from 'vitest';
import { beispielDoc } from '../src/data/beispielDoc';
import { planAusSnapshot } from '../src/domain/planLaden';
import { alternativen, bildUrls, findeUebungsInfo, GRUPPEN, istKoerpergewichtsUebung, UEBUNGEN } from '../src/domain/uebungsKatalog';

describe('Übungskatalog', () => {
  it('findet jede Übung aus dem aktuellen Plan', () => {
    const namen = planAusSnapshot(beispielDoc).plan!.tage.flatMap((t) => t.uebungen.map((u) => u.name));
    const fehlend = namen.filter((n) => !findeUebungsInfo(n));
    expect(fehlend).toEqual([]);
  });

  it('ordnet Schreibweisen der richtigen Übung zu', () => {
    expect(findeUebungsInfo('Beinbeuger (Maschine)')?.name).toBe('Beinbeuger');
    expect(findeUebungsInfo('Seitheben KH')?.name).toBe('Seitheben');
    expect(findeUebungsInfo('Schrägbankdrücken KH')?.name).toBe('Schrägbankdrücken KH');
    expect(findeUebungsInfo('Bankdrücken')?.name).toBe('Bankdrücken');
    expect(findeUebungsInfo('Kurzhantel-Bankdrücken')?.name).toBe('Bankdrücken KH');
    expect(findeUebungsInfo('LH-Rudern')?.name).toBe('Langhantelrudern');
    expect(findeUebungsInfo('Rumänisches Kreuzheben')?.name).toBe('Rumänisches Kreuzheben');
    expect(findeUebungsInfo('Kreuzheben')?.name).toBe('Kreuzheben');
    expect(findeUebungsInfo('Kniebeuge mit Pause')?.name).toBe('Kniebeuge');
    expect(findeUebungsInfo('Bizeps-Curls')?.name).toBe('Bizeps-Curls');
    expect(findeUebungsInfo('Trizeps-Pushdowns')?.name).toBe('Trizeps-Pushdowns');
  });

  it('jede Übung hat Bewegungsgruppen, jede Planübung hat Alternativen', () => {
    expect(UEBUNGEN.filter((u) => !GRUPPEN[u.name]?.length).map((u) => u.name)).toEqual([]);
    expect(Object.keys(GRUPPEN).filter((n) => !UEBUNGEN.some((u) => u.name === n))).toEqual([]);
    const plan = planAusSnapshot(beispielDoc).plan!.tage.flatMap((t) => t.uebungen.map((u) => u.name));
    // Wadenheben ist die einzige Wadenübung im Katalog
    expect(plan.filter((n) => n !== 'Wadenheben' && alternativen(n).length === 0)).toEqual([]);
  });

  it('schlägt sinnvolle Alternativen vor – beste zuerst', () => {
    const namen = (n: string) => alternativen(n).map((u) => u.name);
    expect(namen('Bulgarian Split Squat').slice(0, 2)).toEqual(['Ausfallschritte', 'Step-ups']);
    expect(namen('Kniebeuge').slice(0, 3)).toEqual(['Frontkniebeuge', 'Goblet Squat', 'Beinpresse']);
    expect(namen('Klimmzüge')).toEqual(['Latzug']);
    expect(namen('Langhantelrudern')).toEqual(['Kurzhantelrudern', 'Kabelrudern']);
    expect(namen('Bankdrücken')[0]).toBe('Bankdrücken KH');
    expect(namen('Rumänisches Kreuzheben')).toContain('Beinbeuger');
    expect(namen('Seitheben (KH)')).toContain('Schulterdrücken KH');
    expect(namen('Kniebeuge')).not.toContain('Kniebeuge');
    expect(alternativen('Seilspringen')).toEqual([]);
  });

  it('erkennt Körpergewichtsübungen', () => {
    expect(istKoerpergewichtsUebung('Klimmzüge')).toBe(true);
    expect(istKoerpergewichtsUebung('Ausfallschritte')).toBe(false);
  });

  it('gibt null zurück, wenn nichts passt', () => {
    expect(findeUebungsInfo('Seilspringen')).toBeNull();
  });

  it('jede Übung hat Beschreibung, eindeutigen Namen und zwei Foto-URLs', () => {
    const namen = new Set<string>();
    for (const u of UEBUNGEN) {
      expect(u.ausfuehrung.length).toBeGreaterThanOrEqual(3);
      expect(u.muskeln).not.toBe('');
      expect(namen.has(u.name)).toBe(false);
      namen.add(u.name);
      expect(bildUrls(u)).toHaveLength(2);
      expect(bildUrls(u)[0]).toMatch(/^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\/main\/exercises\/[\w-]+\/0\.jpg$/);
    }
  });
});
