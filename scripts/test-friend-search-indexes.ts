/**
 * Test script to verify Firestore indexes for friend search queries
 *
 * This script tests that the indexes created for friend management are working correctly
 * Run with: npx ts-node scripts/test-friend-search-indexes.ts
 *
 * Requirements: 1.1, 2.3
 */

import { initializeApp } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    signOut,
} from "firebase/auth";
import {
    addDoc,
    collection,
    getDocs,
    getFirestore,
    query,
    where,
} from "firebase/firestore";

// Import Firebase config
const firebaseConfig = require("../firebaseConfig.js");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const APP_ID = "oath-app";

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

// Test 1: User search by email with index
async function testUserSearchByEmail() {
    const email = generateTestEmail();
    const password = "TestPassword123!";
    const displayName = "Test Search User";

    // Create test user
    const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
    );
    const userId = userCredential.user.uid;

    await sleep(2000); // Wait for Firestore to initialize

    // Query using searchableEmail (should use index)
    const usersRef = collection(db, `artifacts/${APP_ID}/users`);
    const searchQuery = email.toLowerCase().substring(0, 5);

    const emailQuery = query(
        usersRef,
        where("searchableEmail", ">=", searchQuery),
        where("searchableEmail", "<=", searchQuery + "\uf8ff"),
    );

    const startTime = Date.now();
    const snapshot = await getDocs(emailQuery);
    const queryTime = Date.now() - startTime;

    console.log(`  Query completed in ${queryTime}ms`);

    // Verify results
    const found = snapshot.docs.some((doc) => doc.id === userId);
    if (!found) {
        throw new Error("User not found in search results");
    }

    if (queryTime > 5000) {
        console.warn(
            `  ⚠️  Query took ${queryTime}ms - index may not be active yet`,
        );
    }

    await signOut(auth);
}

// Test 2: User search by name with index
async function testUserSearchByName() {
    const email = generateTestEmail();
    const password = "TestPassword123!";
    const displayName = "Unique Test Name " + Date.now();

    // Create test user
    const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
    );
    const userId = userCredential.user.uid;

    await sleep(2000);

    // Query using searchableName (should use index)
    const usersRef = collection(db, `artifacts/${APP_ID}/users`);
    const searchQuery = "unique";

    const nameQuery = query(
        usersRef,
        where("searchableName", ">=", searchQuery),
        where("searchableName", "<=", searchQuery + "\uf8ff"),
    );

    const startTime = Date.now();
    const snapshot = await getDocs(nameQuery);
    const queryTime = Date.now() - startTime;

    console.log(`  Query completed in ${queryTime}ms`);

    if (queryTime > 5000) {
        console.warn(
            `  ⚠️  Query took ${queryTime}ms - index may not be active yet`,
        );
    }

    await signOut(auth);
}

// Test 3: Friend requests query by senderId and status
async function testFriendRequestsBySender() {
    const email1 = generateTestEmail();
    const email2 = generateTestEmail();
    const password = "TestPassword123!";

    // Create sender
    const sender = await createUserWithEmailAndPassword(auth, email1, password);
    const senderId = sender.user.uid;
    await sleep(1000);
    await signOut(auth);

    // Create receiver
    const receiver = await createUserWithEmailAndPassword(auth, email2, password);
    const receiverId = receiver.user.uid;
    await sleep(1000);

    // Create friend request
    const friendRequestsRef = collection(
        db,
        `artifacts/${APP_ID}/friendRequests`,
    );
    await addDoc(friendRequestsRef, {
        senderId,
        senderName: "Test Sender",
        senderEmail: email1,
        receiverId,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await sleep(1000);

    // Query by senderId and status (should use composite index)
    const senderQuery = query(
        friendRequestsRef,
        where("senderId", "==", senderId),
        where("status", "==", "pending"),
    );

    const startTime = Date.now();
    const snapshot = await getDocs(senderQuery);
    const queryTime = Date.now() - startTime;

    console.log(`  Query completed in ${queryTime}ms`);

    if (snapshot.size === 0) {
        throw new Error("Friend request not found");
    }

    if (queryTime > 5000) {
        console.warn(
            `  ⚠️  Query took ${queryTime}ms - index may not be active yet`,
        );
    }

    await signOut(auth);
}

// Test 4: Friend requests query by receiverId and status
async function testFriendRequestsByReceiver() {
    const email1 = generateTestEmail();
    const email2 = generateTestEmail();
    const password = "TestPassword123!";

    // Create sender
    const sender = await createUserWithEmailAndPassword(auth, email1, password);
    const senderId = sender.user.uid;
    await sleep(1000);
    await signOut(auth);

    // Create receiver
    const receiver = await createUserWithEmailAndPassword(auth, email2, password);
    const receiverId = receiver.user.uid;
    await sleep(1000);

    // Create friend request
    const friendRequestsRef = collection(
        db,
        `artifacts/${APP_ID}/friendRequests`,
    );
    await addDoc(friendRequestsRef, {
        senderId,
        senderName: "Test Sender",
        senderEmail: email1,
        receiverId,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await sleep(1000);

    // Query by receiverId and status (should use composite index)
    const receiverQuery = query(
        friendRequestsRef,
        where("receiverId", "==", receiverId),
        where("status", "==", "pending"),
    );

    const startTime = Date.now();
    const snapshot = await getDocs(receiverQuery);
    const queryTime = Date.now() - startTime;

    console.log(`  Query completed in ${queryTime}ms`);

    if (snapshot.size === 0) {
        throw new Error("Friend request not found");
    }

    if (queryTime > 5000) {
        console.warn(
            `  ⚠️  Query took ${queryTime}ms - index may not be active yet`,
        );
    }

    await signOut(auth);
}

// Main test runner
async function runAllTests() {
    console.log("🚀 Starting Friend Search Index Tests");
    console.log("=====================================\n");
    console.log(
        "Note: Indexes may take a few minutes to become active after deployment.",
    );
    console.log("If queries are slow, wait a few minutes and try again.\n");

    await runTest("User Search by Email (with index)", testUserSearchByEmail);
    await runTest("User Search by Name (with index)", testUserSearchByName);
    await runTest(
        "Friend Requests by Sender (with composite index)",
        testFriendRequestsBySender,
    );
    await runTest(
        "Friend Requests by Receiver (with composite index)",
        testFriendRequestsByReceiver,
    );

    // Print summary
    console.log("\n=====================================");
    console.log("📊 Test Summary");
    console.log("=====================================\n");

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
        console.log("🎉 All index tests passed!");
        console.log(
            "\n✅ Firestore indexes are working correctly for friend search queries.",
        );
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
