import { FriendRequests } from "@/components/friends/FriendRequests";
import { UserSearch } from "@/components/friends/UserSearch";
import { FriendsFeed } from "@/components/social/FriendsFeed";
import {
    AnimatedView,
    Body,
    Button,
    Caption,
    Card,
    Container,
    Heading,
    HStack,
    VStack,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStyles } from "@/hooks/useTheme";
import { HapticFeedback } from "@/utils/celebrations";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { Copy, Share2 } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Clipboard, Platform, Share, Text, View } from "react-native";
import { SafeAreaView } from "@/components/ui/safe-area-view";

type TabType = "requests" | "feed" | "search";

/**
 * Enhanced Friends screen with feed integration and tab switching
 * Requirements: 1.1, 1.4, 7.5, 11.2, 11.3 - Friends feed with pull-to-refresh
 */
export default function FriendsScreen() {
    const { user } = useAuth();
    const { colors, spacing } = useThemeStyles();

    const [activeTab, setActiveTab] = useState<TabType>("feed");

    // Generate user's invite code (simplified for demo)
    const inviteCode = user?.uid?.slice(-6).toUpperCase() || "DEMO123";

    const inviteMessage = useMemo(
        () => `Join me on the app! Use my invite code: ${inviteCode}`,
        [inviteCode],
    );

    const handleShareInviteCode = async () => {
        try {
            // Haptic feedback for share action
            // Requirement 3.2: Subtle micro-interactions throughout the app
            HapticFeedback.selection();

            await Share.share({
                message: inviteMessage,
                title: "Join me on the app!",
            });
        } catch {
            // User cancelled or error occurred
        }
    };

    const handleCopyInviteCode = async () => {
        // Haptic feedback for copy action
        HapticFeedback.selection();

        try {
            if (
                Platform.OS === "web" &&
                typeof navigator !== "undefined" &&
                navigator?.clipboard?.writeText
            ) {
                await navigator.clipboard.writeText(inviteCode);
            } else {
                Clipboard.setString(inviteCode);
            }
            showSuccessToast("Invite code copied! 📋");
        } catch (error) {
            console.error("Failed to copy invite code:", error);
            showErrorToast("Unable to copy invite code. Please try again.");
        }
    };

    const handleTabPress = (tab: TabType) => {
        HapticFeedback.selection();
        setActiveTab(tab);
    };

    const renderTabButton = (
        tab: TabType,
        label: string,
        icon?: React.ReactNode,
    ) => {
        const isActive = activeTab === tab;
        return (
            <Button
                variant={isActive ? "primary" : "outline"}
                size="sm"
                onPress={() => handleTabPress(tab)}
                style={{
                    flex: 1,
                    backgroundColor: isActive ? colors.primary : colors.background,
                    borderColor: colors.primary,
                }}
            >
                <HStack align="center" spacing="xs">
                    {icon}
                    <Text
                        style={{
                            color: isActive ? "white" : colors.primary,
                            fontWeight: isActive ? "600" : "normal",
                            fontSize: 14,
                        }}
                    >
                        {label}
                    </Text>
                </HStack>
            </Button>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "requests":
                return (
                    <FriendRequests
                        userId={user?.uid}
                        onRequestHandled={() => {
                            // Optionally refresh friends list or show success message
                        }}
                    />
                );
            case "search":
                return (
                    <UserSearch
                        currentUserId={user?.uid}
                        onUserSelect={(user) => {
                            // Handle user selection if needed
                            console.log("Selected user:", user);
                        }}
                    />
                );
            case "feed":
            default:
                return (
                    <FriendsFeed
                        userId={user?.uid || ""}
                        onGoalSelect={(goalId, friendId) => {
                            // Handle goal selection if needed
                            console.log("Selected goal:", goalId, "from friend:", friendId);
                        }}
                    />
                );
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Container padding="lg" style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    {/* Header */}
                    <AnimatedView animation="fadeIn">
                        <VStack spacing="xs" style={{ marginBottom: spacing.xl }}>
                            <Heading size="lg">Friends</Heading>
                            <Caption color="muted">
                                Connect and stay motivated together
                            </Caption>
                        </VStack>
                    </AnimatedView>

                    {/* Invite Code Section */}
                    <AnimatedView animation="slideInFromBottom" delay={100}>
                        <Card
                            variant="elevated"
                            padding="lg"
                            style={{ marginBottom: spacing.xl }}
                        >
                            <VStack spacing="md">
                                <HStack align="center" justify="space-between">
                                    <Body weight="semibold">Your Invite Code</Body>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onPress={handleShareInviteCode}
                                    >
                                        <Share2 size={16} color={colors.success} />
                                    </Button>
                                </HStack>

                                <HStack align="center" justify="space-between">
                                    <Heading size="lg" color="primary">
                                        {inviteCode}
                                    </Heading>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onPress={handleCopyInviteCode}
                                    >
                                        <Copy size={16} color={colors.foreground} />
                                    </Button>
                                </HStack>

                                <Caption color="muted">
                                    Share this code with friends so they can find you
                                </Caption>
                            </VStack>
                        </Card>
                    </AnimatedView>

                    {/* Tab Navigation */}
                    <AnimatedView animation="slideInFromBottom" delay={200}>
                        <View
                            style={{
                                backgroundColor: colors.background,
                                padding: spacing.sm,
                                marginBottom: spacing.xl,
                                borderRadius: 8,
                            }}
                        >
                            <HStack spacing="xs">
                                {renderTabButton("feed", "Feed")}
                                {renderTabButton("requests", "Requests")}
                                {renderTabButton("search", "Search")}
                            </HStack>
                        </View>
                    </AnimatedView>

                    {/* Tab Content */}
                    <AnimatedView
                        animation="fadeIn"
                        delay={300}
                        style={{ flex: 1, minHeight: 400 }}
                    >
                        {renderTabContent()}
                    </AnimatedView>
                </View>
            </Container>
        </SafeAreaView>
    );
}
