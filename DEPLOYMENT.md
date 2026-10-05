# Safe deployment contract

The site is designed around one rule: **a visitor request must never depend on
an external F1 data provider.**

## Environments

Use three independent environments:

| Environment | Purpose | Public traffic |
| --- | --- | --- |
| Local | VS Code development and exploratory imports | No |
| Preview | Automatic deployment for each pull request | No |
| Production | Approved release only | Yes |

GitHub stores source code, pull requests, checks, and deployment history. VS
Code remains the normal place to edit and run the project.

## Release flow

1. A background/manual importer fetches provider data into a staging database or
   versioned object-storage prefix.
2. Validation checks completeness, schema, and expected race/result counts.
3. Only a successful import is promoted atomically. SQLite development imports
   use an atomic file replacement; production should use a transaction or a
   versioned release pointer.
4. CI must pass API tests plus the web lint/build before a preview deployment.
5. Promote the tested preview to production. Keep the previous build and data
   release available for immediate rollback.

## Hosting boundary

- **Static GitHub Pages (Client-Side Mode):** `apps/web` is deployed as an immutable static Single Page Application on GitHub Pages / CDN, reading pre-generated static session/telemetry datasets and directly accessing Jolpica Ergast for historical results.
- **Full API Gateway Mode:** Deploy `apps/api` as a separately health-checked FastAPI service with `/health` and SQLite storage (`var/f1-data-lab.sqlite3`) when running a persistent backend tier.
- Put the database and telemetry assets behind managed backups and retention.
- Set `F1_ALLOWED_ORIGINS` to the exact production and preview domains; do not use a wildcard CORS policy.
- Run Jolpica and FastF1 importers as scheduled workers, never inside the API or frontend runtime.

## Compatibility rules

- Public endpoints remain under `/api/v1`; incompatible changes get a new
  version instead of replacing existing responses.
- Database migrations are additive first, then application code is deployed,
  and only later are obsolete fields removed.
- Features use the API capability map. For example, a 2010 telemetry page must
  render an unavailable state rather than issue a FastF1 request.
- Pin dependency versions in the deployment image and update them in dedicated,
  tested pull requests.
