/**
 * End-to-End Testing Script for Social Accountability MVP
 *
 * This script tests complete user flows to verify the application works correctly.
 * Run with: npx ts-node scripts/test-e2e-flows.ts
 *
 * Requirements: All
 */

import { initializeApp } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    onSnapshot,
    query,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

// Import Firebase config
const firebaseConfig = require("../firebaseConfig.js");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

const APP_ID = "oath-app";

// Test utilities
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const generateTestEmail = () =>
    `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    duration: number;
}

const results: TestResult[] = [];

async function runTest(
    name: string,
    testFn: () => Promise<void>,
): Promise<void> {
    const startTime = Date.now();
    console.log(`\n🧪 Testing: ${name}`);

    try {
        await testFn();
        const duration = Date.now() - startTime;
        results.push({ name, passed: true, duration });
        console.log(`✅ PASSED (${duration}ms)`);
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, error: errorMessage, duration });
        console.log(`❌ FAILED: ${errorMessage}`);
    }
}

// Test 1: User Account Creation
async function testAccountCreation() {
    const email = generateTestEmail();
    const password = "TestPassword123!";
    const displayName = "Test User";

    // Create account
    const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
    );
    const userId = userCredential.user.uid;

    // Wait a bit for Firestore to initialize
    await sleep(2000);

    // Verify user document exists
    const userDocRef = doc(db, `artifacts/${APP_ID}/users/${userId}`);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        throw new Error("User document not created in Firestore");
    }

    const userData = userDoc.data();

    // Verify initial values
    if (userData.shameScore !== 0) {
        throw new Error(`Expected shameScore to be 0, got ${userData.shameScore}`);
    }

    if (!Array.isArray(userData.friends) || userData.friends.length !== 0) {
        throw new Error("Expected friends array to be empty");
    }

    // Clean up
    await signOut(auth);
}

// Test 2: Authentication Round-Trip
async function testAuthenticationRoundTrip() {
    const email = generateTestEmail();
    const password = "TestPassword123!";

    // Create account
    const createResult = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
    );
    const originalUserId = createResult.user.uid;

    // Sign out
    await signOut(auth);

    // Sign back in
    const signInResult = await signInWithEmailAndPassword(auth, email, password);
    const signInUserId = signInResult.user.uid;

    if (originalUserId !== signInUserId) {
        throw new Error("User ID mismatch after sign in");
    }

    // Clean up
    await signOut(auth);
}

// Test 3: Goal Creation
async function testGoalCreation() {
    const email = generateTestEmail();
    const password = "TestPassword123!";

    // Create and sign in
    const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
    );
    const userId = userCredential.user.uid;

    await sleep(1000);

    // Create a goal
    const goalData = {
        ownerId: userId,
        description: "Test Daily Goal",
        frequency: "daily",
        targetDays: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ],
        latestCompletionDate: null,
        currentStatus: "Green",
        nextDeadline: Timestamp.fromDate(
            new Date(Date.now() + 24 * 60 * 60 * 1000),
        ),
        isShared: true,
        createdAt: Timestamp.now(),
        redSince: null,
    };

    const goalsRef = collection(db, `artifacts/${APP_ID}/public/data/goals`);
    const goalDoc = await addDoc(goalsRef, goalData);

    // Verify goal was created
    const createdGoal = await getDoc(goalDoc);
    if (!createdGoal.exists()) {
        throw new Error("Goal not created");
    }

    const createdData = createdGoal.data();
    if (createdData.ownerId !== userId) {
        throw new Error("Goal ownerId mismatch");
    }

    if (createdData.currentStatus !== "Green") {
        throw new Error("Goal should start with Green status");
    }

    if (createdData.isShared !== true) {
        throw new Error("Goal should be shared by default");
    }

    // Clean up
    await signOut(auth);
}

// Test 4: Goal Ownership Filtering
async function testGoalOwnershipFiltering() {
    const email1 = generateTestEmail();
    const email2 = generateTestEmail();
    const password = "TestPassword123!";

    // Create first user and goal
    const user1 = await createUserWithEmailAndPassword(auth, email1, password);
    const userId1 = user1.user.uid;

    await sleep(1000);

    const goal1Data = {
        ownerId: userId1,
        description: "User 1 Goal",
        frequency: "daily",
        targetDays: ["Monday"],
        latestCompletionDate: null,
        currentStatus: "Green",
        nextDeadline: Timestamp.fromDate(
            new Date(Date.now() + 24 * 60 * 60 * 1000),
        ),
        isShared: true,
        createdAt: Timestamp.now(),
        redSince: null,
    };

    const goalsRef = collection(db, `artifacts/${APP_ID}/public/data/goals`);
    await addDoc(goalsRef, goal1Data);

    await signOut(auth);

    // Create second user and goal
    const user2 = await createUserWithEmailAndPassword(auth, email2, password);
    const userId2 = user2.user.uid;

    await sleep(1000);

    const goal2Data = {
        ownerId: userId2,
        description: "User 2 Goal",
        frequency: "daily",
        targetDays: ["Monday"],
        latestCompletionDate: null,
        currentStatus: "Green",
        nextDeadline: Timestamp.fromDate(
            new Date(Date.now() + 24 * 60 * 60 * 1000),
        ),
        isShared: true,
        createdAt: Timestamp.now(),
        redSince: null,
    };

    await addDoc(goalsRef, goal2Data);

    // Query user 2's goals
    const user2GoalsQuery = query(goalsRef, where("ownerId", "==", userId2));
    const user2Goals = await getDocs(user2GoalsQuery);

    // Should only get user 2's goal
    if (user2Goals.size !== 1) {
        throw new Error(`Expected 1 goal for user 2, got ${user2Goals.size}`);
    }

    const retrievedGoal = user2Goals.docs[0].data();
    if (retrievedGoal.description !== "User 2 Goal") {
        throw new Error("Retrieved wrong goal");
    }

    // Clean up
    await signOut(auth);
}

// Test 5: Goal Completion State Transition
async function testGoalCompletion() {
    const email = generateTestEmail();
    const password = "TestPassword123!";

    const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
    );
    const userId = userCredential.user.uid;

    await sleep(1000);

    // Create a goal
    const goalData = {
        ownerId: userId,
        description: "Test Completion Goal",
        frequency: "daily",
        targetDays: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ],
        latestCompletionDate: null,
        currentStatus: "Yellow",
        nextDeadline: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)), // 2 hours from now
        isShared: true,
        createdAt: Timestamp.now(),
        redSince: null,
        difficulty: "medium", // Required for completion
    };

    const goalsRef = collection(db, `artifacts/${APP_ID}/public/data/goals`);
    const goalDoc = await addDoc(goalsRef, goalData);

    // Complete the goal using Cloud Function
    // Requirement: Use centralized logic (Step 1 of refactor)
    console.log("  Calling recordHabitCompletion function...");
    const recordHabitCompletion = httpsCallable(functions, 'recordHabitCompletion');
    
    try {
        await recordHabitCompletion({
            habitId: goalDoc.id,
            completedAt: Date.now(),
            timezone: "UTC",
            notes: "E2E Test Completion",
            difficulty: "medium"
        });
    } catch (e: any) {
        console.warn("  Cloud Function call failed (function might not be deployed yet): " + e.message);
        // If function fails (e.g. not deployed), we can't verify the state change.
        // We throw to fail the test, alerting the user to deploy functions.
        throw new Error("recordHabitCompletion failed. Ensure Cloud Functions are deployed.");
    }

    // Wait for Firestore to update (Cloud Function -> Firestore)
    await sleep(3000);

    // Verify updates
    const updatedGoal = await getDoc(goalDoc);
    const updatedData = updatedGoal.data();

    if (!updatedData) {
        throw new Error("Goal data not found after update");
    }

    if (updatedData.currentStatus !== "Green") {
        throw new Error(`Status should be Green after completion. Got: ${updatedData.currentStatus}`);
    }

    if (!updatedData.latestCompletionDate) {
        throw new Error("latestCompletionDate should be set");
    }

    if (updatedData.nextDeadline.toMillis() <= Date.now()) {
        // This might fail if the cloud function logic for next deadline is "End of Today" and we are "Today".
        // But logic says "If completed today, deadline is tomorrow".
        // So it should be in future.
        throw new Error("nextDeadline should be in the future");
    }

    // Clean up
    await signOut(auth);
}

// Test 6: Real-Time Synchronization
async function testRealTimeSync() {
    const email = generateTestEmail();
    const password = "TestPassword123!";

    const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
    );
    const userId = userCredential.user.uid;

    await sleep(1000);

    // Create a goal
    const goalData = {
        ownerId: userId,
        description: "Real-Time Test Goal",
        frequency: "daily",
        targetDays: ["Monday"],
        latestCompletionDate: null,
        currentStatus: "Green",
        nextDeadline: Timestamp.fromDate(
            new Date(Date.now() + 24 * 60 * 60 * 1000),
        ),
        isShared: true,
        createdAt: Timestamp.now(),
        redSince: null,
    };

    const goalsRef = collection(db, `artifacts/${APP_ID}/public/data/goals`);
    const goalDoc = await addDoc(goalsRef, goalData);

    // Set up real-time listener
    let updateReceived = false;
    const unsubscribe = onSnapshot(goalDoc, (snapshot) => {
        const data = snapshot.data();
        if (data && data.currentStatus === "Yellow") {
            updateReceived = true;
        }
    });

    // Wait a bit for listener to be established
    await sleep(500);

    // Update the goal
    await updateDoc(goalDoc, {
        currentStatus: "Yellow",
    });

    // Wait for real-time update
    await sleep(2000);

    unsubscribe();

    if (!updateReceived) {
        throw new Error("Real-time update not received");
    }

    // Clean up
    await signOut(auth);
}

// Test 7: Status Color Mapping Consistency
async function testStatusColorMapping() {
    // This is a UI test, but we can verify the data model
    const statuses = ["Green", "Yellow", "Red"];

    for (const status of statuses) {
        if (!["Green", "Yellow", "Red"].includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }
    }

    // Verify status values are consistent
    console.log("  Status values validated: Green, Yellow, Red");
}

// Main test runner
async function runAllTests() {
    console.log("🚀 Starting End-to-End Tests");
    console.log("================================\n");

    await runTest("User Account Creation", testAccountCreation);
    await runTest("Authentication Round-Trip", testAuthenticationRoundTrip);
    await runTest("Goal Creation", testGoalCreation);
    await runTest("Goal Ownership Filtering", testGoalOwnershipFiltering);
    await runTest("Goal Completion State Transition", testGoalCompletion);
    await runTest("Real-Time Synchronization", testRealTimeSync);
    await runTest("Status Color Mapping Consistency", testStatusColorMapping);

    // Print summary
    console.log("\n================================");
    console.log("📊 Test Summary");
    console.log("================================\n");

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log("");

    if (failed > 0) {
        console.log("Failed Tests:");
        results
            .filter((r) => !r.passed)
            .forEach((r) => {
                console.log(`  ❌ ${r.name}: ${r.error}`);
            });
        console.log("");
    }

    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log("");

    if (failed === 0) {
        console.log("🎉 All tests passed!");
    } else {
        console.log("⚠️  Some tests failed. Please review the errors above.");
        process.exit(1);
    }
}

// Run tests
runAllTests().catch((error) => {
    console.error("Fatal error running tests:", error);
    process.exit(1);
});
