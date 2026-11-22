/**
 * Workout-Modus (Gym): Übungen mit vorausgefüllten Zielwerten, Satz für Satz abhaken,
 * Pausen-Timer, Übungen tauschen/ergänzen. Jede Änderung wird sofort lokal gespeichert.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { IconZurueck } from '../../components/Icons';
import { db } from '../../db/db';
import { aktualisiereEinheit, letzteLeistung, loescheEinheit, type LetzteLeistung } from '../../db/einheiten';
import { useEinstellungen } from '../../db/einstellungen';
import { formatTagKurz } from '../../domain/dates';
import { uebungsSchluessel, type UebungErgebnis } from '../../domain/einheit';
import { useEinheit } from '../../hooks/daten';
import { audioVorbereiten } from '../../lib/feedback';
import { useWakeLock } from '../../lib/useWakeLock';
import { PausenLeiste, usePausenTimer } from '../../state/PausenTimer';
import { UebungKarte } from './UebungKarte';

export function TrainingSeite() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const einheit = useEinheit(id);
  const einstellungen = useEinstellungen();
  const timer = usePausenTimer();
  useWakeLock(einstellungen.bildschirmAn);

  // Die Übungen halten wir während des Trainings im Speicher (schnell, keine verlorenen Tipps)
  // und schreiben jede Änderung zusätzlich in die Datenbank.
  const [uebungen, setUebungen] = useState<UebungErgebnis[] | null>(null);
  const [offen, setOffen] = useState<number | null>(null);
  const [letzte, setLetzte] = useState<Record<string, LetzteLeistung | null>>({});
  const [neueUebung, setNeueUebung] = useState('');
  const [bekannteNamen, setBekannteNamen] = useState<string[]>([]);
  const [minuten, setMinuten] = useState(0);

  useEffect(() => {
    if (einheit && uebungen === null) setUebungen(einheit.uebungen);
  }, [einheit, uebungen]);

  useEffect(() => {
    if (uebungen && einheit) void aktualisiereEinheit(einheit.id, { uebungen });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei Änderungen der Übungen speichern
  }, [uebungen]);

  // „Letztes Mal“ für jede Übung laden
  const namen = (uebungen ?? []).map((u) => u.name).join('|');
  useEffect(() => {
    if (!einheit) return;
    let abgebrochen = false;
    void (async () => {
      const ergebnis: Record<string, LetzteLeistung | null> = {};
      for (const name of namen.split('|').filter(Boolean)) ergebnis[uebungsSchluessel(name)] = await letzteLeistung(name, einheit.id);
      if (!abgebrochen) setLetzte(ergebnis);
    })();
    return () => {
      abgebrochen = true;
    };
  }, [namen, einheit?.id]);

  // Übungsnamen aus Plänen und Verlauf als Vorschläge
  useEffect(() => {
    void (async () => {
      const set = new Set<string>();
      (await db.plaene.toArray()).forEach((p) => p.plan.tage.forEach((t) => t.uebungen.forEach((u) => set.add(u.name))));
      (await db.einheiten.toArray()).forEach((e) => e.uebungen.forEach((u) => set.add(u.name)));
      setBekannteNamen([...set].sort((a, b) => a.localeCompare(b, 'de')));
    })();
  }, []);

  // Trainingsdauer (Minuten seit Start)
  useEffect(() => {
    if (!einheit) return;
    const rechnen = () => setMinuten(Math.floor((Date.now() - new Date(einheit.gestartetAm).getTime()) / 60000));
    rechnen();
    const t = window.setInterval(rechnen, 30_000);
    return () => window.clearInterval(t);
  }, [einheit]);

  if (einheit === undefined || (einheit && uebungen === null)) return <main className="seite" />;
  if (einheit === null || uebungen === null) {
    return (
      <main className="seite">
        <div className="hinweis fehler">Training nicht gefunden.</div>
      </main>
    );
  }

  const ersteOffene = uebungen.findIndex((u) => u.saetze.some((s) => !s.erledigt));
  const aufgeklappt = offen ?? (ersteOffene >= 0 ? ersteOffene : null);

  const aendereUebung = (index: number, u: UebungErgebnis) => setUebungen((alt) => alt!.map((x, i) => (i === index ? u : x)));

  const nachAbhaken = (index: number, uebungFertig: boolean) => {
    audioVorbereiten();
    const allesFertig = uebungen.every((u, i) => (i === index ? uebungFertig : u.saetze.every((s) => s.erledigt)));
    if (!allesFertig) timer.starten();
    if (uebungFertig) {
      // Zur nächsten Übung mit offenen Sätzen springen
      const naechste = uebungen.findIndex((u, i) => i > index && u.saetze.some((s) => !s.erledigt));
      setOffen(naechste >= 0 ? naechste : null);
    }
  };

  const hinzufuegen = async () => {
    const name = neueUebung.trim();
    if (!name) return;
    const vorher = await letzteLeistung(name, einheit.id);
    const vorlage = vorher?.saetze.at(-1);
    const neu: UebungErgebnis = {
      name,
      planName: null,
      ziel: null,
      koerpergewicht: false,
      saetze: Array.from({ length: 3 }, () => ({ kg: vorlage?.kg ?? null, wdh: vorlage?.wdh ?? 10, erledigt: false })),
    };
    setUebungen((alt) => [...alt!, neu]);
    setOffen(uebungen.length);
    setNeueUebung('');
  };

  const verwerfen = async () => {
    if (!window.confirm('Dieses Training komplett verwerfen? Die erfassten Sätze gehen verloren.')) return;
    timer.stoppen();
    await loescheEinheit(einheit.id);
    navigate('/', { replace: true });
  };

  const gesamtSaetze = uebungen.reduce((n, u) => n + u.saetze.length, 0);
  const erledigteSaetze = uebungen.reduce((n, u) => n + u.saetze.filter((s) => s.erledigt).length, 0);

  return (
    <main className="seite ohne-nav">
      <header className="kopf">
        <div className="kopf-links">
          <button className="knopf icon leise" onClick={() => navigate('/')} aria-label="Zurück zu Heute (Training bleibt gespeichert)">
            <IconZurueck />
          </button>
          <div>
            <h1 style={{ fontSize: '1.3rem' }}>{einheit.titel}</h1>
            <div className="klein gedaempft">
              {formatTagKurz(einheit.datum)} · {minuten} Min. · {erledigteSaetze}/{gesamtSaetze} Sätze
            </div>
          </div>
        </div>
      </header>

      {einheit.status === 'abgeschlossen' && (
        <div className="hinweis warn">Du bearbeitest eine abgeschlossene Einheit. Über „Training beenden“ speicherst du die Änderung.</div>
      )}

      {uebungen.map((u, i) => (
        <UebungKarte
          key={`${i}-${u.planName ?? u.name}`}
          uebung={u}
          offen={aufgeklappt === i}
          letzte={letzte[uebungsSchluessel(u.name)]}
          gewichtSchritt={einstellungen.gewichtSchritt}
          onKopfTipp={() => setOffen(aufgeklappt === i ? -1 : i)}
          onAendern={(neu) => aendereUebung(i, neu)}
          onSatzAbgehakt={(fertig) => nachAbhaken(i, fertig)}
          onEntfernen={() => {
            setUebungen((alt) => alt!.filter((_, j) => j !== i));
            setOffen(null);
          }}
        />
      ))}

      <section className="karte">
        <h3>Übung ergänzen</h3>
        <div className="zeile">
          <input
            className="eingabe"
            list="bekannte-uebungen"
            placeholder="z. B. Dips"
            value={neueUebung}
            onChange={(e) => setNeueUebung(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void hinzufuegen()}
          />
          <button className="knopf" onClick={() => void hinzufuegen()} disabled={!neueUebung.trim()}>
            +
          </button>
        </div>
        <datalist id="bekannte-uebungen">
          {bekannteNamen.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </section>

      {einheit.sync !== 'synchronisiert' && (
        <button className="knopf gefahr" onClick={() => void verwerfen()}>
          Training verwerfen
        </button>
      )}

      <div className="unten-fixiert">
        <div className="unten-fixiert-innen">
          <PausenLeiste />
          <button className="knopf primaer gross block" onClick={() => navigate(`/abschluss/${einheit.id}`)}>
            Training beenden
          </button>
        </div>
      </div>
    </main>
  );
}
