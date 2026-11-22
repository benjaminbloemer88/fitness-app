import { describe, expect, it } from 'vitest';
import { epley1RM, formatDauer, formatDezimal, formatPace, paceSekProKm, parseDezimal, parseZeit, volumen } from '../src/domain/calc';
import { deutschZuIso, formatTagLang, montagDerWoche, plusTage, wochentagIndex } from '../src/domain/dates';

describe('Zahlen', () => {
  it('formatiert mit Dezimalkomma ohne überflüssige Nullen', () => {
    expect(formatDezimal(57.5)).toBe('57,5');
    expect(formatDezimal(60)).toBe('60');
    expect(formatDezimal(1.25)).toBe('1,25');
    expect(formatDezimal(5.0)).toBe('5');
  });
  it('liest Komma und Punkt', () => {
    expect(parseDezimal('57,5')).toBe(57.5);
    expect(parseDezimal('57.5')).toBe(57.5);
    expect(parseDezimal('abc')).toBeNull();
  });
});

describe('Zeit und Pace', () => {
  it('formatiert Dauer', () => {
    expect(formatDauer(1880)).toBe('31:20');
    expect(formatDauer(3735)).toBe('1:02:15');
    expect(formatDauer(59)).toBe('0:59');
  });
  it('liest Zeiten', () => {
    expect(parseZeit('31:20')).toBe(1880);
    expect(parseZeit('1:02:15')).toBe(3735);
    expect(parseZeit('31:75')).toBeNull();
    expect(parseZeit('31')).toBeNull();
  });
  it('berechnet die Pace (5 km in 31:20 → 6:16/km)', () => {
    const pace = paceSekProKm(5, 1880)!;
    expect(formatPace(pace)).toBe('6:16');
  });
  it('rundet die Pace korrekt über die Minutengrenze', () => {
    expect(formatPace(359.6)).toBe('6:00');
  });
  it('liefert null bei Distanz 0', () => {
    expect(paceSekProKm(0, 1800)).toBeNull();
  });
});

describe('1RM und Volumen', () => {
  it('Epley: 100 kg × 10 → 133,3 kg', () => {
    expect(epley1RM(100, 10)).toBeCloseTo(133.33, 1);
  });
  it('Epley: 1 Wdh. = Gewicht', () => {
    expect(epley1RM(100, 1)).toBe(100);
  });
  it('Epley: ohne Gewicht 0', () => {
    expect(epley1RM(0, 8)).toBe(0);
  });
  it('Volumen = Σ kg × Wdh.', () => {
    expect(
      volumen([
        { kg: 57.5, wdh: 8 },
        { kg: 57.5, wdh: 8 },
        { kg: 57.5, wdh: 7 },
      ]),
    ).toBe(1322.5);
  });
});

describe('Datum', () => {
  it('rechnet Wochen korrekt', () => {
    expect(wochentagIndex('2026-11-23')).toBe(0); // Montag
    expect(wochentagIndex('2026-11-22')).toBe(6); // Sonntag
    expect(montagDerWoche('2026-11-29')).toBe('2026-11-23');
    expect(plusTage('2026-12-28', 6)).toBe('2027-01-03');
    expect(plusTage('2026-03-28', 2)).toBe('2026-03-30'); // Zeitumstellung
  });
  it('liest deutsche Daten tolerant', () => {
    expect(deutschZuIso('23.11.2026')).toBe('2026-11-23');
    expect(deutschZuIso('23.11.', 2026)).toBe('2026-11-23');
    expect(deutschZuIso('3.1.27')).toBe('2027-01-03');
    expect(deutschZuIso('Vorlage')).toBeNull();
  });
  it('formatiert lange Tagesnamen', () => {
    expect(formatTagLang('2026-11-23')).toBe('Montag, 23. November');
  });
});
