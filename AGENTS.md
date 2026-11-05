# AGENTS.md — cat-harry-server

Express 4 + MongoDB Atlas backend ("StudioSpace" studio booking). Plain CommonJS, no build step. Entry point: `index.js`. The frontend is the sibling `../cat-harry` (Next.js, has its own AGENTS.md) — not part of this repo.

## Commands

- `npm run dev` — nodemon reload (only dev loop); `npm start` — plain node
- **No test/lint/typecheck scripts, no CI, no README exist.** Verify changes by starting the server and hitting endpoints; don't invent `npm test`.

## Setup gotchas

- `.env` (gitignored) must define **`MONGODB_URI`** — that exact name. This workspace's `.env` only defines `MONGO_URI`, so `node index.js` crashes at startup with the opaque driver error `Cannot read properties of undefined (reading 'startsWith')`. Add/rename the var in `.env` (or align `index.js`); don't chase the stack trace into the mongodb package. `CLIENT_URL` in `.env` is read by nothing.
- `JWT_SECRET`/`BETTER_AUTH_SECRET` are unset, so signing (`index.js`) and verification (`middlewares/verifyToken.js`) both fall back to the same hardcoded secret `"super_secret_jwt_key_studiospace_2026"` — auth works with zero env config. If you introduce a real secret, both files must use the same value or every token 401s.

## Module system — two stale files

- `package.json` has **no `"type"` field** → CommonJS (`require`) for all new code. HEAD history still shows the old `"type": "module"` config; the working tree was migrated (and downgraded express 5→4, mongodb 7→6). Don't reintroduce ESM or bump those back.
- Root `db.js` and root `verifyToken.js` are **stale ESM leftovers imported by nothing** — requiring them throws SyntaxError. Live equivalents: Mongo client created inline in `index.js` (database `studiospace_db`), auth middleware `middlewares/verifyToken.js`. `db.js` also targets a different database name (`Cat-Harry`) — don't wire it in as-is; delete rather than "fix" if cleaning up.

## Wiring

- All routes are registered **inside `run()` in `index.js`, after the Mongo connection succeeds**. On connection failure you still get the "listening" log but zero routes (even `/` 404s) — so "server up but everything 404s" means env/connection, not routing code.
- Route modules `routes/*.js` export a factory `(db) => router`; register new ones in `index.js` under `run()` at `/api/...`. Collections in use: `studios`, `bookings`, `user`.
- CORS allowlist is hardcoded (`allowedOrigins` in `index.js`): `localhost:3000` / `127.0.0.1:3000`, `credentials: true`. New origins require editing that array.

## Auth & data conventions

- Token issued by `POST /api/auth/jwt` as httpOnly cookie `token` (7d). `verifyToken` reads that cookie or `Authorization: Bearer <token>` — a raw header without the `Bearer ` prefix yields 401.
- The frontend never calls `/api/auth/jwt` on its own — better-auth (Next.js) session cookies are a different cookie and are **not** accepted here. The client exchanges its session via `ensureBackendToken()` in `../cat-harry/src/lib/backend-token.js` before each protected mutation; if that's missing/broken, mutations 401 with exactly `Unauthorized access: No token provided`.
- Only mutating endpoints are protected; all GETs are public. Identity comes from client-supplied `email` in query/body, not the token — middleware populates `req.user` but no route uses it; use it if you add ownership checks.
- Booking times are **zero-padded 24h strings** (`"09:00"`, `"14:30"`): the overlap check in `routes/bookings.js` compares them with string `$lt`/`$gt`, so values like `"9:00"` silently break collision detection. `bookingDate` is a plain string (e.g. `YYYY-MM-DD`).
- New bookings get `status: "Pending"`; the overlap check only considers `Confirmed`/`Pending`.
