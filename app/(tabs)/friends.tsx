import { FriendList } from "@/components/friends/FriendList";
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
    Input,
    VStack,
} from "@/components/ui";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { useAuth } from "@/hooks/useAuth";
import { useThemeStyles } from "@/hooks/useTheme";
import {
    findUserByInviteCode,
    PublicUserProfile,
    sendFriendRequest,
} from "@/services/firebase/friendService";
import { HapticFeedback } from "@/utils/celebrations";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { Copy, Share2 } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Clipboard, Platform, ScrollView, Share, View } from "react-native";
type TabType = "network" | "feed" | "add";

/**
 * Enhanced Friends screen with feed integration and tab switching
 * Requirements: 1.1, 1.4, 7.5, 11.2, 11.3 - Friends feed with pull-to-refresh
 */
export default function FriendsScreen() {
    const { user } = useAuth();
    const { colors, spacing } = useThemeStyles();

    const [activeTab, setActiveTab] = useState<TabType>("feed");
    const [inviteCodeInput, setInviteCodeInput] = useState("");
    const [searchResult, setSearchResult] = useState<PublicUserProfile | null>(
        null,
    );
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const inviteCode = user?.uid?.slice(-6).toUpperCase() || "DEMO123";

    const inviteMessage = useMemo(
        () => `Join me on the app! Use my invite code: ${inviteCode}`,
        [inviteCode],
    );

    const handleShareInviteCode = async () => {
        try {
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
        HapticFeedback.selection();
        try {
            if (Platform.OS === "web" && navigator?.clipboard?.writeText) {
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

    const handleSearchByCode = useCallback(async () => {
        if (inviteCodeInput.trim().length === 0) {
            setSearchError("Please enter an invite code.");
            return;
        }
        setIsSearching(true);
        setSearchError(null);
        setSearchResult(null);
        try {
            const foundUser = await findUserByInviteCode(inviteCodeInput);
            if (foundUser) {
                setSearchResult(foundUser);
            } else {
                setSearchError("No user found with that invite code.");
            }
        } catch (error: any) {
            setSearchError(error.message || "An error occurred during search.");
        } finally {
            setIsSearching(false);
        }
    }, [inviteCodeInput]);

    const handleSendRequest = useCallback(
        async (receiverId: string) => {
            if (!user?.uid) return;
            try {
                await sendFriendRequest(user.uid, receiverId);
                showSuccessToast("Friend request sent!");
                setSearchResult(null); // Clear result after sending request
                setInviteCodeInput("");
            } catch (error: any) {
                showErrorToast(error.message || "Failed to send friend request.");
            }
        },
        [user?.uid],
    );

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
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                    borderRadius: 12,
                    height: 40,
                }}
            >
                <HStack align="center" spacing="xs">
                    {icon}
                    <Body
                        weight={isActive ? "semibold" : "medium"}
                        style={{
                            color: isActive
                                ? colors.primaryForeground
                                : colors.mutedForeground,
                            fontSize: 13,
                        }}
                    >
                        {label}
                    </Body>
                </HStack>
            </Button>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "network":
                return (
                    <VStack spacing="xl" style={{ paddingBottom: spacing.xl }}>
                        <VStack spacing="md">
                            <HStack align="center" justify="space-between">
                                <Heading size="md">Friend Requests</Heading>
                                {user?.uid && <Caption color="muted">Pending actions</Caption>}
                            </HStack>
                            <FriendRequests userId={user?.uid} />
                        </VStack>

                        <VStack spacing="md">
                            <Heading size="md">My Friends</Heading>
                            <FriendList userId={user?.uid} />
                        </VStack>
                    </VStack>
                );
            case "add":
                return (
                    <VStack spacing="xl" style={{ paddingBottom: spacing.xl }}>
                        {/* Share Invite Code Section */}
                        <VStack spacing="md">
                            <VStack spacing="xs">
                                <Heading size="md">Your Invite Code</Heading>
                                <Caption color="muted">
                                    Share this with friends to connect instantly
                                </Caption>
                            </VStack>
                            <Card variant="elevated" padding="lg">
                                <HStack align="center" justify="space-between">
                                    <Heading size="xl" color="primary">
                                        {inviteCode}
                                    </Heading>
                                    <HStack spacing="sm">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onPress={handleShareInviteCode}
                                            style={{ borderRadius: 20 }}
                                        >
                                            <Share2 size={18} color={colors.primary} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onPress={handleCopyInviteCode}
                                            style={{ borderRadius: 20 }}
                                        >
                                            <Copy size={18} color={colors.foreground} />
                                        </Button>
                                    </HStack>
                                </HStack>
                            </Card>
                        </VStack>

                        {/* Find by Invite Code Section */}
                        <VStack spacing="md">
                            <Heading size="md">Add by Code</Heading>
                            <Card variant="outlined" padding="lg">
                                <VStack spacing="md">
                                    <Input
                                        placeholder="Enter 6-digit code"
                                        value={inviteCodeInput}
                                        onChangeText={setInviteCodeInput}
                                        maxLength={6}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                    />
                                    <Button
                                        variant="primary"
                                        onPress={handleSearchByCode}
                                        loading={isSearching}
                                        disabled={isSearching}
                                    >
                                        Find User
                                    </Button>
                                    {searchError && (
                                        <Caption color="destructive">{searchError}</Caption>
                                    )}
                                    {searchResult && (
                                        <AnimatedView animation="fadeIn" duration="fast">
                                            <Card
                                                variant="elevated"
                                                padding="md"
                                                style={{
                                                    marginTop: spacing.sm,
                                                    borderColor: colors.success,
                                                    borderWidth: 1,
                                                }}
                                            >
                                                <HStack justify="space-between" align="center">
                                                    <VStack>
                                                        <Body weight="semibold">
                                                            {searchResult.displayName}
                                                        </Body>
                                                        <Caption color="muted">
                                                            {searchResult.email}
                                                        </Caption>
                                                    </VStack>
                                                    <Button
                                                        size="sm"
                                                        variant="success"
                                                        onPress={() => handleSendRequest(searchResult.uid)}
                                                    >
                                                        Add
                                                    </Button>
                                                </HStack>
                                            </Card>
                                        </AnimatedView>
                                    )}
                                </VStack>
                            </Card>
                        </VStack>

                        {/* Search by Name/Email Section */}
                        <VStack spacing="md">
                            <Heading size="md">Search Directory</Heading>
                            <Card variant="outlined" padding="lg">
                                <UserSearch currentUserId={user?.uid} />
                            </Card>
                        </VStack>
                    </VStack>
                );
            case "feed":
            default:
                return (
                    <VStack spacing="md" style={{ paddingBottom: spacing.xl }}>
                        <FriendsFeed userId={user?.uid || ""} />
                    </VStack>
                );
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Container padding="lg" style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <AnimatedView animation="fadeIn">
                        <VStack spacing="xs" style={{ marginBottom: spacing.xl }}>
                            <Heading size="xxl">Friends</Heading>
                            <Caption color="muted">
                                Stay motivated with your community
                            </Caption>
                        </VStack>
                    </AnimatedView>

                    <AnimatedView animation="slideInFromBottom" delay={300}>
                        <View
                            style={{
                                backgroundColor: colors.muted + "10",
                                padding: spacing.xs,
                                marginBottom: spacing.xl,
                                borderRadius: 16,
                                flexDirection: "row",
                            }}
                        >
                            <HStack spacing="xs" style={{ flex: 1 }}>
                                {renderTabButton("feed", "Feed")}
                                {renderTabButton("network", "People")}
                                {renderTabButton("add", "Add")}
                            </HStack>
                        </View>
                    </AnimatedView>

                    <AnimatedView animation="fadeIn" delay={400}>
                        {renderTabContent()}
                    </AnimatedView>
                </ScrollView>
            </Container>
        </SafeAreaView>
    );
}
