# Tabular Scoring System

Real-time scoring for talent-show presentations. One **master scoreboard** on the
admin's big screen, and a minimal one-tap scoring UI on each judge's phone.

## Roles

| Role | Device | URL |
|---|---|---|
| Admin | Big screen / projector | `/admin` |
| Judge | Phone or tablet | `/judge/:judgeId` (e.g. `/judge/1`) |

`/` redirects to `/admin`.

## Scoring rule

Judges tap one of four letters. Each maps to a fixed numeric value:

| Letter | Value |
|---|---|
| A | 100 |
| B | 95 |
| C | 90 |
| D | 85 |

The judge UI shows only the contestant's name and the four boxes, arranged as
A (top-left), B (top-right), C (bottom-left), D (bottom-right).

The admin table shows, per contestant, each judge's letter and value, the raw
total, the average of submitted judges, and a status of
`Pending` / `In-Progress` / `Complete`.

## Admin controls

Add / rename / delete contestants, lock or unlock scoring, reset all scores, and
clear scores while keeping contestants. Renaming a contestant resets that
contestant's scores.

## Stack

- **Node.js** + **Express 5**
- **MySQL 8** via `mysql2`
- **Socket.IO** for live updates to the big screen
- **EJS** templates, plain CSS, no frontend framework

## Setup

```bash
npm install
cp .env.example .env      # then fill in DB_PASSWORD
```

Create the database and tables:

```bash
mysql -u root -p < db/schema.sql
```

This creates the `tabular_score` database with `contestants`, `judges`, `scores`
and `event_settings`, seeds judges 1-3, and sets `scores_locked=0`.

Then:

```bash
npm start                 # http://localhost:3000
```

## Configuration

All secrets live in `.env`, which is **git-ignored**. `.env.example` is the
committed template.

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port, default `3000` |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name, default `tabular_score` |
| `SESSION_SECRET` | Signs the judge session cookie (used once judge PIN login lands) |

## Layout

```
app.js                 Express + Socket.IO bootstrap
config/db.js           MySQL connection pool
db/schema.sql          Tables, seed data, default settings
routes/admin.js        Admin dashboard, contestant CRUD, lock/reset
routes/judge.js        Judge list + scoring pages
routes/api.js          Score submission endpoint
utils/adMap.js         A/B/C/D to 100/95/90/85
utils/state.js         Assembles the full state payload for the UI
views/                 EJS templates
public/                CSS and client-side JS
```

## Known issues

This is the initial baseline commit. The app does **not** run yet:

1. `utils/state.js` references an undeclared `judge` variable inside a loop over
   `j`, throwing a `ReferenceError` on every page render.
2. `public/js/judge.js` has a syntax error, so the whole client script fails to
   parse and the judge UI is inert.
3. Score objects are keyed inconsistently between the server and the templates,
   so score cells never populate.
4. The score-submit handler passes a regular-expression literal where a redirect
   string is expected.

Judge PIN authentication is not implemented; `/judge/1`, `/judge/2` and
`/judge/3` are currently open to anyone who can reach the server.