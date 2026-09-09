# 10 · Deployment

**The hosting target is not yet decided.** Nothing here assumes a managed cloud service. Everything runs from Docker Compose on a single VM and can later be split.

## Topology

```
nginx (TLS)
   ├── /            → web    (Next.js, node:22-alpine)
   └── /api         → api    (NestJS, node:22-alpine)
                        ├── postgres:16   (volume)
                        ├── redis:7       (volume)
                        └── minio         (volume)  ← S3-compatible object storage
   worker  (same image as api, CMD=worker)  ← BullMQ: notifications, PDFs, cron
```

Images are multi-stage: build with dev dependencies, run with production only, non-root user, `NODE_ENV=production`.

## Environments

| | dev | staging | production |
|---|---|---|---|
| Data | seeded demo set | anonymised copy | live |
| Email | mailpit | mailpit | SMTP relay *(provider TBD)* |
| WhatsApp | console adapter | aggregator sandbox | aggregator live |
| Storage | minio | minio | minio or department object store |

## Environment variables

`.env.example` lists every key. The ones that must never be defaulted:
`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `WA_API_KEY`, `WA_WEBHOOK_SECRET`, `SMTP_*`.

Secrets come from the environment or a mounted file. Never from the repository, never baked into an image.

## Release

1. CI on the tag: lint, typecheck, unit, API, E2E, build images, push.
2. `docker compose pull && docker compose up -d --no-deps api worker web`.
3. Migrations run on api boot behind an advisory lock so only one instance migrates.
4. Health `/api/v1/health`, readiness `/api/v1/ready` — readiness fails until migrations finish.
5. Roll back by re-pinning the previous image tag. **Migrations must be backwards-compatible for one release**: add columns nullable, backfill, switch reads, drop in the following release. Never drop a column in the same release that stops writing it.

## Backup

- Postgres: `pg_dump` nightly, retained 30 days, plus WAL archiving for point-in-time recovery.
- Object storage: nightly mirror to a second location.
- **Rehearse a restore once before go-live and once a quarter after.** An unrehearsed backup is a rumour.
- The audit table is exported monthly to signed CSV and held for seven years independently of the database.

## Observability

Structured JSON logs with a request id threaded through to the queue. Metrics: request rate and latency by route, queue depth and job failure rate, dispatch failure rate by channel, MoMs past SLA. Alerts: dispatch failure over 5% in an hour, queue depth over 500, any 5xx rate over 1%, migration failure, disk over 80%.

## Go-live checklist

- [ ] WhatsApp templates registered and approved with the aggregator — start this in week one, approval takes days
- [ ] Email relay credentials issued and a test message delivered
- [ ] Real project, ULB, designation and officer master data loaded and verified by the PDMC
- [ ] Access matrix reviewed and signed off by the Mission Director
- [ ] Restore rehearsed
- [ ] Penetration test closed out
- [ ] Coordinator training done; the prototype is the training aid
- [ ] Both open decisions closed, or explicitly accepted as deferred
