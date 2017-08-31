Blue Fruit
---

Welcome.

Usage
---
Generate various files from translations: (run this before "compile")
```
npm run localize
```

Run webpack: (run "localize" before this)
```
npm run compile
```

Start the development server:
```
npm start
```

Generate .pot file for translators, scanning src/\*.js and dot_views/\*.dot:
```
npm run pot
```

Setup
---

Install Node.js 8.x by following [this](https://nodejs.org/en/download/package-manager/).

```
npm install
```

Install sqlite3. (The database itself gets set up by the server)

Create file config/config.json:

```
{
"root_url": "http://localhost:3000",
"port": 3000,
"jwt_secret": "Put something here!!!",
"discord_webhook_url": "https://discordapp.com/api/webhooks/AAAAA",
"discord_webhook_url_approved": "https://discordapp.com/api/webhooks/BBBBB",
"approval_game_wait_seconds": "15",
"approval_check_schedule": "*/5 * * * * *",
"mail": {
    "options": {
        "host": "127.0.0.1",
        "port": 25,
        "auth": null
    },
    "from": "test@test.com"
}
}
```

Discord webhook URLs may be omitted.

For approval check schedule, see https://www.npmjs.com/package/node-schedule. "0 0 * * * *" is at 00:00 every hour, "*/5 * * * * *" is every 5 seconds.

For approval game wait seconds, 12*60*60 is 43200.

For mail options, see https://nodemailer.com/smtp/#authentication

