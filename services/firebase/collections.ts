import {
    collection,
    CollectionReference,
    doc,
    DocumentReference,
} from "firebase/firestore";
import { APP_ID, db } from "../../firebaseConfig";

/**
 * Firestore Collections Structure Helper
 *
 * This module provides typed references to Firestore collections
 * following the structure: /artifacts/{appId}/...
 */

// Type definitions for our data models
export interface User {
    displayName: string;
    shameScore: number;
    friends: string[];
    fcmToken: string | null;
    createdAt: Date;
}

export interface Goal {
    id: string;
    ownerId: string;
    description: string;
    frequency: "daily" | "weekly" | "3x_a_week";
    targetDays: string[];
    latestCompletionDate: Date | null;
    currentStatus: "Green" | "Yellow" | "Red";
    nextDeadline: Date;
    isShared: boolean;
    createdAt: Date;
    redSince: Date | null;
}

/**
 * Interface combining goal data with owner information
 * Used for displaying friends' goals with owner details
 */
export interface GoalWithOwner extends Goal {
    ownerName: string;
    ownerShameScore: number;
}

/**
 * Get reference to users collection
 */
export function getUsersCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "users");
}

/**
 * Get reference to a specific user document
 */
export function getUserDoc(userId: string): DocumentReference {
    return doc(db, "artifacts", APP_ID, "users", userId);
}

/**
 * Get reference to goals collection
 */
export function getGoalsCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "public", "data", "goals");
}

/**
 * Get reference to a specific goal document
 */
export function getGoalDoc(goalId: string): DocumentReference {
    return doc(db, "artifacts", APP_ID, "public", "data", "goals", goalId);
}
