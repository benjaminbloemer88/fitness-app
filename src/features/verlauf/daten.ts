/**
 * Gemeinsame Daten und Helfer für Verlauf-Übersicht und -Detail.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../../db/db';
import { formatDezimal } from '../../domain/calc';
import { formatUebung } from '../../domain/logFormat';
import { fuehreZusammen } from '../../domain/verlauf';
import { useEinheiten } from '../../hooks/daten';

/** Alle Verlaufseinträge (App-Einheiten + importierte Doc-Zeilen), nach Datum sortiert. */
export function useVerlaufsDaten() {
  const einheiten = useEinheiten();
  const importe = useLiveQuery(() => db.logImport.toArray(), [], []);
  const eintraege = useMemo(() => fuehreZusammen(einheiten, importe, new Date().getFullYear()), [einheiten, importe]);
  return { einheiten, eintraege };
}

/** Sätze als „3×12×50 kg“ bzw. „3×7 (KG)“ */
export function saetzeText(saetze: { kg: number | null; wdh: number }[]): string {
  const koerpergewicht = saetze.every((s) => !s.kg);
  const text = formatUebung({
    name: '',
    planName: null,
    ziel: null,
    koerpergewicht,
    saetze: saetze.map((s) => ({ kg: s.kg, wdh: s.wdh, erledigt: true })),
  });
  return (text ?? '').trim();
}

export const ZEITRAEUME = [
  { schluessel: '4w', text: '4 Wo', tage: 28 },
  { schluessel: '3m', text: '3 Mon', tage: 91 },
  { schluessel: 'alle', text: 'Alle', tage: null },
] as const;
export type Zeitraum = (typeof ZEITRAEUME)[number]['schluessel'];

/** Vorzeichen mit echtem Minus: „+2,5 kg“ / „−5 kg“ / „±0 kg“ */
export function mitVorzeichen(n: number, einheit: string): string {
  if (n === 0) return `±0${einheit}`;
  return `${n > 0 ? '+' : '−'}${formatDezimal(Math.abs(n), 1)}${einheit}`;
}
