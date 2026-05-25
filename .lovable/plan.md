# SDU Find — Build Plan

A mobile-first responsive lost & found web app for Southern Delta University, Ozoro, styled like a practical student project (deep blue #003087, white, system fonts, soft shadows, SVG icons only, no emojis). Search for SDU online and use the university logo as the logo for the app 

## Backend (Lovable Cloud)

Enable Lovable Cloud, then create:

**Tables**

- `profiles` — id (uuid, FK auth.users), matric_no, full_name, department, email, phone, created_at
- `user_roles` — id, user_id, role enum('admin','user') (separate table; `has_role()` security-definer function)
- `items` — id, reporter_id, type enum('lost','found'), category, title, description, location, item_date, image_urls text[], status enum('open','claimed','returned','rejected'), created_at
- `claims` — id, item_id, claimant_id, proof_details, status enum('pending','approved','rejected'), created_at
- `notifications` — id, user_id, title, body, link, read, created_at

**Storage**: public bucket `item-images` (1–3 photos per item).

**RLS**

- profiles: user can read/update own; everyone can read basic profile of reporters.
- items: anyone authenticated can read open items; owner can update/delete; admin full access.
- claims: claimant + item owner + admin can read; claimant inserts; owner/admin updates status.
- notifications: user reads/updates own.
- Auto-create profile + default 'user' role via trigger on `auth.users` insert.

**Server functions** (`createServerFn`, `requireSupabaseAuth`)

- createItem, updateItemStatus, submitClaim, decideClaim, markReturned, listItems (filters), getItem, listMyNotifications.
- On found-item create or claim decision, insert notification rows for matched lost-item reporters (simple category+keyword match).

## Frontend (TanStack Start, mobile-first)

**Design tokens** in `src/styles.css`: `--primary` #003087, `--accent` #FFB800, neutral grays, soft 1px borders, `--radius 8px`, subtle shadow. System font stack. Bottom-nav-safe padding.

**Layout shells**

- `_authenticated.tsx` — gates routes, renders `<Outlet/>` with bottom nav (Home, Search, Report, Profile) using inline SVG icons.
- `_admin.tsx` under `_authenticated` — requires admin role.

**Routes**

- `/login`, `/signup` — simple forms (matric no, name, department, email/phone, password); zod validation.
- `/` (Home) — recent found items as cards (thumb, title, location, time-ago).
- `/search` — search bar + filter sheet (category, location, date); list/grid of cards.
- `/report` — single form with Lost/Found toggle, category dropdown, title, description, location, date, photo upload (1–3 with previews).
- `/items/$itemId` — large photo carousel, details, "Claim this item" button.
- `/items/$itemId/claim` — proof form (unique features, serial, etc.).
- `/profile` — user info, my reported items, my claims, sign-out.
- `/notifications` — in-app notification list.
- `/admin` — items table with approve/reject claims, mark returned.

**Components**: ItemCard, ItemForm, ClaimForm, BottomNav, TopBar, FilterSheet, PhotoUploader, EmptyState, SvgIcon set.

**Forms**: react-hook-form + zod; clear labels, helpful placeholders, no emojis.

**Notifications**: poll `/notifications` query; badge on bottom nav.

## Out of scope (initial build)

- Email alerts (in-app only for now; can add via Lovable email infra later).
- Realtime push.
- Advanced fuzzy matching (use simple category + ILIKE on title).

## Technical notes

- Use `supabaseAdmin` only in server fns; browser uses publishable client for auth + storage upload.
- Image upload via supabase-js from browser → public bucket → store URL array in `items.image_urls`.
- All colors via semantic tokens; no hardcoded hex in components.
- Bottom nav fixed; pages add bottom padding to avoid overlap.

Confirm to proceed and I'll enable Lovable Cloud, run migrations, and build the routes.