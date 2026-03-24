# RO Navigator

A Progressive Web App for automotive technicians to track Repair Orders (ROs), monitor pay-period hours, and export payroll summaries.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 (SWC) |
| Styling | Tailwind CSS + shadcn/ui (Radix) |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| State | React Context + custom hooks |
| Offline | IndexedDB read cache + write queue, Service Worker (VitePWA) |
| Payments | Stripe (via Supabase Edge Functions) |
| Testing | Vitest + Testing Library |
| Notifications | Sonner |

## Features

- **RO CRUD** — create, edit, soft-delete with undo, multi-line labour entries
- **Search & filter** — full-text search across RO number, advisor, customer, vehicle, VIN, notes, and line descriptions; date range and labour-type filters
- **Pay period summaries** — daily/weekly/biweekly/monthly breakdowns, closeable periods, PDF/CSV/XLSX export
- **Offline-first** — reads served from IndexedDB cache on disconnect; writes queued and replayed with retry on reconnect
- **Pro subscription** — Stripe billing, feature gating, trial countdown
- **Scan flow** — photo capture → AI line extraction
- **Flag inbox** — flag RO lines for follow-up (needs time, questionable, waiting, etc.)
- **Responsive** — mobile tab layout and desktop dual-panel layout share the same codebase

## Local Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (free tier works)

### Steps

```sh
# 1. Clone
git clone <repo-url>
cd swift-ro-craft

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in your Supabase URL, publishable key, and project ID
# (Supabase Dashboard → Project Settings → API)

# 4. Start dev server (http://localhost:8080)
npm run dev
```

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server with HMR on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run test` | Run Vitest test suite |
| `npm run test:watch` | Watch mode |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type check (no emit) |

## Environment Variables

All variables are prefixed `VITE_` and are injected at build time. See `.env.example`.

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Full Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref (used by scan flow) |

> **Never commit `.env`**. It is listed in `.gitignore`.

## Project Structure

```
src/
├── components/         # UI components
│   ├── tabs/           # Top-level tab views (ROsTab, SummaryTab, SettingsTab)
│   ├── mobile/         # Mobile-specific layout and sheets
│   ├── desktop/        # Desktop dual-panel layout
│   ├── settings/       # Settings section components
│   ├── summary/        # Summary and charting components
│   ├── reports/        # Closeout and export views
│   ├── scan/           # Photo scanning workflow
│   ├── flags/          # Flag inbox components
│   └── ui/             # shadcn/Radix primitives
├── contexts/           # React contexts (Auth, RO, Offline, Flag, Subscription)
├── features/ro/        # RO feature: domain, data, hooks, UI
├── hooks/              # Custom hooks (useROStore, useOfflineSync, useUserSettings, …)
├── lib/                # Pure utilities (filters, export, offline queue, cache, …)
├── pages/              # Route-level page components
├── types/              # TypeScript type definitions
└── test/               # Vitest setup
```

## Key Architectural Decisions

### Offline architecture
- **Read cache** (`src/lib/roLocalCache.ts`): IndexedDB snapshot updated after every successful server fetch and after optimistic mutations. Served immediately on startup while live data loads.
- **Write queue** (`src/lib/offlineQueue.ts`): IndexedDB action queue with deduplication (one pending update per RO ID). Replayed in creation order with up to 3 retries on reconnect.
- **Service Worker**: Network-first for Supabase API calls; cache-first for CDN assets.

### Notification system
All user-facing toasts use **Sonner** (`import { toast } from 'sonner'`). The shadcn `useToast` hook is present as a shadcn baseline file but is not used by application code.

### State management
No global store library. State lives in React contexts backed by custom hooks:
- `ROContext` → `useROStore` (RO list, presets, advisors, optimistic mutations)
- `FlagContext` → `useFlags` + `useUserSettings`
- `OfflineContext` → `useOfflineSync`
- `SubscriptionContext` → Stripe billing state

## Testing

```sh
npm run test
```

Tests live alongside source files as `*.test.ts` / `*.test.tsx`. Current coverage includes:

- `src/lib/roFilters.test.ts` — RO sort, search, and normalisation
- `src/lib/dateRangeFilter.test.ts` — date bounds and effective-date logic
- `src/lib/offlineQueue.test.ts` — enqueue, deduplication, retry tracking
- `src/lib/roLocalCache.test.ts` — IndexedDB snapshot save/load/clear
- `src/lib/exportUtils.test.ts` — CSV/text generation
- `src/lib/closeoutExport.test.ts` — closeout snapshot logic
- `src/lib/payPeriodUtils.test.ts` — pay period calculations
- `src/lib/scanStateMachine.test.ts` — scan state machine transitions
- `src/lib/subscriptionAccess.test.ts` — Pro access and billing issue detection
- `src/hooks/useUserSettings.test.ts` — settings persistence, fallback, optimistic updates
- `src/hooks/useCloseouts.test.ts` — closeout hook
- `src/features/ro/domain/buildRoPayload.test.ts` — RO payload construction
- `src/components/mobile/StatusPill.test.tsx` — status pill rendering

## Deployment

The app is a static SPA + Supabase backend. Build with `npm run build` and serve `dist/` from any static host (Netlify, Vercel, Cloudflare Pages, etc.). The service worker enables offline use after the first load.

Supabase Edge Functions handle Stripe webhooks and the AI scan flow — deploy those separately via the Supabase CLI.
