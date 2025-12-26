import { HStack, VStack } from "@/components/ui/Stack";
import { Body, Caption, Heading } from "@/components/ui/Text";
import { useThemeStyles } from "@/hooks/useTheme";
import {
    HabitScore,
    RecognitionLevel,
} from "@/services/firebase/scoringService";
import React from "react";
import { View } from "react-native";

interface UserScoreDashboardProps {
    totalRawScore: number;
    totalAdjustedScore: number;
    averageMultiplier: number;
    hardHabitCount: number;
    totalHabits: number;
    overallLevel: RecognitionLevel;
    topScores?: HabitScore[];
}

/**
 * Dashboard component showing overall user scoring across all habits
 * Requirements: 9.4 - Score normalization for habit comparison
 * Requirements: 9.5 - Additional recognition for hard habits
 */
export function UserScoreDashboard({
    totalRawScore,
    totalAdjustedScore,
    averageMultiplier,
    hardHabitCount,
    totalHabits,
    overallLevel,
    topScores = [],
}: UserScoreDashboardProps) {
    const { colors, spacing } = useThemeStyles();

    const getLevelIcon = (level: string) => {
        switch (level) {
            case "diamond":
                return "💎";
            case "platinum":
                return "🏆";
            case "gold":
                return "🥇";
            case "silver":
                return "🥈";
            case "bronze":
                return "🥉";
            default:
                return "⭐";
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case "diamond":
                return "#B9F2FF";
            case "platinum":
                return "#E5E4E2";
            case "gold":
                return "#FFD700";
            case "silver":
                return "#C0C0C0";
            case "bronze":
                return "#CD7F32";
            default:
                return colors.muted;
        }
    };

    const hardHabitPercentage =
        totalHabits > 0 ? Math.round((hardHabitCount / totalHabits) * 100) : 0;

    return (
        <VStack spacing="lg">
            {/* Overall Level Card */}
            <View
                style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    padding: spacing.lg,
                    borderWidth: 2,
                    borderColor: getLevelColor(overallLevel.level),
                }}
            >
                <VStack spacing="md">
                    {/* Level Header */}
                    <HStack
                        spacing="sm"
                        style={{ alignItems: "center", justifyContent: "center" }}
                    >
                        <Caption style={{ fontSize: 24 }}>
                            {getLevelIcon(overallLevel.level)}
                        </Caption>
                        <Heading size="xl" color="primary">
                            {overallLevel.title}
                        </Heading>
                        {overallLevel.isHardHabitBonus && (
                            <View
                                style={{
                                    backgroundColor: colors.destructive,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                }}
                            >
                                <Caption
                                    style={{
                                        color: colors.background,
                                        fontWeight: "600",
                                        fontSize: 10,
                                    }}
                                >
                                    HARD HABIT BONUS
                                </Caption>
                            </View>
                        )}
                    </HStack>

                    {/* Description */}
                    <Body color="muted" style={{ textAlign: "center" }}>
                        {overallLevel.description}
                    </Body>

                    {/* Main Score */}
                    <VStack spacing="xs" style={{ alignItems: "center" }}>
                        <Caption color="muted">Total Score</Caption>
                        <Heading size="xl" color="primary">
                            {totalAdjustedScore.toLocaleString()}
                        </Heading>
                        <Caption color="muted">
                            {totalRawScore.toLocaleString()} × {averageMultiplier.toFixed(1)}x
                            avg
                        </Caption>
                    </VStack>
                </VStack>
            </View>

            {/* Stats Grid */}
            <HStack spacing="md">
                {/* Total Habits */}
                <View
                    style={{
                        flex: 1,
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <VStack spacing="xs" style={{ alignItems: "center" }}>
                        <Caption color="muted">Total Habits</Caption>
                        <Heading size="lg" color="primary">
                            {totalHabits}
                        </Heading>
                        <Caption color="muted">Active</Caption>
                    </VStack>
                </View>

                {/* Hard Habits */}
                <View
                    style={{
                        flex: 1,
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <VStack spacing="xs" style={{ alignItems: "center" }}>
                        <Caption color="muted">Hard Habits</Caption>
                        <Heading size="lg" color="destructive">
                            {hardHabitCount}
                        </Heading>
                        <Caption color="muted">{hardHabitPercentage}% of total</Caption>
                    </VStack>
                </View>
            </HStack>

            {/* Score Breakdown */}
            <View
                style={{
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    padding: spacing.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                }}
            >
                <VStack spacing="md">
                    <Body weight="semibold">Score Breakdown</Body>

                    <VStack spacing="sm">
                        <HStack spacing="md" style={{ justifyContent: "space-between" }}>
                            <Caption color="muted">Raw Score:</Caption>
                            <Caption>{totalRawScore.toLocaleString()}</Caption>
                        </HStack>

                        <HStack spacing="md" style={{ justifyContent: "space-between" }}>
                            <Caption color="muted">Average Multiplier:</Caption>
                            <Caption>{averageMultiplier.toFixed(1)}x</Caption>
                        </HStack>

                        <HStack spacing="md" style={{ justifyContent: "space-between" }}>
                            <Caption color="muted">Difficulty Bonus:</Caption>
                            <Caption>
                                +
                                {Math.round(
                                    ((totalAdjustedScore - totalRawScore) / totalRawScore) * 100,
                                ) || 0}
                                %
                            </Caption>
                        </HStack>

                        {overallLevel.isHardHabitBonus && (
                            <HStack spacing="md" style={{ justifyContent: "space-between" }}>
                                <Caption color="muted">Hard Habit Bonus:</Caption>
                                <Caption color="destructive">+{hardHabitCount * 10}%</Caption>
                            </HStack>
                        )}

                        <View
                            style={{
                                height: 1,
                                backgroundColor: colors.border,
                                marginVertical: spacing.xs,
                            }}
                        />

                        <HStack spacing="md" style={{ justifyContent: "space-between" }}>
                            <Body weight="semibold">Final Score:</Body>
                            <Body weight="bold" color="primary">
                                {totalAdjustedScore.toLocaleString()}
                            </Body>
                        </HStack>
                    </VStack>
                </VStack>
            </View>

            {/* Top Performing Habits */}
            {topScores.length > 0 && (
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 12,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <VStack spacing="md">
                        <Body weight="semibold">Top Performing Habits</Body>

                        {topScores.slice(0, 3).map((score, index) => (
                            <HStack
                                key={score.habitId}
                                spacing="sm"
                                style={{
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    paddingVertical: spacing.xs,
                                    borderBottomWidth:
                                        index < Math.min(topScores.length, 3) - 1 ? 1 : 0,
                                    borderBottomColor: colors.border,
                                }}
                            >
                                <HStack spacing="sm" style={{ alignItems: "center", flex: 1 }}>
                                    <Caption
                                        style={{
                                            fontSize: 16,
                                            minWidth: 20,
                                        }}
                                    >
                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                                    </Caption>

                                    <VStack spacing="xs" style={{ flex: 1 }}>
                                        <Body weight="medium">Habit {score.habitId.slice(-6)}</Body>
                                        <HStack spacing="xs" style={{ alignItems: "center" }}>
                                            <Caption
                                                style={{
                                                    backgroundColor:
                                                        score.difficulty === "hard"
                                                            ? colors.destructive
                                                            : score.difficulty === "medium"
                                                                ? colors.warning
                                                                : colors.success,
                                                    color: colors.background,
                                                    paddingHorizontal: 4,
                                                    paddingVertical: 1,
                                                    borderRadius: 3,
                                                    fontSize: 9,
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {score.difficulty.toUpperCase()}
                                            </Caption>
                                            <Caption color="muted">
                                                {score.streakLength} day streak
                                            </Caption>
                                        </HStack>
                                    </VStack>
                                </HStack>

                                <VStack spacing="xs" style={{ alignItems: "flex-end" }}>
                                    <Body weight="bold" color="primary">
                                        {score.adjustedScore.toLocaleString()}
                                    </Body>
                                    <Caption color="muted">
                                        {score.multiplier}x multiplier
                                    </Caption>
                                </VStack>
                            </HStack>
                        ))}
                    </VStack>
                </View>
            )}
        </VStack>
    );
}
