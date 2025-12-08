import { AuthContext } from "@/contexts/AuthContext";
import { useContext } from "react";

/**
 * useAuth Hook
 *
 * Custom hook for accessing authentication state and methods
 * Provides convenient access to auth context throughout the app
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
