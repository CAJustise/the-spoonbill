# The Spoonbill

Original Spoonbill Lounge Vite/React site restored from the local project source.

## Run locally

```bash
npm ci
npm run dev
```

## Local BOH / Admin login

This project now defaults to a local data layer (no Supabase required).

- Email: `admin@spoonbill.local`
- Password: `spoonbill-admin`
- Admin route: `/admin/login`

## Optional remote Supabase mode

If you ever want to reconnect to Supabase, copy `.env.example` to `.env` and set:

- `VITE_USE_REMOTE_SUPABASE=true`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

## Deployment

GitHub Actions workflow deploys this site to GitHub Pages on every push to `main`.
