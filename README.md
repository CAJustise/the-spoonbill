# The Spoonbill Lounge

Multi-page Spoonbill build with a public-facing site plus a dedicated BOH/admin suite.

## Pages

- `index.html` : Public site with split menu categories (`Spirits`, `Cocktails`, `Cuisine`, `Tastings`) and request forms for reservations, classes, and private events.
- `admin-login.html` : Admin login entry point (linked from floating Spoonbill logo on the public page).
- `boh.html` : Full BOH suite for menu management, reservations, classes, private events, team members, schedules, and settings.

## Default admin password

- `spoonbill-admin`

Change it in `boh.html` under `Settings` after first login.

## Local run

Open `index.html` in a browser.

No build step is required.

## Data model

All operational data is saved in browser `localStorage` via `data.js`.

Use BOH Settings to export/import JSON backups.
