import { describe, expect, it } from 'vitest';
import type { Einheit } from '../src/domain/einheit';
import {
  abDatum,
  bestleistungen,
  einheitenProWoche,
  formatTausend,
  fuehreZusammen,
  gefuehlVerlauf,
  paceVerlauf,
  uebungsNamen,
  uebungsVerlauf,
} from '../src/domain/verlauf';

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

  it('Top-Gewicht mit Wdh., Wdh. gesamt und Volumen pro Übung', () => {
    const v = uebungsVerlauf(alle, 'kniebeuge');
    expect(v.map((p) => p.topKg)).toEqual([55, 57.5, 60]);
    expect(v.map((p) => p.wdhBeiTop)).toEqual([8, 8, 8]);
    expect(v[1]!.wdhGesamt).toBe(23);
    expect(v[1]!.volumen).toBe(1322.5);
    expect(v[1]!.saetze).toHaveLength(3);
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

  it('Zeitraum-Filter', () => {
    expect(abDatum(uebungsVerlauf(alle, 'Kniebeuge'), '2026-11-20').map((p) => p.datum)).toEqual(['2026-11-23', '2026-11-30']);
    expect(abDatum(uebungsVerlauf(alle, 'Kniebeuge'), null)).toHaveLength(3);
  });

  it('Bestleistungen: schwerer, mehr Volumen – die erste Einheit zählt nicht', () => {
    const b = bestleistungen(alle, '2026-11-01');
    expect(b.filter((x) => x.art === 'gewicht').map((x) => [x.datum, x.titel])).toEqual([
      ['2026-11-30', 'Kniebeuge · 60 kg × 8'],
      ['2026-11-23', 'Kniebeuge · 57,5 kg × 8'],
    ]);
    expect(b.filter((x) => x.art === 'volumen').map((x) => x.datum)).toEqual(['2026-11-30', '2026-11-23']);
    // nur ab Stichtag
    expect(bestleistungen(alle, '2026-11-25').every((x) => x.datum >= '2026-11-25')).toBe(true);
  });

  it('Bestleistung bei gleichem Gewicht mit mehr Wiederholungen; Lauf: schneller und weiter', () => {
    const e = fuehreZusammen(
      [gym('a', '2026-11-01', 50, [8, 8, 8]), gym('b', '2026-11-05', 50, [10, 10, 10]), gym('c', '2026-11-09', 50, [9, 9, 9])],
      [
        { zellen: ['02.11.2026', 'Lauf', '5 km, 31:00', '5', ''], appId: null },
        { zellen: ['06.11.2026', 'Lauf', '6 km, 36:00', '5', ''], appId: null },
        { zellen: ['10.11.2026', 'Lauf', '5 km, 29:00', '5', ''], appId: null },
      ],
      2026,
    );
    const b = bestleistungen(e, '2026-11-01');
    expect(b.find((x) => x.art === 'gewicht')).toMatchObject({ datum: '2026-11-05', titel: 'Kniebeuge · 50 kg × 10' });
    // 6:12 → 6:00 (06.11.) → 5:48 (10.11.): beides neue Bestwerte
    expect(b.filter((x) => x.art === 'pace').map((x) => x.datum)).toEqual(['2026-11-10', '2026-11-06']);
    expect(b.filter((x) => x.art === 'distanz').map((x) => x.datum)).toEqual(['2026-11-06']);
  });

  it('Tausender mit Punkt', () => {
    expect(formatTausend(1600)).toBe('1.600');
  });
});
