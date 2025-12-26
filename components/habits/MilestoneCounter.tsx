import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import {
    MilestoneCount,
    milestoneService,
} from "../../services/firebase/milestoneService";
import { MILESTONE_DAYS } from "../../types/habit-streaks";
import { getUserFriendlyErrorMessage } from "../../utils/errorHandling";

interface MilestoneCounterProps {
    userId: string;
    showBreakdown?: boolean;
    compact?: boolean;
}

/**
 * MilestoneCounter Component
 *
 * Displays total milestone count across all user habits
 * Requirements: 3.5 - Total milestone count across all habits
 */
export const MilestoneCounter: React.FC<MilestoneCounterProps> = ({
    userId,
    showBreakdown = true,
    compact = false,
}) => {
    const { theme } = useTheme();
    const [milestoneCount, setMilestoneCount] = useState<MilestoneCount | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadMilestoneCount = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const count = await milestoneService.getTotalMilestoneCount(userId);
            setMilestoneCount(count);
        } catch (err) {
            const message = getUserFriendlyErrorMessage(err);
            setError(message);
            console.error("Failed to load milestone count:", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadMilestoneCount();
    }, [loadMilestoneCount]);

    const getMilestoneEmoji = (days: number): string => {
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
                return "💠";
            default:
                return "🏆";
        }
    };

    const getMilestoneName = (days: number): string => {
        switch (days) {
            case 7:
                return "Week";
            case 30:
                return "Month";
            case 60:
                return "60-Day";
            case 100:
                return "Century";
            case 365:
                return "Year";
            default:
                return `${days}-Day`;
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, compact && styles.compactContainer]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text
                    style={[styles.loadingText, { color: theme.colors.mutedForeground }]}
                >
                    Loading milestones...
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, compact && styles.compactContainer]}>
                <Text style={[styles.errorText, { color: theme.colors.destructive }]}>
                    {error}
                </Text>
            </View>
        );
    }

    if (!milestoneCount || milestoneCount.total === 0) {
        return (
            <View style={[styles.container, compact && styles.compactContainer]}>
                <Text
                    style={[styles.emptyText, { color: theme.colors.mutedForeground }]}
                >
                    No milestones achieved yet
                </Text>
                {!compact && (
                    <Text
                        style={[
                            styles.emptySubtext,
                            { color: theme.colors.mutedForeground },
                        ]}
                    >
                        Start building streaks to earn milestone badges!
                    </Text>
                )}
            </View>
        );
    }

    if (compact) {
        return (
            <View style={[styles.container, styles.compactContainer]}>
                <View style={styles.compactContent}>
                    <Text style={[styles.compactEmoji]}>🏆</Text>
                    <Text
                        style={[styles.compactTotal, { color: theme.colors.foreground }]}
                    >
                        {milestoneCount.total}
                    </Text>
                    <Text
                        style={[
                            styles.compactLabel,
                            { color: theme.colors.mutedForeground },
                        ]}
                    >
                        Milestones
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.foreground }]}>
                    🏆 Milestone Achievements
                </Text>
                <Text style={[styles.total, { color: theme.colors.primary }]}>
                    {milestoneCount.total} Total
                </Text>
            </View>

            {showBreakdown && (
                <View style={styles.breakdown}>
                    {MILESTONE_DAYS.map((days) => {
                        const count = milestoneCount.breakdown[days] || 0;
                        if (count === 0) return null;

                        return (
                            <View key={days} style={styles.breakdownItem}>
                                <Text style={styles.breakdownEmoji}>
                                    {getMilestoneEmoji(days)}
                                </Text>
                                <Text
                                    style={[
                                        styles.breakdownCount,
                                        { color: theme.colors.foreground },
                                    ]}
                                >
                                    {count}
                                </Text>
                                <Text
                                    style={[
                                        styles.breakdownLabel,
                                        { color: theme.colors.mutedForeground },
                                    ]}
                                >
                                    {getMilestoneName(days)}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}

            <Text
                style={[styles.lastUpdated, { color: theme.colors.mutedForeground }]}
            >
                Last updated: {milestoneCount.lastUpdated.toDate().toLocaleDateString()}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginVertical: 8,
    },
    compactContainer: {
        padding: 8,
        alignItems: "center",
    },
    compactContent: {
        alignItems: "center",
    },
    compactEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    compactTotal: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 2,
    },
    compactLabel: {
        fontSize: 12,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
    },
    total: {
        fontSize: 16,
        fontWeight: "bold",
    },
    breakdown: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-around",
        marginBottom: 12,
    },
    breakdownItem: {
        alignItems: "center",
        marginVertical: 8,
        minWidth: 60,
    },
    breakdownEmoji: {
        fontSize: 20,
        marginBottom: 4,
    },
    breakdownCount: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 2,
    },
    breakdownLabel: {
        fontSize: 12,
        textAlign: "center",
    },
    lastUpdated: {
        fontSize: 12,
        textAlign: "center",
        fontStyle: "italic",
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
    },
    errorText: {
        fontSize: 14,
        textAlign: "center",
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
});

export default MilestoneCounter;
