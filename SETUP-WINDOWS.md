# Setting up on Windows, without Docker

You said Node is installed and Docker is not, so this is the path that needs
neither Docker Desktop nor WSL. Two installs, five commands.

Everything the compose file would have provided has a local equivalent, chosen
so that nothing extra has to be running:

| Compose service | What runs instead in development |
|---|---|
| PostgreSQL | PostgreSQL 16 installed natively — the one thing you do install |
| Redis | The queue runs **in process** (`QUEUE_DRIVER=memory`) |
| MinIO | Files go to `var/files` on disk (`STORAGE_DRIVER=local`) |
| Mailpit | Email is written to `var/mail` as `.eml` files you can double-click |

`docker-compose.yml` stays in the repository. The day you want the full set —
or when you move to a server — switch the four environment variables and it
works, with no code change. That is why they are adapters.

---

## 1 · Install PostgreSQL 16

Download the Windows installer from
<https://www.postgresql.org/download/windows/> and run it. During setup:

- Keep the default port **5432**.
- Set a password for the `postgres` superuser and **write it down**.
- The Stack Builder step at the end can be skipped.

Then open **SQL Shell (psql)** from the Start menu, press Enter through the
prompts, type the password, and run:

```sql
CREATE ROLE ucf LOGIN PASSWORD 'ucf_dev_only';
CREATE DATABASE mom_tracker OWNER ucf;
```

If you would rather use the `postgres` superuser, skip that and change
`DATABASE_URL` in step 3 instead.

## 2 · Enable pnpm

Node 20+ ships with Corepack, which installs pnpm for you:

```powershell
corepack enable
corepack prepare pnpm@10 --activate
pnpm --version
```

## 3 · Configure

From the repository root, in PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and change two things:

- `DATABASE_URL` — only if you used the `postgres` superuser rather than the
  `ucf` role above.
- The two `JWT_*` secrets. Any long random string will do in development:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 4 · Install, migrate, seed

```powershell
pnpm install
pnpm db:deploy          # applies prisma/migrations
pnpm db:seed            # loads the prototype's dataset
pnpm assert:invariants   # proves the two database guarantees hold
```

`pnpm db:seed` should print 3 projects · 14 users · 7 meetings · 19 items, and
`pnpm assert:invariants` should print eleven ticks. If either disagrees,
something is wrong with the database, not with your code — stop there.

## 5 · Run

```powershell
pnpm dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000/api/v1/health>

The dashboard shows a live check of all three services, so you can see at a
glance whether the API and the database are answering.

---

## Useful commands

```powershell
pnpm dev                 # api :4000 and web :3000 together
pnpm --filter @mom/api dev
pnpm --filter @mom/web dev

pnpm test                # unit + api tests
pnpm lint                # must be clean; --max-warnings 0
pnpm typecheck

pnpm db:migrate          # create a new migration after editing schema.prisma
pnpm db:reset            # drop, re-migrate, re-seed
pnpm db:studio           # browse the data
pnpm assert:invariants   # re-check the two database guarantees
```

## When something does not work

**`prisma generate` fails on install.** It downloads a query engine binary from
`binaries.prisma.sh`. If a corporate proxy blocks it, set `HTTPS_PROXY` and
retry; nothing else in the stack needs that host.

**`pnpm db:deploy` says the database does not exist.** The `CREATE DATABASE`
step in part 1 did not run, or `DATABASE_URL` points somewhere else. Check the
database name at the end of the URL.

**Port 5432 is already in use.** An older PostgreSQL is running as a service.
Either use it, or change the new one's port and update `DATABASE_URL`.

**The dashboard says the API is not reachable.** It is a separate process —
`pnpm dev` starts both, but if you started only the web app, start the API too.

## Moving off the development profile

Later, on a server:

```env
QUEUE_DRIVER=bullmq
REDIS_URL=redis://…
STORAGE_DRIVER=s3
EMAIL_PROVIDER=smtp
```

The application refuses to start in production with `QUEUE_DRIVER=memory` or
`EMAIL_PROVIDER=console`, so neither can be left on by accident.
