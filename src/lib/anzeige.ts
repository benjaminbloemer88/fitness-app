/**
 * Kleine Helfer für die Anzeige von Plantagen.
 */
import { formatDezimal } from '../domain/calc';
import type { Einheit } from '../domain/einheit';
import type { PlanTag } from '../domain/planSchema';

export type PlanStatus = 'erledigt' | 'ausgelassen' | 'laeuft' | 'offen';

/** Status eines Plantags anhand der erfassten Einheiten. */
export function planStatus(planDatum: string, einheiten: Einheit[]): PlanStatus {
  const zumTag = einheiten.filter((e) => e.planDatum === planDatum);
  if (zumTag.some((e) => e.status === 'abgeschlossen')) return 'erledigt';
  if (zumTag.some((e) => e.status === 'ausgelassen')) return 'ausgelassen';
  if (zumTag.some((e) => e.status === 'laeuft')) return 'laeuft';
  return 'offen';
}

/** „Gym C – Ganzkörper“ → „Gym C“, Läufe → „Lauf locker“ */
export function kurzTitel(tag: PlanTag): string {
  if (tag.typ === 'lauf') return `Lauf ${tag.lauf?.art ?? ''}`.trim();
  return tag.titel.split(' – ')[0] ?? tag.titel;
}

/** „75 Min · 8 Übungen“ bzw. „5 km · 35 Min“ */
export function kurzInfo(tag: PlanTag): string {
  const teile =
    tag.typ === 'lauf'
      ? [tag.lauf ? `${formatDezimal(tag.lauf.distanz_km)} km` : null, tag.dauer_min ? `${tag.dauer_min} Min` : null]
      : [tag.dauer_min ? `${tag.dauer_min} Min` : null, tag.uebungen.length ? `${tag.uebungen.length} Übungen` : null];
  return teile.filter(Boolean).join(' · ');
}
