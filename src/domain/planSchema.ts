/**
 * Zod-Schema für die Plan-Daten, die der „Trainingscoach“ zwischen
 * PLAN-JSON-START und PLAN-JSON-END ins Doc schreibt (Schritt 5 im Aufgabentext).
 *
 * Aus dem Schema leiten wir die TypeScript-Typen ab (z.output), damit Schema
 * und Typen nie auseinanderlaufen.
 *
 * Wir sind beim Einlesen bewusst etwas großzügiger als der Aufgabentext
 * (z. B. Zahl als Text, fehlende „hinweis“-Felder), damit ein kleiner
 * Formatfehler des Coaches nicht den ganzen Plan unbrauchbar macht.
 */
import { z } from 'zod';
import { istIsoDatum, plusTage, wochentagIndex } from './dates';
import { parseDezimal } from './calc';

/** Text → Zahl (akzeptiert auch „57,5“), alles andere bleibt unverändert. */
const zahlAusText = (v: unknown) => (typeof v === 'string' ? (parseDezimal(v) ?? v) : v);

/** Optionaler Text: fehlt das Feld oder ist es leer, wird null daraus. */
const optionalerText = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : null));

const isoDatum = z.string().refine(istIsoDatum, 'Datum muss JJJJ-MM-TT sein');

export const UebungSchema = z.object({
  name: z.string().trim().min(1),
  saetze: z.preprocess(zahlAusText, z.number().int().positive()),
  // „8“, „10 je Bein“, „30 s“ – Zahlen werden zu Text gemacht
  wdh: z.preprocess((v) => (typeof v === 'number' ? String(v) : v), z.string().trim().min(1)),
  gewicht_kg: z.preprocess(zahlAusText, z.number().nonnegative().nullable()).default(null),
  hinweis: optionalerText,
});

export const LAUF_ARTEN = ['locker', 'intervall', 'tempo', 'lang'] as const;

export const LaufSchema = z.object({
  art: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase().trim() : v), z.enum(LAUF_ARTEN)),
  distanz_km: z.preprocess(zahlAusText, z.number().positive()),
  pace_von: optionalerText,
  pace_bis: optionalerText,
  hinweis: optionalerText,
});

export const TAG_TYPEN = ['gym', 'lauf', 'ruhe'] as const;

export const TagSchema = z.object({
  datum: isoDatum,
  typ: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase().trim() : v), z.enum(TAG_TYPEN)),
  titel: z.string().trim().min(1),
  dauer_min: z.preprocess(zahlAusText, z.number().nonnegative().nullable()).default(null),
  uebungen: z.array(UebungSchema).default([]),
  lauf: LaufSchema.nullable().default(null),
  hinweis: optionalerText,
});

export const PlanSchema = z
  .object({
    version: z.literal(1),
    woche_von: isoDatum,
    woche_bis: isoDatum,
    tage: z.array(TagSchema).length(7, 'Es müssen genau 7 Tage (Mo–So) sein'),
  })
  .superRefine((plan, ctx) => {
    // Struktur-Prüfung: Tage müssen lückenlos ab woche_von laufen.
    if (plusTage(plan.woche_von, 6) !== plan.woche_bis) {
      ctx.addIssue({ code: 'custom', path: ['woche_bis'], message: 'woche_bis muss 6 Tage nach woche_von liegen' });
    }
    plan.tage.forEach((tag, i) => {
      const erwartet = plusTage(plan.woche_von, i);
      if (tag.datum !== erwartet) {
        ctx.addIssue({
          code: 'custom',
          path: ['tage', i, 'datum'],
          message: `Tag ${i + 1} sollte ${erwartet} sein, ist aber ${tag.datum}`,
        });
      }
    });
  });

export type Uebung = z.output<typeof UebungSchema>;
export type Lauf = z.output<typeof LaufSchema>;
export type LaufArt = (typeof LAUF_ARTEN)[number];
export type PlanTag = z.output<typeof TagSchema>;
export type TagTyp = (typeof TAG_TYPEN)[number];
export type Plan = z.output<typeof PlanSchema>;

/**
 * Inhaltliche Regeln aus dem Aufgabentext, die wir nur als Warnung melden
 * (der Plan ist trotzdem nutzbar).
 */
export function pruefePlanRegeln(plan: Plan): string[] {
  const warnungen: string[] = [];
  if (wochentagIndex(plan.woche_von) !== 0) warnungen.push(`woche_von (${plan.woche_von}) ist kein Montag.`);
  plan.tage.forEach((tag) => {
    if (tag.typ === 'ruhe' && (tag.uebungen.length > 0 || tag.lauf !== null)) {
      warnungen.push(`${tag.datum}: Ruhetag enthält Übungen oder einen Lauf.`);
    }
    if (tag.typ === 'lauf' && tag.lauf === null) warnungen.push(`${tag.datum}: Lauftag ohne Laufdaten.`);
    if (tag.typ === 'gym' && tag.uebungen.length === 0) warnungen.push(`${tag.datum}: Gym-Tag ohne Übungen.`);
  });
  return warnungen;
}

/**
 * Wandelt einen Plan in das JSON, das im Doc zwischen den Markern steht
 * (eine Zeile, gerade Anführungszeichen, Feldreihenfolge wie im Aufgabentext).
 */
export function planAlsJson(plan: Plan): string {
  const ordne = {
    version: plan.version,
    woche_von: plan.woche_von,
    woche_bis: plan.woche_bis,
    tage: plan.tage.map((t) => ({
      datum: t.datum,
      typ: t.typ,
      titel: t.titel,
      dauer_min: t.dauer_min,
      uebungen: t.uebungen.map((u) => ({
        name: u.name,
        saetze: u.saetze,
        wdh: u.wdh,
        gewicht_kg: u.gewicht_kg,
        hinweis: u.hinweis,
      })),
      lauf: t.lauf
        ? {
            art: t.lauf.art,
            distanz_km: t.lauf.distanz_km,
            pace_von: t.lauf.pace_von,
            pace_bis: t.lauf.pace_bis,
            hinweis: t.lauf.hinweis,
          }
        : null,
      hinweis: t.hinweis,
    })),
  };
  return JSON.stringify(ordne);
}
