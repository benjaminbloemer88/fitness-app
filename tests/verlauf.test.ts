import { describe, expect, it } from 'vitest';
import type { Einheit } from '../src/domain/einheit';
import { einheitenProWoche, fuehreZusammen, gefuehlVerlauf, paceVerlauf, uebungsNamen, uebungsVerlauf } from '../src/domain/verlauf';

function gym(id: string, datum: string, kg: number, wdh: number[], gefuehl = 7): Einheit {
  return {
    id,
    datum,
    planDatum: datum,
    titel: 'Gym A',
    typ: 'gym',
    status: 'abgeschlossen',
    uebungen: [{ name: 'Kniebeuge', planName: 'Kniebeuge', ziel: null, koerpergewicht: false, saetze: wdh.map((w) => ({ kg, wdh: w, erledigt: true })) }],
    lauf: null,
    gefuehl,
    anmerkungen: '',
    grund: null,
    gestartetAm: '',
    abgeschlossenAm: null,
    sync: 'synchronisiert',
    syncFehler: null,
    logZeile: null,
  };
}

describe('Verlauf', () => {
  const einheiten = [gym('aaaa', '2026-11-23', 57.5, [8, 8, 7]), gym('bbbb', '2026-11-30', 60, [8, 8, 8], 8)];
  const importe = [
    // eigene Zeile von Hand (wird importiert)
    { zellen: ['16.11.2026', 'Gym', 'Kniebeuge 3x8 55kg', '6', ''], appId: null },
    // App-Zeile, die lokal schon existiert → nicht doppelt zählen
    { zellen: ['23.11.2026', 'Gym A', 'Kniebeuge 3×8×57,5 kg (8/8/7)', '7', '[app:aaaa]'], appId: 'aaaa' },
    { zellen: ['28.11.2026', 'Lauf', '5 km, 31:20, 6:16/km (locker)', '5', ''], appId: null },
  ];
  const alle = fuehreZusammen(einheiten, importe, 2026);

  it('führt App und Import ohne Doppelte zusammen', () => {
    expect(alle.map((e) => e.datum)).toEqual(['2026-11-16', '2026-11-23', '2026-11-28', '2026-11-30']);
  });

  it('Top-Gewicht, 1RM und Volumen pro Übung', () => {
    const v = uebungsVerlauf(alle, 'kniebeuge');
    expect(v.map((p) => p.topKg)).toEqual([55, 57.5, 60]);
    expect(v[1]!.volumen).toBe(1322.5);
    expect(v[2]!.e1rm).toBeCloseTo(76, 0);
  });

  it('Pace, Gefühl, Einheiten pro Woche', () => {
    expect(paceVerlauf(alle)).toEqual([{ datum: '2026-11-28', paceSek: 376, km: 5 }]);
    expect(gefuehlVerlauf(alle).map((g) => g.gefuehl)).toEqual([6, 7, 5, 8]);
    expect(einheitenProWoche(alle)).toEqual([
      { woche: '2026-11-16', anzahl: 1 },
      { woche: '2026-11-23', anzahl: 2 },
      { woche: '2026-11-30', anzahl: 1 },
    ]);
    expect(uebungsNamen(alle)).toEqual(['Kniebeuge']);
  });
});
