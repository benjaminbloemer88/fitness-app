/**
 * Aktionen zu einer Einheit des Plans: starten / weiter / nachtragen / heute machen /
 * verschieben / ausgelassen – plus die bereits erfassten Einheiten dazu.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { einheitenZumTag, starteEinheit } from '../../db/einheiten';
import { einheitVerschieben, usePlanung, verschiebungAufheben } from '../../db/verschiebungen';
import { formatTagKurz } from '../../domain/dates';
import type { EffektiveEinheit } from '../../domain/wochenplan';
import { audioVorbereiten } from '../../lib/feedback';
import { EinheitKurz } from '../einheit/EinheitKurz';
import { VerschiebenDialog } from './VerschiebenDialog';

export function TagAktionen({ eintrag, heute }: { eintrag: EffektiveEinheit; heute: string }) {
  const navigate = useNavigate();
  const planung = usePlanung();
  const [dialog, setDialog] = useState(false);
  const { tag, datum } = eintrag;
  const einheiten = useLiveQuery(() => einheitenZumTag(tag.datum), [tag.datum], []);

  const laufend = einheiten.find((e) => e.status === 'laeuft');
  const fertig = einheiten.filter((e) => e.status !== 'laeuft');
  const zielSeite = (id: string) => (tag.typ === 'lauf' ? `/lauf/${id}` : `/training/${id}`);

  /** Startet die Einheit. Vergangene Tage werden mit ihrem Datum nachgetragen, sonst gilt heute. */
  const starten = async (amTag: string) => {
    audioVorbereiten(); // erster Tipp → Ton für den Pausen-Timer freischalten
    const id = await starteEinheit(tag, amTag);
    navigate(zielSeite(id));
  };

  /** „Heute machen“: auf heute verschieben und direkt starten. */
  const heuteMachen = async () => {
    await einheitVerschieben(tag.datum, heute);
    await starten(heute);
  };

  return (
    <div className="stapel">
      {eintrag.verschobenVon && (
        <div className="hinweis zeile zwischen">
          <span>
            Verschoben von {formatTagKurz(eintrag.verschobenVon)} auf {formatTagKurz(datum)}
          </span>
          {fertig.length === 0 && !laufend && (
            <button className="knopf leise" onClick={() => void verschiebungAufheben(tag.datum)}>
              Zurück
            </button>
          )}
        </div>
      )}

      {fertig.map((e) => (
        <EinheitKurz key={e.id} einheit={e} />
      ))}

      {laufend ? (
        <button className="knopf primaer gross block" onClick={() => navigate(zielSeite(laufend.id))}>
          Weiter: {laufend.titel}
        </button>
      ) : (
        fertig.length === 0 && (
          <>
            {datum === heute ? (
              <button className="knopf primaer gross block" onClick={() => void starten(heute)}>
                {tag.typ === 'lauf' ? 'Lauf erfassen' : 'Training starten'}
              </button>
            ) : (
              <div className="zeile">
                <button className="knopf primaer gross block" onClick={() => void heuteMachen()}>
                  Heute machen
                </button>
                {datum < heute && (
                  <button className="knopf gross block" onClick={() => void starten(datum)}>
                    Nachtragen
                  </button>
                )}
              </div>
            )}
            <div className="zeile">
              <button className="knopf block" onClick={() => setDialog(true)} disabled={!planung}>
                Tag verschieben …
              </button>
              <button className="knopf block leise" onClick={() => navigate(`/auslassen/${tag.datum}`)}>
                Ausgelassen …
              </button>
            </div>
          </>
        )
      )}

      {dialog && planung && <VerschiebenDialog eintrag={eintrag} planung={planung} heute={heute} onSchliessen={() => setDialog(false)} />}
    </div>
  );
}
