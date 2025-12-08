#!/bin/bash

# Deployment Verification Script
# This script checks the current deployment status and configuration

set -e

echo "🔍 Social Accountability MVP - Deployment Verification"
echo "======================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check Firebase CLI
echo "📋 Checking Prerequisites..."
echo ""

if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI not installed"
    exit 1
fi
print_success "Firebase CLI installed: $(firebase --version)"

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    print_error "Not logged in to Firebase"
    echo "Run: firebase login"
    exit 1
fi
print_success "Logged in to Firebase"

# Get current project
CURRENT_PROJECT=$(firebase use | grep "active" | awk '{print $4}' || echo "none")
if [ "$CURRENT_PROJECT" = "none" ]; then
    print_error "No Firebase project selected"
    exit 1
fi
print_success "Current project: $CURRENT_PROJECT"

echo ""
echo "======================================================"
echo "🔨 Checking Build Status"
echo "======================================================"
echo ""

# Check if functions are built
if [ -f "functions/lib/index.js" ]; then
    print_success "Functions are built"
else
    print_warning "Functions not built - run: cd functions && npm run build"
fi

# Check functions dependencies
if [ -d "functions/node_modules" ]; then
    print_success "Functions dependencies installed"
else
    print_warning "Functions dependencies not installed - run: cd functions && npm install"
fi

echo ""
echo "======================================================"
echo "☁️  Checking Cloud Functions"
echo "======================================================"
echo ""

print_info "Fetching deployed functions..."
FUNCTIONS_OUTPUT=$(firebase functions:list 2>&1 || echo "error")

if echo "$FUNCTIONS_OUTPUT" | grep -q "checkGoalDeadlines"; then
    print_success "checkGoalDeadlines function deployed"
else
    print_warning "checkGoalDeadlines function not deployed"
fi

if echo "$FUNCTIONS_OUTPUT" | grep -q "sendNudge"; then
    print_success "sendNudge function deployed"
else
    print_warning "sendNudge function not deployed"
fi

echo ""
echo "======================================================"
echo "🔐 Checking Firestore Configuration"
echo "======================================================"
echo ""

# Check if rules file exists
if [ -f "firestore.rules" ]; then
    print_success "Firestore rules file exists"
    
    # Check for key security patterns
    if grep -q "isAuthenticated()" firestore.rules; then
        print_success "Authentication checks present in rules"
    else
        print_warning "Authentication checks may be missing"
    fi
    
    if grep -q "artifacts/{appId}/users/{userId}" firestore.rules; then
        print_success "User document rules configured"
    else
        print_warning "User document rules may be missing"
    fi
    
    if grep -q "artifacts/{appId}/public/data/goals/{goalId}" firestore.rules; then
        print_success "Goal document rules configured"
    else
        print_warning "Goal document rules may be missing"
    fi
else
    print_error "firestore.rules file not found"
fi

# Check if indexes file exists
if [ -f "firestore.indexes.json" ]; then
    print_success "Firestore indexes file exists"
else
    print_warning "firestore.indexes.json file not found"
fi

echo ""
echo "======================================================"
echo "📱 Checking App Configuration"
echo "======================================================"
echo ""

# Check if firebaseConfig exists
if [ -f "firebaseConfig.js" ]; then
    print_success "Firebase config file exists"
    
    # Check for required config keys (without exposing values)
    if grep -q "apiKey" firebaseConfig.js; then
        print_success "API key configured"
    else
        print_warning "API key may be missing"
    fi
    
    if grep -q "projectId" firebaseConfig.js; then
        print_success "Project ID configured"
    else
        print_warning "Project ID may be missing"
    fi
    
    if grep -q "messagingSenderId" firebaseConfig.js; then
        print_success "Messaging sender ID configured"
    else
        print_warning "Messaging sender ID may be missing"
    fi
else
    print_error "firebaseConfig.js file not found"
fi

echo ""
echo "======================================================"
echo "📊 Recent Function Logs"
echo "======================================================"
echo ""

print_info "Fetching recent function logs (last 10 entries)..."
echo ""

firebase functions:log --limit 10 2>&1 || print_warning "Could not fetch function logs"

echo ""
echo "======================================================"
echo "📝 Summary"
echo "======================================================"
echo ""

print_info "Deployment verification complete"
echo ""
echo "Next steps:"
echo "1. Review any warnings above"
echo "2. If functions not deployed, run: ./scripts/deploy-production.sh"
echo "3. Test on physical devices"
echo "4. Run end-to-end tests: npx ts-node scripts/test-e2e-flows.ts"
echo "5. Complete VERIFICATION_CHECKLIST.md"
echo ""
print_info "For detailed deployment instructions, see DEPLOYMENT_GUIDE.md"
echo ""
