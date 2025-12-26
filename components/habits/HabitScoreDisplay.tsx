import { HStack, VStack } from "@/components/ui/Stack";
import { Body, Caption, Heading } from "@/components/ui/Text";
import { useThemeStyles } from "@/hooks/useTheme";
import {
    HabitScore,
    NormalizedScore,
    RecognitionLevel,
} from "@/services/firebase/scoringService";
import React from "react";
import { View } from "react-native";

interface HabitScoreDisplayProps {
    score: HabitScore;
    normalizedScore?: NormalizedScore;
    recognitionLevel?: RecognitionLevel;
    showDetails?: boolean;
    compact?: boolean;
}

/**
 * Display component for habit scores with difficulty weighting
 * Requirements: 9.3 - Show both raw and adjusted scores
 * Requirements: 9.5 - Additional recognition for hard habits
 */
export function HabitScoreDisplay({
    score,
    normalizedScore,
    recognitionLevel,
    showDetails = true,
    compact = false,
}: HabitScoreDisplayProps) {
    const { colors, spacing } = useThemeStyles();

    const getDifficultyColor = (difficulty: "easy" | "medium" | "hard") => {
        switch (difficulty) {
            case "easy":
                return colors.success;
            case "medium":
                return colors.warning;
            case "hard":
                return colors.destructive;
            default:
                return colors.muted;
        }
    };

    const getDifficultyIcon = (difficulty: "easy" | "medium" | "hard") => {
        switch (difficulty) {
            case "easy":
                return "🟢";
            case "medium":
                return "🟡";
            case "hard":
                return "🔴";
            default:
                return "⚪";
        }
    };

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

    if (compact) {
        return (
            <HStack spacing="sm" style={{ alignItems: "center" }}>
                <Body weight="bold" color="primary">
                    {score.adjustedScore}
                </Body>
                <Caption color="muted">({score.multiplier}x)</Caption>
                <Caption>{getDifficultyIcon(score.difficulty)}</Caption>
            </HStack>
        );
    }

    return (
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
                {/* Header with Recognition Level */}
                {recognitionLevel && (
                    <HStack
                        spacing="sm"
                        style={{ alignItems: "center", justifyContent: "space-between" }}
                    >
                        <HStack spacing="xs" style={{ alignItems: "center" }}>
                            <Caption>{getLevelIcon(recognitionLevel.level)}</Caption>
                            <Body weight="semibold" color="primary">
                                {recognitionLevel.title}
                            </Body>
                            {recognitionLevel.isHardHabitBonus && (
                                <Caption
                                    style={{
                                        backgroundColor: colors.destructive,
                                        color: colors.background,
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 4,
                                        fontSize: 10,
                                        fontWeight: "600",
                                    }}
                                >
                                    HARD
                                </Caption>
                            )}
                        </HStack>
                        {normalizedScore && (
                            <Caption color="muted">
                                #{normalizedScore.rank} of {normalizedScore.totalHabits}
                            </Caption>
                        )}
                    </HStack>
                )}

                {/* Main Score Display */}
                <HStack
                    spacing="lg"
                    style={{ alignItems: "center", justifyContent: "space-between" }}
                >
                    <VStack spacing="xs">
                        <Caption color="muted">Total Score</Caption>
                        <Heading size="lg" color="primary">
                            {score.adjustedScore.toLocaleString()}
                        </Heading>
                        <HStack spacing="xs" style={{ alignItems: "center" }}>
                            <Caption color="muted">
                                {score.rawScore.toLocaleString()} × {score.multiplier}x
                            </Caption>
                            <Caption>{getDifficultyIcon(score.difficulty)}</Caption>
                        </HStack>
                    </VStack>

                    {normalizedScore && (
                        <VStack spacing="xs" style={{ alignItems: "flex-end" }}>
                            <Caption color="muted">Percentile</Caption>
                            <Body weight="bold" color="primary">
                                {normalizedScore.percentile}%
                            </Body>
                        </VStack>
                    )}
                </HStack>

                {/* Difficulty Badge */}
                <HStack spacing="sm" style={{ alignItems: "center" }}>
                    <View
                        style={{
                            backgroundColor: getDifficultyColor(score.difficulty),
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                        }}
                    >
                        <Caption
                            style={{
                                color: colors.background,
                                fontWeight: "600",
                                fontSize: 11,
                            }}
                        >
                            {score.difficulty.toUpperCase()} DIFFICULTY
                        </Caption>
                    </View>
                    <Caption color="muted">{score.multiplier}x score multiplier</Caption>
                </HStack>

                {/* Details */}
                {showDetails && (
                    <VStack spacing="xs">
                        <HStack spacing="md" style={{ justifyContent: "space-between" }}>
                            <Caption color="muted">Current Streak:</Caption>
                            <Caption>{score.streakLength} days</Caption>
                        </HStack>
                        <HStack spacing="md" style={{ justifyContent: "space-between" }}>
                            <Caption color="muted">Total Completions:</Caption>
                            <Caption>{score.totalCompletions}</Caption>
                        </HStack>
                        <HStack spacing="md" style={{ justifyContent: "space-between" }}>
                            <Caption color="muted">Raw Score:</Caption>
                            <Caption>{score.rawScore.toLocaleString()}</Caption>
                        </HStack>
                    </VStack>
                )}

                {/* Recognition Description */}
                {recognitionLevel && showDetails && (
                    <View
                        style={{
                            backgroundColor: colors.muted + "20",
                            padding: spacing.sm,
                            borderRadius: 8,
                        }}
                    >
                        <Caption color="muted" style={{ textAlign: "center" }}>
                            {recognitionLevel.description}
                        </Caption>
                    </View>
                )}
            </VStack>
        </View>
    );
}

/**
 * Compact score comparison component for multiple habits
 */
interface ScoreComparisonProps {
    scores: HabitScore[];
    normalizedScores: NormalizedScore[];
    title?: string;
}

export function ScoreComparison({
    scores,
    normalizedScores,
    title = "Habit Scores",
}: ScoreComparisonProps) {
    const { colors, spacing } = useThemeStyles();

    const normalizedMap = new Map(normalizedScores.map((ns) => [ns.habitId, ns]));

    const sortedScores = [...scores].sort(
        (a, b) => b.adjustedScore - a.adjustedScore,
    );

    return (
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
                <Body weight="semibold">{title}</Body>

                {sortedScores.map((score, index) => {
                    const normalized = normalizedMap.get(score.habitId);
                    return (
                        <HStack
                            key={score.habitId}
                            spacing="sm"
                            style={{
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingVertical: spacing.xs,
                                borderBottomWidth: index < sortedScores.length - 1 ? 1 : 0,
                                borderBottomColor: colors.border,
                            }}
                        >
                            <HStack spacing="sm" style={{ alignItems: "center", flex: 1 }}>
                                <Caption color="muted">#{index + 1}</Caption>
                                <VStack spacing="xs" style={{ flex: 1 }}>
                                    <Body weight="medium">Habit {score.habitId.slice(-6)}</Body>
                                    <HStack spacing="xs" style={{ alignItems: "center" }}>
                                        <Caption color="muted">
                                            {score.difficulty} ({score.multiplier}x)
                                        </Caption>
                                        {normalized && (
                                            <Caption color="muted">
                                                • {normalized.percentile}%
                                            </Caption>
                                        )}
                                    </HStack>
                                </VStack>
                            </HStack>

                            <VStack spacing="xs" style={{ alignItems: "flex-end" }}>
                                <Body weight="bold" color="primary">
                                    {score.adjustedScore.toLocaleString()}
                                </Body>
                                <Caption color="muted">
                                    ({score.rawScore.toLocaleString()})
                                </Caption>
                            </VStack>
                        </HStack>
                    );
                })}
            </VStack>
        </View>
    );
}
