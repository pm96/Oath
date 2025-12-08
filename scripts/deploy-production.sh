#!/bin/bash

# Production Deployment Script for Social Accountability MVP
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Social Accountability MVP - Production Deployment"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo "ℹ️  $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi
print_success "Firebase CLI installed"

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    print_error "Not logged in to Firebase"
    echo "Please login with: firebase login"
    exit 1
fi
print_success "Logged in to Firebase"

# Check Node version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher (current: $(node --version))"
    exit 1
fi
print_success "Node.js version: $(node --version)"

# Get current Firebase project
CURRENT_PROJECT=$(firebase use | grep "active" | awk '{print $4}' || echo "none")
if [ "$CURRENT_PROJECT" = "none" ]; then
    print_error "No Firebase project selected"
    echo "Select a project with: firebase use <project-id>"
    exit 1
fi
print_success "Firebase project: $CURRENT_PROJECT"

echo ""
print_warning "You are about to deploy to: $CURRENT_PROJECT"
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled"
    exit 0
fi

echo ""
echo "=================================================="
echo "🔨 Building Functions"
echo "=================================================="
echo ""

# Build functions
cd functions
print_info "Installing function dependencies..."
npm install

print_info "Building TypeScript..."
npm run build

if [ ! -f "lib/index.js" ]; then
    print_error "Function build failed - lib/index.js not found"
    exit 1
fi
print_success "Functions built successfully"
cd ..

echo ""
echo "=================================================="
echo "🔐 Deploying Firestore Security Rules"
echo "=================================================="
echo ""

firebase deploy --only firestore:rules
if [ $? -eq 0 ]; then
    print_success "Security rules deployed"
else
    print_error "Failed to deploy security rules"
    exit 1
fi

echo ""
echo "=================================================="
echo "📊 Deploying Firestore Indexes"
echo "=================================================="
echo ""

firebase deploy --only firestore:indexes
if [ $? -eq 0 ]; then
    print_success "Indexes deployed"
else
    print_error "Failed to deploy indexes"
    exit 1
fi

echo ""
echo "=================================================="
echo "☁️  Deploying Cloud Functions"
echo "=================================================="
echo ""

firebase deploy --only functions
if [ $? -eq 0 ]; then
    print_success "Cloud Functions deployed"
else
    print_error "Failed to deploy Cloud Functions"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
echo ""

print_success "All components deployed successfully to $CURRENT_PROJECT"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Verify deployment in Firebase Console:"
echo "   https://console.firebase.google.com/project/$CURRENT_PROJECT"
echo ""
echo "2. Check deployed functions:"
echo "   firebase functions:list"
echo ""
echo "3. Monitor function logs:"
echo "   firebase functions:log --only checkGoalDeadlines"
echo "   firebase functions:log --only sendNudge"
echo ""
echo "4. Test on physical devices:"
echo "   - Build app with production config"
echo "   - Test push notifications"
echo "   - Verify real-time sync"
echo ""
echo "5. Run end-to-end tests:"
echo "   - Create account"
echo "   - Create goals"
echo "   - Add friends"
echo "   - Test nudge functionality"
echo "   - Verify automated deadline checking"
echo ""

print_info "See DEPLOYMENT_GUIDE.md for detailed testing procedures"
echo ""
