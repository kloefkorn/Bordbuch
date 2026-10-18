# Bordbuch – digitales Logbuch für die Motoryacht

Eine Web-App (PWA), die sich wie eine normale App auf dem Homescreen installieren lässt, offline funktioniert und ohne Claude läuft. Alle Daten liegen zunächst auf dem Handy (IndexedDB) und werden – wenn eingerichtet – mit deinem OneDrive abgeglichen.

## Inhalt des Ordners

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette App |
| `sw.js` | Service Worker – macht die App offline-fähig, merkt sich angesehene Kartenausschnitte |
| `manifest.webmanifest` | App-Name, Icon, Vollbild-Modus |
| `icon-192.png`, `icon-512.png` | App-Icons |

## 1. Online stellen (einmalig, kostenlos)

GPS und Offline-Modus funktionieren nur über **HTTPS**. Die App muss deshalb einmal auf einem Webspace liegen. Danach braucht sie den Server kaum noch.

**Variante A – GitHub Pages**
1. Kostenloses Konto auf github.com anlegen, neues öffentliches Repository erstellen, zum Beispiel `bordbuch`.
2. „Add file → Upload files“, alle Dateien dieses Ordners hochladen.
3. Settings → Pages → Branch `main` / Ordner `/ (root)` → Save.
4. Nach etwa 1 Minute ist die App unter `https://<benutzername>.github.io/bordbuch/` erreichbar.

**Variante B – Netlify oder Cloudflare Pages**
Kostenloses Konto anlegen und den Ordner per Drag & Drop hochladen.

Eigene Daten landen nie auf diesem Server – er liefert nur die App-Dateien aus.

## 2. Auf dem Handy installieren

- **iPhone:** Adresse in **Safari** öffnen → Teilen-Symbol → „Zum Home-Bildschirm“. Danach immer über das Icon starten. Nur so bleiben die Daten dauerhaft gespeichert.
- **Android:** In Chrome öffnen → Menü ⋮ → „App installieren“.
- Beim ersten Tippen auf „Motoren gestartet“ den Standortzugriff erlauben. Unter iOS: Einstellungen → Datenschutz → Ortungsdienste → Safari-Websites → „Beim Verwenden“ + „Genauer Standort“.
- Einmal mit Internet öffnen, damit Karte und App-Dateien zwischengespeichert werden.

## 3. Bedienung

- **Motoren gestartet:** speichert den Fahrtbeginn (Datum, Uhrzeit, GPS-Position) und startet die Aufzeichnung der Strecke.
- **Motoren ausgeschaltet:** speichert das Fahrtende und beendet die Aufzeichnung (mit Sicherheitsabfrage).
- Während der Fahrt: **„Ereignis notieren“** setzt einen Kommentar an die aktuelle Position (Schleuse, Manöver …).
- Sobald Internet da ist, werden automatisch nachgeladen: Ortsnamen von Fahrtbeginn und Fahrtende (OpenStreetMap) und das Wetter zum jeweiligen Zeitpunkt (Open-Meteo: Beschreibung, Temperatur in °C, Wind mit Richtung und Böen in km/h).
- **Menü ☰ → Fahrten:** Übersicht mit Gesamt-km und Motorstunden. In einer Fahrt: Karte mit Track, Dauer, Strecke in km, Durchschnitts- und Höchstgeschwindigkeit in km/h, Wetter, Fahrtkommentar. In die Karte zoomen und auf Punkt oder Linie tippen zeigt Uhrzeit, Geschwindigkeit und ein Kommentarfeld. Kommentierte Punkte werden orange hervorgehoben. Ebenen-Schalter: Seezeichen von OpenSeaMap einblenden.
- **Menü ☰ → Kommentare:** alle Kommentare als Tabelle, durchsuchbar, Tipp auf eine Zeile springt zur Stelle in der Karte. CSV-Export für Excel.
- Pro Fahrt: **GPX-Export** (zum Beispiel für Navionics, OpenCPN, Google Earth).

### Wichtig: GPS im Hintergrund
Ein Browser darf GPS nur aufzeichnen, solange die App sichtbar ist. Deshalb hält die App während der Fahrt das Display an. Wird das Handy gesperrt oder eine andere App geöffnet, pausiert die Aufzeichnung; beim Zurückkehren läuft sie weiter und die Lücke wird als gerade Linie verbunden. Für lange Fahrten: Handy an Strom, App offen lassen. Auch ein Neustart oder Absturz verliert nichts – jede Position wird sofort gespeichert und die laufende Fahrt beim nächsten Öffnen fortgesetzt.

## 4. Geräteübergreifend: OneDrive (automatisch)

Die App spricht direkt mit deinem OneDrive. Dafür braucht sie eine eigene, kostenlose „App-Registrierung“ bei Microsoft (etwa 5 Minuten, einmalig):

1. Mit deinem Microsoft-Konto auf **https://portal.azure.com** anmelden → „App-Registrierungen“ → „Neue Registrierung“.
2. Name: `Bordbuch`. Unterstützte Kontotypen: **„Konten in einem beliebigen Organisationsverzeichnis und persönliche Microsoft-Konten“**.
3. Umleitungs-URI: Plattform **„Single-Page-Anwendung (SPA)“**, Adresse genau wie in der App unter Einstellungen angezeigt, zum Beispiel `https://<benutzername>.github.io/bordbuch/`.
4. Registrieren → die **Anwendungs-ID (Client-ID)** kopieren.
5. In der App: ☰ → Einstellungen → Client-ID einfügen → „Mit OneDrive verbinden“ → anmelden und zustimmen.
6. Auf jedem weiteren Gerät dieselbe Adresse öffnen, dieselbe Client-ID eintragen, mit demselben Microsoft-Konto verbinden.

Die Fahrten liegen dann als einzelne Dateien in `OneDrive/Apps/Bordbuch/trips/`. Die App hat nur Zugriff auf diesen eigenen Ordner. Abgleich: beim Öffnen, bei neuer Internetverbindung, nach jeder Fahrt und jedem Kommentar, sowie alle 5 Minuten. Bei Konflikten gewinnt die zuletzt geänderte Fassung einer Fahrt.

Hinweis: Microsoft lässt reine Web-Apps nur 24 Stunden ohne erneute Anmeldung arbeiten. Die App versucht beim Öffnen automatisch, sich still neu anzumelden (kurzer Seitenwechsel). Klappt das nicht, steht oben „bitte neu verbinden“ – dann in den Einstellungen einmal „Neu anmelden“ tippen. Bis dahin bleibt alles lokal gespeichert und wird später nachsynchronisiert.

## 5. iCloud

Apple erlaubt Web-Apps keinen direkten Zugriff auf iCloud Drive (dafür wäre eine native App mit kostenpflichtigem Apple-Entwicklerkonto nötig). Weg über Datensicherung:

- ☰ → Einstellungen → **„Sicherung exportieren“** → Teilen-Menü → „In Dateien sichern“ → iCloud Drive.
- Auf einem anderen Gerät: **„Sicherung importieren“** → Datei wählen. Fahrten werden zusammengeführt, nicht doppelt angelegt.

Wer automatischen Abgleich zwischen iPhone, iPad und Mac möchte, nimmt am einfachsten OneDrive (läuft auch auf Apple-Geräten).

## 6. Einstellungen zur Aufzeichnung

- Mindestabstand zwischen Wegpunkten: 10 m (Standard)
- Spätestens alle 30 s ein Wegpunkt
- Positionen ungenauer als 50 m werden verworfen
- Drift am Liegeplatz wird nicht als Strecke gezählt.

## Datenquellen

Karten © OpenStreetMap-Mitwirkende, Seezeichen © OpenSeaMap, Ortsnamen über Nominatim (OpenStreetMap), Wetter von Open-Meteo.com (CC BY 4.0). Alle kostenlos und ohne API-Schlüssel.
