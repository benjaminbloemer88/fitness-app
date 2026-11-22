/**
 * Pop-up zu einer Übung: Fotos, Muskeln, Ausführung, Tipp – und passende Alternativen.
 *
 * Mit `tausch` (im Plan oder im Workout) kann man eine Alternative oder eine eigene Übung
 * auswählen („Stattdessen machen“), optional als Regel „immer ersetzen“.
 * Fotos aus der gemeinfreien free-exercise-db; offline aus dem Cache, sonst Platzhalter.
 */
import { useState } from 'react';
import { uebungsSchluessel } from '../domain/einheit';
import { alternativen, bildUrls, findeUebungsInfo, type UebungsInfo } from '../domain/uebungsKatalog';

export interface TauschOptionen {
  /** Übung laut Plan */
  original: string;
  /** Übung, die gerade vorgesehen ist (Original oder Ersatz) */
  aktuell: string;
  /** Gibt es für das Original eine Regel „immer ersetzen“? */
  regelAktiv: boolean;
  onWaehlen: (name: string, immer: boolean) => void | Promise<void>;
  onRegelLoeschen?: () => void | Promise<void>;
}

const gleich = (a: string, b: string) => uebungsSchluessel(a) === uebungsSchluessel(b);

function Foto({ url, alt, klein = false }: { url: string; alt: string; klein?: boolean }) {
  const [fehler, setFehler] = useState(false);
  if (fehler) return <div className={`foto-platzhalter klein gedaempft${klein ? ' mini' : ''}`}>{klein ? '–' : 'Foto offline nicht verfügbar'}</div>;
  return <img className={klein ? 'mini' : undefined} src={url} alt={alt} crossOrigin="anonymous" loading="lazy" onError={() => setFehler(true)} />;
}

function Beschreibung({ info }: { info: UebungsInfo }) {
  const fotos = bildUrls(info);
  return (
    <>
      <div className="klein">
        <span className="gedaempft">Muskeln: </span>
        {info.muskeln}
      </div>
      {/* Die Datenbank zeigt die zwei Positionen der Bewegung – nicht immer in der Reihenfolge Start → Ende. */}
      {fotos.length === 2 && (
        <div className="uebungsfotos">
          <figure className="uebungsfoto">
            <Foto url={fotos[0]!} alt={`${info.name} – Position 1`} />
          </figure>
          <figure className="uebungsfoto">
            <Foto url={fotos[1]!} alt={`${info.name} – Position 2`} />
          </figure>
        </div>
      )}
      <div>
        <div className="fett" style={{ marginBottom: 4 }}>
          So geht's
        </div>
        <ol className="ausfuehrung">
          {info.ausfuehrung.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      <div className="hinweis">
        <span className="fett">Tipp: </span>
        {info.tipp}
      </div>
    </>
  );
}

export function UebungsInfoDialog({ name, onSchliessen, tausch }: { name: string; onSchliessen: () => void; tausch?: TauschOptionen }) {
  // Welche Übung wird gerade angezeigt? (Start: die übergebene, dann ggf. eine Alternative)
  const [ansicht, setAnsicht] = useState(name);
  const [immer, setImmer] = useState(false);
  const [eigene, setEigene] = useState('');
  const info = findeUebungsInfo(ansicht);
  const istStart = gleich(ansicht, name);
  const basis = tausch?.original ?? name;
  // Alternativen zur geplanten Bewegung; das Original selbst steht vorne, falls gerade getauscht ist
  const vorschlaege = [
    ...(tausch && !gleich(tausch.original, tausch.aktuell) ? [findeUebungsInfo(tausch.original) ?? null] : []),
    ...alternativen(basis),
  ].filter((u): u is UebungsInfo => u !== null && !gleich(u.name, tausch?.aktuell ?? name));
  const videoSuche = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${info?.name ?? ansicht} Übung richtig ausführen`)}`;

  const waehlen = async (neu: string) => {
    if (!tausch) return;
    await tausch.onWaehlen(neu, immer && !gleich(neu, tausch.original));
    onSchliessen();
  };

  return (
    <div className="dialog-hintergrund" onClick={onSchliessen}>
      <div className="dialog" role="dialog" aria-label={`Info: ${ansicht}`} onClick={(e) => e.stopPropagation()}>
        <div className="zeile zwischen">
          <div className="kopf-links">
            {!istStart && (
              <button className="knopf icon leise" onClick={() => setAnsicht(name)} aria-label={`Zurück zu ${name}`}>
                ←
              </button>
            )}
            <h2 style={{ margin: 0 }}>{ansicht}</h2>
          </div>
          <button className="knopf icon leise" onClick={onSchliessen} aria-label="Schließen">
            ✕
          </button>
        </div>

        {tausch && istStart && !gleich(tausch.original, tausch.aktuell) && (
          <div className="klein gedaempft">
            statt {tausch.original} (laut Plan){tausch.regelAktiv ? ' · wird immer ersetzt' : ''}
          </div>
        )}
        {info && !gleich(info.name, ansicht) && <div className="klein gedaempft">= {info.name}</div>}

        {info ? <Beschreibung info={info} /> : <p className="gedaempft">Zu dieser Übung habe ich noch keine Beschreibung.</p>}

        {/* Auswahl, wenn eine andere Übung angezeigt wird */}
        {tausch && !gleich(ansicht, tausch.aktuell) && (
          <div className="karte hervorgehoben">
            <button className="knopf primaer gross block" onClick={() => void waehlen(info?.name ?? ansicht)}>
              {gleich(ansicht, tausch.original) ? `Wieder ${tausch.original} machen` : `Stattdessen ${info?.name ?? ansicht} machen`}
            </button>
            {!gleich(ansicht, tausch.original) && (
              <label className="schalter">
                <span className="klein">Immer ersetzen – auch in künftigen Plänen</span>
                <input type="checkbox" checked={immer} onChange={(e) => setImmer(e.target.checked)} />
              </label>
            )}
          </div>
        )}

        {/* Alternativen (nur in der Startansicht) */}
        {istStart && vorschlaege.length > 0 && (
          <section className="stapel">
            <div className="fett">{tausch ? 'Alternativen' : 'Ähnliche Übungen'}</div>
            {vorschlaege.map((u) => {
              const foto = bildUrls(u)[0];
              return (
                <button key={u.name} className="alternative" onClick={() => setAnsicht(u.name)}>
                  {foto ? <Foto url={foto} alt="" klein /> : <span className="foto-platzhalter mini" />}
                  <span>
                    <span className="fett">{u.name}</span>
                    {tausch && gleich(u.name, tausch.original) && <span className="klein gedaempft"> · laut Plan</span>}
                    <span className="klein gedaempft" style={{ display: 'block' }}>
                      {u.muskeln}
                    </span>
                  </span>
                  <span className="gedaempft">›</span>
                </button>
              );
            })}
          </section>
        )}

        {tausch && istStart && (
          <section className="stapel">
            <label className="feld">
              <span>Andere Übung</span>
              <div className="zeile">
                <input className="eingabe" placeholder="z. B. Hackenschmidt" value={eigene} onChange={(e) => setEigene(e.target.value)} />
                <button className="knopf" disabled={!eigene.trim()} onClick={() => void waehlen(eigene.trim())}>
                  Nehmen
                </button>
              </div>
            </label>
            {tausch.regelAktiv && tausch.onRegelLoeschen && (
              <button
                className="knopf leise"
                onClick={async () => {
                  await tausch.onRegelLoeschen?.();
                  onSchliessen();
                }}
              >
                Regel „{tausch.original} immer ersetzen“ entfernen
              </button>
            )}
          </section>
        )}

        <a className="knopf block" href={videoSuche} target="_blank" rel="noreferrer">
          Video suchen (YouTube)
        </a>
        {info && bildUrls(info).length > 0 && <p className="klein gedaempft">Fotos: free-exercise-db (gemeinfrei)</p>}
      </div>
    </div>
  );
}
