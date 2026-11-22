/**
 * Übungskatalog: kurze Beschreibung (Muskeln, Ausführung, Tipp) und Fotos.
 *
 * Fotos: „free-exercise-db“ (https://github.com/yuhonas/free-exercise-db), gemeinfrei (Unlicense).
 * Je Übung gibt es zwei Bilder (0.jpg, 1.jpg) mit den beiden Positionen der Bewegung –
 * nicht immer in der Reihenfolge Start → Ende.
 */

export interface UebungsInfo {
  /** Anzeigename */
  name: string;
  /** Weitere Schreibweisen, unter denen der Coach die Übung nennen könnte */
  aliase: string[];
  /** Ordnername in der free-exercise-db (null = kein Foto) */
  bildId: string | null;
  muskeln: string;
  ausfuehrung: string[];
  tipp: string;
}

export const BILD_QUELLE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/** URLs der beiden Fotos (Start/Ende). */
export function bildUrls(info: UebungsInfo): string[] {
  return info.bildId ? [`${BILD_QUELLE}/${info.bildId}/0.jpg`, `${BILD_QUELLE}/${info.bildId}/1.jpg`] : [];
}

export const UEBUNGEN: UebungsInfo[] = [
  // ── Beine ──
  {
    name: 'Kniebeuge',
    aliase: ['Langhantel-Kniebeuge', 'Kniebeugen', 'Squat', 'Back Squat', 'LH-Kniebeuge'],
    bildId: 'Barbell_Full_Squat',
    muskeln: 'Oberschenkel vorn (Quadrizeps), Gesäß, Rumpf',
    ausfuehrung: [
      'Stange auf dem oberen Rücken, Füße etwa schulterbreit, Fußspitzen leicht nach außen.',
      'Hüfte nach hinten-unten, Knie folgen den Fußspitzen, bis die Oberschenkel mindestens parallel sind.',
      'Über die ganze Fußsohle kraftvoll hochdrücken, Rücken bleibt gerade.',
    ],
    tipp: 'Vor dem Absenken tief einatmen und den Bauch fest anspannen.',
  },
  {
    name: 'Frontkniebeuge',
    aliase: ['Front Squat', 'Frontkniebeugen'],
    bildId: 'Front_Barbell_Squat',
    muskeln: 'Quadrizeps, Gesäß, oberer Rücken, Rumpf',
    ausfuehrung: [
      'Stange vorn auf den Schultern, Ellbogen hoch nach vorn.',
      'Aufrecht in die Hocke gehen, Oberkörper bleibt steil.',
      'Aus den Beinen hochdrücken, Ellbogen oben halten.',
    ],
    tipp: 'Sinken die Ellbogen, rollt die Stange nach vorn – Ellbogen aktiv hochziehen.',
  },
  {
    name: 'Goblet Squat',
    aliase: ['Goblet-Kniebeuge', 'Becher-Kniebeuge'],
    bildId: 'Goblet_Squat',
    muskeln: 'Quadrizeps, Gesäß, Rumpf',
    ausfuehrung: [
      'Kurzhantel oder Kettlebell senkrecht vor der Brust halten.',
      'Aufrecht tief in die Hocke, Ellbogen zwischen die Knie.',
      'Hochdrücken, Gewicht bleibt nah am Körper.',
    ],
    tipp: 'Gut zum Lernen der Kniebeuge-Technik und als Aufwärmübung.',
  },
  {
    name: 'Beinpresse',
    aliase: ['Leg Press', 'Beinpresse (Maschine)'],
    bildId: 'Leg_Press',
    muskeln: 'Quadrizeps, Gesäß',
    ausfuehrung: [
      'Rücken und Gesäß fest an der Lehne, Füße hüftbreit mittig auf der Platte.',
      'Schlitten kontrolliert ablassen, bis die Knie etwa 90° gebeugt sind.',
      'Wegdrücken, Knie oben nicht ganz durchstrecken.',
    ],
    tipp: 'Das Gesäß darf unten nicht von der Lehne abheben.',
  },
  {
    name: 'Bulgarian Split Squat',
    aliase: ['Bulgarische Kniebeuge', 'Split Squat', 'Bulgarian Split Squats'],
    bildId: 'Split_Squat_with_Dumbbells',
    muskeln: 'Quadrizeps, Gesäß, Gleichgewicht',
    ausfuehrung: [
      'Hinteren Fuß auf eine Bank legen, vorderer Fuß gut einen Schritt vor der Bank.',
      'Senkrecht absenken, bis das hintere Knie fast den Boden berührt.',
      'Über die vordere Ferse hochdrücken – erst alle Wdh. mit einem Bein, dann wechseln.',
    ],
    tipp: 'Mit dem Gewicht vorsichtig starten – das Gleichgewicht ist anfangs die Grenze.',
  },
  {
    name: 'Ausfallschritte',
    aliase: ['Ausfallschritt', 'Lunges', 'Kurzhantel-Ausfallschritte'],
    bildId: 'Dumbbell_Lunges',
    muskeln: 'Quadrizeps, Gesäß',
    ausfuehrung: [
      'Aufrecht stehen, Kurzhanteln seitlich.',
      'Großen Schritt nach vorn, hinteres Knie Richtung Boden absenken.',
      'Über die vordere Ferse zurück in den Stand drücken.',
    ],
    tipp: 'Vorderes Knie bleibt über dem Fuß und knickt nicht nach innen.',
  },
  {
    name: 'Beinbeuger',
    aliase: ['Beinbeuger (Maschine)', 'Leg Curl', 'Beincurls', 'Beinbeuger liegend'],
    bildId: 'Lying_Leg_Curls',
    muskeln: 'Oberschenkel hinten (Beinbeuger)',
    ausfuehrung: [
      'Polster knapp über den Fersen einstellen, Hüfte bleibt auf der Bank.',
      'Fersen kontrolliert Richtung Gesäß ziehen.',
      'Langsam zurück, unten nicht ganz ablegen.',
    ],
    tipp: 'Langsam ablassen (2–3 Sekunden) bringt mehr als schweres Gewicht.',
  },
  {
    name: 'Beinbeuger sitzend',
    aliase: ['Beinbeuger (sitzend)', 'Seated Leg Curl'],
    bildId: 'Seated_Leg_Curl',
    muskeln: 'Oberschenkel hinten (Beinbeuger)',
    ausfuehrung: [
      'Knie an der Drehachse der Maschine, Oberschenkelpolster fest.',
      'Unterschenkel kontrolliert nach unten-hinten ziehen.',
      'Langsam zurückführen.',
    ],
    tipp: 'Nicht mit Schwung arbeiten.',
  },
  {
    name: 'Beinstrecker',
    aliase: ['Leg Extension', 'Beinstrecker (Maschine)'],
    bildId: 'Leg_Extensions',
    muskeln: 'Quadrizeps',
    ausfuehrung: [
      'Knie an der Drehachse, Polster vorn knapp über den Füßen.',
      'Beine strecken, oben kurz halten.',
      'Kontrolliert absenken.',
    ],
    tipp: 'Oben kurz anspannen statt das Gewicht hochzuschleudern.',
  },
  {
    name: 'Hip Thrust',
    aliase: ['Hip Thrusts', 'Hüftstoß', 'Langhantel-Hip-Thrust'],
    bildId: 'Barbell_Hip_Thrust',
    muskeln: 'Gesäß, Beinbeuger',
    ausfuehrung: [
      'Oberer Rücken an einer Bank, Stange (mit Polster) auf der Hüfte, Füße hüftbreit.',
      'Hüfte hochdrücken, bis Oberkörper und Oberschenkel eine Linie bilden.',
      'Oben Gesäß fest anspannen, dann kontrolliert absenken.',
    ],
    tipp: 'Kinn leicht zur Brust – so bleibt das Hohlkreuz oben aus.',
  },
  {
    name: 'Glute Bridge',
    aliase: ['Beckenheben', 'Glute Bridges'],
    bildId: 'Barbell_Glute_Bridge',
    muskeln: 'Gesäß, Beinbeuger',
    ausfuehrung: ['Rückenlage, Füße aufgestellt, Gewicht auf der Hüfte.', 'Hüfte hochdrücken, Gesäß anspannen.', 'Kontrolliert absenken.'],
    tipp: 'Über die Fersen drücken, nicht über die Zehen.',
  },
  {
    name: 'Wadenheben',
    aliase: ['Wadenheben stehend', 'Calf Raises', 'Wadenheben (Maschine)'],
    bildId: 'Standing_Calf_Raises',
    muskeln: 'Waden',
    ausfuehrung: [
      'Fußballen auf eine Kante, Fersen hängen frei.',
      'So hoch wie möglich auf die Zehenspitzen drücken, kurz halten.',
      'Fersen langsam tief unter die Kante absenken.',
    ],
    tipp: 'Voller Bewegungsumfang ist hier wichtiger als Gewicht.',
  },
  {
    name: 'Step-ups',
    aliase: ['Step-Ups', 'Aufsteiger'],
    bildId: 'Dumbbell_Step_Ups',
    muskeln: 'Quadrizeps, Gesäß',
    ausfuehrung: ['Vor einer Bank stehen, ein Fuß ganz auf der Bank.', 'Über das obere Bein hochdrücken.', 'Kontrolliert wieder absteigen.'],
    tipp: 'Nicht mit dem unteren Bein abstoßen.',
  },
  // ── Hüfte / hintere Kette ──
  {
    name: 'Kreuzheben',
    aliase: ['Langhantel-Kreuzheben', 'Deadlift'],
    bildId: 'Barbell_Deadlift',
    muskeln: 'Gesäß, Beinbeuger, unterer Rücken, Griff',
    ausfuehrung: [
      'Stange über der Fußmitte, schulterbreit greifen, Rücken gerade, Schultern über der Stange.',
      'Stange am Körper entlang hochziehen, Hüfte und Knie gleichzeitig strecken.',
      'Oben aufrecht stehen, dann mit geradem Rücken kontrolliert ablassen.',
    ],
    tipp: 'Die Stange bleibt die ganze Zeit in Kontakt mit den Beinen.',
  },
  {
    name: 'Rumänisches Kreuzheben',
    aliase: ['RDL', 'Romanian Deadlift', 'Rumänisches Kreuzheben LH'],
    bildId: 'Romanian_Deadlift',
    muskeln: 'Beinbeuger, Gesäß, unterer Rücken',
    ausfuehrung: [
      'Aufrecht mit der Stange vor den Oberschenkeln, Knie leicht gebeugt.',
      'Hüfte weit nach hinten schieben, Stange gleitet an den Beinen nach unten, Rücken gerade.',
      'Wenn die Beinrückseite deutlich zieht (etwa Mitte Schienbein), Hüfte nach vorn bringen und aufrichten.',
    ],
    tipp: 'Die Knie bleiben während der ganzen Bewegung im gleichen leichten Winkel.',
  },
  {
    name: 'Hyperextensions',
    aliase: ['Rückenstrecker', 'Back Extensions'],
    bildId: 'Hyperextensions_Back_Extensions',
    muskeln: 'unterer Rücken, Gesäß, Beinbeuger',
    ausfuehrung: ['Hüfte am Polster, Füße fixiert.', 'Oberkörper mit geradem Rücken absenken.', 'Bis zur geraden Linie aufrichten – nicht überstrecken.'],
    tipp: 'Langsam und kontrolliert, kein Schwung.',
  },
  // ── Brust ──
  {
    name: 'Bankdrücken',
    aliase: ['Langhantel-Bankdrücken', 'LH-Bankdrücken', 'Flachbankdrücken', 'Bench Press'],
    bildId: 'Barbell_Bench_Press_-_Medium_Grip',
    muskeln: 'Brust, vordere Schulter, Trizeps',
    ausfuehrung: [
      'Auf der Bank liegen, Augen unter der Stange, Schulterblätter zusammen, Füße fest am Boden.',
      'Stange kontrolliert zur unteren Brust ablassen, Ellbogen etwa 45° vom Körper.',
      'Kraftvoll nach oben drücken.',
    ],
    tipp: 'Bei schweren Sätzen einen Partner zum Sichern fragen oder die Sicherheitsablagen nutzen.',
  },
  {
    name: 'Bankdrücken KH',
    aliase: ['Kurzhantel-Bankdrücken', 'KH-Bankdrücken', 'Bankdrücken Kurzhantel'],
    bildId: 'Dumbbell_Bench_Press',
    muskeln: 'Brust, vordere Schulter, Trizeps',
    ausfuehrung: [
      'Mit den Kurzhanteln auf den Oberschenkeln hinsetzen, beim Hinlegen mitnehmen.',
      'Hanteln seitlich der Brust absenken.',
      'Nach oben drücken, oben leicht zusammenführen.',
    ],
    tipp: 'Größerer Bewegungsumfang als mit der Langhantel – kontrolliert bleiben.',
  },
  {
    name: 'Schrägbankdrücken KH',
    aliase: ['Schrägbank KH', 'Schrägbankdrücken Kurzhantel', 'Kurzhantel-Schrägbankdrücken', 'Schrägbankdrücken'],
    bildId: 'Incline_Dumbbell_Press',
    muskeln: 'obere Brust, vordere Schulter, Trizeps',
    ausfuehrung: ['Bank auf etwa 30° einstellen.', 'Kurzhanteln seitlich der oberen Brust absenken.', 'Schräg nach oben drücken.'],
    tipp: 'Nicht steiler als 30–45°, sonst übernimmt die Schulter.',
  },
  {
    name: 'Schrägbankdrücken LH',
    aliase: ['Langhantel-Schrägbankdrücken', 'Schrägbank LH'],
    bildId: 'Barbell_Incline_Bench_Press_-_Medium_Grip',
    muskeln: 'obere Brust, vordere Schulter, Trizeps',
    ausfuehrung: ['Bank auf etwa 30° einstellen.', 'Stange zur oberen Brust ablassen.', 'Nach oben drücken.'],
    tipp: 'Schulterblätter bleiben zusammengezogen.',
  },
  {
    name: 'Butterfly',
    aliase: ['Fliegende', 'Flys', 'Butterfly (Maschine)', 'Brustpresse Butterfly'],
    bildId: 'Butterfly',
    muskeln: 'Brust',
    ausfuehrung: ['Sitz so einstellen, dass die Griffe auf Brusthöhe sind.', 'Arme leicht gebeugt im Bogen zusammenführen.', 'Langsam öffnen, bis die Brust gedehnt ist.'],
    tipp: 'Die Ellbogen bleiben während der Bewegung im gleichen Winkel.',
  },
  {
    name: 'Liegestütze',
    aliase: ['Liegestütz', 'Push-ups', 'Pushups'],
    bildId: 'Pushups',
    muskeln: 'Brust, Trizeps, vordere Schulter, Rumpf',
    ausfuehrung: ['Hände etwas breiter als schulterbreit, Körper bildet eine Linie.', 'Brust bis knapp über den Boden absenken.', 'Hochdrücken, Rumpf bleibt fest.'],
    tipp: 'Zu schwer? Hände auf eine Bank legen.',
  },
  {
    name: 'Dips',
    aliase: ['Barrenstütz', 'Trizeps-Dips'],
    bildId: 'Dips_-_Triceps_Version',
    muskeln: 'Trizeps, Brust, vordere Schulter',
    ausfuehrung: ['Am Barren stützen, Arme gestreckt.', 'Absenken, bis die Oberarme etwa waagerecht sind.', 'Wieder hochdrücken.'],
    tipp: 'Nicht zu tief – bei Schulterbeschwerden lieber weglassen.',
  },
  // ── Rücken ──
  {
    name: 'Langhantelrudern',
    aliase: ['LH-Rudern', 'Rudern vorgebeugt', 'Langhantel-Rudern', 'Rudern', 'Barbell Row'],
    bildId: 'Bent_Over_Barbell_Row',
    muskeln: 'oberer und mittlerer Rücken, Latissimus, Bizeps',
    ausfuehrung: [
      'Oberkörper mit geradem Rücken weit nach vorn neigen, Knie leicht gebeugt.',
      'Stange zum Bauchnabel ziehen, Schulterblätter zusammen.',
      'Kontrolliert ablassen, Oberkörper bleibt ruhig.',
    ],
    tipp: 'Kein Schwung aus der Hüfte – lieber etwas leichter und sauber.',
  },
  {
    name: 'Kurzhantelrudern',
    aliase: ['KH-Rudern', 'Rudern Kurzhantel', 'Einarmiges Rudern'],
    bildId: 'Bent_Over_Two-Dumbbell_Row',
    muskeln: 'oberer Rücken, Latissimus, Bizeps',
    ausfuehrung: ['Vorgebeugt mit geradem Rücken, Kurzhanteln hängen.', 'Hanteln zur Hüfte ziehen.', 'Kontrolliert ablassen.'],
    tipp: 'Ellbogen eng am Körper führen.',
  },
  {
    name: 'Kabelrudern',
    aliase: ['Rudern am Kabel', 'Sitzendes Rudern', 'Kabelrudern sitzend', 'Seated Row'],
    bildId: 'Seated_Cable_Rows',
    muskeln: 'mittlerer Rücken, Latissimus, Bizeps',
    ausfuehrung: ['Aufrecht sitzen, Füße an der Plattform, Knie leicht gebeugt.', 'Griff zum Bauch ziehen, Brust raus, Schulterblätter zusammen.', 'Arme langsam nach vorn strecken.'],
    tipp: 'Der Oberkörper bleibt fast still – nicht nach hinten lehnen.',
  },
  {
    name: 'Latzug',
    aliase: ['Latziehen', 'Lat-Ziehen', 'Latzug breit', 'Lat Pulldown'],
    bildId: 'Wide-Grip_Lat_Pulldown',
    muskeln: 'Latissimus, oberer Rücken, Bizeps',
    ausfuehrung: ['Stange breit greifen, Oberschenkel unter dem Polster.', 'Stange zur oberen Brust ziehen, Brust leicht nach vorn.', 'Langsam nach oben zurücklassen.'],
    tipp: 'An „Ellbogen nach unten in die Hosentaschen“ denken.',
  },
  {
    name: 'Klimmzüge',
    aliase: ['Klimmzug', 'Pull-ups', 'Pullups'],
    bildId: 'Pullups',
    muskeln: 'Latissimus, oberer Rücken, Bizeps',
    ausfuehrung: ['An der Stange hängen, Griff etwas breiter als schulterbreit.', 'Hochziehen, bis das Kinn über der Stange ist.', 'Kontrolliert bis fast in den gestreckten Arm ablassen.'],
    tipp: 'Wenn die Wdh. ausgehen: langsames Ablassen (negativ) oder Band zur Unterstützung.',
  },
  {
    name: 'Face Pulls',
    aliase: ['Face Pull', 'Facepulls'],
    bildId: 'Face_Pull',
    muskeln: 'hintere Schulter, oberer Rücken, Rotatorenmanschette',
    ausfuehrung: ['Seilgriff am Kabelzug auf Kopfhöhe, mit beiden Händen greifen.', 'Seil Richtung Stirn ziehen, Hände auseinander, Ellbogen hoch.', 'Kurz halten, langsam zurück.'],
    tipp: 'Leichtes Gewicht, viele saubere Wiederholungen – gut für gesunde Schultern.',
  },
  {
    name: 'Shrugs',
    aliase: ['Schulterheben', 'Kurzhantel-Shrugs'],
    bildId: 'Dumbbell_Shrug',
    muskeln: 'oberer Trapezmuskel',
    ausfuehrung: ['Aufrecht, Kurzhanteln seitlich.', 'Schultern gerade nach oben ziehen.', 'Kurz halten, langsam senken.'],
    tipp: 'Nicht mit den Schultern kreisen.',
  },
  // ── Schultern ──
  {
    name: 'Schulterdrücken',
    aliase: ['Schulterdrücken LH', 'Military Press', 'Überkopfdrücken', 'Langhantel-Schulterdrücken'],
    bildId: 'Barbell_Shoulder_Press',
    muskeln: 'Schultern, Trizeps, oberer Rücken',
    ausfuehrung: ['Stange auf Höhe der Schlüsselbeine, Ellbogen leicht vor der Stange.', 'Senkrecht über den Kopf drücken, Kopf kurz nach hinten nehmen.', 'Kontrolliert zurück zu den Schlüsselbeinen.'],
    tipp: 'Gesäß und Bauch fest – kein Hohlkreuz.',
  },
  {
    name: 'Schulterdrücken KH',
    aliase: ['Kurzhantel-Schulterdrücken', 'KH-Schulterdrücken', 'Schulterdrücken Kurzhantel'],
    bildId: 'Dumbbell_Shoulder_Press',
    muskeln: 'Schultern, Trizeps',
    ausfuehrung: ['Sitzend, Kurzhanteln auf Schulterhöhe.', 'Nach oben drücken, bis die Arme fast gestreckt sind.', 'Langsam zurück auf Schulterhöhe.'],
    tipp: 'Rücken an der Lehne lassen.',
  },
  {
    name: 'Seitheben',
    aliase: ['Seitheben KH', 'Seitheben Kurzhantel', 'Seitenheben', 'Lateral Raises'],
    bildId: 'Side_Lateral_Raise',
    muskeln: 'seitliche Schulter',
    ausfuehrung: ['Aufrecht, leichte Kurzhanteln seitlich, Arme leicht gebeugt.', 'Arme seitlich bis auf Schulterhöhe heben.', 'Langsam absenken.'],
    tipp: 'Leichtes Gewicht – kein Schwung aus dem Oberkörper.',
  },
  {
    name: 'Reverse Flys',
    aliase: ['Reverse Butterfly', 'Vorgebeugtes Seitheben', 'Reverse Flyes'],
    bildId: 'Reverse_Flyes',
    muskeln: 'hintere Schulter, oberer Rücken',
    ausfuehrung: ['Vorgebeugt, leichte Kurzhanteln unter der Brust.', 'Arme seitlich nach oben öffnen.', 'Langsam zurück.'],
    tipp: 'Schulterblätter am Ende zusammenziehen.',
  },
  // ── Arme ──
  {
    name: 'Bizeps-Curls',
    aliase: ['Bizepscurls', 'Bizeps Curls', 'Kurzhantel-Curls', 'KH-Curls', 'Curls'],
    bildId: 'Dumbbell_Bicep_Curl',
    muskeln: 'Bizeps',
    ausfuehrung: ['Aufrecht, Kurzhanteln seitlich, Handflächen nach vorn.', 'Hanteln zu den Schultern beugen, Ellbogen bleiben am Körper.', 'Langsam ablassen.'],
    tipp: 'Kein Schwung – der Oberkörper bleibt ruhig.',
  },
  {
    name: 'Hammer-Curls',
    aliase: ['Hammer Curls', 'Hammercurls'],
    bildId: 'Hammer_Curls',
    muskeln: 'Bizeps, Unterarm',
    ausfuehrung: ['Kurzhanteln im neutralen Griff (Daumen nach oben).', 'Zu den Schultern beugen.', 'Langsam ablassen.'],
    tipp: 'Ellbogen bleiben fest an der Seite.',
  },
  {
    name: 'Trizeps-Pushdowns',
    aliase: ['Trizepsdrücken am Kabel', 'Pushdowns', 'Trizeps Pushdown', 'Trizepsdrücken'],
    bildId: 'Triceps_Pushdown',
    muskeln: 'Trizeps',
    ausfuehrung: ['Am oberen Kabelzug, Ellbogen eng am Körper.', 'Griff nach unten drücken, bis die Arme gestreckt sind.', 'Langsam bis etwa 90° zurück.'],
    tipp: 'Nur die Unterarme bewegen sich.',
  },
  {
    name: 'French Press',
    aliase: ['Skullcrusher', 'Stirndrücken', 'SZ-Stirndrücken'],
    bildId: 'EZ-Bar_Skullcrusher',
    muskeln: 'Trizeps',
    ausfuehrung: ['Rückenlage, SZ-Stange über der Brust.', 'Nur die Unterarme beugen, Stange Richtung Stirn absenken.', 'Wieder strecken.'],
    tipp: 'Oberarme bleiben senkrecht.',
  },
  // ── Rumpf ──
  {
    name: 'Kabel-Crunch',
    aliase: ['Kabelcrunch', 'Crunch am Kabel', 'Cable Crunch'],
    bildId: 'Cable_Crunch',
    muskeln: 'gerade Bauchmuskeln',
    ausfuehrung: ['Vor dem Kabelzug knien, Seil neben dem Kopf halten.', 'Oberkörper einrollen, Ellbogen Richtung Knie.', 'Langsam zurück, Hüfte bleibt still.'],
    tipp: 'Bewegung kommt aus dem Bauch, nicht aus den Armen.',
  },
  {
    name: 'Crunches',
    aliase: ['Crunch', 'Bauchpressen'],
    bildId: 'Crunches',
    muskeln: 'gerade Bauchmuskeln',
    ausfuehrung: ['Rückenlage, Beine aufgestellt.', 'Oberkörper einrollen, bis die Schulterblätter abheben.', 'Langsam ablegen.'],
    tipp: 'Nicht am Kopf ziehen.',
  },
  {
    name: 'Plank',
    aliase: ['Unterarmstütz', 'Planke'],
    bildId: 'Plank',
    muskeln: 'gesamter Rumpf',
    ausfuehrung: ['Auf Unterarme und Zehen stützen.', 'Körper bildet eine gerade Linie, Bauch und Gesäß fest.', 'Position halten.'],
    tipp: 'Hüfte weder durchhängen lassen noch hochschieben.',
  },
  {
    name: 'Hängendes Beinheben',
    aliase: ['Beinheben hängend', 'Hanging Leg Raises', 'Beinheben'],
    bildId: 'Hanging_Leg_Raise',
    muskeln: 'Bauch, Hüftbeuger',
    ausfuehrung: ['An der Klimmzugstange hängen.', 'Beine kontrolliert nach vorn-oben heben.', 'Langsam absenken, ohne zu schwingen.'],
    tipp: 'Zu schwer? Knie anziehen statt gestreckter Beine.',
  },
  {
    name: 'Russian Twist',
    aliase: ['Russian Twists', 'Russischer Twist'],
    bildId: 'Russian_Twist',
    muskeln: 'schräge Bauchmuskeln',
    ausfuehrung: ['Sitzend, Oberkörper leicht zurück, Füße am Boden oder angehoben.', 'Oberkörper abwechselnd nach links und rechts drehen.', 'Bewegung kontrolliert.'],
    tipp: 'Der Rücken bleibt gerade.',
  },
];

/** Normalisiert einen Übungsnamen für den Vergleich. */
function normiere(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[-–/.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const GERAETE = /\b(kh|lh|kurzhantel|langhantel|maschine|kabel|am kabel|sz)\b/g;

/**
 * Findet die passende Übung im Katalog – tolerant gegenüber Schreibweisen
 * („Beinbeuger (Maschine)“, „Seitheben KH“, „Bizeps-Curls“, „LH-Rudern“ …).
 */
export function findeUebungsInfo(name: string): UebungsInfo | null {
  const n = normiere(name);
  const namen = (u: UebungsInfo) => [u.name, ...u.aliase].map(normiere);

  // 1. exakter Treffer (inkl. Aliase)
  const exakt = UEBUNGEN.find((u) => namen(u).includes(n));
  if (exakt) return exakt;

  // 2. ohne Geräte-Zusätze
  const ohneGeraet = n.replace(GERAETE, '').replace(/\s+/g, ' ').trim();
  const ohne = UEBUNGEN.find((u) => namen(u).some((x) => x.replace(GERAETE, '').replace(/\s+/g, ' ').trim() === ohneGeraet));
  if (ohne) return ohne;

  // 3. längster Katalogname, der im Namen vorkommt („Kniebeuge mit Pause“ → Kniebeuge)
  let bester: { u: UebungsInfo; laenge: number } | null = null;
  for (const u of UEBUNGEN) {
    for (const x of namen(u)) {
      if (x.length >= 4 && n.includes(x) && (!bester || x.length > bester.laenge)) bester = { u, laenge: x.length };
    }
  }
  return bester?.u ?? null;
}
