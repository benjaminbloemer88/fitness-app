# Fitness – Trainingsplan & Log

Progressive Web App fürs Handy: Wochenplan ansehen, Gym-Einheiten Satz für Satz und Läufe erfassen,
Fortschritt verfolgen – und alles mit dem Google-Doc **„Trainingsplan & Log“** abgleichen, das der
wöchentliche „Trainingscoach“ pflegt.

- Läuft komplett offline (Service Worker + IndexedDB); Einträge werden sofort lokal gespeichert.
- Log-Zeilen entstehen exakt im Format, das der Coach auswertet (siehe unten).
- Kein eigenes Backend. Der Sync zum Doc läuft über eine kleine Apps-Script-Brücke im Doc (Phase 2).

## Stand

| Teil | Status |
|---|---|
| Heute, Workout-Modus, Lauf, Abschluss, Ausgelassen, Woche | ✅ |
| Verlauf (Top-Gewicht, 1RM, Volumen, Pace, Gefühl, Einheiten/Woche) | ✅ |
| Einstellungen, Backup (Export/Import JSON) | ✅ |
| Plan aus dem Doc lesen (JSON + Fallback-Tabelle) | ✅ Logik + Tests · ⏳ Anbindung |
| Sync-Warteschlange (keine Doppelten über `[app:xxxx]`) | ✅ Logik + Tests · ⏳ Anbindung |
| Apps-Script-Brücke, Import alter Log-Zeilen | ⏳ nächster Schritt |

Bis die Brücke steht, nutzt die App den Plan 23.–29.11.2026 als Testdaten. Alles, was du erfasst,
bleibt in der Warteschlange und wird später automatisch ins Doc übertragen.

## Entwicklung

Voraussetzung: Node.js (LTS).

```powershell
npm install
npm run dev        # Entwicklungsserver, auch im WLAN erreichbar (--host)
npm test           # Vitest
npm run build      # Produktions-Build nach dist/
```

### Ordnerstruktur

```
src/
  domain/      reine Logik (getestet): Plan-Schema, JSON-Extraktion, Tabellen-Parser,
               Log-Format, Log-Parser, Pace/1RM/Volumen, Verlauf
  db/          Dexie-Datenbank, Einheiten/Pläne, Einstellungen, Backup
  sync/        Sync-Warteschlange (+ Brücken-Client in Phase 2)
  features/    Seiten: heute, tag, training, lauf, abschluss, woche, verlauf, einstellungen
  components/  BottomNav, Stepper, SyncBadge, PlanTagKarte …
  state/       Pausen-Timer
  data/        Doc-Auszug vom 22.11.2026 (Testdaten + Test-Fixture)
tests/         Vitest
```

## Log-Format (muss zum Coach passen)

| Fall | „Was gemacht“ | Gefühl | Anmerkungen |
|---|---|---|---|
| Gym | `Kniebeuge 3×8×57,5 kg (8/8/7); Bankdrücken 3×8×55 kg` | `7` | `gut geschlafen [app:ab12]` |
| Körpergewicht | `Klimmzüge 3×7 (KG)` | | |
| je Bein / Zeit | `Bulgarian Split Squat 3×10 je Bein×12,5 kg` · `Plank 3×45 s (KG)` | | |
| Gewicht pro Satz verschieden | `Rumänisches Kreuzheben 3×10×60/65/70 kg` | | |
| Lauf | `5 km, 31:20, 6:16/km (locker)` | `5` | `[app:x7k2]` |
| Ausgelassen | `ausgelassen` | `–` | `krank [app:q3m9]` |

Die Klammer `(8/8/7)` steht nur, wenn die Wiederholungen der Sätze voneinander abweichen.
Nicht gemachte oder getauschte Übungen schreibt die App automatisch in die Anmerkungen
(`ausgelassen: Face Pulls; getauscht: Beinbeuger (Maschine) → Beinbeuger sitzend`).

## Deployment (GitHub Pages)

Jeder Push auf `main` baut die App, lässt die Tests laufen und veröffentlicht sie
(`.github/workflows/deploy.yml`). Einmalig im Repo: **Settings → Pages → Source: GitHub Actions**.
Die App liegt dann unter `https://<github-name>.github.io/fitness-app/`.

## Installation auf dem Handy (Samsung S23 Ultra, Chrome)

1. In Chrome die Pages-Adresse öffnen.
2. Menü **⋮ → Zum Startbildschirm hinzufügen → Installieren**.
3. App einmal online starten (dabei werden alle Dateien für offline gespeichert – es erscheint
   „Die App ist jetzt offline nutzbar“).
4. Neue Versionen: Die App meldet „Neue Version verfügbar → Neu laden“.

Tipp: In den Android-Einstellungen für Chrome/die App den Akku auf „Nicht eingeschränkt“ stellen,
damit Pausen-Timer und Vibration zuverlässig laufen.

## Backup

Einstellungen → **Backup exportieren** lädt alle lokalen Daten als JSON herunter;
**Backup importieren** spielt sie (nach Rückfrage) wieder ein.
