/**
 * Security Rules Testing Script
 *
 * This script tests the Firestore security rules to ensure they properly:
 * 1. Allow users to read/write only their own user documents
 * 2. Allow goal read access for owner or friends
 * 3. Allow goal write access for owner only
 * 4. Deny unauthenticated access
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
    deleteDoc,
    doc,
    getDoc,
    getFirestore,
    setDoc,
    Timestamp,
    updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAuHgSN2SPxa1dW5EnGdbNAd7jIZSZP4Dc",
    authDomain: "oath-34449.firebaseapp.com",
    projectId: "oath-34449",
    storageBucket: "oath-34449.firebasestorage.app",
    messagingSenderId: "520674735848",
    appId: "1:520674735848:web:4ddbe37c4b7ccbc1a9bb5d",
};

const APP_ID = "oath-app";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Test user credentials
const testUser1Email = `test-user-1-${Date.now()}@example.com`;
const testUser2Email = `test-user-2-${Date.now()}@example.com`;
const testPassword = "TestPassword123!";

let user1Id: string;
let user2Id: string;
let testGoalId: string;

async function runTests() {
    console.log("🔒 Starting Firestore Security Rules Tests\n");

    try {
        // Test 1: Unauthenticated access should be denied
        console.log("Test 1: Unauthenticated access should be denied");
        await testUnauthenticatedAccess();
        console.log("✅ Test 1 passed\n");

        // Test 2: Create test users
        console.log("Test 2: Creating test users");
        await createTestUsers();
        console.log("✅ Test 2 passed\n");

        // Test 3: User can read/write their own document
        console.log("Test 3: User can read/write their own document");
        await testOwnUserDocument();
        console.log("✅ Test 3 passed\n");

        // Test 4: User cannot read/write other user documents
        console.log("Test 4: User cannot read/write other user documents");
        await testOtherUserDocument();
        console.log("✅ Test 4 passed\n");

        // Test 5: User can create and read their own goals
        console.log("Test 5: User can create and read their own goals");
        await testOwnGoals();
        console.log("✅ Test 5 passed\n");

        // Test 6: User cannot read goals from non-friends
        console.log("Test 6: User cannot read goals from non-friends");
        await testNonFriendGoalAccess();
        console.log("✅ Test 6 passed\n");

        // Test 7: User can read goals from friends
        console.log("Test 7: User can read goals from friends");
        await testFriendGoalAccess();
        console.log("✅ Test 7 passed\n");

        // Test 8: User cannot write to other user's goals
        console.log("Test 8: User cannot write to other user's goals");
        await testGoalWriteAccess();
        console.log("✅ Test 8 passed\n");

        console.log("🎉 All security rules tests passed!");
    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    } finally {
        // Cleanup
        await cleanup();
    }
}

async function testUnauthenticatedAccess() {
    await signOut(auth);

    try {
        const userDoc = doc(db, "artifacts", APP_ID, "users", "test-user");
        await getDoc(userDoc);
        throw new Error("Should not be able to read without authentication");
    } catch (error: any) {
        if (error.code !== "permission-denied") {
            throw error;
        }
    }
}

async function createTestUsers() {
    // Create user 1
    const userCred1 = await createUserWithEmailAndPassword(
        auth,
        testUser1Email,
        testPassword,
    );
    user1Id = userCred1.user.uid;

    const user1Doc = doc(db, "artifacts", APP_ID, "users", user1Id);
    await setDoc(user1Doc, {
        displayName: "Test User 1",
        shameScore: 0,
        friends: [],
        fcmToken: null,
        createdAt: Timestamp.now(),
    });

    await signOut(auth);

    // Create user 2
    const userCred2 = await createUserWithEmailAndPassword(
        auth,
        testUser2Email,
        testPassword,
    );
    user2Id = userCred2.user.uid;

    const user2Doc = doc(db, "artifacts", APP_ID, "users", user2Id);
    await setDoc(user2Doc, {
        displayName: "Test User 2",
        shameScore: 0,
        friends: [],
        fcmToken: null,
        createdAt: Timestamp.now(),
    });
}

async function testOwnUserDocument() {
    // Sign in as user 1
    await signInWithEmailAndPassword(auth, testUser1Email, testPassword);

    const userDoc = doc(db, "artifacts", APP_ID, "users", user1Id);

    // Should be able to read own document
    const docSnap = await getDoc(userDoc);
    if (!docSnap.exists()) {
        throw new Error("Should be able to read own user document");
    }

    // Should be able to update own document
    await updateDoc(userDoc, { shameScore: 1 });
}

async function testOtherUserDocument() {
    // Still signed in as user 1
    const user2Doc = doc(db, "artifacts", APP_ID, "users", user2Id);

    // Should NOT be able to read other user's document
    try {
        await getDoc(user2Doc);
        throw new Error("Should not be able to read other user document");
    } catch (error: any) {
        if (error.code !== "permission-denied") {
            throw error;
        }
    }

    // Should NOT be able to write to other user's document
    try {
        await updateDoc(user2Doc, { shameScore: 10 });
        throw new Error("Should not be able to write to other user document");
    } catch (error: any) {
        if (error.code !== "permission-denied") {
            throw error;
        }
    }
}

async function testOwnGoals() {
    // Still signed in as user 1
    const goalsCollection = collection(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "goals",
    );

    // Create a goal
    const goalRef = await addDoc(goalsCollection, {
        ownerId: user1Id,
        description: "Test Goal",
        frequency: "daily",
        targetDays: ["Monday"],
        latestCompletionDate: null,
        currentStatus: "Green",
        nextDeadline: Timestamp.now(),
        isShared: true,
        createdAt: Timestamp.now(),
        redSince: null,
    });

    testGoalId = goalRef.id;

    // Should be able to read own goal
    const goalSnap = await getDoc(goalRef);
    if (!goalSnap.exists()) {
        throw new Error("Should be able to read own goal");
    }

    // Should be able to update own goal
    await updateDoc(goalRef, { description: "Updated Test Goal" });
}

async function testNonFriendGoalAccess() {
    // Sign in as user 2
    await signOut(auth);
    await signInWithEmailAndPassword(auth, testUser2Email, testPassword);

    // User 2 should NOT be able to read user 1's goal (not friends yet)
    const goalDoc = doc(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "goals",
        testGoalId,
    );

    try {
        await getDoc(goalDoc);
        throw new Error("Should not be able to read non-friend goal");
    } catch (error: any) {
        if (error.code !== "permission-denied") {
            throw error;
        }
    }
}

async function testFriendGoalAccess() {
    // Add user 2 to user 1's friends list
    await signOut(auth);
    await signInWithEmailAndPassword(auth, testUser1Email, testPassword);

    const user1Doc = doc(db, "artifacts", APP_ID, "users", user1Id);
    await updateDoc(user1Doc, { friends: [user2Id] });

    // Wait a moment for the update to propagate
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Now sign in as user 2 and try to read user 1's goal
    await signOut(auth);
    await signInWithEmailAndPassword(auth, testUser2Email, testPassword);

    const goalDoc = doc(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "goals",
        testGoalId,
    );
    const goalSnap = await getDoc(goalDoc);

    if (!goalSnap.exists()) {
        throw new Error("Should be able to read friend goal");
    }
}

async function testGoalWriteAccess() {
    // Still signed in as user 2
    const goalDoc = doc(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "goals",
        testGoalId,
    );

    // User 2 should NOT be able to update user 1's goal (even as friend)
    try {
        await updateDoc(goalDoc, { description: "Hacked!" });
        throw new Error("Should not be able to write to friend goal");
    } catch (error: any) {
        if (error.code !== "permission-denied") {
            throw error;
        }
    }

    // User 2 should NOT be able to delete user 1's goal
    try {
        await deleteDoc(goalDoc);
        throw new Error("Should not be able to delete friend goal");
    } catch (error: any) {
        if (error.code !== "permission-denied") {
            throw error;
        }
    }
}

async function cleanup() {
    console.log("\n🧹 Cleaning up test data...");

    try {
        // Sign in as user 1 to delete their data
        await signOut(auth);
        await signInWithEmailAndPassword(auth, testUser1Email, testPassword);

        // Delete test goal
        if (testGoalId) {
            const goalDoc = doc(
                db,
                "artifacts",
                APP_ID,
                "public",
                "data",
                "goals",
                testGoalId,
            );
            await deleteDoc(goalDoc);
        }

        // Note: User documents and auth accounts would need admin SDK to delete
        // For now, we'll leave them as they don't interfere with future tests

        await signOut(auth);
        console.log("✅ Cleanup complete");
    } catch (error) {
        console.log("⚠️  Cleanup had some issues (this is okay):", error);
    }
}

// Run the tests
runTests();
