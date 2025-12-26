import { Timestamp } from "firebase/firestore";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { BadgeType } from "../../services/firebase/milestoneService";

interface MilestoneBadgeProps {
    days: number;
    achievedAt: Timestamp;
    celebrated: boolean;
    badgeType: BadgeType;
    title: string;
    description: string;
    size?: "small" | "medium" | "large";
    showDate?: boolean;
}

/**
 * MilestoneBadge Component
 *
 * Displays milestone achievement badges with appropriate styling
 * Requirements: 3.4 - Milestone badge display
 */
export const MilestoneBadge: React.FC<MilestoneBadgeProps> = ({
    days,
    achievedAt,
    celebrated,
    badgeType,
    title,
    description,
    size = "medium",
    showDate = true,
}) => {
    const { theme } = useTheme();

    const getBadgeColor = (type: BadgeType): string => {
        switch (type) {
            case "bronze":
                return "#CD7F32";
            case "silver":
                return "#C0C0C0";
            case "gold":
                return "#FFD700";
            case "platinum":
                return "#E5E4E2";
            case "diamond":
                return "#B9F2FF";
            default:
                return theme.colors.primary;
        }
    };

    const getBadgeEmoji = (type: BadgeType): string => {
        switch (type) {
            case "bronze":
                return "🥉";
            case "silver":
                return "🥈";
            case "gold":
                return "🥇";
            case "platinum":
                return "💎";
            case "diamond":
                return "💠";
            default:
                return "🏆";
        }
    };

    const getSizeStyles = (size: "small" | "medium" | "large") => {
        switch (size) {
            case "small":
                return {
                    container: { width: 60, height: 60 },
                    emoji: { fontSize: 20 },
                    days: { fontSize: 10 },
                    title: { fontSize: 10 },
                    description: { fontSize: 8 },
                };
            case "large":
                return {
                    container: { width: 120, height: 120 },
                    emoji: { fontSize: 40 },
                    days: { fontSize: 18 },
                    title: { fontSize: 16 },
                    description: { fontSize: 12 },
                };
            default: // medium
                return {
                    container: { width: 80, height: 80 },
                    emoji: { fontSize: 30 },
                    days: { fontSize: 14 },
                    title: { fontSize: 12 },
                    description: { fontSize: 10 },
                };
        }
    };

    const sizeStyles = getSizeStyles(size);
    const badgeColor = getBadgeColor(badgeType);
    const badgeEmoji = getBadgeEmoji(badgeType);

    const formatDate = (timestamp: Timestamp): string => {
        return timestamp.toDate().toLocaleDateString();
    };

    return (
        <View style={styles.container}>
            {/* Badge Circle */}
            <View
                style={[
                    styles.badge,
                    sizeStyles.container,
                    {
                        backgroundColor: badgeColor,
                        borderColor: celebrated ? badgeColor : theme.colors.border,
                        opacity: celebrated ? 1 : 0.7,
                    },
                ]}
            >
                <Text style={[styles.emoji, sizeStyles.emoji]}>{badgeEmoji}</Text>
                <Text
                    style={[
                        styles.days,
                        sizeStyles.days,
                        { color: theme.colors.background },
                    ]}
                >
                    {days}
                </Text>
            </View>

            {/* Badge Info */}
            {size !== "small" && (
                <View style={styles.info}>
                    <Text
                        style={[
                            styles.title,
                            sizeStyles.title,
                            { color: theme.colors.foreground },
                        ]}
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                    <Text
                        style={[
                            styles.description,
                            sizeStyles.description,
                            { color: theme.colors.mutedForeground },
                        ]}
                        numberOfLines={2}
                    >
                        {description}
                    </Text>
                    {showDate && (
                        <Text
                            style={[
                                styles.date,
                                sizeStyles.description,
                                { color: theme.colors.mutedForeground },
                            ]}
                        >
                            {formatDate(achievedAt)}
                        </Text>
                    )}
                </View>
            )}

            {/* Celebration Indicator */}
            {!celebrated && (
                <View
                    style={[
                        styles.newIndicator,
                        { backgroundColor: theme.colors.accent },
                    ]}
                >
                    <Text style={[styles.newText, { color: theme.colors.background }]}>
                        NEW
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        margin: 8,
        position: "relative",
    },
    badge: {
        borderRadius: 50,
        borderWidth: 3,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    emoji: {
        textAlign: "center",
        marginBottom: 2,
    },
    days: {
        fontWeight: "bold",
        textAlign: "center",
    },
    info: {
        alignItems: "center",
        marginTop: 8,
        maxWidth: 100,
    },
    title: {
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 2,
    },
    description: {
        textAlign: "center",
        marginBottom: 2,
    },
    date: {
        textAlign: "center",
        fontStyle: "italic",
    },
    newIndicator: {
        position: "absolute",
        top: -5,
        right: -5,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    newText: {
        fontSize: 8,
        fontWeight: "bold",
    },
});

export default MilestoneBadge;
