# pr0legramm
Ein Open-Source Telegram-Bot zum suchen, finden und teilen von Bildern und Posts von [pr0gramm](https://pr0gramm.com).

## Features
pr0legramm wird hauptsächlich im Inline-Modus verwendet. Schreibe einfach `@pr0legrammbot <tags> <filter>` in einem Chat (auch Gruppenchats) und der Bot durchsucht für dich die pr0gramm-API und zeigt dir Treffer an.
- `<tags>` können beliebig viele Suchbegriffe sein, ganz einfach nacheinander durch Leerzeichen getrennt (keine Kommata, keine Anführungszeichen). Tags sind optional: werden keine angegeben, wird auch nicht gefiltert.

- `<filter>` können Kombinationen aus `+sfw`, `+nsfw`, `+nsfl`, `+nsfp` und `+all` sein. Wird kein Filter angegeben, wird automatisch der Filter `+sfw` gesetzt. *Achtung: alle Filter außer `+sfw` benötigen einen Session-Token, den du für deinen Account zuerst beim Bot hinterlegen musst!*

## Selbst Betreiben
Wenn du die nicht-öffentlichen Filter nutzen möchtest und deinen Session-Cookie nicht bei dem von mir betriebenen Bot speichern möchtest *(ich klaue mir nachts deine Cookies, shitposte damit auf dem pr0 und lasse dich bannen)*, kannst du den Bot einfach klonen, deine Anmeldedaten eintragen und ihn selbst betreiben. Eine kurze Anleitung:
1. Installiere NodeJS (getestet mit Version `v12.13.0`)
2. Erstelle dir einen Bot für [Telegrams Bot-API](https://core.telegram.org/bots#6-botfather) und hole dir dein Bot-Token (im Folgenden und im Code `telegramBotToken`).
4. Klone diese Repo (`git clone https://github.com/BigMo/pr0legrammbot`) und wechlse in dessen Verzeichnis (`cd pr0legrammbot`).
5. Ziehe dir die benötigten NPM-Pakete (`npm install`)
6. Erstelle eine Konfigurations-JSON `pr0legrammbot.json` mit folgendem Inhalt: 
    ```json
    {
        'telegramBotToken': '<dein token>',
    }
    ```
7. Starte den Bot! (`node app.js`)
8. (Optional) Starte einen Chat mit dem Bot in Telegram und gib dort dein Session-Token an (siehe unten)
9. PROFIT!!!

## Non-Public Filter benutzen: Session-Token angeben
*Disclaimer: Wie du dem Source-Code entnehmen kannst, werden die Cookies im Plaintext gespeichert. Solltest du dem Bot diese Daten angeben und sollten diese abhanden kommen (¯\_(ツ)_/¯), kann dein Account möglicherweise komprommitiert werden. Schicke deinen Cookie nur an den Bot, wenn du dir sicher bist, dass du das willst!*

So holst du dir dein pr0gramm.com-Session-Cookie für diesen Bot:
* Variante 1 - Auf pr0gramm:
    1. Werde zum Hacker und öffne deine Browser-Konsole mit `F12`, wähle den `Konsole`-Reiter aus
    2. Füge folgenden Code ein und führe ihn aus
        ```javascript
        copy(decodeURIComponent(document.cookie.split(' ').filter(c=>c.indexOf('me') === 0)[0].substr(3).replace(/\+/g, ' ')))
        ```
    3. Schließe alle pr0gramm-Tabs (damit keine weiteren Requests vom Browser aus geschickt werden, die den Cookie ändern könnten)
    4. Dein dekodierter Session-Cookie befindet sich jetzt in der Zwischenablage (hat die Form "`{paid: ...`").
    5. Lösche den `me`-Cookie in deinen Cookie-Einstellungen (`X`-Button neben `me` unter `Einstellungen` -> `Erweitert` -> `Datenschutz und Sicherheit` -> `Seiteneinstellungen` -> `Berechtigungen` -> `Cookies` -> `Alle Cookies anzeigen`) - du musst dich neu bei pr0gramm anmelden.
* Variante 2 - In Chrome:
    1. Schließe offene pr0gramm.com-Tabs in deinem Browser.
    2. Gehe in deine `Einstellungen` -> `Erweitert` -> `Datenschutz und Sicherheit` -> `Seiteneinstellungen` -> `Berechtigungen` -> `Cookies` -> `Alle Cookies anzeigen` 
    3. Suche `pr0gramm.com` und wähle es aus
    4. Wähle `me` aus und kopiere seinen Inhalt (hat die Form "`%7B%22paid%22...`")
    5. Werde zum Hacker und öffne deine Browser-Konsole mit `F12`, Wähle den `Konsole`-Reiter aus
    6. Füge folgenden Code ein und führe ihn aus (ersetze `<DEIN COOKIE>` durch den Wert von deinem Cookie!):
        ```javascript
        var cookie = '<DEIN COOKIE>'
        copy(decodeURIComponent(cookie.replace(/\+/g, ' '))) 
        ```
    7. Dein dekodierter Session-Cookie befindet sich jetzt in der Zwischenablage (hat die Form "`{paid: ...`").
    8. Lösche den `me`-Cookie in deinen Cookie-Einstellungen (`X`-Button) - du musst dich neu bei pr0gramm anmelden.

## Todo
1. Konzept zum Hinterlegen, Verwenden und Löschen von Session-Cookies entwickeln implementieren. (*Security, Performance?*)
2. Inline-Results für Posts aus nicht-öffentlichen Filtern auf `personal` schalten. (*Notwendig?*)