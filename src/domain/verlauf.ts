/**
 * Berechnet die Datenreihen für den Verlauf aus lokalen Einheiten und
 * (später) aus dem Doc importierten Log-Zeilen.
 */
import { epley1RM, paceSekProKm, volumen } from './calc';
import { montagDerWoche } from './dates';
import { uebungsSchluessel, type Einheit } from './einheit';
import { parseLogZeile, type GeparsterInhalt } from './logParse';

/** Einheitliche Form, egal ob aus der App oder aus dem Doc-Import. */
export interface VerlaufsEintrag {
  datum: string;
  quelle: 'app' | 'import';
  gefuehl: number | null;
  ausgelassen: boolean;
  uebungen: { name: string; saetze: { kg: number | null; wdh: number }[] }[];
  lauf: { distanzKm: number; dauerSek: number | null } | null;
}

export function ausEinheit(e: Einheit): VerlaufsEintrag {
  return {
    datum: e.datum,
    quelle: 'app',
    gefuehl: e.status === 'abgeschlossen' ? e.gefuehl : null,
    ausgelassen: e.status === 'ausgelassen',
    uebungen: e.uebungen
      .map((u) => ({
        name: u.name,
        saetze: u.saetze.filter((s) => s.erledigt && (s.wdh ?? 0) > 0).map((s) => ({ kg: s.kg, wdh: s.wdh as number })),
      }))
      .filter((u) => u.saetze.length > 0),
    lauf: e.typ === 'lauf' && e.lauf?.distanzKm ? { distanzKm: e.lauf.distanzKm, dauerSek: e.lauf.dauerSek } : null,
  };
}

function ausInhalt(inhalt: GeparsterInhalt): Pick<VerlaufsEintrag, 'uebungen' | 'lauf' | 'ausgelassen'> {
  if (inhalt.typ === 'gym') return { uebungen: inhalt.uebungen.map((u) => ({ name: u.name, saetze: u.saetze })), lauf: null, ausgelassen: false };
  if (inhalt.typ === 'lauf') return { uebungen: [], lauf: { distanzKm: inhalt.lauf.distanzKm, dauerSek: inhalt.lauf.dauerSek }, ausgelassen: false };
  return { uebungen: [], lauf: null, ausgelassen: inhalt.typ === 'ausgelassen' };
}

/** Importierte Doc-Zeile → Verlaufseintrag (null, wenn nicht lesbar). */
export function ausImport(zellen: string[], fallbackJahr: number): VerlaufsEintrag | null {
  const z = parseLogZeile(zellen, fallbackJahr);
  if (!z?.datum || z.inhalt.typ === 'unbekannt') return null;
  return { datum: z.datum, quelle: 'import', gefuehl: z.gefuehl, ...ausInhalt(z.inhalt) };
}

/** Alle Einträge zusammenführen: App-Einheiten haben Vorrang vor importierten Zeilen mit gleicher Kennung. */
export function fuehreZusammen(
  einheiten: Einheit[],
  importe: { zellen: string[]; appId: string | null }[],
  fallbackJahr: number,
): VerlaufsEintrag[] {
  const appIds = new Set(einheiten.map((e) => e.id));
  const ausApp = einheiten.filter((e) => e.status !== 'laeuft').map(ausEinheit);
  const ausDoc = importe
    .filter((z) => !z.appId || !appIds.has(z.appId))
    .map((z) => ausImport(z.zellen, fallbackJahr))
    .filter((e): e is VerlaufsEintrag => e !== null);
  return [...ausApp, ...ausDoc].sort((a, b) => a.datum.localeCompare(b.datum));
}

export interface UebungsPunkt {
  datum: string;
  topKg: number;
  e1rm: number;
  volumen: number;
}

/** Pro Tag: Top-Gewicht, bestes geschätztes 1RM (Epley), Volumen. */
export function uebungsVerlauf(eintraege: VerlaufsEintrag[], name: string): UebungsPunkt[] {
  const schluessel = uebungsSchluessel(name);
  const proTag = new Map<string, UebungsPunkt>();
  for (const e of eintraege) {
    for (const u of e.uebungen) {
      if (uebungsSchluessel(u.name) !== schluessel) continue;
      const mitGewicht = u.saetze.filter((s) => (s.kg ?? 0) > 0);
      const punkt = proTag.get(e.datum) ?? { datum: e.datum, topKg: 0, e1rm: 0, volumen: 0 };
      punkt.topKg = Math.max(punkt.topKg, ...mitGewicht.map((s) => s.kg as number), 0);
      punkt.e1rm = Math.max(punkt.e1rm, ...mitGewicht.map((s) => epley1RM(s.kg as number, s.wdh)), 0);
      punkt.volumen += volumen(u.saetze);
      proTag.set(e.datum, punkt);
    }
  }
  return [...proTag.values()].sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Alle Übungen mit mindestens einem gewichteten Satz, häufigste zuerst. */
export function uebungsNamen(eintraege: VerlaufsEintrag[]): string[] {
  const zaehler = new Map<string, { name: string; anzahl: number }>();
  for (const e of eintraege) {
    for (const u of e.uebungen) {
      const k = uebungsSchluessel(u.name);
      const z = zaehler.get(k) ?? { name: u.name, anzahl: 0 };
      z.anzahl++;
      zaehler.set(k, z);
    }
  }
  return [...zaehler.values()].sort((a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name, 'de')).map((z) => z.name);
}

export function paceVerlauf(eintraege: VerlaufsEintrag[]): { datum: string; paceSek: number; km: number }[] {
  return eintraege.flatMap((e) => {
    const pace = e.lauf?.dauerSek ? paceSekProKm(e.lauf.distanzKm, e.lauf.dauerSek) : null;
    return pace && e.lauf ? [{ datum: e.datum, paceSek: Math.round(pace), km: e.lauf.distanzKm }] : [];
  });
}

export function gefuehlVerlauf(eintraege: VerlaufsEintrag[]): { datum: string; gefuehl: number }[] {
  return eintraege.flatMap((e) => (e.gefuehl !== null && !e.ausgelassen ? [{ datum: e.datum, gefuehl: e.gefuehl }] : []));
}

/** Erledigte Einheiten pro Woche (Montag als Schlüssel). */
export function einheitenProWoche(eintraege: VerlaufsEintrag[]): { woche: string; anzahl: number }[] {
  const zaehler = new Map<string, number>();
  for (const e of eintraege) {
    if (e.ausgelassen) continue;
    const w = montagDerWoche(e.datum);
    zaehler.set(w, (zaehler.get(w) ?? 0) + 1);
  }
  return [...zaehler.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([woche, anzahl]) => ({ woche, anzahl }));
}
