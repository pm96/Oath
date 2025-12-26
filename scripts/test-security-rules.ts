/**
 * Test script for Firestore Security Rules
 *
 * This script tests the deployed security rules to ensure they work as expected
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { initializeApp } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
} from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getFirestore,
    setDoc
} from "firebase/firestore";

// Test Firebase config (using same as main app)
const firebaseConfig = {
    apiKey: "AIzaSyAuHgSN2SPxa1dW5EnGdbNAd7jIZSZP4Dc",
    authDomain: "oath-34449.firebaseapp.com",
    projectId: "oath-34449",
    storageBucket: "oath-34449.firebasestorage.app",
    messagingSenderId: "520674735848",
    appId: "1:520674735848:web:4ddbe37c4b7ccbc1a9bb5d",
    measurementId: "G-1PGN7XCYTQ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const APP_ID = "oath-app";

interface TestResult {
    test: string;
    passed: boolean;
    error?: string;
}

const results: Record<string, TestResult> = {};

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return typeof error === "string" ? error : "Unknown error";
}

function addResult(test: string, passed: boolean, error?: string) {
    results[test] = { test, passed, error };
    console.log(`${passed ? "✅" : "❌"} ${test}${error ? `: ${error}` : ""}`);
}

async function testSecurityRules() {
    console.log("🔒 Testing Firestore Security Rules...\n");

    try {
        // Test 1: Unauthenticated access should be denied (Requirement 7.4)
        try {
            await getDoc(doc(db, `artifacts/${APP_ID}/users/test-user`));
            addResult(
                "Unauthenticated access denied",
                false,
                "Should have been denied",
            );
        } catch (error) {
            addResult("Unauthenticated access denied", true);
        }

        // Create test users for authenticated tests
        const testEmail1 = `test-user-1-${Date.now()}@example.com`;
        const testEmail2 = `test-user-2-${Date.now()}@example.com`;
        const password = "testpassword123";

        // Create first test user
        const userCred1 = await createUserWithEmailAndPassword(
            auth,
            testEmail1,
            password,
        );
        const userId1 = userCred1.user.uid;

        // Initialize user document
        await setDoc(doc(db, `artifacts/${APP_ID}/users/${userId1}`), {
            displayName: "Test User 1",
            email: testEmail1,
            shameScore: 0,
            friends: [],
            fcmToken: null,
            createdAt: new Date(),
            searchableEmail: testEmail1.toLowerCase(),
            searchableName: "test user 1",
        });

        // Test 2: User can read their own document (Requirement 7.1)
        try {
            const userDoc = await getDoc(
                doc(db, `artifacts/${APP_ID}/users/${userId1}`),
            );
            addResult("User can read own document", userDoc.exists());
        } catch (error) {
            addResult("User can read own document", false, getErrorMessage(error));
        }

        // Test 3: User can write to their own document (Requirement 7.1)
        try {
            await setDoc(doc(db, `artifacts/${APP_ID}/users/${userId1}`), {
                displayName: "Updated Test User 1",
                email: testEmail1,
                shameScore: 1,
                friends: [],
                fcmToken: null,
                createdAt: new Date(),
                searchableEmail: testEmail1.toLowerCase(),
                searchableName: "updated test user 1",
            });
            addResult("User can write own document", true);
        } catch (error) {
            addResult("User can write own document", false, getErrorMessage(error));
        }

        // Create second test user
        const userCred2 = await createUserWithEmailAndPassword(
            auth,
            testEmail2,
            password,
        );
        const userId2 = userCred2.user.uid;

        // Switch to second user
        await signInWithEmailAndPassword(auth, testEmail2, password);

        // Initialize second user document
        await setDoc(doc(db, `artifacts/${APP_ID}/users/${userId2}`), {
            displayName: "Test User 2",
            email: testEmail2,
            shameScore: 0,
            friends: [],
            fcmToken: null,
            createdAt: new Date(),
            searchableEmail: testEmail2.toLowerCase(),
            searchableName: "test user 2",
        });

        // Test 4: User can read other users for search (needed for friend functionality)
        try {
            const otherUserDoc = await getDoc(
                doc(db, `artifacts/${APP_ID}/users/${userId1}`),
            );
            addResult("User can read other users for search", otherUserDoc.exists());
        } catch (error) {
            addResult(
                "User can read other users for search",
                false,
                getErrorMessage(error),
            );
        }

        // Test 5: User cannot write to other user's document
        try {
            await setDoc(doc(db, `artifacts/${APP_ID}/users/${userId1}`), {
                displayName: "Hacked User 1",
                email: testEmail1,
                shameScore: 999,
                friends: [],
                fcmToken: null,
                createdAt: new Date(),
                searchableEmail: testEmail1.toLowerCase(),
                searchableName: "hacked user 1",
            });
            addResult(
                "User cannot write other user document",
                false,
                "Should have been denied",
            );
        } catch (error) {
            addResult("User cannot write other user document", true);
        }

        // Test 6: User can create their own goals (Requirement 7.3)
        let goalId: string | null = null;
        try {
            const goalRef = await addDoc(
                collection(db, `artifacts/${APP_ID}/public/data/goals`),
                {
                    ownerId: userId2,
                    description: "Test Goal",
                    frequency: "daily",
                    targetDays: ["Monday"],
                    latestCompletionDate: null,
                    currentStatus: "Green",
                    nextDeadline: new Date(),
                    isShared: true,
                    createdAt: new Date(),
                    redSince: null,
                },
            );
            goalId = goalRef.id;
            addResult("User can create own goals", true);
        } catch (error) {
            addResult("User can create own goals", false, getErrorMessage(error));
        }

        // Test 7: User can read their own goals (Requirement 7.2)
        if (!goalId) {
            addResult("User can read own goals", false, "Goal not created");
        } else {
            try {
                const goalDoc = await getDoc(
                    doc(db, `artifacts/${APP_ID}/public/data/goals/${goalId}`),
                );
                addResult("User can read own goals", goalDoc.exists());
            } catch (error) {
                addResult(
                    "User can read own goals",
                    false,
                    getErrorMessage(error),
                );
            }
        }

        // Test 8: User cannot read non-friend's goals (Requirement 7.2)
        // Switch back to first user
        await signInWithEmailAndPassword(auth, testEmail1, password);

        if (!goalId) {
            addResult("User cannot read non-friend goals", true);
        } else {
            try {
                const goalDoc = await getDoc(
                    doc(db, `artifacts/${APP_ID}/public/data/goals/${goalId}`),
                );
                addResult(
                    "User cannot read non-friend goals",
                    !goalDoc.exists(),
                    "Should not be able to read",
                );
            } catch (error) {
                addResult("User cannot read non-friend goals", true);
            }
        }

        // Test 9: Add users as friends and test friend goal access
        // Update user1 to have user2 as friend
        await setDoc(doc(db, `artifacts/${APP_ID}/users/${userId1}`), {
            displayName: "Test User 1",
            email: testEmail1,
            shameScore: 0,
            friends: [userId2],
            fcmToken: null,
            createdAt: new Date(),
            searchableEmail: testEmail1.toLowerCase(),
            searchableName: "test user 1",
        });

        // Update user2 to have user1 as friend
        await signInWithEmailAndPassword(auth, testEmail2, password);
        await setDoc(doc(db, `artifacts/${APP_ID}/users/${userId2}`), {
            displayName: "Test User 2",
            email: testEmail2,
            shameScore: 0,
            friends: [userId1],
            fcmToken: null,
            createdAt: new Date(),
            searchableEmail: testEmail2.toLowerCase(),
            searchableName: "test user 2",
        });

        // Switch back to user1 and try to read user2's goal
        await signInWithEmailAndPassword(auth, testEmail1, password);

        if (!goalId) {
            addResult("User can read friend goals", false, "Goal not created");
        } else {
            try {
                const goalDoc = await getDoc(
                    doc(db, `artifacts/${APP_ID}/public/data/goals/${goalId}`),
                );
                addResult("User can read friend goals", goalDoc.exists());
            } catch (error) {
                addResult(
                    "User can read friend goals",
                    false,
                    getErrorMessage(error),
                );
            }
        }

        // Test 10: User cannot write to friend's goals (Requirement 7.3)
        if (!goalId) {
            addResult("User cannot write friend goals", true);
        } else {
            try {
                await setDoc(
                    doc(db, `artifacts/${APP_ID}/public/data/goals/${goalId}`),
                    {
                        ownerId: userId2,
                        description: "Hacked Goal",
                        frequency: "daily",
                        targetDays: ["Monday"],
                        latestCompletionDate: null,
                        currentStatus: "Red",
                        nextDeadline: new Date(),
                        isShared: true,
                        createdAt: new Date(),
                        redSince: null,
                    },
                );
                addResult(
                    "User cannot write friend goals",
                    false,
                    "Should have been denied",
                );
            } catch (error) {
                addResult("User cannot write friend goals", true);
            }
        }
    } catch (error) {
        console.error("Test setup error:", error);
    }

    // Print summary
    console.log("\n📊 Test Summary:");
    const summary = Object.values(results);
    const passed = summary.filter((r) => r.passed).length;
    const total = summary.length;
    console.log(`${passed}/${total} tests passed`);

    if (passed === total) {
        console.log("🎉 All security rule tests passed!");
    } else {
        console.log("❌ Some security rule tests failed. Check the rules.");
    }
}

// Run the tests
testSecurityRules().catch(console.error);
