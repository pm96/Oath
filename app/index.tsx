import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Index Route
 *
 * Root route that redirects based on authentication state
 * Requirement 8.4: Implement navigation with protected routes
 *
 * - Authenticated users -> /(tabs) (home screen)
 * - Unauthenticated users -> /sign-in
 */
export default function Index() {
    const { user, loading } = useAuth();
    const [checkingOnboarding, setCheckingOnboarding] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const completed = await AsyncStorage.getItem("@onboarding_completed");
                setNeedsOnboarding(completed !== "true");
            } catch (e) {
                console.error("Failed to check onboarding", e);
            } finally {
                setCheckingOnboarding(false);
            }
        };
        checkOnboarding();
    }, []);

    // Show loading indicator while checking auth state or onboarding
    if (loading || checkingOnboarding) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // If logged in but hasn't seen onboarding, show onboarding
    if (user && needsOnboarding) {
        return <Redirect href="/onboarding" />;
    }

    // Redirect based on authentication state
    if (user) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/sign-in" />;
}
