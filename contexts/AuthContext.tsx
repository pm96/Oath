import { auth } from "@/firebaseConfig";
import * as AuthService from "@/services/firebase/authService";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import React, { createContext, ReactNode, useEffect, useState } from "react";

/**
 * AuthContext
 *
 * Provides authentication state and methods throughout the app
 * Requirements: 1.1, 1.2, 1.5
 */

interface AuthContextType {
    user: FirebaseUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<FirebaseUser>;
    signUp: (
        email: string,
        password: string,
        displayName: string,
    ) => Promise<FirebaseUser>;
    signOut: () => Promise<void>;
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
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to auth state changes
        // Requirement 1.5: Maintain session state
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        signIn: AuthService.signIn,
        signUp: AuthService.signUp,
        signOut: AuthService.signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
