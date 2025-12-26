import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useTheme } from "../../hooks/useTheme";
import { BadgeType } from "../../services/firebase/milestoneService";
import { StreakMilestone } from "../../types/habit-streaks";
import { HapticFeedback } from "../../utils/celebrations";
import { MilestoneBadge } from "./MilestoneBadge";
import { MilestoneSharingModal } from "./MilestoneSharingModal";

interface MilestoneCelebrationScreenProps {
    visible: boolean;
    milestone: StreakMilestone | null;
    habitId: string;
    habitName: string;
    userId: string;
    onClose: () => void;
    onShare?: () => void;
    offerSharing?: boolean;
}

/**
 * MilestoneCelebrationScreen Component
 *
 * Full-screen celebration modal for major milestone achievements
 * Requirements: 3.2 - Special milestone celebration screen
 * Requirements: 8.1 - Milestone sharing offers
 */
export const MilestoneCelebrationScreen: React.FC<
    MilestoneCelebrationScreenProps
> = ({
    visible,
    milestone,
    habitId,
    habitName,
    userId,
    onClose,
    onShare,
    offerSharing = true,
}) => {
        const { theme } = useTheme();
        const confettiRef = useRef<ConfettiCannon>(null);
        const scaleAnim = useRef(new Animated.Value(0)).current;
        const fadeAnim = useRef(new Animated.Value(0)).current;
        const rotateAnim = useRef(new Animated.Value(0)).current;
        const { width } = Dimensions.get("window");
        const [showSharingModal, setShowSharingModal] = useState(false);

        const startCelebrationAnimation = useCallback(() => {
            // Enhanced milestone celebration animation
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                // Add rotation for extra flair
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Start gentle pulse after initial animation
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(scaleAnim, {
                            toValue: 1.05,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(scaleAnim, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                    { iterations: 3 },
                ).start();
            });
        }, [scaleAnim, fadeAnim, rotateAnim]);

        useEffect(() => {
            if (visible && milestone) {
                // Trigger enhanced haptic feedback for milestones
                HapticFeedback.achievement();

                // Start enhanced animations
                startCelebrationAnimation();

                // Trigger confetti with delay for dramatic effect
                setTimeout(() => {
                    confettiRef.current?.start();
                }, 500);

                // Additional confetti burst for major milestones (100+ days)
                if (milestone.days >= 100) {
                    setTimeout(() => {
                        confettiRef.current?.start();
                    }, 1500);
                }
            } else {
                // Reset animations when modal closes
                scaleAnim.setValue(0);
                fadeAnim.setValue(0);
            }
        }, [visible, milestone, startCelebrationAnimation, scaleAnim, fadeAnim]);

        const getBadgeType = (days: number): BadgeType => {
            switch (days) {
                case 7:
                    return "bronze";
                case 30:
                    return "silver";
                case 60:
                    return "gold";
                case 100:
                    return "platinum";
                case 365:
                    return "diamond";
                default:
                    return "bronze";
            }
        };

        /**
         * Handle share button press
         * Requirements: 8.1 - Milestone sharing offers
         */
        const handleSharePress = () => {
            HapticFeedback.buttonPress();
            if (onShare) {
                onShare();
            } else {
                setShowSharingModal(true);
            }
        };

        /**
         * Handle sharing modal close
         */
        const handleSharingModalClose = () => {
            setShowSharingModal(false);
        };

        const getMilestoneTitle = (days: number): string => {
            switch (days) {
                case 7:
                    return "Week Warrior!";
                case 30:
                    return "Month Master!";
                case 60:
                    return "Consistency Champion!";
                case 100:
                    return "Century Achiever!";
                case 365:
                    return "Year Legend!";
                default:
                    return `${days} Day Streak!`;
            }
        };

        const getMilestoneMessage = (days: number): string => {
            switch (days) {
                case 7:
                    return "You've built a solid foundation! Keep the momentum going.";
                case 30:
                    return "Amazing dedication! You're building a powerful habit.";
                case 60:
                    return "Incredible consistency! You're truly committed to growth.";
                case 100:
                    return "Outstanding achievement! You've reached an elite level.";
                case 365:
                    return "Legendary commitment! You've transformed this into a lifestyle.";
                default:
                    return `Congratulations on your ${days}-day streak!`;
            }
        };

        if (!milestone) {
            return null;
        }

        const badgeType = getBadgeType(milestone.days);
        const title = getMilestoneTitle(milestone.days);
        const message = getMilestoneMessage(milestone.days);

        return (
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <View style={[styles.overlay, { backgroundColor: "rgba(0, 0, 0, 0.8)" }]}>
                    {/* Enhanced Confetti for Milestones */}
                    <ConfettiCannon
                        ref={confettiRef}
                        count={
                            milestone.days >= 365 ? 200 : milestone.days >= 100 ? 150 : 100
                        }
                        origin={{ x: width / 2, y: -10 }}
                        explosionSpeed={milestone.days >= 100 ? 500 : 400}
                        fallSpeed={2000}
                        fadeOut
                        colors={
                            milestone.days >= 365
                                ? [
                                    "#FFD700",
                                    "#FFA500",
                                    "#FF6347",
                                    "#FF1493",
                                    "#9370DB",
                                    "#00CED1",
                                ] // Rainbow for year
                                : milestone.days >= 100
                                    ? ["#FFD700", "#FFA500", "#FF6347", "#8A2BE2", "#00CED1"] // Gold theme for 100+
                                    : [
                                        "#22c55e",
                                        "#3b82f6",
                                        "#f59e0b",
                                        "#ef4444",
                                        "#8b5cf6",
                                        "#ec4899",
                                    ] // Standard colors
                        }
                    />

                    {/* Celebration Content */}
                    <Animated.View
                        style={[
                            styles.container,
                            {
                                backgroundColor: theme.colors.background,
                                transform: [{ scale: scaleAnim }],
                                opacity: fadeAnim,
                            },
                        ]}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <Text
                                style={[styles.congratsText, { color: theme.colors.primary }]}
                            >
                                🎉 CONGRATULATIONS! 🎉
                            </Text>
                        </View>

                        {/* Milestone Badge */}
                        <View style={styles.badgeContainer}>
                            <MilestoneBadge
                                days={milestone.days}
                                achievedAt={milestone.achievedAt}
                                celebrated={milestone.celebrated}
                                badgeType={badgeType}
                                title={getMilestoneTitle(milestone.days).replace("!", "")}
                                description={`${milestone.days} consecutive days`}
                                size="large"
                                showDate={false}
                            />
                        </View>

                        {/* Title and Message */}
                        <View style={styles.content}>
                            <Text style={[styles.title, { color: theme.colors.foreground }]}>
                                {title}
                            </Text>
                            <Text style={[styles.habitName, { color: theme.colors.primary }]}>
                                {habitName}
                            </Text>
                            <Text
                                style={[styles.message, { color: theme.colors.mutedForeground }]}
                            >
                                {message}
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actions}>
                            {offerSharing && (
                                <TouchableOpacity
                                    style={[
                                        styles.shareButton,
                                        { backgroundColor: theme.colors.primary },
                                    ]}
                                    onPress={handleSharePress}
                                >
                                    <Text
                                        style={[
                                            styles.shareButtonText,
                                            { color: theme.colors.background },
                                        ]}
                                    >
                                        Share Achievement
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.closeButton, { borderColor: theme.colors.border }]}
                                onPress={() => {
                                    HapticFeedback.buttonPress();
                                    onClose();
                                }}
                            >
                                <Text
                                    style={[
                                        styles.closeButtonText,
                                        { color: theme.colors.foreground },
                                    ]}
                                >
                                    Continue
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>

                {/* Milestone Sharing Modal */}
                {milestone && (
                    <MilestoneSharingModal
                        visible={showSharingModal}
                        onClose={handleSharingModalClose}
                        habitId={habitId}
                        habitDescription={habitName}
                        milestone={milestone}
                        userId={userId}
                    />
                )}
            </Modal>
        );
    };

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
    },
    container: {
        width: "90%",
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        marginBottom: 20,
    },
    congratsText: {
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
    badgeContainer: {
        marginBottom: 24,
    },
    content: {
        alignItems: "center",
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
    },
    habitName: {
        fontSize: 18,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 12,
    },
    message: {
        fontSize: 16,
        textAlign: "center",
        lineHeight: 24,
    },
    actions: {
        width: "100%",
        gap: 12,
    },
    shareButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: "center",
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
    closeButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: "center",
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
});

export default MilestoneCelebrationScreen;
