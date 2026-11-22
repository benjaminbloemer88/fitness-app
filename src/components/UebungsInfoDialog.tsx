/**
 * Pop-up mit Infos zu einer Übung: Fotos (Start/Ende), Muskeln, Ausführung, Tipp.
 * Fotos aus der gemeinfreien free-exercise-db; offline aus dem Cache, sonst Platzhalter.
 */
import { useState } from 'react';
import { bildUrls, findeUebungsInfo } from '../domain/uebungsKatalog';

function Foto({ url, alt }: { url: string; alt: string }) {
  const [fehler, setFehler] = useState(false);
  return (
    <figure className="uebungsfoto">
      {fehler ? (
        <div className="foto-platzhalter klein gedaempft">Foto offline nicht verfügbar</div>
      ) : (
        <img src={url} alt={alt} crossOrigin="anonymous" loading="lazy" onError={() => setFehler(true)} />
      )}
    </figure>
  );
}

export function UebungsInfoDialog({ name, onSchliessen }: { name: string; onSchliessen: () => void }) {
  const info = findeUebungsInfo(name);
  const fotos = info ? bildUrls(info) : [];
  const videoSuche = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${info?.name ?? name} Übung richtig ausführen`)}`;

  return (
    <div className="dialog-hintergrund" onClick={onSchliessen}>
      <div className="dialog" role="dialog" aria-label={`Info: ${name}`} onClick={(e) => e.stopPropagation()}>
        <div className="zeile zwischen">
          <h2 style={{ margin: 0 }}>{name}</h2>
          <button className="knopf icon leise" onClick={onSchliessen} aria-label="Schließen">
            ✕
          </button>
        </div>

        {!info ? (
          <p className="gedaempft">Zu dieser Übung habe ich noch keine Beschreibung.</p>
        ) : (
          <>
            {info.name !== name && <div className="klein gedaempft">= {info.name}</div>}
            <div className="klein">
              <span className="gedaempft">Muskeln: </span>
              {info.muskeln}
            </div>
            {/* Die Datenbank zeigt die zwei Positionen der Bewegung – nicht immer in der Reihenfolge Start → Ende. */}
            {fotos.length === 2 && (
              <div className="uebungsfotos">
                <Foto url={fotos[0]!} alt={`${info.name} – Position 1`} />
                <Foto url={fotos[1]!} alt={`${info.name} – Position 2`} />
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
        )}

        <a className="knopf block" href={videoSuche} target="_blank" rel="noreferrer">
          Video suchen (YouTube)
        </a>
        {fotos.length > 0 && <p className="klein gedaempft">Fotos: free-exercise-db (gemeinfrei)</p>}
      </div>
    </div>
  );
}
