import { describe, expect, it } from 'vitest';
import type { Einheit, UebungErgebnis } from '../src/domain/einheit';
import { neueAppId, zerlegeWdh } from '../src/domain/einheit';
import { autoAnmerkungen, erzeugeLogZeile, formatGym, formatLauf, formatUebung } from '../src/domain/logFormat';

/** Hilfsfunktion: Übung mit Sätzen [kg, wdh] bauen (alle abgehakt). */
function uebung(name: string, saetze: [number | null, number][], extra: Partial<UebungErgebnis> = {}): UebungErgebnis {
  return {
    name,
    planName: name,
    ziel: { saetze: saetze.length, wdh: String(saetze[0]?.[1] ?? 8), gewichtKg: saetze[0]?.[0] ?? null, hinweis: null },
    koerpergewicht: false,
    saetze: saetze.map(([kg, wdh]) => ({ kg, wdh, erledigt: true })),
    ...extra,
  };
}

function einheit(teil: Partial<Einheit>): Einheit {
  return {
    id: 'ab12',
    datum: '2026-11-23',
    planDatum: '2026-11-23',
    titel: 'Gym A – Ganzkörper',
    typ: 'gym',
    status: 'abgeschlossen',
    uebungen: [],
    lauf: null,
    gefuehl: 7,
    anmerkungen: '',
    grund: null,
    gestartetAm: '2026-11-23T17:00:00Z',
    abgeschlossenAm: '2026-11-23T18:10:00Z',
    sync: 'wartet',
    syncFehler: null,
    logZeile: null,
    ...teil,
  };
}

describe('Gym-Format', () => {
  it('alle Sätze gleich → ohne Klammer', () => {
    expect(formatUebung(uebung('Bankdrücken', [[55, 8], [55, 8], [55, 8]]))).toBe('Bankdrücken 3×8×55 kg');
  });

  it('abweichende Wdh. → Ziel in der Mitte, geschaffte in Klammern', () => {
    const u = uebung('Kniebeuge', [[57.5, 8], [57.5, 8], [57.5, 7]], {
      ziel: { saetze: 3, wdh: '8', gewichtKg: 57.5, hinweis: null },
    });
    expect(formatUebung(u)).toBe('Kniebeuge 3×8×57,5 kg (8/8/7)');
  });

  it('alle Sätze gleich, aber anders als das Ziel → tatsächliche Zahl', () => {
    const u = uebung('Kniebeuge', [[57.5, 9], [57.5, 9], [57.5, 9]], { ziel: { saetze: 3, wdh: '8', gewichtKg: 57.5, hinweis: null } });
    expect(formatUebung(u)).toBe('Kniebeuge 3×9×57,5 kg');
  });

  it('Körpergewicht', () => {
    expect(formatUebung(uebung('Klimmzüge', [[null, 7], [null, 7], [null, 7]], { koerpergewicht: true }))).toBe('Klimmzüge 3×7 (KG)');
    const abweichend = uebung('Klimmzüge', [[null, 7], [null, 7], [null, 5]], {
      koerpergewicht: true,
      ziel: { saetze: 3, wdh: '7', gewichtKg: null, hinweis: 'Körpergewicht' },
    });
    expect(formatUebung(abweichend)).toBe('Klimmzüge 3×7 (KG) (7/7/5)');
  });

  it('unterschiedliche Gewichte pro Satz', () => {
    expect(formatUebung(uebung('Rumänisches Kreuzheben', [[60, 10], [65, 10], [70, 10]]))).toBe('Rumänisches Kreuzheben 3×10×60/65/70 kg');
  });

  it('je Bein und Zeit', () => {
    expect(formatUebung(uebung('Bulgarian Split Squat', [[12.5, 10], [12.5, 10]], { ziel: { saetze: 3, wdh: '10 je Bein', gewichtKg: null, hinweis: null } }))).toBe(
      'Bulgarian Split Squat 2×10 je Bein×12,5 kg',
    );
    expect(formatUebung(uebung('Plank', [[null, 45], [null, 45], [null, 45]], { koerpergewicht: true, ziel: { saetze: 3, wdh: '45 s', gewichtKg: null, hinweis: null } }))).toBe(
      'Plank 3×45 s (KG)',
    );
  });

  it('nur abgehakte Sätze zählen, ohne Satz → null', () => {
    const u = uebung('Face Pulls', [[15, 15], [15, 15], [15, 15]]);
    u.saetze[2]!.erledigt = false;
    expect(formatUebung(u)).toBe('Face Pulls 2×15×15 kg');
    u.saetze.forEach((s) => (s.erledigt = false));
    expect(formatUebung(u)).toBeNull();
  });

  it('mehrere Übungen mit „; “ getrennt', () => {
    expect(formatGym([uebung('Kniebeuge', [[57.5, 8], [57.5, 8], [57.5, 8]]), uebung('Bankdrücken', [[55, 8], [55, 8], [55, 8]])])).toBe(
      'Kniebeuge 3×8×57,5 kg; Bankdrücken 3×8×55 kg',
    );
  });

  it('automatische Anmerkungen: ausgelassen und getauscht', () => {
    const ausgelassen = uebung('Face Pulls', [[15, 15]]);
    ausgelassen.saetze[0]!.erledigt = false;
    const getauscht = uebung('Beinbeuger sitzend', [[40, 12]], { planName: 'Beinbeuger (Maschine)' });
    const ergaenzt = uebung('Dips', [[null, 10]], { planName: null });
    expect(autoAnmerkungen([ausgelassen, getauscht, ergaenzt])).toBe('ausgelassen: Face Pulls; getauscht: Beinbeuger (Maschine) → Beinbeuger sitzend');
  });
});

describe('Lauf-Format', () => {
  it('5 km in 31:20 → 6:16/km', () => {
    expect(formatLauf({ art: 'locker', distanzKm: 5, dauerSek: 1880 })).toBe('5 km, 31:20, 6:16/km (locker)');
  });
  it('Dezimaldistanz und über eine Stunde', () => {
    expect(formatLauf({ art: 'lang', distanzKm: 12.5, dauerSek: 4500 })).toBe('12,5 km, 1:15:00, 6:00/km (lang)');
  });
});

describe('Komplette Log-Zeile', () => {
  it('Gym-Einheit mit Anmerkung und Kennung', () => {
    const zeile = erzeugeLogZeile(
      einheit({
        uebungen: [uebung('Kniebeuge', [[57.5, 8], [57.5, 8], [57.5, 7]], { ziel: { saetze: 3, wdh: '8', gewichtKg: 57.5, hinweis: null } })],
        anmerkungen: 'gut geschlafen',
      }),
    );
    expect(zeile).toEqual({
      datum: '23.11.2026',
      einheit: 'Gym A – Ganzkörper',
      wasGemacht: 'Kniebeuge 3×8×57,5 kg (8/8/7)',
      gefuehl: '7',
      anmerkungen: 'gut geschlafen [app:ab12]',
    });
  });

  it('Lauf ohne Anmerkung → nur Kennung', () => {
    const zeile = erzeugeLogZeile(
      einheit({ typ: 'lauf', titel: 'Lauf – locker', datum: '2026-11-28', planDatum: '2026-11-28', lauf: { art: 'locker', distanzKm: 5, dauerSek: 1880 }, gefuehl: 5 }),
    );
    expect(zeile.wasGemacht).toBe('5 km, 31:20, 6:16/km (locker)');
    expect(zeile.anmerkungen).toBe('[app:ab12]');
    expect(zeile.datum).toBe('28.11.2026');
  });

  it('ausgelassen: „ausgelassen“, Gefühl „–“, Grund in den Anmerkungen', () => {
    const zeile = erzeugeLogZeile(einheit({ status: 'ausgelassen', grund: 'erkältet', gefuehl: null, anmerkungen: '' }));
    expect(zeile).toMatchObject({ wasGemacht: 'ausgelassen', gefuehl: '–', anmerkungen: 'erkältet [app:ab12]' });
  });

  it('verschoben/vorgezogen: Hinweis „geplant für …“ für den Coach', () => {
    const zeile = erzeugeLogZeile(einheit({ datum: '2026-11-22', planDatum: '2026-11-23', anmerkungen: 'gut geschlafen', uebungen: [] }));
    expect(zeile.datum).toBe('22.11.2026');
    expect(zeile.anmerkungen).toBe('gut geschlafen; geplant für Mo 23.11. [app:ab12]');
  });

  it('Zeilenumbrüche in Anmerkungen werden entfernt', () => {
    const zeile = erzeugeLogZeile(einheit({ anmerkungen: 'Knie zwickt\nleicht', uebungen: [] }));
    expect(zeile.anmerkungen).toBe('Knie zwickt leicht [app:ab12]');
  });
});

describe('IDs und Wdh.', () => {
  it('neue ID ist 4-stellig und frei', () => {
    let i = 0;
    const folge = [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
    const id = neueAppId(new Set(['aaaa']), () => folge[i++ % folge.length]!);
    expect(id).toHaveLength(4);
    expect(id).not.toBe('aaaa');
  });
  it('zerlegt Wiederholungs-Angaben', () => {
    expect(zerlegeWdh('10 je Bein')).toEqual({ zahl: 10, zusatz: 'je Bein' });
    expect(zerlegeWdh('30 s')).toEqual({ zahl: 30, zusatz: 's' });
    expect(zerlegeWdh('8–10')).toEqual({ zahl: 8, zusatz: '' });
  });
});
