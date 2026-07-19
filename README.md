# RentFlow API

NestJS + TypeORM + PostgreSQL backend for RentFlow. Serves both the web
(`fleetflow-frontend`) and mobile (`fleetflow-app`) clients over a JWT-secured
REST API.

## Stack

- **NestJS 11** — HTTP framework
- **TypeORM** — ORM / schema management
- **PostgreSQL** — database (local, running on port `3000` in this setup)
- **Passport + JWT** — authentication
- **class-validator** — request validation

## Roles

| Role       | Capabilities                                                                     |
| ---------- | -------------------------------------------------------------------------------- |
| `admin`    | Everything: full user management + create accounts of any role                   |
| `owner`    | Full read/write on vehicles, drivers, trips; may create **customer** accounts    |
| `customer` | Read-only on vehicles, drivers, trips (created via self-register)                |

### Account creation

- **Anyone** can self-register via `POST /api/auth/register` → always a `customer`.
- **Owners** can create accounts via `POST /api/users`, but only `customer`
  accounts (they cannot create/escalate to `owner` or `admin`).
- **Admins** can create accounts of any role and manage (list/update/delete) all
  accounts.

## Setup

### 1. Configure environment

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

Key values (defaults target the local Postgres on port 3000):

```
PORT=5000
DB_HOST=localhost
DB_PORT=3000
DB_USERNAME=postgres
DB_PASSWORD=admin
DB_DATABASE=rentflow
DB_SYNCHRONIZE=true   # dev only — auto-creates tables from entities
JWT_SECRET=change-me
ADMIN_EMAIL=admin@rentflow.local
ADMIN_PASSWORD=admin1234
```

### 2. Create the database

Either run the bootstrap script as the `postgres` superuser:

```bash
psql -U postgres -h localhost -p 3000 -f db/setup.sql
```

...or just create the database (if connecting as `postgres` directly):

```sql
CREATE DATABASE rentflow;
```

Tables are created automatically by TypeORM on first start (`DB_SYNCHRONIZE=true`).

### 3. Run

```bash
npm install
npm run start:dev      # watch mode
# or
npm run build && npm run start:prod
```

On first boot a default admin is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
(only if no users exist yet). API is served at `http://localhost:5000/api`.

## API

All routes are prefixed with `/api`. All routes require an
`Authorization: Bearer <token>` header **except** those marked _public_.

### Auth

| Method | Path                | Access   | Description                          |
| ------ | ------------------- | -------- | ------------------------------------ |
| POST   | `/api/auth/register`| public   | Self-register (creates a `customer`) |
| POST   | `/api/auth/login`   | public   | Returns `{ accessToken, user }`      |
| GET    | `/api/auth/me`      | any user | Current authenticated user           |
| GET    | `/api/health`       | public   | Health check                         |

### Resources (`vehicles`, `drivers`, `trips`)

Each exposes standard CRUD. Reads are open to any authenticated user; writes
(`POST` / `PATCH` / `DELETE`) require `admin` or `owner`.

| Method | Path                  | Access        |
| ------ | --------------------- | ------------- |
| GET    | `/api/{resource}`     | any user      |
| GET    | `/api/{resource}/:id` | any user      |
| POST   | `/api/{resource}`     | admin / owner |
| PATCH  | `/api/{resource}/:id` | admin / owner |
| DELETE | `/api/{resource}/:id` | admin / owner |

### Users (admin only)

`GET|POST /api/users`, `GET|PATCH|DELETE /api/users/:id` — full user management,
including setting roles.

## Example

```bash
# Login as the seeded admin
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentflow.local","password":"admin1234"}' \
  | jq -r .accessToken)

# Create a vehicle
curl -X POST http://localhost:5000/api/vehicles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Truck 01","make":"Volvo","model":"FH16","year":2022,"licensePlate":"ABC-123"}'
```

## Clients

- **Web** (`fleetflow-frontend`): API client at `src/lib/api.js`, configured via
  `VITE_API_URL`.
- **App** (`fleetflow-app`): API client at `src/lib/api.ts`, configured via
  `EXPO_PUBLIC_API_URL` (auto-uses `10.0.2.2` on the Android emulator).

## Production notes

- Set `DB_SYNCHRONIZE=false` and use TypeORM **migrations** instead of schema sync.
- Use a strong random `JWT_SECRET` and rotate the seeded admin password.
- Restrict `CORS_ORIGINS` to your real web/app domains.
