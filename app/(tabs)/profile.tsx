import {
    AnimatedView,
    Avatar,
    Body,
    Button,
    Caption,
    Card,
    Container,
    Heading,
    HStack,
    LoadingSkeleton,
    VStack,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, useThemeStyles } from "@/hooks/useTheme";
import { User } from "@/services/firebase/collections";
import { subscribeToUserData, updateUserNotificationSettings } from "@/services/firebase/socialService";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { router } from "expo-router";
import { Bell, LogOut, Moon, Settings, Shield } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, Switch, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "@/components/ui/safe-area-view";

/**
 * Modern redesigned Profile screen
 * Requirements: 4.1, 4.2 - Theme toggle and user profile interface
 */
export default function Profile() {
    const { user, signOut } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { colors, spacing } = useThemeStyles();
    const [userData, setUserData] = useState<User | null>(null);
    const [signingOut, setSigningOut] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Subscribe to user data and set initial notification preference
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToUserData(
            user.uid,
            (data) => {
                if (data) {
                    setUserData(data);
                    // Set initial state from Firestore, default to true if not set
                    setNotificationsEnabled(data.notificationSettings?.enabled ?? true);
                }
                setLoading(false);
            },
            (error) => {
                console.error("Error loading user data:", error);
                showErrorToast("Failed to load profile data", "Error");
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [user?.uid]);

    const handleSignOut = async () => {
        setSigningOut(true);
        try {
            await signOut();
            showSuccessToast("Signed out successfully");
        } catch (error: any) {
            showErrorToast(error.message || "Sign out failed", "Sign Out Failed");
            setSigningOut(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            // This is a simplified refresh, a real implementation might re-fetch data
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } finally {
            setRefreshing(false);
        }
    };

    const handleToggleNotifications = async () => {
        if (!user?.uid) return;

        const newValue = !notificationsEnabled;
        // Optimistically update the UI
        setNotificationsEnabled(newValue);
        showSuccessToast(
            newValue ? "Notifications enabled" : "Notifications disabled",
        );

        try {
            await updateUserNotificationSettings(user.uid, { enabled: newValue });
        } catch (error) {
            // Revert UI on error
            setNotificationsEnabled(!newValue);
            showErrorToast("Failed to update notification settings.");
            console.error("Failed to update settings:", error);
        }
    };

    const handleThemeToggle = () => {
        toggleTheme();
        showSuccessToast(`Switched to ${isDark ? "light" : "dark"} mode`);
    };

    const renderUserProfile = () => (
        <AnimatedView animation="slideInFromBottom" delay={100}>
            <Card variant="default" padding="lg">
                <HStack align="center" spacing="md">
                    <Avatar
                        src={user?.photoURL || undefined}
                        fallback={
                            userData?.displayName?.[0] || user?.displayName?.[0] || "DE"
                        }
                        size="lg"
                    />
                    <View style={{ flex: 1 }}>
                        <Heading size="lg">
                            {userData?.displayName || user?.displayName || "Demo User"}
                        </Heading>
                        <Body color="muted">
                            {userData?.email || user?.email || "demo@example.com"}
                        </Body>
                        <Caption
                            color="success"
                            style={{
                                marginTop: spacing.xs,
                                backgroundColor: colors.success + "20",
                                paddingHorizontal: spacing.sm,
                                paddingVertical: spacing.xs / 2,
                                borderRadius: 12,
                                alignSelf: "flex-start",
                            }}
                        >
                            Free Plan
                        </Caption>
                    </View>
                </HStack>
            </Card>
        </AnimatedView>
    );

    const renderPreferencesSection = () => (
        <AnimatedView animation="slideInFromBottom" delay={200}>
            <VStack spacing="md">
                <Caption
                    color="muted"
                    weight="semibold"
                    style={{ textTransform: "uppercase" }}
                >
                    PREFERENCES
                </Caption>

                <Card variant="default" padding="md">
                    <VStack spacing="md">
                        {/* Notifications Toggle */}
                        <HStack align="center" justify="space-between">
                            <HStack align="center" spacing="md">
                                <Bell size={20} color={colors.foreground} />
                                <Body>Notifications</Body>
                            </HStack>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={handleToggleNotifications}
                                trackColor={{
                                    false: colors.muted,
                                    true: colors.success,
                                }}
                                thumbColor={colors.background}
                            />
                        </HStack>

                        {/* Dark Mode Toggle */}
                        <HStack align="center" justify="space-between">
                            <HStack align="center" spacing="md">
                                <Moon size={20} color={colors.foreground} />
                                <Body>Dark Mode</Body>
                            </HStack>
                            <Switch
                                value={isDark}
                                onValueChange={handleThemeToggle}
                                trackColor={{
                                    false: colors.muted,
                                    true: colors.success,
                                }}
                                thumbColor={colors.background}
                            />
                        </HStack>
                    </VStack>
                </Card>
            </VStack>
        </AnimatedView>
    );

    const renderAccountSection = () => (
        <AnimatedView animation="slideInFromBottom" delay={300}>
            <VStack spacing="md">
                <Caption
                    color="muted"
                    weight="semibold"
                    style={{ textTransform: "uppercase" }}
                >
                    ACCOUNT
                </Caption>

                <Card variant="default" padding="md">
                    <VStack spacing="md">
                        {/* Privacy */}
                        <TouchableOpacity onPress={() => router.push('/privacy-settings')}>
                            <HStack align="center" justify="space-between">
                                <HStack align="center" spacing="md">
                                    <Shield size={20} color={colors.foreground} />
                                    <Body>Privacy</Body>
                                </HStack>
                            </HStack>
                        </TouchableOpacity>

                        {/* Account Settings */}
                        <TouchableOpacity onPress={() => router.push('/account-settings')}>
                            <HStack align="center" justify="space-between">
                                <HStack align="center" spacing="md">
                                    <Settings size={20} color={colors.foreground} />
                                    <Body>Account Settings</Body>
                                </HStack>
                            </HStack>
                        </TouchableOpacity>
                    </VStack>
                </Card>
            </VStack>
        </AnimatedView>
    );

    const renderSignOutButton = () => (
        <AnimatedView animation="slideInFromBottom" delay={400}>
            <Button
                variant="destructive"
                onPress={handleSignOut}
                disabled={signingOut}
                loading={signingOut}
                style={{
                    marginTop: spacing.lg,
                }}
            >
                <HStack align="center" spacing="sm">
                    <LogOut size={20} color={colors.destructiveForeground} />
                    <Body style={{ color: colors.destructiveForeground }} weight="semibold">
                        {signingOut ? "Signing Out..." : "Log Out"}
                    </Body>
                </HStack>
            </Button>
        </AnimatedView>
    );

    const renderLoadingSkeleton = () => (
        <VStack spacing="xl">
            {/* Profile skeleton */}
            <Card padding="lg">
                <HStack align="center" spacing="md">
                    <LoadingSkeleton width={56} height={56} borderRadius={28} />
                    <View style={{ flex: 1 }}>
                        <LoadingSkeleton height={20} width="60%" />
                        <LoadingSkeleton
                            height={16}
                            width="80%"
                            style={{ marginTop: spacing.xs }}
                        />
                        <LoadingSkeleton
                            height={12}
                            width="40%"
                            style={{ marginTop: spacing.xs }}
                        />
                    </View>
                </HStack>
            </Card>

            {/* Preferences skeleton */}
            <VStack spacing="md">
                <LoadingSkeleton height={12} width="30%" />
                <Card padding="md">
                    <VStack spacing="md">
                        <LoadingSkeleton height={20} width="100%" />
                        <LoadingSkeleton height={20} width="100%" />
                    </VStack>
                </Card>
            </VStack>
        </VStack>
    );

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: colors.background }}
            edges={["top", "left", "right"]}
        >
            <Container padding="lg">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: spacing.md }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {/* Header */}
                    <AnimatedView animation="fadeIn">
                        <VStack spacing="xs" style={{ marginBottom: spacing.xl }}>
                            <Heading size="xxl">Profile</Heading>
                        </VStack>
                    </AnimatedView>

                    {loading ? (
                        renderLoadingSkeleton()
                    ) : (
                        <VStack spacing="xl">
                            {/* User Profile Section */}
                            {renderUserProfile()}

                            {/* Preferences Section */}
                            {renderPreferencesSection()}

                            {/* Account Section */}
                            {renderAccountSection()}

                            {/* Sign Out Button */}
                            {renderSignOutButton()}
                        </VStack>
                    )}
                </ScrollView>
            </Container>
        </SafeAreaView>
    );
}
