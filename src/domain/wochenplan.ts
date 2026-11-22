/**
 * Wochenplanung mit Verschiebungen.
 *
 * Der Plan im Doc gehört dem Coach und wird von der App nie geändert.
 * Verschiebt Benjamin einen Trainingstag („heute statt morgen“), merkt sich die App
 * das lokal als Verschiebung: Plandatum → Zieldatum. Daraus ergibt sich der
 * „effektive“ Tag jeder Einheit.
 */
import type { PlanTag } from './planSchema';

export interface Verschiebung {
  /** Datum laut Plan (Schlüssel). */
  planDatum: string;
  /** Tag, an dem die Einheit stattdessen stattfinden soll. */
  zielDatum: string;
}

export interface EffektiveEinheit {
  tag: PlanTag;
  /** Tag, an dem die Einheit jetzt stattfindet. */
  datum: string;
  /** Ursprüngliches Plandatum, falls verschoben – sonst null. */
  verschobenVon: string | null;
}

/** Alle Trainingstage (ohne Ruhetage) mit ihrem effektiven Datum, nach Datum sortiert. */
export function effektiveEinheiten(tage: PlanTag[], verschiebungen: Verschiebung[]): EffektiveEinheit[] {
  const ziel = new Map(verschiebungen.map((v) => [v.planDatum, v.zielDatum]));
  return tage
    .filter((t) => t.typ !== 'ruhe')
    .map((tag) => {
      const datum = ziel.get(tag.datum) ?? tag.datum;
      return { tag, datum, verschobenVon: datum !== tag.datum ? tag.datum : null };
    })
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.tag.datum.localeCompare(b.tag.datum));
}

/** Einheiten, die an einem Datum stattfinden. */
export function einheitenAm(effektiv: EffektiveEinheit[], datum: string): EffektiveEinheit[] {
  return effektiv.filter((e) => e.datum === datum);
}

/** Einheiten, die von einem Plandatum weg verschoben wurden. */
export function wegVerschoben(effektiv: EffektiveEinheit[], planDatum: string): EffektiveEinheit[] {
  return effektiv.filter((e) => e.verschobenVon === planDatum);
}

/**
 * Nächste offene Einheiten ab einem Datum (ohne die, die schon erledigt oder ausgelassen sind).
 * @param fertig Plandaten mit abgeschlossener oder ausgelassener Einheit
 */
export function offeneEinheitenAb(effektiv: EffektiveEinheit[], abDatum: string, fertig: Set<string>): EffektiveEinheit[] {
  return effektiv.filter((e) => e.datum >= abDatum && !fertig.has(e.tag.datum));
}

/**
 * Berechnet die Verschiebungen für „A auf Tag X verschieben“.
 * Mit `tauschen` wandern Einheiten, die an Tag X liegen, auf A's bisherigen Tag.
 * Verschiebungen zurück aufs eigene Plandatum werden entfernt (= aufgehoben).
 */
export function verschiebe(
  effektiv: EffektiveEinheit[],
  verschiebungen: Verschiebung[],
  planDatum: string,
  zielDatum: string,
  tauschen = false,
): Verschiebung[] {
  const ergebnis = new Map(verschiebungen.map((v) => [v.planDatum, v.zielDatum]));
  const bewegt = effektiv.find((e) => e.tag.datum === planDatum);
  if (!bewegt) return verschiebungen;
  const bisher = bewegt.datum;

  const setze = (pd: string, ziel: string) => {
    if (ziel === pd) ergebnis.delete(pd);
    else ergebnis.set(pd, ziel);
  };
  if (tauschen) {
    for (const andere of einheitenAm(effektiv, zielDatum)) {
      if (andere.tag.datum !== planDatum) setze(andere.tag.datum, bisher);
    }
  }
  setze(planDatum, zielDatum);
  return [...ergebnis.entries()].map(([pd, zd]) => ({ planDatum: pd, zielDatum: zd }));
}
