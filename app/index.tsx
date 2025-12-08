import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

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

    // Show loading indicator while checking auth state
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Redirect based on authentication state
    if (user) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/sign-in" />;
}
