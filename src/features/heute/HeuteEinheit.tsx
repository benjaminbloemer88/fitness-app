/**
 * Eine Einheit auf der Heute-Seite (Variante B):
 * Gym = Übungsliste mit Fotos, Ziel und „zuletzt …“ – Tipp öffnet Infos und Tauschen.
 * Lauf = Karte mit Distanz und Pace. Darunter „Tag verschieben“ und „Ausgelassen“.
 * Der Startknopf selbst sitzt unten fixiert (siehe HeuteSeite).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { IconLauf, IconTauschen } from '../../components/Icons';
import { UebungsInfoDialog } from '../../components/UebungsInfoDialog';
import { UebungsThumb } from '../../components/UebungsThumb';
import { zielText } from '../../components/PlanTagKarte';
import { letzteLeistung, type LetzteLeistung } from '../../db/einheiten';
import { regelEntfernen, uebungTauschen, useErsetzungen } from '../../db/ersetzungen';
import { usePlanung } from '../../db/verschiebungen';
import { formatDezimal } from '../../domain/calc';
import { uebungsSchluessel, type Einheit } from '../../domain/einheit';
import { regelFuer, uebungenMitErsetzungen } from '../../domain/ersetzungen';
import type { EffektiveEinheit } from '../../domain/wochenplan';
import { EinheitKurz } from '../einheit/EinheitKurz';
import { VerschiebenDialog } from '../tag/VerschiebenDialog';

interface Props {
  eintrag: EffektiveEinheit;
  heute: string;
  /** Erfasste Einheiten zu diesem Plantag */
  einheiten: Einheit[];
}

export function HeuteEinheit({ eintrag, heute, einheiten }: Props) {
  const navigate = useNavigate();
  const planung = usePlanung();
  const ersetzungen = useErsetzungen();
  const [info, setInfo] = useState<number | null>(null);
  const [verschieben, setVerschieben] = useState(false);
  const { tag } = eintrag;
  const liste = uebungenMitErsetzungen(tag, ersetzungen);
  const fertig = einheiten.filter((e) => e.status !== 'laeuft');
  const laeuft = einheiten.some((e) => e.status === 'laeuft');

  // „zuletzt …“ je Übung (aus den eigenen, abgeschlossenen Einheiten)
  const namen = liste.map((a) => a.name).join('|');
  const letzte = useLiveQuery<Record<string, LetzteLeistung | null>, Record<string, LetzteLeistung | null>>(
    async () => {
      const m: Record<string, LetzteLeistung | null> = {};
      for (const n of namen.split('|').filter(Boolean)) m[uebungsSchluessel(n)] = await letzteLeistung(n);
      return m;
    },
    [namen],
    {},
  );
  const offen = info !== null ? liste[info] : undefined;

  return (
    <section className="stapel">
      {tag.hinweis && <p className="klein gedaempft" style={{ margin: '0 2px' }}>{tag.hinweis}</p>}

      {tag.typ === 'lauf' && tag.lauf && (
        <div className="einheit-karte">
          <div className="icon-kachel lauf">
            <IconLauf />
          </div>
          <div>
            <div className="titel">
              {formatDezimal(tag.lauf.distanz_km)} km {tag.lauf.art}
            </div>
            <div className="meta">
              {tag.lauf.pace_von && (
                <span>
                  {tag.lauf.pace_von}
                  {tag.lauf.pace_bis && tag.lauf.pace_bis !== tag.lauf.pace_von ? `–${tag.lauf.pace_bis}` : ''} /km
                </span>
              )}
              {tag.lauf.hinweis && <span>{tag.lauf.hinweis}</span>}
            </div>
          </div>
          <span />
        </div>
      )}

      {liste.length > 0 && (
        <div className="uebungs-reihen">
          {liste.map((a, i) => {
            const vorher = letzte[uebungsSchluessel(a.name)];
            const zusatz = vorher ? `zuletzt ${vorher.text}` : a.ersetzung ? null : a.original.hinweis;
            return (
              <button key={`${a.original.name}-${i}`} className="uebung-reihe" onClick={() => setInfo(i)} aria-label={`${a.name}: Infos und tauschen`}>
                <UebungsThumb name={a.name} />
                <span className="text">
                  <span className="name">{a.name}</span>
                  {a.ersetzung && (
                    <span className="meta einzeilig" style={{ color: 'var(--info)' }}>
                      ⇄ statt {a.original.name}
                    </span>
                  )}
                  <span className="meta einzeilig">
                    {zielText(a.original, a.ersetzung !== null)}
                    {zusatz ? ` · ${zusatz}` : ''}
                  </span>
                </span>
                <IconTauschen className="tauschen" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      {fertig.map((e) => (
        <EinheitKurz key={e.id} einheit={e} />
      ))}

      {fertig.length === 0 && !laeuft && (
        <div className="zeile">
          <button className="knopf block leise" onClick={() => setVerschieben(true)} disabled={!planung}>
            Verschieben …
          </button>
          <button className="knopf block leise" onClick={() => navigate(`/auslassen/${tag.datum}`)}>
            Ausgelassen …
          </button>
        </div>
      )}

      {verschieben && planung && <VerschiebenDialog eintrag={eintrag} planung={planung} heute={heute} onSchliessen={() => setVerschieben(false)} />}
      {offen && (
        <UebungsInfoDialog
          name={offen.name}
          onSchliessen={() => setInfo(null)}
          tausch={{
            original: offen.original.name,
            aktuell: offen.name,
            regelAktiv: regelFuer(ersetzungen, offen.original.name) !== null,
            onWaehlen: (neu, immer) => uebungTauschen(tag.datum, offen.original.name, neu, immer),
            onRegelLoeschen: () => regelEntfernen(offen.original.name),
          }}
        />
      )}
    </section>
  );
}
