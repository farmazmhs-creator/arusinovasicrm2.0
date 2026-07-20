# ArusInovasi CRM

B2B sales CRM for a Malaysian medical-device distributor. Phase 1 MVP.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL, Auth, RLS)
- **Vercel** hosting

## Features (Phase 1)

- Public dashboard with 6 KPI cards (via a `security definer` RPC so no data is exposed)
- Email/password auth (signup, login, logout) with Supabase Auth
- Quotations: list + status filter, create with line items + discount, detail view, status change, soft delete
- Purchase orders: list + status filter, detail view, status change, mark delivered
- Customers: list view
- REST API routes under `/api/*`
- Route protection via middleware

## Local setup

```bash
npm install
cp .env.local.example .env.local   # values already point at the live project
npm run dev
```

Open http://localhost:3000

## Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

These are also hardcoded as fallbacks in `lib/config.ts`, so the app works even
if the env vars are not set (both are public values). To rotate, set the env
vars in Vercel and remove the fallbacks.

## Database

Schema and seed data are already applied to the Supabase project. Tables:
`customers`, `sales_reps`, `products`, `quotations`, `quotation_items`,
`purchase_orders`, `po_items`, `user_profiles`. RLS is enabled on all tables;
authenticated users have full CRUD. A trigger auto-creates a `user_profiles`
row on signup.

## Auth note

If "Confirm email" is enabled in Supabase Auth settings, new signups must
confirm via email before the first login. Disable it under
**Authentication → Providers → Email** for instant-access testing.

## Phase 2 (not built yet)

Excel/bulk data import for the historical 922 transactions.
