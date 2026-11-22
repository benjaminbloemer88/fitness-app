import { describe, expect, it } from 'vitest';
import { beispielDoc } from '../src/data/beispielDoc';
import { findeLogTabelle } from '../src/domain/docSnapshot';
import { parseLogZeile, parseUebungText, parseWasGemacht } from '../src/domain/logParse';

describe('Übungen tolerant lesen', () => {
  it('App-Format mit Klammer', () => {
    expect(parseUebungText('Kniebeuge 3×8×57,5 kg (8/8/7)')).toEqual({
      name: 'Kniebeuge',
      koerpergewicht: false,
      saetze: [
        { kg: 57.5, wdh: 8 },
        { kg: 57.5, wdh: 8 },
        { kg: 57.5, wdh: 7 },
      ],
    });
  });
  it('Varianten von Hand', () => {
    expect(parseUebungText('Kniebeuge 3 x 8 x 57.5kg')!.saetze[0]).toEqual({ kg: 57.5, wdh: 8 });
    expect(parseUebungText('Kniebeuge 60 kg 3x8')!.saetze).toHaveLength(3);
    expect(parseUebungText('Kniebeuge 60 kg 3x8')!.saetze[0]).toEqual({ kg: 60, wdh: 8 });
    expect(parseUebungText('Bankdrücken: 4 Sätze à 8 mit 60 kg')).toMatchObject({ name: 'Bankdrücken', saetze: [{ kg: 60, wdh: 8 }, {}, {}, {}] });
    expect(parseUebungText('Rudern 3×10×50')!.saetze[0]).toEqual({ kg: 50, wdh: 10 });
  });
  it('Körpergewicht und Gewicht pro Satz', () => {
    expect(parseUebungText('Klimmzüge 3×7 (KG)')).toMatchObject({ koerpergewicht: true, saetze: [{ kg: null, wdh: 7 }, {}, {}] });
    expect(parseUebungText('Rumänisches Kreuzheben 3×10×60/65/70 kg')!.saetze.map((s) => s.kg)).toEqual([60, 65, 70]);
  });
  it('Vorlage mit Platzhalter ergibt kein Gewicht', () => {
    expect(parseUebungText('Kniebeuge 3×8×__ kg')!.saetze[0]!.kg).toBeNull();
  });
  it('ohne Sätze × Wdh. → null', () => {
    expect(parseUebungText('Dehnen')).toBeNull();
  });
});

describe('Was gemacht', () => {
  it('mehrere Übungen, auch mit Komma getrennt', () => {
    const r = parseWasGemacht('Kniebeuge 3×8×57,5 kg; Bankdrücken 3×8×55 kg');
    expect(r.typ === 'gym' && r.uebungen.map((u) => u.name)).toEqual(['Kniebeuge', 'Bankdrücken']);
    const komma = parseWasGemacht('Kniebeuge 3x8 57,5kg, Bankdrücken 3x8 55kg');
    expect(komma.typ === 'gym' && komma.uebungen.map((u) => u.saetze[0]!.kg)).toEqual([57.5, 55]);
  });
  it('Lauf im App-Format und frei formuliert', () => {
    expect(parseWasGemacht('5 km, 31:20, 6:16/km (locker)')).toEqual({ typ: 'lauf', lauf: { distanzKm: 5, dauerSek: 1880, art: 'locker' } });
    expect(parseWasGemacht('Lauf 5km in 30 min')).toEqual({ typ: 'lauf', lauf: { distanzKm: 5, dauerSek: 1800, art: null } });
    expect(parseWasGemacht('6 km Wettkampf 30:04')).toMatchObject({ typ: 'lauf', lauf: { distanzKm: 6, dauerSek: 1804 } });
  });
  it('ausgelassen und unbekannt', () => {
    expect(parseWasGemacht('ausgelassen')).toEqual({ typ: 'ausgelassen' });
    expect(parseWasGemacht('war nur spazieren')).toEqual({ typ: 'unbekannt' });
  });
});

describe('Log-Zeilen aus dem Doc', () => {
  const tabelle = findeLogTabelle(beispielDoc)!;

  it('findet die Log-Tabelle an der Kopfzeile', () => {
    expect(tabelle).not.toBeNull();
    expect(tabelle).toHaveLength(9);
  });
  it('überspringt Vorlage und leere Zeilen', () => {
    expect(tabelle.slice(1).map((z) => parseLogZeile(z, 2026)).filter(Boolean)).toEqual([]);
  });
  it('liest eine App-Zeile inkl. Kennung', () => {
    const z = parseLogZeile(['23.11.2026', 'Gym A – Ganzkörper', 'Kniebeuge 3×8×57,5 kg (8/8/7)', '7', 'gut geschlafen [app:ab12]'], 2026)!;
    expect(z).toMatchObject({ datum: '2026-11-23', gefuehl: 7, appId: 'ab12' });
    expect(z.inhalt.typ).toBe('gym');
  });
  it('liest eine eigene, unsaubere Zeile', () => {
    const z = parseLogZeile(['**24.11.**', 'Lauf', '5km in 30min', 'ca. 6', ''], 2026)!;
    expect(z).toMatchObject({ datum: '2026-11-24', gefuehl: 6, appId: null });
    expect(z.inhalt).toMatchObject({ typ: 'lauf', lauf: { distanzKm: 5, dauerSek: 1800 } });
  });
  it('ausgelassene Zeile mit Gefühl „–“', () => {
    const z = parseLogZeile(['25.11.2026', 'Gym B', 'ausgelassen', '–', 'krank [app:x7k2]'], 2026)!;
    expect(z).toMatchObject({ gefuehl: null, appId: 'x7k2', inhalt: { typ: 'ausgelassen' } });
  });
});
