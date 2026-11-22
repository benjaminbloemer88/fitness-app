/**
 * Fallback: Plan aus der lesbaren Tabelle „Tag | Einheit | Inhalt | Dauer“ lesen.
 *
 * Wird genutzt, wenn die Plan-Daten (JSON) fehlen oder ungültig sind.
 * Der Inhalt ist Fließtext, Übungen sind durch „•“ (oder Zeilenumbrüche) getrennt, z. B.
 *   „Aufwärmen 5–8 Min. + 2 Aufwärmsätze je Hauptübung• Kniebeuge 3 × 8 × 57,5 kg• …“
 * Was nicht als Übung erkennbar ist, landet im Hinweis des Tages.
 */
import { parseDezimal } from './calc';
import { isoAus, plusTage, WOCHENTAGE_KURZ } from './dates';
import { saeubereText, ueberschriftOhneNummer } from './docSnapshot';
import { PlanSchema, pruefePlanRegeln, type Lauf, type LaufArt, type Plan, type PlanTag, type Uebung } from './planSchema';

export interface TabellenErgebnis {
  plan: Plan | null;
  warnungen: string[];
}

/**
 * „Aktueller Wochenplan – Mo 23.11. bis So 29.11.2026“ → { von: '2026-11-23', bis: '2026-11-29' }.
 * Über den Jahreswechsel („Mo 28.12. bis So 03.01.2027“) wird das Jahr von „von“ korrigiert.
 */
export function parseWochenUeberschrift(text: string): { von: string; bis: string } | null {
  const t = ueberschriftOhneNummer(text);
  const m = t.match(/(\d{1,2})\.(\d{1,2})\.?(?:(\d{4}))?\s*(?:bis|–|-)\s*(?:So\.?\s*)?(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  const [, t1, m1, j1, t2, m2, j2] = m;
  const jahrBis = Number(j2);
  const jahrVon = j1 ? Number(j1) : Number(m1) > Number(m2) ? jahrBis - 1 : jahrBis;
  return { von: isoAus(jahrVon, Number(m1), Number(t1)), bis: isoAus(jahrBis, Number(m2), Number(t2)) };
}

/** Holt eine Klammer am Ende ab: „Kreuzheben 3 × 10 (Start ca. 60 kg)“ → ['Kreuzheben 3 × 10', 'Start ca. 60 kg']. */
function trenneEndKlammer(text: string): [string, string | null] {
  const m = text.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  return m ? [m[1]!.trim(), m[2]!.trim()] : [text.trim(), null];
}

// Name, Sätze × Wdh. (mit Zusätzen wie „je Bein“ oder „s“), optional × Gewicht/Hinweis
const UEBUNG_RE =
  /^(?<name>\D.*?)\s+(?<saetze>\d{1,2})\s*[×xX*]\s*(?<wdh>\d+(?:\s*[–-]\s*\d+)?(?:\s*(?:s|sek\.?|min\.?)(?![a-zäöü]))?(?:\s+(?:je|pro)\s+(?:Bein|Seite|Arm))?)(?:\s*[×xX*]\s*(?<rest>.+))?$/i;

/** Liest den Teil nach dem zweiten „×“: Gewicht oder Hinweis wie „kalibrieren“, „Körpergewicht“, „leicht“. */
function parseRest(rest: string | undefined): { gewicht: number | null; hinweis: string | null } {
  if (!rest) return { gewicht: null, hinweis: null };
  const r = rest.trim();
  const kg = r.match(/^(\d+(?:[.,]\d+)?)\s*kg\b\s*(.*)$/i);
  if (kg) return { gewicht: parseDezimal(kg[1]!), hinweis: kg[2]?.trim() || null };
  if (/körpergewicht|^KG$/i.test(r)) return { gewicht: null, hinweis: 'Körpergewicht' };
  return { gewicht: null, hinweis: r };
}

/** Eine einzelne Übung „Kniebeuge 3 × 8 × 57,5 kg“ lesen. Gibt null zurück, wenn es keine Übung ist. */
function parseEinzelUebung(text: string, zusatzHinweis: string | null): Uebung | null {
  const m = text.match(UEBUNG_RE);
  if (!m?.groups) return null;
  const { name, saetze, wdh, rest } = m.groups;
  const { gewicht, hinweis } = parseRest(rest);
  const hinweise = [hinweis, zusatzHinweis].filter((h): h is string => !!h);
  return {
    name: name!.trim(),
    saetze: Number(saetze),
    wdh: wdh!.replace(/\s+/g, ' ').trim(),
    gewicht_kg: gewicht,
    hinweis: hinweise.length ? hinweise.join(' – ') : null,
  };
}

/**
 * Liest einen Übungs-Abschnitt. Supersätze („Curls 3 × 12 + Pushdowns 3 × 12 (als Supersatz)“)
 * werden zu zwei Übungen. Gibt null zurück, wenn der Abschnitt keine Übung ist.
 */
export function parseUebungsAbschnitt(abschnitt: string): Uebung[] | null {
  const [ohneKlammer, klammer] = trenneEndKlammer(abschnitt);
  const zusatz = klammer && /supersatz/i.test(klammer) ? 'Supersatz' : klammer;
  const teile = ohneKlammer.split(/\s+\+\s+/);
  if (teile.length > 1) {
    const uebungen = teile.map((t) => parseEinzelUebung(t, zusatz));
    if (uebungen.every((u): u is Uebung => u !== null)) return uebungen;
  }
  const einzeln = parseEinzelUebung(ohneKlammer, klammer);
  return einzeln ? [einzeln] : null;
}

/** Erkennt die Laufart an Stichwörtern. */
function erkenneLaufArt(text: string): LaufArt {
  if (/intervall/i.test(text)) return 'intervall';
  if (/tempo/i.test(text)) return 'tempo';
  if (/\blang(e[rn]?)?\b/i.test(text)) return 'lang';
  return 'locker';
}

/** „5 km locker @ 6:00–6:30 min/km, am Ende 4 × 20 s Steigerungsläufe“ → Lauf-Objekt. */
export function parseLaufText(inhalt: string, einheit: string): Lauf | null {
  const text = inhalt.replace(/\n/g, ' ');
  const distanz = text.match(/(\d+(?:[.,]\d+)?)\s*km\b/i);
  if (!distanz) return null;
  const pace = text.match(/(\d{1,2}:\d{2})\s*(?:[–-]\s*(\d{1,2}:\d{2}))?\s*(?:min)?\s*\/\s*km/i);
  // Hinweis = alles nach dem ersten Komma hinter Pace bzw. Distanz (nicht das Komma in „6,5 km“)
  const ab = pace ? pace.index! + pace[0].length : distanz.index! + distanz[0].length;
  const kommaPos = text.indexOf(',', ab);
  const hinweis = kommaPos >= 0 ? text.slice(kommaPos + 1).trim() : null;
  return {
    art: erkenneLaufArt(`${einheit} ${text}`),
    distanz_km: parseDezimal(distanz[1]!) ?? 0,
    pace_von: pace?.[1] ?? null,
    pace_bis: pace?.[2] ?? pace?.[1] ?? null,
    hinweis: hinweis || null,
  };
}

/** „ca. 70 Min.“ → 70, „–“ → null */
function parseDauer(text: string): number | null {
  const m = text.match(/(\d+)\s*(?:[–-]\s*(\d+)\s*)?min/i);
  return m ? Number(m[2] ?? m[1]) : null;
}

/** Wochentag aus der Tag-Spalte („Mo 23.11.“ → 0). */
function wochentagAusZelle(text: string): number {
  const kuerzel = text.trim().slice(0, 2);
  return WOCHENTAGE_KURZ.findIndex((k) => k.toLowerCase() === kuerzel.toLowerCase());
}

/** Liest eine Tabellenzeile zu einem Plantag. */
function parseZeile(zellen: string[], datum: string): PlanTag {
  const [, einheitRoh = '', inhaltRoh = '', dauerRoh = ''] = zellen.map(saeubereText);
  const [titelOhneKlammer, titelKlammer] = trenneEndKlammer(einheitRoh);
  const titel = titelOhneKlammer || einheitRoh || '–';
  const istRuhe = /ruhe/i.test(einheitRoh);
  const istLauf = !istRuhe && /lauf|laufen|run\b/i.test(einheitRoh);
  const inhaltLeer = /^[–\-\s]*$/.test(inhaltRoh);
  const dauer = parseDauer(dauerRoh);

  const hinweise: string[] = [];
  const uebungen: Uebung[] = [];
  let lauf: Lauf | null = null;

  if (istLauf) {
    lauf = parseLaufText(inhaltRoh, einheitRoh);
    if (!lauf && !inhaltLeer) hinweise.push(inhaltRoh);
  } else if (!istRuhe) {
    // Abschnitte: getrennt durch „•“ oder Zeilenumbruch
    for (const abschnitt of inhaltRoh.split(/[•\n]/).map((a) => a.trim()).filter(Boolean)) {
      const gefunden = parseUebungsAbschnitt(abschnitt);
      if (gefunden) uebungen.push(...gefunden);
      else hinweise.push(abschnitt);
    }
  } else if (!inhaltLeer) {
    hinweise.push(inhaltRoh);
  }
  if (titelKlammer) hinweise.push(titelKlammer);

  return {
    datum,
    typ: istRuhe ? 'ruhe' : istLauf ? 'lauf' : 'gym',
    titel,
    dauer_min: istRuhe ? null : dauer,
    uebungen,
    lauf,
    hinweis: hinweise.length ? hinweise.join(' · ') : null,
  };
}

/**
 * Liest die ganze Plantabelle.
 * @param ueberschrift Text der Abschnittsüberschrift (enthält den Zeitraum)
 * @param zeilen Tabellenzeilen inkl. Kopfzeile
 */
export function parsePlanTabelle(ueberschrift: string, zeilen: string[][]): TabellenErgebnis {
  const warnungen: string[] = [];
  const woche = parseWochenUeberschrift(ueberschrift);
  if (!woche) return { plan: null, warnungen: ['Zeitraum in der Überschrift nicht erkannt.'] };

  const tage: (PlanTag | null)[] = Array.from({ length: 7 }, () => null);
  for (const zeile of zeilen) {
    const tagZelle = saeubereText(zeile[0] ?? '');
    const index = wochentagAusZelle(tagZelle);
    if (index < 0) continue; // Kopfzeile oder Leerzeile
    tage[index] = parseZeile(zeile, plusTage(woche.von, index));
  }

  const vollstaendig = tage.map((t, i) => {
    if (t) return t;
    warnungen.push(`${WOCHENTAGE_KURZ[i]}: keine Zeile in der Tabelle – als Ruhetag angenommen.`);
    return { datum: plusTage(woche.von, i), typ: 'ruhe', titel: 'Ruhetag', dauer_min: null, uebungen: [], lauf: null, hinweis: null } satisfies PlanTag;
  });

  const ergebnis = PlanSchema.safeParse({ version: 1, woche_von: woche.von, woche_bis: woche.bis, tage: vollstaendig });
  if (!ergebnis.success) {
    return { plan: null, warnungen: [...warnungen, ...ergebnis.error.issues.map((i) => i.message)] };
  }
  return { plan: ergebnis.data, warnungen: [...warnungen, ...pruefePlanRegeln(ergebnis.data)] };
}
