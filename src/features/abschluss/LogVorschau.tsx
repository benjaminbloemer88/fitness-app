/** Zeigt die Log-Zeile genau so, wie sie ins Doc geschrieben wird. */
import type { LogZeile } from '../../domain/einheit';

export function LogVorschau({ zeile }: { zeile: LogZeile }) {
  return (
    <dl className="logvorschau" aria-label="Vorschau der Log-Zeile">
      <dt>Datum</dt>
      <dd>{zeile.datum}</dd>
      <dt>Einheit</dt>
      <dd>{zeile.einheit}</dd>
      <dt>Was</dt>
      <dd>{zeile.wasGemacht || '–'}</dd>
      <dt>Gefühl</dt>
      <dd>{zeile.gefuehl || '–'}</dd>
      <dt>Anm.</dt>
      <dd>{zeile.anmerkungen}</dd>
    </dl>
  );
}
