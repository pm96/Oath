import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";

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

async function debug() {
    // Sign in as a test user
    const email = "test@example.com";
    const password = "TestPassword123!";

    try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        console.log("Signed in as:", userCred.user.uid);

        const userDoc = doc(db, "artifacts", APP_ID, "users", userCred.user.uid);
        const userSnap = await getDoc(userDoc);

        if (userSnap.exists()) {
            console.log("User data:", userSnap.data());
        } else {
            console.log("User document does not exist");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

debug();
