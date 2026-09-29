# CampusBite Server
   **Live API:** https://campusbite-server.onrender.com/health
REST API for a campus mess/tiffin ordering app.
Stack: Node.js, Express, TypeScript, PostgreSQL (Neon), JWT auth, zod validation.

## Setup
1. `npm install`
2. Create a `.env` file (copy `.env.example`) and fill in `DATABASE_URL` and `JWT_SECRET`
3. Run `schema.sql` in your Postgres database
4. `npm run dev`

## Make a vendor account
Sign up normally, then run in the SQL editor:
`UPDATE users SET role='vendor' WHERE email='v@test.com';`
Log in again to get a new token.

## Endpoints
| Method | Route | Access | Description |
|---|---|---|---|
| GET | /health | public | Health check |
| POST | /auth/signup | public | Create student account |
| POST | /auth/login | public | Login, returns JWT |
| GET | /menu | logged in | List available items |
| POST | /menu | vendor | Add menu item |
| PATCH | /menu/:id/availability | vendor | Toggle availability |
| POST | /orders | student | Place order |
| GET | /orders/mine | logged in | My orders |
| GET | /orders | vendor | All orders |
| PATCH | /orders/:id/status | vendor | Update order status |

Send the token as `Authorization: Bearer <token>`.
