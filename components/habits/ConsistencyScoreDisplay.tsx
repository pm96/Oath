import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";

interface ConsistencyScoreDisplayProps {
    score: number;
    style?: ViewStyle;
    showDetails?: boolean;
}

/**
 * ConsistencyScoreDisplay Component
 *
 * Displays the consistency score with a visual progress indicator
 * and interpretation of the score level.
 * Requirements: 6.4
 */
export const ConsistencyScoreDisplay: React.FC<
    ConsistencyScoreDisplayProps
> = ({ score, style, showDetails = true }) => {
    const scoreLevel = getScoreLevel(score);
    const scoreColor = getScoreColor(score);

    return (
        <Card style={StyleSheet.flatten([styles.container, style])}>
            <Text style={styles.title}>Consistency Score</Text>

            {/* Score Circle */}
            <View style={styles.scoreContainer}>
                <View style={styles.scoreCircleContainer}>
                    <View
                        style={[styles.scoreCircleBackground, { borderColor: scoreColor }]}
                    >
                        <View
                            style={[
                                styles.scoreCircleFill,
                                {
                                    backgroundColor: scoreColor,
                                    transform: [
                                        {
                                            rotate: `${(score / 100) * 360}deg`,
                                        },
                                    ],
                                },
                            ]}
                        />
                        <View style={styles.scoreCircleInner}>
                            <Text
                                style={StyleSheet.flatten([
                                    styles.scoreValue,
                                    { color: scoreColor },
                                ])}
                            >
                                {score.toFixed(0)}
                            </Text>
                            <Text style={styles.scoreUnit}>%</Text>
                        </View>
                    </View>
                </View>

                {/* Score Level */}
                <View style={styles.scoreLevelContainer}>
                    <Text
                        style={StyleSheet.flatten([
                            styles.scoreLevel,
                            { color: scoreColor },
                        ])}
                    >
                        {scoreLevel.label}
                    </Text>
                    <Text style={styles.scoreLevelDescription}>
                        {scoreLevel.description}
                    </Text>
                </View>
            </View>

            {/* Progress Bar Alternative for smaller displays */}
            <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                width: `${score}%`,
                                backgroundColor: scoreColor,
                            },
                        ]}
                    />
                </View>
                <Text style={styles.progressBarLabel}>
                    {score.toFixed(1)}% Consistent
                </Text>
            </View>

            {/* Score Details */}
            {showDetails && (
                <View style={styles.detailsContainer}>
                    <Text style={styles.detailsTitle}>What this means:</Text>
                    <Text style={styles.detailsText}>{getScoreExplanation(score)}</Text>

                    {/* Score Breakdown */}
                    <View style={styles.breakdownContainer}>
                        <Text style={styles.breakdownTitle}>Score Factors:</Text>
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownLabel}>• Completion Rate (40%)</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownLabel}>
                                • Streak Consistency (30%)
                            </Text>
                        </View>
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownLabel}>
                                • Day-of-Week Consistency (30%)
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </Card>
    );
};

/**
 * Get score level information based on the score value
 */
const getScoreLevel = (
    score: number,
): { label: string; description: string } => {
    if (score >= 90) {
        return {
            label: "Excellent",
            description: "Outstanding consistency! You're building strong habits.",
        };
    } else if (score >= 80) {
        return {
            label: "Very Good",
            description: "Great consistency! Keep up the excellent work.",
        };
    } else if (score >= 70) {
        return {
            label: "Good",
            description: "Good consistency with room for improvement.",
        };
    } else if (score >= 60) {
        return {
            label: "Fair",
            description: "Moderate consistency. Focus on building routine.",
        };
    } else if (score >= 40) {
        return {
            label: "Needs Work",
            description: "Inconsistent pattern. Consider smaller, easier goals.",
        };
    } else {
        return {
            label: "Poor",
            description: "Very inconsistent. Start with tiny, achievable habits.",
        };
    }
};

/**
 * Get color based on score value
 */
const getScoreColor = (score: number): string => {
    if (score >= 80) return "#34C759"; // Green
    if (score >= 60) return "#FF9500"; // Orange
    if (score >= 40) return "#FFCC00"; // Yellow
    return "#FF3B30"; // Red
};

/**
 * Get detailed explanation of the score
 */
const getScoreExplanation = (score: number): string => {
    if (score >= 90) {
        return "Your consistency is exceptional. You've developed a strong habit pattern that's likely to stick long-term. This level of consistency indicates excellent self-discipline and routine establishment.";
    } else if (score >= 80) {
        return "You're maintaining very good consistency. Your habit is well-established with only minor gaps. This is an excellent foundation for long-term success.";
    } else if (score >= 70) {
        return "Your consistency is good but has some room for improvement. Focus on identifying and addressing the factors that cause you to miss days.";
    } else if (score >= 60) {
        return "Your consistency is moderate. You're on the right track but may benefit from adjusting your approach or making the habit easier to maintain.";
    } else if (score >= 40) {
        return "Your consistency needs improvement. Consider breaking your habit into smaller, more manageable pieces or addressing barriers that prevent regular completion.";
    } else {
        return "Your consistency is quite low. Focus on starting very small and building momentum. Even completing the habit 2-3 times per week is a good starting point.";
    }
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 20,
        textAlign: "center",
    },
    scoreContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    scoreCircleContainer: {
        marginBottom: 16,
    },
    scoreCircleBackground: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 8,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
    },
    scoreCircleFill: {
        position: "absolute",
        width: 60,
        height: 120,
        left: 60,
        top: 0,
        transformOrigin: "0 60px",
    },
    scoreCircleInner: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    scoreValue: {
        fontSize: 28,
        fontWeight: "bold",
        lineHeight: 32,
    },
    scoreUnit: {
        fontSize: 14,
        color: "#666",
        marginTop: -4,
    },
    scoreLevelContainer: {
        alignItems: "center",
    },
    scoreLevel: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    scoreLevelDescription: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        maxWidth: 200,
    },
    progressBarContainer: {
        marginBottom: 20,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: "#f0f0f0",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 4,
        minWidth: 2,
    },
    progressBarLabel: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
    },
    detailsContainer: {
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingTop: 16,
    },
    detailsTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    detailsText: {
        fontSize: 13,
        color: "#666",
        lineHeight: 18,
        marginBottom: 16,
    },
    breakdownContainer: {
        backgroundColor: "#f8f9fa",
        padding: 12,
        borderRadius: 8,
    },
    breakdownTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: 8,
    },
    breakdownItem: {
        marginBottom: 4,
    },
    breakdownLabel: {
        fontSize: 11,
        color: "#666",
    },
});
