# Connectra

Private company chat and file sharing web app for small teams.

## Stack

- React + TypeScript + Vite
- Supabase Auth, Postgres, Realtime, Storage, Edge Functions
- Cloudflare Pages hosting
- PWA install support

## First setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260718120000_initial_connectra.sql` in Supabase SQL editor.
3. Run `supabase/migrations/20260719093000_company_lobby.sql` in Supabase SQL editor.
4. Create private storage buckets:
   - `avatars`
   - `chat-attachments`
5. Deploy `supabase/functions/create-employee`.
6. Add the following values in Cloudflare Pages environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Create the first admin user from Supabase Auth dashboard, then insert its profile row:

```sql
insert into public.profiles (id, full_name, email, role, status)
values ('AUTH_USER_UUID', 'Admin Name', 'admin@company.com', 'admin', 'active');
```

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add Supabase keys when the Supabase project is ready.

## Deploy

Cloudflare Pages settings:

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

## Notes

- Public signup is not used.
- Employees are created only through the admin panel and Supabase edge function.
- The app runs in demo mode until Supabase keys are configured.
