/**
 * Dialog „Tag verschieben“: Zieltag wählen (Tage der Planwoche, heute, beliebiges Datum).
 * Liegt am Zieltag schon eine Einheit, kann man tauschen oder beide am selben Tag machen.
 */
import { useState } from 'react';
import { einheitVerschieben, type Planung } from '../../db/verschiebungen';
import { formatTagKurz, montagDerWoche, plusTage } from '../../domain/dates';
import { einheitenAm, type EffektiveEinheit } from '../../domain/wochenplan';

interface Props {
  eintrag: EffektiveEinheit;
  planung: Planung;
  heute: string;
  onSchliessen: () => void;
}

export function VerschiebenDialog({ eintrag, planung, heute, onSchliessen }: Props) {
  const [ziel, setZiel] = useState<string | null>(null);
  const montag = montagDerWoche(eintrag.tag.datum);
  const kandidaten = [...new Set([...Array.from({ length: 7 }, (_, i) => plusTage(montag, i)), heute])].sort();
  const belegt = (datum: string) => einheitenAm(planung.effektiv, datum).filter((e) => e.tag.datum !== eintrag.tag.datum);
  const andere = ziel ? belegt(ziel) : [];

  const ausfuehren = async (tauschen: boolean) => {
    if (!ziel) return;
    await einheitVerschieben(eintrag.tag.datum, ziel, tauschen);
    onSchliessen();
  };

  return (
    <div className="dialog-hintergrund" onClick={onSchliessen}>
      <div className="dialog" role="dialog" aria-label="Tag verschieben" onClick={(e) => e.stopPropagation()}>
        <div className="zeile zwischen">
          <h2 style={{ margin: 0 }}>{eintrag.tag.titel} verschieben</h2>
          <button className="knopf icon leise" onClick={onSchliessen} aria-label="Schließen">
            ✕
          </button>
        </div>
        <p className="klein gedaempft">
          Geplant für {formatTagKurz(eintrag.tag.datum)}
          {eintrag.verschobenVon ? ` (zurzeit am ${formatTagKurz(eintrag.datum)})` : ''} – die Verschiebung gilt nur in der App; im Log steht später „geplant
          für {formatTagKurz(eintrag.tag.datum)}“.
        </p>

        <div className="stapel">
          {kandidaten.map((datum) => {
            const dort = belegt(datum);
            const aktuell = datum === eintrag.datum;
            return (
              <button
                key={datum}
                className={`satz${ziel === datum ? ' aktiv' : ''}`}
                disabled={aktuell}
                onClick={() => setZiel(datum)}
                style={{ gridTemplateColumns: '90px 1fr auto' }}
              >
                <span className="fett">
                  {formatTagKurz(datum)}
                  {datum === heute ? <div className="klein gedaempft">heute</div> : null}
                </span>
                <span className="klein">{aktuell ? 'aktueller Tag' : dort.length ? dort.map((e) => e.tag.titel).join(', ') : <span className="gedaempft">frei</span>}</span>
                <span>{ziel === datum ? '●' : ''}</span>
              </button>
            );
          })}
          <label className="feld">
            <span>Anderes Datum</span>
            <input className="eingabe" type="date" value={ziel && !kandidaten.includes(ziel) ? ziel : ''} onChange={(e) => e.target.value && setZiel(e.target.value)} />
          </label>
        </div>

        {ziel && andere.length > 0 ? (
          <div className="stapel">
            <div className="hinweis warn">
              Am {formatTagKurz(ziel)} ist schon {andere.map((e) => e.tag.titel).join(', ')} geplant.
            </div>
            <button className="knopf primaer gross block" onClick={() => void ausfuehren(true)}>
              Tauschen ({andere[0]!.tag.titel.split(' –')[0]} → {formatTagKurz(eintrag.datum)})
            </button>
            <button className="knopf block" onClick={() => void ausfuehren(false)}>
              Beide am {formatTagKurz(ziel)}
            </button>
          </div>
        ) : (
          <button className="knopf primaer gross block" disabled={!ziel} onClick={() => void ausfuehren(false)}>
            {ziel ? `Auf ${formatTagKurz(ziel)} verschieben` : 'Tag wählen'}
          </button>
        )}
      </div>
    </div>
  );
}
