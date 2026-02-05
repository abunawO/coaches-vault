# Observability & Logs

## Where logs go
- Production containers: Rails logs to STDOUT (set by `RAILS_LOG_TO_STDOUT=1` in `Dockerfile`).
- Kamal tails container STDOUT/STDERR; no file-based logs in production by default.

## How to tail logs
- Web container: `bin/kamal logs -f`
- Specific role/server (if added): `bin/kamal logs -f -r web`
- Search locally by request id: `grep "[request-id]" log/production.log` (or use your log aggregator if attached later).

## Log tags now included
- `request_id` (Rails-generated), `ip:<remote_ip>`, `user:<id-or-email>` (falls back to `user:guest`).

## Log level
- Controlled by `RAILS_LOG_LEVEL` (default `info`), set in the environment before deploy if you need more/less verbosity.

## Request context
- Per-request context lives in `Current` (request_id, remote_ip, user). Tags are applied automatically in all environments.

## Sentry
- Required env: `SENTRY_DSN`
- Optional env: `SENTRY_INCLUDE_EMAIL=1` (attach user email), `KAMAL_VERSION` or `GIT_SHA` (release tag)
- Enabled only when DSN is set and environment is production (or set `SENTRY_ENV_ALLOWED=1` to allow manually).
- Privacy: `send_default_pii` is false; params/headers are not sent.
- Local verification without sending: leave `SENTRY_DSN` unset; initializer will no-op.
- Safe production test (once DSN is set): `RAILS_ENV=production SENTRY_DSN=... bin/rails runner 'raise \"Sentry test error\"'` (run sparingly).
