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
    email: string;
    shameScore: number;
    friends: string[];
    fcmToken: string | null;
    createdAt: Date;
    searchableEmail: string; // Lowercase email for case-insensitive search
    searchableName: string; // Lowercase displayName for case-insensitive search
}

export interface FriendRequest {
    id: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    receiverId: string;
    status: "pending" | "accepted" | "rejected";
    createdAt: Date;
    updatedAt: Date;
}

export interface UserSearchResult {
    userId: string;
    displayName: string;
    email: string;
    relationshipStatus: "none" | "friend" | "pending_sent" | "pending_received";
    shameScore?: number;
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
    type: "time" | "flexible";
    targetTime: string | null;
    createdAt: Date;
    redSince: Date | null;
    difficulty: "easy" | "medium" | "hard";
    lastCompletionId?: string | null;
}

/**
 * Interface combining goal data with owner information
 * Used for displaying friends' goals with owner details
 */
export interface GoalWithOwner extends Goal {
    ownerName: string;
    ownerShameScore: number;
}

export interface Nudge {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    goalId: string;
    goalDescription: string;
    timestamp: Date;
    cooldownUntil: Date;
    createdAt: Date;
}

export interface GoalStatus {
    color: "green" | "yellow" | "red";
    priority: number; // For sorting (1=highest, 3=lowest)
    text: string; // "Safe", "Due in 2h", "Overdue by 1d"
    showNudge: boolean;
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

/**
 * Get reference to friendRequests collection
 */
export function getFriendRequestsCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "friendRequests");
}

/**
 * Get reference to a specific friend request document
 */
export function getFriendRequestDoc(requestId: string): DocumentReference {
    return doc(db, "artifacts", APP_ID, "friendRequests", requestId);
}

/**
 * Get reference to nudges collection
 */
export function getNudgesCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "nudges");
}

/**
 * Get reference to a specific nudge document
 */
export function getNudgeDoc(nudgeId: string): DocumentReference {
    return doc(db, "artifacts", APP_ID, "nudges", nudgeId);
}

/**
 * Get reference to habit completions collection
 */
export function getHabitCompletionsCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "completions");
}

/**
 * Get reference to a specific habit completion document
 */
export function getHabitCompletionDoc(completionId: string): DocumentReference {
    return doc(db, "artifacts", APP_ID, "completions", completionId);
}

/**
 * Get reference to habit streaks collection
 */
export function getHabitStreaksCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "streaks");
}

/**
 * Get reference to a specific habit streak document
 */
export function getHabitStreakDoc(streakId: string): DocumentReference {
    return doc(db, "artifacts", APP_ID, "streaks", streakId);
}

/**
 * Get reference to habit analytics collection
 */
export function getHabitAnalyticsCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "analytics");
}

/**
 * Get reference to a specific habit analytics document
 */
export function getHabitAnalyticsDoc(analyticsId: string): DocumentReference {
    return doc(db, "artifacts", APP_ID, "analytics", analyticsId);
}

/**
 * Get reference to social posts collection
 */
export function getSocialPostsCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "socialPosts");
}

/**
 * Get reference to a specific social post document
 */
export function getSocialPostDoc(postId: string): DocumentReference {
    return doc(db, "artifacts", APP_ID, "socialPosts", postId);
}

/**
 * Get reference to shared streaks collection
 */
export function getSharedStreaksCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "sharedStreaks");
}

/**
 * Get reference to a specific shared streak document
 */
export function getSharedStreakDoc(streakId: string): DocumentReference {
    return doc(db, "artifacts", APP_ID, "sharedStreaks", streakId);
}

/**
 * Get reference to streak notifications collection
 */
export function getStreakNotificationsCollection(): CollectionReference {
    return collection(db, "artifacts", APP_ID, "streakNotifications");
}

/**
 * Get reference to a specific streak notification document
 */
export function getStreakNotificationDoc(
    notificationId: string,
): DocumentReference {
    return doc(db, "artifacts", APP_ID, "streakNotifications", notificationId);
}
