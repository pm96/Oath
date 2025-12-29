/**
 * Migration Script (JS): Populate missing invite codes for existing users
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, updateDoc, doc } = require("firebase/firestore");

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAuHgSN2SPxa1dW5EnGdbNAd7jIZSZP4Dc",
    authDomain: "oath-34449.firebaseapp.com",
    projectId: "oath-34449",
    storageBucket: "oath-34449.firebasestorage.app",
    messagingSenderId: "520674735848",
    appId: "1:520674735848:web:4ddbe37c4b7ccbc1a9bb5d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const APP_ID = "oath-app";

async function migrateInviteCodes() {
    console.log("🚀 Starting Invite Code Migration (JS)...");
    
    try {
        const usersCollection = collection(db, "artifacts", APP_ID, "users");
        const snapshot = await getDocs(usersCollection);
        
        console.log(`Found ${snapshot.size} users to check.`);
        
        let updatedCount = 0;
        
        for (const userDoc of snapshot.docs) {
            const data = userDoc.data();
            
            if (!data.inviteCode) {
                const userId = userDoc.id;
                const newInviteCode = userId.slice(-6).toUpperCase();
                
                console.log(`Updating User ${userId} with code: ${newInviteCode}`);
                
                await updateDoc(doc(db, "artifacts", APP_ID, "users", userId), {
                    inviteCode: newInviteCode
                });
                updatedCount++;
            } else {
                console.log(`User ${userDoc.id} already has code: ${data.inviteCode}`);
            }
        }
        
        console.log(`\n✅ Migration Complete. Updated ${updatedCount} users.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrateInviteCodes();
