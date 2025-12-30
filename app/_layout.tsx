import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ToastProvider } from "@/components/ToastProvider";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { VStack } from "@/components/ui/vstack";
import { AuthProvider } from "@/contexts/AuthContext";
import { CelebrationProvider } from "@/contexts/CelebrationContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import "@/global.css";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { findUserByInviteCode, sendFriendRequest } from "@/services/firebase/friendService";
import { AccessibilityManager } from "@/utils/accessibility";
import { showSuccessToast, showErrorToast } from "@/utils/toast";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

/**
 * RootNavigator
 *
 * Implements protected routes based on authentication state with modern navigation styling
 * Requirement 8.4: Use Expo Router for consistent navigation patterns
 * Requirements: 1.5, 3.4 - Modern styling and smooth transitions
 */
function RootNavigator() {
    const { user, loading } = useAuth();
    const { theme, isDark } = useTheme();

    // Initialize notifications - automatically registers device token when user is authenticated
    useNotifications();

    // Handle deep links for friend invites
    useEffect(() => {
        const handleDeepLink = async (url: string) => {
            const { path, queryParams } = Linking.parse(url);
            
            // Handle oath://invite/ABC123 or https://oath.app/invite/ABC123
            if (path && path.includes("invite/") && user?.uid) {
                const code = path.split("invite/")[1].toUpperCase();
                if (!code) return;

                try {
                    const targetUser = await findUserByInviteCode(code);
                    if (targetUser && targetUser.uid !== user.uid) {
                        await sendFriendRequest(user.uid, targetUser.uid);
                        showSuccessToast(`Friend request sent to ${targetUser.displayName}!`);
                    }
                } catch (e) {
                    console.error("Deep link processing failed", e);
                }
            }
        };

        const subscription = Linking.addEventListener("url", (event) => {
            handleDeepLink(event.url);
        });

        // Check for initial URL if app was closed
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink(url);
        });

        return () => subscription.remove();
    }, [user?.uid]);

    // Initialize accessibility manager
    useEffect(() => {
        AccessibilityManager.initialize();
    }, []);

    // Show loading screen while checking authentication state
    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.colors.background,
                }}
            >
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <VStack className="flex-1">
            <OfflineIndicator />
            <Stack
                screenOptions={{
                    headerShown: false,
                    // Modern navigation styling
                    headerStyle: {
                        backgroundColor: theme.colors.card,
                        ...(Platform.OS === "android" && { elevation: 4 }), // Android shadow
                        ...(Platform.OS === "ios" && {
                            shadowColor: theme.colors.foreground, // iOS shadow
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isDark ? 0.3 : 0.1,
                            shadowRadius: 4,
                        }),
                    },
                    headerTitleStyle: {
                        fontSize: theme.typography.sizes.lg,
                        fontWeight: "600" as const,
                        color: theme.colors.foreground,
                    },
                    headerTintColor: theme.colors.primary,
                    // Smooth transitions
                    animation: "slide_from_right",
                    animationDuration: 300,
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="sign-in"
                    options={{
                        headerShown: false,
                        animation: "fade",
                    }}
                />
                <Stack.Screen
                    name="create-account"
                    options={{
                        headerShown: false,
                        animation: "slide_from_bottom",
                    }}
                />
                <Stack.Screen
                    name="+not-found"
                    options={{
                        headerShown: false,
                        animation: "fade",
                    }}
                />
            </Stack>
        </VStack>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
                <CelebrationProvider>
                    <ErrorBoundary>
                        <GluestackUIProvider>
                            <ToastProvider>
                                <AuthProvider>
                                    <RootNavigator />
                                </AuthProvider>
                            </ToastProvider>
                        </GluestackUIProvider>
                    </ErrorBoundary>
                </CelebrationProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
