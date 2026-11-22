/**
 * Auszug aus dem echten Doc „Trainingsplan & Log“ (Stand 22.11.2026),
 * so wie ihn die Apps-Script-Brücke liefern wird.
 *
 * Wird zweifach genutzt:
 * 1. als Testdaten, solange die App noch nicht mit dem Doc verbunden ist,
 * 2. als Fixture in den Tests (inkl. der Markdown-Reste, die wirklich im Doc stehen).
 */
import type { DocSnapshot } from '../domain/docSnapshot';

export const beispielDoc: DocSnapshot = {
  titel: 'Trainingsplan & Log',
  bloecke: [
    // Profil absichtlich ohne persönliche Angaben (das Repo ist öffentlich).
    { typ: 'ueberschrift', ebene: 1, text: 'Trainingsplan & Log' },
    { typ: 'ueberschrift', ebene: 2, text: '1. Profil (bitte ausfüllen)' },
    {
      typ: 'tabelle',
      zeilen: [
        ['**Basisdaten**', '(ausgelassen)'],
        ['**Ernährung**', 'Achtet auf Proteinzufuhr – Tagesziel: 150g'],
      ],
    },
    { typ: 'ueberschrift', ebene: 2, text: '2. Aktueller Wochenplan – Mo 23.11. bis So 29.11.2026' },
    { typ: 'absatz', text: 'Grundlage: Ziel Muskelaufbau, Laufen nebenbei, kein Wettkampf …' },
    {
      typ: 'tabelle',
      zeilen: [
        ['Tag', 'Einheit', 'Inhalt (Sätze × Wdh. × Zielgewicht / Laufart, Distanz, Pace)', 'Dauer'],
        [
          '**Mo 23.11.**',
          'Gym A – Ganzkörper (Kniebeuge + Bankdrücken)',
          'Aufwärmen 5–8 Min. + 2 Aufwärmsätze je Hauptübung• Kniebeuge 3 × 8 × 57,5 kg• Bankdrücken 3 × 8 × 55 kg• Langhantelrudern 3 × 10 × 50 kg• Beinbeuger (Maschine) 3 × 12 × kalibrieren• Seitheben KH 3 × 15 × leicht• Kabel-Crunch 3 × 12 × kalibrieren',
          'ca. 70 Min.',
        ],
        ['**Di 24.11.**', 'Ruhetag', 'Optional Spaziergang / 10 Min. Mobility', '–'],
        [
          '**Mi 25.11.**',
          'Gym B – Ganzkörper (Hüfte + Schultern + Rücken)',
          '• Rumänisches Kreuzheben 3 × 10 × kalibrieren (Start ca. 60 kg, steigern bis RIR 2)• Schulterdrücken 3 × 8 × 45 kg (gleiche Variante wie bisher – bitte im Log notieren: LH, KH oder Maschine)• Klimmzüge 3 × 6 × Körpergewicht• Bulgarian Split Squat 3 × 10 je Bein × KH kalibrieren• Schrägbankdrücken KH 3 × 10 × kalibrieren• Face Pulls 3 × 15 × leicht',
          'ca. 75 Min.',
        ],
        ['**Do 26.11.**', 'Ruhetag', '–', '–'],
        [
          '**Fr 27.11.**',
          'Gym C – Ganzkörper (Volumen)',
          '• Beinpresse 3 × 12 × kalibrieren• Bankdrücken 3 × 12 × 50 kg• Latzug 3 × 10 × 55 kg• Kabelrudern 3 × 12 × kalibrieren• Hip Thrust 3 × 10 × kalibrieren• Bizeps-Curls 3 × 12 + Trizeps-Pushdowns 3 × 12 (als Supersatz)• Wadenheben 3 × 15',
          'ca. 75 Min.',
        ],
        [
          '**Sa 28.11.**',
          'Lauf – locker (optionaler 4. Tag)',
          '5 km locker @ 6:00–6:30 min/km, am Ende 4 × 20 s Steigerungsläufe (zügig, nicht Vollgas)',
          'ca. 35 Min.',
        ],
        ['**So 29.11.**', 'Ruhetag', 'Erholung; Plan für nächste Woche kommt automatisch', '–'],
      ],
    },
    { typ: 'absatz', text: 'Progression: Schaffst du bei einer Übung alle Sätze sauber mit der Ziel-Wiederholungszahl → nächstes Mal +2,5 kg oder +1 Wiederholung.' },
    { typ: 'ueberschrift', ebene: 2, text: '3. Log' },
    { typ: 'absatz', text: 'So loggst du:' },
    {
      typ: 'tabelle',
      zeilen: [
        ['Datum', 'Einheit', 'Was gemacht', 'Gefühl 1–10', 'Anmerkungen'],
        ['*Vorlage: 23.11.*', '*Gym A*', '*Kniebeuge 3×8×\\_\\_ kg; Bankdrücken 3×8×\\_\\_ kg; …*', '*7*', '*gut geschlafen*'],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
      ],
    },
    { typ: 'ueberschrift', ebene: 2, text: '4. Planarchiv' },
    { typ: 'ueberschrift', ebene: 3, text: 'Startplan vom 21.11.2026 (für 23.–29.11., am 21.11. nach Profilangaben ersetzt)' },
  ],
};
