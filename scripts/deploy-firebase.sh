#!/bin/bash

# Firebase Deployment Script
# This script deploys Firestore security rules and indexes to Firebase

echo "🚀 Deploying Firebase Infrastructure..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI is not installed."
    echo "Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null
then
    echo "❌ Not logged in to Firebase."
    echo "Please login with: firebase login"
    exit 1
fi

echo "📋 Deploying Firestore Security Rules..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Security rules deployed successfully"
else
    echo "❌ Failed to deploy security rules"
    exit 1
fi

echo ""
echo "📊 Deploying Firestore Indexes..."
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo "✅ Indexes deployed successfully"
else
    echo "❌ Failed to deploy indexes"
    exit 1
fi

echo ""
echo "✨ Firebase infrastructure deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Verify security rules in Firebase Console → Firestore → Rules"
echo "2. Check indexes in Firebase Console → Firestore → Indexes"
echo "3. Ensure Authentication is enabled in Firebase Console → Authentication"
