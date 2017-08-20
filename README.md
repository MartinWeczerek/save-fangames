My Project
---

Welcome.

Usage
---

Start the development server with this command:

```
npm start
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
"port": 3000,
"jwt_secret": "Put something here!!!",
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

For mail options, see https://nodemailer.com/smtp/#authentication

Compile
---

```
npm run compile
```
