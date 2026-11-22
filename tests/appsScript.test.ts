/**
 * Testet apps-script/Code.gs gegen ein nachgebautes Google-Doc.
 *
 * Das Skript läuft in einer Sandbox (node:vm) mit Attrappen für DocumentApp,
 * ContentService, PropertiesService usw. So prüfen wir die harten Regeln:
 * nur anhängen, Vorlage und fremde Zeilen bleiben unberührt, keine Doppelten.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { beispielDoc } from '../src/data/beispielDoc';
import { planAusSnapshot } from '../src/domain/planLaden';
import { planAlsJson } from '../src/domain/planSchema';
import { Absatz, baueDoc, ladeSkript, Tabelle, type FakeDoc } from './helpers/appsScriptFake';

// ───────────── Tests ─────────────

const SCHLUESSEL = 'geheim-geheim-geheim-1234567890';
let doc: FakeDoc;
let rufe: ReturnType<typeof ladeSkript>;
const mit = (aktion: string, daten: object = {}) => rufe({ aktion, schluessel: SCHLUESSEL, ...daten });

function logTabelle(): Tabelle {
  return doc.body.kinder.filter((k): k is Tabelle => k instanceof Tabelle).at(-1)!;
}
function zeile(id: string, was = 'Kniebeuge 3×8×57,5 kg') {
  return { id, zellen: ['23.11.2026', 'Gym A – Ganzkörper', was, '7', `gut geschlafen [app:${id}]`] };
}
/** Alles außer der Log-Tabelle als Text – darf sich nie ändern. */
function restDesDocs() {
  return JSON.stringify(doc.body.kinder.filter((k) => k !== logTabelle()));
}

beforeEach(() => {
  doc = baueDoc(structuredClone(beispielDoc));
  rufe = ladeSkript(doc, { SCHLUESSEL });
});

describe('Apps-Script-Brücke: Zugriff', () => {
  it('ohne oder mit falschem Schlüssel passiert nichts', () => {
    expect(rufe({ aktion: 'ping' })).toEqual({ ok: false, fehler: 'Falscher Schlüssel.' });
    expect(rufe({ aktion: 'ping', schluessel: 'geheim-geheim-geheim-1234567899' }).ok).toBe(false);
    expect(rufe({ aktion: 'anhaengen', schluessel: 'x', zeilen: [zeile('ab12')] }).ok).toBe(false);
    expect(logTabelle().zeilen[2]!.zellen[0]!.text).toBe('');
  });
  it('ping liefert den Doc-Titel', () => {
    expect(mit('ping')).toEqual({ ok: true, titel: 'Trainingsplan & Log' });
  });
  it('unbekannte Aktion wird abgelehnt', () => {
    expect(mit('loeschen').ok).toBe(false);
  });
});

describe('Apps-Script-Brücke: lesen', () => {
  it('liefert das Doc so, dass die App den Plan erkennt', () => {
    const antwort = mit('lesen');
    expect(antwort.ok).toBe(true);
    const plan = planAusSnapshot({ titel: antwort.titel, bloecke: antwort.bloecke });
    expect(plan.quelle).toBe('tabelle');
    expect(plan.plan?.woche_von).toBe('2026-11-23');
  });
});

describe('Apps-Script-Brücke: anhaengen', () => {
  it('füllt die erste leere Zeile nach der Vorlage – Vorlage und Rest bleiben unverändert', () => {
    const vorher = restDesDocs();
    const vorlageVorher = JSON.stringify(logTabelle().zeilen[1]);
    expect(mit('anhaengen', { zeilen: [zeile('ab12')] })).toEqual({ ok: true, angehaengt: ['ab12'], schonVorhanden: [] });
    const t = logTabelle();
    expect(t.zeilen[2]!.zellen.map((z) => z.text)).toEqual(zeile('ab12').zellen);
    expect(t.zeilen[2]!.zellen.every((z) => !z.italic)).toBe(true);
    expect(JSON.stringify(t.zeilen[1])).toBe(vorlageVorher);
    expect(t.zeilen).toHaveLength(9);
    expect(restDesDocs()).toBe(vorher);
  });

  it('keine Doppelten: gleiche Kennung wird übersprungen', () => {
    mit('anhaengen', { zeilen: [zeile('ab12')] });
    expect(mit('anhaengen', { zeilen: [zeile('ab12'), zeile('cd34')] })).toEqual({ ok: true, angehaengt: ['cd34'], schonVorhanden: ['ab12'] });
    const texte = logTabelle().zeilen.map((z) => z.zellen[4]!.text);
    expect(texte.filter((t) => t.includes('[app:ab12]'))).toHaveLength(1);
  });

  it('hängt neue Zeilen an, wenn keine leeren mehr übrig sind', () => {
    const zeilen = Array.from({ length: 9 }, (_, i) => zeile(`id${i}a`));
    expect(mit('anhaengen', { zeilen }).angehaengt).toHaveLength(9);
    const t = logTabelle();
    expect(t.zeilen).toHaveLength(11); // Kopf + Vorlage + 7 gefüllte + 2 neue
    expect(t.zeilen[10]!.zellen[4]!.text).toBe('gut geschlafen [app:id8a]');
  });

  it('schreibt nach dem letzten Eintrag, nicht in eine Lücke darüber', () => {
    logTabelle().zeilen[4]!.zellen[0]!.text = '20.11.2026'; // eigener Eintrag weiter unten
    mit('anhaengen', { zeilen: [zeile('ab12')] });
    expect(logTabelle().zeilen[2]!.zellen[0]!.text).toBe('');
    expect(logTabelle().zeilen[5]!.zellen[4]!.text).toContain('[app:ab12]');
  });

  it('lehnt Zeilen ohne passende Kennung oder mit falscher Spaltenzahl ab', () => {
    expect(mit('anhaengen', { zeilen: [{ id: 'ab12', zellen: ['a', 'b', 'c', 'd', 'ohne Kennung'] }] }).ok).toBe(false);
    expect(mit('anhaengen', { zeilen: [{ id: 'ab12', zellen: ['a', 'b'] }] }).ok).toBe(false);
    expect(mit('anhaengen', { zeilen: [{ id: 'AB 12', zellen: ['a', 'b', 'c', 'd', '[app:AB 12]'] }] }).ok).toBe(false);
    expect(logTabelle().zeilen[2]!.zellen[0]!.text).toBe('');
  });
});

describe('Apps-Script-Brücke: korrigieren', () => {
  it('ändert nur die eigene Zeile', () => {
    mit('anhaengen', { zeilen: [zeile('ab12'), zeile('cd34')] });
    expect(mit('korrigieren', { ...zeile('ab12', 'Kniebeuge 3×8×60 kg') })).toEqual({ ok: true, korrigiert: true });
    const t = logTabelle();
    expect(t.zeilen[2]!.zellen[2]!.text).toBe('Kniebeuge 3×8×60 kg');
    expect(t.zeilen[3]!.zellen[2]!.text).toBe('Kniebeuge 3×8×57,5 kg');
  });
  it('findet nichts, wenn die Kennung nicht im Doc steht', () => {
    expect(mit('korrigieren', { ...zeile('zz99') })).toEqual({ ok: true, korrigiert: false, treffer: 0 });
  });
});

describe('Apps-Script-Brücke: Plan-Daten einmalig anlegen', () => {
  it('fügt den Abschnitt vor dem Log ein; danach liest die App den Plan aus dem JSON', () => {
    const plan = planAusSnapshot(beispielDoc).plan!;
    expect(mit('planDatenAnlegen', { json: planAlsJson(plan) })).toEqual({ ok: true });

    const texte = doc.body.kinder.map((k) => (k instanceof Absatz ? k.text : '[Tabelle]'));
    const i = texte.indexOf('Plan-Daten (für die App – nicht bearbeiten)');
    expect(texte.slice(i, i + 5)).toEqual(['Plan-Daten (für die App – nicht bearbeiten)', 'PLAN-JSON-START', planAlsJson(plan), 'PLAN-JSON-END', '3. Log']);
    expect((doc.body.kinder[i] as Absatz).heading).toBe('HEADING2');
    // Plan-Abschnitt steht davor
    expect(texte.indexOf('2. Aktueller Wochenplan – Mo 23.11. bis So 29.11.2026')).toBeLessThan(i);

    const neu = planAusSnapshot({ titel: 'x', bloecke: mit('lesen').bloecke });
    expect(neu.quelle).toBe('json');
    expect(neu.plan).toEqual(plan);
  });

  it('überschreibt nie bestehende Plan-Daten und prüft das JSON', () => {
    const plan = planAusSnapshot(beispielDoc).plan!;
    mit('planDatenAnlegen', { json: planAlsJson(plan) });
    expect(mit('planDatenAnlegen', { json: planAlsJson(plan) }).ok).toBe(false);

    doc = baueDoc(structuredClone(beispielDoc));
    rufe = ladeSkript(doc, { SCHLUESSEL });
    expect(mit('planDatenAnlegen', { json: '{"version":1,"tage":[]}' }).ok).toBe(false);
    expect(mit('planDatenAnlegen', { json: 'kein json' }).ok).toBe(false);
  });
});

describe('Apps-Script-Brücke: Einrichtung', () => {
  it('ohne eingerichteten Schlüssel wird jede Anfrage abgelehnt', () => {
    rufe = ladeSkript(doc, {});
    expect(rufe({ aktion: 'ping', schluessel: '' }).fehler).toContain('schluesselErzeugen');
  });
});
