/**
 * Berechnet die Datenreihen für den Verlauf aus lokalen Einheiten und
 * aus dem Doc importierten Log-Zeilen.
 */
import { formatDezimal, formatPace, paceSekProKm, volumen } from './calc';
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
  /** schwerstes Gewicht des Tages (0 = nur Körpergewicht) */
  topKg: number;
  /** meiste Wiederholungen mit dem Top-Gewicht */
  wdhBeiTop: number;
  /** Summe aller Wiederholungen */
  wdhGesamt: number;
  /** Summe Gewicht × Wiederholungen */
  volumen: number;
  /** alle Sätze des Tages (für die Anzeige „3×12×50 kg“) */
  saetze: { kg: number | null; wdh: number }[];
}

/** Pro Tag: Top-Gewicht (mit Wdh.), Wiederholungen gesamt, Volumen. */
export function uebungsVerlauf(eintraege: VerlaufsEintrag[], name: string): UebungsPunkt[] {
  const schluessel = uebungsSchluessel(name);
  const proTag = new Map<string, UebungsPunkt>();
  for (const e of eintraege) {
    for (const u of e.uebungen) {
      if (uebungsSchluessel(u.name) !== schluessel) continue;
      const punkt = proTag.get(e.datum) ?? { datum: e.datum, topKg: 0, wdhBeiTop: 0, wdhGesamt: 0, volumen: 0, saetze: [] };
      punkt.saetze.push(...u.saetze);
      punkt.topKg = Math.max(0, ...punkt.saetze.map((s) => s.kg ?? 0));
      punkt.wdhBeiTop = Math.max(0, ...punkt.saetze.filter((s) => (s.kg ?? 0) === punkt.topKg).map((s) => s.wdh));
      punkt.wdhGesamt = punkt.saetze.reduce((n, s) => n + s.wdh, 0);
      punkt.volumen = volumen(punkt.saetze);
      proTag.set(e.datum, punkt);
    }
  }
  return [...proTag.values()].sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Nur Punkte ab einem Datum (Zeitraum-Filter); `null` = alle. */
export function abDatum<T extends { datum: string }>(punkte: T[], ab: string | null): T[] {
  return ab ? punkte.filter((p) => p.datum >= ab) : punkte;
}

export interface Bestleistung {
  datum: string;
  titel: string;
  text: string;
  art: 'gewicht' | 'volumen' | 'pace' | 'distanz';
}

/**
 * Neue Bestleistungen: Einheiten, die eine frühere Bestmarke übertroffen haben
 * (die allererste Einheit einer Übung zählt nicht – sie setzt nur die Basis).
 * Gewicht: schwerer – oder gleich schwer mit mehr Wiederholungen. Lauf: schnellste Pace (ab 3 km), längste Strecke.
 */
export function bestleistungen(eintraege: VerlaufsEintrag[], seit: string): Bestleistung[] {
  const ergebnis: Bestleistung[] = [];
  for (const name of uebungsNamen(eintraege)) {
    let besteKg: { kg: number; wdh: number } | null = null;
    let bestesVolumen: number | null = null;
    for (const p of uebungsVerlauf(eintraege, name)) {
      if (p.topKg > 0) {
        const besser = besteKg && (p.topKg > besteKg.kg || (p.topKg === besteKg.kg && p.wdhBeiTop > besteKg.wdh));
        if (besser && p.datum >= seit) {
          ergebnis.push({ datum: p.datum, titel: `${name} · ${formatDezimal(p.topKg)} kg × ${p.wdhBeiTop}`, text: 'schwerster Satz bisher', art: 'gewicht' });
        }
        if (!besteKg || besser) besteKg = { kg: p.topKg, wdh: p.wdhBeiTop };
      }
      if (p.volumen > 0) {
        if (bestesVolumen !== null && p.volumen > bestesVolumen && p.datum >= seit) {
          ergebnis.push({ datum: p.datum, titel: `${name} · ${formatTausend(p.volumen)} kg`, text: 'meistes Volumen bisher', art: 'volumen' });
        }
        bestesVolumen = Math.max(bestesVolumen ?? 0, p.volumen);
      }
    }
  }
  let bestePace: number | null = null;
  let weiteste: number | null = null;
  for (const l of paceVerlauf(eintraege)) {
    if (l.km >= 3) {
      if (bestePace !== null && l.paceSek < bestePace && l.datum >= seit) {
        ergebnis.push({ datum: l.datum, titel: `Lauf · ${formatPace(l.paceSek)} /km`, text: `schnellste Pace bisher (${formatDezimal(l.km)} km)`, art: 'pace' });
      }
      bestePace = Math.min(bestePace ?? Infinity, l.paceSek);
    }
    if (weiteste !== null && l.km > weiteste && l.datum >= seit) {
      ergebnis.push({ datum: l.datum, titel: `Lauf · ${formatDezimal(l.km)} km`, text: 'längster Lauf bisher', art: 'distanz' });
    }
    weiteste = Math.max(weiteste ?? 0, l.km);
  }
  return ergebnis.sort((a, b) => b.datum.localeCompare(a.datum));
}

/** 1600 → „1.600“ */
export function formatTausend(n: number): string {
  return Math.round(n).toLocaleString('de-DE');
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
