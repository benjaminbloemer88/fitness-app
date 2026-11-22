/** Einstiegspunkt: rendert die App in <div id="root">. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Dunkles Design sofort setzen (bevor die Einstellungen aus der Datenbank geladen sind),
// damit beim Start nichts hell aufblitzt.
document.documentElement.dataset.theme ??= 'dunkel';

// Den Browser bitten, unsere lokalen Daten nicht automatisch zu löschen (z. B. bei Speicherknappheit).
void navigator.storage?.persist?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
