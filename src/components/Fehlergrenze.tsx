/**
 * Fängt unerwartete Fehler in der Oberfläche ab und zeigt statt einer leeren Seite
 * eine Meldung mit „Neu laden“. Die Daten liegen sicher in der lokalen Datenbank.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  fehler: Error | null;
}

export class Fehlergrenze extends Component<{ children: ReactNode }, State> {
  state: State = { fehler: null };

  static getDerivedStateFromError(fehler: Error): State {
    return { fehler };
  }

  componentDidCatch(fehler: Error, info: ErrorInfo) {
    console.error('App-Fehler:', fehler, info.componentStack);
  }

  render() {
    if (!this.state.fehler) return this.props.children;
    return (
      <main className="seite">
        <h1>Ups – da ist etwas schiefgelaufen</h1>
        <p className="gedaempft">Deine Einträge sind lokal gespeichert und gehen nicht verloren.</p>
        <div className="hinweis fehler klein">{this.state.fehler.message}</div>
        <button
          className="knopf primaer gross block"
          onClick={() => {
            window.location.hash = '#/';
            window.location.reload();
          }}
        >
          Neu laden
        </button>
      </main>
    );
  }
}
