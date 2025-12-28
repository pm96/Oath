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
import { ChevronDown, Copy, Share2 } from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    Animated,
    Clipboard,
    Platform,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type TabType = "requests" | "feed" | "search";

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
    const [isInviteSectionOpen, setInviteSectionOpen] = useState(false);
    const rotationAnim = useRef(new Animated.Value(0)).current;

    const inviteCode = user?.uid?.slice(-6).toUpperCase() || "DEMO123";

    const inviteMessage = useMemo(
        () => `Join me on the app! Use my invite code: ${inviteCode}`,
        [inviteCode],
    );

    const handleToggleInviteSection = () => {
        setInviteSectionOpen(!isInviteSectionOpen);
        Animated.spring(rotationAnim, {
            toValue: isInviteSectionOpen ? 0 : 1,
            useNativeDriver: true,
        }).start();
    };

    const rotation = rotationAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
    });

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
                return <FriendRequests userId={user?.uid} />;
            case "search":
                return (
                    <VStack spacing="xl">
                        {/* Find by Invite Code Section */}
                        <Card variant="outlined" padding="lg">
                            <VStack spacing="md">
                                <Body weight="semibold">Find by Invite Code</Body>
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
                                    Find Friend
                                </Button>
                                {searchError && (
                                    <Caption color="destructive">{searchError}</Caption>
                                )}
                                {searchResult && (
                                    <Card
                                        variant="elevated"
                                        padding="md"
                                        style={{ marginTop: spacing.md }}
                                    >
                                        <HStack justify="space-between" align="center">
                                            <VStack>
                                                <Body weight="semibold">
                                                    {searchResult.displayName}
                                                </Body>
                                                <Caption color="muted">{searchResult.email}</Caption>
                                            </VStack>
                                            <Button
                                                size="sm"
                                                variant="success"
                                                onPress={() => handleSendRequest(searchResult.uid)}
                                            >
                                                Add Friend
                                            </Button>
                                        </HStack>
                                    </Card>
                                )}
                            </VStack>
                        </Card>

                        {/* Search by Name/Email Section */}
                        <VStack spacing="md">
                             <Body weight="semibold">Search by Name or Email</Body>
                             <UserSearch currentUserId={user?.uid} />
                        </VStack>
                    </VStack>
                );
            case "feed":
            default:
                return <FriendsFeed userId={user?.uid || ""} />;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <Container padding="lg" style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <AnimatedView animation="fadeIn">
                        <VStack spacing="xs" style={{ marginBottom: spacing.xl }}>
                            <Heading size="lg">Friends</Heading>
                            <Caption color="muted">
                                Connect and stay motivated together
                            </Caption>
                        </VStack>
                    </AnimatedView>

                    <TouchableOpacity
                        onPress={handleToggleInviteSection}
                        activeOpacity={0.8}
                    >
                        <Card
                            variant="elevated"
                            padding="lg"
                            style={{
                                marginBottom: isInviteSectionOpen ? spacing.md : spacing.xl,
                            }}
                        >
                            <HStack align="center" justify="space-between">
                                <Body weight="semibold">Share Your Invite Code</Body>
                                <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                                    <ChevronDown size={20} color={colors.primary} />
                                </Animated.View>
                            </HStack>
                        </Card>
                    </TouchableOpacity>

                    {isInviteSectionOpen && (
                        <AnimatedView animation="fadeIn" duration={"normal"}>
                            <Card
                                variant="elevated"
                                padding="lg"
                                style={{ marginBottom: spacing.xl }}
                            >
                                <VStack spacing="md">
                                    <Body weight="semibold">Your Invite Code</Body>
                                    <HStack align="center" justify="space-between">
                                        <Heading size="lg" color="primary">
                                            {inviteCode}
                                        </Heading>
                                        <HStack spacing="sm">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onPress={handleShareInviteCode}
                                            >
                                                <Share2 size={16} color={colors.primary} />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onPress={handleCopyInviteCode}
                                            >
                                                <Copy size={16} color={colors.foreground} />
                                            </Button>
                                        </HStack>
                                    </HStack>
                                </VStack>
                            </Card>
                        </AnimatedView>
                    )}

                    <AnimatedView animation="slideInFromBottom" delay={300}>
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

                    <AnimatedView animation="fadeIn" delay={400}>
                        {renderTabContent()}
                    </AnimatedView>
                </ScrollView>
            </Container>
        </SafeAreaView>
    );
}
