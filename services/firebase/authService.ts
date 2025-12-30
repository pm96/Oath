import { auth, app } from "@/firebaseConfig";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
    retryWithBackoff,
    validateDisplayName,
    validateEmail,
    validatePassword,
} from "@/utils/errorHandling";
import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    User as FirebaseUser,
    signInWithEmailAndPassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    sendPasswordResetEmail,
    sendEmailVerification,
} from "firebase/auth";
import { getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getUserDoc } from "./collections";

/**
 * Send email verification to the current user
 */
export async function sendVerificationEmail(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw {
            code: "auth/no-user",
            message: "No user is currently signed in.",
        } as AuthError;
    }

    try {
        await retryWithBackoff(
            () => sendEmailVerification(user),
            { maxAttempts: 2 },
        );
    } catch (error: any) {
        throw {
            code: error.code,
            message: getAuthErrorMessage(error.code),
        } as AuthError;
    }
}

/**
 * Send a password reset email to the user
 */
export async function sendPasswordReset(email: string): Promise<void> {
    if (!email || !email.trim()) {
        throw {
            code: "auth/invalid-email",
            message: "Please enter your email address.",
        } as AuthError;
    }

    try {
        await retryWithBackoff(
            () => sendPasswordResetEmail(auth, email.trim()),
            { maxAttempts: 2 },
        );
    } catch (error: any) {
        throw {
            code: error.code,
            message: getAuthErrorMessage(error.code),
        } as AuthError;
    }
}

/**
 * AuthService
 *
 * Handles authentication operations and user document initialization
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

export interface AuthError {
    code: string;
    message: string;
}

/**
 * Sign in with email and password
 * Requirement 1.2: Authenticate user and grant access to their data
 * Requirement 1.4: Validate inputs and display appropriate error messages
 */
export async function signIn(
    email: string,
    password: string,
): Promise<FirebaseUser> {
    // Validate inputs
    const emailError = validateEmail(email);
    if (emailError) {
        throw {
            code: "auth/invalid-email",
            message: emailError,
        } as AuthError;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        throw {
            code: "auth/invalid-password",
            message: passwordError,
        } as AuthError;
    }

    try {
        // Retry on network errors
        const userCredential = await retryWithBackoff(
            () => signInWithEmailAndPassword(auth, email.trim(), password),
            { maxAttempts: 2 }, // Only retry once for auth
        );
        return userCredential.user;
    } catch (error: any) {
        throw {
            code: error.code,
            message: getAuthErrorMessage(error.code),
        } as AuthError;
    }
}

/**
 * Create new user account with email and password
 * Requirements 1.1, 1.3: Create user account and initialize Firestore document
 * Requirement 1.4: Validate inputs and display appropriate error messages
 */
export async function signUp(
    email: string,
    password: string,
    displayName: string,
): Promise<FirebaseUser> {
    // Validate inputs
    const emailError = validateEmail(email);
    if (emailError) {
        throw {
            code: "auth/invalid-email",
            message: emailError,
        } as AuthError;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        throw {
            code: "auth/weak-password",
            message: passwordError,
        } as AuthError;
    }

    const displayNameError = validateDisplayName(displayName);
    if (displayNameError) {
        throw {
            code: "auth/invalid-display-name",
            message: displayNameError,
        } as AuthError;
    }

    try {
        // Create Firebase Auth user with retry
        const userCredential = await retryWithBackoff(
            () => createUserWithEmailAndPassword(auth, email.trim(), password),
            { maxAttempts: 2 },
        );
        const user = userCredential.user;

        // Generate invite code
        const inviteCode = user.uid.slice(-6).toUpperCase();

        // Initialize user document in Firestore
        // Requirement 1.3: Initialize with displayName, shameScore=0, empty friends array
        const userDocRef = getUserDoc(user.uid);
        const trimmedDisplayName = displayName.trim();
        const trimmedEmail = email.trim();
        await retryWithBackoff(
            () =>
                setDoc(userDocRef, {
                    displayName: trimmedDisplayName,
                    email: trimmedEmail,
                    shameScore: 0,
                    friends: [],
                    blockedUsers: [],
                    plan: "free",
                    fcmToken: null,
                    createdAt: serverTimestamp(),
                    searchableEmail: trimmedEmail.toLowerCase(),
                    searchableName: trimmedDisplayName.toLowerCase(),
                    inviteCode: inviteCode,
                }),
            { maxAttempts: 3 },
        );

        // Send email verification
        try {
            await sendEmailVerification(user);
        } catch (error) {
            console.error("Failed to send initial verification email:", error);
        }

        return user;
    } catch (error: any) {
        throw {
            code: error.code,
            message: getAuthErrorMessage(error.code),
        } as AuthError;
    }
}

/**
 * Sign out current user
 * Requirement 1.5: Maintain session until explicit sign-out
 */
export async function signOut(): Promise<void> {
    try {
        await firebaseSignOut(auth);
    } catch (error: any) {
        throw {
            code: error.code,
            message: "Failed to sign out. Please try again.",
        } as AuthError;
    }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
}

/**
 * Check if user document exists in Firestore
 */
export async function userDocumentExists(userId: string): Promise<boolean> {
    const userDocRef = getUserDoc(userId);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists();
}

/**
 * Reauthenticates the current user with their password.
 */
export async function reauthenticate(password: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) {
        throw {
            code: "auth/no-user",
            message: "No user is currently signed in.",
        } as AuthError;
    }

    try {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
    } catch (error: any) {
        throw {
            code: error.code,
            message: getAuthErrorMessage(error.code),
        } as AuthError;
    }
}

/**
 * Changes the current user's password.
 */
export async function changePassword(newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw {
            code: "auth/no-user",
            message: "No user is currently signed in.",
        } as AuthError;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
        throw {
            code: "auth/weak-password",
            message: passwordError,
        } as AuthError;
    }

    try {
        await updatePassword(user, newPassword);
    } catch (error: any) {
        throw {
            code: error.code,
            message: getAuthErrorMessage(error.code),
        } as AuthError;
    }
}

/**
 * Convert Firebase error codes to user-friendly messages
 * Requirement 1.4: Display appropriate error messages
 */
function getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
        case "auth/invalid-email":
            return "Invalid email address format.";
        case "auth/user-disabled":
            return "This account has been disabled.";
        case "auth/user-not-found":
            return "No account found with this email.";
        case "auth/wrong-password":
            return "Incorrect password.";
        case "auth/email-already-in-use":
            return "An account with this email already exists.";
        case "auth/weak-password":
            return "Password should be at least 6 characters.";
        case "auth/network-request-failed":
            return "Network error. Please check your connection.";
        case "auth/too-many-requests":
            return "Too many failed attempts. Please try again later.";
        case "auth/invalid-credential":
            return "Invalid email or password.";
        default:
            return "Authentication failed. Please try again.";
    }
}

const functions = getFunctions(app);

/**
 * Deletes the current user's account and all associated data.
 */
export async function deleteAccount(): Promise<void> {
    try {
        const deleteUser = httpsCallable<
            Record<string, never>,
            { success: boolean }
        >(functions, "deleteAccount");

        const result = await deleteUser({});

        if (!result.data.success) {
            throw new Error("Failed to delete account on the server.");
        }

        // Explicitly sign out locally to trigger onAuthStateChanged
        await firebaseSignOut(auth);
    } catch (error: any) {
        throw {
            code: error.code || 'internal',
            message: getAuthErrorMessage(error.code),
        } as AuthError;
    }
}
