import { app } from "@/firebaseConfig";
import { getFunctions, httpsCallable } from "firebase/functions";
import { updateDoc } from "firebase/firestore";
import { getUserDoc } from "./collections";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

const functions = getFunctions(app);

/**
 * Subscription Service
 * 
 * Handles upgrading users to Pro and managing subscription state.
 */

/**
 * Upgrades a user to the Pro plan (Secure Server Call)
 */
export async function upgradeToPro(): Promise<void> {
    try {
        const callable = httpsCallable<any, { success: boolean }>(functions, "purchaseProPlan");
        const result = await callable({});
        
        if (result.data.success) {
            showSuccessToast("Success! You are now a Pro member. 🎉");
        }
    } catch (error) {
        console.error("Failed to upgrade plan:", error);
        showErrorToast("Payment simulation failed. Please try again.");
        throw error;
    }
}

/**
 * Cancels a subscription (Simulation)
 * Note: Only server-side should normally update plan, but we keep this for testing logic.
 * In production, this would be a Cloud Function or triggered by webhook.
 */
export async function cancelSubscription(userId: string): Promise<void> {
    try {
        const userRef = getUserDoc(userId);
        await updateDoc(userRef, {
            plan: "free",
            subscriptionId: null
        });
        showSuccessToast("Subscription cancelled.");
    } catch (error) {
        showErrorToast("Failed to cancel subscription.");
        throw error;
    }
}