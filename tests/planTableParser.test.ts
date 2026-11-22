import { describe, expect, it } from 'vitest';
import { beispielDoc } from '../src/data/beispielDoc';
import { findePlanTabelle } from '../src/domain/planLaden';
import { parseLaufText, parsePlanTabelle, parseUebungsAbschnitt, parseWochenUeberschrift } from '../src/domain/planTableParser';

describe('Wochen-Überschrift', () => {
  it('liest den Zeitraum mit Nummerierung und Markdown', () => {
    expect(parseWochenUeberschrift('2. Aktueller Wochenplan – Mo 23.11. bis So 29.11.2026')).toEqual({
      von: '2026-11-23',
      bis: '2026-11-29',
    });
    expect(parseWochenUeberschrift('**Aktueller Wochenplan – Mo 30.11. bis So 06.12.2026**')).toEqual({
      von: '2026-11-30',
      bis: '2026-12-06',
    });
  });
  it('korrigiert das Jahr über den Jahreswechsel', () => {
    expect(parseWochenUeberschrift('Aktueller Wochenplan – Mo 28.12. bis So 03.01.2027')?.von).toBe('2026-12-28');
  });
  it('gibt null ohne Zeitraum', () => {
    expect(parseWochenUeberschrift('Aktueller Wochenplan')).toBeNull();
  });
});

describe('Übungs-Abschnitte', () => {
  it('Gewicht mit Dezimalkomma', () => {
    expect(parseUebungsAbschnitt('Kniebeuge 3 × 8 × 57,5 kg')).toEqual([
      { name: 'Kniebeuge', saetze: 3, wdh: '8', gewicht_kg: 57.5, hinweis: null },
    ]);
  });
  it('kalibrieren mit Zusatz in Klammern', () => {
    expect(parseUebungsAbschnitt('Rumänisches Kreuzheben 3 × 10 × kalibrieren (Start ca. 60 kg, steigern bis RIR 2)')).toEqual([
      { name: 'Rumänisches Kreuzheben', saetze: 3, wdh: '10', gewicht_kg: null, hinweis: 'kalibrieren – Start ca. 60 kg, steigern bis RIR 2' },
    ]);
  });
  it('Gewicht mit Hinweis in Klammern', () => {
    const [u] = parseUebungsAbschnitt('Schulterdrücken 3 × 8 × 45 kg (gleiche Variante wie bisher – bitte im Log notieren: LH, KH oder Maschine)')!;
    expect(u!.gewicht_kg).toBe(45);
    expect(u!.hinweis).toContain('gleiche Variante');
  });
  it('Körpergewicht, leicht, ohne Gewicht', () => {
    expect(parseUebungsAbschnitt('Klimmzüge 3 × 6 × Körpergewicht')![0]).toMatchObject({ gewicht_kg: null, hinweis: 'Körpergewicht' });
    expect(parseUebungsAbschnitt('Seitheben KH 3 × 15 × leicht')![0]).toMatchObject({ name: 'Seitheben KH', wdh: '15', hinweis: 'leicht' });
    expect(parseUebungsAbschnitt('Wadenheben 3 × 15')![0]).toMatchObject({ saetze: 3, wdh: '15', gewicht_kg: null, hinweis: null });
  });
  it('je Bein und Zeitangaben', () => {
    expect(parseUebungsAbschnitt('Bulgarian Split Squat 3 × 10 je Bein × KH kalibrieren')![0]).toMatchObject({
      name: 'Bulgarian Split Squat',
      wdh: '10 je Bein',
      gewicht_kg: null,
      hinweis: 'KH kalibrieren',
    });
    expect(parseUebungsAbschnitt('Plank 3 × 30 s')![0]).toMatchObject({ name: 'Plank', wdh: '30 s' });
    expect(parseUebungsAbschnitt('Beinbeuger (Maschine) 3 × 12 × kalibrieren')![0]).toMatchObject({ name: 'Beinbeuger (Maschine)' });
  });
  it('Supersatz wird zu zwei Übungen', () => {
    const uebungen = parseUebungsAbschnitt('Bizeps-Curls 3 × 12 + Trizeps-Pushdowns 3 × 12 (als Supersatz)')!;
    expect(uebungen.map((u) => u.name)).toEqual(['Bizeps-Curls', 'Trizeps-Pushdowns']);
    expect(uebungen.every((u) => u.hinweis === 'Supersatz')).toBe(true);
  });
  it('Aufwärm-Text ist keine Übung', () => {
    expect(parseUebungsAbschnitt('Aufwärmen 5–8 Min. + 2 Aufwärmsätze je Hauptübung')).toBeNull();
  });
});

describe('Lauf-Text', () => {
  it('liest Distanz, Pace-Spanne und Hinweis', () => {
    expect(parseLaufText('5 km locker @ 6:00–6:30 min/km, am Ende 4 × 20 s Steigerungsläufe (zügig, nicht Vollgas)', 'Lauf – locker')).toEqual({
      art: 'locker',
      distanz_km: 5,
      pace_von: '6:00',
      pace_bis: '6:30',
      hinweis: 'am Ende 4 × 20 s Steigerungsläufe (zügig, nicht Vollgas)',
    });
  });
  it('erkennt Intervalle', () => {
    expect(parseLaufText('6,5 km: 6 × 400 m @ 5:20/km', 'Intervalle')).toMatchObject({ art: 'intervall', distanz_km: 6.5, pace_von: '5:20', pace_bis: '5:20' });
  });
});

describe('Plantabelle aus dem echten Doc (23.–29.11.2026)', () => {
  const tabelle = findePlanTabelle(beispielDoc)!;
  const { plan, warnungen } = parsePlanTabelle(tabelle.ueberschrift, tabelle.zeilen);

  it('liefert 7 Tage Mo–So', () => {
    expect(plan).not.toBeNull();
    expect(plan!.tage.map((t) => t.datum)).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ]);
    expect(plan!.tage.map((t) => t.typ)).toEqual(['gym', 'ruhe', 'gym', 'ruhe', 'gym', 'lauf', 'ruhe']);
    expect(warnungen).toEqual([]);
  });

  it('Gym A: Titel, Dauer, 6 Übungen, Aufwärmen als Hinweis', () => {
    const tag = plan!.tage[0]!;
    expect(tag.titel).toBe('Gym A – Ganzkörper');
    expect(tag.dauer_min).toBe(70);
    expect(tag.uebungen.map((u) => u.name)).toEqual([
      'Kniebeuge',
      'Bankdrücken',
      'Langhantelrudern',
      'Beinbeuger (Maschine)',
      'Seitheben KH',
      'Kabel-Crunch',
    ]);
    expect(tag.hinweis).toContain('Aufwärmen 5–8 Min.');
    expect(tag.hinweis).toContain('Kniebeuge + Bankdrücken');
  });

  it('Gym C: Supersatz ergibt 8 Übungen', () => {
    expect(plan!.tage[4]!.uebungen).toHaveLength(8);
  });

  it('Ruhetage und Lauf', () => {
    expect(plan!.tage[1]).toMatchObject({ typ: 'ruhe', titel: 'Ruhetag', hinweis: 'Optional Spaziergang / 10 Min. Mobility', dauer_min: null });
    expect(plan!.tage[3]!.hinweis).toBeNull();
    expect(plan!.tage[5]).toMatchObject({ typ: 'lauf', titel: 'Lauf – locker', dauer_min: 35, hinweis: 'optionaler 4. Tag' });
    expect(plan!.tage[5]!.lauf?.distanz_km).toBe(5);
  });

  it('fehlende Tage werden als Ruhetag ergänzt (mit Warnung)', () => {
    const ohneDonnerstag = tabelle.zeilen.filter((z) => !z[0]!.includes('Do'));
    const ergebnis = parsePlanTabelle(tabelle.ueberschrift, ohneDonnerstag);
    expect(ergebnis.plan!.tage[3]!.typ).toBe('ruhe');
    expect(ergebnis.warnungen[0]).toContain('Do');
  });
});
