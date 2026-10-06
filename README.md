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
```

Create a `.env` file in the project root. It is git-ignored and is never
committed:

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=tabular_score
SESSION_SECRET=
```

At minimum set `DB_PASSWORD` to your MySQL password.

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

All secrets live in `.env`, which is **git-ignored**. Create it using the
block in [Setup](#setup) above; it is never committed.

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

## Status

The app runs. `/admin`, `/judge/:judgeId` and `/judge/:judgeId/score/:contestantId`
all render, and a submitted score round-trips through MySQL back to the admin
table over Socket.IO.

Not yet built:

- **Judge PIN authentication.** `/judge/1`, `/judge/2` and `/judge/3` are open
  to anyone who can reach the server.
- **Contestant reordering.** A reorder endpoint exists in `routes/admin.js` but
  nothing in the UI calls it.
- **Flicker on the big screen.** `public/js/admin.js` reloads the whole page
  on every score event, so the scoreboard flashes during scoring.
- **Total column mid-event.** Totals are raw sums, so a contestant with one
  judge scored looks comparable to one with all three. Per-judge columns and
  the Status column distinguish them.
- **`blind_scoring` is unused.** The setting exists in `event_settings` but
  nothing reads it.
