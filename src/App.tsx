/**
 * App-Gerüst: Routen, Navigation unten, globaler Pausen-Timer, Design (Dunkel/Hell).
 *
 * Wir nutzen den HashRouter (URLs wie …/#/woche), weil GitHub Pages keine
 * Server-Weiterleitungen kennt – so funktioniert auch ein Neuladen auf jeder Seite.
 */
import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { Fehlergrenze } from './components/Fehlergrenze';
import { UpdateBanner } from './components/UpdateBanner';
import { testplanLaden } from './db/einheiten';
import { useEinstellungen } from './db/einstellungen';
import { AbschlussSeite } from './features/abschluss/AbschlussSeite';
import { AuslassenSeite } from './features/abschluss/AuslassenSeite';
import { EinstellungenSeite } from './features/einstellungen/EinstellungenSeite';
import { PlanDatenSeite } from './features/einstellungen/PlanDatenSeite';
import { HeuteSeite } from './features/heute/HeuteSeite';
import { LaufSeite } from './features/lauf/LaufSeite';
import { TagSeite } from './features/tag/TagSeite';
import { TrainingSeite } from './features/training/TrainingSeite';
import { WocheSeite } from './features/woche/WocheSeite';
import { PausenTimerProvider } from './state/PausenTimer';
import { useAutoSync } from './sync/syncDienst';
import { useBilderVorladen } from './lib/bilderVorladen';

// Der Verlauf (mit der großen Diagramm-Bibliothek) wird erst beim Öffnen geladen → schnellerer Start.
// Offline klappt das trotzdem, weil der Service Worker alle Dateien vorab cacht.
const VerlaufSeite = lazy(() => import('./features/verlauf/VerlaufSeite').then((m) => ({ default: m.VerlaufSeite })));
const VerlaufDetailSeite = lazy(() => import('./features/verlauf/VerlaufDetailSeite').then((m) => ({ default: m.VerlaufDetailSeite })));

/** Seiten, auf denen die Navigation unten ausgeblendet wird (Vollbild-Abläufe). */
const OHNE_NAV = ['/training/', '/lauf/', '/abschluss/', '/auslassen/', '/plan-daten'];

function Layout() {
  const { pathname } = useLocation();
  const ohneNav = OHNE_NAV.some((p) => pathname.startsWith(p));

  // Beim Seitenwechsel nach oben scrollen.
  // Wichtig: geschweifte Klammern – neuere Browser geben bei scrollTo ein Promise zurück,
  // und ein Effekt darf nur eine Aufräum-Funktion zurückgeben.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <UpdateBanner />
      <Routes>
        <Route path="/" element={<HeuteSeite />} />
        <Route path="/woche" element={<WocheSeite />} />
        <Route path="/tag/:datum" element={<TagSeite />} />
        <Route path="/training/:id" element={<TrainingSeite />} />
        <Route path="/lauf/:id" element={<LaufSeite />} />
        <Route path="/abschluss/:id" element={<AbschlussSeite />} />
        <Route path="/auslassen/:datum" element={<AuslassenSeite />} />
        <Route
          path="/verlauf"
          element={
            <Suspense fallback={<main className="seite gedaempft">Lade Verlauf …</main>}>
              <VerlaufSeite />
            </Suspense>
          }
        />
        <Route
          path="/verlauf/:art/:name?"
          element={
            <Suspense fallback={<main className="seite gedaempft">Lade Verlauf …</main>}>
              <VerlaufDetailSeite />
            </Suspense>
          }
        />
        <Route path="/einstellungen" element={<EinstellungenSeite />} />
        <Route path="/plan-daten" element={<PlanDatenSeite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!ohneNav && <BottomNav />}
    </>
  );
}

export function App() {
  const { design } = useEinstellungen();

  // Design auf <html data-theme="…"> setzen – die CSS-Variablen reagieren darauf.
  useEffect(() => {
    document.documentElement.dataset.theme = design;
  }, [design]);

  // Erster Start: Testplan laden, damit sofort etwas zu sehen ist.
  useEffect(() => {
    void testplanLaden();
  }, []);

  // Doc-Sync automatisch (Start, online, Vordergrund, neue Einträge)
  useAutoSync();

  // Übungsfotos für offline vorladen
  useBilderVorladen();

  return (
    <Fehlergrenze>
      <PausenTimerProvider>
        <HashRouter>
          <Layout />
        </HashRouter>
      </PausenTimerProvider>
    </Fehlergrenze>
  );
}
