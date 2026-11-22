/**
 * So sieht das Google-Doc für die App aus: eine flache Liste von Blöcken
 * (Überschriften, Absätze, Tabellen) in der Reihenfolge des Docs.
 *
 * Die Apps-Script-Brücke liefert genau diese Struktur. Alles Weitere
 * (Plan finden, JSON prüfen, Log-Zeilen lesen) passiert hier in TypeScript.
 */

export type DocBlock =
  | { typ: 'ueberschrift'; ebene: number; text: string }
  | { typ: 'absatz'; text: string }
  | { typ: 'tabelle'; zeilen: string[][] };

export interface DocSnapshot {
  titel: string;
  bloecke: DocBlock[];
}

/** Die erwarteten Spalten der Log-Tabelle (Reihenfolge wie im Doc). */
export const LOG_SPALTEN = ['Datum', 'Einheit', 'Was gemacht', 'Gefühl 1–10', 'Anmerkungen'] as const;

/**
 * Typografische Zeichen und Sonder-Leerzeichen aus Google Docs vereinheitlichen.
 * Wichtig fürs JSON: „…“ und “…” werden zu geraden Anführungszeichen.
 */
export function normalisiereZeichen(s: string): string {
  return s
    .replace(/[“”„‟″«»]/g, '"')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[   ]/g, ' ')
    .replace(/\u000B|\r\n?/g, '\n');
}

/**
 * Entfernt Markdown-Reste, die der Coach manchmal wörtlich ins Doc schreibt:
 * „**Mo 23.11.**“ → „Mo 23.11.“, „\_\_“ → „__“, „*Vorlage*“ → „Vorlage“.
 */
export function entferneMarkdown(s: string): string {
  return s
    .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, '$1')
    .replace(/\*\*/g, '')
    .split('\n')
    .map((zeile) => zeile.replace(/^\s*\*(.+)\*\s*$/, '$1'))
    .join('\n');
}

/** Zellen-/Absatztext säubern: Zeichen normalisieren, Markdown weg, Leerzeichen zusammenfassen. */
export function saeubereText(s: string): string {
  return entferneMarkdown(normalisiereZeichen(s))
    .split('\n')
    .map((z) => z.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
}

/** Überschrift ohne Nummerierung: „2. Aktueller Wochenplan – …“ → „Aktueller Wochenplan – …“ */
export function ueberschriftOhneNummer(text: string): string {
  return saeubereText(text).replace(/^\d+(\.\d+)*\.?\s+/, '');
}

/** Index der ersten Überschrift, deren Text (ohne Nummer) zum Muster passt, sonst -1. */
export function findeUeberschrift(doc: DocSnapshot, muster: RegExp): number {
  return doc.bloecke.findIndex((b) => b.typ === 'ueberschrift' && muster.test(ueberschriftOhneNummer(b.text)));
}

/** Alle Blöcke eines Abschnitts: von der Überschrift bis zur nächsten Überschrift gleicher oder höherer Ebene. */
export function abschnittsBloecke(doc: DocSnapshot, ueberschriftIndex: number): DocBlock[] {
  const kopf = doc.bloecke[ueberschriftIndex];
  if (!kopf || kopf.typ !== 'ueberschrift') return [];
  const ergebnis: DocBlock[] = [];
  for (let i = ueberschriftIndex + 1; i < doc.bloecke.length; i++) {
    const b = doc.bloecke[i]!;
    if (b.typ === 'ueberschrift' && b.ebene <= kopf.ebene) break;
    ergebnis.push(b);
  }
  return ergebnis;
}

/** Text aller Absätze und Überschriften (ohne Tabellen), Zeile für Zeile. */
export function absatzTexte(doc: DocSnapshot): string[] {
  return doc.bloecke.flatMap((b) => (b.typ === 'tabelle' ? [] : [b.text]));
}

/** Prüft, ob eine Tabellenzeile die Kopfzeile der Log-Tabelle ist. */
export function istLogKopfzeile(zeile: string[]): boolean {
  const z = zeile.map((c) => saeubereText(c).toLowerCase());
  return (
    z.length >= 5 &&
    z[0] === 'datum' &&
    z[1] === 'einheit' &&
    z[2]?.startsWith('was gemacht') === true &&
    z[3]?.startsWith('gefühl') === true &&
    z[4]?.startsWith('anmerkungen') === true
  );
}

/** Findet die Log-Tabelle (erkennbar an ihrer Kopfzeile). */
export function findeLogTabelle(doc: DocSnapshot): string[][] | null {
  for (const b of doc.bloecke) {
    if (b.typ === 'tabelle' && b.zeilen[0] && istLogKopfzeile(b.zeilen[0])) return b.zeilen;
  }
  return null;
}
