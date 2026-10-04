# CampusBite Server — Phase 3

Node.js + Express + TypeScript + PostgreSQL/Neon + JWT.
https://aashaydagade1.github.io/CampusBite/?

## Phase 3 endpoints
- `POST /payments/create-order` — create a local order and Razorpay/mock payment order
- `POST /payments/verify` — verify Razorpay signature and mark payment paid
- `GET /orders/:id` — fetch one order for its student or a vendor
- `POST /notifications/register` — register an Expo push token
- `PATCH /orders/:id/status` — vendor changes order status and triggers socket/push updates

## Database
For an existing Phase 2 database, run `migration_phase3.sql` once. For a fresh database, use `schema.sql`.

## Environment
Copy `.env.example` to `.env`. Keep `RAZORPAY_KEY_SECRET` server-side only. Use `PAYMENT_MODE=mock` until Razorpay test keys are configured.
