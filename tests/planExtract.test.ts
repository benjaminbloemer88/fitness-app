import { describe, expect, it } from 'vitest';
import { beispielDoc } from '../src/data/beispielDoc';
import type { DocSnapshot } from '../src/domain/docSnapshot';
import { findeJsonAbsaetze, parsePlanJson, planAusAbsaetzen, repariereJsonText } from '../src/domain/planExtract';
import { planAusSnapshot } from '../src/domain/planLaden';
import { planAlsJson, type Plan } from '../src/domain/planSchema';

/** Ein gültiger Plan nach dem Schema aus dem Aufgabentext. */
function gueltigerPlan(): Plan {
  const ruhe = (datum: string) => ({ datum, typ: 'ruhe' as const, titel: 'Ruhetag', dauer_min: null, uebungen: [], lauf: null, hinweis: null });
  return {
    version: 1,
    woche_von: '2026-11-30',
    woche_bis: '2026-12-06',
    tage: [
      {
        datum: '2026-11-30',
        typ: 'gym',
        titel: 'Gym A – Ganzkörper',
        dauer_min: 70,
        uebungen: [
          { name: 'Kniebeuge', saetze: 3, wdh: '8', gewicht_kg: 57.5, hinweis: 'RIR 2' },
          { name: 'Klimmzüge', saetze: 3, wdh: '6', gewicht_kg: null, hinweis: 'Körpergewicht' },
        ],
        lauf: null,
        hinweis: '5–8 Min. aufwärmen + 2 Aufwärmsätze je Hauptübung',
      },
      ruhe('2026-12-01'),
      ruhe('2026-12-02'),
      ruhe('2026-12-03'),
      ruhe('2026-12-04'),
      {
        datum: '2026-12-05',
        typ: 'lauf',
        titel: 'Lauf – locker',
        dauer_min: 35,
        uebungen: [],
        lauf: { art: 'locker', distanz_km: 5.5, pace_von: '6:00', pace_bis: '6:30', hinweis: null },
        hinweis: null,
      },
      ruhe('2026-12-06'),
    ],
  };
}

/** Doc mit Plan-Daten-Abschnitt (JSON in Absätzen). */
function docMitJson(absaetze: string[]): DocSnapshot {
  return {
    titel: 'Test',
    bloecke: [
      ...beispielDoc.bloecke.slice(0, 7),
      { typ: 'ueberschrift', ebene: 2, text: 'Plan-Daten (für die App – nicht bearbeiten)' },
      ...absaetze.map((text) => ({ typ: 'absatz' as const, text })),
      ...beispielDoc.bloecke.slice(7),
    ],
  };
}

describe('Plan-JSON aus dem Doc', () => {
  it('liest JSON in einem Absatz', () => {
    const ergebnis = planAusAbsaetzen(['Text davor', 'PLAN-JSON-START', planAlsJson(gueltigerPlan()), 'PLAN-JSON-END', 'Log']);
    expect(ergebnis.status).toBe('ok');
    if (ergebnis.status !== 'ok') return;
    expect(ergebnis.plan.tage).toHaveLength(7);
    expect(ergebnis.plan.tage[0]!.uebungen[0]!.gewicht_kg).toBe(57.5);
    expect(ergebnis.warnungen).toEqual([]);
  });

  it('setzt JSON zusammen, das über mehrere Absätze verteilt ist', () => {
    const json = JSON.stringify(gueltigerPlan(), null, 2).split('\n');
    const ergebnis = planAusAbsaetzen(['PLAN-JSON-START', ...json, 'PLAN-JSON-END']);
    expect(ergebnis.status).toBe('ok');
  });

  it('verkraftet einen Umbruch mitten in einem Text', () => {
    const json = planAlsJson(gueltigerPlan());
    const mitte = json.indexOf('Ganzkörper') + 4;
    const ergebnis = planAusAbsaetzen(['PLAN-JSON-START', json.slice(0, mitte), json.slice(mitte), 'PLAN-JSON-END']);
    expect(ergebnis.status).toBe('ok');
  });

  it('normalisiert typografische Anführungszeichen', () => {
    const typografisch = planAlsJson(gueltigerPlan()).replace(/"(.*?)"/g, '“$1”');
    expect(parsePlanJson(typografisch).status).toBe('ok');
    const deutsch = planAlsJson(gueltigerPlan()).replace(/"(.*?)"/g, '„$1“');
    expect(parsePlanJson(deutsch).status).toBe('ok');
  });

  it('entfernt Markdown-Escapes wie woche\\_von und Fettdruck', () => {
    const kaputt = planAlsJson(gueltigerPlan()).replace(/_/g, '\\_');
    expect(kaputt).toContain('woche\\_von');
    expect(parsePlanJson(kaputt).status).toBe('ok');
    expect(repariereJsonText('**{"a":1}**')).toBe('{"a":1}');
  });

  it('erkennt Marker mit Markdown-Escape und Code-Zaun', () => {
    const ergebnis = planAusAbsaetzen(['PLAN\\-JSON\\-START', '```json', planAlsJson(gueltigerPlan()), '```', 'PLAN\\-JSON\\-END']);
    expect(ergebnis.status).toBe('ok');
  });

  it('meldet fehlende Marker', () => {
    expect(planAusAbsaetzen(['nur Text']).status).toBe('fehlt');
    expect(planAusAbsaetzen(['PLAN-JSON-START', '{}']).status).toBe('fehlt');
    expect(findeJsonAbsaetze(['PLAN-JSON-START', 'x', 'PLAN-JSON-END'])).toEqual(['', 'x', '']);
  });

  it('meldet ungültiges JSON verständlich', () => {
    const ergebnis = planAusAbsaetzen(['PLAN-JSON-START', '{"version":1, kaputt', 'PLAN-JSON-END']);
    expect(ergebnis.status).toBe('ungueltig');
  });

  it('meldet Schema-Fehler (nur 6 Tage, falsches Datum)', () => {
    const plan = gueltigerPlan();
    const sechs = { ...plan, tage: plan.tage.slice(0, 6) };
    const e1 = parsePlanJson(JSON.stringify(sechs));
    expect(e1.status).toBe('ungueltig');

    const falsch = structuredClone(plan);
    falsch.tage[2]!.datum = '2026-12-09';
    const e2 = parsePlanJson(JSON.stringify(falsch));
    expect(e2.status).toBe('ungueltig');
    if (e2.status === 'ungueltig') expect(e2.fehler.join(' ')).toContain('2026-12-02');
  });

  it('ist großzügig bei Kleinigkeiten (Zahl als Text, fehlender Hinweis)', () => {
    const plan = JSON.parse(planAlsJson(gueltigerPlan()));
    plan.tage[0].uebungen[0].gewicht_kg = '57,5';
    plan.tage[0].uebungen[0].wdh = 8;
    delete plan.tage[0].uebungen[1].hinweis;
    const ergebnis = parsePlanJson(JSON.stringify(plan));
    expect(ergebnis.status).toBe('ok');
    if (ergebnis.status === 'ok') {
      expect(ergebnis.plan.tage[0]!.uebungen[0]!.gewicht_kg).toBe(57.5);
      expect(ergebnis.plan.tage[0]!.uebungen[0]!.wdh).toBe('8');
      expect(ergebnis.plan.tage[0]!.uebungen[1]!.hinweis).toBeNull();
    }
  });

  it('warnt bei Ruhetag mit Übungen', () => {
    const plan = gueltigerPlan();
    plan.tage[1]!.uebungen = [{ name: 'Plank', saetze: 3, wdh: '30 s', gewicht_kg: null, hinweis: null }];
    const ergebnis = parsePlanJson(planAlsJson(plan));
    expect(ergebnis.status).toBe('ok');
    if (ergebnis.status === 'ok') expect(ergebnis.warnungen[0]).toContain('Ruhetag');
  });
});

describe('planAusSnapshot', () => {
  it('nimmt die Tabelle, wenn das JSON fehlt (echtes Doc vom 22.11.)', () => {
    const ergebnis = planAusSnapshot(beispielDoc);
    expect(ergebnis.quelle).toBe('tabelle');
    expect(ergebnis.jsonStatus).toBe('fehlt');
    expect(ergebnis.plan?.woche_von).toBe('2026-11-23');
    expect(ergebnis.hinweise[0]).toContain('fehlen die Plan-Daten');
  });

  it('nimmt das JSON, wenn es da ist, und warnt bei abweichender Woche', () => {
    const ergebnis = planAusSnapshot(docMitJson(['PLAN-JSON-START', planAlsJson(gueltigerPlan()), 'PLAN-JSON-END']));
    expect(ergebnis.quelle).toBe('json');
    expect(ergebnis.plan?.woche_von).toBe('2026-11-30');
    expect(ergebnis.hinweise.join(' ')).toContain('verschiedene Wochen');
  });

  it('fällt bei ungültigem JSON auf die Tabelle zurück', () => {
    const ergebnis = planAusSnapshot(docMitJson(['PLAN-JSON-START', '{kaputt}', 'PLAN-JSON-END']));
    expect(ergebnis.quelle).toBe('tabelle');
    expect(ergebnis.jsonStatus).toBe('ungueltig');
  });

  it('erzeugtes JSON aus der Tabelle ist selbst wieder gültig (Rundreise)', () => {
    const ausTabelle = planAusSnapshot(beispielDoc).plan!;
    const wieder = parsePlanJson(planAlsJson(ausTabelle));
    expect(wieder.status).toBe('ok');
    if (wieder.status === 'ok') expect(wieder.plan).toEqual(ausTabelle);
  });
});
