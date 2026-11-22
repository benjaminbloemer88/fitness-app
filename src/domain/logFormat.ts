/**
 * Erzeugt Log-Zeilen exakt im Format, das der Trainingscoach auswertet:
 *
 *   Gym:   „Kniebeuge 3×8×57,5 kg (8/8/7); Bankdrücken 3×8×55 kg; Klimmzüge 3×7 (KG)“
 *   Lauf:  „5 km, 31:20, 6:16/km (locker)“
 *   Ausgelassen: Was gemacht = „ausgelassen“, Gefühl = „–“, Grund in den Anmerkungen.
 *   Anmerkungen enden immer mit „[app:xxxx]“.
 *
 * Regeln für Gym-Übungen:
 * - Es zählen nur abgehakte Sätze mit Wiederholungen.
 * - Haben alle Sätze dieselbe Wdh.-Zahl, steht nur diese Zahl („3×8“).
 * - Weichen sie ab, steht in der Mitte das Ziel aus dem Plan und in Klammern
 *   die geschafften Wdh. pro Satz („3×8×57,5 kg (8/8/7)“).
 * - Unterschiedliche Gewichte pro Satz: „3×10×60/65/70 kg“.
 */
import { formatDauer, formatDezimal, formatPace, paceSekProKm } from './calc';
import { formatTagKurz, isoZuDeutsch } from './dates';
import { appKennung, zerlegeWdh, type Einheit, type LaufErgebnis, type LogZeile, type UebungErgebnis } from './einheit';

/** Eine Übung als Log-Text, oder null, wenn kein Satz geschafft wurde. */
export function formatUebung(u: UebungErgebnis): string | null {
  const saetze = u.saetze.filter((s) => s.erledigt && (s.wdh ?? 0) > 0);
  if (saetze.length === 0) return null;

  const anzahl = saetze.length;
  const wdhListe = saetze.map((s) => s.wdh as number);
  const { zahl: zielWdh, zusatz } = zerlegeWdh(u.ziel?.wdh ?? '');
  const alleGleich = wdhListe.every((w) => w === wdhListe[0]);
  const mitte = alleGleich ? wdhListe[0]! : (zielWdh ?? Math.max(...wdhListe));
  const wdhText = zusatz === 's' ? `${mitte} s` : zusatz ? `${mitte} ${zusatz}` : `${mitte}`;
  const klammer = alleGleich ? '' : ` (${wdhListe.join('/')})`;

  const gewichte = saetze.map((s) => s.kg ?? 0);
  const hatGewicht = gewichte.some((kg) => kg > 0);
  const gleichesGewicht = gewichte.every((kg) => kg === gewichte[0]);
  const gewichtText = gleichesGewicht ? formatDezimal(gewichte[0]!) : gewichte.map((kg) => formatDezimal(kg)).join('/');

  const kopf = `${u.name.trim()} ${anzahl}×${wdhText}`;
  if (u.koerpergewicht) {
    return hatGewicht ? `${kopf} (KG +${gewichtText} kg)${klammer}` : `${kopf} (KG)${klammer}`;
  }
  return hatGewicht ? `${kopf}×${gewichtText} kg${klammer}` : `${kopf}${klammer}`;
}

/** Alle Übungen einer Gym-Einheit, getrennt durch „; “. */
export function formatGym(uebungen: UebungErgebnis[]): string {
  return uebungen
    .map(formatUebung)
    .filter((t): t is string => t !== null)
    .join('; ');
}

/** Automatische Anmerkungen: ausgelassene und getauschte Übungen (für den Coach hilfreich). */
export function autoAnmerkungen(uebungen: UebungErgebnis[]): string {
  const teile: string[] = [];
  const ausgelassen = uebungen.filter((u) => u.planName !== null && formatUebung(u) === null).map((u) => u.planName);
  if (ausgelassen.length) teile.push(`ausgelassen: ${ausgelassen.join(', ')}`);
  for (const u of uebungen) {
    if (u.planName && u.planName !== u.name.trim() && formatUebung(u) !== null) {
      teile.push(`getauscht: ${u.planName} → ${u.name.trim()}`);
    }
  }
  return teile.join('; ');
}

/** „5 km, 31:20, 6:16/km (locker)“ */
export function formatLauf(lauf: LaufErgebnis): string {
  const km = lauf.distanzKm ?? 0;
  const sek = lauf.dauerSek ?? 0;
  const pace = paceSekProKm(km, sek);
  return `${formatDezimal(km)} km, ${formatDauer(sek)}, ${pace ? formatPace(pace) : '–'}/km (${lauf.art})`;
}

/** Text einzeilig machen (Zeilenumbrüche würden die Tabellenzelle sprengen). */
const einzeilig = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();

/** Baut die komplette Log-Zeile einer abgeschlossenen oder ausgelassenen Einheit. */
export function erzeugeLogZeile(e: Einheit): LogZeile {
  const kennung = appKennung(e.id);
  const mitKennung = (...teile: (string | null | undefined)[]) => {
    const text = teile.map((t) => einzeilig(t ?? '')).filter(Boolean).join('; ');
    return text ? `${text} ${kennung}` : kennung;
  };

  if (e.status === 'ausgelassen') {
    return {
      datum: isoZuDeutsch(e.datum),
      einheit: e.titel,
      wasGemacht: 'ausgelassen',
      gefuehl: '–',
      anmerkungen: mitKennung(e.grund, e.anmerkungen),
    };
  }

  const wasGemacht = e.typ === 'lauf' && e.lauf ? formatLauf(e.lauf) : formatGym(e.uebungen);
  // Verschoben/vorgezogen: dem Coach sagen, für welchen Tag die Einheit geplant war.
  const verschoben = e.planDatum && e.planDatum !== e.datum ? `geplant für ${formatTagKurz(e.planDatum)}` : '';
  return {
    datum: isoZuDeutsch(e.datum),
    einheit: e.titel,
    wasGemacht,
    gefuehl: e.gefuehl !== null ? String(e.gefuehl) : '',
    anmerkungen: mitKennung(e.anmerkungen, e.typ === 'gym' ? autoAnmerkungen(e.uebungen) : '', verschoben),
  };
}

/** Log-Zeile als Zellen in Spaltenreihenfolge der Log-Tabelle. */
export function logZeileAlsZellen(z: LogZeile): string[] {
  return [z.datum, z.einheit, z.wasGemacht, z.gefuehl, z.anmerkungen];
}
