# Architecture Overview

This document captures the high-level structure of the Social Accountability MVP
so new contributors can orient themselves quickly.

## Layers

1. **UI (app/, components/)**  
   - `app/` follows Expo Router's file-system convention. Routing stays thin and
     delegates to feature components.
   - `components/` holds feature-specific UI (`goals/`, `friends/`,
     `social/`) plus `components/ui/` primitives. The primitives expose
     TypeScript components (e.g., `Button`, `Card`, `Text`) that wrap the themed
     design system.

2. **State & Hooks (contexts/, hooks/)**  
   - `contexts/AuthContext` bootstraps Firebase auth and exposes the `user`.
   - Hooks (`useGoals`, `useFriends`, `useNotifications`, `useSync`, etc.)
     encapsulate feature logic and are the only layer that talks to Firebase
     services directly. Hooks return plain values/callbacks for presentation
     components.

3. **Services (services/firebase/)**  
   - Core CRUD + domain logic lives here (see
     `services/firebase/README.md` for detailed mapping). Every Firestore call
     runs through these modules to keep security rules/collection paths in one
     place.

4. **Backend automations (functions/src/)**  
   - Cloud Functions enforce deadlines, send nudges, and keep streak documents
     up to date. Client services call callable functions via
     `services/firebase/cloudFunctions.ts`.

## Data Flow

```
UI Component → Hook (useGoals/useFriends/...) → Firebase Service →
Firestore/Cloud Function → Hook → UI
```

- Hooks subscribe to Firestore (e.g., `useGoals` = `getUserGoals` listener) and
  map results into UI-friendly objects.
- Mutations call service helpers (`createGoal`, `sendNudge`, `completeGoal`)
  which perform validation, analytics, and server calls in one place.

## Navigation

- Root layout resides in `app/_layout.tsx` and wires up Theme/Auth/Toast/Offline
  providers.
- Tabs live under `app/(tabs)/` with shared layout logic in
  `app/(tabs)/_layout.tsx`.
- Deep links go through Expo Router; use `router.push`/`Link`.

## Styling

- `contexts/ThemeContext.tsx` exposes semantic colors/spacing/typography.
- UI primitives pull from `useThemeStyles` to ensure consistent spacing and
  text styles; always import components from `@/components/ui`.

## Offline Sync

- `hooks/useSync` mounts once (via `OfflineIndicator`) and starts
  `syncService.startRealtimeSync(userId)` plus a `forceSyncUserData` call. This
  combination pulls the user's streak/completion docs, caches them in
  AsyncStorage (per-document and aggregate records), then keeps them fresh via
  Firestore listeners.
- `syncService` exposes helpers such as `getCachedStreakMap()` so hooks like
  `useGoals` can hydrate UI state before Firestore responses arrive. Cached data
  powers offline screens and speeds up goal streak rendering.
- Cache keys live under `@habit_streaks_cache*` / `@habit_completions_cache*`;
  `syncService` automatically prunes stale keys when data changes.

## Quality Gates

- Run `npm run check` (lint + tests) before committing.
- Firestore rule tweaks should update `firestore.rules` **and**
  `docs/guides/SECURITY_RULES.md`, then exercise `scripts/test-security-rules.ts`.

Keeping these boundaries intact ensures the app stays maintainable as features
grow.
