# Deployment Commands Reference

Quick reference for all deployment-related commands.

## Prerequisites

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Select project
firebase use <project-id>

# Check current project
firebase use
```

## Build Commands

```bash
# Build Cloud Functions
cd functions && npm install && npm run build && cd ..

# Check build output
ls -la functions/lib/index.js
```

## Deployment Commands

### Deploy Everything

```bash
# Automated script (recommended)
./scripts/deploy-production.sh

# Manual - deploy all
firebase deploy

# Manual - deploy with confirmation
firebase deploy --only firestore:rules,firestore:indexes,functions
```

### Deploy Specific Components

```bash
# Deploy only security rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes

# Deploy only functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:checkGoalDeadlines
firebase deploy --only functions:sendNudge
```

## Verification Commands

```bash
# Run verification script
./scripts/verify-deployment.sh

# List deployed functions
firebase functions:list

# Check function details
firebase functions:describe checkGoalDeadlines
firebase functions:describe sendNudge

# View recent logs
firebase functions:log --limit 10

# View specific function logs
firebase functions:log --only checkGoalDeadlines
firebase functions:log --only sendNudge

# View logs from last hour
firebase functions:log --since 1h

# View only errors
firebase functions:log --severity ERROR
```

## Testing Commands

```bash
# Run automated end-to-end tests
npx ts-node scripts/test-e2e-flows.ts

# Run with Node
node -r ts-node/register scripts/test-e2e-flows.ts
```

## Monitoring Commands

```bash
# Stream function logs in real-time
firebase functions:log --follow

# Check function execution count
firebase functions:list

# View Firestore usage
firebase firestore:usage

# Check project info
firebase projects:list
firebase projects:describe <project-id>
```

## Rollback Commands

```bash
# Rollback functions to previous version
firebase rollback functions

# View deployment history
firebase functions:list --show-versions

# Redeploy specific version
firebase deploy --only functions --version <version-number>
```

## Security Rules Commands

```bash
# Get current rules
firebase firestore:rules:get

# Test rules locally
firebase emulators:start --only firestore

# Deploy rules
firebase deploy --only firestore:rules

# Force deploy rules
firebase deploy --only firestore:rules --force
```

## Debugging Commands

```bash
# Check Firebase CLI version
firebase --version

# Check Node version
node --version

# Check npm version
npm --version

# Verify Firebase login
firebase login:list

# Check project configuration
cat .firebaserc
cat firebase.json

# Check function configuration
cat functions/package.json

# View function build output
cat functions/lib/index.js | head -50
```

## Cleanup Commands

```bash
# Remove function build artifacts
rm -rf functions/lib functions/node_modules

# Rebuild functions
cd functions && npm install && npm run build && cd ..

# Clear Firebase cache
firebase logout
firebase login
```

## Development Commands

```bash
# Start local emulators
firebase emulators:start

# Start only Firestore emulator
firebase emulators:start --only firestore

# Start only Functions emulator
firebase emulators:start --only functions

# Start with UI
firebase emulators:start --ui
```

## Project Management Commands

```bash
# List all projects
firebase projects:list

# Switch project
firebase use <project-id>

# Add project alias
firebase use --add

# Show current project
firebase use

# Create new project
firebase projects:create <project-id>
```

## Function Configuration Commands

```bash
# Set environment variable
firebase functions:config:set someservice.key="THE API KEY"

# Get environment variables
firebase functions:config:get

# Unset environment variable
firebase functions:config:unset someservice.key

# Clone config from another project
firebase functions:config:clone --from <source-project-id>
```

## Firestore Commands

```bash
# Export Firestore data
firebase firestore:export gs://<bucket-name>/backup

# Import Firestore data
firebase firestore:import gs://<bucket-name>/backup

# Delete collection
firebase firestore:delete <collection-path> --recursive

# Clear all data (use with caution!)
firebase firestore:delete --all-collections
```

## Useful Combinations

```bash
# Full deployment with verification
./scripts/deploy-production.sh && ./scripts/verify-deployment.sh

# Build and deploy functions
cd functions && npm run build && cd .. && firebase deploy --only functions

# Deploy and watch logs
firebase deploy --only functions && firebase functions:log --follow

# Quick status check
firebase use && firebase functions:list && firebase functions:log --limit 5
```

## Emergency Commands

```bash
# Quick rollback
firebase rollback functions

# Disable function (by redeploying without it)
# Comment out function in functions/src/index.ts
cd functions && npm run build && cd .. && firebase deploy --only functions

# Check for errors
firebase functions:log --severity ERROR --limit 50

# Force redeploy everything
firebase deploy --force
```

## Expo/App Commands

```bash
# Start development server
npx expo start

# Build development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Build production
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Git Commands (for deployment tracking)

```bash
# Tag deployment
git tag -a v1.0.0 -m "Production deployment v1.0.0"
git push origin v1.0.0

# View deployment tags
git tag -l

# Checkout specific deployment
git checkout v1.0.0
```

## Helpful Aliases (add to ~/.bashrc or ~/.zshrc)

```bash
# Firebase shortcuts
alias fb='firebase'
alias fbd='firebase deploy'
alias fbf='firebase functions:list'
alias fbl='firebase functions:log'
alias fbu='firebase use'

# Deployment shortcuts
alias deploy-prod='./scripts/deploy-production.sh'
alias verify-deploy='./scripts/verify-deployment.sh'
alias test-e2e='npx ts-node scripts/test-e2e-flows.ts'

# Function shortcuts
alias build-functions='cd functions && npm run build && cd ..'
alias logs-check='firebase functions:log --only checkGoalDeadlines'
alias logs-nudge='firebase functions:log --only sendNudge'
```

## Quick Troubleshooting

```bash
# Functions not deploying?
cd functions && rm -rf lib node_modules && npm install && npm run build && cd .. && firebase deploy --only functions

# Rules not working?
firebase deploy --only firestore:rules --force

# Need fresh start?
firebase logout && firebase login && firebase use <project-id>

# Check everything
firebase use && firebase functions:list && firebase functions:log --limit 5 && firebase firestore:rules:get
```

## Documentation Links

- **Full Guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Quick Reference:** [QUICK_DEPLOY.md](QUICK_DEPLOY.md)
- **Verification:** [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md)
- **Device Testing:** [DEVICE_TESTING_GUIDE.md](DEVICE_TESTING_GUIDE.md)
- **Status:** [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)

---

**Most Common Commands:**

```bash
# Deploy everything
./scripts/deploy-production.sh

# Verify deployment
./scripts/verify-deployment.sh

# Check logs
firebase functions:log --limit 10

# Rollback if needed
firebase rollback functions
```
