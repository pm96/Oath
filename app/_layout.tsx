import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { VStack } from "@/components/ui/vstack";
import { AuthProvider } from "@/contexts/AuthContext";
import "@/global.css";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

/**
 * RootNavigator
 *
 * Implements protected routes based on authentication state
 * Requirement 8.4: Use Expo Router for consistent navigation patterns
 */
function RootNavigator() {
    const { loading } = useAuth();

    // Initialize notifications - automatically registers device token when user is authenticated
    useNotifications();

    // Show loading screen while checking authentication state
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <VStack className="flex-1">
            <OfflineIndicator />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="sign-in" options={{ headerShown: false }} />
                <Stack.Screen name="create-account" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
        </VStack>
    );
}

export default function RootLayout() {
    return (
        <ErrorBoundary>
            <GluestackUIProvider>
                <AuthProvider>
                    <RootNavigator />
                </AuthProvider>
            </GluestackUIProvider>
        </ErrorBoundary>
    );
}
