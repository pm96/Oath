/**
 * Migration Script (Admin): Populate missing invite codes for existing users
 */

const admin = require("firebase-admin");

// Note: This requires a service account key file
// Since I don't have access to your private key file, I'll use the environment default if possible
// OR I will assume you can run this with your credentials.

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "oath-34449"
  });
}

const db = admin.firestore();
const APP_ID = "oath-app";

async function migrateInviteCodes() {
    console.log("🚀 Starting Invite Code Migration (Admin)...");
    
    try {
        const usersCollection = db.collection(`artifacts/${APP_ID}/users`);
        const snapshot = await usersCollection.get();
        
        console.log(`Found ${snapshot.size} users to check.`);
        
        let updatedCount = 0;
        const batch = db.batch();
        
        snapshot.docs.forEach((userDoc) => {
            const data = userDoc.data();
            
            if (!data.inviteCode) {
                const userId = userDoc.id;
                const newInviteCode = userId.slice(-6).toUpperCase();
                
                console.log(`Queueing User ${userId} with code: ${newInviteCode}`);
                
                batch.update(userDoc.ref, {
                    inviteCode: newInviteCode
                });
                updatedCount++;
            } else {
                console.log(`User ${userDoc.id} already has code: ${data.inviteCode}`);
            }
        });
        
        if (updatedCount > 0) {
            await batch.commit();
        }
        
        console.log(`\n✅ Migration Complete. Updated ${updatedCount} users.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        console.log("\nTIP: If you get a 'Credential' error, you need to set GOOGLE_APPLICATION_CREDENTIALS.");
        process.exit(1);
    }
}

migrateInviteCodes();
