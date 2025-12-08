import { initializeApp } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import {
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

async function test() {
    console.log("Creating test scenario...\n");

    // Create user 1
    const user1Email = `simple-test-1-${Date.now()}@example.com`;
    const user1Cred = await createUserWithEmailAndPassword(
        auth,
        user1Email,
        "Test123!",
    );
    const user1Id = user1Cred.user.uid;
    console.log("User 1 ID:", user1Id);

    await setDoc(doc(db, "artifacts", APP_ID, "users", user1Id), {
        displayName: "User 1",
        shameScore: 0,
        friends: [],
        fcmToken: null,
        createdAt: Timestamp.now(),
    });

    // Create a goal for user 1
    const goalId = `test-goal-${Date.now()}`;
    await setDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "goals", goalId),
        {
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
        },
    );

    console.log("Goal ID:", goalId);

    // Create user 2
    await signOut(auth);
    const user2Email = `simple-test-2-${Date.now()}@example.com`;
    const user2Cred = await createUserWithEmailAndPassword(
        auth,
        user2Email,
        "Test123!",
    );
    const user2Id = user2Cred.user.uid;
    console.log("User 2 ID:", user2Id);

    await setDoc(doc(db, "artifacts", APP_ID, "users", user2Id), {
        displayName: "User 2",
        shameScore: 0,
        friends: [],
        fcmToken: null,
        createdAt: Timestamp.now(),
    });

    // Add user 2 to user 1's friends list (as user 1)
    await signOut(auth);
    await signInWithEmailAndPassword(auth, user1Email, "Test123!");
    await updateDoc(doc(db, "artifacts", APP_ID, "users", user1Id), {
        friends: [user2Id],
    });

    // Verify the friends list
    const user1Doc = await getDoc(doc(db, "artifacts", APP_ID, "users", user1Id));
    console.log("User 1 friends:", user1Doc.data()?.friends);

    // Try to read the goal as user 2
    await signOut(auth);
    await signInWithEmailAndPassword(auth, user2Email, "Test123!");
    console.log("\nAttempting to read goal as user 2...");

    try {
        const goalDoc = await getDoc(
            doc(db, "artifacts", APP_ID, "public", "data", "goals", goalId),
        );
        if (goalDoc.exists()) {
            console.log("✅ SUCCESS! User 2 can read user 1's goal");
            console.log("Goal data:", goalDoc.data());
        } else {
            console.log("❌ Goal does not exist");
        }
    } catch (error: any) {
        console.log("❌ FAILED! Error:", error.code, error.message);
    }

    // Cleanup
    await signOut(auth);
}

test().catch(console.error);
