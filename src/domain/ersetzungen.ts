/**
 * Übungen tauschen – nur lokal in der App (der Plan im Doc bleibt unverändert).
 *
 * Zwei Arten:
 * - Tages-Tausch: an einem Plantag eine Übung durch eine andere ersetzen.
 * - Regel „immer“: eine Übung in allen Plänen automatisch ersetzen.
 * Ein Tages-Eintrag geht vor; ist sein Ersatz die Originalübung, gilt an diesem Tag
 * ausdrücklich das Original (auch wenn eine Regel existiert).
 */
import { uebungsSchluessel } from './einheit';
import type { PlanTag, Uebung } from './planSchema';

export interface Ersetzung {
  /** „2026-11-25|bulgarian split squat“ oder „immer|bulgarian split squat“ */
  id: string;
  /** Plantag, für den der Tausch gilt – null bei einer Regel „immer“. */
  planDatum: string | null;
  /** Übung laut Plan */
  original: string;
  /** stattdessen gemachte Übung */
  ersatz: string;
}

export function ersetzungsId(planDatum: string | null, original: string): string {
  return `${planDatum ?? 'immer'}|${uebungsSchluessel(original)}`;
}

/** Welche Ersetzung gilt für diese Übung an diesem Plantag? null = Original. */
export function ersetzungFuer(liste: Ersetzung[], planDatum: string, original: string): Ersetzung | null {
  const tag = liste.find((e) => e.id === ersetzungsId(planDatum, original));
  if (tag) return uebungsSchluessel(tag.ersatz) === uebungsSchluessel(tag.original) ? null : tag;
  return liste.find((e) => e.id === ersetzungsId(null, original)) ?? null;
}

/** Gibt es eine Regel „immer ersetzen“ für diese Übung? */
export function regelFuer(liste: Ersetzung[], original: string): Ersetzung | null {
  return liste.find((e) => e.id === ersetzungsId(null, original)) ?? null;
}

export interface AngezeigteUebung {
  /** Übung laut Plan */
  original: Uebung;
  /** Name, der tatsächlich gemacht wird */
  name: string;
  ersetzung: Ersetzung | null;
}

/** Übungen eines Plantags mit angewandten Ersetzungen. */
export function uebungenMitErsetzungen(tag: PlanTag, liste: Ersetzung[]): AngezeigteUebung[] {
  return tag.uebungen.map((u) => {
    const ersetzung = ersetzungFuer(liste, tag.datum, u.name);
    return { original: u, name: ersetzung?.ersatz ?? u.name, ersetzung };
  });
}
