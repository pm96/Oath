# Quick Deployment Reference

**One-page reference for deploying Social Accountability MVP**

## Prerequisites ✓

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Select your project
firebase use <project-id>
```

## Deploy Everything (Automated)

```bash
# Run the automated deployment script
./scripts/deploy-production.sh
```

This script will:

1. ✅ Check prerequisites
2. ✅ Build Cloud Functions
3. ✅ Deploy Firestore Security Rules
4. ✅ Deploy Firestore Indexes
5. ✅ Deploy Cloud Functions

## Deploy Manually (Step by Step)

### 1. Build Functions

```bash
cd functions
npm install
npm run build
cd ..
```

### 2. Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

### 4. Deploy Functions

```bash
firebase deploy --only functions
```

### 5. Deploy Everything at Once

```bash
firebase deploy
```

## Verify Deployment

```bash
# Run verification script
./scripts/verify-deployment.sh

# Or manually check
firebase functions:list
firebase functions:log --limit 10
```

## Test Deployment

```bash
# Run automated tests
npx ts-node scripts/test-e2e-flows.ts

# Test on physical devices
# See DEVICE_TESTING_GUIDE.md
```

## Quick Checks

### Firebase Console

- **Functions:** https://console.firebase.google.com/project/{project-id}/functions
  - ✓ checkGoalDeadlines (scheduled)
  - ✓ sendNudge (callable)

- **Firestore:** https://console.firebase.google.com/project/{project-id}/firestore
  - ✓ Rules deployed
  - ✓ Indexes active

- **Authentication:** https://console.firebase.google.com/project/{project-id}/authentication
  - ✓ Email/Password enabled

- **Cloud Messaging:** https://console.firebase.google.com/project/{project-id}/settings/cloudmessaging
  - ✓ FCM enabled

## Common Commands

```bash
# View function logs
firebase functions:log --only checkGoalDeadlines
firebase functions:log --only sendNudge

# Rollback functions
firebase rollback functions

# Check project status
firebase use

# List deployed functions
firebase functions:list
```

## Troubleshooting

### Functions won't deploy

```bash
cd functions
rm -rf lib node_modules
npm install
npm run build
cd ..
firebase deploy --only functions
```

### Rules won't deploy

```bash
# Check syntax
firebase firestore:rules:get

# Force deploy
firebase deploy --only firestore:rules --force
```

### Need to rollback

```bash
# Rollback functions
firebase rollback functions

# Redeploy previous rules (from git)
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
git checkout main firestore.rules
```

## Testing Checklist

- [ ] Functions deployed and healthy
- [ ] Security rules active
- [ ] Indexes created
- [ ] Test user can sign up
- [ ] Test user can create goal
- [ ] Push notifications work
- [ ] Real-time sync works
- [ ] Nudge functionality works

## Documentation

- **Full Guide:** DEPLOYMENT_GUIDE.md
- **Verification:** VERIFICATION_CHECKLIST.md
- **Device Testing:** DEVICE_TESTING_GUIDE.md
- **Status:** DEPLOYMENT_STATUS.md

## Emergency Contacts

- **Firebase Status:** https://status.firebase.google.com
- **Firebase Support:** https://firebase.google.com/support

---

**Quick Deploy:** `./scripts/deploy-production.sh`

**Quick Verify:** `./scripts/verify-deployment.sh`

**Quick Test:** `npx ts-node scripts/test-e2e-flows.ts`
