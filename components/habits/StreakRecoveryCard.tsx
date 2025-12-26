import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { StreakRecoveryMessage } from "../../services/firebase/streakRecoveryService";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface StreakRecoveryCardProps {
    message: StreakRecoveryMessage;
    onAction?: () => void;
    onDismiss?: () => void;
    compact?: boolean;
}

/**
 * Card component for displaying streak recovery messages inline
 * Requirements: 7.1, 7.2, 7.3
 */
export const StreakRecoveryCard: React.FC<StreakRecoveryCardProps> = ({
    message,
    onAction,
    onDismiss,
    compact = false,
}) => {
    const getCardStyle = () => {
        switch (message.type) {
            case "broken_streak":
                return {
                    borderLeftWidth: 4,
                    borderLeftColor: "#f97316",
                    backgroundColor: "#fff7ed",
                };
            case "restart_encouragement":
                return {
                    borderLeftWidth: 4,
                    borderLeftColor: "#3b82f6",
                    backgroundColor: "#eff6ff",
                };
            case "achievement_preservation":
                return {
                    borderLeftWidth: 4,
                    borderLeftColor: "#10b981",
                    backgroundColor: "#ecfdf5",
                };
            case "multiple_breaks":
                return {
                    borderLeftWidth: 4,
                    borderLeftColor: "#8b5cf6",
                    backgroundColor: "#f5f3ff",
                };
            case "restart_reminder":
                return {
                    borderLeftWidth: 4,
                    borderLeftColor: "#eab308",
                    backgroundColor: "#fefce8",
                };
            default:
                return {
                    borderLeftWidth: 4,
                    borderLeftColor: "#6b7280",
                    backgroundColor: "#f9fafb",
                };
        }
    };

    const getIconForType = () => {
        switch (message.type) {
            case "broken_streak":
                return "💪";
            case "restart_encouragement":
                return "🎯";
            case "achievement_preservation":
                return "🏅";
            case "multiple_breaks":
                return "🤔";
            case "restart_reminder":
                return "⏰";
            default:
                return "✨";
        }
    };

    if (compact) {
        return (
            <TouchableOpacity onPress={onAction}>
                <Card style={{ padding: 12, marginBottom: 12, ...getCardStyle() }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ fontSize: 24, marginRight: 12 }}>
                            {getIconForType()}
                        </Text>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{ fontWeight: "600", color: "#1f2937", marginBottom: 4 }}
                            >
                                {message.title}
                            </Text>
                            <Text
                                style={{ fontSize: 14, color: "#6b7280" }}
                                numberOfLines={2}
                            >
                                {message.message}
                            </Text>
                        </View>
                        <Text style={{ color: "#3b82f6", fontSize: 14, fontWeight: "500" }}>
                            View
                        </Text>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    }

    return (
        <Card style={{ padding: 16, marginBottom: 16, ...getCardStyle() }}>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginBottom: 12,
                }}
            >
                <Text style={{ fontSize: 28, marginRight: 12 }}>
                    {getIconForType()}
                </Text>
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "bold",
                            color: "#1f2937",
                            marginBottom: 8,
                        }}
                    >
                        {message.title}
                    </Text>
                    <Text style={{ color: "#374151", lineHeight: 20, marginBottom: 16 }}>
                        {message.message}
                    </Text>

                    {message.targetStreak && (
                        <View
                            style={{
                                backgroundColor: "rgba(255, 255, 255, 0.7)",
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 16,
                            }}
                        >
                            <Text
                                style={{
                                    textAlign: "center",
                                    fontWeight: "600",
                                    color: "#1f2937",
                                }}
                            >
                                🎯 New Target: {message.targetStreak} Days
                            </Text>
                        </View>
                    )}

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        {message.actionText && onAction && (
                            <View style={{ flex: 1 }}>
                                <Button onPress={onAction}>
                                    <Text>{message.actionText}</Text>
                                </Button>
                            </View>
                        )}
                        {onDismiss && (
                            <View style={{ flex: 1 }}>
                                <Button variant="outline" onPress={onDismiss}>
                                    <Text>Dismiss</Text>
                                </Button>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Card>
    );
};

interface StreakRecoveryBannerProps {
    message: StreakRecoveryMessage;
    onAction?: () => void;
    onDismiss?: () => void;
}

/**
 * Banner component for displaying recovery messages at the top of screens
 * Requirements: 7.1, 7.5
 */
export const StreakRecoveryBanner: React.FC<StreakRecoveryBannerProps> = ({
    message,
    onAction,
    onDismiss,
}) => {
    const getBannerStyle = () => {
        switch (message.type) {
            case "broken_streak":
                return { backgroundColor: "#fed7aa", borderColor: "#fdba74" };
            case "restart_encouragement":
                return { backgroundColor: "#dbeafe", borderColor: "#93c5fd" };
            case "achievement_preservation":
                return { backgroundColor: "#d1fae5", borderColor: "#6ee7b7" };
            case "restart_reminder":
                return { backgroundColor: "#fef3c7", borderColor: "#fcd34d" };
            default:
                return { backgroundColor: "#f3f4f6", borderColor: "#d1d5db" };
        }
    };

    const getIconForType = () => {
        switch (message.type) {
            case "broken_streak":
                return "💪";
            case "restart_encouragement":
                return "🎯";
            case "achievement_preservation":
                return "🏅";
            case "restart_reminder":
                return "⏰";
            default:
                return "✨";
        }
    };

    return (
        <View
            style={[
                {
                    borderLeftWidth: 4,
                    padding: 12,
                    marginBottom: 16,
                },
                getBannerStyle(),
            ]}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>
                        {getIconForType()}
                    </Text>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "600", color: "#1f2937", fontSize: 14 }}>
                            {message.title}
                        </Text>
                        <Text style={{ color: "#6b7280", fontSize: 12 }} numberOfLines={1}>
                            {message.message}
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: "row", gap: 8, marginLeft: 12 }}>
                    {message.actionText && onAction && (
                        <TouchableOpacity
                            onPress={onAction}
                            style={{
                                backgroundColor: "#2563eb",
                                paddingHorizontal: 12,
                                paddingVertical: 4,
                                borderRadius: 4,
                            }}
                        >
                            <Text style={{ color: "white", fontSize: 12, fontWeight: "500" }}>
                                {message.actionText}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {onDismiss && (
                        <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
                            <Text style={{ color: "#6b7280", fontSize: 18 }}>×</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};
