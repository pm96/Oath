# User Searchable Fields Migration

## Overview

This migration script adds `searchableEmail` and `searchableName` fields to existing user documents in Firestore. These fields enable efficient case-insensitive search functionality for the Friend Management UI feature.

## What it does

The script:

1. Fetches all user documents from Firestore
2. For each user without searchable fields:
   - Creates `searchableEmail` from the user's email (lowercase)
   - Creates `searchableName` from the user's displayName (lowercase)
3. Updates the user document with these new fields
4. Skips users that already have these fields

## Requirements

- Node.js installed
- Firebase credentials configured in the script
- Network access to Firestore

## Running the migration

### Option 1: Using npx tsx (recommended)

```bash
npx tsx scripts/migrate-user-searchable-fields.ts
```

### Option 2: Using ts-node

```bash
npx ts-node scripts/migrate-user-searchable-fields.ts
```

### Option 3: Compile and run

```bash
npx tsc scripts/migrate-user-searchable-fields.ts
node scripts/migrate-user-searchable-fields.js
```

## Expected output

```
Starting user migration...
Found 5 user documents
Updated user abc123: { searchableEmail: 'user@example.com', searchableName: 'john doe' }
Updated user def456: { searchableEmail: 'jane@example.com', searchableName: 'jane smith' }
Skipping user ghi789 - already has searchable fields
...

Migration complete!
Updated: 2
Skipped: 3
Errors: 0
Migration script finished successfully
```

## Safety

- The script only adds new fields, it never removes or modifies existing data
- Users that already have searchable fields are automatically skipped
- Each update is logged for transparency
- Errors are caught and logged without stopping the entire migration

## When to run

Run this migration:

- **Once** after deploying the Friend Management UI feature
- Before users start searching for friends
- After any bulk user imports that don't include searchable fields

## New user accounts

New user accounts created after this feature is deployed will automatically have searchable fields added during account creation (see `authService.ts`). This migration is only needed for existing users.
