# PV-CRM (Offline-PWA)

Einzelplatz-CRM für den PV-Vertrieb. Reine Browser-App: **kein Server, kein Build-Schritt**.

## Dateien
`index.html` (App) · `sw.js` (Offline-Cache, Klick auf Benachrichtigung) · `manifest.webmanifest` · `icon*.png/svg`

## Installation / Start
1. Alle Dateien in **einen** Ordner auf einem **HTTPS**-Webspace legen (z. B. Netlify, GitHub Pages, eigener Server). Service Worker und Installierbarkeit funktionieren nur über HTTPS oder `localhost`.
2. Lokal testen: im Ordner `python3 -m http.server 8080`, dann `http://localhost:8080` öffnen.
3. Am Handy die HTTPS-Adresse öffnen → Android/Chrome: „App installieren“; iPhone/Safari: Teilen → „Zum Home-Bildschirm“.
4. Einmal online öffnen (Cache wird gefüllt), danach startet die App auch offline.
5. Einstellungen → „Dauerhaften Speicher anfordern“, Benachrichtigungen aktivieren, Testbenachrichtigung senden.

## Architektur-Entscheidungen
- **Vanilla JS statt React/PostgreSQL:** Du arbeitest allein und willst offline arbeiten. Eine einzelne HTML-Datei mit IndexedDB braucht keinen Server, keine Wartung und läuft auf Handy und PC. React/TypeScript/PostgreSQL/Server-Login sind **nicht** umgesetzt (siehe Ausbaustufe).
- **Datenhaltung:** IndexedDB, Stores `customers, projects, tasks, appointments, activities, settings`; IDs sind UUIDs (verhindert Doppelungen beim Zusammenführen). Daten bleiben nach Neustart erhalten.
- **Wiedervorlagen und Aufgaben** liegen im selben Store (`kind: callback | task`). Erledigte Einträge bleiben erhalten; zusätzlich entsteht ein Verlaufseintrag in der Kundenakte.

## Was wird wo gespeichert?
Alles **ausschließlich lokal** im Browser des jeweiligen Geräts. Es gibt keine Übertragung an einen Server. Nur die App-Hülle (HTML, Icons) liegt im Service-Worker-Cache.

## Synchronisierung & Datenverlust
- **Keine automatische Synchronisierung** (dafür wäre ein Server nötig).
- **Manueller Abgleich PC ↔ Handy:** Backup (JSON) erstellen und auf dem anderen Gerät einspielen. Zusammenführung je Datensatz nach `updatedAt` (neuere Änderung gewinnt), Löschungen über Löschvermerke. Gleichzeitige Änderungen am selben Datensatz auf zwei Geräten: nur die neuere bleibt erhalten.
- **Schutz vor Verlust:** Dashboard warnt, wenn das Backup älter als 7 Tage ist. Backup-Dateien enthalten Klartext-Kundendaten → sicher ablegen (verschlüsselter Speicher).
- Wird der Browser-Speicher gelöscht oder das Gerät zurückgesetzt, sind die Daten ohne Backup weg.

## Erinnerungen – drei Ebenen
| Ebene | Funktioniert | Voraussetzung |
|---|---|---|
| 1. In der geöffneten App | Hinweis in der App + (wenn erlaubt) Systembenachrichtigung, Prüfung alle 30 s; verpasste Erinnerungen der letzten 24 h werden beim Öffnen nachgeholt | App/Tab läuft; Browser beendet sie nicht |
| 2. Offline, App geschlossen | **Nicht zuverlässig per PWA möglich** (Service Worker haben keine freien Hintergrund-Timer). Fallback: **.ics-Export** → Kalender-App des Handys erinnert zuverlässig, auch offline | manueller Import in den Kalender |
| 3. Web Push bei geschlossener App | Der Service Worker enthält einen `push`-Handler, es gibt aber **keinen Server/keine VAPID-Schlüssel** → nicht aktiv | Server + Internet |

Duplikate werden über feste Schlüssel pro Erinnerung (in IndexedDB) und den Benachrichtigungs-`tag` vermieden; erledigte Aufgaben lösen nichts mehr aus. Ruhezeiten, Vorlaufzeit, Standardzeit und Wiederholung bei Überfälligkeit sind einstellbar.

## Sicherheit & DSGVO (Hinweise, keine Rechtsberatung)
- Optionale **App-PIN** (SHA-256 mit Salt) sperrt nur die Oberfläche; Daten sind **nicht verschlüsselt**. Geräte-Sperre und Geräteverschlüsselung aktivieren.
- Alle Ausgaben werden HTML-escaped; CSV-Export schützt vor Formel-Injection.
- Betroffenenrechte: Kundendaten einzeln exportieren (Auskunft/Übertragbarkeit) und endgültig löschen. Archivieren ist umkehrbar.
- Organisatorisch zu klären: Zweck/Rechtsgrundlage, Löschfristen, Verzeichnis der Verarbeitungstätigkeiten, ggf. Einwilligungen für Telefon-/E-Mail-Kontakt (UWG). Keine automatische Kontaktaufnahme implementiert.
- Eine Änderungsprotokollierung auf Datenfeld-Ebene gibt es nicht; Statuswechsel, Gespräche, Termine und Projektänderungen stehen im Verlauf.

## Nicht umgesetzt / Ausbaustufe
Server-Login, PostgreSQL, serverseitige Rechteprüfung, automatische Mehrgeräte-Synchronisierung, Web Push, Integrationen (Kalender, Outlook, WhatsApp). Empfohlener Weg: Backend (z. B. Node/Fastify + PostgreSQL) mit Sync-Endpunkt auf Basis von UUID + `updatedAt` + Löschvermerken, Login mit Sitzungs-Cookies, VAPID-Push.

## Abnahmetest (manuell, auf dem Gerät durchführen)
1. Flugmodus an → Kunde anlegen → Rückruf „morgen 10:30“ speichern.
2. App schließen, neu öffnen (weiterhin offline) → Daten vorhanden?
3. Einstellungen: Status der Benachrichtigungen prüfen, Testbenachrichtigung senden.
4. Ablauf: Status „Nicht erreicht“ → Rückruf morgen → in „Demnächst“ → Gespräch dokumentieren → Termin → Projekt/Angebot → Status ändern → Verlauf in der Kundenakte prüfen.
5. Backup erstellen, am zweiten Gerät einspielen, zweimal hintereinander: keine Dubletten.
