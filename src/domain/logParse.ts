/**
 * Liest Log-Zeilen aus dem Doc – tolerant, weil frühere Einträge von Hand
 * geschrieben und nicht immer sauber formatiert sind.
 *
 * Versteht u. a.:
 *   „Kniebeuge 3×8×57,5 kg (8/8/7)“, „Kniebeuge 3 x 8 x 57.5kg“, „Kniebeuge 60 kg 3x8“,
 *   „Klimmzüge 3×7 (KG)“, „Kreuzheben 3×10×60/65/70 kg“, „Bankdrücken 4 Sätze à 8 mit 60 kg“,
 *   „5 km, 31:20, 6:16/km (locker)“, „Lauf 5km in 30 min“.
 */
import { parseDezimal, parseZeit } from './calc';
import { deutschZuIso } from './dates';
import { saeubereText } from './docSnapshot';
import { findeAppId } from './einheit';
import type { LaufArt } from './planSchema';

export interface GeparsterSatz {
  kg: number | null;
  wdh: number;
}
export interface GeparsteUebung {
  name: string;
  koerpergewicht: boolean;
  saetze: GeparsterSatz[];
}
export interface GeparsterLauf {
  distanzKm: number;
  dauerSek: number | null;
  art: LaufArt | null;
}
export type GeparsterInhalt =
  | { typ: 'gym'; uebungen: GeparsteUebung[] }
  | { typ: 'lauf'; lauf: GeparsterLauf }
  | { typ: 'ausgelassen' }
  | { typ: 'unbekannt' };

export interface GeparsteLogZeile {
  datum: string | null;
  einheit: string;
  wasGemacht: string;
  gefuehl: number | null;
  anmerkungen: string;
  appId: string | null;
  inhalt: GeparsterInhalt;
}

const ZAHL = String.raw`\d+(?:[.,]\d+)?`;

/** „3 x 8 x 57.5“ → „3×8×57.5“ (nur zwischen Zahlen). */
function vereinheitlicheMal(s: string): string {
  return s.replace(/(\d)\s*[xX*×]\s*(?=\d)/g, '$1×');
}

/** Eine einzelne Übung lesen. Gibt null zurück, wenn keine Sätze/Wdh. erkennbar sind. */
export function parseUebungText(teil: string): GeparsteUebung | null {
  const t = vereinheitlicheMal(teil.trim());
  const nameTreffer = t.match(/^([^\d(]*[^\d(\s:–-])\s*[:–-]?\s*/);
  const name = nameTreffer?.[1]?.trim();
  if (!name) return null;

  // Sätze × Wdh. – oder „4 Sätze à 8“
  const sw = t.match(/(\d+)×(\d+)/) ?? t.match(/(\d+)\s*Sätze?\s*(?:à|a|zu|mit)?\s*(\d+)/i);
  if (!sw) return null;
  let anzahl = Number(sw[1]);
  const wdh = Number(sw[2]);

  // Geschaffte Wdh. pro Satz in Klammern: „(8/8/7)“
  const proSatz = t.match(/\((\d+(?:\s*\/\s*\d+)+)\)/)?.[1]?.split('/').map((x) => Number(x.trim()));
  if (proSatz) anzahl = proSatz.length;

  // Gewicht(e): „57,5 kg“, „60/65/70 kg“, „×57,5“ ohne Einheit, „(KG +10 kg)“
  const kgTreffer = t.match(new RegExp(`(${ZAHL}(?:\\s*\\/\\s*${ZAHL})*)\\s*kg\\b`, 'i'));
  const ohneEinheit = t.match(new RegExp(`\\d+×\\d+[^×(]*×\\s*(${ZAHL}(?:\\/${ZAHL})*)`));
  const gewichtText = kgTreffer?.[1] ?? ohneEinheit?.[1] ?? null;
  const gewichte = gewichtText ? gewichtText.split('/').map((g) => parseDezimal(g.trim())) : [];

  const koerpergewicht = /\(KG\b|körpergewicht|\bBW\b/i.test(t);

  const saetze: GeparsterSatz[] = Array.from({ length: anzahl }, (_, i) => ({
    wdh: proSatz?.[i] ?? wdh,
    kg: gewichte.length === anzahl ? (gewichte[i] ?? null) : (gewichte[0] ?? null),
  }));
  return { name, koerpergewicht, saetze };
}

function erkenneArt(text: string): LaufArt | null {
  if (/intervall/i.test(text)) return 'intervall';
  if (/tempo/i.test(text)) return 'tempo';
  if (/\blang/i.test(text)) return 'lang';
  if (/locker|easy|ruhig/i.test(text)) return 'locker';
  return null;
}

/** „5 km, 31:20, 6:16/km (locker)“ oder „Lauf 5km in 30 min“ */
export function parseLaufText(text: string): GeparsterLauf | null {
  const t = saeubereText(text);
  const distanz = t.match(new RegExp(`(${ZAHL})\\s*km\\b(?!\\s*\\/\\s*h)`, 'i'));
  if (!distanz) return null;
  // Zeiten, die keine Pace sind (nicht „…/km“)
  const zeiten = [...t.matchAll(/(\d{1,2}:\d{2}(?::\d{2})?)(?!\d)(?!\s*(?:min)?\s*\/\s*km)/g)].map((m) => m[1]!);
  let dauerSek = zeiten.length ? parseZeit(zeiten[0]!) : null;
  if (dauerSek === null) {
    const minuten = t.match(/(\d+)\s*min(?:uten|\.)?\b(?!\s*\/\s*km)/i);
    if (minuten) dauerSek = Number(minuten[1]) * 60;
  }
  return { distanzKm: parseDezimal(distanz[1]!) ?? 0, dauerSek, art: erkenneArt(t) };
}

/** Inhalt der Spalte „Was gemacht“ deuten. */
export function parseWasGemacht(text: string): GeparsterInhalt {
  const t = saeubereText(text);
  if (!t) return { typ: 'unbekannt' };
  if (/^ausgelassen\b/i.test(t)) return { typ: 'ausgelassen' };

  if (/\d\s*km\b/i.test(t) && !/\d\s*kg\b/i.test(t)) {
    const lauf = parseLaufText(t);
    if (lauf) return { typ: 'lauf', lauf };
  }

  // Übungen trennen: „;“, Zeilenumbruch, „•“ oder „, “ vor einem Wort (nicht „57,5“)
  const teile = t.split(/\s*[;\n•]\s*|,\s+(?=[A-Za-zÄÖÜäöüß])/).filter(Boolean);
  const uebungen = teile.map(parseUebungText).filter((u): u is GeparsteUebung => u !== null);
  return uebungen.length ? { typ: 'gym', uebungen } : { typ: 'unbekannt' };
}

/**
 * Eine Zeile der Log-Tabelle lesen. Leere Zeilen und die Vorlagezeile ergeben null.
 * @param fallbackJahr Jahr für Daten ohne Jahreszahl („23.11.“)
 */
export function parseLogZeile(zellen: string[], fallbackJahr: number): GeparsteLogZeile | null {
  const [datumRoh = '', einheit = '', wasGemacht = '', gefuehlRoh = '', anmerkungen = ''] = zellen.map(saeubereText);
  if (![datumRoh, einheit, wasGemacht, gefuehlRoh, anmerkungen].some((z) => z !== '')) return null;
  if (/vorlage/i.test(datumRoh)) return null;

  const gefuehlZahl = gefuehlRoh.match(/\d+(?:[.,]\d+)?/)?.[0];
  const gefuehl = gefuehlZahl ? parseDezimal(gefuehlZahl) : null;

  return {
    datum: deutschZuIso(datumRoh, fallbackJahr),
    einheit,
    wasGemacht,
    gefuehl: gefuehl !== null && gefuehl >= 1 && gefuehl <= 10 ? gefuehl : null,
    anmerkungen,
    appId: findeAppId(anmerkungen),
    inhalt: parseWasGemacht(wasGemacht),
  };
}
