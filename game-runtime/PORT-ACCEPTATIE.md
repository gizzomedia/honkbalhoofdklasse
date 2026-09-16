# Browserport: referentie en acceptatie

## Vast uitgangspunt

Franchise 0.6.1 is de referentie. De opdracht is een browserport voor honkbalhoofdklasse.com op Vercel, met accountgebonden opgeslagen carrières. Geen redesign, nieuwe balancering of weggelaten franchisefuncties tijdens de port.

De lokale referentie bevat een kopie van de 13 Swift-bronbestanden, tests, brondata, releasehash en SHA-256-controles van 297 bestanden. Vijftig schermrenders en dertien gecontroleerde speltoestanden vormen de vergelijkingsset. De originele desktopdownload blijft behouden.

## Gelijkheid aantonen

- Dezelfde 1600×900 spelruimte, schaalverhoudingen, kleuren, lettertypen, afbeeldingen, overlays, tabstructuur en bediening.
- Dezelfde 19 managementschermen en bijbehorende dialoogvensters, plus start/draft/saveflows.
- Dezelfde spelregels, balans, trainingsgroei, posities, financiën, sponsorvoorwaarden, seizoenstructuur en kalenderloting.
- Dezelfde keuzes en toevalsseed moeten dezelfde relevante speltoestand en uitslagen opleveren. Creatie-/opslagtijden worden in vergelijkingen genormaliseerd.
- De bestaande 5.430 enginechecks en 160 bedieningschecks dienen als functionele acceptatiebasis; niet alle tests zijn al browsertests.
- Screenshots vergelijken op desktopformaten. Verschillen in browser-letterrastering onderscheiden van echte layout- of beeldafwijkingen; geen stilzwijgende kwaliteitsclaim.
- Bestaande saves kunnen importeren zonder verlies van roster, kalender, RNG, ontwikkeling, economie of historie.
- Een onvoltooide port wordt niet als de volledige game gepubliceerd.

## Technische voorkeur die nog moet worden bewezen

Onderzoek eerst hergebruik van de Swift-simulatie via WebAssembly. AppKit-weergave, bestandsopslag, lettertypenregistratie en desktopwindow zijn platformafhankelijk; ze krijgen browseradapters. Swift biedt een officiële WebAssembly SDK, maar Foundation/Calendar/Codable en de volledige engine moeten daadwerkelijk compileren en tegen de referentie worden getest. Alleen bij een aangetoond obstakel kiezen we een andere uitvoering; geen automatische keuze voor een tweede, afwijkende simulatie.

Belangrijk: RNG gebruikt UInt64. Een JavaScript Number kan deze waarden niet exact bewaren. Save-JSON mag daarom niet zonder geschikte omzetting door een gewone JS-parse/stringify-cyclus; behoud de originele payload of gebruik expliciete verliesvrije serialisatie. Geld/seed/kalender mogen niet stil veranderen.

## Accountopslag

Gebruik de bestaande authenticatie van de website als die aanwezig is. Login buiten de spelinterface, zodat de bestaande gamepresentatie behouden blijft.

- Drie carrièreslots per account, gekoppeld aan de geverifieerde serveridentiteit.
- Server controleert eigendom bij lezen, schrijven, verwijderen en importeren; een door de client meegestuurde user-id is geen autorisatie.
- Revisienummers voorkomen overschrijven door twee tabs/apparaten. Conflicten melden en herstelkopie behouden.
- Autosave met lokale herstelkopie. Offline of mislukte synchronisatie wordt nooit als succesvol online opgeslagen gepresenteerd.
- Saveformaat en engineversie opslaan; formaat, grootte en slot valideren.
- Geheimen en databasesleutels blijven aan de serverkant. Geen productiegegevens in de referentiemap.

## Nog vast te stellen uit de repository

Framework, accountdienst, database, bestaande Play-routes, Vercel-inrichting, beschikbare buildomgeving en deployworkflow. Eerst lokaal/preview vergelijken; productie pas wanneer de game volledig en aantoonbaar overeenkomt.

Bron technische verkenning: https://www.swift.org/documentation/articles/wasm-getting-started.html
