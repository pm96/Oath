import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import {
    MilestoneBadge as MilestoneBadgeType,
    milestoneService,
} from "../../services/firebase/milestoneService";
import { getUserFriendlyErrorMessage } from "../../utils/errorHandling";
import { MilestoneBadge } from "./MilestoneBadge";

interface MilestoneBadgesProps {
    userId: string;
    habitId: string;
    title?: string;
    size?: "small" | "medium" | "large";
    showDate?: boolean;
    maxDisplay?: number;
}

/**
 * MilestoneBadges Component
 *
 * Displays all milestone badges for a specific habit
 * Requirements: 3.4 - Milestone badge display with dates achieved
 */
export const MilestoneBadges: React.FC<MilestoneBadgesProps> = ({
    userId,
    habitId,
    title = "Milestones",
    size = "medium",
    showDate = true,
    maxDisplay,
}) => {
    const { theme } = useTheme();
    const [badges, setBadges] = useState<MilestoneBadgeType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadMilestoneBadges = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const habitBadges = await milestoneService.getHabitMilestoneBadges(
                userId,
                habitId,
            );

            // Apply max display limit if specified
            const displayBadges = maxDisplay
                ? habitBadges.slice(0, maxDisplay)
                : habitBadges;

            setBadges(displayBadges);
        } catch (err) {
            const message = getUserFriendlyErrorMessage(err);
            setError(message);
            console.error("Failed to load milestone badges:", err);
        } finally {
            setLoading(false);
        }
    }, [userId, habitId, maxDisplay]);

    useEffect(() => {
        loadMilestoneBadges();
    }, [loadMilestoneBadges]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={[styles.title, { color: theme.colors.foreground }]}>
                    {title}
                </Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text
                        style={[
                            styles.loadingText,
                            { color: theme.colors.mutedForeground },
                        ]}
                    >
                        Loading milestones...
                    </Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={[styles.title, { color: theme.colors.foreground }]}>
                    {title}
                </Text>
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: theme.colors.destructive }]}>
                        {error}
                    </Text>
                </View>
            </View>
        );
    }

    if (badges.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={[styles.title, { color: theme.colors.foreground }]}>
                    {title}
                </Text>
                <View style={styles.emptyContainer}>
                    <Text
                        style={[styles.emptyText, { color: theme.colors.mutedForeground }]}
                    >
                        No milestones achieved yet
                    </Text>
                    <Text
                        style={[
                            styles.emptySubtext,
                            { color: theme.colors.mutedForeground },
                        ]}
                    >
                        Keep building your streak to earn badges!
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>
                {title}
            </Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesContainer}
            >
                {badges.map((badge) => (
                    <MilestoneBadge
                        key={badge.days}
                        days={badge.days}
                        achievedAt={badge.achievedAt}
                        celebrated={badge.celebrated}
                        badgeType={badge.badgeType}
                        title={badge.title}
                        description={badge.description}
                        size={size}
                        showDate={showDate}
                    />
                ))}
            </ScrollView>

            {maxDisplay && badges.length >= maxDisplay && (
                <Text
                    style={[styles.moreText, { color: theme.colors.mutedForeground }]}
                >
                    +{badges.length - maxDisplay} more
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    badgesContainer: {
        paddingHorizontal: 8,
    },
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
    },
    errorContainer: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        alignItems: "center",
    },
    errorText: {
        fontSize: 14,
        textAlign: "center",
    },
    emptyContainer: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: "center",
    },
    moreText: {
        fontSize: 12,
        textAlign: "center",
        marginTop: 8,
        fontStyle: "italic",
    },
});

export default MilestoneBadges;
