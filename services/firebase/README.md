# Firebase Services

Centralized Firebase helpers live in this directory. To keep things sane we group
them into **core app services**, **supporting utilities**, and **experimental**
modules that are not currently used by the mobile client.

## Directory Overview

```
services/firebase/
├── authService.ts              # Firebase Auth wrapper used by AuthContext
├── goalService.ts              # CRUD + streak hooks for habit goals
├── friendService.ts            # Friend graph + request subscriptions
├── socialService.ts            # User document subscriptions/feed helpers
├── notificationService.ts      # Expo push token registration + listeners
├── nudgeService.ts             # Client-side checks before invoking Cloud Functions
├── streakService.ts            # Authoritative habit streak calculations
├── streakSocialService.ts      # Shared streak feed + reactions
├── streakNotificationService.ts# In-app streak notifications preferences
├── milestoneService.ts         # Badge/milestone helpers
├── syncService.ts              # Offline/real-time sync coordinator
├── cloudFunctions.ts           # Thin wrappers over callable functions
├── collections.ts              # Typed Firestore collection/document helpers
└── README.md                   # This document
```

`contexts`, `hooks`, and `components` import from these modules directly (see
`hooks/useGoals.ts`, `hooks/useNotifications.ts`, etc.), so changes here have
an immediate impact on bundled code.

## Core Service Reference

| Module | Responsibility | Primary Consumers |
| --- | --- | --- |
| `authService.ts` | Sign-in/out, profile bootstrap, token refresh | `contexts/AuthContext`, `app/sign-in` |
| `goalService.ts` | Goal CRUD, completion handling, streak lookups | `hooks/useGoals`, `components/goals/*` |
| `friendService.ts` | Friend search, requests, badge counts | `app/(tabs)/_layout`, `hooks/useFriendRequests` |
| `socialService.ts` | Subscribe to user docs/friend feed | profile/friends components |
| `notificationService.ts` | Expo push token registration & listeners | `hooks/useNotifications` |
| `cloudFunctions.ts` + `nudgeService.ts` | Trigger server nudges with cooldown enforcement | `components/social/FriendsDashboard` |
| `streakService.ts` | Canonical habit streak calculations and completion recording | `hooks/useHabitCalendar`, `goalService`, streak hooks |
| `streakSocialService.ts` | Shared streak feed/posts/reactions | `components/social/*`, `hooks/useStreakSocial` |
| `streakNotificationService.ts` | Manage streak notification preferences + delivery | `components/habits/StreakNotificationSettings`, `hooks/useStreakNotifications` |
| `milestoneService.ts` | Badge + milestone tracking | `components/habits/*`, `streakService` |
| `syncService.ts` | Offline/PWA friendly listener management | `hooks/useSync`, `components/OfflineIndicator` |
| `collections.ts` | Strongly typed Firestore refs for shared models | Any module touching Firestore directly |

Each service exports plain async helpers—no React state—so they can be tested
independently (see `__tests__/`).

## Supporting Utilities

These modules are consumed by the core services but not by UI code:

- `habitStreakInterfaces.ts`, `habitStreakSchemas.ts`: zod schemas and DTO
  helpers used by `streakService`.
- `dataIntegrityService.ts`, `streakValidationService.ts`,
  `securityAuditService.ts`: validation/auditing helpers invoked inside streak
  operations.
- `scoringService.ts`: goal difficulty/score calculations, used by
  `hooks/useHabitScoring`.
- `streakRecoveryService.ts`, `streakNotificationService.ts`: focused helpers
  that extend `streakService`.
- Markdown references such as `COMPLETION_TRACKING.md`, `NOTIFICATIONS.md`,
  `SOCIAL_FEATURES.md`, `STREAK_RECOVERY.md` capture requirements for the
  corresponding services.

## Experimental / Legacy Modules

The following files remain in the repo for experimentation but are **not**
imported by the shipping app. Keeping them isolated prevents bloating the
bundle and makes it clear they are optional:

- `analyticsService.ts`, `optimizedAnalyticsService.ts`
- `cachingService.ts`, `lazyLoadingService.ts`
- `optimizedHabitService.ts`, `optimizedStreakService.ts`, `optimizedServices.ts`
- `offlineStreakService.ts`, `performanceMonitoringService.ts`

If you need any of these, consider moving them into a dedicated
`services/firebase/experimental/` namespace or deleting them once confirmed
unused.

## Firestore Path Structure

All data lives under `/artifacts/{APP_ID}/...`:

- Users: `/artifacts/{APP_ID}/users/{userId}`
- Goals: `/artifacts/{APP_ID}/public/data/goals/{goalId}`
- Streaks/Completions: `/artifacts/{APP_ID}/streaks|completions/{docId}`

Keeping every access inside `services/firebase/*` ensures we can update the path
structure or security rules in one place.

## Security Rules

See `docs/guides/SECURITY_RULES.md` + `firestore.rules` for enforcement logic.
If you add a new collection, document the rule changes there and extend
`scripts/test-security-rules.ts` so CI can exercise the new paths.
