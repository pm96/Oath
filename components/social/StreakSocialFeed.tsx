import {
    Body,
    Button,
    Caption,
    Card,
    Heading,
    HStack,
    LoadingSkeleton,
} from "@/components/ui";
import { VStack } from "@/components/ui/Stack";
import { useStreakSocial } from "@/hooks/useStreakSocial";
import { useThemeStyles } from "@/hooks/useTheme";
import {
    StreakReaction,
    StreakSocialPost,
} from "@/services/firebase/streakSocialService";
import { HapticFeedback } from "@/utils/celebrations";
import {
    getDevicePerformanceTier,
    getOptimizedFlatListProps,
} from "@/utils/performance";
import { Share2 } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { FlatList, ListRenderItem, RefreshControl, View } from "react-native";

export interface StreakSocialFeedProps {
    userId: string;
    onPostPress?: (post: StreakSocialPost) => void;
}

interface SocialPostItemProps {
    post: StreakSocialPost;
    currentUserId: string;
    onReaction: (
        postId: string,
        reactionType: StreakReaction["reactionType"],
    ) => void;
    onPostPress: (post: StreakSocialPost) => void;
    reactingToPost: string | null;
    getUserReaction: (post: StreakSocialPost) => StreakReaction | null;
    getReactionCounts: (
        post: StreakSocialPost,
    ) => Record<StreakReaction["reactionType"], number>;
}

/**
 * Individual social post item component
 * Requirements: 8.2, 8.3
 */
const SocialPostItem = React.memo<SocialPostItemProps>(
    ({
        post,
        currentUserId,
        onReaction,
        onPostPress,
        reactingToPost,
        getUserReaction,
        getReactionCounts,
    }) => {
        const { colors, spacing } = useThemeStyles();

        const isReacting = reactingToPost === post.id;
        const userReaction = getUserReaction(post);
        const reactionCounts = getReactionCounts(post);
        const totalReactions = Object.values(reactionCounts).reduce(
            (sum, count) => sum + count,
            0,
        );

        // Handle post press
        const handlePostPress = useCallback(() => {
            HapticFeedback.selection();
            onPostPress(post);
        }, [post, onPostPress]);

        // Handle reaction
        const handleReaction = useCallback(
            (reactionType: StreakReaction["reactionType"]) => {
                if (isReacting) return;
                HapticFeedback.selection();
                onReaction(post.id, reactionType);
            },
            [post.id, onReaction, isReacting],
        );

        // Get post type display info
        const getPostTypeInfo = useCallback(() => {
            if (post.postType === "milestone" && post.milestoneData) {
                return {
                    icon: "🏆",
                    title: `${post.milestoneData.title}`,
                    subtitle: `${post.milestoneData.days} day milestone`,
                    badgeColor: getBadgeColor(post.milestoneData.days),
                };
            } else if (post.postType === "streak_share" && post.streakData) {
                return {
                    icon: "🔥",
                    title: "Streak Update",
                    subtitle: `${post.streakData.currentStreak} day streak`,
                    badgeColor: colors.primary,
                };
            }
            return {
                icon: "📈",
                title: "Achievement",
                subtitle: "Habit progress",
                badgeColor: colors.primary,
            };
        }, [post, colors.primary]);

        const postInfo = getPostTypeInfo();

        // Format time ago
        const timeAgo = useMemo(() => {
            const now = new Date();
            const postTime = post.createdAt.toDate();
            const diffMs = now.getTime() - postTime.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            if (diffDays > 0) {
                return `${diffDays}d ago`;
            } else if (diffHours > 0) {
                return `${diffHours}h ago`;
            } else {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return `${Math.max(1, diffMinutes)}m ago`;
            }
        }, [post.createdAt]);

        return (
            <Card
                variant="outlined"
                padding="md"
                onPress={handlePostPress}
                style={{
                    marginBottom: spacing.sm,
                }}
            >
                <VStack spacing="md">
                    {/* Header */}
                    <HStack align="center" spacing="sm">
                        <View
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: `${postInfo.badgeColor}20`,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Body size="lg">{postInfo.icon}</Body>
                        </View>
                        <VStack style={{ flex: 1 }}>
                            <Body weight="semibold">{post.userName}</Body>
                            <Caption color="muted">
                                {postInfo.title} • {timeAgo}
                            </Caption>
                        </VStack>
                    </HStack>

                    {/* Milestone Badge (for milestone posts) */}
                    {post.postType === "milestone" && post.milestoneData && (
                        <Card
                            variant="outlined"
                            padding="sm"
                            style={{
                                backgroundColor: `${postInfo.badgeColor}10`,
                                borderColor: postInfo.badgeColor,
                            }}
                        >
                            <HStack align="center" spacing="sm">
                                <Body size="xl">
                                    {getMilestoneEmoji(post.milestoneData.days)}
                                </Body>
                                <VStack>
                                    <Body weight="semibold" color="primary">
                                        {post.milestoneData.title}
                                    </Body>
                                    <Caption color="muted">
                                        {post.milestoneData.days} consecutive days
                                    </Caption>
                                </VStack>
                            </HStack>
                        </Card>
                    )}

                    {/* Habit Info */}
                    <VStack spacing="xs">
                        <Body weight="medium">
                            {`\u201C${post.habitDescription}\u201D`}
                        </Body>
                        {post.streakData && (
                            <Caption color="muted">
                                Current: {post.streakData.currentStreak} days • Best:{" "}
                                {post.streakData.bestStreak} days
                            </Caption>
                        )}
                    </VStack>

                    {/* Message */}
                    <Body>{post.message}</Body>

                    {/* Reactions */}
                    <VStack spacing="sm">
                        {/* Reaction Buttons */}
                        <HStack spacing="xs">
                            <ReactionButton
                                type="fire"
                                emoji="🔥"
                                count={reactionCounts.fire}
                                isSelected={userReaction?.reactionType === "fire"}
                                onPress={() => handleReaction("fire")}
                                disabled={isReacting}
                            />
                            <ReactionButton
                                type="congratulations"
                                emoji="🎉"
                                count={reactionCounts.congratulations}
                                isSelected={userReaction?.reactionType === "congratulations"}
                                onPress={() => handleReaction("congratulations")}
                                disabled={isReacting}
                            />
                            <ReactionButton
                                type="clap"
                                emoji="👏"
                                count={reactionCounts.clap}
                                isSelected={userReaction?.reactionType === "clap"}
                                onPress={() => handleReaction("clap")}
                                disabled={isReacting}
                            />
                            <ReactionButton
                                type="heart"
                                emoji="❤️"
                                count={reactionCounts.heart}
                                isSelected={userReaction?.reactionType === "heart"}
                                onPress={() => handleReaction("heart")}
                                disabled={isReacting}
                            />
                        </HStack>

                        {/* Reaction Summary */}
                        {totalReactions > 0 && (
                            <Caption color="muted">
                                {totalReactions}{" "}
                                {totalReactions === 1 ? "reaction" : "reactions"}
                            </Caption>
                        )}
                    </VStack>
                </VStack>
            </Card>
        );
    },
);

SocialPostItem.displayName = "SocialPostItem";

/**
 * Reaction button component
 */
interface ReactionButtonProps {
    type: StreakReaction["reactionType"];
    emoji: string;
    count: number;
    isSelected: boolean;
    onPress: () => void;
    disabled: boolean;
}

const ReactionButton = React.memo<ReactionButtonProps>(
    ({ emoji, count, isSelected, onPress, disabled }) => {
        const { colors, spacing } = useThemeStyles();

        return (
            <Button
                variant={isSelected ? "primary" : "ghost"}
                size="sm"
                onPress={onPress}
                disabled={disabled}
                style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    minWidth: 44,
                    backgroundColor: isSelected
                        ? colors.primary
                        : `${colors.mutedForeground}10`,
                }}
            >
                <HStack align="center" spacing="xs">
                    <Body size="sm">{emoji}</Body>
                    {count > 0 && (
                        <Caption
                            color={isSelected ? "foreground" : "muted"}
                            weight="medium"
                        >
                            {count}
                        </Caption>
                    )}
                </HStack>
            </Button>
        );
    },
);

ReactionButton.displayName = "ReactionButton";

/**
 * Loading skeleton for social posts
 */
const SocialPostSkeleton = React.memo(() => {
    const { spacing } = useThemeStyles();

    return (
        <Card variant="outlined" padding="md" style={{ marginBottom: spacing.sm }}>
            <VStack spacing="md">
                <HStack align="center" spacing="sm">
                    <LoadingSkeleton width={40} height={40} borderRadius={20} />
                    <VStack style={{ flex: 1 }} spacing="xs">
                        <LoadingSkeleton height={16} width="60%" />
                        <LoadingSkeleton height={12} width="40%" />
                    </VStack>
                </HStack>
                <LoadingSkeleton height={60} width="100%" />
                <LoadingSkeleton height={16} width="80%" />
                <LoadingSkeleton height={32} width="100%" />
            </VStack>
        </Card>
    );
});

SocialPostSkeleton.displayName = "SocialPostSkeleton";

/**
 * Empty state component
 */
const EmptyState = React.memo(() => {
    const { colors } = useThemeStyles();

    return (
        <Card variant="outlined" padding="lg">
            <VStack align="center" spacing="md">
                <Share2 size={48} color={colors.mutedForeground} />
                <Heading size="md" color="muted" align="center">
                    No streak achievements yet
                </Heading>
                <Body color="muted" align="center">
                    {"When your friends share their streak milestones, they\u2019ll appear here!"}
                </Body>
            </VStack>
        </Card>
    );
});

EmptyState.displayName = "EmptyState";

/**
 * Streak Social Feed Component
 *
 * Displays friends' streak achievements and milestone celebrations
 * Requirements: 8.2, 8.3, 8.5
 */
export function StreakSocialFeed({
    userId,
    onPostPress,
}: StreakSocialFeedProps) {
    const { colors, spacing } = useThemeStyles();
    const {
        socialPosts,
        loading,
        error,
        addReaction,
        reactingToPost,
        getUserReaction,
        getReactionCounts,
        refresh,
    } = useStreakSocial(userId);

    const [refreshing, setRefreshing] = React.useState(false);

    // Get device performance tier for optimizations
    const performanceTier = useMemo(() => getDevicePerformanceTier(), []);
    const flatListProps = useMemo(
        () => getOptimizedFlatListProps(performanceTier),
        [performanceTier],
    );

    // Handle pull-to-refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refresh();
        } finally {
            setRefreshing(false);
        }
    }, [refresh]);

    // Handle post press
    const handlePostPress = useCallback(
        (post: StreakSocialPost) => {
            onPostPress?.(post);
        },
        [onPostPress],
    );

    // Render item function
    const renderItem: ListRenderItem<StreakSocialPost> = useCallback(
        ({ item }) => (
            <SocialPostItem
                post={item}
                currentUserId={userId}
                onReaction={addReaction}
                onPostPress={handlePostPress}
                reactingToPost={reactingToPost}
                getUserReaction={getUserReaction}
                getReactionCounts={getReactionCounts}
            />
        ),
        [
            userId,
            addReaction,
            handlePostPress,
            reactingToPost,
            getUserReaction,
            getReactionCounts,
        ],
    );

    // Key extractor
    const keyExtractor = useCallback((item: StreakSocialPost) => item.id, []);

    // Loading state
    if (loading) {
        return (
            <VStack spacing="md">
                <Heading size="md">Streak Achievements</Heading>
                {[1, 2, 3].map((i) => (
                    <SocialPostSkeleton key={i} />
                ))}
            </VStack>
        );
    }

    // Error state
    if (error) {
        return (
            <VStack spacing="md">
                <HStack align="center" justify="space-between">
                    <Heading size="md">Streak Achievements</Heading>
                    <Button variant="ghost" size="sm" onPress={handleRefresh}>
                        Retry
                    </Button>
                </HStack>
                <Card variant="outlined" padding="lg">
                    <VStack align="center" spacing="md">
                        <Body color="destructive" align="center">
                            Failed to load streak achievements
                        </Body>
                        <Caption color="muted" align="center">
                            {error}
                        </Caption>
                        <Button variant="outline" size="sm" onPress={handleRefresh}>
                            Try Again
                        </Button>
                    </VStack>
                </Card>
            </VStack>
        );
    }

    return (
        <VStack spacing="md" style={{ flex: 1 }}>
            {/* Header */}
            <HStack align="center" justify="space-between">
                <Heading size="md">Streak Achievements</Heading>
                {socialPosts.length > 0 && (
                    <Caption color="muted">
                        {socialPosts.length} {socialPosts.length === 1 ? "post" : "posts"}
                    </Caption>
                )}
            </HStack>

            {/* Posts list or empty state */}
            {socialPosts.length === 0 ? (
                <EmptyState />
            ) : (
                <FlatList
                    data={socialPosts}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    contentContainerStyle={{
                        paddingBottom: spacing.lg,
                    }}
                    {...flatListProps}
                />
            )}
        </VStack>
    );
}

// Helper functions

function getBadgeColor(days: number): string {
    switch (days) {
        case 7:
            return "#CD7F32"; // Bronze
        case 30:
            return "#C0C0C0"; // Silver
        case 60:
            return "#FFD700"; // Gold
        case 100:
            return "#B9F2FF"; // Diamond
        case 365:
            return "#FFD700"; // Gold (Crown)
        default:
            return "#FFD700"; // Default gold
    }
}

function getMilestoneEmoji(days: number): string {
    switch (days) {
        case 7:
            return "🥉";
        case 30:
            return "🥈";
        case 60:
            return "🥇";
        case 100:
            return "💎";
        case 365:
            return "👑";
        default:
            return "🏆";
    }
}
