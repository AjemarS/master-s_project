# Notification Service

## Stack
- **Runtime:** Node.js 24 LTS (Alpine)
- **Language:** TypeScript (run with `tsx` in dev, compiled with `tsc` for prod)
- **HTTP:** Express 4.21
- **Database:** PostgreSQL via `pg` 8.22
- **Message Broker:** RabbitMQ via `amqplib` 0.10
- **Email:** Resend 4.0
- **Logging:** Winston 3.19 (JSON in production, colorized in dev, console in test)

## Routes (all under `/api/notifications/`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` (service root, not under `/api/notifications/`) | none | Health check (consumer + SSE status); the gateway's `/health` aggregate reads it |
| GET | `/` | ownUserId/admin | List paginated notifications |
| GET | `/unread/:userId` | ownUserId/admin | Unread count |
| PATCH | `/:id/read` | gatewayId | Mark notification read |
| PATCH | `/read-all/:userId` | ownUserId/admin | Mark all read |
| POST | `/:id/dismiss` | gatewayId | Dismiss notification |
| DELETE | `/:userId` | ownUserId/admin | Clear all (soft-delete) |
| GET | `/preferences/:userId` | ownUserId/admin | Get notification prefs |
| PATCH | `/preferences/:userId` | ownUserId/admin | Update notification prefs |
| GET | `/stream` | ownUserId/admin | SSE stream for real-time |
| POST | `/marketing` | admin + rate limited | Bulk marketing push |

## Event Consumption

**Exchange:** `techhub.events` (topic, durable)

| Queue | Binding Key | Consumer |
|-------|------------|----------|
| `notification.order.confirmed` | `order.created` | Email + in-app to customer |
| `notification.status_changed` | `order.status_changed` | Email + in-app to customer |
| `notification.order.cancelled` | `order.cancelled` | Email + in-app to customer |
| `notification.low_stock` | `inventory.low_stock` | Email to ADMIN_EMAIL + in-app to admins |

**Dedup:** Dual in-memory Set (5min TTL) + DB `processed_events` table (`ON CONFLICT DO NOTHING`).

## Auth

Trusts `X-Gateway-User-*` headers from Nginx. Two middleware:
- `requireOwnUserId` — requires `userId` match or admin role
- `requireGatewayId` — requires non-empty `X-Gateway-User-Id` header

## Databases

### notifications_db (own)
- `notifications` — in-app notification records
- `notification_preferences` — per-user notification toggles
- `processed_events` — dedup log (auto-cleaned after 24h)

### No auth_db access
User email/name lookups and admin recipients come from auth-service over HTTP (`src/admin.ts`, `AUTH_SERVICE_URL`).

## Channels

- **In-app:** DB record + SSE push
- **Email:** Resend.com API
- **SSE:** GET `/stream` — long-lived HTTP; each instance keeps its own `Map<userId, Set<Response>>`, and pushes go through Redis Pub/Sub so every instance delivers to its own clients

## Architecture Notes

- SSE scales horizontally via Redis Pub/Sub (`src/sse.ts`)
- Schema: one approach, `src/db-init.ts` creates tables idempotently (`CREATE TABLE IF NOT EXISTS`) on start; the unused node-pg-migrate copy of the same schema was removed
- Old dismissed notifications purged after 3 days via periodic cleanup
