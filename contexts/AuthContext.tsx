import { auth } from "@/firebaseConfig";
import * as AuthService from "@/services/firebase/authService";
import { User as FirestoreUser } from "@/services/firebase/collections";
import { subscribeToUserData } from "@/services/firebase/socialService";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import React, { createContext, ReactNode, useEffect, useState } from "react";

/**
 * AuthContext
 *
 * Provides authentication state and methods throughout the app
 * Requirements: 1.1, 1.2, 1.5
 */

export type AppUser = FirebaseUser & Partial<FirestoreUser>;

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<FirebaseUser>;
    signUp: (
        email: string,
        password: string,
        displayName: string,
    ) => Promise<FirebaseUser>;
    signOut: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    reload: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined,
);

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * AuthProvider
 *
 * Manages authentication state and provides auth methods to the app
 * Requirement 1.5: Maintains session until explicit sign-out
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUserState = async () => {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            await firebaseUser.reload();
            const reloadedUser = auth.currentUser;
            if (reloadedUser) {
                setUser((prev) => prev ? { ...reloadedUser, ...prev } : (reloadedUser as AppUser));
            }
        }
    };

    useEffect(() => {
        // Listen to auth state changes and Firestore user document
        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in, now listen for Firestore data
                const unsubscribeFirestore = subscribeToUserData(
                    firebaseUser.uid,
                    (firestoreUser) => {
                        if (firestoreUser) {
                            // Combine auth user and firestore user data
                            // We use the raw firebaseUser object properties but the state remains a plain object
                            setUser({ ...firebaseUser, ...firestoreUser });
                        } else {
                            // Auth user exists but no Firestore doc, might be an error state
                            setUser(firebaseUser as AppUser);
                        }
                        setLoading(false);
                    }
                );
                return unsubscribeFirestore;
            } else {
                // User is signed out
                setUser(null);
                setLoading(false);
            }
        });

        return unsubscribeAuth;
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        signIn: AuthService.signIn,
        signUp: AuthService.signUp,
        signOut: AuthService.signOut,
        sendPasswordReset: AuthService.sendPasswordReset,
        sendVerificationEmail: AuthService.sendVerificationEmail,
        reload: refreshUserState,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
