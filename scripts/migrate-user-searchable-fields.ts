/**
 * Migration Script: Add searchable fields to existing user documents
 *
 * This script updates all existing user documents in Firestore to include
 * searchableEmail and searchableName fields for efficient case-insensitive search.
 *
 * Requirements: 1.1 (User Search and Discovery)
 *
 * Usage:
 *   npx tsx scripts/migrate-user-searchable-fields.ts
 */

import { initializeApp } from "firebase/app";
import {
    collection,
    doc,
    getDocs,
    getFirestore,
    updateDoc,
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAuHgSN2SPxa1dW5EnGdbNAd7jIZSZP4Dc",
    authDomain: "oath-34449.firebaseapp.com",
    projectId: "oath-34449",
    storageBucket: "oath-34449.firebasestorage.app",
    messagingSenderId: "520674735848",
    appId: "1:520674735848:web:4ddbe37c4b7ccbc1a9bb5d",
    measurementId: "G-1PGN7XCYTQ",
};

const APP_ID = "oath-app";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface UserDoc {
    displayName?: string;
    email?: string;
    searchableEmail?: string;
    searchableName?: string;
}

async function migrateUsers() {
    console.log("Starting user migration...");

    try {
        // Get all user documents
        const usersCollection = collection(db, "artifacts", APP_ID, "users");
        const usersSnapshot = await getDocs(usersCollection);

        console.log(`Found ${usersSnapshot.size} user documents`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // Process each user document
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data() as UserDoc;
            const userId = userDoc.id;

            // Check if searchable fields already exist
            if (userData.searchableEmail && userData.searchableName) {
                console.log(`Skipping user ${userId} - already has searchable fields`);
                skippedCount++;
                continue;
            }

            // Prepare update data
            const updateData: Partial<UserDoc> = {};

            if (userData.email && !userData.searchableEmail) {
                updateData.searchableEmail = userData.email.toLowerCase();
            }

            if (userData.displayName && !userData.searchableName) {
                updateData.searchableName = userData.displayName.toLowerCase();
            }

            // Update document if there's data to update
            if (Object.keys(updateData).length > 0) {
                try {
                    const userDocRef = doc(db, "artifacts", APP_ID, "users", userId);
                    await updateDoc(userDocRef, updateData);
                    console.log(`Updated user ${userId}:`, updateData);
                    updatedCount++;
                } catch (error) {
                    console.error(`Error updating user ${userId}:`, error);
                    errorCount++;
                }
            } else {
                console.log(`Skipping user ${userId} - missing email or displayName`);
                skippedCount++;
            }
        }

        console.log("\nMigration complete!");
        console.log(`Updated: ${updatedCount}`);
        console.log(`Skipped: ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

// Run migration
migrateUsers()
    .then(() => {
        console.log("Migration script finished successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Migration script failed:", error);
        process.exit(1);
    });
