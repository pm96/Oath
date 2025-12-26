import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/vstack";
import React from "react";

interface ShameScoreDisplayProps {
    score: number;
    userName?: string;
    size?: "sm" | "md" | "lg";
}

/**
 * ShameScoreDisplay component for showing shame scores
 * Requirements: 6.1, 6.2
 *
 * Displays a user's shame score with visual emphasis to highlight social consequence
 */
export function ShameScoreDisplay({
    score,
    userName,
    size = "md",
}: ShameScoreDisplayProps) {
    // Size configurations
    const sizeConfig = {
        sm: {
            scoreSize: "text-lg",
            labelSize: "text-xs",
            padding: "p-2",
        },
        md: {
            scoreSize: "text-2xl",
            labelSize: "text-sm",
            padding: "p-3",
        },
        lg: {
            scoreSize: "text-4xl",
            labelSize: "text-base",
            padding: "p-4",
        },
    };

    const config = sizeConfig[size];

    // Visual emphasis based on score level
    const getScoreColor = (score: number): string => {
        if (score === 0) return "text-success-600";
        if (score < 3) return "text-warning-600";
        if (score < 5) return "text-error-500";
        return "text-error-700";
    };

    const getBackgroundColor = (score: number): string => {
        if (score === 0) return "bg-success-50";
        if (score < 3) return "bg-warning-50";
        if (score < 5) return "bg-error-50";
        return "bg-error-100";
    };

    return (
        <VStack
            className={`${config.padding} ${getBackgroundColor(score)} rounded-lg border-2 ${score > 0 ? "border-error-300" : "border-success-300"
                } items-center`}
            space="xs"
        >
            {userName && (
                <Text className={`${config.labelSize} text-typography-700 font-medium`}>
                    {userName}
                </Text>
            )}
            <HStack space="xs" className="items-baseline">
                <Text
                    className={`${config.scoreSize} font-bold ${getScoreColor(score)}`}
                >
                    {score}
                </Text>
                <Text className={`${config.labelSize} text-typography-600`}>
                    {score === 1 ? "shame point" : "shame points"}
                </Text>
            </HStack>
        </VStack>
    );
}
