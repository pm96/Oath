# Social Accountability MVP

A mobile application built with Expo/React Native that helps users achieve their goals through social pressure and peer accountability.

## Features

- 🔐 User authentication (sign up, sign in)
- 🎯 Goal creation and management (daily, weekly, 3x/week)
- 👥 Social features (friends, goal sharing)
- 📱 Push notifications (nudges, shame alerts)
- ⚡ Real-time synchronization across devices
- 🔴 Automated deadline monitoring
- 📊 Shame score tracking

## Get started

To start the app, in your terminal run:

```bash
npm run start
```

In the output, you'll find options to open the app in:

- [a development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [an Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [an iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Workflows

This project is configured to use [EAS Workflows](https://docs.expo.dev/eas/workflows/get-started/) to automate some development and release processes. These commands are set up in [`package.json`](./package.json) and can be run using NPM scripts in your terminal.

### Previews

Run `npm run draft` to [publish a preview update](https://docs.expo.dev/eas/workflows/examples/publish-preview-update/) of your project, which can be viewed in Expo Go or in a development build.

### Development Builds

Run `npm run development-builds` to [create a development build](https://docs.expo.dev/eas/workflows/examples/create-development-builds/). Note - you'll need to follow the [Prerequisites](https://docs.expo.dev/eas/workflows/examples/create-development-builds/#prerequisites) to ensure you have the correct emulator setup on your machine.

### Production Deployments

Run `npm run deploy` to [deploy to production](https://docs.expo.dev/eas/workflows/examples/deploy-to-production/). Note - you'll need to follow the [Prerequisites](https://docs.expo.dev/eas/workflows/examples/deploy-to-production/#prerequisites) to ensure you're set up to submit to the Apple and Google stores.

## Hosting

Expo offers hosting for websites and API functions via EAS Hosting. See the [Getting Started](https://docs.expo.dev/eas/hosting/get-started/) guide to learn more.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Deployment

### Quick Deploy

```bash
./scripts/deploy-production.sh
```

### Documentation

All build, testing, and accessibility guides now live under `docs/`.

- **[Quick Deploy Reference](docs/guides/QUICK_DEPLOY.md)** - One-page deployment guide
- **[Deployment Guide](docs/guides/DEPLOYMENT_GUIDE.md)** - Comprehensive deployment instructions
- **[Verification Checklist](docs/guides/VERIFICATION_CHECKLIST.md)** - Complete testing checklist
- **[Device Testing Guide](docs/guides/DEVICE_TESTING_GUIDE.md)** - Physical device testing procedures
- **[Deployment Commands](docs/guides/DEPLOYMENT_COMMANDS.md)** - NPM/EAS command reference
- **[Accessibility Enhancements](docs/guides/ACCESSIBILITY_ENHANCEMENTS.md)** - Current accessibility backlog
- **[Error Handling Summary](docs/guides/ERROR_HANDLING_SUMMARY.md)** - Logging/retry expectations
- **[Firebase Setup](docs/guides/FIREBASE_SETUP.md)** - Backend provisioning steps
- **[Notification Implementation](docs/guides/NOTIFICATION_IMPLEMENTATION.md)** - Push notification design
- **[Security Rules](docs/guides/SECURITY_RULES.md)** - Firestore rules overview

Archived historical summaries are in `docs/archive/`.

### Verify Deployment

```bash
./scripts/verify-deployment.sh
```

### Test End-to-End

```bash
npx ts-node scripts/test-e2e-flows.ts
```

### Local Quality Checks

Run ESLint + Jest together before opening a PR:

```bash
npm run check
```

## Firebase Backend

This app uses Firebase for:

- **Authentication** - User sign up and sign in
- **Firestore** - Real-time database for goals and user data
- **Cloud Functions** - Automated deadline checking and notifications
- **Cloud Messaging** - Push notifications

### Firebase Setup

1. Ensure Firebase project is configured
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Enable Cloud Functions (Blaze plan required)
5. Enable Cloud Messaging

## Project Structure

```
/
├── app/                    # Expo Router screens
├── components/             # React components
│   ├── goals/             # Goal management components
│   ├── social/            # Social features components
│   └── ui/                # UI primitives
├── services/              # Firebase services
│   └── firebase/          # Firebase integration
├── hooks/                 # Custom React hooks
├── functions/             # Cloud Functions
│   └── src/              # Function source code
├── scripts/               # Deployment and testing scripts
└── firestore.rules        # Firestore security rules
```

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
