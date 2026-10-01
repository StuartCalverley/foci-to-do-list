# todo-api

A simple RESTful to-do list API with a tiny static web client, built with TypeScript, Express, SQLite and Vitest.

- Create, list, view, update, complete, incomplete and delete to-dos.
- Optional filtering (`active` / `completed` / `overdue`) and sorting (`dueDate` / `createdAt` / `title`, asc or desc).
- Data persists to a SQLite file, so it survives restarts.
- Ships with a minimal browser client served from the same Express app (no build step, no CORS).
- A working multi-stage Docker image.

## Requirements

- **Node.js >= 22.13** (tested on 22.2 and 24.18 LTS).
- npm (for `npm ci`).
- Docker (optional — only needed for the container path).

> Note: `better-sqlite3` is a native module. It has prebuilt binaries for recent Node LTS versions, so `npm ci` normally "just works". On very new Node majors where no prebuilt exists for the pinned `better-sqlite3@12`, npm will compile it from source and you'll need a C++ toolchain (Xcode Command Line Tools on macOS, `build-essential` on Debian/Ubuntu, `python3 make g++` on Alpine).

## Quick start

```bash
npm ci          # install dependencies (uses .npmrc + package-lock for reproducibility)
npm run dev     # start the dev server with tsx watch
```

Then open `http://localhost:3000/` for the web client, or hit the API (examples below).

### Build + run in production

```bash
npm ci
npm run build   # tsc -> dist/
npm start       # node dist/index.js
```

## Configuration (environment variables)

All variables are optional. A `.env` file is loaded if present (via `dotenv`); values already set in the shell take precedence over the `.env` file. See `.env.example`.

| Variable       | Default   | Description                                               |
| -------------- | --------- | --------------------------------------------------------- |
| `PORT`         | `3000`    | HTTP port the server listens on.                          |
| `DB_PATH`      | `todo.db` | Path to the SQLite database file.                         |
| `CACHE_TTL_MS` | `30000`   | Read-cache expiry in ms. `0` disables the cache entirely. |

## Running with Docker

```bash
docker build -t todo-api:dev .
docker run -d --name todo-api \
  -p 3001:3000 \
  -e DB_PATH=/data/todo.db \
  -v todo-data:/data \
  todo-api:dev
```

- `-p 3001:3000` maps your host port `3001` to the container's `3000`. Browse `http://localhost:3001/`.
- `-v todo-data:/data` keeps the database in a named volume so data survives `docker stop` / `docker start` / rebuilds.
- The image runs as a non-root user (`node`) and writes the DB under `/data`.

Shutdown:

```bash
docker stop todo-api                 # stop, keep container + data
docker start todo-api                # start it again
docker rm -f todo-api                # remove container, keep the todo-data volume
docker rm -f todo-api && docker volume rm todo-data   # remove data too
```

## API

All requests/`responses` are JSON. Errors use the [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) problem-details shape.

### Endpoints

| Method   | Path                    | Description                                        |
| -------- | ----------------------- | -------------------------------------------------- |
| `GET`    | `/health`               | Liveness check → `{ "status": "ok" }`              |
| `POST`   | `/todos`                | Create a to-do → `201` with the created entity     |
| `GET`    | `/todos`                | List to-dos (filtering / sorting via query params) |
| `GET`    | `/todos/:id`            | Get a single to-do by id                           |
| `PUT`    | `/todos/:id`            | Partially update title / description / dueDate     |
| `PATCH`  | `/todos/:id/complete`   | Mark a to-do as completed                          |
| `PATCH`  | `/todos/:id/incomplete` | Mark a to-do as not completed                      |
| `DELETE` | `/todos/:id`            | Delete a to-do → `204`                             |

### Entity shape

```json
{
  "id": "8f7e...uuid...",
  "title": "Buy milk",
  "description": "2 litres",
  "dueDate": "2026-05-10",
  "isCompleted": false,
  "createdAt": "2026-05-01T09:30:00.000Z"
}
```

- `title` — required, non-empty string.
- `description` — optional, may be omitted.
- `dueDate` — optional calendar date, `YYYY-MM-DD` (validated to be a real calendar date).
- `isCompleted` — boolean, defaults to `false`. **Not writable via `PUT`**; use the dedicated complete/incomplete endpoints.
- `createdAt` — ISO-8601 timestamp, set server-side on creation.

### Examples

```bash
# Create
curl -X POST localhost:3000/todos \
  -H 'content-type: application/json' \
  -d '{"title":"Buy milk","description":"2 litres","dueDate":"2026-05-10"}'

# List (defaults: status=all, sort=createdAt, direction=asc)
curl 'localhost:3000/todos?status=overdue&sort=dueDate&direction=desc'

# View
curl localhost:3000/todos/8f7e...uuid...

# Update (partial merge — omit fields you don't want to change)
curl -X PUT localhost:3000/todos/8f7e...uuid... \
  -H 'content-type: application/json' -d '{"description":"3 litres"}'

# Complete / incomplete
curl -X PATCH localhost:3000/todos/8f7e...uuid.../complete
curl -X PATCH localhost:3000/todos/8f7e...uuid.../incomplete

# Delete
curl -X DELETE localhost:3000/todos/8f7e...uuid...
```

### Validation notes

- Unknown fields in a create/update body are **rejected** (`400`). This is why `isCompleted` on `POST`/`PUT` fails.
- `PUT` is a **partial merge**, not an RFC 9110 full replace — omitted fields are left unchanged. This deviates from the RFC on purpose so a partial update can't blank fields you didn't mention. Passing `null` explicitly is rejected.
- `dueDate` must be a real calendar date (rejects `2026-02-31`, `2026-13-01`, etc.).
- A non-UUID `:id` is rejected with `400`.

## Web client

A small static page is served at `/` (from `public/`). It lets you add a to-do, view one by id, and list/filter/sort the collection with inline edit, complete, and delete actions. All rendering uses `textContent` (never `innerHTML`) to avoid XSS.

## Testing

```bash
npm test              # run once (Vitest)
npm run test:watch    # watch mode
npm run test:coverage # coverage report (currently ~97% statements)
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint
npm run build         # compile to dist/
```

**73 tests across 11 files** cover:

- **Unit tests** for the application service, run against an in-memory fake repository (fast, no I/O).
- **Integration tests** for the SQLite repository against an in-memory database — this is where filtering/sorting/null-handling bugs actually live.
- **End-to-end API tests** via `supertest` against a temp-file database, plus a boot smoke test to prove the file path and migrations work.

## Architecture

```
src/
  model/          Todo entity + invariants (createTodo, normalizeTitle)
  repository/     TodoRepository port (interface) + SqliteTodoRepository implementation
  application/    TodoService — pure use cases (CRUD, complete/incomplete, filter, sort)
  infrastructure/ Clock, SystemClock, db.ts, migrations.ts
  api/            routes/, zod validation, problem-details errors, error middleware
  container.ts    Composition root — the ONLY place that knows concrete classes
  app.ts          Express app assembly (createApp)
  index.ts        Process entrypoint (loads .env, opens DB, boots server)
tests/            Mirrors src/ per layer
```

### Key design choices

- **Dependency inversion.** `TodoService` depends only on the `TodoRepository` interface and a `Clock`, never on SQLite. The service owns all decisions (filtering, sorting, `overdue`); the repository owns all queries. Swapping the storage (e.g. to another DB, or an in-memory fake in tests) is a one-class change.
- **Filter/sort lives in the service, not SQL.** `list({ status, sort, direction })` is pure domain logic over `repo.findAll()`. Sorting in SQL would leak business logic into the data layer and force every consumer to reimplement it. `overdue` is a domain concept, not a query fragment. (`findAll` deliberately has no `ORDER BY`.)
- **Validation at the boundary only.** zod validates HTTP bodies and query strings in `api/`; the service still guards its own invariants (e.g. title). SQL injection is prevented by parameterized prepared statements, not by validation.
- **IDs are UUIDs** (`crypto.randomUUID()`), not incrementing integers — non-enumerable, no counter coordination, no information leak about row count.
- **`createdAt` and `dueDate` are stored as strings.** `createdAt` is ISO-8601 (sorts lexicographically, round-trips to JSON losslessly). `dueDate` is `YYYY-MM-DD` because it's a calendar date, not an instant — a JS `Date` would shift by the reader's timezone.
- **Migrations.** A `migrations` table plus an ordered list applied in a transaction at startup, rather than a bare `CREATE TABLE IF NOT EXISTS`.
- **RFC 7807 problem-details** for all error responses, with field-level detail for validation failures.
- **The read cache is a decorator** (`CachedTodoRepository`) that wraps the real repository. It's demonstrated capability, off-by-default TTL semantics, and — importantly — not something this app needs at its scale (see trade-offs).

## Trade-offs

- **In-memory read cache is overkill at this scale.** SQLite reads are fast and the data is small; the cache exists to demonstrate the decorator pattern and cache-invalidation discipline (all four invalidation points live in one class). Its TTL is defaulted to `30s` and can be disabled with `CACHE_TTL_MS=0`.
- **UUID string IDs** trade slightly larger keys and non-sequential ordering for non-enumerability and simpler distributed creation.
