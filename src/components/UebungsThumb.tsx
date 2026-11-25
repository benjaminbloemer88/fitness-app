/** Kleines Übungsfoto (erstes Bild aus dem Katalog) – mit Platzhalter, wenn keins da ist. */
import { useState } from 'react';
import { bildUrls, findeUebungsInfo } from '../domain/uebungsKatalog';
import { IconHeute } from './Icons';

export function UebungsThumb({ name }: { name: string }) {
  const [fehler, setFehler] = useState(false);
  const info = findeUebungsInfo(name);
  const url = info ? bildUrls(info)[0] : undefined;
  if (!url || fehler) {
    return (
      <span className="thumb thumb-leer" aria-hidden="true">
        <IconHeute width={22} height={22} />
      </span>
    );
  }
  return <img className="thumb" src={url} alt="" crossOrigin="anonymous" loading="lazy" onError={() => setFehler(true)} />;
}
