# Bubble Orbit

Modernes Bubble-Spiel mit Levels, Wandsprüngen, Zielhilfe, Kugeltausch und einem Tempo-Regler von 25 bis 150 Prozent. Abgeschlossene Levels und Tempo werden auf dem Gerät gespeichert.

## Spielen

`index.html` direkt im Browser öffnen oder GitHub Pages aktivieren:

1. Repository **Settings → Pages** öffnen.
2. Unter **Build and deployment** die Quelle **Deploy from a branch** wählen.
3. Branch **main**, Verzeichnis **/ (root)** wählen und speichern.

Die tatsächlich veröffentlichte Spieladresse zeigt GitHub anschließend auf dieser Einstellungsseite. Das Repository muss dafür nicht pauschal öffentlich gemacht werden; die Verfügbarkeit von Pages für private Repositories hängt vom GitHub-Tarif ab. Die Spielseite soll ohne Anmeldung erreichbar sein.

## Steuerung

Maus/Finger: zielen und loslassen. Pfeiltasten: zielen. Leertaste: schießen. X: Kugel tauschen. P/Escape: Pause.

## Tests

`node test/game.test.cjs`

21 automatisierte Tests, einschließlich Treffern, Hex-Nachbarn, Kollisionen, schwebenden Gruppen, Levelwechsel, Pause, Speichern, Tempo und simulierten 30/60/120/144 Hz. Zufallsspiele auf 50 Boards. DOM und Canvas werden simuliert; echte Browser-, GPU- und Touch-Prüfungen stehen noch aus.
